"""Conversation momentum: is this customer moving toward the showroom, stalling, or slipping away?

One propensity score per customer message (0–100), derived from the funnel stage reached and the tone/intent of that
message. The trend over the last few points is the momentum. This is a rep-facing heuristic, not a prediction model —
it is deliberately transparent so a rep can argue with it.
"""
from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import Draft, Thread

STAGE = {"NEW": 1, "ENGAGED": 2, "DISCOVERY": 3, "VEHICLE_MATCH": 3, "VEHICLE_INTEREST": 4, "OBJECTION": 4, "HIGH_INTENT": 5,
         "APPOINTMENT_INTENT": 6, "APPOINTMENT_SET": 7, "ARRIVED": 8, "SOLD": 9, "REVIEW_ELIGIBLE": 9,
         "NURTURE": 2, "HUMAN_REQUIRED": 3, "LOST": 0, "DO_NOT_CONTACT": 0}
SENTIMENT = {"positive": 8, "neutral": 0, "negative": -12, "angry": -20}
INTENT = {"schedule": 10, "availability": 4, "vehicle_search": 2, "price": 0, "general": 0, "trade": -2, "financing": -6, "complaint": -15, "sold_elsewhere": -60, "opt_out": -100}


def score_point(structured: dict) -> int:
    state = structured.get("lead_state", "NEW")
    base = STAGE.get(state, 1) * 10
    s = base + SENTIMENT.get(structured.get("sentiment"), 0) + INTENT.get(structured.get("intent"), 0)
    if structured.get("customer_facts", {}).get("timing"):
        s += 5
    if structured.get("objection"):
        s -= 5
    return max(0, min(100, s))


def series_for(s: Session, thread: Thread) -> list[int]:
    """One point per customer message: the newest draft's structured output for each trigger message."""
    drafts = s.scalars(select(Draft).where(Draft.thread_id == thread.id).order_by(Draft.id)).all()
    by_msg: dict[int, Draft] = {}
    for d in drafts:
        if d.trigger_message_id:
            by_msg[d.trigger_message_id] = d  # later drafts (regenerations) overwrite
    return [score_point(by_msg[m].structured) for m in sorted(by_msg)]


def trend(series: list[int]) -> tuple[str, int]:
    """(direction, delta). up/flat/down over the last three points; a single point is 'flat' unless it's extreme."""
    if not series:
        return "flat", 0
    if len(series) == 1:
        v = series[0]
        return ("down", 0) if v <= 10 else ("flat", 0)
    window = series[-3:]
    delta = window[-1] - window[0]
    if series[-1] <= 10:
        return "down", delta
    if delta >= 6:
        return "up", delta
    if delta <= -6:
        return "down", delta
    return "flat", delta


def view(s: Session, thread: Thread) -> dict:
    ser = series_for(s, thread)
    direction, delta = trend(ser)
    label = {"up": "Gaining momentum", "flat": "Holding steady", "down": "Losing momentum"}[direction]
    return {"series": ser, "trend": direction, "delta": delta, "label": label, "score": ser[-1] if ser else None}
