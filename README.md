# LotBeacon — Messenger Copilot for dealership reps (MVP v0.9 — explainable, pilot-instrumented)

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

## v0.9 — the demo explains itself

Everything the reference demo showed, built on real pipeline data instead of static HTML:

| Where | What | Endpoint |
|---|---|---|
| Action card → **why this action?** | Decision path: Read → Remember → Verify → Stage → Decide → Check → Gate, each step citing its evidence | `GET /api/threads/{id}/explain` |
| Stock chip / vehicle name ↗ | Inventory evidence: the only record the AI may quote, source + retrieved-at, what it may/may not assert, which conversations lean on it | `GET /api/inventory/{stock}/evidence` |
| Header → **Try a live inquiry** | Paste a real customer message; full pipeline runs against live inventory in a throwaway transaction — draft, verdicts, decision path. Nothing stored. | `POST /api/analyze` |
| Owner dashboard → **Capacity per rep-hour** | Bar chart: unassisted vs assisted replies per rep-hour from the observed accept/edit/manual mix × your minutes assumptions | `owner.capacity` |
| Owner dashboard → **Responsible AI scorecard** | Ring of 7 hard checks computed from the record (human approval, firewall coverage, clean sends, opt-outs, 24h window, consequential topics routed, corrections captured) | `owner.responsible_ai` |
| Owner dashboard → **Pilot decision gates** | 7 go/no-go gates with live value, target, pass/watch/fail and why it matters | `owner.gates` |
| Owner dashboard / ⋯ menu → **Export audit** | JSON bundle: events, drafts with firewall verdicts and citations, stage transitions, `autonomous_sends: 0` | `GET /api/audit/export[?thread_id=]` |

Dealer data is the real store: Zoellner Ford, 4115 N. 6th Street, Beatrice, NE 68310 · Mon–Fri 8–6, Sat 8–3, Sun closed. Slot proposals respect those hours (Saturday slots are 8–3). Seeded conversations are owned by the two demo reps so the by-rep table and "reps active" gate are live from the first screen.

## v0.8 — proving the value (usage + return)

- **Owner dashboard** (header tab): Active conversations · Median first response (P90, reply windows lost) · Rep attention
  saved (hours, $, capacity multiplier) · Claims routed for verification (blocked sends, handed to a person, **0 autonomous
  sends**) · Draft acceptance · Appointments booked · Expected gross · Prevented-claim value · funnel · time-to-reply
  distribution · per-rep table. **Assumptions are editable on the page and printed next to every dollar.** Usage numbers are
  measured; return numbers are usage × assumptions. Nothing is hidden.
- **Impact** button on every thread: what *this* conversation produced — headline wins, return, speed, safety, usage, and
  the formulas. Reps prove the work; managers see the return.
- **Guided tour** (`?` in the header): eight steps over the live UI.
- Dealership label is configurable (`LOTBEACON_DEALER_NAME`, default "Zoellner Ford" for the pilot prospect).
- Fix: appointment times round-trip through SQLite in dealership local time (10:30 AM stays 10:30 AM).

## v0.7 — what the senior rep's audit changed

| Audit item | What changed |
|---|---|
| Queue was scores + colors, not actions | **Action queue**: Reply now · Time selected—book now · Window closing · Appointment changes · Follow-up due · Waiting · Closed. Every row: name, *waiting 2m 6s*, one-line what-happened, one-line **next action**. No scores, no sparklines, no temperature colors on the surface. |
| "Confirm appointment" shown before a time existed | **State-aware booking**: draft offers **two verified slots** (hours + no double-booking). When the customer picks one, the card flips to **Book 1:45 PM + send confirmation** — one click saves the appointment, sends the confirmation, assigns the owner, advances the funnel. |
| Missing time buried | **Goal / Missing** line at the top of the one action card: *Book Saturday test drive — Missing: exact time · visit interest is tentative*. |
| "Visit requested" overstated "could probably" | Fact **certainty**: asked_about / preferred / required / tentative / confirmed. Booking sub-states: visit interest (tentative) → time proposed → time selected → booked. |
| "AWD" as a 100% need; AWD ≠ 4WD | "Is it AWD?" is *asked about*, not a need. Vehicles carry drivetrain; the draft raises the 4WD-vs-AWD clarification once. Confidence % hidden. |
| Open-ended "what time works?" | Two real options; daypart only as fallback. Rep can flip to both-morning / both-afternoon pairs (`1`/`2`). |
| Five panels saying the same thing | **One action card**: Goal · Missing · Known (click → evidence) · Verified vehicle chip · draft · Send & next. Summary/facts/state history/momentum/diagnostics live behind *Details*. |
| "Re-check claims" button | Removed. Claims validate as you type (500 ms) and again at send; you're interrupted only on a change. |
| Who owns the thread? | Header line: *AI drafting · Alex Reyes sends · no autonomous sends*. Outbound bubbles attributed to the actual sender. Opening a lead assigns it to you. |
| "Messaging window open" | *Facebook Messenger · 23h 57m left to reply*; **Window closing** queue when < 4h. |
| Nine-stage rail | Four macro states (Engage · Qualify · Book · Visit outcome), auto-derived; manual correction under ⋯. |
| Full timestamps, no unread state | Relative times (*2m ago*, hover for exact), **New** divider, waiting timer per row. |
| Mouse-heavy | `J`/`K` next lead · `E` edit · `⌘↵` Send & next (or Book) · `1`/`2` slot pair. Send & next opens the next lead that needs you. |
| Developer metadata on the surface | Moved to *Details → Diagnostics*. |
| "Voice" ambiguous | Renamed **Reply style**, lives under ⋯. |

Two bugs the new seed exposed and fixed: "Should I bring the **Accord** title?" no longer flips the thread onto *our* Accord (the customer's trade model is excluded from vehicle resolution and extraction), and a question after booking no longer regresses a booked appointment back to "visit interest".

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
  booking.py       Resolve 'Saturday' to a date · propose two verified slots · read the customer's pick · one-click book
  metrics.py       Usage + return metrics, thread impact, editable assumptions
  queue.py         Action queue: buckets, waiting timers, next-action text
  momentum.py      Propensity-to-show score per message + trend (the sparkline)
  timefmt.py       Two-level human durations (2d 4h · 3h 5m · 6m 22s)
  seed.py          Pilot dealership, 10 vehicles, 6 conversations
  web/index.html   Rep workspace
tests/                     34 tests: golden scenarios + Claude provider contract (stubbed SDK, no network)
```

## Next tickets this unlocks

Real Messenger app + webhook signature (19–22) · pilot inventory connector behind `inventory.py` (39–40) ·
CRM adapter (75–76) · auth (13–14) · golden dataset expansion + eval harness (92–95) · shadow-mode run against
exported historical threads (98).

## Put it on a link (hosted demo)

The repo ships a `Dockerfile` and a Render Blueprint (`render.yaml`). Any container host works (Render, Railway, Fly.io); Render is the fewest clicks:

1. render.com → **New +** → **Blueprint** → connect GitHub → pick `lotbeacon`. Render reads `render.yaml`.
2. When asked for env vars: `ANTHROPIC_API_KEY` = your key · `LOTBEACON_DEMO_CODE` = the passcode you'll give prospects (e.g. `zoellner`).
3. Deploy (≈3 min). Your link: `https://lotbeacon.onrender.com` (or whatever Render assigns; add a custom domain under Settings → Custom Domains).

What visitors see: a LotBeacon-branded gate asking for the access code, then the full workspace. Without the code, every page and API call is refused, so nobody can burn tokens by guessing the URL. Every push to `main` redeploys; the SQLite file lives in `/tmp`, so each deploy starts from the clean 20-conversation seed. Between prospects, `POST /api/demo/reset` (or just redeploy) wipes and reseeds.

Cost: Render Starter is ~$7/month always-on. The free plan also works but sleeps after 15 idle minutes (first click takes ~40 s to wake). Claude usage in a typical 20-minute demo is well under $1.

## Buddy notes (demo only)

Every seeded lead carries a ≤10-word "buddy note" — the two keywords a coworker would text you about a prospect ("price grinder · ghosts waiting on manager", "angry be-back · manager de-escalates"). It shows as an amber line in the queue row and under the name in the thread. The vocabulary is what reps actually complain about: grinders, payment shoppers, serial ghosters, cancel/reschedulers, tire kickers, price-match shoppers, hold/deposit askers, mid-thread vehicle switchers, angry be-backs, out-of-towners wanting delivery. Purpose: a demo viewer sees which situation they're about to watch get handled. Stored in `Thread.demo_hint`, seeded from `seed.HINTS`. Not a product feature yet — if beta testers want it, it becomes an AI-written summary of observed behavior.

## Zero-backend showcase (GitHub Pages)

`python -m scripts.export_showcase` plays every seeded conversation forward through the real pipeline and writes `docs/index.html`: the real UI with the API replaced by those recordings. No server, no key, no cost — serve it from GitHub Pages (Settings → Pages → Deploy from a branch → `main` / `/docs`). Send & next and Book play the recording forward; why-this-action, evidence, Impact and the Owner dashboard all work. Free-text edit re-validation, reply styles and the live-inquiry analyzer need the hosted demo (see above). Rebuild after any pipeline change and commit `docs/`.

## Before & after one-pager + link previews

`docs/impact-estimate.html` — a deliberately pessimistic one-page estimate (time, funnel, units, gross) for the three decision makers: owner/GM, sales reps, marketing/BDC. Sources and every assumption are on the page. Live at `/lotbeacon/impact-estimate.html` on GitHub Pages. `docs/og.png` (1200×630) is the link-preview card — one headline metric per persona — referenced by Open Graph/Twitter tags on both the showcase and the one-pager, so a texted or emailed link unfurls with the outcomes instead of a blank compass icon. Regenerate the card from the HTML in `scripts/og_card.html` if the numbers change.

## Business case pages (docs/)

`impact-estimate.html` (before/after model), `pricing.html` (Solo $549 · Three Amigos $1,347 · Dealership Umbrella $2,990; founding-dealer beta half price 90 days; every package ≥4× on the pessimistic model), `compare.html` (honest better/worse/same vs Podium, Gubagoo, Impel, Conversica, Fullpath, Tekion, VinSolutions, DriveCentric, CARVID, Meta's own AI). All share a tab bar with the interactive demo. Research notes: Meta removed business-Page vehicle listings Jan 2023, so Marketplace profile threads are not API-reachable — LotBeacon's stance is Page Messenger via official API + paste-in today + a read-only browser companion (v1.1); human-approved sends qualify for Meta's 7-day human-agent window (v1.0).
