"""Blocked-invent event log for GSM Monday review.

Persists when the hallucination firewall holds back an invented discount, payment,
trade value, hold, warranty, booked appointment, availability, or price. Export is
JSON or CSV. The LLM never writes here — pipeline/API call `record` after validate().
"""
import csv
import io
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from . import __version__
from .config import RULES_VERSION
from .models import AuditEvent, Customer, Dealership, Draft, Thread

ACTION = "firewall.blocked"

# Claims that invent a deal term or a unit fact. Policy-window blocks are not invents.
INVENT_KINDS = {
    "discount",
    "financing",
    "trade_value",
    "hold",
    "warranty",
    "appointment_booked",
    "availability",
    "unavailable",
    "price",
    "hours",
}


def invent_claims(validation: dict | None) -> list[dict]:
    out = []
    for c in (validation or {}).get("claims") or []:
        if c.get("kind") in INVENT_KINDS and c.get("verdict") in ("unsupported", "prohibited"):
            out.append(c)
    return out


def record(
    s: Session,
    thread: Thread,
    *,
    actor: str,
    source: str,
    draft: Draft | None,
    text: str,
    validation: dict,
) -> AuditEvent | None:
    """Append one blocked-invent event. No-op when the firewall did not hold an invent claim."""
    claims = invent_claims(validation)
    if not claims:
        return None
    cust = s.get(Customer, thread.customer_id)
    ev = AuditEvent(
        tenant_id=thread.tenant_id,
        thread_id=thread.id,
        actor=actor,
        action=ACTION,
        detail={
            "kind": "blocked_invent",
            "source": source,
            "draft_id": draft.id if draft else None,
            "customer": (cust.display_name or cust.psid) if cust else None,
            "customer_id": thread.customer_id,
            "text": (text or "")[:280],
            "claims": [
                {
                    "kind": c.get("kind"),
                    "verdict": c.get("verdict"),
                    "text": (c.get("text") or "")[:160],
                    "note": c.get("note") or "",
                }
                for c in claims
            ],
            "risk_level": validation.get("risk_level"),
            "reasons": list(validation.get("reasons") or []),
            "human_send": True,
            "autonomous_sends": 0,
        },
    )
    s.add(ev)
    return ev


def collect(s: Session) -> list[dict]:
    rows = []
    for a in s.scalars(select(AuditEvent).where(AuditEvent.action == ACTION).order_by(AuditEvent.id)):
        d = a.detail or {}
        t = s.get(Thread, a.thread_id) if a.thread_id else None
        cust = s.get(Customer, t.customer_id) if t else None
        rows.append({
            "id": a.id,
            "at": a.at.isoformat() if a.at else None,
            "thread_id": a.thread_id,
            "customer": d.get("customer") or ((cust.display_name or cust.psid) if cust else None),
            "actor": a.actor,
            "source": d.get("source"),
            "draft_id": d.get("draft_id"),
            "text": d.get("text") or "",
            "claims": d.get("claims") or [],
            "risk_level": d.get("risk_level"),
            "reasons": d.get("reasons") or [],
            "human_send": True,
            "autonomous_sends": 0,
        })
    return rows


def bundle(s: Session) -> dict:
    dealer = s.scalar(select(Dealership))
    events = collect(s)
    return {
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "purpose": "GSM Monday review — blocked-invent events",
        "app_version": __version__,
        "rules_version": RULES_VERSION,
        "dealership": dealer.name if dealer else None,
        "human_send_only": True,
        "autonomous_sends": 0,
        "counts": {"blocked_invent": len(events), "claims": sum(len(e["claims"]) for e in events)},
        "events": events,
    }


def to_csv(bundle_data: dict) -> str:
    buf = io.StringIO()
    fields = [
        "exported_at", "dealership", "at", "thread_id", "customer", "actor", "source",
        "draft_id", "claim_kind", "verdict", "claim_text", "note", "draft_excerpt",
        "risk_level", "autonomous_sends",
    ]
    w = csv.DictWriter(buf, fieldnames=fields, extrasaction="ignore")
    w.writeheader()
    meta = {
        "exported_at": bundle_data.get("exported_at"),
        "dealership": bundle_data.get("dealership"),
        "autonomous_sends": 0,
    }
    events = bundle_data.get("events") or []
    if not events:
        w.writerow(meta)
        return buf.getvalue()
    for e in events:
        claims = e.get("claims") or [{}]
        for c in claims:
            w.writerow({
                **meta,
                "at": e.get("at"),
                "thread_id": e.get("thread_id"),
                "customer": e.get("customer"),
                "actor": e.get("actor"),
                "source": e.get("source"),
                "draft_id": e.get("draft_id"),
                "claim_kind": c.get("kind"),
                "verdict": c.get("verdict"),
                "claim_text": c.get("text"),
                "note": c.get("note"),
                "draft_excerpt": e.get("text"),
                "risk_level": e.get("risk_level"),
            })
    return buf.getvalue()
