"""The hallucination firewall.

Pipeline position:  draft → extract claims → verify each claim against its required source → policy → risk.
Works on ANY draft text (mock, model, or rep-edited), so a rep can't accidentally send an unsupported claim either.

Risk: green (send-ready) · yellow (verified lookup, rep glance) · orange (human must handle) · red (blocked).
"""
import re
from dataclasses import asdict, dataclass, field

RANK = {"green": 0, "yellow": 1, "orange": 2, "red": 3}

MONEY = r"\$\s?\d[\d,]*(?:\.\d{2})?(?:\s?k)?"


@dataclass
class Claim:
    kind: str  # availability | price | mileage | financing | trade_value | appointment_booked | discount | warranty | hours | hold | vehicle_fact
    text: str
    verdict: str = "unverified"  # supported | unsupported | prohibited
    source: str | None = None
    note: str = ""
    risk: str = "yellow"


@dataclass
class ValidationResult:
    claims: list[Claim] = field(default_factory=list)
    risk_level: str = "green"
    blocked: bool = False
    approval_required: bool = True
    reasons: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {"claims": [asdict(c) for c in self.claims], "risk_level": self.risk_level, "blocked": self.blocked, "approval_required": self.approval_required, "reasons": self.reasons}


def _money_values(text: str) -> list[int]:
    out = []
    for m in re.finditer(MONEY, text):
        raw = m.group(0).lower().replace("$", "").replace(",", "").strip()
        try:
            if raw.endswith("k"):
                out.append(int(float(raw[:-1]) * 1000))
            else:
                out.append(int(float(raw)))
        except ValueError:
            pass
    return out


def extract_claims(text: str) -> list[Claim]:
    t = text.lower()
    claims: list[Claim] = []

    def add(kind, pattern, flags=re.I):
        for m in re.finditer(pattern, text, flags):
            claims.append(Claim(kind, m.group(0).strip()))

    # Availability / existence
    add("availability", r"[^.!?]*\b(still (?:here|available|on the lot|in stock)|is available|we have it|it'?s (?:here|available)|haven'?t sold|still have (?:it|that))\b[^.!?]*[.!?]?")
    add("unavailable", r"[^.!?]*\b(went (?:sold|pending)|(?:just|already) sold|no longer available|is pending)\b[^.!?]*[.!?]?")
    # Price
    add("price", r"[^.!?]*\b(listed at|priced at|asking|price is|it'?s|for)\s+" + MONEY + r"[^.!?]*[.!?]?")
    # Discount / negotiation
    add("discount", r"[^.!?]*\b(knock (?:off|\$)|take \$?\d+ off|discount|i can do \$|we can do \$|come down to|best price is|lowest i can go)\b[^.!?]*[.!?]?")
    # Financing
    add("financing", r"[^.!?]*\b(you'?re approved|pre-?approved|get you approved|guarantee(?:d)? (?:approval|financing)|\d+(?:\.\d+)?\s?%\s?(?:apr|interest)|" + MONEY + r"\s?(?:/|a|per)\s?mo(?:nth)?|monthly payment (?:of|would be|is))\b[^.!?]*[.!?]?")
    # Trade value
    add("trade_value", r"[^.!?]*\b(your (?:trade|accord|truck|car) is worth|we(?:'d|'ll| would| will) give you " + MONEY + r"|trade(?:-in)? value (?:of|is|around)|worth (?:about|around)? ?" + MONEY + r")\b[^.!?]*[.!?]?")
    # Appointment booked
    add("appointment_booked", r"[^.!?]*\b(you'?re (?:all )?(?:set|booked|confirmed)|i(?:'ve)? booked|appointment is (?:set|confirmed|booked)|see you (?:at|on) \w+ \d|confirmed for)\b[^.!?]*[.!?]?")
    # Vehicle hold
    add("hold", r"[^.!?]*\b(hold it for you|put it on hold|i'?ll hold|reserve(?:d)? it)\b[^.!?]*[.!?]?")
    # Warranty
    add("warranty", r"[^.!?]*\b(warranty (?:covers|includes|is)|bumper.to.bumper|powertrain warranty|covered for \d)\b[^.!?]*[.!?]?")
    # Mileage
    add("mileage", r"[^.!?]*\b\d{1,3}(?:,\d{3})?\s?(?:k\s)?miles\b[^.!?]*[.!?]?")
    # Hours
    add("hours", r"[^.!?]*\b(open (?:until|till|from)|we close at|hours are)\b[^.!?]*[.!?]?")
    # Trade acceptance (soft — allowed, but flagged so the rep sees it)
    add("trade_accept", r"[^.!?]*\b(we take trades|bring (?:it|the \w+) (?:in|by))\b[^.!?]*[.!?]?")
    return claims


def validate(text: str, *, vehicle: dict | None, vehicle_fresh: bool, alternatives: list[dict], hours_today: str | None,
             appointment_confirmed: bool, messaging: dict, ai_paused: bool = False) -> ValidationResult:
    res = ValidationResult()
    if not messaging.get("eligible", False):
        res.blocked = True
        res.risk_level = "red"
        res.reasons.append(f"messaging_not_permitted:{messaging.get('reason')}")
    if ai_paused:
        res.reasons.append("ai_paused_by_rep")

    claims = extract_claims(text)
    price_vals = _money_values(text)

    for c in claims:
        k = c.kind
        if k == "availability":
            if vehicle and vehicle_fresh and vehicle["status"] == "available":
                c.verdict, c.source, c.risk = "supported", f"inventory:{vehicle['stock_number']}@{vehicle['retrieved_at']}", "yellow"
            elif vehicle and not vehicle_fresh:
                c.verdict, c.risk, c.note = "unsupported", "red", f"inventory stale ({vehicle['age_seconds']}s) — verify before claiming"
            else:
                c.verdict, c.risk, c.note = "unsupported", "red", "no fresh inventory row says this unit is available"
        elif k == "unavailable":
            if vehicle and vehicle_fresh and vehicle["status"] != "available":
                c.verdict, c.source, c.risk = "supported", f"inventory:{vehicle['stock_number']}", "yellow"
            else:
                c.verdict, c.risk, c.note = "unsupported", "red", "inventory does not say this unit is sold/pending"
        elif k == "price":
            if vehicle and vehicle_fresh and any(v == vehicle["price"] for v in _money_values(c.text)):
                c.verdict, c.source, c.risk = "supported", f"inventory:{vehicle['stock_number']}.price", "yellow"
            else:
                c.verdict, c.risk, c.note = "unsupported", "red", "price does not match a fresh inventory price"
        elif k == "mileage":
            m = re.search(r"(\d{1,3}(?:,\d{3})?)\s?(k\s)?miles", c.text, re.I)
            val = int(m.group(1).replace(",", "")) * (1000 if m and m.group(2) else 1) if m else -1
            if vehicle and vehicle_fresh and abs(val - vehicle["mileage"]) <= (500 if val < 1000000 else 0):
                c.verdict, c.source, c.risk = "supported", f"inventory:{vehicle['stock_number']}.mileage", "yellow"
            else:
                c.verdict, c.risk, c.note = "unsupported", "red", "mileage not from inventory"
        elif k == "hours":
            if hours_today and hours_today.split("-")[-1].strip() in c.text:
                c.verdict, c.source, c.risk = "supported", "dealership.hours", "green"
            else:
                c.verdict, c.risk, c.note = "unsupported", "orange", "hours not from dealership configuration"
        elif k == "appointment_booked":
            if appointment_confirmed:
                c.verdict, c.source, c.risk = "supported", "appointments.confirmed", "yellow"
            else:
                c.verdict, c.risk, c.note = "prohibited", "red", "'booked' requires a confirmed appointment record"
        elif k in ("financing", "trade_value", "discount", "hold", "warranty"):
            c.verdict, c.risk, c.note = "prohibited", "red", {
                "financing": "financing terms/approval come only from the finance team",
                "trade_value": "trade values come only from the appraiser",
                "discount": "discounts require sales-manager authorization",
                "hold": "vehicle holds require dealer system/policy",
                "warranty": "warranty terms require authoritative warranty data",
            }[k]
        elif k == "trade_accept":
            c.verdict, c.risk, c.note = "supported", "yellow", "general trade acceptance — no value implied"
        res.claims.append(c)

    # Any money figure not attributable to a supported claim is suspicious.
    supported_money = {v for c in res.claims if c.verdict == "supported" for v in _money_values(c.text)}
    stray = [v for v in price_vals if v not in supported_money]
    if stray and not any(c.kind in ("financing", "trade_value", "discount", "price") for c in res.claims):
        res.claims.append(Claim("money_figure", f"${stray[0]:,}", "unsupported", None, "dollar figure with no verified source", "orange"))

    worst = max([RANK[c.risk] for c in res.claims] + [RANK[res.risk_level]], default=0)
    res.risk_level = [k for k, v in RANK.items() if v == worst][0]
    if any(c.verdict in ("unsupported", "prohibited") and c.risk == "red" for c in res.claims):
        res.blocked = True
        res.reasons.extend(f"{c.kind}:{c.verdict}" for c in res.claims if c.risk == "red")
    res.approval_required = True  # MVP: every send is rep-approved (L2/L3). L4 would relax this for proven green classes.
    return res
