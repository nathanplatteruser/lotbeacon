"""HTTP surface: simulated Messenger channel + rep workspace API. Run with `uvicorn lotbeacon.api:app`."""
from datetime import datetime, timezone
from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from . import __version__, booking, inventory, memory, metrics, momentum, policy, queue, timefmt, voices
from .ai.base import resolve_provider_name
from .config import RULES_VERSION
from .db import get_session, init_db
from .models import Appointment, AuditEvent, Customer, Dealership, Draft, LeadState, MemoryFact, Message, Rep, StateTransition, Thread, Vehicle
from .validator import validate
from .pipeline import audit, ingest_inbound, process_message, regenerate, revalidate

app = FastAPI(title="LotBeacon", version=__version__)
WEB = Path(__file__).parent / "web"


@app.on_event("startup")
def _startup():
    init_db()
    from . import seed

    seed.run()
    _start_feed_refresher()


def _start_feed_refresher():
    """Simulates the inventory feed polling. Rows the rep deliberately made stale (source '… (paused)') are left alone."""
    import threading

    from .db import session_scope

    def tick():
        try:
            with session_scope() as s:
                for v in s.scalars(select(Vehicle).where(Vehicle.source == "pilot-feed-sim")):
                    v.retrieved_at = datetime.now(timezone.utc)
        except Exception:  # noqa: BLE001
            pass
        threading.Timer(60, tick).start()

    threading.Timer(60, tick).start()


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
    return {"version": __version__, "provider": resolve_provider_name(), "rules_version": RULES_VERSION, "dealership": {"id": d.id, "name": d.name, "page_id": d.page_id, "hours_today": policy.hours_today(d.hours, d.timezone)}, "reps": [{"id": r.id, "name": r.name, "role": r.role} for r in reps], "voices": voices.as_list()}


@app.get("/api/queue")
def action_queue(s: Session = Depends(get_session)):
    """The rep's work list. Buckets + one-line next action per row. No scores."""
    return queue.build(s, ghost_view)


@app.get("/api/metrics/owner")
def owner(days: int = 7, s: Session = Depends(get_session)):
    """Owner dashboard: usage + return, with the assumptions shown next to every dollar."""
    return metrics.owner_dashboard(s, days=days)


@app.get("/api/threads/{thread_id}/impact")
def impact(thread_id: int, s: Session = Depends(get_session)):
    t = s.get(Thread, thread_id)
    if not t:
        raise HTTPException(404)
    return metrics.thread_impact(s, t)


class Assumptions(BaseModel):
    values: dict


@app.post("/api/metrics/assumptions")
def set_assumptions(body: Assumptions, s: Session = Depends(get_session)):
    """Dealership-editable ROI inputs. Whole numbers and rates only; nothing here touches customer data."""
    for k, v in body.values.items():
        if k in metrics.ASSUMPTIONS:
            try:
                metrics.ASSUMPTIONS[k] = float(v)
            except (TypeError, ValueError):
                pass
    return metrics.ASSUMPTIONS


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
            "waiting": timefmt.since(t.last_customer_message_at),
            "momentum": momentum.view(s, t), "ghost": (ghost_view(t) or {}).get("label"),
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
        "lead_state": t.lead_state.value, "priority": t.priority, "priority_reason": t.priority_reason, "ai_paused": t.ai_paused, "voice": t.voice or "dealer", "voice_locked": t.voice_locked, "voice_reason": t.voice_reason,
        "funnel": funnel_view(t, transitions), "your_move": your_move(t, draft, cust), "momentum": momentum.view(s, t), "ghost": ghost_view(t),
        "demo_remaining": max(0, len(t.demo_script or []) - t.demo_cursor),
        "summary": t.summary, "summary_version": t.summary_version,
        "messages": [{"id": m.id, "direction": m.direction, "author": m.author, "sender": m.sender or ("customer" if m.direction == "in" else "rep"), "text": m.text, "sent_at": m.sent_at.isoformat(), "ago": timefmt.since(m.sent_at)} for m in t.messages],
        "booking": ((draft.structured or {}).get("booking") if draft else None) or booking.booking_view(s, t, dealer, memory.facts_dict(memory.active_facts(s, t.id)), {}, [], inventory.vehicle_card(v) if v else None),
        "ownership": ownership_view(s, t),
        "window": window_view(t, cust),
        "clarify": (draft.structured or {}).get("clarify") if draft else None,
        "facts": facts,
        "vehicle": inventory.vehicle_card(v) if v else None,
        "draft": _draft_view(draft) if draft else None,
        "messaging": policy.messaging_eligibility(t, cust),
        "transitions": [{"from": x.old_state, "to": x.new_state, "reason": x.reason, "actor": x.actor, "at": x.at.isoformat(), "evidence_message_id": x.evidence_message_id} for x in transitions],
        "appointment": {"id": appt.id, "starts_at": appt.starts_at.isoformat(), "status": appt.status} if appt else None,
        "hours_today": policy.hours_today(dealer.hours, dealer.timezone),
    }


def ownership_view(s: Session, t: Thread) -> dict:
    rep = s.get(Rep, t.assigned_rep_id) if t.assigned_rep_id else None
    return {"rep_id": t.assigned_rep_id, "rep_name": rep.name if rep else None, "ai_drafting": not t.ai_paused,
            "line": (("AI drafting · " if not t.ai_paused else "Manual · ") + (f"{rep.name} sends" if rep else "unassigned — you send") + " · no autonomous sends")}


def window_view(t: Thread, cust: Customer) -> dict:
    e = policy.messaging_eligibility(t, cust)
    left = queue._hours_left(e) if e.get("eligible") else 0.0
    return {"channel": "Facebook Messenger", "open": bool(e.get("eligible")), "reason": e.get("reason"), "remaining": timefmt.humanize(left * 3600) if left is not None else None, "hours_left": left, "closing_soon": bool(left is not None and e.get("eligible") and left < 4)}


# ------------------------------------------------------------------ funnel tracker (Domino's-style)
FUNNEL = [("ENGAGE", "Engage"), ("QUALIFY", "Qualify"), ("BOOK", "Book"), ("VISIT", "Visit outcome")]
_STAGE_OF = {"NEW": 0, "ENGAGED": 0, "DISCOVERY": 1, "VEHICLE_MATCH": 1, "VEHICLE_INTEREST": 1, "OBJECTION": 1, "HIGH_INTENT": 2, "APPOINTMENT_INTENT": 2, "APPOINTMENT_SET": 2, "ARRIVED": 3, "SOLD": 3, "REVIEW_ELIGIBLE": 3, "HUMAN_REQUIRED": 1, "NURTURE": 1}
_PAUSED = {"HIGH_INTENT": None, "HUMAN_REQUIRED": "Paused — a person needs to take this one", "OBJECTION": "Working through an objection", "LOST": "Closed — customer went elsewhere", "DO_NOT_CONTACT": "Stopped — customer opted out", "NURTURE": "Parked — follow up later, when permitted"}


def funnel_view(t: Thread, transitions) -> dict:
    states = [x.new_state for x in transitions] + [t.lead_state.value, "NEW"]
    reached = [_STAGE_OF[s] for s in states if s in _STAGE_OF]
    furthest = max(reached) if reached else 0
    cur = _STAGE_OF.get(t.lead_state.value, furthest)
    sub = {"NEW": "New inquiry", "ENGAGED": "In conversation", "DISCOVERY": "Learning needs", "VEHICLE_MATCH": "Matching vehicles", "VEHICLE_INTEREST": "Specific vehicle", "OBJECTION": "Working an objection", "HIGH_INTENT": "Ready to visit", "APPOINTMENT_INTENT": "Visit interest", "APPOINTMENT_SET": "Appointment booked", "ARRIVED": "Showed up", "SOLD": "Sold", "LOST": "Lost", "DO_NOT_CONTACT": "Opted out", "HUMAN_REQUIRED": "Needs a person", "NURTURE": "Follow up later"}.get(t.lead_state.value, t.lead_state.value)
    return {"stages": [{"key": k, "label": l} for k, l in FUNNEL], "current": cur, "furthest": max(cur, furthest), "paused": _PAUSED.get(t.lead_state.value), "state": t.lead_state.value, "substate": sub}


def your_move(t: Thread, d: Draft | None, cust: Customer) -> dict:
    """One plain sentence telling the rep exactly what to do next. Stupid simple, on purpose."""
    if cust.opted_out or t.lead_state == LeadState.DO_NOT_CONTACT:
        return {"kind": "stop", "text": "Nothing to send. This customer opted out — do not contact them."}
    if t.lead_state == LeadState.LOST:
        return {"kind": "done", "text": "Send the thank-you if you like, then close it out. No more selling."}
    if t.ai_paused:
        return {"kind": "you", "text": "You have the thread. Type your reply — it still gets claim-checked before it goes out."}
    g = ghost_view(t)
    if g and (not d or d.status == "sent"):
        if t.followup_stage >= 3:
            return {"kind": "wait", "text": f"Quiet for {g['label']} and you've sent all three nudges. Park it in Follow up later, or log a call if you reached them another way."}
        if t.followup_stage:
            return {"kind": "you", "text": f"Still quiet ({g['label']}) after nudge {t.followup_stage}. Your call: send nudge {t.followup_stage + 1}, or log the call/text if you already reached them."}
        return {"kind": "you", "text": f"No reply in {g['label']}. Your call: start a follow-up sequence, or log it if you've already called or texted them."}
    if not d:
        return {"kind": "wait", "text": "Waiting on the customer."}
    a = d.structured.get("recommended_action", "")
    if d.status == "sent":
        return {"kind": "wait", "text": "Sent. Waiting on the customer's reply."}
    if a == "route_financing_to_human":
        return {"kind": "you", "text": "Financing question. Approve the hand-off reply, then call or loop in F&I yourself — the AI will not quote payments."}
    if a == "route_trade_to_human":
        return {"kind": "you", "text": "They want a trade number. Approve the hand-off reply, then get the appraiser involved — no values over Messenger."}
    if a == "route_price_objection_to_human":
        return {"kind": "you", "text": "Price pushback. Approve the hand-off reply and take it to your sales manager."}
    if a == "human_takeover":
        return {"kind": "you", "text": "Sensitive conversation. Hit Take over and reply personally."}
    if a == "route_hold_to_human":
        return {"kind": "you", "text": "They want the car held. Approve the reply, then ask your sales manager — the AI never promises a hold."}
    if a == "route_warranty_to_human":
        return {"kind": "you", "text": "Warranty question. Approve the reply, then pull the real coverage sheet for that VIN and send it yourself."}
    if a == "route_delivery_to_human":
        return {"kind": "you", "text": "Delivery request. Approve the reply, then check the store's delivery policy before promising anything."}
    if a == "book_selected_slot" or (d.status == "ready_to_book"):
        sel = (d.structured.get("booking") or {}).get("selected") or {}
        return {"kind": "book", "text": f"Book {sel.get('label', 'the slot')} {sel.get('day_label', '')} + send confirmation. One click does both."}
    if a == "pre_visit_help":
        return {"kind": "approve", "text": "Appointment is booked. Answer their question and send — the time is restated for them."}
    if a.startswith("follow_up_"):
        return {"kind": "approve", "text": f"Follow-up {a[-1]} of 3 is drafted. Read it, hit Send — or skip it if you've already reached them another way."}
    if a == "offer_reschedule":
        return {"kind": "approve", "text": "They cancelled but they're still interested. Send the reschedule reply, and cancel the old slot in your scheduler."}
    if d.status == "blocked" or d.risk_level == "red":
        return {"kind": "fix", "text": "Fix the red sentence(s) in the draft, hit Re-check claims, then Send."}
    if a == "invite_test_drive":
        return {"kind": "approve", "text": "Send the two times. When they pick one, the Book button lights up."}
    if t.lead_state == LeadState.APPOINTMENT_SET:
        return {"kind": "approve", "text": "Appointment is set. When they arrive, mark Showed up in the stage menu."}
    return {"kind": "approve", "text": "Read the draft, edit if you want, hit Send."}


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
    rep = s.get(Rep, body.rep_id)
    msg = Message(tenant_id=t.tenant_id, thread_id=t.id, external_id=f"out_{d.id}", direction="out", author="rep", sender=rep.name if rep else "rep", text=d.text)
    s.add(msg)
    d.status = "sent"
    t.last_activity_at = datetime.now(timezone.utc)
    if not t.assigned_rep_id:
        t.assigned_rep_id = body.rep_id
    audit(s, t, f"rep:{body.rep_id}", "message.sent", {"draft_id": d.id, "risk": d.risk_level, "channel": "messenger-sim"})
    s.flush()
    demo = _demo_advance(s, t)
    return {"sent": True, "message_id": msg.id, "demo": demo, "next_thread_id": _next_reply_now(s, t.id)}


def _next_reply_now(s: Session, exclude: int) -> int | None:
    q = queue.build(s, ghost_view)
    for r in q["rows"]:
        if r["bucket"] in ("book_now", "reply_now", "window_closing") and r["id"] != exclude:
            return r["id"]
    return None


class Book(BaseModel):
    rep_id: int
    slot_iso: str | None = None  # defaults to the customer's selected slot


@app.post("/api/threads/{thread_id}/book")
def book(thread_id: int, body: Book, s: Session = Depends(get_session)):
    """ONE action: save the appointment (confirmed), send the confirmation, assign the owner, advance the funnel.
    The rep clicking this button IS the approval; the confirmation text still passes the claim check."""
    t = s.get(Thread, thread_id)
    cust = s.get(Customer, t.customer_id)
    dealer = s.get(Dealership, t.dealership_id)
    d = s.scalar(select(Draft).where(Draft.thread_id == t.id).order_by(Draft.id.desc()))
    bk = (d.structured.get("booking") if d else {}) or {}
    sel = bk.get("selected")
    iso = body.slot_iso or (sel or {}).get("iso")
    if not iso:
        raise HTTPException(422, {"message": "No time selected yet. Send the two options first, or pick a slot."})
    starts = datetime.fromisoformat(iso).astimezone(timezone.utc)
    elig = policy.messaging_eligibility(t, cust)
    if not elig["eligible"]:
        raise HTTPException(403, {"message": "Messaging window closed — book it, then call to confirm."})
    vid = (d.structured.get("vehicle_ids") if d else None) or []
    v = s.get(Vehicle, vid[0]) if vid else None
    # 1. appointment (confirmed — this is the only path that creates one)
    for old in s.scalars(select(Appointment).where(Appointment.thread_id == t.id, Appointment.status.in_(["requested", "confirmed"]))):
        old.status = "cancelled"
    a = Appointment(tenant_id=t.tenant_id, thread_id=t.id, vehicle_id=v.id if v else None, starts_at=starts, status="confirmed", confirmed_by_rep_id=body.rep_id, owner_rep_id=body.rep_id)
    s.add(a)
    s.flush()
    # 2. confirmation text in the thread's voice, then the claim check (appointment now exists, so "you're set" is allowed)
    slot = booking.Slot(starts.astimezone(booking.tz_of(dealer)))  # display in dealership local time
    first = (cust.display_name or "").split(" ")[0]
    vtxt = f" for the {v.year} {v.make} {v.model}" if v else ""
    facts = memory.facts_dict(memory.active_facts(s, t.id))
    trade = f" We'll have the appraiser ready for your {facts['trade_vehicle']}." if facts.get("trade_vehicle") else ""
    rep_name = (s.get(Rep, body.rep_id).name if s.get(Rep, body.rep_id) else "me")
    text = f"You're set, {first} — {slot.day_label} at {slot.label}{vtxt}.{trade} Ask for {rep_name} when you arrive" + (f" — {dealer.address}." if dealer.address else ".")
    vcard = inventory.vehicle_card(v) if v else None
    res = validate(text, vehicle=vcard, vehicle_fresh=bool(v and inventory.is_fresh(v)), alternatives=[], hours_today=None, appointment_confirmed=True, messaging=elig)
    if res.blocked:
        raise HTTPException(422, {"message": "Confirmation text failed the claim check.", "claims": res.to_dict()["claims"]})
    rep = s.get(Rep, body.rep_id)
    m = Message(tenant_id=t.tenant_id, thread_id=t.id, external_id=f"out_book_{a.id}", direction="out", author="rep", sender=rep.name if rep else "rep", text=text)
    s.add(m)
    if d and d.status in ("pending", "ready_to_book", "escalated"):
        d.status = "sent"
    # 3. owner + funnel
    t.assigned_rep_id = body.rep_id
    s.add(StateTransition(tenant_id=t.tenant_id, thread_id=t.id, old_state=t.lead_state.value, new_state="APPOINTMENT_SET", reason=f"booked {slot.day_label} {slot.label}", actor=f"rep:{body.rep_id}", rules_version=RULES_VERSION))
    t.lead_state = LeadState.APPOINTMENT_SET
    t.last_activity_at = datetime.now(timezone.utc)
    audit(s, t, f"rep:{body.rep_id}", "appointment.booked", {"appointment_id": a.id, "starts_at": iso, "vehicle_id": v.id if v else None, "confirmation_message_id": None})
    s.flush()
    demo = _demo_advance(s, t)
    return {"appointment_id": a.id, "starts_at": iso, "label": f"{slot.day_label} · {slot.label}", "confirmation": text, "demo": demo, "next_thread_id": _next_reply_now(s, t.id)}


class SlotPrefer(BaseModel):
    rep_id: int
    prefer: str = ""  # "" | morning | afternoon


@app.post("/api/threads/{thread_id}/slots")
def reslot(thread_id: int, body: SlotPrefer, s: Session = Depends(get_session)):
    """Rep wants a different verified pair (both morning / both afternoon). Redrafts with those slots."""
    t = s.get(Thread, thread_id)
    d = s.scalar(select(Draft).where(Draft.thread_id == t.id).order_by(Draft.id.desc()))
    if not d or not d.trigger_message_id:
        raise HTTPException(409, "nothing to redraft")
    new = regenerate(s, d, slot_prefer=body.prefer or None)
    audit(s, t, f"rep:{body.rep_id}", "slots.repicked", {"prefer": body.prefer})
    return {"draft": _draft_view(new)}


class Assign(BaseModel):
    rep_id: int


@app.post("/api/threads/{thread_id}/assign")
def assign(thread_id: int, body: Assign, s: Session = Depends(get_session)):
    t = s.get(Thread, thread_id)
    if t.assigned_rep_id != body.rep_id:
        t.assigned_rep_id = body.rep_id
        audit(s, t, f"rep:{body.rep_id}", "thread.assigned", {})
    return ownership_view(s, t)


def _demo_advance(s: Session, t: Thread) -> dict | None:
    """DEMO ONLY: the persona answers instantly — or goes quiet. Production has no such thing; Messenger does."""
    script = t.demo_script or []
    if t.demo_cursor >= len(script):
        return None
    item = script[t.demo_cursor]
    t.demo_cursor += 1
    if isinstance(item, dict) and "ghost" in item:
        t.ghost_hours_sim = float(item["ghost"])
        audit(s, t, "demo", "customer.ghosted", {"hours": item["ghost"]})
        return {"ghost_hours": item["ghost"]}
    dealer = s.get(Dealership, t.dealership_id)
    cust = s.get(Customer, t.customer_id)
    thread, msg, new = ingest_inbound(s, dealer, cust.psid, f"demo_{t.id}_{t.demo_cursor}", str(item), cust.display_name)
    if new:
        process_message(s, thread, msg)
    return {"replied": str(item)}


def ghost_view(t: Thread) -> dict | None:
    """Silence after our last message. Simulated hours in the demo; real elapsed time otherwise (threshold 4h)."""
    msgs = [m for m in t.messages if m.direction in ("in", "out")]
    if not msgs or msgs[-1].direction != "out":
        return None
    if t.ghost_hours_sim is not None:
        hrs = t.ghost_hours_sim
    else:
        last = msgs[-1].sent_at
        if last.tzinfo is None:
            last = last.replace(tzinfo=timezone.utc)
        hrs = (datetime.now(timezone.utc) - last).total_seconds() / 3600
        if hrs < 4:
            return None
    return {"hours": round(hrs, 1), "label": timefmt.humanize(hrs * 3600), "simulated": t.ghost_hours_sim is not None, "followup_stage": t.followup_stage}


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


class VoiceChange(BaseModel):
    rep_id: int
    voice: str


@app.post("/api/threads/{thread_id}/voice")
def set_voice(thread_id: int, body: VoiceChange, s: Session = Depends(get_session)):
    """Rep picks a voice profile for this thread. Tone only — the draft is regenerated and re-validated."""
    t = s.get(Thread, thread_id)
    if body.voice == "auto":
        t.voice_locked = False
        last = s.scalar(select(Message).where(Message.thread_id == t.id, Message.direction == "in").order_by(Message.id.desc()))
        vh, vconf, vsig = voices.detect(last.text) if last else (None, 0, [])
        t.voice = vh if (vh and vconf >= voices.AUTO_THRESHOLD) else "dealer"
        t.voice_reason = ("auto · matched customer tone (" + ", ".join(vsig[:3]) + ")") if t.voice != "dealer" else "auto · dealership default"
        audit(s, t, f"rep:{body.rep_id}", "voice.auto_enabled", {"voice": t.voice})
    else:
        if body.voice not in voices.VOICES:
            raise HTTPException(400, "unknown voice")
        t.voice, t.voice_locked, t.voice_reason = body.voice, True, "rep picked this voice"
        audit(s, t, f"rep:{body.rep_id}", "voice.changed", {"voice": body.voice})
    d = s.scalar(select(Draft).where(Draft.thread_id == t.id).order_by(Draft.id.desc()))
    new = regenerate(s, d) if d and d.trigger_message_id else None
    return {"voice": t.voice, "voice_locked": t.voice_locked, "voice_reason": t.voice_reason, "draft": _draft_view(new) if new else None}


class FollowUp(BaseModel):
    rep_id: int
    action: str  # start | next | stop


@app.post("/api/threads/{thread_id}/followup")
def followup(thread_id: int, body: FollowUp, s: Session = Depends(get_session)):
    """Rep-initiated only. Never automatic: the rep may know about calls/texts this product can't see."""
    t = s.get(Thread, thread_id)
    cust = s.get(Customer, t.customer_id)
    if body.action == "stop":
        audit(s, t, f"rep:{body.rep_id}", "followup.stopped", {"stage": t.followup_stage})
        t.followup_stage = 0
        return {"stage": 0, "draft": None}
    stage = min(t.followup_stage + 1, 3)
    elig = policy.messaging_eligibility(t, cust)
    t.followup_stage = stage
    audit(s, t, f"rep:{body.rep_id}", "followup.requested", {"stage": stage, "eligible": elig["eligible"], "reason": elig.get("reason")})
    if not elig["eligible"]:
        return {"stage": stage, "draft": None, "blocked": True, "reason": elig["reason"],
                "message": "Messenger won't allow an outbound message here — the customer hasn't written in over 24 hours. Call or text them instead, then log it."}
    text = voices.followup_text(stage, voices.get(t.voice), cust.display_name)
    from .validator import validate

    res = validate(text, vehicle=None, vehicle_fresh=False, alternatives=[], hours_today=None, appointment_confirmed=False, messaging=elig)
    last_in = s.scalar(select(Message).where(Message.thread_id == t.id, Message.direction == "in").order_by(Message.id.desc()))
    d = Draft(tenant_id=t.tenant_id, thread_id=t.id, trigger_message_id=last_in.id if last_in else None, text=text,
              structured={"recommended_action": f"follow_up_{stage}", "nba_reason": f"rep-initiated follow-up {stage} of 3", "lead_state": t.lead_state.value, "intent": "follow_up", "customer_facts": {}, "vehicle_ids": [], "missing_information": [], "messaging_eligibility": elig, "voice": t.voice},
              validation=res.to_dict(), risk_level=res.risk_level, status="blocked" if res.blocked else "pending", approval_required=True, provider="template")
    s.add(d)
    s.flush()
    return {"stage": stage, "draft": _draft_view(d), "blocked": res.blocked}


class Offline(BaseModel):
    rep_id: int
    channel: str  # call | text | email | visit
    note: str = ""


@app.post("/api/threads/{thread_id}/offline")
def log_offline(thread_id: int, body: Offline, s: Session = Depends(get_session)):
    """The rep reached the customer somewhere this product can't see. Log it so the thread stops looking ghosted."""
    t = s.get(Thread, thread_id)
    icon = {"call": "📞", "text": "💬", "email": "✉️", "visit": "🚗"}.get(body.channel, "📝")
    m = Message(tenant_id=t.tenant_id, thread_id=t.id, external_id=f"note_{t.id}_{int(datetime.now(timezone.utc).timestamp())}", direction="note", author="rep", text=f"{icon} {body.channel.title()} logged by rep" + (f" — {body.note}" if body.note else ""))
    s.add(m)
    t.ghost_hours_sim = None
    t.last_activity_at = datetime.now(timezone.utc)
    audit(s, t, f"rep:{body.rep_id}", "offline.logged", {"channel": body.channel, "note": body.note})
    s.flush()
    return {"ok": True, "message_id": m.id}


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

    if body.stale:
        v.retrieved_at = datetime.now(timezone.utc) - timedelta(hours=3)
        v.source = "pilot-feed-sim (paused)"
    else:
        v.retrieved_at = datetime.now(timezone.utc)
        v.source = "pilot-feed-sim"
    return inventory.vehicle_card(v)


@app.get("/api/audit")
def audit_log(thread_id: int | None = None, s: Session = Depends(get_session)):
    q = select(AuditEvent).order_by(AuditEvent.id.desc()).limit(200)
    if thread_id:
        q = q.where(AuditEvent.thread_id == thread_id)
    return [{"id": a.id, "thread_id": a.thread_id, "actor": a.actor, "action": a.action, "detail": a.detail, "at": a.at.isoformat()} for a in s.scalars(q)]
