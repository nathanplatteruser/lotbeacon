"""Deterministic policy gates. No LLM anywhere in this file, on purpose."""
from datetime import datetime, timedelta, timezone

from .config import MESSAGING_WINDOW_HOURS
from .models import Customer, Thread


def messaging_eligibility(thread: Thread, customer: Customer, now: datetime | None = None) -> dict:
    """Can the dealership send to this person right now?

    Standard Messenger rule: a user message within the window. Anything outside the window needs a separately
    verified basis (Meta App Review) — none is assumed here, so outside-window sends are blocked.
    """
    now = now or datetime.now(timezone.utc)
    if customer.opted_out or thread.lead_state.value == "DO_NOT_CONTACT":
        return {"eligible": False, "reason": "opted_out"}
    last = thread.last_customer_message_at
    if last is None:
        return {"eligible": False, "reason": "no_inbound_message"}
    if last.tzinfo is None:
        last = last.replace(tzinfo=timezone.utc)
    if now - last > timedelta(hours=MESSAGING_WINDOW_HOURS):
        return {"eligible": False, "reason": "outside_standard_window", "window_hours": MESSAGING_WINDOW_HOURS, "last_inbound": last.isoformat()}
    return {"eligible": True, "reason": "inbound_within_window", "expires_at": (last + timedelta(hours=MESSAGING_WINDOW_HOURS)).isoformat()}


def hours_today(hours: dict, tz_name: str) -> str | None:
    try:
        from zoneinfo import ZoneInfo

        now = datetime.now(ZoneInfo(tz_name))
    except Exception:
        now = datetime.now()
    key = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"][now.weekday()]
    raw = hours.get(key)
    if not raw or "-" not in raw:
        return raw
    return "-".join(_fmt(p) for p in raw.split("-"))


def _fmt(hhmm: str) -> str:
    try:
        h, m = hhmm.strip().split(":")
        h = int(h)
        suffix = "AM" if h < 12 else "PM"
        h12 = h % 12 or 12
        return f"{h12}:{m} {suffix}" if m != "00" else f"{h12} {suffix}"
    except ValueError:
        return hhmm
