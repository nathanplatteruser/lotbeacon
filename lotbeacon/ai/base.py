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


def get_provider() -> AIProvider:
    from ..config import AI_PROVIDER

    if AI_PROVIDER == "anthropic":
        from .anthropic_provider import AnthropicProvider

        return AnthropicProvider()
    from .mock import MockProvider

    return MockProvider()
