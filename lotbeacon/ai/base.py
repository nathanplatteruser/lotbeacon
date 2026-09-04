"""Provider interface. The orchestrator only ever calls these three methods.

Providers return STRUCTURED data. They never touch the database, never call tools, and their
draft text is treated as untrusted until the validator has checked every claim in it.
"""
from dataclasses import dataclass, field
from typing import Protocol


@dataclass
class Classification:
    intent: str  # availability | price | trade | financing | schedule | vehicle_search | general | opt_out | complaint | sold_elsewhere
    sentiment: str  # positive | neutral | negative | angry
    objection: str | None = None  # price | payment | trade | trust | timing | None
    confidence: float = 0.0
    signals: list[str] = field(default_factory=list)


@dataclass
class ExtractedFact:
    key: str
    value: str
    confidence: float
    quote: str  # the exact customer words that justify the value


@dataclass
class DraftContext:
    """Everything the provider is allowed to know. Anything not here does not exist."""

    dealership_name: str
    voice: str
    customer_name: str
    recent_messages: list[dict]  # [{author, text}]
    facts: dict  # key -> value (only ACTIVE facts)
    vehicle: dict | None  # verified vehicle card, or None
    vehicle_fresh: bool
    alternatives: list[dict]
    hours_today: str | None
    recommended_action: str
    missing_information: list[str]
    must_not_claim: list[str]  # explicit prohibitions for this turn


class AIProvider(Protocol):
    name: str

    def classify(self, text: str, history: list[dict]) -> Classification: ...

    def extract_facts(self, text: str, inventory_hint: list[dict]) -> list[ExtractedFact]: ...

    def draft(self, ctx: DraftContext) -> str: ...


class ResilientProvider:
    """Primary provider with a deterministic fallback.

    Fail soft on assistant availability (rep still gets a draft), never on facts (the validator runs regardless).
    `name` reflects what actually produced the LAST call, so the audit trail is truthful.
    """

    def __init__(self, primary: AIProvider, fallback: AIProvider):
        self.primary, self.fallback = primary, fallback
        self.name = primary.name
        self.last_error: str | None = None

    def _run(self, method: str, *args):
        try:
            out = getattr(self.primary, method)(*args)
            self.name, self.last_error = self.primary.name, None
            return out
        except Exception as e:  # noqa: BLE001 — any provider failure degrades to mock
            self.last_error = f"{type(e).__name__}: {e}"[:200]
            self.name = f"{self.fallback.name}(fallback:{self.primary.name})"
            return getattr(self.fallback, method)(*args)

    def classify(self, text, history):
        return self._run("classify", text, history)

    def extract_facts(self, text, hint):
        return self._run("extract_facts", text, hint)

    def draft(self, ctx):
        return self._run("draft", ctx)


def resolve_provider_name() -> str:
    """auto → anthropic when a key and the SDK are present, else mock."""
    import importlib.util
    import os

    from ..config import AI_PROVIDER

    if AI_PROVIDER != "auto":
        return AI_PROVIDER
    if os.getenv("ANTHROPIC_API_KEY") and importlib.util.find_spec("anthropic"):
        return "anthropic"
    return "mock"


def get_provider() -> AIProvider:
    from .mock import MockProvider

    if resolve_provider_name() == "anthropic":
        from .anthropic_provider import AnthropicProvider

        return ResilientProvider(AnthropicProvider(), MockProvider())
    return MockProvider()
