"""Authoritative inventory access. Every vehicle fact the AI uses comes through here, with freshness."""
import re
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from .config import INVENTORY_FRESHNESS_SECONDS
from .models import Vehicle


def vehicle_card(v: Vehicle) -> dict:
    return {
        "id": v.id, "stock_number": v.stock_number, "vin": v.vin, "year": v.year, "make": v.make, "model": v.model,
        "trim": v.trim, "color": v.color, "body": v.body, "mileage": v.mileage, "price": v.price, "status": v.status,
        "source": v.source, "retrieved_at": v.retrieved_at.isoformat(), "fresh": is_fresh(v), "age_seconds": age_seconds(v),
    }


def age_seconds(v: Vehicle) -> int:
    ra = v.retrieved_at if v.retrieved_at.tzinfo else v.retrieved_at.replace(tzinfo=timezone.utc)
    return int((datetime.now(timezone.utc) - ra).total_seconds())


def is_fresh(v: Vehicle) -> bool:
    return age_seconds(v) <= INVENTORY_FRESHNESS_SECONDS


def list_inventory(s: Session, dealership_id: int) -> list[Vehicle]:
    return list(s.scalars(select(Vehicle).where(Vehicle.dealership_id == dealership_id)))


def resolve_vehicle(s: Session, dealership_id: int, text: str, prior_vehicle_id: int | None = None) -> Vehicle | None:
    """Map free text ('that black Tahoe you posted') to ONE stock unit. Returns None when ambiguous or absent."""
    low = text.lower()
    candidates = list_inventory(s, dealership_id)
    scored: list[tuple[int, Vehicle]] = []
    for v in candidates:
        score = 0
        if re.search(r"\b" + re.escape(v.model.lower()) + r"\b", low):
            score += 5
        if re.search(r"\b" + re.escape(v.make.lower()) + r"\b", low):
            score += 2
        if v.color and v.color.lower() in low:
            score += 3
        if str(v.year) in low:
            score += 3
        if v.trim and v.trim.lower() in low:
            score += 2
        if v.stock_number.lower() in low or v.vin.lower() in low:
            score += 10
        if score:
            scored.append((score, v))
    if not scored:
        return s.get(Vehicle, prior_vehicle_id) if prior_vehicle_id else None
    # Tie-breaks, in order: the unit this thread was already about; units still for sale (a posted ad is almost
    # always a live unit); newer year. If still tied, refuse to guess — the rep picks.
    scored.sort(key=lambda x: (-x[0], 0 if x[1].id == prior_vehicle_id else 1, 0 if x[1].status == "available" else 1, -x[1].year))
    if len(scored) > 1 and scored[0][0] == scored[1][0]:
        a, b = scored[0][1], scored[1][1]
        if prior_vehicle_id not in (a.id, b.id) and a.status == b.status and a.year == b.year:
            return None
    return scored[0][1]


def parse_budget(value: str | None) -> int | None:
    if not value:
        return None
    m = re.match(r"\$?\s*(\d[\d,]*)(k)?", value.strip(), re.I)
    if not m:
        return None
    n = int(m.group(1).replace(",", ""))
    return n * 1000 if m.group(2) else n


def search(s: Session, dealership_id: int, body: str | None = None, needs: list[str] | None = None, max_price: int | None = None, exclude_id: int | None = None) -> list[Vehicle]:
    q = select(Vehicle).where(Vehicle.dealership_id == dealership_id, Vehicle.status == "available")
    if body:
        q = q.where(Vehicle.body == body)
    if max_price:
        q = q.where(Vehicle.price <= max_price)
    out = [v for v in s.scalars(q) if v.id != exclude_id]
    return sorted(out, key=lambda v: v.price)


def verify_availability(v: Vehicle | None) -> dict:
    """The availability verifier: a claim of 'available' needs a fresh, authoritative row saying so."""
    if v is None:
        return {"ok": False, "reason": "no_vehicle_resolved"}
    if not is_fresh(v):
        return {"ok": False, "reason": "stale_inventory", "age_seconds": age_seconds(v)}
    return {"ok": True, "status": v.status, "age_seconds": age_seconds(v)}
