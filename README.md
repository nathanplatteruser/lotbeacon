# LotBeacon — Messenger Copilot for dealership reps (MVP v0.1)

> AI does the remembering, researching, prioritizing, drafting, and follow-up preparation.
> The salesperson owns the relationship and consequential promises.

This is the sprint-1 vertical slice from the blueprint (§22): an inbound Messenger message → correct customer →
correct vehicle from authoritative inventory → structured memory with evidence → intent + lead state →
next-best action → grounded draft → **claim-by-claim validation** → rep approval → send. Maturity L1–L3; nothing
autonomous.

Runs fully **air-gapped** by default (deterministic mock AI provider, SQLite, no network). Flip one env var to use
real model calls through the same interface — the hallucination firewall checks the model's draft exactly the
same way it checks the mock's, and the rep's edits too.

## Run it

```bash
./run.sh            # creates .venv, installs, seeds a pilot dealership, serves http://localhost:8080
```

Windows / manual:

```bash
python -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
uvicorn lotbeacon.api:app --port 8080
```

Tests (the blueprint's golden scenarios, §16):

```bash
pytest -q
```

## The demo

Open the workspace. Sarah Miller is at the top of the priority inbox:

> "Hey, is that black Tahoe you posted still available? I've got a 2018 Accord to trade and could probably come Saturday."

The system has already: resolved her to the **available** black 2024 Tahoe Premier (not the sold 2021 RST), extracted
`trade_vehicle = 2018 Accord` and `timing = Saturday` (each click-through to her actual message), set state
`APPOINTMENT_INTENT`, recommended a test drive, drafted a reply, and verified every claim in it against inventory
and dealership hours. Budget is not in memory — she never stated one. Unknown stays unknown.

Then break it on purpose (right panel, "Simulate"):

| Try | What happens |
|---|---|
| Inventory event → *Mark Tahoe sold* → Re-check claims | "still here" turns red, send is blocked |
| Inventory event → *Make feed stale* | Availability claim can't be verified; draft says "let me verify" |
| Edit the draft to add "You're approved, $400/month" | Financing claim → **prohibited**, blocked |
| Edit to "Your Accord is worth about $14k" | Trade value → prohibited |
| Edit to "You're all set for Saturday!" | Blocked until you click *Confirm appointment…* |
| Receive message: "Please stop messaging me." | `DO_NOT_CONTACT`, customer suppressed, all sends blocked |
| Right-click a fact | Correct or remove it; extraction can't overwrite a rep correction |
| *Take over* | AI drafting pauses for that thread; your typed reply still goes through the claim check |

## What's real vs. simulated in v0.1

| Real | Simulated / stubbed |
|---|---|
| Tenant-scoped schema, PSID identity (no cross-Page merge) | Messenger webhook (`POST /webhook/messenger`, same payload shape; signature check TODO) |
| Immutable message store, idempotent ingest by `mid` | Messenger Send API (persists the outbound message) |
| Memory facts with evidence + confidence + version, rep corrections | Inventory feed (seeded rows; `POST /api/inventory/{stock}` to mutate) |
| Inventory resolution, freshness, availability/price verifiers | CRM (none yet — blueprint tickets 75–77) |
| Lead-state machine with recorded transitions | Scheduling system (rep confirms manually — ticket 79) |
| Next-best-action engine | Auth/RBAC (rep picker in header — tickets 13–14) |
| Claim extraction + grounding + prohibited-claim validator + risk tiers | |
| Messaging-window + opt-out policy engine | |
| Append-only audit log, priority inbox, evidence UI | |

## Layout

```
lotbeacon/
  api.py           FastAPI routes: webhook sim, threads, drafts (edit/send), take-over, facts, appointments, inventory, audit
  pipeline.py      Orchestrator: identity → memory → vehicle → state → NBA → draft → validate → persist
  validator.py     The hallucination firewall (works on any text: mock, model, or rep-typed)
  policy.py        Deterministic gates: messaging window, opt-out, hours
  inventory.py     Authoritative vehicle access + freshness
  memory.py        Structured facts with evidence links and corrections
  models.py        Canonical schema (SQLAlchemy)
  ai/base.py       Provider interface + DraftContext (the ONLY thing a provider gets to see)
  ai/mock.py       Deterministic air-gapped provider
  ai/anthropic_provider.py  Same contract, real model
  seed.py          Pilot dealership, 10 vehicles, 6 conversations
  web/index.html   Rep workspace
tests/test_pipeline.py     17 golden scenarios
```

## Next tickets this unlocks

Real Messenger app + webhook signature (19–22) · pilot inventory connector behind `inventory.py` (39–40) ·
CRM adapter (75–76) · auth (13–14) · golden dataset expansion + eval harness (92–95) · shadow-mode run against
exported historical threads (98).
