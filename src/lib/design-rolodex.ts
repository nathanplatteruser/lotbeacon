export const ROLODEX_IDS = [
  "workbench",
  "statled",
  "manifesto",
  "workflow",
  "sequence",
  "film",
] as const;

export type RolodexId = (typeof ROLODEX_IDS)[number];
export type RolodexDeck = "hallmark" | "archify" | "openmontage";

export type RolodexCard = {
  id: RolodexId;
  name: string;
  kicker: string;
  thesis: string;
  deck: RolodexDeck;
  method: string;
};

export const ROLODEX_DECKS: { id: RolodexDeck; label: string; kicker: string; method: string }[] = [
  { id: "hallmark", label: "Card 01", kicker: "Hallmark", method: "Landing craft" },
  { id: "archify", label: "Card 02", kicker: "Archify", method: "Diagrams you can present" },
  { id: "openmontage", label: "Card 03", kicker: "OpenMontage", method: "Launch film" },
];

export const ROLODEX_CARDS: RolodexCard[] = [
  {
    id: "workbench",
    name: "Workbench",
    kicker: "Hallmark · 05",
    thesis:
      "The page is the desk. Three frames of the sidecar in use — inbound, abort, booked — and a try-it after the third. No shouting hero. Same copy as Now.",
    deck: "hallmark",
    method: "macrostructure: Workbench",
  },
  {
    id: "statled",
    name: "Zero",
    kicker: "Hallmark · 04",
    thesis:
      "The hero is a number: 0 autonomous sends. Everything else qualifies it. Data is the narrative, not a feature grid.",
    deck: "hallmark",
    method: "macrostructure: Stat-Led",
  },
  {
    id: "manifesto",
    name: "Still sends",
    kicker: "Hallmark · 07",
    thesis:
      "Declaration before purchase. What we refuse, in type large enough to read across a conference room. Agreement, not a checkout.",
    deck: "hallmark",
    method: "macrostructure: Manifesto",
  },
  {
    id: "workflow",
    name: "Happy path",
    kicker: "Archify · T·02",
    thesis:
      "Four lanes: Sarah, the sidecar, Jordan, Meta. Inbound to grounded draft to copy to human Send. Abort and stealth as exceptions. No invented nodes.",
    deck: "archify",
    method: "diagram: workflow",
  },
  {
    id: "sequence",
    name: "Abort",
    kicker: "Archify · T·03",
    thesis:
      "Who calls whom when Auto-type is pressed. Five characters. Composer stays empty. Meta is never a participant with a message.",
    deck: "archify",
    method: "diagram: sequence",
  },
  {
    id: "film",
    name: "A person still sends",
    kicker: "OpenMontage · cinematic",
    thesis:
      "Quiet editorial launch film. Night lot, one light, a paper draft, a human Send. No trailer grammar. Title cards, no voiceover.",
    deck: "openmontage",
    method: "pipeline: cinematic",
  },
];

export function isRolodexId(v: unknown): v is RolodexId {
  return typeof v === "string" && (ROLODEX_IDS as readonly string[]).includes(v);
}

export function cardById(id: RolodexId): RolodexCard {
  return ROLODEX_CARDS.find((c) => c.id === id) ?? ROLODEX_CARDS[0];
}

export function nextCard(id: RolodexId, delta: number): RolodexId {
  const i = ROLODEX_CARDS.findIndex((c) => c.id === id);
  const n = ROLODEX_CARDS.length;
  return ROLODEX_CARDS[(i + delta + n) % n].id;
}

export function cardsInDeck(deck: RolodexDeck): RolodexCard[] {
  return ROLODEX_CARDS.filter((c) => c.deck === deck);
}

export const ARCHIFY_LANES = [
  { id: "sarah", label: "Customer", kicker: "Marketplace" },
  { id: "sidecar", label: "Sidecar", kicker: "LotBeacon" },
  { id: "jordan", label: "Desk", kicker: "Jordan" },
  { id: "meta", label: "Policy", kicker: "Meta" },
] as const;

export const ARCHIFY_NODES = [
  {
    id: "inbound",
    lane: "sarah",
    n: "01",
    t: "Inbound",
    d: "Sarah names the Explorer, the Accord, and Saturday.",
    path: "happy" as const,
  },
  {
    id: "spot",
    lane: "sidecar",
    n: "02",
    t: "Spot the thread",
    d: "Last inbound. Composer. Send. A synthetic thread we own.",
    path: "happy" as const,
  },
  {
    id: "firewall",
    lane: "sidecar",
    n: "03",
    t: "Inventory firewall",
    d: "T2401 available. $57,990 listed. Sat 10:00 or 11:30. Trade number blocked.",
    path: "happy" as const,
  },
  {
    id: "draft",
    lane: "sidecar",
    n: "04",
    t: "Grounded draft",
    d: "Only live inventory. No payment, no discount, no Sunday hours.",
    path: "happy" as const,
  },
  {
    id: "copy",
    lane: "jordan",
    n: "05",
    t: "Copy",
    d: "Jordan reads it. Copy is allowed. The model does not drive Messenger.",
    path: "happy" as const,
  },
  {
    id: "paste",
    lane: "jordan",
    n: "06",
    t: "Paste",
    d: "Into the composer of the synthetic thread. A person still holds the keys.",
    path: "happy" as const,
  },
  {
    id: "send",
    lane: "jordan",
    n: "07",
    t: "Send",
    d: "Human tap. Nothing autonomous. Ever.",
    path: "happy" as const,
  },
  {
    id: "human",
    lane: "meta",
    n: "08",
    t: "Human-sent",
    d: "Meta sees a person. HUMAN_AGENT 7-day window exists because a human approved.",
    path: "happy" as const,
  },
  {
    id: "autotype",
    lane: "sidecar",
    n: "X1",
    t: "Auto-type",
    d: "Five characters, then abort. Composer stays empty.",
    path: "abort" as const,
  },
  {
    id: "stealth",
    lane: "sidecar",
    n: "X2",
    t: "Stealth login",
    d: "Refused. No session capture. No facebook.com drive.",
    path: "refuse" as const,
  },
];

export const ARCHIFY_SEQUENCE = [
  { from: "Jordan", to: "Sidecar", t: "clicks Auto-type", note: "Demo control. Not a Facebook login." },
  { from: "Sidecar", to: "Composer", t: "types 5 characters", note: "Then stops. On purpose." },
  { from: "Sidecar", to: "Jordan", t: "abort card", note: "Draft slot replaced. Refusal is the UI." },
  { from: "Composer", to: "Composer", t: "empty", note: "Nothing left in the box." },
  { from: "Meta", to: "Meta", t: "never contacted", note: "No participant message. No session." },
] as const;

export const ARCHIFY_HAPPY_IDS = ARCHIFY_NODES.filter((n) => n.path === "happy").map((n) => n.id);

export const OM_SHOTS = [
  {
    id: "lot",
    n: "01",
    title: "Night lot",
    dur: "15s",
    src: "/film/lotbeacon-lot.mp4",
    poster: "/film/lotbeacon-lot.jpg",
    slate: "Wide. One lot-light. Wet asphalt. Track to the glass. Hands copy from paper and tap Send.",
  },
  {
    id: "draft",
    n: "02",
    title: "Paper draft",
    dur: "10s",
    src: "/film/lotbeacon-draft.mp4",
    poster: "/film/lotbeacon-draft.jpg",
    slate: "Close. Cream stock. T2401. Saturday 10:00 or 11:30. Title card: 0 autonomous sends.",
  },
] as const;

export const OM_PIPELINE = [
  "research",
  "proposal",
  "script",
  "scene_plan",
  "assets",
  "edit",
  "compose",
] as const;
