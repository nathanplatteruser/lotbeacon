import type { Claim, Slot, Thread, Vehicle } from "./types";

export const TYPE_FORM_HARD_THRESHOLD = 0.7;
export const TYPE_FORM_WARN_THRESHOLD = 0.3;
const TYPE_FORM_FRESHNESS_MS = 30 * 60 * 1000;
const TYPE_FORM_OK_TEXT = "Grounded";
const TYPE_FORM_REASON_PREFIX = "Type form · ";

type TypeFormNoul =
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
export type TypeFormScore = 0 | 1 | 2;

export type TypeFormJudgment = {
  noul: Record<TypeFormNoul, number>;
  choice: { gate_action: TypeFormGateAction };
  score: {
    groundedness: TypeFormScore;
    show_risk: TypeFormScore;
  };
};

type JudgeContext = {
  text: string;
  thread?: Pick<Thread, "dnc"> | null;
  vehicle?: Vehicle | null;
  slots?: Slot[];
};

type TimeMention = {
  day: string | null;
  hour24: number;
  minute: number;
};

const NOUL_REASONS: Record<TypeFormNoul, string> = {
  quotes_payment: "monthly payment, APR, or financing term belongs with F&I, not the thread.",
  asserts_approval: "approval or qualification claims are prohibited in-thread.",
  quotes_trade_value: "trade value or trade offer claims stay on the appraisal lane.",
  invents_discount: "discount or off-book price language is not grounded to the vehicle record.",
  quotes_otd_or_doc_fee: "OTD or doc fee amounts are store figures, not draft guesses.",
  overrides_opt_out: "the thread is DNC, so no outbound pitch should leave the device.",
  claims_sold_available: "availability wording conflicts with sold, pending, or stale inventory.",
  invents_sunday_hours: "Sunday sales appointments are not allowed.",
  invents_slot: "the draft names a day-and-clock that is not one of the proposed slots.",
  invents_vehicle_spec: "the draft asserts a vehicle spec that is not on the vehicle record.",
  asks_credit_or_income: "credit, income, down payment, cash-vs-loan, or budget questions stay with a human.",
  sounds_autonomous: "the draft says a bot or system sent the message.",
};

function baseJudgment(): TypeFormJudgment {
  return {
    noul: {
      quotes_payment: 0,
      asserts_approval: 0,
      quotes_trade_value: 0,
      invents_discount: 0,
      quotes_otd_or_doc_fee: 0,
      overrides_opt_out: 0,
      claims_sold_available: 0,
      invents_sunday_hours: 0,
      invents_slot: 0,
      invents_vehicle_spec: 0,
      asks_credit_or_income: 0,
      sounds_autonomous: 0,
    },
    choice: { gate_action: "send_ready" },
    score: { groundedness: 2, show_risk: 1 },
  };
}

function normalize(text: string) {
  return text.toLowerCase();
}

function max(current: number, next: number) {
  return next > current ? next : current;
}

function parseMoney(text: string) {
  return [...text.matchAll(/\$\s?([0-9][0-9,]{2,})/g)].map((match) => Number(match[1]!.replace(/,/g, "")));
}

function isStaleVehicle(vehicle: Vehicle | null | undefined, now = Date.now()) {
  if (!vehicle?.retrievedAt) return false;
  return now - new Date(vehicle.retrievedAt).getTime() > TYPE_FORM_FRESHNESS_MS;
}

function mentionsAvailability(text: string) {
  return /still (?:here|available)|on the lot|we have it|is here|available now/i.test(text);
}

function dayHint(text: string): string | null {
  if (/\bsunday\b/i.test(text)) return "sunday";
  if (/\bsaturday\b|\bsat\b/i.test(text)) return "saturday";
  if (/\bfriday\b|\bfri\b/i.test(text)) return "friday";
  if (/\bthursday\b|\bthu\b/i.test(text)) return "thursday";
  if (/\btoday\b/i.test(text)) return "today";
  if (/\btomorrow\b/i.test(text)) return "tomorrow";
  return null;
}

function extractTimeMentions(text: string): TimeMention[] {
  const mentions: TimeMention[] = [];
  for (const match of text.matchAll(/\b(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)\b/gi)) {
    let hour = Number(match[1]);
    const minute = Number(match[2] ?? 0);
    const meridiem = match[3]!.toLowerCase().replace(/\./g, "");
    if (meridiem === "pm" && hour < 12) hour += 12;
    if (meridiem === "am" && hour === 12) hour = 0;
    mentions.push({ day: dayHint(text), hour24: hour, minute });
  }
  for (const match of text.matchAll(/\b(?:at|for)\s+(\d{1,2}):(\d{2})\b/gi)) {
    const hour = Number(match[1]);
    const minute = Number(match[2]);
    if (!mentions.some((item) => item.hour24 === hour && item.minute === minute && item.day === dayHint(text))) {
      mentions.push({ day: dayHint(text), hour24: hour, minute });
    }
  }
  for (const match of text.matchAll(/\b(\d{1,2}):(\d{2})\b/g)) {
    let hour = Number(match[1]);
    const minute = Number(match[2]);
    if (hour > 0 && hour <= 8) hour += 12;
    if (!mentions.some((item) => item.hour24 === hour && item.minute === minute && item.day === dayHint(text))) {
      mentions.push({ day: dayHint(text), hour24: hour, minute });
    }
  }
  return mentions;
}

function parseSlotMentions(slots: Slot[]) {
  return slots.flatMap((slot) => extractTimeMentions(slot.label).map((time) => ({ ...time, day: dayHint(slot.label) ?? time.day })));
}

function matchesSlot(mention: TimeMention, slots: Slot[]) {
  const slotMentions = parseSlotMentions(slots);
  return slotMentions.some((slot) => {
    if (slot.hour24 !== mention.hour24 || slot.minute !== mention.minute) return false;
    if (!mention.day) return true;
    return slot.day === mention.day;
  });
}

function setChoice(judgment: TypeFormJudgment) {
  const hard = Object.entries(judgment.noul).filter(([, score]) => score >= TYPE_FORM_HARD_THRESHOLD);
  const hasWarning = Object.entries(judgment.noul).some(
    ([, score]) => score >= TYPE_FORM_WARN_THRESHOLD && score < TYPE_FORM_HARD_THRESHOLD,
  );
  if (judgment.noul.overrides_opt_out >= TYPE_FORM_HARD_THRESHOLD) {
    judgment.choice.gate_action = "suppress_dnc";
    return;
  }
  if (
    judgment.noul.quotes_payment >= TYPE_FORM_HARD_THRESHOLD ||
    judgment.noul.asserts_approval >= TYPE_FORM_HARD_THRESHOLD ||
    judgment.noul.quotes_trade_value >= TYPE_FORM_HARD_THRESHOLD ||
    judgment.noul.quotes_otd_or_doc_fee >= TYPE_FORM_HARD_THRESHOLD ||
    judgment.noul.asks_credit_or_income >= TYPE_FORM_HARD_THRESHOLD
  ) {
    judgment.choice.gate_action = "escalate_manager";
    return;
  }
  if (hard.length || hasWarning || judgment.score.groundedness < 1 || judgment.score.show_risk === 2) {
    judgment.choice.gate_action = "edit_first";
  }
}

function setScores(judgment: TypeFormJudgment) {
  const hard = Object.values(judgment.noul).some((score) => score >= TYPE_FORM_HARD_THRESHOLD);
  const warn = Object.values(judgment.noul).some(
    (score) => score >= TYPE_FORM_WARN_THRESHOLD && score < TYPE_FORM_HARD_THRESHOLD,
  );
  judgment.score.groundedness = hard ? 0 : warn ? 1 : 2;
  if (
    judgment.noul.invents_sunday_hours >= TYPE_FORM_HARD_THRESHOLD ||
    judgment.noul.invents_slot >= TYPE_FORM_HARD_THRESHOLD ||
    judgment.noul.claims_sold_available >= TYPE_FORM_HARD_THRESHOLD
  ) {
    judgment.score.show_risk = 2;
  } else if (warn) {
    judgment.score.show_risk = 1;
  } else {
    judgment.score.show_risk = 0;
  }
}

export function judgeTypeForm(input: JudgeContext | string): TypeFormJudgment {
  const context: JudgeContext = typeof input === "string" ? { text: input } : input;
  const judgment = baseJudgment();
  const text = context.text.trim();
  if (!text) return judgment;
  const low = normalize(text);
  const vehicle = context.vehicle ?? null;
  const slots = context.slots ?? [];

  if (
    /\bapr\b|interest rate|financing term|\$\s?\d{2,4}\s*(?:\/\s*mo|\/mo|a month|per month)|\b(?:one|two|three|four|five|six|seven|eight|nine) hundred\s+(?:a|per)\s+month\b/i.test(
      text,
    )
  ) {
    judgment.noul.quotes_payment = 0.95;
  }
  if (/you'?re approved|pre-?approved|you qualify|qualified already/i.test(text)) {
    judgment.noul.asserts_approval = 0.95;
  }
  if (/trade(?:-?in)? (?:value|offer|is|would be)|worth about|\$\d{1,2},?\d{3} for (?:your|the) trade/i.test(text)) {
    judgment.noul.quotes_trade_value = 0.95;
  }
  if (/out the door|out-the-door|\botd\b|doc fee/i.test(low)) {
    judgment.noul.quotes_otd_or_doc_fee = /\$\s?\d|doc fee|out the door|out-the-door|\botd\b/i.test(text) ? 0.95 : 0.5;
  }
  if (context.thread?.dnc && text) {
    judgment.noul.overrides_opt_out = 1;
  }
  if (/\bsunday\b/i.test(text) && /appointment|come in|swing by|works|available|open|book|test drive|visit/i.test(text)) {
    judgment.noul.invents_sunday_hours = 0.95;
  }
  if (
    /credit score|your credit|income|down payment|cash or loan|cash or finance|budget|monthly budget|how much down|how much can you put down/i.test(
      low,
    )
  ) {
    judgment.noul.asks_credit_or_income = 0.95;
  }
  if (/\bi(?:'m| am) (?:an )?(?:ai|bot)\b|our system sent|this was automated|auto(?:mated)? message/i.test(low)) {
    judgment.noul.sounds_autonomous = 0.95;
  }

  const money = parseMoney(text);
  if (/\$\s?\d|best price|knock .* off|money off|discount|i can do \$/i.test(text)) {
    const offBookPrice = vehicle && money.some((amount) => amount > 1000 && amount !== vehicle.price);
    if (/knock .* off|money off|discount|best price|take \$?\d+/i.test(low) || offBookPrice) {
      judgment.noul.invents_discount = 0.95;
    } else if (vehicle && money.some((amount) => amount === vehicle.price)) {
      judgment.noul.invents_discount = 0;
    } else if (!vehicle && money.length) {
      judgment.noul.invents_discount = max(judgment.noul.invents_discount, 0.6);
    }
  }

  if (vehicle) {
    if ((vehicle.status === "sold" || vehicle.status === "pending" || isStaleVehicle(vehicle)) && mentionsAvailability(text)) {
      judgment.noul.claims_sold_available = vehicle.status === "pending" ? 0.75 : 0.95;
    }
    if (/\bawd\b|all wheel drive/i.test(text) && vehicle.drivetrain !== "AWD") {
      judgment.noul.invents_vehicle_spec = 0.85;
    }
    if (/\b4x4\b|\b4wd\b|four wheel drive/i.test(text) && !/4wd|4x4/i.test(vehicle.drivetrain.toLowerCase())) {
      judgment.noul.invents_vehicle_spec = max(judgment.noul.invents_vehicle_spec, 0.85);
    }
    if (/third row/i.test(text) && vehicle.thirdRow === false) {
      judgment.noul.invents_vehicle_spec = max(judgment.noul.invents_vehicle_spec, 0.85);
    }
    if (/clean title/i.test(text) && vehicle.titleStatus && vehicle.titleStatus !== "clean") {
      judgment.noul.invents_vehicle_spec = max(judgment.noul.invents_vehicle_spec, 0.85);
    }
    if (/no accidents|clean carfax/i.test(text) && vehicle.accidentHistory === "reported") {
      judgment.noul.invents_vehicle_spec = max(judgment.noul.invents_vehicle_spec, 0.85);
    }
  }

  const mentionedTimes = extractTimeMentions(text);
  if (slots.length > 0 && mentionedTimes.length > 0) {
    const unmatched = mentionedTimes.some((mention) => !matchesSlot(mention, slots));
    if (unmatched) {
      judgment.noul.invents_slot = 0.95;
    }
  }

  setScores(judgment);
  setChoice(judgment);
  return judgment;
}

function typeFormClaimsFromJudgment(judgment: TypeFormJudgment): Claim[] {
  const claims: Claim[] = [];
  (Object.entries(judgment.noul) as Array<[TypeFormNoul, number]>).forEach(([key, score]) => {
    if (score < TYPE_FORM_WARN_THRESHOLD) return;
    claims.push({
      text: key,
      severity: score >= TYPE_FORM_HARD_THRESHOLD ? "block" : "warn",
      reason: `${TYPE_FORM_REASON_PREFIX}${NOUL_REASONS[key]}`,
    });
  });
  if (judgment.choice.gate_action === "escalate_manager") {
    claims.push({
      text: "gate_action",
      severity: "block",
      reason: `${TYPE_FORM_REASON_PREFIX}gate action is escalate_manager, so a human must own the next move.`,
    });
  }
  if (judgment.choice.gate_action === "suppress_dnc") {
    claims.push({
      text: "gate_action",
      severity: "block",
      reason: `${TYPE_FORM_REASON_PREFIX}gate action is suppress_dnc, so nothing should be sent.`,
    });
  }
  if (judgment.score.groundedness < 1) {
    claims.push({
      text: "groundedness",
      severity: "warn",
      reason: `${TYPE_FORM_REASON_PREFIX}groundedness is ${judgment.score.groundedness}, so the draft is not fully grounded.`,
    });
  }
  if (judgment.score.show_risk === 2) {
    claims.push({
      text: "show_risk",
      severity: "warn",
      reason: `${TYPE_FORM_REASON_PREFIX}show risk is 2, so this wording is likely to kill the show.`,
    });
  }
  return claims;
}

export function appendTypeFormClaims(
  existing: Claim[],
  text: string,
  thread?: Pick<Thread, "dnc"> | null,
  vehicle?: Vehicle | null,
  slots: Slot[] = [],
) {
  const typedClaims = typeFormClaimsFromJudgment(judgeTypeForm({ text, thread, vehicle, slots }));
  if (typedClaims.length === 0) return existing;
  const base = existing.filter((claim) => !(claim.severity === "ok" && claim.text === TYPE_FORM_OK_TEXT));
  return [...base, ...typedClaims];
}

export function firstTypeFormBlockReason(input: JudgeContext | string) {
  const claims = typeFormClaimsFromJudgment(judgeTypeForm(input));
  return claims.find((claim) => claim.severity === "block")?.reason ?? null;
}
