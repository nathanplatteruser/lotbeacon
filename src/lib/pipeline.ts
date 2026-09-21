import { durationHuman } from "./format";
import {
  findVehicle,
  generateDraft,
  inventoryAgeMs,
  isFresh,
  proposeSlots,
  validateClaims,
  vehicleLabel,
  vehicleRetrievedAt,
  vehicleSource,
} from "./engine";
import type {
  AnalyzeResult,
  Classification,
  Draft,
  ExplainStep,
  Fact,
  Intent,
  Thread,
  Vehicle,
  VoiceId,
} from "./types";
import { AUTO_VOICE_THRESHOLD, detectCustomerVoice } from "./voices";

export const INQUIRY_EXAMPLES = [
  "Is that black Explorer you posted still available? I've got a 2018 Accord to trade. Could probably come Saturday.",
  "Can you do $400 a month on the F-150? My credit is around 580.",
  "I'll take $2,500 off today or I'm walking. Sunday at 2 works.",
  "Hold the Explorer until Tuesday. Don't sell it.",
  "What's the APR on that F-150? Can you do 5.9%?",
  "Does the Bronco have 4x4? I need it for hunting.",
  "Is the Mustang still there? My credit is shot — can you still get me approved?",
];

function classify(text: string): Classification {
  const t = text.toLowerCase();
  let intent: Intent = "general";
  if (/stop (text|message)|unsubscribe|do not (text|contact)/i.test(t)) intent = "opt_out";
  else if (/bought (elsewhere|from)|already (bought|purchased)/i.test(t)) intent = "sold_elsewhere";
  else if (/lawyer|bbb|complaint|ripoff/i.test(t)) intent = "complaint";
  else if (/reschedul|cancel.*(sat|sun|appt|appointment)|can't make/i.test(t)) intent = "reschedule";
  else if (/\bhold\b|don't sell it/i.test(t)) intent = "hold";
  else if (/warrant/i.test(t)) intent = "warranty";
  else if (/deliver/i.test(t)) intent = "delivery";
  else if (/apr|financ|\$\s?\d{2,3}\s?(\/|a )\s?mo|credit is/i.test(t)) intent = "financing";
  else if (/trade/i.test(t)) intent = "trade";
  else if (/best (price|you can)|come down|off today|discount/i.test(t)) intent = "price";
  else if (/still available|on the lot|in stock/i.test(t)) intent = "availability";
  else if (/saturday|sunday|come in|test drive|this weekend/i.test(t)) intent = "schedule";
  else if (/tahoe|f-?150|explorer|escape|bronco|ranger|mach|expedition|maverick/i.test(t)) intent = "vehicle_search";

  const sentiment: Classification["sentiment"] =
    /angry|furious|lawsuit|rip/i.test(t) ? "angry" : /thanks|great|love/i.test(t) ? "positive" : /best you can|walking/i.test(t) ? "negative" : "neutral";
  const objection = intent === "price" ? "price" : intent === "trade" ? "trade" : intent === "financing" ? "payment" : null;
  return { intent, sentiment, objection, confidence: 0.86, signals: [intent] };
}

function extractFacts(text: string): Fact[] {
  const facts: Fact[] = [];
  const trade = text.match(/(\d{4}\s+[A-Za-z]+(?:\s+[A-Za-z]+)?)\s+to trade/i);
  if (trade) facts.push({ id: "xf_trade", key: "trade", value: trade[1]!, certainty: "confirmed", evidence: trade[0] });
  const pay = text.match(/\$\s?(\d{3,4})\s*(?:\/|a )\s*mo/i);
  if (pay) facts.push({ id: "xf_pay", key: "payment", value: `$${pay[1]}/mo`, certainty: "preferred", evidence: pay[0] });
  if (/saturday/i.test(text)) facts.push({ id: "xf_time", key: "timing", value: "Saturday", certainty: "tentative", evidence: "Saturday" });
  const unit = text.match(/\b(black|white|blue|red)?\s*(202[0-7])?\s*(tahoe|f-?150|explorer|escape|bronco|ranger|mach-?e|accord|expedition|maverick)\b/i);
  if (unit) facts.push({ id: "xf_veh", key: "vehicle", value: unit[0].trim(), certainty: "preferred", evidence: unit[0] });
  return facts;
}

export function resolveVehicle(text: string, vehicles: Vehicle[]): Vehicle | null {
  const low = text.toLowerCase();
  let best: { v: Vehicle; score: number } | null = null;
  for (const v of vehicles) {
    let score = 0;
    if (low.includes(v.model.toLowerCase())) score += 4;
    if (low.includes(v.make.toLowerCase())) score += 2;
    if (low.includes(String(v.year))) score += 2;
    if (v.color && low.includes(v.color.toLowerCase())) score += 3;
    if (score > (best?.score ?? 0)) best = { v, score };
  }
  return best && best.score >= 4 ? best.v : null;
}

function composeGroundedDraft(intent: Intent, vehicle: Vehicle | null, facts: Fact[], voice: VoiceId): string {
  const slots = proposeSlots({ slotPair: "default" } as Thread);
  const slotLine = slots.length === 2 ? `I've got ${slots[0]!.label} or ${slots[1]!.label}. Which works?` : "";
  if (intent === "opt_out") return "";
  if (intent === "financing") return "";
  if (intent === "hold" || intent === "warranty") return "";
  if (intent === "delivery") {
    return vehicle
      ? `The ${vehicleLabel(vehicle)} is here. Pickup and delivery is a manager call so we don't freelance the route. I'll have someone confirm. If you'd rather drive down, ${slotLine}`
      : `Pickup and delivery is a manager call so we don't freelance the route. If you'd rather drive down, ${slotLine}`;
  }
  if (intent === "price") {
    return vehicle
      ? `Listed internet price on the ${vehicleLabel(vehicle)} is $${vehicle.price.toLocaleString()}. I can't invent a discount in chat — I'll have a manager look at it if you come in. ${slotLine}`
      : `I won't quote a number that isn't on a unit. Tell me which vehicle and I'll pull the list price.`;
  }
  if (vehicle) {
    const avail = vehicle.status === "available" ? "is on the lot" : `is ${vehicle.status}`;
    return `The ${vehicle.color} ${vehicleLabel(vehicle)} ${avail} — ${vehicle.drivetrain}, ${vehicle.miles.toLocaleString()} miles, stock ${vehicle.stock}. ${slotLine}`;
  }
  return `Thanks for the note. ${slotLine || "Want me to pull two times this week?"}`;
}

function dummyThread(text: string, vehicle: Vehicle | null, facts: Fact[], voice: VoiceId, intent: Intent): Thread {
  const now = new Date().toISOString();
  return {
    id: "live",
    customerName: "Live inquiry",
    customerHandle: "paste-in",
    city: "Beatrice",
    channel: "messenger",
    source: "Paste-in",
    assignedRepId: "r_jordan",
    stage: intent === "schedule" ? "book" : intent === "financing" || intent === "hold" ? "qualify" : "engage",
    vehicleStock: vehicle?.stock ?? null,
    lastInboundAt: now,
    lastActivityAt: now,
    unread: true,
    dnc: intent === "opt_out",
    takeover: false,
    hint: "Live paste",
    goal: intent === "financing" ? "Hand to a person" : "Reply with verified facts",
    missing: [],
    facts,
    voice,
    voiceLocked: false,
    voiceReason: "live inquiry",
    demoScript: [],
    demoCursor: 0,
    messages: [
      {
        id: "lm1",
        threadId: "live",
        who: "customer",
        sender: "Customer",
        at: now,
        channel: "messenger",
        text,
      },
    ],
    draft: { text: "", voice, claims: [], slots: [], producer: "rules" },
    intel: {
      score: 70,
      sentiment: "neutral",
      propensityToShow: 0.5,
      trend: "flat",
      talkRatio: 0.5,
      questionsAsked: 1,
      nextStepSet: false,
      trackers: [intent],
      moments: [],
      coaching: "Live inquiry — not stored.",
    },
    appointmentId: null,
  } as unknown as Thread;
}

export function analyzeInquiry(text: string, vehicles: Vehicle[], voice: VoiceId | ""): AnalyzeResult {
  const cls = classify(text);
  const facts = extractFacts(text);
  const vehicle = resolveVehicle(text, vehicles);
  const detected = detectCustomerVoice(text);
  const usedVoice: VoiceId =
    voice || (detected.confidence >= AUTO_VOICE_THRESHOLD ? detected.voice : "auto");
  const thread = dummyThread(text, vehicle, facts, usedVoice === "auto" ? "celeste" : usedVoice, cls.intent);
  let draftText = composeGroundedDraft(cls.intent, vehicle, facts, thread.voice);
  if (cls.intent === "financing" || cls.intent === "hold" || cls.intent === "warranty" || cls.intent === "opt_out") {
    draftText = "";
  }
  const claims = validateClaims(draftText || " ", thread, vehicle);
  const draft: Draft = {
    text: draftText,
    voice: thread.voice,
    claims: draftText ? claims : [{ text: "handoff", severity: "warn", reason: "No AI draft — a person owns this." }],
    slots: draftText ? generateDraft(thread, vehicles, thread.voice).slots : [],
    producer: "rules",
  };
  const recommendedAction =
    cls.intent === "financing"
      ? "route_financing_to_human"
      : cls.intent === "hold"
        ? "route_hold_to_human"
        : cls.intent === "opt_out"
          ? "escalate_opt_out"
          : cls.intent === "schedule"
            ? "invite_test_drive"
            : "answer_availability";
  const explain = explainThread({ ...thread, draft, goal: recommendedAction }, vehicle);
  return {
    stored: false,
    customerName: "Live inquiry",
    intent: cls.intent,
    sentiment: cls.sentiment,
    objection: cls.objection,
    confidence: cls.confidence,
    leadState: thread.stage,
    recommendedAction,
    nbaReason: recommendedAction.replaceAll("_", " "),
    voice: thread.voice,
    facts,
    vehicle,
    draft,
    explain,
    booking: draft.slots.length ? { slots: draft.slots } : null,
  };
}

export function explainThread(thread: Thread, vehicle: Vehicle | null): ExplainStep[] {
  const last = [...thread.messages].reverse().find((m) => m.who === "customer");
  return [
    { step: "Read", label: "Inbound", detail: last?.text ?? "No customer message yet." },
    {
      step: "Remember",
      label: "Facts on file",
      detail: thread.facts.length ? thread.facts.map((f) => `${f.key}: ${f.value} (${f.certainty})`).join(" · ") : "Nothing confirmed yet.",
    },
    {
      step: "Verify",
      label: vehicle ? vehicleLabel(vehicle) : "No unit resolved",
      detail: vehicle
        ? `${vehicle.status} · $${vehicle.price.toLocaleString()} · feed ${isFresh(vehicle) ? "fresh" : "stale"}`
        : "Will not invent a vehicle.",
    },
    { step: "Stage", label: thread.stage, detail: thread.goal },
    { step: "Decide", label: thread.goal, detail: thread.intel.coaching },
    {
      step: "Check",
      label: "Firewall + type form",
      detail: thread.draft.claims.map((c) => c.reason).join(" · ") || "No claims extracted.",
      claims: thread.draft.claims.map((c) => ({
        text: c.text,
        verdict: c.severity === "ok" ? "supported" : c.severity === "block" ? "prohibited" : "unsupported",
        note: c.reason,
      })),
    },
    { step: "Gate", label: "Human Send", detail: "Nothing leaves this device unless a person taps Send." },
  ];
}

export function vehicleEvidence(vehicle: Vehicle, threads: Thread[]) {
  const fresh = isFresh(vehicle);
  const age = durationHuman(inventoryAgeMs(vehicle));
  return {
    source: vehicleSource(vehicle),
    retrievedAt: vehicleRetrievedAt(vehicle),
    age,
    fresh,
    freshnessRule: fresh
      ? "Feed is inside the 30-minute window. Availability and list price may be asserted."
      : "Feed is stale. Availability and price claims are blocked until refresh.",
    mayAssert: {
      availability: fresh && vehicle.status === "available",
      price: fresh,
      mileage: true,
      drivetrain: true,
    },
    usedIn: threads
      .filter((t) => t.vehicleStock === vehicle.stock)
      .map((t) => ({
        threadId: t.id,
        customer: t.customerName,
        stage: t.stage,
        risk: t.draft.claims.some((c) => c.severity === "block") ? "blocked draft" : "clean",
      })),
  };
}

export { resolveVehicle as matchVehicle };
export type { AnalyzeResult };
