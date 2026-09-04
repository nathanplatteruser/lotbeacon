"""Runtime configuration. Everything defaults to an air-gapped, single-process setup."""
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

DATABASE_URL = os.getenv("LOTBEACON_DATABASE_URL", f"sqlite:///{ROOT / 'lotbeacon.db'}")

# "auto" (default): Claude when ANTHROPIC_API_KEY is set, else the deterministic mock.
# "mock" = force air-gapped. "anthropic" = force Claude (fails loudly if no key).
AI_PROVIDER = os.getenv("LOTBEACON_AI_PROVIDER", "auto").lower()
ANTHROPIC_MODEL = os.getenv("LOTBEACON_ANTHROPIC_MODEL", "claude-sonnet-4-5")

# Inventory data older than this is treated as stale: the draft may not assert availability or price.
INVENTORY_FRESHNESS_SECONDS = int(os.getenv("LOTBEACON_INVENTORY_FRESHNESS_SECONDS", "900"))

# Standard Messenger window. The real rule set is verified during Meta App Review; this is the conservative default.
MESSAGING_WINDOW_HOURS = int(os.getenv("LOTBEACON_MESSAGING_WINDOW_HOURS", "24"))

RULES_VERSION = "rules-2026.09.04"

# Demo dealership label (the pilot prospect). Inventory stays the same demo set.
DEALER_NAME = os.getenv("LOTBEACON_DEALER_NAME", "Zoellner Ford")
DEALER_ADDRESS = os.getenv("LOTBEACON_DEALER_ADDRESS", "1500 N 6th St, Beatrice, NE")
