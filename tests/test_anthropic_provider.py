"""Claude provider contract tests with a stubbed SDK client — no network, no key. Proves the parsing and the fallback."""
import os
from types import SimpleNamespace

os.environ["LOTBEACON_DATABASE_URL"] = "sqlite:///:memory:"

from lotbeacon.ai.anthropic_provider import CLASSIFY_TOOL, EXTRACT_TOOL, AnthropicProvider  # noqa: E402
from lotbeacon.ai.base import DraftContext, ResilientProvider  # noqa: E402
from lotbeacon.ai.mock import MockProvider  # noqa: E402


class StubMessages:
    def __init__(self, responses):
        self.responses, self.calls = list(responses), []

    def create(self, **kw):
        self.calls.append(kw)
        r = self.responses.pop(0)
        if isinstance(r, Exception):
            raise r
        return r


def tool_response(name, payload):
    return SimpleNamespace(content=[SimpleNamespace(type="tool_use", name=name, input=payload)])


def text_response(text):
    return SimpleNamespace(content=[SimpleNamespace(type="text", text=text)])


def ctx(**over):
    base = dict(dealership_name="Prairie Chevrolet", voice="friendly", customer_name="Sarah Miller", recent_messages=[], facts={"trade_vehicle": "2018 Accord", "timing": "Saturday"},
                vehicle={"year": 2024, "make": "Chevrolet", "model": "Tahoe", "trim": "Premier", "color": "Black", "status": "available", "price": 68950, "mileage": 8412, "stock_number": "T2401", "retrieved_at": "now", "fresh": True, "age_seconds": 10},
                vehicle_fresh=True, alternatives=[], hours_today="9 AM-6 PM", recommended_action="invite_test_drive", missing_information=["time"], must_not_claim=[])
    base.update(over)
    return DraftContext(**base)


def test_classify_uses_forced_tool_use():
    stub = SimpleNamespace(messages=StubMessages([tool_response("record_classification", {"intent": "schedule", "sentiment": "positive", "objection": None, "confidence": 0.93, "signals": ["come Saturday"]})]))
    p = AnthropicProvider(client=stub, model="test-model")
    c = p.classify("could probably come Saturday", [])
    assert (c.intent, c.sentiment, c.objection) == ("schedule", "positive", None)
    kw = stub.messages.calls[0]
    assert kw["tool_choice"] == {"type": "tool", "name": "record_classification"}
    assert kw["tools"] == [CLASSIFY_TOOL] and kw["model"] == "test-model"


def test_extract_parses_and_tolerates_bad_rows():
    stub = SimpleNamespace(messages=StubMessages([tool_response("record_facts", {"facts": [
        {"key": "trade_vehicle", "value": "2018 Accord", "confidence": 0.97, "quote": "2018 Accord to trade"},
        {"key": "timing", "value": "Saturday"},  # missing confidence/quote → still accepted with defaults
        {"value": "garbage"},  # missing key → dropped
    ]})]))
    facts = AnthropicProvider(client=stub).extract_facts("...", [])
    assert [(f.key, f.value) for f in facts] == [("trade_vehicle", "2018 Accord"), ("timing", "Saturday")]
    assert stub.messages.calls[0]["tools"] == [EXTRACT_TOOL]


def test_draft_strips_quotes_and_context_is_bounded():
    stub = SimpleNamespace(messages=StubMessages([text_response('"Hey Sarah! Yes — the 2024 Tahoe Premier in Black is still here."')]))
    p = AnthropicProvider(client=stub)
    out = p.draft(ctx())
    assert out.startswith("Hey Sarah!") and not out.startswith('"')
    prompt = stub.messages.calls[0]["messages"][0]["content"]
    assert "MUST NOT claim" in prompt and "68950" in prompt  # the model sees the card, so a correct price is possible…
    assert "vin" not in prompt.lower() or "123456" not in prompt  # …but only what DraftContext exposes


def test_draft_is_empty_for_suppressed_actions():
    stub = SimpleNamespace(messages=StubMessages([]))
    assert AnthropicProvider(client=stub).draft(ctx(recommended_action="escalate_opt_out")) == ""
    assert stub.messages.calls == []


def test_resilient_falls_back_to_mock_and_names_it():
    stub = SimpleNamespace(messages=StubMessages([RuntimeError("API down")]))
    rp = ResilientProvider(AnthropicProvider(client=stub), MockProvider())
    c = rp.classify("Is the Tahoe still available?", [])
    assert c.intent == "availability"
    assert rp.name == "mock(fallback:anthropic)"
    assert "API down" in rp.last_error


def test_resilient_reports_primary_when_it_works():
    stub = SimpleNamespace(messages=StubMessages([tool_response("record_classification", {"intent": "price", "sentiment": "neutral", "objection": None, "confidence": 0.8, "signals": []})]))
    rp = ResilientProvider(AnthropicProvider(client=stub), MockProvider())
    rp.classify("how much?", [])
    assert rp.name == "anthropic" and rp.last_error is None


def test_validator_catches_a_hallucinating_model(monkeypatch):
    """The whole point: even if Claude invents a price, the rep never sees it as sendable."""
    from datetime import datetime, timezone

    from lotbeacon.db import Base, SessionLocal, engine
    from lotbeacon.models import Dealership, Rep, Tenant, Vehicle
    from lotbeacon.pipeline import ingest_inbound, process_message
    from lotbeacon.seed import HOURS, VEHICLES

    Base.metadata.drop_all(engine); Base.metadata.create_all(engine)
    s = SessionLocal()
    t = Tenant(name="T"); s.add(t); s.flush()
    d = Dealership(tenant_id=t.id, name="P", page_id="pg", hours=HOURS); s.add(d); s.flush()
    s.add(Rep(tenant_id=t.id, dealership_id=d.id, name="R"))
    for st, vin, y, mk, md, tr, col, body, mi, pr, status in VEHICLES:
        s.add(Vehicle(tenant_id=t.id, dealership_id=d.id, stock_number=st, vin=vin, year=y, make=mk, model=md, trim=tr, color=col, body=body, mileage=mi, price=pr, status=status, retrieved_at=datetime.now(timezone.utc)))
    s.flush()
    stub = SimpleNamespace(messages=StubMessages([
        tool_response("record_classification", {"intent": "price", "sentiment": "neutral", "objection": None, "confidence": 0.9, "signals": []}),
        tool_response("record_facts", {"facts": []}),
        text_response("Great news — the Tahoe is only $59,999 and I can get you approved today!"),  # two lies
    ]))
    thread, m, _ = ingest_inbound(s, d, "p1", "m1", "How much is the black 2024 Tahoe Premier?", "X")
    draft = process_message(s, thread, m, provider=AnthropicProvider(client=stub))
    assert draft.status == "blocked" and draft.risk_level == "red"
    kinds = {c["kind"]: c["verdict"] for c in draft.validation["claims"]}
    assert kinds["price"] == "unsupported" and kinds["financing"] == "prohibited"
    s.close()
