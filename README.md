# LotBeacon — Messenger Copilot for dealership reps (MVP v0.6)

> AI does the remembering, researching, prioritizing, drafting, and follow-up preparation.
> The salesperson owns the relationship and consequential promises.

This is the sprint-1 vertical slice from the blueprint (§22): an inbound Messenger message → correct customer →
correct vehicle from authoritative inventory → structured memory with evidence → intent + lead state →
next-best action → grounded draft → **claim-by-claim validation** → rep approval → send. Maturity L1–L3; nothing
autonomous.

**Claude-powered when a key is present, air-gapped when it isn't.** Put `ANTHROPIC_API_KEY` in `.env` and the
pipeline classifies, extracts memory, and drafts with Claude (forced tool-use for structured outputs, timeouts,
one retry, automatic fallback to the deterministic mock if the API is unreachable — the audit trail records which
one produced each draft). Remove the key and everything still runs, deterministically, with no network. Either
way the hallucination firewall checks every claim in the draft — Claude's, the mock's, or the rep's edits.

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

Add Claude (2 minutes):

```bash
cp .env.example .env        # then paste your key from console.anthropic.com → API Keys
./run.sh                    # header shows "AI: anthropic"
```

Tests and the eval scorecard (§15/§16):

```bash
pytest -q                                            # 24 tests, all offline
python -m scripts.eval                               # 12 golden scenarios through the mock
python -m scripts.eval --providers mock anthropic    # side by side; exits non-zero if any critical claim reaches a rep unblocked
```

## The demo

Twenty seeded conversations, each a persona with a quirk. **Every time you hit Send, that persona answers instantly
with their next scripted line — or goes quiet.** Silence shows up as a dashed `[ Name has not responded in 20h 0m ]`
card with two rep-only choices: start a follow-up sequence (three nudges, never automatic — and blocked by the
messaging-window policy once the customer has been silent past 24h), or log that you reached them offline
(call / text / email / came in), which this product otherwise can't see.

Presenter cheat-sheet (never shown in the app — names are deliberately plain):

| Customer | What they'll do |
|---|---|
| Sarah Miller | Textbook climb → Saturday 10am. Green sparkline |
| Mike Torres | Price pushback (red dip) → asks for manager → **ghosts 20h** → comes back annoyed |
| Karen Doyle | Booked Saturday → **cancels** → AI offers a new day → rebooks → ghosts 72h (window closed: follow-up blocked, call instead) |
| Harold Finch | Rapid-fire "hi / is it there / the gray one / checkbook" — 4 sends, **one** communication block |
| Priya Raman | Best price / fees / "match Omaha" three ways — always routed, never a number |
| Craig Bauer | Won't come in until he wins $3k → AI never concedes → ghosts 48h → relents |
| Denise Okafor | Went dark a day, came back hot → books → ghosts 26h → back |
| Marcus Bell | Wants a **hold** (orange) → tries a deposit → books Friday |
| Linda Schwartz | Yukon → F-150 mid-thread; memory supersedes, never merges |
| Omar Haddad | **Delivery** request (orange) → offers to drive → ghosts 18h |
| Rachel Kim | Angry → manager steps in → de-escalates → Saturday 11. Red then green |
| Frankie / Skyler / Gene / Tyler | Voice auto-matches Frank / Celeste / Jon / Zee from their own wording |
| Victor Alvarez | Bought elsewhere → LOST → then a referral |
| Dan · Jen · Pat · Lee | Financing → human · 3-row under 40k · asks about a sold unit · opt-out |


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
| **Voice** dropdown → Frank / Celeste / Jon / Dogg / Zee | Same facts, different tone; the draft is regenerated and re-validated — a voice can't smuggle a claim past the firewall |
| Open **Tyler Brooks** | His Gen Z wording auto-selected the Zee voice (reason shown next to the dropdown). Pick any voice to pin it; pick *Auto* to hand it back |
| **Stage tracker** at the top of each thread | Inquiry → Conversation → Needs → Vehicle → Ready → Visit requested → Appointment set → Showed up → Sold. *Update stage…* moves it by hand |
| **Your move** banner | One sentence telling the rep exactly what to do next |
| **Momentum sparkline** (tracker + inbox) | One point per customer *communication* (consecutive sends between our replies count once), last 8; green ↗ gaining, yellow → holding, red ↘ losing. Sarah is climbing, Mike slipped after the price pushback |

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

## Working on it with Claude

- **Cowork sessions in the LotBeacon Claude project** build features end to end: clone → change → tests → eval → push. Give the
  session the repo URL; it reads `CLAUDE.md` for the rules that must not be simplified away.
- **Claude Code on your Mac** for hands-on iteration against the running server (`./run.sh --reload`).
- **The live tracker** (Claude artifact) is the backlog; commit messages cite ticket numbers.

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
  ai/anthropic_provider.py  Claude via forced tool-use; ResilientProvider falls back to mock
  scripts/eval.py  Provider scorecard (mock vs Claude) with the critical-error override
  voices.py        Six voice profiles (style guide for Claude + deterministic rewrites for the mock)
  momentum.py      Propensity-to-show score per message + trend (the sparkline)
  timefmt.py       Two-level human durations (2d 4h · 3h 5m · 6m 22s)
  seed.py          Pilot dealership, 10 vehicles, 6 conversations
  web/index.html   Rep workspace
tests/                     31 tests: golden scenarios + Claude provider contract (stubbed SDK, no network)
```

## Next tickets this unlocks

Real Messenger app + webhook signature (19–22) · pilot inventory connector behind `inventory.py` (39–40) ·
CRM adapter (75–76) · auth (13–14) · golden dataset expansion + eval harness (92–95) · shadow-mode run against
exported historical threads (98).
