"""LB-P0-FIREWALL-LOG: persist + export blocked-invent events for GSM Monday review."""
import os

os.environ["LOTBEACON_DATABASE_URL"] = "sqlite:///:memory:"
os.environ["LOTBEACON_AI_PROVIDER"] = "mock"

from sqlalchemy import select  # noqa: E402

from lotbeacon.firewall_log import ACTION, invent_claims  # noqa: E402
from lotbeacon.models import AuditEvent  # noqa: E402
from lotbeacon.pipeline import revalidate  # noqa: E402
from tests.test_pipeline import run, s  # noqa: E402


def test_invent_claims_ignores_policy_window_and_money_figures():
    assert invent_claims({
        "claims": [
            {"kind": "discount", "verdict": "prohibited", "text": "I can do $2,500 off"},
            {"kind": "money_figure", "verdict": "unsupported", "text": "$99"},
        ]
    }) == [{"kind": "discount", "verdict": "prohibited", "text": "I can do $2,500 off"}]
    assert invent_claims({"claims": [{"kind": "availability", "verdict": "supported"}]}) == []


def test_rep_invent_discount_persists_firewall_event(s):
    thread, d = run(s, "Is that your best price on the F-150 or can you come down?", psid="p_fw", name="Grinder")
    revalidate(s, d, "I can knock $2,000 off for you.")
    evs = list(s.scalars(select(AuditEvent).where(AuditEvent.action == ACTION)))
    assert evs
    last = evs[-1]
    assert last.thread_id == thread.id
    assert last.detail["source"] == "draft.edited"
    assert last.detail["autonomous_sends"] == 0
    assert any(c["kind"] == "discount" for c in last.detail["claims"])
