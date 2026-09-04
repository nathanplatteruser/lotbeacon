#!/usr/bin/env bash
# One command: create a venv, install deps, seed the pilot dealership, start the workspace.
set -euo pipefail
cd "$(dirname "$0")"

if [ ! -d .venv ]; then
  python3 -m venv .venv
fi
# shellcheck disable=SC1091
source .venv/bin/activate
pip install -q -r requirements.txt

if [ -f .env ]; then set -a; . ./.env; set +a; fi
export LOTBEACON_AI_PROVIDER="${LOTBEACON_AI_PROVIDER:-mock}"

PORT="${PORT:-8080}"
echo ""
echo "  LotBeacon rep workspace  →  http://localhost:${PORT}"
echo "  AI provider: ${LOTBEACON_AI_PROVIDER}   (set LOTBEACON_AI_PROVIDER=anthropic + ANTHROPIC_API_KEY in .env for real model calls)"
echo ""
exec uvicorn lotbeacon.api:app --host 127.0.0.1 --port "${PORT}" "${@}"
