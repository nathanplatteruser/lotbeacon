"""Usage and return metrics — the validation signals a team should see over and over.

Two framings, kept separate on purpose:
  USAGE  — is the tool being used?      active conversations, drafts sent, acceptance rate, keyboard/queue throughput
  RETURN — is it delivering value?      median first response, rep attention saved, claims routed for verification,
                                        appointments booked, windows saved, attributed pipeline
Every dollar figure is derived from ASSUMPTIONS the dealership can edit; they are shown next to the number, never hidden.
"""
import statistics
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from . import timefmt
from .models import Appointment, AuditEvent, Draft, LeadState, Message, Rep, Thread

# Dealership-editable assumptions (blueprint §19 uses 7.0 vs 1.8 minutes per thread as the pilot hypothesis).
ASSUMPTIONS = {
    "baseline_minutes_per_reply": 7.0,      # unassisted: reconstruct context, check inventory, type
    "assisted_minutes_accept": 1.5,          # read + approve as drafted
    "assisted_minutes_edit": 3.0,            # read + edit + approve
    "manual_minutes": 6.0,                   # rep typed it themselves (AI paused) — still had the card
    "loaded_rep_hourly_cost": 38.0,          # $/hour fully loaded
    "appointment_show_rate": 0.62,           # industry-typical set→show
    "show_close_rate": 0.45,                 # show→sold
    "gross_per_unit": 2400.0,                # front + back gross per used unit
    "value_of_prevented_false_claim": 150.0, # avg cost of a walk-back / goodwill / lost deal
}


def _aware(dt: datetime) -> datetime:
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def _edit_ratio(a: str, b: str) -> float:
    """0 = identical, 1 = completely different (token Jaccard distance)."""
    A, B = set(a.lower().split()), set(b.lower().split())
    if not A and not B:
        return 0.0
    return 1 - len(A & B) / max(1, len(A | B))


def thread_facts(s: Session, t: Thread) -> dict:
    """Everything impact needs about one thread, computed from the record — no estimates yet."""
    msgs = [m for m in t.messages if m.direction in ("in", "out")]
    first_in = next((m for m in msgs if m.direction == "in"), None)
    first_out = next((m for m in msgs if m.direction == "out"), None)
    first_response_s = (_aware(first_out.sent_at) - _aware(first_in.sent_at)).total_seconds() if first_in and first_out and first_out.sent_at >= first_in.sent_at else None
    # per-reply response times (each customer block → next outbound)
    resp = []
    pending = None
    for m in msgs:
        if m.direction == "in" and pending is None:
            pending = m
        elif m.direction == "out" and pending is not None:
            resp.append((_aware(m.sent_at) - _aware(pending.sent_at)).total_seconds())
            pending = None
    drafts = s.scalars(select(Draft).where(Draft.thread_id == t.id).order_by(Draft.id)).all()
    sent = [d for d in drafts if d.status == "sent"]
    accepted_as_is = edited = manual = 0
    for d in sent:
        out = next((m for m in msgs if m.direction == "out" and m.text == d.text), None)
        if d.provider == "template" or not d.text:
            manual += 1
        elif out is not None:
            accepted_as_is += 1
        else:
            # find the outbound that followed this draft and measure how much the rep changed it
            later = [m for m in msgs if m.direction == "out" and _aware(m.sent_at) >= _aware(d.created_at)]
            if later and _edit_ratio(later[0].text, d.text) < 0.15:
                accepted_as_is += 1
            else:
                edited += 1
    claims_routed = 0
    blocked_sends = 0
    routed_to_human = 0
    for d in drafts:
        cl = (d.validation or {}).get("claims", [])
        claims_routed += sum(1 for c in cl if c.get("verdict") in ("unsupported", "prohibited"))
        if d.status == "blocked":
            blocked_sends += 1
        if (d.structured or {}).get("recommended_action", "").startswith("route_"):
            routed_to_human += 1
    appts = s.scalars(select(Appointment).where(Appointment.thread_id == t.id)).all()
    booked = any(a.status in ("confirmed", "showed") for a in appts)
    showed = any(a.status == "showed" for a in appts) or t.lead_state == LeadState.ARRIVED or t.lead_state == LeadState.SOLD
    outbound = len([m for m in msgs if m.direction == "out"])
    inbound = len([m for m in msgs if m.direction == "in"])
    corrections = s.scalar(select(AuditEvent).where(AuditEvent.thread_id == t.id, AuditEvent.action == "memory.corrected")) is not None
    # "routed for verification" = a factual claim the firewall refused to let through + a consequential question (financing,
    # trade value, hold, warranty, delivery, discount) the AI handed to a person instead of answering itself.
    claims_routed += routed_to_human
    return {"inbound": inbound, "outbound": outbound, "first_response_s": first_response_s, "response_times_s": resp,
            "drafts": len(drafts), "sent": len(sent), "accepted_as_is": accepted_as_is, "edited": edited, "manual": manual,
            "claims_routed": claims_routed, "blocked_sends": blocked_sends, "routed_to_human": routed_to_human,
            "booked": booked, "showed": showed, "sold": t.lead_state == LeadState.SOLD, "state": t.lead_state.value,
            "closed": t.lead_state in (LeadState.LOST, LeadState.DO_NOT_CONTACT, LeadState.SOLD), "corrections": corrections,
            "last_activity": _aware(t.last_activity_at) if t.last_activity_at else None}


def minutes_saved(f: dict, a: dict = ASSUMPTIONS) -> float:
    base = f["outbound"] * a["baseline_minutes_per_reply"]
    assisted = f["accepted_as_is"] * a["assisted_minutes_accept"] + f["edited"] * a["assisted_minutes_edit"] + f["manual"] * a["manual_minutes"]
    # replies not attributable to a draft (seeded history) count as assisted-edit
    unattributed = max(0, f["outbound"] - (f["accepted_as_is"] + f["edited"] + f["manual"]))
    assisted += unattributed * a["assisted_minutes_edit"]
    return max(0.0, base - assisted)


def thread_impact(s: Session, t: Thread, a: dict = ASSUMPTIONS) -> dict:
    f = thread_facts(s, t)
    mins = minutes_saved(f, a)
    pipeline = a["gross_per_unit"] * a["appointment_show_rate"] * a["show_close_rate"] if f["booked"] and not f["sold"] else (a["gross_per_unit"] if f["sold"] else 0.0)
    prevented = f["claims_routed"] * a["value_of_prevented_false_claim"]
    stage_word = {"booked": "Appointment booked", "showed": "Showed", "sold": "Sold"}
    reached = "Sold" if f["sold"] else ("Showed" if f["showed"] else ("Appointment booked" if f["booked"] else {"APPOINTMENT_INTENT": "Visit interest", "HIGH_INTENT": "Ready to visit", "VEHICLE_INTEREST": "Specific vehicle", "OBJECTION": "Working an objection", "HUMAN_REQUIRED": "Handed to a person", "LOST": "Lost", "DO_NOT_CONTACT": "Opted out"}.get(f["state"], "In conversation")))
    headline = []
    if f["booked"]:
        headline.append("Appointment on the board")
    if f["claims_routed"]:
        headline.append(f"{f['claims_routed']} claim{'s' if f['claims_routed'] != 1 else ''} kept out of the customer's inbox")
    if mins >= 3:
        headline.append(f"{timefmt.humanize(mins * 60)} of rep attention saved")
    if f["first_response_s"] is not None and f["first_response_s"] < 600:
        headline.append(f"First reply in {timefmt.humanize(f['first_response_s'])}")
    return {
        "reached": reached, "headline": headline or ["Conversation in progress"],
        "usage": {"customer_messages": f["inbound"], "replies_sent": f["outbound"], "drafts_accepted_as_is": f["accepted_as_is"], "drafts_edited": f["edited"], "typed_manually": f["manual"]},
        "speed": {"first_response": timefmt.humanize(f["first_response_s"]) if f["first_response_s"] is not None else None, "median_response": timefmt.humanize(statistics.median(f["response_times_s"])) if f["response_times_s"] else None},
        "safety": {"claims_routed_for_verification": f["claims_routed"], "blocked_sends": f["blocked_sends"], "handed_to_a_person": f["routed_to_human"], "rep_corrections": int(f["corrections"])},
        "return": {"rep_minutes_saved": round(mins, 1), "rep_cost_saved": round(mins / 60 * a["loaded_rep_hourly_cost"], 2), "expected_gross": round(pipeline, 0), "prevented_claim_value": round(prevented, 0)},
        "assumptions": a,
        "explain": [
            f"Rep attention saved = replies × {a['baseline_minutes_per_reply']:.0f} min unassisted − (accepted × {a['assisted_minutes_accept']:.1f} + edited × {a['assisted_minutes_edit']:.1f} + manual × {a['manual_minutes']:.1f}) min.",
            f"Expected gross = ${a['gross_per_unit']:,.0f}/unit × {a['appointment_show_rate']:.0%} show × {a['show_close_rate']:.0%} close, only once an appointment is booked; 100% once sold.",
            f"Prevented-claim value = claims routed for verification × ${a['value_of_prevented_false_claim']:,.0f} (walk-backs, goodwill, lost trust).",
        ],
    }


def owner_dashboard(s: Session, a: dict = ASSUMPTIONS, days: int = 7) -> dict:
    now = datetime.now(timezone.utc)
    threads = s.scalars(select(Thread)).all()
    facts = [(t, thread_facts(s, t)) for t in threads]
    recent = [(t, f) for t, f in facts if f["last_activity"] and f["last_activity"] >= now - timedelta(days=days)]
    active = [(t, f) for t, f in recent if not f["closed"]]
    first_resp = [f["first_response_s"] for _, f in recent if f["first_response_s"] is not None]
    all_resp = [x for _, f in recent for x in f["response_times_s"]]
    mins = sum(minutes_saved(f, a) for _, f in recent)
    claims = sum(f["claims_routed"] for _, f in recent)
    blocked = sum(f["blocked_sends"] for _, f in recent)
    routed = sum(f["routed_to_human"] for _, f in recent)
    sent = sum(f["sent"] for _, f in recent)
    acc = sum(f["accepted_as_is"] for _, f in recent)
    edited = sum(f["edited"] for _, f in recent)
    inquiries = len(recent)
    visit_interest = sum(1 for _, f in recent if f["state"] in ("APPOINTMENT_INTENT", "HIGH_INTENT", "APPOINTMENT_SET", "ARRIVED", "SOLD") or f["booked"])
    booked = sum(1 for _, f in recent if f["booked"])
    showed = sum(1 for _, f in recent if f["showed"])
    sold = sum(1 for _, f in recent if f["sold"])
    windows_lost = sum(1 for t, f in recent if not f["closed"] and t.last_customer_message_at and (now - _aware(t.last_customer_message_at)) > timedelta(hours=24) and (not t.messages or t.messages[-1].direction == "in"))
    opted_out = sum(1 for _, f in recent if f["state"] == "DO_NOT_CONTACT")
    corrections = sum(1 for _, f in recent if f["corrections"])
    expected_gross = booked * a["gross_per_unit"] * a["appointment_show_rate"] * a["show_close_rate"] + sold * a["gross_per_unit"]
    # per-rep
    reps = {r.id: r.name for r in s.scalars(select(Rep))}
    per_rep: dict = {}
    for t, f in recent:
        if t.assigned_rep_id:
            r = per_rep.setdefault(reps.get(t.assigned_rep_id, "?"), {"threads": 0, "replies": 0, "booked": 0, "minutes_saved": 0.0})
            r["threads"] += 1; r["replies"] += f["outbound"]; r["booked"] += int(f["booked"]); r["minutes_saved"] += minutes_saved(f, a)
    # response-time distribution (buckets) for a small bar chart
    buckets = [("<2m", 120), ("2–10m", 600), ("10–60m", 3600), ("1–4h", 14400), (">4h", 10**9)]
    dist = []
    lo = 0
    for label, hi in buckets:
        dist.append({"label": label, "n": sum(1 for x in all_resp if lo <= x < hi)})
        lo = hi
    return {
        "window_days": days,
        "usage": {
            "active_conversations": len(active), "conversations_touched": len(recent), "replies_sent": sent,
            "draft_acceptance_rate": round((acc + edited) / sent, 2) if sent else None, "accepted_as_is_rate": round(acc / sent, 2) if sent else None,
            "reps_active": len(per_rep),
        },
        "speed": {
            "median_first_response_s": statistics.median(first_resp) if first_resp else None,
            "median_first_response": timefmt.humanize(statistics.median(first_resp)) if first_resp else "—",
            "p90_first_response": timefmt.humanize(sorted(first_resp)[int(0.9 * (len(first_resp) - 1))]) if first_resp else "—",
            "response_distribution": dist, "windows_lost": windows_lost,
        },
        "safety": {"claims_routed_for_verification": claims, "blocked_sends": blocked, "handed_to_a_person": routed, "opt_outs_honored": opted_out, "rep_corrections": corrections, "autonomous_sends": 0},
        "funnel": {"inquiries": inquiries, "visit_interest": visit_interest, "booked": booked, "showed": showed, "sold": sold,
                   "inquiry_to_booked": round(booked / inquiries, 2) if inquiries else None, "booked_to_showed": round(showed / booked, 2) if booked else None},
        "return": {"rep_minutes_saved": round(mins), "rep_hours_saved": round(mins / 60, 1), "rep_cost_saved": round(mins / 60 * a["loaded_rep_hourly_cost"]),
                   "expected_gross": round(expected_gross), "prevented_claim_value": round(claims * a["value_of_prevented_false_claim"]),
                   "capacity_multiplier": round(a["baseline_minutes_per_reply"] / max(0.1, (a["assisted_minutes_accept"] * acc + a["assisted_minutes_edit"] * (sent - acc)) / max(1, sent)), 1) if sent else None},
        "per_rep": [{"rep": k, **{kk: (round(vv, 1) if isinstance(vv, float) else vv) for kk, vv in v.items()}} for k, v in sorted(per_rep.items(), key=lambda kv: -kv[1]["replies"])],
        "assumptions": a,
    }
