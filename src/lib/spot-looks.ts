export const SPOT_LOOK_IDS = [
  "now",
  "ledger",
  "radar",
  "overlay",
  "clip",
  "notes",
  "bay",
  "wire",
  "folio",
  "beacon",
  "gallery",
] as const;
export type SpotLookId = (typeof SPOT_LOOK_IDS)[number];

export type SpotLayout = "split" | "overlay" | "stack" | "column" | "device" | "film";
export type SpotDeck = "surface" | "architecture";

export type SpotLook = {
  id: SpotLookId;
  name: string;
  kicker: string;
  thesis: string;
  layout: SpotLayout;
  deck: SpotDeck;
  shipped?: boolean;
};

export const SPOT_LOOKS: SpotLook[] = [
  {
    id: "now",
    name: "Now",
    kicker: "Shipped",
    thesis: "The floor as it is: ink, paper, Newsreader. Quiet, expensive, two columns. This is the product.",
    layout: "split",
    deck: "surface",
    shipped: true,
  },
  {
    id: "ledger",
    name: "Ledger",
    kicker: "Paper letter",
    thesis: "A letter on the lot. Warm stock, hairline rules, the draft as a document you would initial — not a chat widget.",
    layout: "split",
    deck: "surface",
  },
  {
    id: "radar",
    name: "Radar",
    kicker: "Computer use",
    thesis: "What the HeyGen conversation was pointing at: a targeting console. Mono, lock brackets, the scan is the interface.",
    layout: "split",
    deck: "surface",
  },
  {
    id: "overlay",
    name: "Overlay",
    kicker: "HUD on the phone",
    thesis: "Sidecar as a card on the thread, not a second window. The draft sits on the composer it refuses to type into.",
    layout: "overlay",
    deck: "surface",
  },
  {
    id: "clip",
    name: "Clip",
    kicker: "Brutalist",
    thesis: "Zero radius, thick rules, type as architecture. A refusal should look like a stamp, not a toast.",
    layout: "stack",
    deck: "surface",
  },
  {
    id: "notes",
    name: "Notes",
    kicker: "Field book",
    thesis: "Ruled notebook. Margin in ink. The grounded draft is a handwritten block; Send is a person who still signs.",
    layout: "stack",
    deck: "surface",
  },
  {
    id: "bay",
    name: "Bay",
    kicker: "Repair order",
    thesis: "A service writer’s ticket. Customer copy on cream, house copy on canary. The draft is a job line, not a bubble.",
    layout: "stack",
    deck: "architecture",
  },
  {
    id: "wire",
    name: "Wire",
    kicker: "Dispatch",
    thesis: "An AP bulletin. One column, a double rule, no chat chrome. Sarah’s inbound is a dateline. Jordan answers on the wire.",
    layout: "column",
    deck: "architecture",
  },
  {
    id: "folio",
    name: "Folio",
    kicker: "Hanging file",
    thesis: "A manila folder with tabs. MILLER on the thread, T2401 on the draft. The sidecar as a case you pull from a cabinet.",
    layout: "split",
    deck: "architecture",
  },
  {
    id: "beacon",
    name: "Beacon",
    kicker: "Night lot",
    thesis: "After close. One light. The thread is a phone on asphalt; the desk is the lot-light bar. Everything else is withheld.",
    layout: "device",
    deck: "architecture",
  },
  {
    id: "gallery",
    name: "Gallery",
    kicker: "Contact sheet",
    thesis: "The thread as frames on a strip. Sprockets, take numbers, one selected enlargement. A desk that edits, not chats.",
    layout: "film",
    deck: "architecture",
  },
];

export const SPOT_DECKS: { id: SpotDeck; label: string; kicker: string }[] = [
  { id: "surface", label: "Deck 01", kicker: "Surface" },
  { id: "architecture", label: "Deck 02", kicker: "Architecture" },
];

export function isSpotLookId(v: unknown): v is SpotLookId {
  return typeof v === "string" && (SPOT_LOOK_IDS as readonly string[]).includes(v);
}

export function lookById(id: SpotLookId): SpotLook {
  return SPOT_LOOKS.find((l) => l.id === id) ?? SPOT_LOOKS[0];
}

export function nextLook(id: SpotLookId, delta: number): SpotLookId {
  const i = SPOT_LOOKS.findIndex((l) => l.id === id);
  const n = SPOT_LOOKS.length;
  return SPOT_LOOKS[(i + delta + n) % n].id;
}

export function looksInDeck(deck: SpotDeck): SpotLook[] {
  return SPOT_LOOKS.filter((l) => l.deck === deck);
}
