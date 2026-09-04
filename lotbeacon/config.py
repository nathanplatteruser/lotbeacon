"""Runtime configuration. Everything defaults to an air-gapped, single-process setup."""
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

DATABASE_URL = os.getenv("LOTBEACON_DATABASE_URL", f"sqlite:///{ROOT / 'lotbeacon.db'}")

# "mock" = deterministic, air-gapped provider. "anthropic" = real model calls (needs ANTHROPIC_API_KEY).
AI_PROVIDER = os.getenv("LOTBEACON_AI_PROVIDER", "mock").lower()
ANTHROPIC_MODEL = os.getenv("LOTBEACON_ANTHROPIC_MODEL", "claude-sonnet-4-5")

# Inventory data older than this is treated as stale: the draft may not assert availability or price.
INVENTORY_FRESHNESS_SECONDS = int(os.getenv("LOTBEACON_INVENTORY_FRESHNESS_SECONDS", "900"))

# Standard Messenger window. The real rule set is verified during Meta App Review; this is the conservative default.
MESSAGING_WINDOW_HOURS = int(os.getenv("LOTBEACON_MESSAGING_WINDOW_HOURS", "24"))

RULES_VERSION = "rules-2026.09.04"
