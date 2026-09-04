"""Real-model provider. Same contract as the mock; the validator still checks every claim it makes.

Requires: pip install anthropic; ANTHROPIC_API_KEY in the environment; LOTBEACON_AI_PROVIDER=anthropic.
"""
import json

from ..config import ANTHROPIC_MODEL
from .base import Classification, DraftContext, ExtractedFact

SYSTEM = (
    "You are the drafting assistant inside LotBeacon, a copilot for car-dealership sales reps on Facebook Messenger. "
    "You never talk to the customer directly; a rep reviews everything. Hard rules: only state vehicle facts that appear "
    "in the provided vehicle card; never state or imply availability, price, mileage, VIN, features, financing terms, "
    "approval, interest rates, monthly payments, trade values, warranty terms, discounts, or that an appointment is booked "
    "unless the provided data explicitly contains it. If you don't have a fact, say the rep will verify. Unknown stays unknown. "
    "Return ONLY what is asked, in the format asked."
)


class AnthropicProvider:
    name = "anthropic"

    def __init__(self):
        import anthropic  # lazy: air-gapped installs don't need it

        self.client = anthropic.Anthropic()

    def _json(self, prompt: str) -> dict:
        r = self.client.messages.create(model=ANTHROPIC_MODEL, max_tokens=600, system=SYSTEM, messages=[{"role": "user", "content": prompt}])
        txt = r.content[0].text.strip()
        txt = txt[txt.find("{"): txt.rfind("}") + 1]
        return json.loads(txt)

    def classify(self, text: str, history: list[dict]) -> Classification:
        d = self._json(
            "Classify the latest customer message. Return JSON {intent, sentiment, objection, confidence}. "
            "intent ∈ availability|price|trade|financing|schedule|vehicle_search|general|opt_out|complaint|sold_elsewhere. "
            "sentiment ∈ positive|neutral|negative|angry. objection ∈ price|payment|trade|trust|timing|null.\n\n"
            f"History: {json.dumps(history[-6:])}\nLatest: {text}"
        )
        return Classification(d.get("intent", "general"), d.get("sentiment", "neutral"), d.get("objection"), float(d.get("confidence", 0.5)), ["anthropic"])

    def extract_facts(self, text: str, inventory_hint: list[dict]) -> list[ExtractedFact]:
        d = self._json(
            "Extract ONLY facts the customer explicitly stated in this message. Keys: trade_vehicle, preferred_vehicle, timing, need, budget, "
            "payment_target, financing_sensitive. Do not infer budgets from vague phrases. Each fact needs the exact quote. "
            'Return JSON {"facts":[{key,value,confidence,quote}]}.\n\n'
            f"Dealership inventory (for matching preferred_vehicle): {json.dumps(inventory_hint[:20])}\nMessage: {text}"
        )
        return [ExtractedFact(f["key"], str(f["value"]), float(f.get("confidence", 0.7)), f.get("quote", "")) for f in d.get("facts", [])]

    def draft(self, ctx: DraftContext) -> str:
        r = self.client.messages.create(
            model=ANTHROPIC_MODEL,
            max_tokens=300,
            system=SYSTEM,
            messages=[{"role": "user", "content": (
                f"Write ONE short Messenger reply (2-4 sentences, {ctx.voice} tone) from {ctx.dealership_name} to {ctx.customer_name or 'the customer'}.\n"
                f"Recommended action: {ctx.recommended_action}\nMissing info to ask for (ask at most one): {ctx.missing_information}\n"
                f"Known facts: {json.dumps(ctx.facts)}\nVehicle card (fresh={ctx.vehicle_fresh}): {json.dumps(ctx.vehicle)}\n"
                f"Alternatives: {json.dumps(ctx.alternatives[:3])}\nHours today: {ctx.hours_today}\n"
                f"MUST NOT claim: {ctx.must_not_claim}\nRecent messages: {json.dumps(ctx.recent_messages[-6:])}\nReply text only."
            )}],
        )
        return r.content[0].text.strip()
