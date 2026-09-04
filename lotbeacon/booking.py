"""Appointment production: resolve relative dates, propose VERIFIED slots, read the customer's choice, book in one action.

Everything here is deterministic. The AI never invents a slot; it only phrases the two slots this module returns.
"""
import re
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import Appointment, Dealership, Thread

DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
TENTATIVE = re.compile(r"\b(could|probably|maybe|might|possibly|thinking|perhaps|hopefully|if|try to|tryna)\b", re.I)
COMMITTED = re.compile(r"\b(i'?ll be there|see you|coming|i'?m coming|will be there|on my way|count me in|book it|let'?s do|works great|works for me|that works|deal|confirmed|yes to|perfect,? see you)\b", re.I)


def as_utc(dt: datetime) -> datetime:
    """SQLite drops tzinfo; everything we store is UTC, so a naive value IS UTC."""
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def tz_of(d: Dealership) -> ZoneInfo:
    try:
        return ZoneInfo(d.timezone or "America/Chicago")
    except Exception:
        return ZoneInfo("America/Chicago")


def now_local(d: Dealership) -> datetime:
    return datetime.now(tz_of(d))


# ---------------------------------------------------------------- dates
def resolve_date(timing: str | None, d: Dealership, ref: datetime | None = None) -> date | None:
    """'Saturday' → the next Saturday (today counts if still open). 'today'/'tomorrow'/'this weekend' handled. None if vague."""
    if not timing:
        return None
    ref = ref or now_local(d)
    low = timing.lower().strip()
    if low in ("today", "asap", "right now", "in an hour"):
        return ref.date()
    if low == "tomorrow":
        return (ref + timedelta(days=1)).date()
    if low in ("this weekend",):
        low = "saturday"
    for i, name in enumerate(DAYS):
        if name in low:
            delta = (i - ref.weekday()) % 7
            if delta == 0 and ref.hour >= 17:
                delta = 7
            return (ref + timedelta(days=delta)).date()
    if low in ("this week",):
        # next open day that isn't today
        for k in range(1, 7):
            cand = ref + timedelta(days=k)
            if hours_for(d, cand.date()):
                return cand.date()
    return None


def hours_for(d: Dealership, day: date) -> tuple[time, time] | None:
    raw = (d.hours or {}).get(DAY_KEYS[day.weekday()])
    if not raw or "-" not in raw:
        return None
    a, b = raw.split("-")
    return _t(a), _t(b)


def _t(s: str) -> time:
    h, m = s.strip().split(":")
    return time(int(h), int(m))


# ---------------------------------------------------------------- slots
@dataclass
class Slot:
    starts_at: datetime  # tz-aware, dealership local

    @property
    def label(self) -> str:
        return self.starts_at.strftime("%-I:%M %p").replace(":00", "")

    @property
    def day_label(self) -> str:
        return self.starts_at.strftime("%A, %B %-d")

    def iso(self) -> str:
        return self.starts_at.isoformat()


def propose_slots(s: Session, d: Dealership, day: date, prefer: str | None = None, n: int = 2) -> list[Slot]:
    """Two real, open, non-conflicting slots on that date: one morning, one afternoon by default. Respects hours and
    existing confirmed appointments (60-min blocks). `prefer` = 'morning' | 'afternoon' narrows both to that half."""
    hrs = hours_for(d, day)
    if not hrs:
        return []
    open_t, close_t = hrs
    tz = tz_of(d)
    taken = {as_utc(a.starts_at).astimezone(tz).replace(second=0, microsecond=0) for a in s.scalars(select(Appointment).where(Appointment.status.in_(["requested", "confirmed"])))
             if a.starts_at and as_utc(a.starts_at).astimezone(tz).date() == day}
    now = now_local(d)
    candidates_am = [time(10, 30), time(9, 30), time(11, 15), time(9, 0)]
    candidates_pm = [time(13, 45), time(15, 0), time(12, 30), time(16, 15), time(17, 30)]
    pools = {"morning": [candidates_am, candidates_pm], "afternoon": [candidates_pm, candidates_am]}.get(prefer or "", [candidates_am, candidates_pm])
    out: list[Slot] = []
    for pool in pools:
        for t in pool:
            dt = datetime.combine(day, t, tz)
            if not (open_t <= t and (datetime.combine(day, close_t, tz) - dt) >= timedelta(minutes=45)):
                continue
            if dt <= now + timedelta(minutes=30):
                continue
            if dt in taken:
                continue
            out.append(Slot(dt))
            break
        if len(out) >= n:
            break
    return out[:n]


TIME_RE = re.compile(r"\b(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)?\b", re.I)


def parse_time_choice(text: str, proposed: list[dict]) -> dict | None:
    """Did the customer pick one of the slots we offered? EXACT matches only — '10am' is not '10:30 AM'."""
    low = text.lower().replace(".", "")
    if not proposed:
        return None
    if re.search(r"\b(the first|first one|former|the earlier|the 1st|morning one)\b", low):
        return proposed[0]
    if re.search(r"\b(the second|second one|latter|later one|the 2nd|afternoon one)\b", low) and len(proposed) > 1:
        return proposed[1]
    for p in proposed:
        lbl = p["label"].lower()  # "10:30 am" / "1:45 pm" / "2 pm"
        hhmm, ap = lbl.split(" ")
        h, m = (hhmm.split(":") + ["00"])[:2]
        pats = [rf"\b{h}:{m}\s*(?:{ap})?\b"]
        if m == "00":
            pats.append(rf"\b{h}\s*{ap}\b")
            pats.append(rf"\b{h}\s*o'?clock\b")
        if any(re.search(pt, low) for pt in pats):
            return p
    return None


def parse_explicit_time(text: str) -> time | None:
    """'Saturday at 2', '10am', '1:45 pm' → a time (2 → 2 PM heuristic for showroom hours)."""
    m = re.search(r"\b(?:at|around|@)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b", text, re.I) or re.search(r"\b(\d{1,2})(?::(\d{2}))\s*(am|pm)?\b", text, re.I) or re.search(r"\b(\d{1,2})\s*(am|pm)\b", text, re.I)
    if not m:
        return None
    g = m.groups()
    h = int(g[0]); mi = int(g[1]) if len(g) > 2 and g[1] and g[1].isdigit() else 0
    ap = (g[-1] or "").lower()
    if ap == "pm" and h < 12:
        h += 12
    elif not ap and 1 <= h <= 6:
        h += 12  # "at 2" in a showroom context means 2 PM
    if h > 23:
        return None
    return time(h, mi)


# ---------------------------------------------------------------- booking state
def booking_view(s: Session, thread: Thread, d: Dealership, facts: dict, fact_certainty: dict, proposed: list[dict], vehicle: dict | None, selected: dict | None = None) -> dict:
    """The single source of truth for the appointment-closing card."""
    appt = s.scalar(select(Appointment).where(Appointment.thread_id == thread.id, Appointment.status.in_(["requested", "confirmed", "showed"])).order_by(Appointment.id.desc()))
    tz = tz_of(d)
    if appt and appt.status in ("confirmed", "showed"):
        st = as_utc(appt.starts_at).astimezone(tz)
        return {"stage": "booked" if appt.status == "confirmed" else "showed", "date": st.date().isoformat(), "date_label": st.strftime("%A, %B %-d"), "time_label": st.strftime("%-I:%M %p").replace(":00", ""),
                "missing": [], "slots": [], "appointment_id": appt.id, "owner_rep_id": appt.owner_rep_id, "vehicle": vehicle}
    timing = facts.get("timing")
    day = resolve_date(timing, d)
    missing = []
    if not vehicle:
        missing.append("vehicle")
    if not day:
        missing.append("day")
    if not selected:
        missing.append("exact time")
    certainty = fact_certainty.get("timing", "stated") if timing else None
    if selected:
        stage = "time_selected"
    elif proposed:
        stage = "time_proposed"
    elif day:
        stage = "visit_interest_tentative" if certainty == "tentative" else "visit_interest"
    else:
        stage = "no_visit_signal"
    return {"stage": stage, "date": day.isoformat() if day else None, "date_label": day.strftime("%A, %B %-d") if day else None,
            "timing_text": timing, "timing_certainty": certainty, "selected": selected, "slots": proposed, "missing": missing, "vehicle": vehicle}
