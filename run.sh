#!/usr/bin/env bash
# One command: create a venv, install deps, seed the pilot dealership, start the workspace.
set -euo pipefail
cd "$(dirname "$0")"

if [ ! -d .venv ]; then
  python3 -m venv .venv
fi
# shellcheck disable=SC1091
source .venv/bin/activate
python -m pip install -q --upgrade pip
pip install -q -r requirements.txt

if [ -f .env ]; then set -a; . ./.env; set +a; fi
export LOTBEACON_AI_PROVIDER="${LOTBEACON_AI_PROVIDER:-auto}"
if [ "$LOTBEACON_AI_PROVIDER" = "auto" ]; then
  if [ -n "${ANTHROPIC_API_KEY:-}" ]; then RESOLVED="Claude (ANTHROPIC_API_KEY set) with mock fallback"; else RESOLVED="mock — add ANTHROPIC_API_KEY to .env for Claude"; fi
else RESOLVED="$LOTBEACON_AI_PROVIDER"; fi

PORT="${PORT:-8080}"
echo ""
echo "  LotBeacon rep workspace  →  http://localhost:${PORT}"
echo "  AI provider: ${RESOLVED}"
echo ""
exec uvicorn lotbeacon.api:app --host 127.0.0.1 --port "${PORT}" ${@:+"$@"}
