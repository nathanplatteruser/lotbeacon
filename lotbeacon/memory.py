"""Structured customer memory with evidence links. Facts are upserted per key; corrections win over extraction."""
from sqlalchemy import select
from sqlalchemy.orm import Session

from .ai.base import ExtractedFact
from .models import MemoryFact, Message, Thread

EXTRACTION_VERSION = "extract-v1"
MULTI_VALUE_KEYS = {"need", "objection", "asked_about"}


def active_facts(s: Session, thread_id: int) -> list[MemoryFact]:
    return list(s.scalars(select(MemoryFact).where(MemoryFact.thread_id == thread_id, MemoryFact.active == True).order_by(MemoryFact.created_at)))  # noqa: E712


def facts_dict(facts: list[MemoryFact]) -> dict:
    d: dict = {}
    for f in facts:
        if f.key in MULTI_VALUE_KEYS:
            d.setdefault(f.key, [])
            if f.value not in d[f.key]:
                d[f.key].append(f.value)
        else:
            d[f.key] = f.value
    return d


def apply_extracted(s: Session, thread: Thread, msg: Message, extracted: list[ExtractedFact], provider: str) -> list[MemoryFact]:
    """Write new facts. A rep-corrected fact is never overwritten by extraction."""
    written: list[MemoryFact] = []
    existing = active_facts(s, thread.id)
    for ef in extracted:
        if ef.key in MULTI_VALUE_KEYS:
            if any(x.key == ef.key and x.value == ef.value for x in existing):
                continue
        else:
            prior = [x for x in existing if x.key == ef.key]
            if any(x.corrected_by_rep_id for x in prior):
                continue  # rep's correction stands
            if prior and prior[-1].value == ef.value and (prior[-1].certainty == getattr(ef, "certainty", "stated") or getattr(ef, "certainty", "stated") == "stated"):
                continue
            for x in prior:
                x.active = False  # customer changed their mind → supersede, keep history
        f = MemoryFact(
            tenant_id=thread.tenant_id, thread_id=thread.id, key=ef.key, value=ef.value,
            evidence_message_id=msg.id, confidence=ef.confidence, certainty=getattr(ef, "certainty", "stated") or "stated", extraction_version=f"{EXTRACTION_VERSION}:{provider}",
        )
        s.add(f)
        written.append(f)
    s.flush()
    return written


def correct_fact(s: Session, fact: MemoryFact, new_value: str | None, rep_id: int) -> MemoryFact | None:
    """Rep edits propagate: deactivate the old fact; optionally create the corrected one (no evidence message — the rep is the source)."""
    fact.active = False
    if not new_value:
        s.flush()
        return None
    nf = MemoryFact(
        tenant_id=fact.tenant_id, thread_id=fact.thread_id, key=fact.key, value=new_value, evidence_message_id=None,
        confidence=1.0, extraction_version="rep-correction", corrected_by_rep_id=rep_id,
    )
    s.add(nf)
    s.flush()
    return nf


def fact_view(f: MemoryFact, s: Session) -> dict:
    ev = s.get(Message, f.evidence_message_id) if f.evidence_message_id else None
    return {
        "id": f.id, "key": f.key, "value": f.value, "confidence": f.confidence, "certainty": f.certainty or "stated", "extraction_version": f.extraction_version,
        "corrected": bool(f.corrected_by_rep_id),
        "evidence": {"message_id": ev.id, "text": ev.text, "sent_at": ev.sent_at.isoformat()} if ev else None,
    }


def certainty_dict(facts: list[MemoryFact]) -> dict:
    return {f.key: (f.certainty or "stated") for f in facts if f.key not in MULTI_VALUE_KEYS}


CERTAINTY_WORDS = {"asked_about": "asked about", "preferred": "prefers", "required": "needs", "tentative": "tentative", "confirmed": "confirmed", "stated": ""}
