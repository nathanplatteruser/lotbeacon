---
name: type-form
description: Run a Send-time typed form on a LotBeacon draft. Use when locking a reply, reviewing claims, or adding a safety gate in front of Human Send. Recall: run type form on [draft].
---

# Type form · LotBeacon skill

Type form is the LotBeacon Send-time typed form. It sits **in front of Human Send** and **appends** to the regex firewall and VOICE_LAW. It does not replace them. A person still hits Send.

It is TypeSafe shape (Noul / Choice / Score), not Typeform the SaaS. The live path is a local deterministic judge that returns the same answer shape Jev would. Jev is optional behind `TYPESAFE_API_KEY`. Do not add `@typesafe-ai/sdk`.

## When to run

- A draft is about to become a send.
- A rewrite (`applyGrokDraft`) just landed and claims must be re-checked.
- A rep edited the composer (`setDraftText`).
- You are asked to "run type form on [draft]".

Do **not** run this on CommsSend / DealBrief (internal GSM/F&I packet). Do **not** auto-send anything this skill flags clean.

## State

Named JSON only. No media.

```
draft.text
thread.{dnc, channel, appointmentId, facts, lastInbound, lastOutbound}
vehicle.{stock, ymm, vin, status, price, drivetrain, miles, fresh, smoker, accident, thirdRow, boosterOk, seats, titleStatus}
slots[].label
policy (product rules, short)
```

## Questions · one call, same state

### Nouls · high value = violation

Thresholds: ≥ 0.70 block · 0.30–0.70 warn · < 0.30 quiet.

1. `quotes_payment` — Does `draft.text` quote a monthly payment, APR, or financing term?
2. `asserts_approval` — Does it assert approved, pre-approved, or qualifies?
3. `quotes_trade_value` — Does it assign a dollar value or offer to the trade?
4. `invents_discount` — Does it invent a discount or a price that is not `vehicle.price`?
5. `quotes_otd_or_doc_fee` — Does it state an out-the-door price or a doc-fee amount?
6. `overrides_opt_out` — Does it keep selling after `thread.dnc`, or say we will keep texting?
7. `claims_sold_available` — Does it claim the unit is on the lot when sold, pending, or stale?
8. `invents_sunday_hours` — Does it offer or confirm a Sunday sales appointment?
9. `invents_slot` — Does it offer a day-and-clock that is not on `slots`?
10. `invents_vehicle_spec` — Does it assert a spec the vehicle record does not carry?
11. `asks_credit_or_income` — Does it ask credit score, income, down payment, cash vs loan, or budget?
12. `sounds_autonomous` — Does it claim a system, bot, or AI sent this without a person?

### Choice `gate_action`

- `send_ready` — no hard violation; a person may tap Send
- `edit_first` — soft miss; rep should edit
- `escalate_manager` — insult, lawyer/BBB, hold, financing decision, delivery route
- `suppress_dnc` — opted out; draft stays empty

`escalate_manager` and `suppress_dnc` block.

### Score `groundedness`

- 0 ungrounded — invented hours, price, or spec
- 1 mixed — one unverified clause
- 2 fully grounded in vehicle + facts

`groundedness` < 1 warns.

### Score `show_risk`

- 0 helps the show
- 1 neutral
- 2 likely kills the show (stacked asks, ignored question, invented number)

## Code policy

1. Run `validateClaims` + `channelClaims` first.
2. Run `appendTypeFormClaims` on the same text.
3. Prefix every typed-form reason with `Type form · `.
4. `blocked()` still means dnc OR duplicate OR any `severity === "block"`.
5. Human Send stays the last gate.

Wire points: `generateDraft`, `setDraftText`, `applyGrokDraft`, `sendAndNext` (re-judge current text before `blocked()`), `explainThread` Check step, inbox claim list.

Skip: Spot sidecar, desk-engine.js, `sendTest`, `startFollowup`, CommsSend / DealBrief.

## Source of truth

- Implementation: `src/lib/type-form.ts`
- Tests: `src/lib/type-form.test.ts`
- Live TypeSafe docs (shape only): https://docs.typesafe.ai
- Official typesafe-ai skill: https://github.com/typesafe-ai/skills
