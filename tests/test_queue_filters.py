"""LB-P0-QUICK-FILTERS: first-class queue filters from pipeline facts, not buddy notes."""
import os
from datetime import datetime, timedelta, timezone

os.environ["LOTBEACON_DATABASE_URL"] = "sqlite:///:memory:"
os.environ["LOTBEACON_AI_PROVIDER"] = "mock"

from lotbeacon.filters import classify  # noqa: E402
from lotbeacon.queue import build  # noqa: E402
from tests.test_pipeline import run, s  # noqa: E402


def test_classify_tags_from_structured_facts_not_hints():
    row = {"bucket": "reply_now", "unread": True, "window_hours_left": 12, "state": "OBJECTION"}
    assert classify(row, {"intent": "price", "objection": "price", "customer_facts": {}}) == ["price_grinder"]
    assert classify(row, {"intent": "schedule", "customer_facts": {"timing": "Today"}, "lead_state": "HIGH_INTENT"}) == ["same_day"]
    browsing = {"bucket": "reply_now", "unread": True, "window_hours_left": 12, "state": "DISCOVERY"}
    assert classify(browsing, {"intent": "vehicle_search", "customer_facts": {}, "lead_state": "DISCOVERY"}) == ["tire_kicker"]
    closing = {"bucket": "window_closing", "unread": True, "window_hours_left": 2, "state": "VEHICLE_INTEREST"}
    assert "window_closing" in classify(closing, {"intent": "availability", "customer_facts": {"timing": "Saturday"}})
    closed = {"bucket": "closed", "unread": False, "window_hours_left": 0, "state": "LOST"}
    assert classify(closed, {"intent": "price", "objection": "price"}) == []


def test_window_closing_filter_on_aging_inbound(s):
    thread, _ = run(s, "Is the black Tahoe still available?", psid="p_win", name="Win Close")
    thread.last_customer_message_at = datetime.now(timezone.utc) - timedelta(hours=21)
    s.flush()
    q = build(s, lambda t: None)
    row = next(r for r in q["rows"] if r["id"] == thread.id)
    assert "window_closing" in row["filters"]
    filtered = build(s, lambda t: None, filter="window_closing")
    assert filtered["active_filters"] == ["window_closing"]
    assert any(r["id"] == thread.id for r in filtered["rows"])
