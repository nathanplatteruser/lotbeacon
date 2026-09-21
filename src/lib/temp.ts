import type { Thread, Vehicle } from "./types";

export type FearKind =
  | "upsell"
  | "fees"
  | "condition"
  | "honesty"
  | "ghost"
  | "price"
  | "process"
  | "pressure";

export type TempBand = "hot" | "cool" | "warm" | "green";

export interface TempCheck {
  band: TempBand;
  heat: number;
  fears: FearKind[];
  factQuestion: boolean;
  recover: boolean;
  commit: boolean;
  skipAsk: boolean;
  stayOnUnit: boolean;
  deescalate: boolean;
  holdVisit: boolean;
  lowerPriceTalk: boolean;
  why: string;
}

const FEARS: { kind: FearKind; re: RegExp }[] = [
  { kind: "upsell", re: /upsell|don'?t (put|stretch) me|i said under|under \$?\d+|bigger (one|trim)|bait.?and.?switch|switch me/i },
  { kind: "fees", re: /doc fee|hidden fee|out the door|\botd\b|extra fees|dealer fee|surprise (charge|fee)/i },
  { kind: "condition", re: /smoker|smoke smell|cigarette|accident|wreck|salvage|flood|hail|rebuilt|lemon|rental/i },
  { kind: "honesty", re: /is it (actually )?sold|photos? of (a )?different|lincoln has one|just say so|don'?t waste my time/i },
  { kind: "ghost", re: /hello\?|texted twice|nobody.?s reading|third message|if you.?re closed|if nobody/i },
  { kind: "price", re: /too expensive|come down|best (price|you can)|discount|off today/i },
  { kind: "process", re: /credit score|pre-qual|cash or finance|income|down payment/i },
  { kind: "pressure", re: /stop pushing|leave me alone|i'?ll think about it|not ready|maybe later|don'?t (call|text) me/i },
];

export const TENSION_RE =
  /don'?t upsell|upsell me|bait|hidden fee|doc fee|out the door|\botd\b|smoker|smoke smell|accident|salvage|flood|rebuilt|don'?t (put|stretch) me|i said under|under \$?\d{2}\s*k?\b|too expensive|stop pushing|not ready|lemon|hail|rental/;

function clamp(n: number) {
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function inboundFlags(text: string) {
  const t = text.toLowerCase();
  const fears = FEARS.filter((f) => f.re.test(text)).map((f) => f.kind);
  const recover = /overreacted|i was short|sorry i snapped|it was a mistake|still coming|sorry again|kids\./.test(t);
  const commit = /i'?ll be there|see you then|i'?ll come|book it|you'?re on the books|saturday\. i'?ll be there/.test(t);
  const ghost = /hello\?|texted twice|nobody.?s reading|third message|if you.?re closed/.test(t);
  const offense = /time-?waster|you insulted|people who don'?t matter|like i'?m some|how you talk|insulted my/.test(t);
  const dignity = /look stupid|embarrass me|make me look|in front of my (wife|husband|kids|family)/.test(t);
  const factQuestion =
    /\b(miles?|mileage|awd|4wd|four.?wheel|all.?wheel|on the lot|sold|title|park|who do i|photos?|third row|booster|car ?seat|latch|tow|snow)\b/i.test(
      text,
    );
  let heat = 0;
  if (fears.includes("upsell") || fears.includes("fees") || fears.includes("pressure")) heat += 42;
  if (fears.includes("condition")) heat += 36;
  if (fears.includes("honesty")) heat += 28;
  if (fears.includes("ghost") || ghost) heat += 24;
  if (offense) heat += 46;
  if (dignity) heat += 18;
  if (fears.includes("price") && /too expensive|come down|best (price|you can)/.test(t)) heat += 22;
  if (/\bdon'?t\b|just say so|if you'?re closed/.test(t)) heat += 12;
  if (text === text.toUpperCase() && text.replace(/\s/g, "").length > 12) heat += 20;
  if (recover) heat -= 30;
  if (commit) heat -= 24;
  if (factQuestion) heat -= 8;
  heat = clamp(heat);

  let band: TempBand = "warm";
  if (commit || recover) band = "green";
  else if (
    heat >= 40 ||
    offense ||
    fears.some((k) => k === "upsell" || k === "fees" || k === "condition" || k === "pressure")
  )
    band = "hot";
  else if (ghost || (text.trim().length < 14 && /hello|you there|\?\s*$/.test(t))) band = "cool";
  else if (factQuestion) band = "warm";

  return { fears, recover, commit, ghost, factQuestion, heat, band, dignity, offense };
}

export function tempCheck(thread: Thread, latest?: string, _vehicle?: Vehicle | null): TempCheck {
  const lastInbound =
    latest ??
    [...thread.messages].reverse().find((m) => m.who === "customer")?.text ??
    "";
  const flags = inboundFlags(lastInbound);
  const recent = thread.messages
    .filter((m) => m.who === "customer")
    .slice(-3)
    .map((m) => inboundFlags(m.text));
  const recentHot = recent.some((f) => f.band === "hot");
  let band = flags.band;
  if (flags.band !== "green" && recentHot && flags.band === "cool") band = "hot";
  const fears = Array.from(new Set(recent.flatMap((f) => f.fears)));
  const stayOnUnit = band === "hot" || (recentHot && (flags.factQuestion || fears.includes("upsell")));
  const deescalate = band === "hot" || (flags.fears.length > 0 && flags.heat >= 28);
  const skipAsk = band === "hot" || band === "cool" || flags.ghost || flags.recover || flags.commit || flags.dignity || (recentHot && !flags.commit);
  const holdVisit = band === "green" || (band === "warm" && !deescalate);
  const lowerPriceTalk = /too expensive|come down|best (price|you can)|discount|off today/.test(lastInbound.toLowerCase());
  const why =
    band === "hot"
      ? fears[0]
        ? `Heat: ${fears[0]}`
        : "Heat on the last inbound"
      : band === "cool"
        ? "Cool. Own the wait, one door."
        : band === "green"
          ? "Green. Confirm the visit."
          : flags.factQuestion
            ? "Warm. Answer, then the visit."
            : "Warm. Keep show-likelihood climbing.";
  return {
    band,
    heat: flags.heat,
    fears,
    factQuestion: flags.factQuestion,
    recover: flags.recover,
    commit: flags.commit,
    skipAsk,
    stayOnUnit,
    deescalate,
    holdVisit,
    lowerPriceTalk,
    why,
  };
}

export function tempWhyLine(temp: TempCheck, vehicle: Vehicle | null) {
  if (temp.band === "hot" && temp.fears.includes("upsell") && vehicle) {
    return `Stay on the ${vehicle.year} ${vehicle.model} ${vehicle.trim}. Do not name a bigger unit.`;
  }
  if (temp.band === "hot") return "De-escalate first. Vehicle record is the source of truth. Then the visit.";
  if (temp.band === "cool") return "They went quiet. One fact, one open door. No extra questions.";
  if (temp.band === "green") return "They're coming. Confirm the time. Have it pulled.";
  return "Answer what they asked. One move toward the appointment.";
}
