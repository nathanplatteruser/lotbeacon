"""Human durations at exactly two levels of granularity: 2d 4h · 3h 5m · 6m 22s · 45s. Never more."""
from datetime import datetime, timezone


def humanize(seconds: float | int) -> str:
    s = int(max(0, round(seconds)))
    d, r = divmod(s, 86400)
    h, r = divmod(r, 3600)
    m, sec = divmod(r, 60)
    if d:
        return f"{d}d {h}h"
    if h:
        return f"{h}h {m}m"
    if m:
        return f"{m}m {sec}s"
    return f"{sec}s"


def since(dt: datetime | None, now: datetime | None = None) -> str:
    if dt is None:
        return ""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    now = now or datetime.now(timezone.utc)
    return humanize((now - dt).total_seconds())
