"""v0.9: explainability, evidence, live-inquiry analyzer, audit export, pilot gates — against the seeded demo via the HTTP surface."""
import os

os.environ["LOTBEACON_DATABASE_URL"] = "sqlite:///:memory:"
os.environ["LOTBEACON_AI_PROVIDER"] = "mock"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402


@pytest.fixture(scope="module")
def client():
    """The process has one engine (db.py). TestClient serves from another thread, so an in-memory SQLite would be invisible
    to it — swap in a file-backed engine for this module and put the original back afterwards."""
    import tempfile

    from sqlalchemy import create_engine

    from lotbeacon import db as dbmod

    path = os.path.join(tempfile.mkdtemp(), "tooling.db")
    original = dbmod.engine
    dbmod.engine = create_engine(f"sqlite:///{path}", connect_args={"check_same_thread": False})
    dbmod.SessionLocal.configure(bind=dbmod.engine)
    from lotbeacon.api import app

    try:
        with TestClient(app) as c:
            yield c
    finally:
        dbmod.engine.dispose()
        dbmod.engine = original
        dbmod.SessionLocal.configure(bind=original)
        if os.path.exists(path):
            os.remove(path)


def test_dealer_hours_and_address(client):
    m = client.get("/api/meta").json()
    assert m["dealership"]["name"] == "Zoellner Ford"
    from lotbeacon.seed import HOURS
    assert HOURS["sat"] == "8:00-15:00" and HOURS["mon"] == "8:00-18:00" and HOURS["sun"] == "Closed"


def test_explain_has_full_decision_path(client):
    steps = client.get("/api/threads/1/explain").json()["steps"]
    assert [x["step"] for x in steps] == ["Read", "Remember", "Verify", "Stage", "Decide", "Check", "Gate"]
    assert all(x["label"] and "detail" in x for x in steps)


def test_vehicle_evidence_freshness_rule(client):
    inv = client.get("/api/inventory").json()
    ev = client.get(f"/api/inventory/{inv[0]['stock_number']}/evidence").json()
    assert ev["vehicle"]["fresh"] is True and ev["may_assert"]["availability"] is True
    client.post(f"/api/inventory/{inv[0]['stock_number']}", json={"stale": True})
    ev2 = client.get(f"/api/inventory/{inv[0]['stock_number']}/evidence").json()
    assert ev2["may_assert"]["availability"] is False and ev2["may_assert"]["price"] is False and ev2["may_assert"]["mileage"] is True
    client.post(f"/api/inventory/{inv[0]['stock_number']}", json={"stale": False})


def test_analyzer_runs_pipeline_without_storing(client):
    before = len(client.get("/api/threads").json())
    r = client.post("/api/analyze", json={"text": "hey is the black tahoe still available? could come by saturday morning"}).json()
    assert r["stored"] is False and r["lead_state"] == "APPOINTMENT_INTENT"
    assert r["vehicle"]["stock_number"] == "T2401" and r["booking"]["slots"] and len(r["explain"]) == 7
    # Saturday slots respect Zoellner's 8–3 Saturday hours
    for sl in r["booking"]["slots"]:
        hour = int(sl["iso"][11:13])
        assert 8 <= hour < 15
    assert len(client.get("/api/threads").json()) == before
    # financing goes to a person, and the analyzer says so
    r2 = client.post("/api/analyze", json={"text": "can i finance with bad credit? what would payments be"}).json()
    assert r2["draft"]["structured"]["recommended_action"] == "route_financing_to_human"


def test_owner_dashboard_pilot_instrumentation(client):
    o = client.get("/api/metrics/owner").json()
    cap = o["capacity"]
    assert cap["baseline_per_rep_hour"] == round(60 / o["assumptions"]["baseline_minutes_per_reply"], 1)
    assert cap["assisted_per_rep_hour"] > cap["baseline_per_rep_hour"] and cap["multiplier"] > 1
    rai = o["responsible_ai"]
    assert rai["score"] == 100 and rai["passed"] == rai["total"] == 7
    keys = {g["key"]: g for g in o["gates"]}
    assert keys["unsupported_sent"]["status"] == "pass" and keys["unsupported_sent"]["value"] == "0"
    assert keys["reps_active"]["value"] == "2"
    assert {g["status"] for g in o["gates"]} <= {"pass", "watch", "fail"}


def test_audit_export_is_a_download(client):
    r = client.get("/api/audit/export?thread_id=1")
    assert r.status_code == 200 and "attachment" in r.headers["content-disposition"]
    b = r.json()
    assert b["autonomous_sends"] == 0 and b["scope"] == {"thread_id": 1} and b["counts"]["drafts"] >= 1
    assert all(d["thread_id"] == 1 for d in b["drafts"])
    assert any("validation" in d for d in b["drafts"])


def test_every_seeded_lead_has_a_short_buddy_note(client):
    from lotbeacon.seed import CONVERSATIONS, HINTS
    for _, name, _, _ in CONVERSATIONS:
        assert name in HINTS and 1 <= len(HINTS[name].replace("·", " ").split()) <= 10, name
    rows = client.get("/api/queue").json()["rows"]
    assert all(r["hint"] for r in rows)
    assert client.get("/api/threads/1").json()["hint"] == HINTS["Sarah Miller"]
