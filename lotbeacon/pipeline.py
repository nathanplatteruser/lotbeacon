"""The orchestrator. One inbound message → structured decision → validated draft → rep queue.

Order is fixed and deterministic:
  identity → store raw message → classify → extract memory → resolve vehicle (authoritative) → lead state →
  next-best action → assemble bounded context → draft → validate every claim → policy → risk → persist for approval.
"""
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from . import booking, inventory, memory, policy, voices
from .ai.base import AIProvider, Classification, DraftContext, ExtractedFact, get_provider
from .config import RULES_VERSION
from .models import (
    Appointment, AuditEvent, Customer, Dealership, Draft, LeadState, Message, StateTransition, Thread,
)
from .validator import validate

TERMINAL = {LeadState.SOLD, LeadState.LOST, LeadState.DO_NOT_CONTACT}


# ---------------------------------------------------------------- identity
def resolve_identity(s: Session, dealership: Dealership, psid: str, display_name: str = "") -> tuple[Customer, Thread]:
    """PSID is Page-scoped: same human on two Pages = two customers. Never auto-merge on name."""
    cust = s.scalar(select(Customer).where(Customer.dealership_id == dealership.id, Customer.psid == psid))
    if not cust:
        cust = Customer(tenant_id=dealership.tenant_id, dealership_id=dealership.id, psid=psid, display_name=display_name)
        s.add(cust)
        s.flush()
    elif display_name and not cust.display_name:
        cust.display_name = display_name
    thread = s.scalar(select(Thread).where(Thread.customer_id == cust.id).order_by(Thread.id.desc()))
    if not thread:
        thread = Thread(tenant_id=dealership.tenant_id, dealership_id=dealership.id, customer_id=cust.id)
        s.add(thread)
        s.flush()
    return cust, thread


def ingest_inbound(s: Session, dealership: Dealership, psid: str, external_id: str, text: str, display_name: str = "", sent_at: datetime | None = None) -> tuple[Thread, Message, bool]:
    """Idempotent: a duplicate external_id (Messenger mid) returns the existing message and does nothing else."""
    existing = s.scalar(select(Message).where(Message.tenant_id == dealership.tenant_id, Message.external_id == external_id))
    if existing:
        return existing.thread, existing, False
    cust, thread = resolve_identity(s, dealership, psid, display_name)
    msg = Message(tenant_id=dealership.tenant_id, thread_id=thread.id, external_id=external_id, direction="in", author="customer", text=text, sent_at=sent_at or datetime.now(timezone.utc))
    s.add(msg)
    thread.last_customer_message_at = msg.sent_at
    thread.last_activity_at = msg.sent_at
    thread.ghost_hours_sim = None  # they're back
    if thread.followup_stage:
        audit(s, thread, "system", "followup.ended", {"reason": "customer replied", "stage": thread.followup_stage})
        thread.followup_stage = 0
    s.flush()
    audit(s, thread, "system", "message.ingested", {"message_id": msg.id, "external_id": external_id})
    return thread, msg, True


def audit(s: Session, thread: Thread | None, actor: str, action: str, detail: dict | None = None):
    s.add(AuditEvent(tenant_id=thread.tenant_id if thread else 0, thread_id=thread.id if thread else None, actor=actor, action=action, detail=detail or {}))


# ---------------------------------------------------------------- lead state
def next_state(current: LeadState, cls: Classification, facts: dict, vehicle_resolved: bool) -> tuple[LeadState, str]:
    if current in TERMINAL:
        return current, "terminal state — no automatic progression"
    if cls.intent == "opt_out":
        return LeadState.DO_NOT_CONTACT, "customer asked to stop messaging"
    if cls.intent == "sold_elsewhere":
        return LeadState.LOST, "customer purchased elsewhere"
    if cls.intent == "complaint" or cls.sentiment == "angry":
        return LeadState.HUMAN_REQUIRED, "negative sentiment / complaint"
    if cls.intent == "financing" or "financing_sensitive" in facts:
        return LeadState.HUMAN_REQUIRED, "financing discussion requires a human"
    if cls.intent == "reschedule":
        return LeadState.HIGH_INTENT, "appointment cancelled / reschedule requested — still interested"
    if current in (LeadState.APPOINTMENT_SET, LeadState.ARRIVED) and cls.intent not in ("financing",):
        return current, "appointment stands"
    if cls.intent in ("hold", "warranty", "delivery"):
        return LeadState.HUMAN_REQUIRED, f"{cls.intent} question needs an authoritative answer"
    if cls.intent == "schedule":
        return LeadState.APPOINTMENT_INTENT, "customer proposed a visit/time"
    if cls.objection in ("price", "trade", "payment", "trust"):
        return LeadState.OBJECTION, f"objection: {cls.objection}"
    if facts.get("timing") and vehicle_resolved and cls.intent in ("availability", "general", "vehicle_search"):
        return LeadState.APPOINTMENT_INTENT, "specific unit + stated timing"
    if vehicle_resolved and cls.intent in ("availability", "price"):
        return LeadState.VEHICLE_INTEREST, "specific unit identified"
    if cls.intent == "vehicle_search":
        return LeadState.VEHICLE_MATCH if facts.get("need") or facts.get("budget") else LeadState.DISCOVERY, "requirements gathering"
    if current == LeadState.NEW:
        return LeadState.ENGAGED, "first exchange"
    return current, "no state change"


# ---------------------------------------------------------------- next best action
def next_best_action(state: LeadState, cls: Classification, facts: dict, vehicle: dict | None, fresh: bool) -> tuple[str, list[str], str]:
    """Returns (action, missing_information, reason)."""
    missing = []
    if state == LeadState.DO_NOT_CONTACT:
        return "escalate_opt_out", [], "suppress all outbound"
    if state in (LeadState.HUMAN_REQUIRED,):
        if cls.intent == "financing" or "financing_sensitive" in facts:
            return "route_financing_to_human", [], "financing is an orange-tier topic"
        if cls.intent == "hold":
            return "route_hold_to_human", [], "vehicle holds are dealer policy"
        if cls.intent == "warranty":
            return "route_warranty_to_human", [], "warranty terms need authoritative data"
        if cls.intent == "delivery":
            return "route_delivery_to_human", [], "delivery is dealer policy"
        return "human_takeover", [], "sensitive conversation"
    if state == LeadState.HIGH_INTENT and cls.intent == "reschedule":
        return "offer_reschedule", ["day"], "keep the visit alive — ask for a new day"
    if state == LeadState.LOST:
        return "acknowledge_and_close", [], "stop sales progression"
    if state == LeadState.OBJECTION:
        if cls.objection == "trade":
            return "route_trade_to_human", [], "trade value is appraiser-only"
        if cls.objection == "price":
            return "route_price_objection_to_human", [], "discounts need manager authorization"
        return "human_takeover", [], "objection needs a person"
    if state == LeadState.APPOINTMENT_SET:
        return "pre_visit_help", [], "appointment is booked — answer, reiterate the time, keep it warm"
    if state == LeadState.APPOINTMENT_INTENT:
        if "timing" not in facts:
            missing.append("day")
        missing.append("exact time")
        if vehicle and fresh and vehicle["status"] != "available":
            return "offer_alternatives", missing, "requested unit no longer available"
        return "invite_test_drive", missing, "offer two verified slots — one message cycle to a booking"
    if state == LeadState.VEHICLE_INTEREST:
        if cls.intent == "price":
            return "answer_price", missing, "verified price lookup"
        if vehicle and fresh and vehicle["status"] != "available":
            return "offer_alternatives", missing, "unit sold/pending — pivot"
        if facts.get("timing"):
            return "invite_test_drive", ["time"], "interest + timing → invite"
        return "answer_availability", ["timing"], "verified availability, then one useful question"
    if state in (LeadState.DISCOVERY, LeadState.VEHICLE_MATCH):
        if state == LeadState.VEHICLE_MATCH:
            return "offer_alternatives", ["timing"], "requirements known — show matching stock"
        return "ask_qualifying_question", ["need", "timing"], "gather 1–3 criteria"
    return "ask_qualifying_question", ["need"], "keep the conversation moving"


# ---------------------------------------------------------------- run
def process_message(s: Session, thread: Thread, msg: Message, provider: AIProvider | None = None, slot_prefer: str | None = None) -> Draft:
    provider = provider or get_provider()
    dealership = s.get(Dealership, thread.dealership_id)
    customer = s.get(Customer, thread.customer_id)
    history = [{"author": m.author, "text": m.text} for m in thread.messages[-10:]]

    # 1. classify (+ tone). Auto-voice only while the rep hasn't pinned one.
    cls = provider.classify(msg.text, history)
    if not thread.voice_locked and cls.voice_hint and cls.voice_hint in voices.VOICES and cls.voice_confidence >= voices.AUTO_THRESHOLD and cls.voice_hint != thread.voice:
        old_voice = thread.voice
        thread.voice = cls.voice_hint
        tone_sig = [x[5:] for x in cls.signals if x.startswith("tone:")][:3]
        thread.voice_reason = "auto · matched customer tone" + (f" ({', '.join(tone_sig)})" if tone_sig else "")
        audit(s, thread, f"ai:{provider.name}", "voice.auto", {"from": old_voice, "to": thread.voice, "confidence": cls.voice_confidence, "signals": tone_sig, "message_id": msg.id})
    elif not thread.voice_locked and not thread.voice_reason:
        thread.voice_reason = "auto · dealership default"

    # 2. memory
    inv = inventory.list_inventory(s, dealership.id)
    pre_facts = memory.facts_dict(memory.active_facts(s, thread.id))
    trade_lower = {w.lower() for w in (pre_facts.get("trade_vehicle") or "").split() if not w.isdigit()}
    hint = [{"year": v.year, "make": v.make, "model": v.model, "color": v.color, "stock_number": v.stock_number} for v in inv if v.model.lower() not in trade_lower]
    extracted = provider.extract_facts(msg.text, hint)
    # the customer's own car is never our "preferred vehicle"
    extracted = [e for e in extracted if not (e.key == "preferred_vehicle" and trade_lower and any(w in e.value.lower().split() for w in trade_lower))]
    memory.apply_extracted(s, thread, msg, extracted, provider.name)
    facts = memory.facts_dict(memory.active_facts(s, thread.id))
    if cls.objection and cls.objection not in facts.get("objection", []):
        memory.apply_extracted(s, thread, msg, [ExtractedFact("objection", cls.objection, cls.confidence, msg.text[:80])], provider.name)
        facts = memory.facts_dict(memory.active_facts(s, thread.id))

    all_facts = memory.active_facts(s, thread.id)
    certainty = memory.certainty_dict(all_facts)

    # 3. vehicle (authoritative)
    prior_vid = _prior_vehicle_id(s, thread)
    trade_words = [w for w in (facts.get("trade_vehicle") or "").split() if w and not w.isdigit()]
    vehicle = inventory.resolve_vehicle(s, dealership.id, msg.text, prior_vid, exclude_words=trade_words)
    vcard = inventory.vehicle_card(vehicle) if vehicle else None
    fresh = bool(vehicle and inventory.is_fresh(vehicle))
    needs = facts.get("need", [])
    body = vehicle.body if vehicle else ("SUV" if any("row" in n.lower() for n in needs) else None)
    alternatives = [inventory.vehicle_card(v) for v in inventory.search(s, dealership.id, body=body, max_price=inventory.parse_budget(facts.get("budget")), exclude_id=vehicle.id if vehicle else None)[:3]]

    # 4. state
    old = thread.lead_state
    new, reason = next_state(old, cls, facts, vehicle is not None)
    if new != old:
        thread.lead_state = new
        s.add(StateTransition(tenant_id=thread.tenant_id, thread_id=thread.id, old_state=old.value, new_state=new.value, reason=reason, evidence_message_id=msg.id, actor=f"ai:{provider.name}", rules_version=RULES_VERSION))
    if new == LeadState.DO_NOT_CONTACT:
        customer.opted_out = True
    if cls.intent == "reschedule":
        for a in s.scalars(select(Appointment).where(Appointment.thread_id == thread.id, Appointment.status.in_(["requested", "confirmed"]))):
            a.status = "cancelled"
            audit(s, thread, f"ai:{provider.name}", "appointment.cancelled_by_customer", {"appointment_id": a.id, "message_id": msg.id})

    # 4b. booking: resolve the day, read a slot choice, or propose two verified slots
    prior_draft = s.scalar(select(Draft).where(Draft.thread_id == thread.id, Draft.id != None).order_by(Draft.id.desc()))  # noqa: E711
    prior_slots = ((prior_draft.structured or {}).get("booking", {}) or {}).get("slots", []) if prior_draft else []
    prior_selected = ((prior_draft.structured or {}).get("booking", {}) or {}).get("selected") if prior_draft else None
    day = booking.resolve_date(facts.get("timing"), dealership)
    selected = booking.parse_time_choice(msg.text, prior_slots) if prior_slots else None
    if not selected and day and cls.intent in ("schedule", "availability", "general") and new not in TERMINAL:
        et = booking.parse_explicit_time(msg.text)
        if et and booking.hours_for(dealership, day):
            o, c = booking.hours_for(dealership, day)
            if o <= et < c:
                from datetime import datetime as _dt
                sl = booking.Slot(_dt.combine(day, et, booking.tz_of(dealership)))
                selected = {"label": sl.label, "day_label": sl.day_label, "iso": sl.iso(), "source": "customer_named"}
    if not selected and prior_selected and cls.intent not in ("reschedule", "opt_out", "sold_elsewhere", "complaint"):
        selected = prior_selected  # they picked earlier and are now chatting about something else
    if cls.intent == "reschedule":
        selected = None
    slots: list[dict] = []
    if day and not selected and new == LeadState.APPOINTMENT_INTENT:
        prefer = slot_prefer or ("morning" if "morning" in msg.text.lower() else ("afternoon" if "afternoon" in msg.text.lower() else None))
        slots = [{"label": x.label, "day_label": x.day_label, "iso": x.iso()} for x in booking.propose_slots(s, dealership, day, prefer)]
    clarify = None
    asked = facts.get("asked_about", [])
    already_clarified = any(m.direction == "out" and ("not AWD" in m.text or "not 4WD" in m.text or "rather than" in m.text) for m in thread.messages)
    if vcard and vcard.get("drivetrain") and not already_clarified and any(a in ("AWD", "4WD") and a != vcard["drivetrain"] for a in asked):
        clarify = f"Quick note: this {vcard['model']} is {vcard['drivetrain']}, not {[a for a in asked if a in ('AWD', '4WD')][0]} — happy to walk you through the difference."

    # 5. NBA
    action, missing, nba_reason = next_best_action(new, cls, facts, vcard, fresh)
    if selected and new == LeadState.APPOINTMENT_INTENT:
        action, missing, nba_reason = "book_selected_slot", [], f"customer chose {selected['label']} {selected['day_label']} — book it and send the confirmation in one step"
    if day and new == LeadState.APPOINTMENT_INTENT and not selected:
        missing = [m for m in missing if m != "day"]
    thread.priority, thread.priority_reason = _priority(new, cls, facts, fresh)
    thread.summary = _summarize(customer, facts, vcard, new, cls)
    thread.summary_version = f"sum-v1:{provider.name}"

    # 6. bounded context → draft
    appt = s.scalar(select(Appointment).where(Appointment.thread_id == thread.id, Appointment.status == "confirmed").order_by(Appointment.id.desc()))
    appt_confirmed = appt is not None
    appt_info = None
    if appt:
        _sl = booking.Slot(booking.as_utc(appt.starts_at).astimezone(booking.tz_of(dealership)))
        appt_info = {"day_label": _sl.day_label, "label": _sl.label}
    ctx = DraftContext(
        dealership_name=dealership.name, voice=voices.get(thread.voice).style_guide, voice_name=voices.get(thread.voice).label, customer_name=customer.display_name,
        recent_messages=history, facts={k: v for k, v in facts.items() if k != "financing_sensitive"}, vehicle=vcard, vehicle_fresh=fresh,
        alternatives=alternatives, hours_today=policy.hours_today(dealership.hours, dealership.timezone), recommended_action=action,
        missing_information=missing,
        must_not_claim=["availability unless vehicle_fresh", "any price not on the vehicle card", "financing/APR/payments", "trade value", "appointment booked", "discounts", "warranty terms"],
        slots=slots or None, clarify=clarify, appointment=appt_info,
    )
    text = "" if (thread.ai_paused or action == "book_selected_slot") else provider.draft(ctx)

    # 7. validate + policy + risk
    elig = policy.messaging_eligibility(thread, customer)
    result = validate(text, vehicle=vcard, vehicle_fresh=fresh, alternatives=alternatives, hours_today=ctx.hours_today, appointment_confirmed=appt_confirmed, messaging=elig, ai_paused=thread.ai_paused)
    risk = result.risk_level
    if action in ("route_financing_to_human", "route_trade_to_human", "route_price_objection_to_human", "human_takeover", "route_hold_to_human", "route_warranty_to_human", "route_delivery_to_human"):
        risk = _max_risk(risk, "orange")
    if action == "escalate_opt_out":
        risk = "red"

    structured = {
        "intent": cls.intent, "sentiment": cls.sentiment, "objection": cls.objection, "classification_confidence": cls.confidence,
        "lead_state": new.value, "state_reason": reason, "customer_facts": facts, "vehicle_ids": [vehicle.id] if vehicle else [],
        "vehicle_fresh": fresh, "missing_information": missing, "recommended_action": action, "nba_reason": nba_reason,
        "tools_used": ["inventory.resolve_vehicle", "inventory.search", "policy.messaging_eligibility", "memory.extract"],
        "citations": ([f"inventory:{vcard['stock_number']}@{vcard['retrieved_at']}"] if vcard else []) + [f"message:{msg.id}"],
        "messaging_eligibility": elig, "rules_version": RULES_VERSION, "provider": provider.name,
        "voice": thread.voice, "voice_locked": thread.voice_locked, "voice_reason": thread.voice_reason,
        "fact_certainty": certainty, "clarify": clarify,
        "booking": booking.booking_view(s, thread, dealership, facts, certainty, slots, vcard, selected),
    }
    status = "blocked" if result.blocked else ("escalated" if risk == "orange" and not text else "pending")
    if not text and not result.blocked:
        status = "ready_to_book" if action == "book_selected_slot" else "escalated"
    draft = Draft(tenant_id=thread.tenant_id, thread_id=thread.id, trigger_message_id=msg.id, text=text, structured=structured, validation=result.to_dict(), risk_level=risk, status=status, approval_required=True, provider=provider.name)
    s.add(draft)
    s.flush()
    audit(s, thread, f"ai:{provider.name}", "draft.created", {"draft_id": draft.id, "risk": risk, "status": status, "action": action})
    return draft


def regenerate(s: Session, draft: Draft, provider: AIProvider | None = None, slot_prefer: str | None = None) -> Draft:
    """Re-run the pipeline for the same trigger message (e.g. after a voice change). Memory dedups; state is stable."""
    thread = s.get(Thread, draft.thread_id)
    msg = s.get(Message, draft.trigger_message_id)
    if draft.status in ("pending", "blocked", "escalated", "ready_to_book"):
        draft.status = "discarded"
    return process_message(s, thread, msg, provider, slot_prefer=slot_prefer)


def revalidate(s: Session, draft: Draft, new_text: str) -> Draft:
    """Rep edited the text: run the exact same firewall on their words."""
    thread = s.get(Thread, draft.thread_id)
    customer = s.get(Customer, thread.customer_id)
    dealership = s.get(Dealership, thread.dealership_id)
    vid = (draft.structured.get("vehicle_ids") or [None])[0]
    vehicle = s.get(inventory.Vehicle, vid) if vid else None
    vcard = inventory.vehicle_card(vehicle) if vehicle else None
    fresh = bool(vehicle and inventory.is_fresh(vehicle))
    appt = s.scalar(select(Appointment).where(Appointment.thread_id == thread.id, Appointment.status == "confirmed")) is not None
    res = validate(new_text, vehicle=vcard, vehicle_fresh=fresh, alternatives=[], hours_today=policy.hours_today(dealership.hours, dealership.timezone), appointment_confirmed=appt, messaging=policy.messaging_eligibility(thread, customer))
    draft.text = new_text
    draft.validation = res.to_dict()
    draft.risk_level = res.risk_level
    draft.status = "blocked" if res.blocked else "pending"
    audit(s, thread, "rep", "draft.edited", {"draft_id": draft.id, "risk": draft.risk_level, "blocked": res.blocked})
    return draft


# ---------------------------------------------------------------- helpers
def _prior_vehicle_id(s: Session, thread: Thread) -> int | None:
    d = s.scalar(select(Draft).where(Draft.thread_id == thread.id).order_by(Draft.id.desc()))
    ids = (d.structured.get("vehicle_ids") if d else None) or []
    return ids[0] if ids else None


def _priority(state: LeadState, cls: Classification, facts: dict, fresh: bool) -> tuple[int, str]:
    base = {
        LeadState.APPOINTMENT_INTENT: 90, LeadState.HIGH_INTENT: 85, LeadState.HUMAN_REQUIRED: 80, LeadState.OBJECTION: 70,
        LeadState.VEHICLE_INTEREST: 65, LeadState.VEHICLE_MATCH: 55, LeadState.DISCOVERY: 45, LeadState.ENGAGED: 40, LeadState.NEW: 35,
        LeadState.NURTURE: 20, LeadState.SOLD: 5, LeadState.LOST: 0, LeadState.DO_NOT_CONTACT: 0,
    }.get(state, 30)
    reasons = [state.value.replace("_", " ").lower()]
    if facts.get("timing"):
        base += 5
        reasons.append(f"timing: {facts['timing']}")
    if facts.get("trade_vehicle"):
        base += 3
        reasons.append("has trade")
    if cls.sentiment == "angry":
        base += 5
        reasons.append("angry")
    return min(base, 99), " · ".join(reasons)


def _summarize(customer: Customer, facts: dict, vcard: dict | None, state: LeadState, cls: Classification) -> str:
    name = customer.display_name or "Customer"
    bits = []
    if vcard:
        bits.append(f"is asking about the {vcard['year']} {vcard['make']} {vcard['model']}" + (f" ({vcard['color']})" if vcard.get("color") else "") + f" — {vcard['status']}" + ("" if vcard["fresh"] else ", inventory stale"))
    if facts.get("need"):
        bits.append("wants " + ", ".join(facts["need"]))
    if facts.get("trade_vehicle"):
        bits.append(f"has a {facts['trade_vehicle']} to trade")
    if facts.get("timing"):
        bits.append(f"could visit {facts['timing']}")
    if facts.get("budget"):
        bits.append(f"stated budget {facts['budget']}")
    if cls.objection:
        bits.append(f"raised a {cls.objection} concern")
    s = f"{name} " + ("; ".join(bits) if bits else "opened a conversation") + f". State: {state.value}."
    return s


def _max_risk(a: str, b: str) -> str:
    from .validator import RANK

    return a if RANK[a] >= RANK[b] else b
