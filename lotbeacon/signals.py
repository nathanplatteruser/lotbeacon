"""Communication signals for the selected-thread right pane.

Each series is one point per customer communication (same blocks as momentum.py). Scores are
derived from the pipeline's existing structured read of that block: lead state, intent, sentiment,
objection, booking, and stated facts. No new prediction model. Unknown stays off the page.
"""
from sqlalchemy.orm import Session

from . import memory, momentum
from .models import Thread

CLASSIC_OBJECTIONS = ("price", "payment", "trade", "trust", "timing", "spouse", "stall")
OBJ_WEIGHT = {"price": 28, "payment": 26, "spouse": 22, "stall": 20, "trust": 24, "trade": 18, "timing": 16}

SIGNAL_META = (
    ("purchase_intent", "Purchase intent"),
    ("price_friction", "Price friction"),
    ("engagement", "Engagement"),
    ("visit_progression", "Visit progression"),
    ("objection_hints", "Objection hints"),
)

DEAL_FACT_KEYS = {
    "discount_approval": "Discount approval",
    "maintenance_approval": "Maintenance approval",
    "objection": "Objection",
    "trade_vehicle": "Trade",
    "financing_sensitive": "Financing exception",
}

OBJ_LABEL = {
    "price": "price",
    "payment": "financing",
    "trade": "trade",
    "trust": "trust",
    "timing": "timing",
    "spouse": "spouse / need to talk to someone",
    "stall": "think-about-it / smokescreen",
}


def _clamp(n: int) -> int:
    return max(0, min(100, n))


def _facts(st: dict) -> dict:
    return st.get("customer_facts") or {}


def _objs(st: dict) -> set[str]:
    facts = _facts(st)
    raw = facts.get("objection") or []
    if isinstance(raw, str):
        raw = [raw]
    out = {x for x in raw if x}
    if st.get("objection"):
        out.add(st["objection"])
    if st.get("intent") == "financing":
        out.add("payment")
    return out


def score_purchase_intent(st: dict) -> int:
    intent, sent, state = st.get("intent"), st.get("sentiment"), st.get("lead_state", "NEW")
    if intent in ("sold_elsewhere", "opt_out") or state in ("LOST", "DO_NOT_CONTACT"):
        return 0
    base = {
        "NEW": 15, "ENGAGED": 22, "DISCOVERY": 28, "VEHICLE_MATCH": 32, "VEHICLE_INTEREST": 40,
        "OBJECTION": 36, "HIGH_INTENT": 62, "APPOINTMENT_INTENT": 78, "APPOINTMENT_SET": 88,
        "ARRIVED": 95, "SOLD": 100, "HUMAN_REQUIRED": 30, "NURTURE": 18, "REVIEW_ELIGIBLE": 100,
    }.get(state, 20)
    if intent == "schedule":
        base += 12
    if _facts(st).get("timing"):
        base += 8
    if sent == "positive":
        base += 6
    elif sent == "negative":
        base -= 8
    elif sent == "angry":
        base -= 20
    if intent == "complaint":
        base -= 10
    return _clamp(base)


def score_price_friction(st: dict) -> int:
    intent, obj = st.get("intent"), st.get("objection")
    score = 0
    if obj == "price" or intent == "price":
        score += 55
    if "price" in _objs(st):
        score += 18
    if intent == "price" and obj == "price":
        score += 12
    return _clamp(score)


def score_engagement(st: dict, text: str = "") -> int:
    sent, intent = st.get("sentiment"), st.get("intent")
    if intent in ("opt_out", "sold_elsewhere"):
        return 5
    score = 42
    if sent == "positive":
        score += 20
    elif sent == "negative":
        score -= 16
    elif sent == "angry":
        score -= 28
    if intent in ("schedule", "availability"):
        score += 10
    n = len(text or "")
    if n and n < 18:
        score -= 8
    if n > 90:
        score += 8
    return _clamp(score)


def score_visit_progression(st: dict) -> int:
    intent, state = st.get("intent"), st.get("lead_state", "NEW")
    bk = st.get("booking") or {}
    if intent == "reschedule":
        return 35
    if state in ("LOST", "DO_NOT_CONTACT"):
        return 0
    score = {
        "NEW": 5, "ENGAGED": 8, "DISCOVERY": 12, "VEHICLE_MATCH": 15, "VEHICLE_INTEREST": 22,
        "OBJECTION": 18, "HIGH_INTENT": 48, "APPOINTMENT_INTENT": 70, "APPOINTMENT_SET": 92,
        "ARRIVED": 100, "SOLD": 100, "HUMAN_REQUIRED": 20, "NURTURE": 10, "REVIEW_ELIGIBLE": 100,
    }.get(state, 10)
    if _facts(st).get("timing"):
        score += 10
    if intent == "schedule":
        score += 8
    if bk.get("stage") == "time_selected":
        score = max(score, 82)
    if bk.get("stage") == "booked":
        score = max(score, 92)
    return _clamp(score)


def score_objection_hints(st: dict) -> int:
    present = {o for o in _objs(st) if o in CLASSIC_OBJECTIONS}
    return _clamp(sum(OBJ_WEIGHT.get(o, 12) for o in present))


SCORERS = {
    "purchase_intent": lambda st, text: score_purchase_intent(st),
    "price_friction": lambda st, text: score_price_friction(st),
    "engagement": lambda st, text: score_engagement(st, text),
    "visit_progression": lambda st, text: score_visit_progression(st),
    "objection_hints": lambda st, text: score_objection_hints(st),
}


def _why(key: str, prev: int | None, score: int, st: dict) -> str:
    facts = _facts(st)
    intent, obj, state = st.get("intent"), st.get("objection"), st.get("lead_state")
    rose = prev is None or score > prev
    fell = prev is not None and score < prev
    if key == "purchase_intent":
        if rose and facts.get("timing"):
            return f"They named {facts['timing']} as a visit window."
        if rose and intent == "schedule":
            return "They asked to come in, which raises purchase intent."
        if rose and state == "APPOINTMENT_INTENT":
            return "Visit interest is now on the record."
        if fell and obj:
            return f"A {OBJ_LABEL.get(obj, obj)} concern showed up in the last message."
        if fell and intent == "reschedule":
            return "They cancelled or asked to move the visit."
        if fell and intent in ("sold_elsewhere", "opt_out"):
            return "They said they bought elsewhere or asked to stop."
        return "Purchase intent held after this communication."
    if key == "price_friction":
        if score == 0:
            return "No price pushback in this communication."
        if rose and obj == "price":
            return "They pushed on price in their own words."
        if rose and intent == "price":
            return "They asked about price after talking availability or a visit."
        if fell:
            return "The latest message did not add new price pressure."
        return "Price friction is still on the thread."
    if key == "engagement":
        if rose and st.get("sentiment") == "positive":
            return "Tone turned positive in this communication."
        if fell and st.get("sentiment") == "angry":
            return "They came in angry. That drops engagement until it cools."
        if fell and st.get("sentiment") == "negative":
            return "Tone went negative in this communication."
        if rose:
            return "They kept the conversation moving."
        return "Engagement held at this communication."
    if key == "visit_progression":
        if intent == "reschedule":
            return "They asked to cancel or move the visit."
        if rose and (st.get("booking") or {}).get("stage") == "booked":
            return "A time is booked on the record."
        if rose and facts.get("timing"):
            return f"Visit timing is on the record: {facts['timing']}."
        if rose and intent == "schedule":
            return "They asked for a test drive or a time."
        if fell:
            return "This communication did not move the visit forward."
        return "Visit progression held after this communication."
    # objection_hints
    present = [OBJ_LABEL[o] for o in CLASSIC_OBJECTIONS if o in _objs(st)]
    if not present:
        return "No classic objection in this communication."
    if rose:
        return "Objection hints rose: " + ", ".join(present) + "."
    return "Objection hints still on file: " + ", ".join(present) + "."


def _headline(signals: list[dict], st: dict) -> dict | None:
    by = {x["key"]: x for x in signals}
    parts = []
    if by["purchase_intent"]["score"] >= 70:
        parts.append("HIGH INTENT")
    pf, oh = by["price_friction"], by["objection_hints"]
    if pf["score"] >= 50 and pf["trend"] == "up":
        parts.append("PRICE FRICTION ESCALATING")
    elif pf["score"] >= 60:
        parts.append("PRICE FRICTION")
    if oh["score"] >= 36 and oh["trend"] == "up":
        parts.append("OBJECTION HINTS RISING")
    if not parts:
        return None
    conf = int(round(float(st.get("classification_confidence") or 0) * 100))
    if conf and conf < 70:
        return None
    why = None
    if "PRICE FRICTION" in " ".join(parts):
        why = pf["why"]
    elif "OBJECTION" in " ".join(parts):
        why = oh["why"]
    else:
        why = by["purchase_intent"]["why"]
    return {"text": " · ".join(parts), "confidence": conf or None, "why": why}


def view(s: Session, thread: Thread) -> dict:
    blocks = momentum.draft_blocks(s, thread)
    signals = []
    for key, label in SIGNAL_META:
        series = [SCORERS[key](b["structured"], b["text"]) for b in blocks]
        direction, delta = momentum.trend(series)
        prev = series[-2] if len(series) > 1 else None
        score = series[-1] if series else None
        st = blocks[-1]["structured"] if blocks else {}
        why = _why(key, prev, score, st) if score is not None else "No customer communication to score yet."
        signals.append({
            "key": key, "label": label, "series": series, "score": score, "delta": delta,
            "trend": direction, "why": why,
        })
    st = blocks[-1]["structured"] if blocks else {}
    return {
        "events": len(blocks),
        "headline": _headline(signals, st) if blocks else None,
        "signals": signals,
    }


def deal_file(s: Session, thread: Thread, facts: list[dict], show: dict) -> dict:
    """Forwardable notes. Only facts that exist on the thread, plus the derived show-likelihood."""
    notes = []
    if show.get("score") is not None:
        notes.append({
            "key": "show_likelihood", "label": "Show-likelihood",
            "value": f"{show['score']}% · {show['label']}",
            "quote": None, "derived": True,
        })
    for f in facts:
        if f["key"] not in DEAL_FACT_KEYS:
            continue
        val = f["value"]
        if f["key"] == "objection":
            val = OBJ_LABEL.get(val, val)
        notes.append({
            "key": f["key"], "label": DEAL_FACT_KEYS[f["key"]],
            "value": val, "quote": (f.get("evidence") or {}).get("text"), "derived": False,
        })
    lines = []
    for n in notes:
        line = f"{n['label']}: {n['value']}"
        if n.get("quote"):
            line += f'  "{n["quote"]}"'
        lines.append(line)
    return {"notes": notes, "forward_text": "\n".join(lines)}
