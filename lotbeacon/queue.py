"""The action queue. Answers three questions per row without opening the thread:
what happened · how long have they waited · what do I do next.

Deterministic ranking. No scores on the surface. Buckets, in order of urgency:
  reply_now · book_now · window_closing · appointment_changes · followup_due · waiting · closed
"""
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from . import policy, timefmt
from .models import Customer, Draft, LeadState, Thread, Vehicle

BUCKETS = [
    ("reply_now", "Reply now", "Customer is waiting on you"),
    ("book_now", "Time selected — book now", "One click books it and sends the confirmation"),
    ("window_closing", "Window closing", "Messenger reply window ends within 4 hours"),
    ("appointment_changes", "Appointment changes", "Cancelled or needs rescheduling"),
    ("followup_due", "Follow-up due", "Quiet since our last message — your call"),
    ("waiting", "Waiting on customer", "You replied; nothing to do yet"),
    ("closed", "Closed", "Sold, lost, or opted out"),
]

ACTION_TEXT = {
    "book_selected_slot": "Book {slot} + send confirmation",
    "invite_test_drive": "Offer {day} times",
    "answer_availability": "Confirm availability, ask for a day",
    "answer_price": "Send the listed price",
    "offer_alternatives": "Offer matching alternatives",
    "ask_qualifying_question": "Ask one qualifying question",
    "route_financing_to_human": "Hand financing to F&I — approve the hand-off reply",
    "route_trade_to_human": "Hand trade value to the appraiser",
    "route_price_objection_to_human": "Take pricing to the sales manager",
    "route_hold_to_human": "Ask manager about the hold",
    "route_warranty_to_human": "Pull real warranty details",
    "route_delivery_to_human": "Check delivery policy",
    "offer_reschedule": "Offer a new day",
    "human_takeover": "Reply personally",
    "acknowledge_and_close": "Send thanks, close out",
    "escalate_opt_out": "Do not contact",
    "pre_visit_help": "Answer, reiterate the appointment",
}


def _hours_left(elig: dict) -> float | None:
    exp = elig.get("expires_at")
    if not exp:
        return None
    dt = datetime.fromisoformat(exp)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return max(0.0, (dt - datetime.now(timezone.utc)).total_seconds() / 3600)


def row_for(s: Session, t: Thread, ghost: dict | None) -> dict:
    cust = s.get(Customer, t.customer_id)
    d = s.scalar(select(Draft).where(Draft.thread_id == t.id).order_by(Draft.id.desc()))
    st = (d.structured if d else {}) or {}
    vid = (st.get("vehicle_ids") or [None])[0]
    v = s.get(Vehicle, vid) if vid else None
    booking = st.get("booking") or {}
    facts = st.get("customer_facts") or {}
    elig = policy.messaging_eligibility(t, cust)
    hours_left = _hours_left(elig) if elig.get("eligible") else 0.0
    msgs = [m for m in t.messages if m.direction in ("in", "out")]
    last = msgs[-1] if msgs else None
    customer_waiting = bool(last and last.direction == "in")
    waiting_since = last.sent_at if last else None
    action = st.get("recommended_action", "")
    state = t.lead_state

    # ---- bucket
    if state in (LeadState.SOLD, LeadState.LOST, LeadState.DO_NOT_CONTACT) or cust.opted_out:
        bucket = "closed"
    elif d and d.status == "ready_to_book":
        bucket = "book_now"
    elif st.get("intent") == "reschedule" and customer_waiting:
        bucket = "appointment_changes"
    elif customer_waiting and d and d.status in ("pending", "blocked", "escalated"):
        bucket = "window_closing" if (hours_left is not None and hours_left < 4) else "reply_now"
    elif ghost:
        bucket = "followup_due"
    elif customer_waiting:
        bucket = "reply_now"
    else:
        bucket = "waiting"

    # ---- one-line "what happened"
    bits = []
    if booking.get("stage") == "booked":
        bits.append(f"Booked {booking.get('date_label', '')} {booking.get('time_label', '')}".strip())
    elif booking.get("selected"):
        bits.append(f"Picked {booking['selected']['label']} {booking['selected']['day_label'].split(',')[0]}")
    elif facts.get("timing"):
        cert = (st.get("fact_certainty") or {}).get("timing")
        bits.append(f"{facts['timing']} visit" + (" (tentative)" if cert == "tentative" else ""))
    if facts.get("trade_vehicle"):
        bits.append(f"{facts['trade_vehicle']} trade")
    if st.get("objection"):
        bits.append(f"{st['objection']} pushback")
    if st.get("intent") in ("financing", "hold", "warranty", "delivery", "reschedule"):
        bits.append({"financing": "financing question", "hold": "wants a hold", "warranty": "warranty question", "delivery": "delivery request", "reschedule": "cancelled / reschedule"}[st["intent"]])
    if not bits and v:
        bits.append("asked about the " + f"{v.year} {v.model}")
    if not bits:
        bits.append({"LOST": "bought elsewhere", "DO_NOT_CONTACT": "opted out"}.get(state.value, "new inquiry"))

    # ---- next action text
    if bucket == "closed":
        next_action = "Nothing to do" if state != LeadState.LOST else "Close out"
    elif bucket == "followup_due":
        next_action = f"Quiet {ghost['label']} — follow up or log a call"
    elif bucket == "waiting":
        next_action = "Waiting on customer"
    else:
        tmpl = ACTION_TEXT.get(action, "Review and send")
        next_action = tmpl.format(slot=(booking.get("selected") or {}).get("label", ""), day=(booking.get("date_label") or facts.get("timing") or "visit").split(",")[0])
        if d and d.status == "blocked":
            next_action = "Fix the flagged sentence, then send"

    return {
        "id": t.id, "customer": cust.display_name or cust.psid, "channel": "Facebook Messenger", "bucket": bucket,
        "waiting": timefmt.since(waiting_since) if customer_waiting else "", "waiting_seconds": int((datetime.now(timezone.utc) - (waiting_since if waiting_since.tzinfo else waiting_since.replace(tzinfo=timezone.utc))).total_seconds()) if (customer_waiting and waiting_since) else 0,
        "summary": " · ".join(bits), "next_action": next_action, "vehicle": f"{v.year} {v.model}" if v else None,
        "window_left": timefmt.humanize(hours_left * 3600) if hours_left is not None else None, "window_hours_left": hours_left,
        "unread": customer_waiting, "owner": t.assigned_rep_id, "blocked": bool(d and d.status == "blocked"),
        "needs_person": action.startswith("route_") or action == "human_takeover",
        "last_customer_message_at": t.last_customer_message_at.isoformat() if t.last_customer_message_at else None,
        # details (hidden by default in the UI)
        "state": state.value, "priority": t.priority,
    }


def build(s: Session, ghost_view) -> dict:
    rows = [row_for(s, t, ghost_view(t)) for t in s.scalars(select(Thread))]
    order = {k: i for i, (k, _, _) in enumerate(BUCKETS)}

    def sort_key(r):
        # inside a bucket: window closing soonest first, then longest-waiting first
        return (order[r["bucket"]], (r["window_hours_left"] if r["bucket"] == "window_closing" and r["window_hours_left"] is not None else 99), -r["waiting_seconds"])

    rows.sort(key=sort_key)
    counts = {k: sum(1 for r in rows if r["bucket"] == k) for k, _, _ in BUCKETS}
    return {"buckets": [{"key": k, "label": l, "hint": h, "count": counts[k]} for k, l, h in BUCKETS], "rows": rows}
