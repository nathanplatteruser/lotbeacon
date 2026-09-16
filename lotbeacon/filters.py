"""First-class action-queue filters. Deterministic from pipeline facts — not buddy notes.

Tags (a row may carry more than one):
  tire_kicker    browsing / stall, no visit commitment
  price_grinder  price friction or discount pressure
  same_day       customer stated they can come today
  window_closing Messenger reply window ends within 4 hours
"""

FILTERS = [
    ("tire_kicker", "Tire-kicker", "Browsing or stalling — no visit commitment"),
    ("price_grinder", "Price grinder", "Price friction or discount pressure"),
    ("same_day", "Same-day", "They said they can come today"),
    ("window_closing", "Window closing", "Messenger reply window ends within 4 hours"),
]

FILTER_KEYS = {k for k, _, _ in FILTERS}

# Extracted timing values that mean today. Must match memory/mock extraction, not free text.
SAME_DAY_TIMING = {"today", "asap", "right now", "in an hour"}

_HOT = {"HIGH_INTENT", "APPOINTMENT_INTENT", "APPOINTMENT_SET", "ARRIVED", "SOLD"}
_CLOSED = {"LOST", "DO_NOT_CONTACT"}
_ROUTED = {"financing", "hold", "warranty", "delivery", "reschedule", "complaint", "opt_out", "sold_elsewhere"}


def _facts(st: dict) -> dict:
    return st.get("customer_facts") or {}


def _objections(st: dict) -> set[str]:
    raw = _facts(st).get("objection") or []
    if isinstance(raw, str):
        raw = [raw]
    out = {x for x in raw if x}
    if st.get("objection"):
        out.add(st["objection"])
    return out


def _timing(st: dict) -> str:
    return str(_facts(st).get("timing") or "").strip().lower()


def classify(row: dict, st: dict) -> list[str]:
    """Return filter keys for one queue row. Closed threads get no tags."""
    if row.get("bucket") == "closed" or row.get("state") in _CLOSED:
        return []
    tags: list[str] = []
    facts = _facts(st)
    objs = _objections(st)
    booked = (st.get("booking") or {}).get("stage") in ("booked", "time_selected")
    state = row.get("state") or st.get("lead_state") or ""

    hours = row.get("window_hours_left")
    if row.get("bucket") == "window_closing" or (
        row.get("unread") and hours is not None and hours < 4
    ):
        tags.append("window_closing")

    if _timing(st) in SAME_DAY_TIMING:
        tags.append("same_day")

    if (
        st.get("objection") == "price"
        or st.get("intent") == "price"
        or st.get("recommended_action") == "route_price_objection_to_human"
        or "price" in objs
    ):
        tags.append("price_grinder")

    stall = "stall" in objs
    if (
        "price_grinder" not in tags
        and "same_day" not in tags
        and not booked
        and state not in _HOT
        and state not in _CLOSED
        and st.get("intent") not in _ROUTED
        and (stall or not facts.get("timing"))
    ):
        tags.append("tire_kicker")

    return tags


def parse(raw: str | None) -> list[str]:
    if not raw:
        return []
    return [k for k in (p.strip() for p in raw.split(",")) if k in FILTER_KEYS]


def apply(rows: list[dict], requested: list[str]) -> list[dict]:
    if not requested:
        return rows
    wanted = set(requested) & FILTER_KEYS
    return [r for r in rows if wanted & set(r.get("filters") or [])]


def catalog(rows: list[dict]) -> list[dict]:
    return [
        {"key": k, "label": l, "hint": h, "count": sum(1 for r in rows if k in (r.get("filters") or []))}
        for k, l, h in FILTERS
    ]
