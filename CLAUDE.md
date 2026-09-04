# LotBeacon — notes for Claude Code / Cowork sessions

Product principle: AI remembers, researches, prioritizes, drafts, prepares follow-up. The rep owns the relationship and
every consequential promise. Maturity target L1–L3; architect for L4; L5 is not the product.

## Non-negotiables (do not "simplify" these away)
- The LLM never writes to the database and never sees anything outside `DraftContext` (`lotbeacon/ai/base.py`).
- Every fact the AI states must trace to a source: inventory row (with freshness), dealership config, confirmed
  appointment, or a customer message. `validator.py` enforces this on mock output, model output, and rep edits alike.
- Financing/approval/APR/payment, trade value, discounts, holds, warranty, "booked" → prohibited unless the
  authoritative record exists. Never relax a `prohibited` verdict to make a demo read nicer.
- Unknown stays UNKNOWN. Budget is only extracted from a stated number.
- Messaging eligibility and opt-out are deterministic (`policy.py`). No model involvement.
- PSID identity is Page-scoped; never merge customers on name similarity.

## Layout
`api.py` routes · `pipeline.py` orchestrator · `validator.py` firewall · `policy.py` gates · `inventory.py` ·
`memory.py` · `models.py` · `ai/{base,mock,anthropic_provider}.py` · `seed.py` · `web/index.html` · `scripts/eval.py`

## Commands
```
./run.sh                    # serve on :8080 (auto: Claude if ANTHROPIC_API_KEY, else mock)
pytest -q                   # 24 tests, all offline
python -m scripts.eval --providers mock anthropic   # side-by-side scorecard (needs key)
```

## When adding a feature
1. Add/extend a golden scenario in `tests/` or `scripts/eval.py` first.
2. If it introduces a new kind of factual claim, add a claim kind + verifier in `validator.py` before the drafter can say it.
3. Record any new state transition with reason/evidence/actor/rules_version.
4. Keep the mock provider working — it is what makes the test suite deterministic and air-gapped.

Backlog + gates live in the LotBeacon Claude project (blueprint v1, live tracker). Ticket numbers in commit messages refer to it.
