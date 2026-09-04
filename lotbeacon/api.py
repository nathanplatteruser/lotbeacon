"""HTTP surface: simulated Messenger channel + rep workspace API. Run with `uvicorn lotbeacon.api:app`."""
from datetime import datetime, timezone
from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from . import __version__, inventory, memory, policy
from .ai.base import resolve_provider_name
from .config import RULES_VERSION
from .db import get_session, init_db
from .models import Appointment, AuditEvent, Customer, Dealership, Draft, LeadState, MemoryFact, Message, Rep, StateTransition, Thread, Vehicle
from .pipeline import audit, ingest_inbound, process_message, revalidate

app = FastAPI(title="LotBeacon", version=__version__)
WEB = Path(__file__).parent / "web"


@app.on_event("startup")
def _startup():
    init_db()
    from . import seed

    seed.run()


# ------------------------------------------------------------------ channel (simulated Messenger)
class InboundMessage(BaseModel):
    page_id: str
    psid: str
    mid: str | None = None
    text: str
    display_name: str = ""


@app.post("/webhook/messenger")
def webhook(body: InboundMessage, s: Session = Depends(get_session)):
    """Stands in for Meta's webhook. Real integration: verify X-Hub-Signature-256, then call exactly this."""
    dealer = s.scalar(select(Dealership).where(Dealership.page_id == body.page_id))
    if not dealer:
        raise HTTPException(404, "unknown page")
    mid = body.mid or f"mid_{int(datetime.now(timezone.utc).timestamp() * 1000)}_{body.psid}"
    thread, msg, is_new = ingest_inbound(s, dealer, body.psid, mid, body.text, body.display_name)
    draft = process_message(s, thread, msg) if is_new else None
    return {"thread_id": thread.id, "message_id": msg.id, "duplicate": not is_new, "draft_id": draft.id if draft else None}


# ------------------------------------------------------------------ rep workspace
@app.get("/")
def index():
    return FileResponse(WEB / "index.html")


@app.get("/api/meta")
def meta(s: Session = Depends(get_session)):
    d = s.scalar(select(Dealership))
    reps = s.scalars(select(Rep).where(Rep.dealership_id == d.id)).all()
    return {"version": __version__, "provider": resolve_provider_name(), "rules_version": RULES_VERSION, "dealership": {"id": d.id, "name": d.name, "page_id": d.page_id, "hours_today": policy.hours_today(d.hours, d.timezone)}, "reps": [{"id": r.id, "name": r.name, "role": r.role} for r in reps]}


@app.get("/api/threads")
def threads(s: Session = Depends(get_session)):
    out = []
    for t in s.scalars(select(Thread).order_by(Thread.priority.desc(), Thread.last_activity_at.desc())):
        d = s.scalar(select(Draft).where(Draft.thread_id == t.id).order_by(Draft.id.desc()))
        vid = (d.structured.get("vehicle_ids") if d else None) or []
        v = s.get(Vehicle, vid[0]) if vid else None
        out.append({
            "id": t.id, "customer": t.customer.display_name or t.customer.psid, "lead_state": t.lead_state.value, "priority": t.priority,
            "priority_reason": t.priority_reason, "ai_paused": t.ai_paused, "vehicle": f"{v.year} {v.model}" if v else None,
            "last_customer_message_at": t.last_customer_message_at.isoformat() if t.last_customer_message_at else None,
            "risk": d.risk_level if d else None, "draft_status": d.status if d else None,
        })
    return out


@app.get("/api/threads/{thread_id}")
def thread_detail(thread_id: int, s: Session = Depends(get_session)):
    t = s.get(Thread, thread_id)
    if not t:
        raise HTTPException(404)
    cust = s.get(Customer, t.customer_id)
    dealer = s.get(Dealership, t.dealership_id)
    draft = s.scalar(select(Draft).where(Draft.thread_id == t.id).order_by(Draft.id.desc()))
    vid = (draft.structured.get("vehicle_ids") if draft else None) or []
    v = s.get(Vehicle, vid[0]) if vid else None
    facts = [memory.fact_view(f, s) for f in memory.active_facts(s, t.id)]
    transitions = s.scalars(select(StateTransition).where(StateTransition.thread_id == t.id).order_by(StateTransition.id)).all()
    appt = s.scalar(select(Appointment).where(Appointment.thread_id == t.id).order_by(Appointment.id.desc()))
    return {
        "id": t.id, "customer": {"id": cust.id, "name": cust.display_name, "psid": cust.psid, "opted_out": cust.opted_out},
        "lead_state": t.lead_state.value, "priority": t.priority, "priority_reason": t.priority_reason, "ai_paused": t.ai_paused,
        "summary": t.summary, "summary_version": t.summary_version,
        "messages": [{"id": m.id, "direction": m.direction, "author": m.author, "text": m.text, "sent_at": m.sent_at.isoformat()} for m in t.messages],
        "facts": facts,
        "vehicle": inventory.vehicle_card(v) if v else None,
        "draft": _draft_view(draft) if draft else None,
        "messaging": policy.messaging_eligibility(t, cust),
        "transitions": [{"from": x.old_state, "to": x.new_state, "reason": x.reason, "actor": x.actor, "at": x.at.isoformat(), "evidence_message_id": x.evidence_message_id} for x in transitions],
        "appointment": {"id": appt.id, "starts_at": appt.starts_at.isoformat(), "status": appt.status} if appt else None,
        "hours_today": policy.hours_today(dealer.hours, dealer.timezone),
    }


def _draft_view(d: Draft) -> dict:
    return {"id": d.id, "text": d.text, "status": d.status, "risk_level": d.risk_level, "approval_required": d.approval_required, "structured": d.structured, "validation": d.validation, "provider": d.provider, "created_at": d.created_at.isoformat()}


class DraftEdit(BaseModel):
    text: str
    rep_id: int


@app.post("/api/drafts/{draft_id}/edit")
def edit_draft(draft_id: int, body: DraftEdit, s: Session = Depends(get_session)):
    d = s.get(Draft, draft_id)
    if not d or d.status in ("sent", "discarded"):
        raise HTTPException(409, "draft not editable")
    revalidate(s, d, body.text)
    return _draft_view(d)


class DraftSend(BaseModel):
    rep_id: int
    text: str | None = None  # final text; if given, re-validated before send


@app.post("/api/drafts/{draft_id}/send")
def send_draft(draft_id: int, body: DraftSend, s: Session = Depends(get_session)):
    """Rep approval → outbound send. The firewall runs one final time on the exact bytes that go out."""
    d = s.get(Draft, draft_id)
    if not d or d.status in ("sent", "discarded"):
        raise HTTPException(409, "draft not sendable")
    t = s.get(Thread, d.thread_id)
    cust = s.get(Customer, t.customer_id)
    if body.text is not None and body.text != d.text:
        revalidate(s, d, body.text)
    elig = policy.messaging_eligibility(t, cust)
    if not elig["eligible"]:
        raise HTTPException(403, {"blocked": True, "reason": elig["reason"], "message": "Messaging not permitted for this customer right now."})
    if d.status == "blocked" or d.risk_level == "red":
        raise HTTPException(422, {"blocked": True, "reason": d.validation.get("reasons", []), "message": "Draft contains unsupported claims. Edit the flagged sentences first."})
    if not d.text.strip():
        raise HTTPException(422, {"blocked": True, "message": "Nothing to send."})
    # → Messenger Send API goes here. Simulated: persist the outbound message.
    msg = Message(tenant_id=t.tenant_id, thread_id=t.id, external_id=f"out_{d.id}", direction="out", author="rep", text=d.text)
    s.add(msg)
    d.status = "sent"
    t.last_activity_at = datetime.now(timezone.utc)
    audit(s, t, f"rep:{body.rep_id}", "message.sent", {"draft_id": d.id, "risk": d.risk_level, "channel": "messenger-sim"})
    s.flush()
    return {"sent": True, "message_id": msg.id}


class TakeOver(BaseModel):
    rep_id: int
    paused: bool


@app.post("/api/threads/{thread_id}/takeover")
def takeover(thread_id: int, body: TakeOver, s: Session = Depends(get_session)):
    t = s.get(Thread, thread_id)
    t.ai_paused = body.paused
    t.assigned_rep_id = body.rep_id
    audit(s, t, f"rep:{body.rep_id}", "ai.paused" if body.paused else "ai.resumed", {})
    return {"ai_paused": t.ai_paused}


class FactCorrection(BaseModel):
    rep_id: int
    value: str | None  # None/empty = remove fact


@app.post("/api/facts/{fact_id}/correct")
def correct(fact_id: int, body: FactCorrection, s: Session = Depends(get_session)):
    f = s.get(MemoryFact, fact_id)
    if not f:
        raise HTTPException(404)
    nf = memory.correct_fact(s, f, body.value, body.rep_id)
    t = s.get(Thread, f.thread_id)
    audit(s, t, f"rep:{body.rep_id}", "memory.corrected", {"fact_id": f.id, "key": f.key, "old": f.value, "new": body.value})
    return {"ok": True, "fact": memory.fact_view(nf, s) if nf else None}


class StateChange(BaseModel):
    rep_id: int
    state: str
    reason: str = "rep correction"


@app.post("/api/threads/{thread_id}/state")
def set_state(thread_id: int, body: StateChange, s: Session = Depends(get_session)):
    t = s.get(Thread, thread_id)
    new = LeadState(body.state)
    s.add(StateTransition(tenant_id=t.tenant_id, thread_id=t.id, old_state=t.lead_state.value, new_state=new.value, reason=body.reason, actor=f"rep:{body.rep_id}", rules_version=RULES_VERSION))
    t.lead_state = new
    if new == LeadState.DO_NOT_CONTACT:
        s.get(Customer, t.customer_id).opted_out = True
    return {"lead_state": new.value}


class AppointmentConfirm(BaseModel):
    rep_id: int
    starts_at: datetime


@app.post("/api/threads/{thread_id}/appointment")
def confirm_appointment(thread_id: int, body: AppointmentConfirm, s: Session = Depends(get_session)):
    """The only way an appointment becomes 'confirmed'. The AI can never do this."""
    t = s.get(Thread, thread_id)
    d = s.scalar(select(Draft).where(Draft.thread_id == t.id).order_by(Draft.id.desc()))
    vid = (d.structured.get("vehicle_ids") if d else None) or []
    a = Appointment(tenant_id=t.tenant_id, thread_id=t.id, vehicle_id=vid[0] if vid else None, starts_at=body.starts_at, status="confirmed", confirmed_by_rep_id=body.rep_id)
    s.add(a)
    s.add(StateTransition(tenant_id=t.tenant_id, thread_id=t.id, old_state=t.lead_state.value, new_state="APPOINTMENT_SET", reason="rep confirmed appointment", actor=f"rep:{body.rep_id}", rules_version=RULES_VERSION))
    t.lead_state = LeadState.APPOINTMENT_SET
    audit(s, t, f"rep:{body.rep_id}", "appointment.confirmed", {"starts_at": body.starts_at.isoformat()})
    s.flush()
    return {"appointment_id": a.id, "status": a.status}


@app.get("/api/inventory")
def inv(s: Session = Depends(get_session)):
    d = s.scalar(select(Dealership))
    return [inventory.vehicle_card(v) for v in inventory.list_inventory(s, d.id)]


class InventoryUpdate(BaseModel):
    status: str | None = None
    price: int | None = None
    stale: bool = False  # demo: mark this row as retrieved long ago


@app.post("/api/inventory/{stock_number}")
def update_inventory(stock_number: str, body: InventoryUpdate, s: Session = Depends(get_session)):
    """Simulates the inventory feed changing under the AI (sold five minutes ago, stale feed...)."""
    v = s.scalar(select(Vehicle).where(Vehicle.stock_number == stock_number))
    if not v:
        raise HTTPException(404)
    if body.status:
        v.status = body.status
    if body.price:
        v.price = body.price
    from datetime import timedelta

    v.retrieved_at = datetime.now(timezone.utc) - (timedelta(hours=3) if body.stale else timedelta(seconds=0))
    return inventory.vehicle_card(v)


@app.get("/api/audit")
def audit_log(thread_id: int | None = None, s: Session = Depends(get_session)):
    q = select(AuditEvent).order_by(AuditEvent.id.desc()).limit(200)
    if thread_id:
        q = q.where(AuditEvent.thread_id == thread_id)
    return [{"id": a.id, "thread_id": a.thread_id, "actor": a.actor, "action": a.action, "detail": a.detail, "at": a.at.isoformat()} for a in s.scalars(q)]
