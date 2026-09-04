"""Claude provider. Same contract as the mock; the validator still checks every claim it makes.

Design choices:
- Structured outputs come back through forced tool-use, so classification and extraction are real JSON, not
  text we hope parses. Tool schemas ARE the contract with the model.
- Every call has a timeout and one retry. The pipeline wraps this provider in `ResilientProvider`, so if the API is
  down the rep still gets a (mock) draft and the audit trail says which provider produced it. Fail closed on facts,
  fail soft on availability of the assistant.
- The model never sees the database. It sees `DraftContext` and nothing else.

Requires: pip install anthropic; ANTHROPIC_API_KEY in the environment.
"""
import json
import time

from .. import voices
from ..config import ANTHROPIC_MODEL
from .base import Classification, DraftContext, ExtractedFact

SYSTEM = """You are the drafting brain inside LotBeacon, a copilot for car-dealership sales reps on Facebook Messenger.
You never talk to the customer directly; a human rep reviews and sends everything.

Hard rules (a separate validator will block you if you break them, so don't):
- Only state vehicle facts that appear in the provided vehicle card (year/make/model/trim/color/status/price/mileage).
- Never state or imply: availability (unless card says fresh=true and status=available), any price not on the card, mileage
  not on the card, financing approval, interest rates, monthly payments, trade-in values, warranty terms, discounts,
  vehicle holds, or that an appointment is booked/confirmed.
- If you don't have a fact, say the rep will verify. Unknown stays unknown — never infer a budget from vague words.
- Sound like a good salesperson texting: short, warm, specific, one question max. No corporate filler, no emojis.
"""

CLASSIFY_TOOL = {
    "name": "record_classification",
    "description": "Record the classification of the latest customer message.",
    "input_schema": {
        "type": "object",
        "properties": {
            "intent": {"type": "string", "enum": ["availability", "price", "trade", "financing", "schedule", "reschedule", "hold", "warranty", "delivery", "vehicle_search", "general", "opt_out", "complaint", "sold_elsewhere"]},
            "sentiment": {"type": "string", "enum": ["positive", "neutral", "negative", "angry"]},
            "objection": {"type": ["string", "null"], "enum": ["price", "payment", "trade", "trust", "timing", None]},
            "confidence": {"type": "number", "minimum": 0, "maximum": 1},
            "signals": {"type": "array", "items": {"type": "string"}, "description": "Short phrases from the message that drove the decision"},
            "voice_hint": {"type": ["string", "null"], "enum": ["frank", "celeste", "jon", "dogg", "zee", None], "description": "Only if the customer's OWN tone strongly matches: frank=fast/direct East Coast, celeste=laid-back Californian, jon=polite Midwestern, dogg=West Coast hip-hop slang, zee=Gen Z texting style. Null for neutral."},
            "voice_confidence": {"type": "number", "minimum": 0, "maximum": 1},
        },
        "required": ["intent", "sentiment", "objection", "confidence", "signals", "voice_hint", "voice_confidence"],
    },
}

EXTRACT_TOOL = {
    "name": "record_facts",
    "description": "Record facts the customer EXPLICITLY stated. Omit anything inferred.",
    "input_schema": {
        "type": "object",
        "properties": {
            "facts": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "key": {"type": "string", "enum": ["trade_vehicle", "preferred_vehicle", "timing", "need", "budget", "payment_target", "financing_sensitive"]},
                        "value": {"type": "string"},
                        "confidence": {"type": "number", "minimum": 0, "maximum": 1},
                        "quote": {"type": "string", "description": "Exact customer words that justify this value"},
                    },
                    "required": ["key", "value", "confidence", "quote"],
                },
            }
        },
        "required": ["facts"],
    },
}


class AnthropicProvider:
    name = "anthropic"

    def __init__(self, client=None, model: str | None = None, timeout: float = 20.0, max_retries: int = 1):
        if client is None:
            import anthropic  # lazy: air-gapped installs don't need the SDK

            client = anthropic.Anthropic(timeout=timeout, max_retries=max_retries)
        self.client = client
        self.model = model or ANTHROPIC_MODEL
        self.last_latency_ms = 0

    # ---------------------------------------------------------------- internals
    def _tool_call(self, tool: dict, prompt: str, max_tokens: int = 700) -> dict:
        t0 = time.time()
        r = self.client.messages.create(
            model=self.model, max_tokens=max_tokens, system=SYSTEM, tools=[tool],
            tool_choice={"type": "tool", "name": tool["name"]},
            messages=[{"role": "user", "content": prompt}],
        )
        self.last_latency_ms = int((time.time() - t0) * 1000)
        for block in r.content:
            if getattr(block, "type", None) == "tool_use" and block.name == tool["name"]:
                return dict(block.input)
        raise ValueError("model returned no tool call")

    # ---------------------------------------------------------------- contract
    def classify(self, text: str, history: list[dict]) -> Classification:
        d = self._tool_call(CLASSIFY_TOOL, f"Conversation so far (oldest first):\n{json.dumps(history[-8:], ensure_ascii=False)}\n\nLatest customer message:\n{text}")
        vh, vconf = d.get("voice_hint"), float(d.get("voice_confidence") or 0)
        dh, dconf, dsig = voices.detect(text)
        if dh and (dh == vh or not vh):  # rules and model agree, or model abstained → trust the rules' evidence
            vh, vconf = dh, max(vconf, dconf)
        return Classification(d["intent"], d["sentiment"], d.get("objection"), float(d.get("confidence", 0.5)), list(d.get("signals", [])), vh, vconf)

    def extract_facts(self, text: str, inventory_hint: list[dict]) -> list[ExtractedFact]:
        d = self._tool_call(EXTRACT_TOOL, (
            "Extract only what the customer explicitly said in THIS message.\n"
            "- preferred_vehicle: match to one of the dealership's units below as 'YEAR MAKE MODEL (COLOR)' when the message names a model; include color only if stated.\n"
            "- budget: ONLY if a number is stated ('under 40k'). 'nothing crazy expensive' is NOT a budget.\n"
            "- payment_target: a stated $/month figure, phrased as 'customer-stated, not a quote'.\n"
            "- financing_sensitive: set if credit score, approval, or financing hardship is mentioned.\n"
            "- timing: a day or relative time ('Saturday', 'this week').\n"
            "- need: one entry per requirement (3-row seating, towing, AWD...).\n\n"
            f"Dealership units: {json.dumps(inventory_hint[:25], ensure_ascii=False)}\n\nMessage:\n{text}"
        ))
        out = []
        for f in d.get("facts", []):
            try:
                out.append(ExtractedFact(f["key"], str(f["value"]).strip(), float(f.get("confidence", 0.7)), str(f.get("quote", ""))[:200]))
            except (KeyError, ValueError):
                continue
        return out

    def draft(self, ctx: DraftContext) -> str:
        if ctx.recommended_action in ("escalate_opt_out", "human_takeover"):
            return ""
        t0 = time.time()
        r = self.client.messages.create(
            model=self.model, max_tokens=350, system=SYSTEM,
            messages=[{"role": "user", "content": (
                f"Write ONE Messenger reply (2–4 short sentences) from {ctx.dealership_name} to {ctx.customer_name or 'the customer'}.\n"
                f"Voice profile '{ctx.voice_name}': {ctx.voice}\n\n"
                f"Recommended action: {ctx.recommended_action}\n"
                f"Still unknown (ask about at most one, naturally): {ctx.missing_information}\n"
                f"Known customer facts: {json.dumps(ctx.facts, ensure_ascii=False)}\n"
                f"Vehicle card (fresh={ctx.vehicle_fresh}): {json.dumps(ctx.vehicle, ensure_ascii=False)}\n"
                f"Alternatives you may name (year make model only): {json.dumps([{k: a[k] for k in ('year', 'make', 'model', 'color')} for a in ctx.alternatives[:3]], ensure_ascii=False)}\n"
                f"Dealership hours today: {ctx.hours_today or 'unknown — do not mention hours'}\n"
                f"MUST NOT claim: {ctx.must_not_claim}\n"
                f"Recent messages: {json.dumps(ctx.recent_messages[-6:], ensure_ascii=False)}\n\n"
                "Reply with the message text only — no quotes, no preamble."
            )}],
        )
        self.last_latency_ms = int((time.time() - t0) * 1000)
        text = "".join(getattr(b, "text", "") for b in r.content).strip()
        return text.strip('"').strip()
