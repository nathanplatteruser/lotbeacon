# typesafe-ai on LotBeacon

Saved 2026-09-21 from [typesafe-ai/skills](https://github.com/typesafe-ai/skills) (`skills/typesafe-ai`, MIT).

This is the vendor skill. Live docs stay source of truth: https://docs.typesafe.ai

LotBeacon application of these primitives is the **type-form** Send gate — typed Noul / Choice / Score judgments in front of Human Send. That product skill is separate. Do not replace Human Send, `validateClaims`, or `VOICE_LAW` with a Jev call.

Recall:
- `use typesafe-ai` when designing typed judgments or reading current TypeSafe docs
- `run type form on [draft]` when gating a LotBeacon outbound

No `@typesafe-ai/sdk` in this repo. Local type-form judge is the live path. Jev is optional behind `TYPESAFE_API_KEY`.
