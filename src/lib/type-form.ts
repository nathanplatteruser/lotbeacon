import type { Claim, Slot, Thread, Vehicle } from "./types";
import { inboundCluster, isFresh, vehicleLabel } from "./engine";

export const TYPE_FORM_REASON_PREFIX = "Type form · ";

export const NOUL_BLOCK = 0.7;
export const NOUL_WARN = 0.3;

export type TypeFormNoulId =
  | "quotes_payment"
  | "asserts_approval"
  | "quotes_trade_value"
  | "invents_discount"
  | "quotes_otd_or_doc_fee"
  | "overrides_opt_out"
  | "claims_sold_available"
  | "invents_sunday_hours"
  | "invents_slot"
  | "invents_vehicle_spec"
  | "asks_credit_or_income"
  | "sounds_autonomous";

export type TypeFormGateAction = "send_ready" | "edit_first" | "escalate_manager" | "suppress_dnc";

export const TYPE_FORM_NOULS: {
  id: TypeFormNoulId;
  instructions: string;
  criteria: { true: string; false: string };
  blockReason: string;
}[] = [
  {
    id: "quotes_payment",
    instructions: "Does `draft.text` quote a monthly payment, APR, or financing term to the customer?",
    criteria: {
      true: "Names a monthly payment, dollars per month, APR, rate, or term. Includes paraphrases like four hundred a month.",
      false: "Talks list price on the unit, or says numbers happen at the desk. No monthly figure.",
    },
    blockReason: "Payment quotes are F&I only.",
  },
  {
    id: "asserts_approval",
    instructions: "Does `draft.text` assert that the customer is approved, pre-approved, or qualifies for financing?",
    criteria: {
      true: "Says they are approved, pre-approved, qualified, or we can get you approved as a fact.",
      false: "Defers credit to F&I, or does not mention approval.",
    },
    blockReason: "Credit decisions are prohibited in-thread.",
  },
  {
    id: "quotes_trade_value",
    instructions: "Does `draft.text` assign a dollar value or an offer to the customer's trade?",
    criteria: {
      true: "Worth about, trade-in is, I can give you $X for the Accord, or any trade number.",
      false: "Acknowledges a trade and says appraisal happens on the lot. No dollar.",
    },
    blockReason: "Trade values are appraisal-only.",
  },
  {
    id: "invents_discount",
    instructions: "Does `draft.text` invent a discount, a knock-off, or a price that is not the list price on `vehicle`?",
    criteria: {
      true: "Offers money off, a better price in chat, or a number that is not vehicle.price.",
      false: "States the listed internet price from the vehicle record, or refuses to invent a discount.",
    },
    blockReason: "Discounts go through the desk — never in Messenger.",
  },
  {
    id: "quotes_otd_or_doc_fee",
    instructions: "Does `draft.text` state an out-the-door price or a doc-fee amount?",
    criteria: {
      true: "Uses out the door, OTD, or names a doc fee in dollars.",
      false: "Says fees are itemized at the desk. No OTD number.",
    },
    blockReason: "OTD and doc fees are itemized by the store, not invented here.",
  },
  {
    id: "overrides_opt_out",
    instructions: "Does `draft.text` keep selling after `thread.dnc` is true, or tell them we will keep texting?",
    criteria: {
      true: "Any outbound pitch while opted out, or we'll keep you posted, or please stop said by us.",
      false: "Draft is empty, or a one-line confirmation that they are off the list.",
    },
    blockReason: "Opt-out language is never overridden.",
  },
  {
    id: "claims_sold_available",
    instructions: "Does `draft.text` claim `vehicle` is on the lot or still available when sold, pending, or stale?",
    criteria: {
      true: "Still here, on the lot, we have it, is here against a sold, pending, or stale record.",
      false: "Says sold, pending, or let me verify. Or the unit is available and the feed is fresh.",
    },
    blockReason: "Do not claim a sold, pending, or stale unit is on the lot.",
  },
  {
    id: "invents_sunday_hours",
    instructions: "Does `draft.text` offer, confirm, or imply a Sunday sales appointment?",
    criteria: {
      true: "Sunday as a time they can come in. See you Sunday. Sunday at 2 works.",
      false: "Closed Sunday, then a Saturday time from slots. Or no Sunday at all.",
    },
    blockReason: "Sales floor is closed Sunday.",
  },
  {
    id: "invents_slot",
    instructions: "Does `draft.text` offer or confirm a day-and-clock that is not on `slots`?",
    criteria: {
      true: "A specific clock that does not match a slots label. 11:00 is not 11:30.",
      false: "Confirms a named time that is on slots, or offers only times from slots, or names no clock.",
    },
    blockReason: "That time is not on the board.",
  },
  {
    id: "invents_vehicle_spec",
    instructions: "Does `draft.text` assert a vehicle spec that is not on `vehicle` as a fact?",
    criteria: {
      true: "Invents a number or a yes/no spec the record does not carry. Guesses tow pounds or MPG.",
      false: "Answers only from the record, or says we will read the window sticker.",
    },
    blockReason: "Spec is not on the vehicle record. Do not guess.",
  },
  {
    id: "asks_credit_or_income",
    instructions: "Does `draft.text` ask the customer for credit score, income, down payment, cash vs loan, or budget?",
    criteria: {
      true: "Any ask for score, income, down, pre-qual, cash or finance, what they can afford.",
      false: "No money-qualification question. Visit logistics only.",
    },
    blockReason: "Credit, income, and down payment stay off this thread.",
  },
  {
    id: "sounds_autonomous",
    instructions: "Does `draft.text` claim a system, bot, or AI sent this without a person hitting Send?",
    criteria: {
      true: "I automatically sent, the system replied, AI assistant, this is an automated message.",
      false: "Reads as a person on the floor. No bot self-ID.",
    },
    blockReason: "A person still hits Send. Nothing autonomous.",
  },
];

export interface TypeFormState {
  draft: { text: string };
  thread: {
    dnc: boolean;
    channel: Thread["channel"];
    appointmentId: string | null;
    facts: { key: string; value: string }[];
    lastInbound: string;
    lastOutbound: string;
  };
  vehicle: {
    stock: string;
    ymm: string;
    vin: string;
    status: Vehicle["status"];
    price: number;
    drivetrain: string;
    miles: number;
    fresh: boolean;
    smoker: boolean | null;
    accident: Vehicle["accidentHistory"] | null;
    thirdRow: boolean | null;
    boosterOk: boolean | null;
    seats: number | null;
    titleStatus: Vehicle["titleStatus"] | null;
  } | null;
  slots: string[];
  inboundHeat: string;
}

export interface TypeFormJudgment {
  nouls: Record<TypeFormNoulId, number>;
  gate_action: TypeFormGateAction;
  groundedness: number;
  show_risk: number;
  source: "local" | "jev";
}

const PAYMENT_RE =
  /\$\s?\d{2,4}\s?\/?\s?(mo|month)|per month|\/mo\b|a month|apr\b|\d(\.\d)?\s?%\s*(apr|rate|interest)|four hundred a month|five hundred a month|we can get you around \$?\d{2,4}/i;
const APPROVAL_RE = /you'?re approved|pre-?approved|you qualify|we can get you approved|already approved/i;
const TRADE_VALUE_RE =
  /worth about|trade(?:-?in)? (?:value|offer|is)|\$\d{1,2},?\d{3} for (?:your|the) |i can (?:give|do) you \$\d+ for/i;
const DISCOUNT_RE =
  /knock (?:a few hundred|\$?\d)|\$\d{3,},?\d{0,3} off|best price is|i can do \$\d|take \$?\d+ off|come off the (price|sticker)/i;
const OTD_RE = /out the door|out-the-door|\botd\b(?:\s+(?:is|price))?|doc fee is \$\d|doc fee of/i;
const KEEP_TEXTING_RE = /we'?ll keep (texting|you posted)|please stop|ignore the opt/i;
const AVAILABLE_RE = /still (here|available)|on the lot|we have it|is here/i;
const SUNDAY_OFFER_RE = /see you sunday|sunday at |sunday works|come sunday|sunday \d/i;
const CREDIT_ASK_RE =
  /credit score|what'?s your credit|income|down payment|cash or (loan|finance)|pre-?qual|what can you afford|budget\??/i;
const AUTO_RE =
  /i automatically sent|the system (replied|sent)|ai assistant|this is an automated message|sent by (the )?bot/i;
const SPEC_GUESS_RE =
  /tows? \d{3,5}|\d{2,3}\s?mpg|sunroof is (yes|no|standard)|rated at \d{3,5} (lb|lbs|pounds)/i;

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function lastRepText(thread: Thread) {
  for (let i = thread.messages.length - 1; i >= 0; i--) {
    if (thread.messages[i]!.who === "rep") return thread.messages[i]!.text;
  }
  return "";
}

export function buildTypeFormState(
  text: string,
  thread: Thread,
  vehicle: Vehicle | null,
  slots: Slot[] = thread.draft.slots,
): TypeFormState {
  const cluster = inboundCluster(thread);
  return {
    draft: { text },
    thread: {
      dnc: thread.dnc,
      channel: thread.channel,
      appointmentId: thread.appointmentId,
      facts: thread.facts.map((f) => ({ key: f.key, value: f.value })),
      lastInbound: cluster.latest,
      lastOutbound: lastRepText(thread),
    },
    vehicle: vehicle
      ? {
          stock: vehicle.stock,
          ymm: vehicleLabel(vehicle),
          vin: vehicle.vin,
          status: vehicle.status,
          price: vehicle.price,
          drivetrain: vehicle.drivetrain,
          miles: vehicle.miles,
          fresh: isFresh(vehicle),
          smoker: vehicle.smoker ?? null,
          accident: vehicle.accidentHistory ?? null,
          thirdRow: vehicle.thirdRow ?? null,
          boosterOk: vehicle.boosterOk ?? null,
          seats: vehicle.seats ?? null,
          titleStatus: vehicle.titleStatus ?? null,
        }
      : null,
    slots: slots.map((s) => s.label),
    inboundHeat: cluster.combined,
  };
}

function slotMinutesFromLabel(label: string): number | null {
  const m = label.match(/\b(\d{1,2}):(\d{2})\s*(a\.?m\.?|p\.?m\.?)/i);
  if (!m) return null;
  let hour = Number(m[1]);
  const minute = Number(m[2]);
  const mer = m[3]!.toLowerCase().replace(/\./g, "");
  if (mer === "pm" && hour < 12) hour += 12;
  if (mer === "am" && hour === 12) hour = 0;
  return hour * 60 + minute;
}

function inventedSlot(text: string, slots: string[]) {
  const clocks = [...text.matchAll(/\b(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)/gi)];
  if (!clocks.length) return false;
  const allowed = new Set(
    slots.map(slotMinutesFromLabel).filter((n): n is number => n != null),
  );
  if (!allowed.size) return false;
  for (const m of clocks) {
    let hour = Number(m[1]);
    const minute = Number(m[2] ?? 0);
    const mer = (m[3] ?? "").toLowerCase().replace(/\./g, "");
    if (mer === "pm" && hour < 12) hour += 12;
    if (mer === "am" && hour === 12) hour = 0;
    if (!mer && hour > 0 && hour <= 8) hour += 12;
    const mins = hour * 60 + minute;
    if (!allowed.has(mins)) return true;
  }
  return false;
}

function inventedSpec(text: string, vehicle: TypeFormState["vehicle"]) {
  if (SPEC_GUESS_RE.test(text)) return true;
  if (!vehicle) {
    return /\b(third row|booster|sunroof|4wd|awd|clean title|smoker)\b/i.test(text) && /\byes\b|\bno\b|is a /i.test(text);
  }
  if (/\bAWD\b/.test(text) && vehicle.drivetrain !== "AWD") return true;
  if (/third row/i.test(text) && vehicle.thirdRow == null && !/window sticker|won'?t guess/i.test(text)) return true;
  if (/sunroof/i.test(text) && !/window sticker|won'?t guess/i.test(text)) return true;
  return false;
}

function noulFrom(hit: boolean, strong = true) {
  if (!hit) return 0.04;
  return strong ? 0.92 : 0.62;
}

export function judgeTypeFormLocal(state: TypeFormState): TypeFormJudgment {
  const text = state.draft.text;
  const t = text.toLowerCase();
  const empty = !text.trim();
  const v = state.vehicle;

  const nouls: Record<TypeFormNoulId, number> = {
    quotes_payment: noulFrom(PAYMENT_RE.test(text)),
    asserts_approval: noulFrom(APPROVAL_RE.test(text)),
    quotes_trade_value: noulFrom(TRADE_VALUE_RE.test(text)),
    invents_discount: noulFrom(DISCOUNT_RE.test(text)),
    quotes_otd_or_doc_fee: noulFrom(OTD_RE.test(text)),
    overrides_opt_out: noulFrom(state.thread.dnc && !!text.trim() && !/^you'?re off the list/i.test(text) || KEEP_TEXTING_RE.test(text)),
    claims_sold_available: noulFrom(
      !!v && AVAILABLE_RE.test(text) && (v.status === "sold" || v.status === "pending" || !v.fresh),
    ),
    invents_sunday_hours: noulFrom(SUNDAY_OFFER_RE.test(text) || (/\bsunday\b/i.test(text) && /\b(see you|works|come in|book)/i.test(text))),
    invents_slot: noulFrom(inventedSlot(text, state.slots)),
    invents_vehicle_spec: noulFrom(inventedSpec(text, v)),
    asks_credit_or_income: noulFrom(CREDIT_ASK_RE.test(text)),
    sounds_autonomous: noulFrom(AUTO_RE.test(text)),
  };

  const heat = state.inboundHeat.toLowerCase();
  const escalate =
    /lawyer|bbb|complaint|ripoff|time-?waster|you insulted/i.test(heat) ||
    /\bhold\b|don'?t sell it/i.test(heat) ||
    /deliver/i.test(heat);

  let gate_action: TypeFormGateAction = "send_ready";
  if (state.thread.dnc) gate_action = "suppress_dnc";
  else if (escalate && (empty || /manager|handoff|desk/i.test(t))) gate_action = "escalate_manager";
  else if (escalate && empty) gate_action = "escalate_manager";
  else if (Object.values(nouls).some((n) => n >= NOUL_BLOCK)) gate_action = "edit_first";
  else if (Object.values(nouls).some((n) => n >= NOUL_WARN)) gate_action = "edit_first";

  const hardHit = Object.values(nouls).some((n) => n >= NOUL_BLOCK);
  const groundedness = hardHit ? 0 : Object.values(nouls).some((n) => n >= NOUL_WARN) ? 1 : empty ? 1 : 2;
  const show_risk = hardHit || /what'?s your credit|stacked/i.test(t) ? 2 : gate_action === "edit_first" ? 1 : 0;

  return { nouls, gate_action, groundedness, show_risk, source: "local" };
}

export function claimsFromJudgment(judgment: TypeFormJudgment): Claim[] {
  const out: Claim[] = [];
  for (const spec of TYPE_FORM_NOULS) {
    const n = judgment.nouls[spec.id];
    if (n >= NOUL_BLOCK) {
      out.push({
        text: spec.id,
        severity: "block",
        reason: `${TYPE_FORM_REASON_PREFIX}${spec.blockReason}`,
      });
    } else if (n >= NOUL_WARN) {
      out.push({
        text: spec.id,
        severity: "warn",
        reason: `${TYPE_FORM_REASON_PREFIX}${spec.blockReason} Uncertain — edit or send with eyes open.`,
      });
    }
  }
  if (judgment.gate_action === "suppress_dnc" && !out.some((c) => c.text === "overrides_opt_out")) {
    out.push({
      text: "gate_action",
      severity: "block",
      reason: `${TYPE_FORM_REASON_PREFIX}Customer opted out. Draft stays empty.`,
    });
  }
  if (judgment.gate_action === "escalate_manager") {
    out.push({
      text: "gate_action",
      severity: "block",
      reason: `${TYPE_FORM_REASON_PREFIX}Manager owns this thread. No AI draft.`,
    });
  }
  if (judgment.groundedness < 1) {
    out.push({
      text: "groundedness",
      severity: "warn",
      reason: `${TYPE_FORM_REASON_PREFIX}Draft is not fully grounded in the vehicle record.`,
    });
  }
  if (!out.length) {
    out.push({
      text: "type_form",
      severity: "ok",
      reason: `${TYPE_FORM_REASON_PREFIX}No typed-form violation.`,
    });
  }
  return out;
}

export function typeFormClaims(
  text: string,
  thread: Thread,
  vehicle: Vehicle | null,
  slots: Slot[] = thread.draft.slots,
): Claim[] {
  const state = buildTypeFormState(text, thread, vehicle, slots);
  return claimsFromJudgment(judgeTypeFormLocal(state));
}

export function appendTypeFormClaims(
  existing: Claim[],
  text: string,
  thread: Thread,
  vehicle: Vehicle | null,
  slots: Slot[] = thread.draft.slots,
): Claim[] {
  const typed = typeFormClaims(text, thread, vehicle, slots);
  const withoutOkPad = existing.filter((c) => !(c.severity === "ok" && typed.some((t) => t.severity !== "ok")));
  const merged = [...withoutOkPad];
  for (const claim of typed) {
    if (claim.severity === "ok" && merged.some((c) => c.severity === "ok")) continue;
    if (merged.some((c) => c.text === claim.text && c.reason === claim.reason)) continue;
    merged.push(claim);
  }
  return merged;
}

/** Optional Jev path. Sync callers never wait on this. */
export async function judgeTypeFormJev(state: TypeFormState): Promise<TypeFormJudgment | null> {
  const key = typeof process !== "undefined" ? process.env.TYPESAFE_API_KEY : undefined;
  if (!key) return null;
  const questions: Record<string, unknown> = {};
  for (const spec of TYPE_FORM_NOULS) {
    questions[spec.id] = {
      type: "noul",
      instructions: spec.instructions,
      criteria: spec.criteria,
    };
  }
  questions.gate_action = {
    type: "choice",
    instructions: "Which gate should code apply to `draft.text` given `thread` and `vehicle`?",
    criteria: {
      send_ready: "No hard violation. Draft is grounded. A person may tap Send.",
      edit_first: "Soft miss. Mixed grounding, ignored question, or stacked asks.",
      escalate_manager: "Insult, lawyer/BBB, hold request, financing decision, or delivery route.",
      suppress_dnc: "Customer opted out. Draft must stay empty.",
    },
  };
  questions.groundedness = {
    type: "score",
    instructions: "How grounded is `draft.text` in `vehicle` and `thread.facts`?",
    criteria: [
      "Claims not on the vehicle or facts. Invented hours, price, or spec.",
      "Mix of grounded lines and a stretch. One unverified clause.",
      "Every vehicle claim is on the record. Numbers stay off-thread.",
    ],
  };
  questions.show_risk = {
    type: "score",
    instructions: "How likely is `draft.text` to kill the show?",
    criteria: [
      "Answers what they asked. Holds the named time or pulls the unit.",
      "Fine but not a show-rate move.",
      "Stacked asks, ignored spec question, invented number, or more heat.",
    ],
  };
  try {
    const res = await fetch("https://api.typesafe.ai/v1/systemone", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({ model: "jev-latest", state, questions }),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as {
      answers?: Record<string, { noul?: number; choice?: string; score?: number }>;
    };
    const answers = body.answers ?? {};
    const nouls = {} as Record<TypeFormNoulId, number>;
    for (const spec of TYPE_FORM_NOULS) {
      nouls[spec.id] = clamp01(Number(answers[spec.id]?.noul ?? 0));
    }
    const choice = answers.gate_action?.choice;
    const gate_action: TypeFormGateAction =
      choice === "edit_first" || choice === "escalate_manager" || choice === "suppress_dnc" || choice === "send_ready"
        ? choice
        : "edit_first";
    return {
      nouls,
      gate_action,
      groundedness: Number(answers.groundedness?.score ?? 1),
      show_risk: Number(answers.show_risk?.score ?? 1),
      source: "jev",
    };
  } catch {
    return null;
  }
}
