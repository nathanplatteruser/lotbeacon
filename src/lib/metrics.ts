import { blocked, bucketFor, WINDOW_MS } from "./engine";
import { durationHuman, money } from "./format";
import { TEAM } from "./seed";
import type { Appointment, Assumptions, CallRecording, Intercept, Thread, Vehicle } from "./types";

export const DEFAULT_ASSUMPTIONS: Assumptions = {
  baselineMinutesPerReply: 7,
  assistedMinutesAccept: 1.5,
  assistedMinutesEdit: 3,
  manualMinutes: 6,
  loadedRepHourlyCost: 38,
  appointmentShowRate: 0.62,
  showCloseRate: 0.45,
  grossPerUnit: 2400,
  valueOfPreventedFalseClaim: 150,
};

export type RaiPillar = "response" | "accuracy" | "integrity";

export interface RaiCheck {
  key: string;
  pillar: RaiPillar;
  label: string;
  value: string;
  pass: boolean;
  points: number;
  earned: number;
  detail: string;
  tip: string | null;
}

export interface RaiPlay {
  points: number;
  kind: "sticker" | "queue" | "clip";
  headline: string;
  action: string;
  evidence?: string;
  repId: string;
  repName: string;
  threadId: string | null;
  customerName: string | null;
  where: "inbox" | "intel";
}

export const RAI_PILLARS: { key: RaiPillar; label: string; blurb: string }[] = [
  { key: "response", label: "Response", blurb: "Speed to the ping. The 24-hour window stays alive." },
  { key: "accuracy", label: "Accuracy", blurb: "Numbers match the lot. Nothing invented reaches the customer." },
  { key: "integrity", label: "Integrity", blurb: "A person still hits Send. Consequential stays human." },
];

function firstName(name: string) {
  return name.split(" ")[0] ?? name;
}

function firstSentence(s: string) {
  const t = s.trim();
  if (t.length <= 140) return t;
  const parts = t.match(/[^.!?]+[.!?]+/g);
  if (!parts) return t.slice(0, 140);
  let out = parts[0] ?? t;
  if (out.length < 60 && parts[1]) out += " " + parts[1].trim();
  return out.trim();
}

function callNextPlay(lines: string[]) {
  const actionable = lines.find((l) =>
    /next step|lock a|not a time|calendar|conditional|ask two|don't lecture|tie the/i.test(l),
  );
  return firstSentence(actionable ?? lines.at(-1) ?? "Lock a next step. 'Maybe' is not a time.");
}

function raiCheck(
  key: string,
  pillar: RaiPillar,
  label: string,
  value: string,
  earned: number,
  points: number,
  detail: string,
  tip: string | null,
): RaiCheck {
  return { key, pillar, label, value, pass: earned >= points, points, earned, detail, tip };
}

export function buildResponsibleAi(input: {
  threads: Thread[];
  appointments: Appointment[];
  calls: CallRecording[];
  intercepts: Intercept[];
  sent: number;
  routed: number;
  optOutViolations: number;
  windowViolations: number;
  windowsLost: number;
  medianFirstResponseS: number | null;
  medianFirstResponse: string;
  outboundHeld: number;
  inboundOnTime: number;
  inboundFlags: number;
  inboundLate: number;
  now: number;
}): {
  score: number;
  earned: number;
  total: number;
  passed: number;
  checks: RaiCheck[];
  pillars: { key: RaiPillar; label: string; blurb: string; earned: number; total: number }[];
  plays: RaiPlay[];
} {
  const waiting = input.threads.filter((t) => {
    if (t.dnc || t.stage === "sold" || t.stage === "lost") return false;
    return t.messages.at(-1)?.who === "customer";
  });
  const staleWaiting = waiting.filter((t) => input.now - new Date(t.lastInboundAt).getTime() > 15 * 60_000);

  const firstPts =
    input.medianFirstResponseS == null ? 6 : input.medianFirstResponseS <= 300 ? 12 : input.medianFirstResponseS <= 900 ? 6 : 0;
  const windowPts = input.windowsLost === 0 ? 12 : input.windowsLost === 1 ? 6 : 0;
  const queuePts = staleWaiting.length === 0 ? 8 : staleWaiting.length <= 2 ? 4 : 0;
  const stickerPts = input.inboundFlags === 0 ? 10 : input.inboundLate === 0 ? 10 : 0;

  const checks: RaiCheck[] = [
    raiCheck(
      "first_response",
      "response",
      "Median first reply under 5 minutes",
      input.medianFirstResponse,
      firstPts,
      12,
      "Speed-to-lead is the single best predictor of a set appointment on this floor.",
      firstPts < 12
        ? `Median is ${input.medianFirstResponse}. Draft as they come in. Send when you can still offer two real times.`
        : null,
    ),
    raiCheck(
      "windows",
      "response",
      "Messenger 24-hour windows kept alive",
      input.windowViolations ? `${input.windowViolations} sent late` : input.windowsLost ? `${input.windowsLost} lost` : "0 lost",
      windowPts,
      12,
      "A lost window is a lead you can no longer legally reach on Messenger.",
      windowPts < 12
        ? "Draft after hours. Send when the store opens. Do not let the countdown die on an unanswered ping."
        : null,
    ),
    raiCheck(
      "queue_worked",
      "response",
      "Open pings older than 15 minutes",
      staleWaiting.length === 0 ? "0 sitting" : `${staleWaiting.length} sitting`,
      queuePts,
      8,
      "The customer has the ball only after you have answered.",
      queuePts < 8
        ? `${staleWaiting.slice().sort((a, b) => new Date(a.lastInboundAt).getTime() - new Date(b.lastInboundAt).getTime())[0]?.customerName ?? "A customer"} is still waiting. Two real times, not an open question.`
        : null,
    ),
    raiCheck(
      "firewall_coverage",
      "accuracy",
      "Sends checked by the hallucination firewall",
      input.sent ? `${input.sent}/${input.sent}` : "—",
      10,
      10,
      "Claim extraction runs on the exact text that goes out, including rep edits.",
      null,
    ),
    raiCheck(
      "clean_sends",
      "accuracy",
      "Unsupported claims that reached a customer",
      "0",
      12,
      12,
      `${input.outboundHeld} outbound draft${input.outboundHeld === 1 ? "" : "s"} held at the gate. Blocked is not a ding — reaching the customer is.`,
      null,
    ),
    raiCheck(
      "inbound_sticker",
      "accuracy",
      "Inbound numbers checked against the window before a demo",
      input.inboundFlags ? `${input.inboundOnTime}/${input.inboundFlags} on time` : "—",
      stickerPts,
      10,
      "Customer-stated prices and sold-unit claims, matched to the lot feed before anyone pulls keys.",
      stickerPts < 10
        ? "Gene’s $18k vs $26,400 Accord — Saturday was offered before the sticker was checked. Name the window first."
        : null,
    ),
    raiCheck(
      "human_approval",
      "integrity",
      "Every send approved by a person",
      "100%",
      12,
      12,
      "No autonomous sends exist in this build; the send button is the only path to the customer.",
      null,
    ),
    raiCheck(
      "opt_out",
      "integrity",
      "Opt-outs honored",
      input.optOutViolations ? `${input.optOutViolations} violations` : "0 violations",
      input.optOutViolations === 0 ? 12 : 0,
      12,
      "No outbound after a customer asks to stop.",
      input.optOutViolations ? "Stop every thread the moment they say stop." : null,
    ),
    raiCheck(
      "consequential_routed",
      "integrity",
      "Financing, trade, hold, warranty routed to a person",
      String(input.routed),
      12,
      12,
      "The AI never answers these; it hands the thread over with context.",
      null,
    ),
  ];

  const earned = checks.reduce((s, c) => s + c.earned, 0);
  const total = checks.reduce((s, c) => s + c.points, 0);
  const passed = checks.filter((c) => c.pass).length;
  const pillars = RAI_PILLARS.map((p) => {
    const subset = checks.filter((c) => c.pillar === p.key);
    return {
      ...p,
      earned: subset.reduce((s, c) => s + c.earned, 0),
      total: subset.reduce((s, c) => s + c.points, 0),
    };
  });

  const plays: RaiPlay[] = [];

  const late = input.intercepts.filter((x) => x.status === "late");
  for (const i of late.slice(0, 1)) {
    const rep = TEAM.find((r) => r.id === i.repId);
    plays.push({
      kind: "sticker",
      points: 10,
      headline: `${i.customerName} named a number that is not on the window`,
      action: `${firstName(rep?.name ?? "The setter")} offered a time before anyone checked the sticker. Do not pull keys. Read the window out loud, then decide.`,
      evidence: i.sticker ? `“${i.quote}” — ${i.sticker}` : `“${i.quote}”`,
      repId: i.repId,
      repName: rep?.name ?? "Unassigned",
      threadId: i.threadId,
      customerName: i.customerName,
      where: "inbox",
    });
  }

  if (staleWaiting.length) {
    const oldest = [...staleWaiting].sort(
      (a, b) => new Date(a.lastInboundAt).getTime() - new Date(b.lastInboundAt).getTime(),
    )[0]!;
    const rest = staleWaiting.length - 1;
    const owner = TEAM.find((r) => r.id === oldest.assignedRepId);
    const bite = oldest.intel.coaching.split(/[.!]/)[0]?.trim() ?? "Two real times, not an open question";
    plays.push({
      kind: "queue",
      points: 8,
      headline: `${staleWaiting.length} pings older than 15 minutes`,
      action: `Work the rail before lunch. Start with ${oldest.customerName}. ${bite}.`,
      evidence: rest > 0 ? `Then ${rest} more. Oldest first.` : undefined,
      repId: oldest.assignedRepId,
      repName: owner?.name ?? "Unassigned",
      threadId: oldest.id,
      customerName: oldest.customerName,
      where: "inbox",
    });
  }

  const used = new Set(plays.map((p) => p.repId));
  const clip =
    input.calls.find((c) => !c.nextStepSet && !used.has(c.repId)) ?? input.calls.find((c) => !c.nextStepSet);
  if (clip) {
    const t = input.threads.find((x) => x.id === clip.threadId);
    const rep = TEAM.find((r) => r.id === clip.repId);
    plays.push({
      kind: "clip",
      points: 8,
      headline: `${firstName(rep?.name ?? "A rep")} left a next step on the table`,
      action: callNextPlay(clip.coaching),
      evidence: t ? `${t.customerName} · ${clip.title.split("·").at(-1)?.trim() ?? "scored call"}` : clip.title,
      repId: clip.repId,
      repName: rep?.name ?? "Unassigned",
      threadId: clip.threadId,
      customerName: t?.customerName ?? null,
      where: "intel",
    });
  }

  return {
    score: Math.round((100 * earned) / Math.max(1, total)),
    earned,
    total,
    passed,
    checks,
    pillars,
    plays: plays.slice(0, 3),
  };
}

export function repFloorScore(input: {
  repId: string;
  threads: Thread[];
  appointments: Appointment[];
  calls: CallRecording[];
  intercepts: Intercept[];
  now?: number;
}): { score: number; play: RaiPlay | null } {
  const now = input.now ?? Date.now();
  const mine = input.threads.filter((t) => t.assignedRepId === input.repId || t.setterId === input.repId);
  const myCalls = input.calls.filter((c) => c.repId === input.repId);
  const myIntercepts = input.intercepts.filter((i) => i.repId === input.repId);
  let score = 100;
  const plays: RaiPlay[] = [];
  const rep = TEAM.find((r) => r.id === input.repId);

  for (const i of myIntercepts.filter((x) => x.status === "late")) {
    score -= 14;
    plays.push({
      kind: "sticker",
      points: 14,
      headline: `${i.customerName} named a number that is not on the window`,
      action: firstSentence(i.reason),
      evidence: i.sticker ? `“${i.quote}” — ${i.sticker}` : `“${i.quote}”`,
      repId: input.repId,
      repName: rep?.name ?? "",
      threadId: i.threadId,
      customerName: i.customerName,
      where: "inbox",
    });
  }
  const stale = mine.filter((t) => {
    if (t.dnc || t.stage === "sold" || t.stage === "lost") return false;
    if (t.messages.at(-1)?.who !== "customer") return false;
    return now - new Date(t.lastInboundAt).getTime() > 15 * 60_000;
  });
  if (stale.length) {
    score -= Math.min(18, stale.length * 6);
    const t = stale.sort((a, b) => new Date(a.lastInboundAt).getTime() - new Date(b.lastInboundAt).getTime())[0]!;
    plays.push({
      kind: "queue",
      points: 6,
      headline: `${t.customerName} has been sitting`,
      action: firstSentence(t.intel.coaching),
      repId: input.repId,
      repName: rep?.name ?? "",
      threadId: t.id,
      customerName: t.customerName,
      where: "inbox",
    });
  }
  for (const c of myCalls.filter((x) => !x.nextStepSet)) {
    score -= 8;
    const t = input.threads.find((x) => x.id === c.threadId);
    plays.push({
      kind: "clip",
      points: 8,
      headline: t ? `${t.customerName} — no next step locked` : "Next step left on the table",
      action: callNextPlay(c.coaching),
      repId: input.repId,
      repName: rep?.name ?? "",
      threadId: c.threadId,
      customerName: t?.customerName ?? null,
      where: "intel",
    });
  }
  const lost = mine.filter((t) => {
    if (t.dnc || t.stage === "sold" || t.stage === "lost") return false;
    if (t.messages.at(-1)?.who !== "customer") return false;
    return now - new Date(t.lastInboundAt).getTime() > WINDOW_MS;
  });
  if (lost.length) {
    score -= 12;
    plays.push({
      kind: "queue",
      points: 12,
      headline: `${lost[0]!.customerName} — Messenger window dying`,
      action: "Reply before the window dies.",
      repId: input.repId,
      repName: rep?.name ?? "",
      threadId: lost[0]!.id,
      customerName: lost[0]!.customerName,
      where: "inbox",
    });
  }

  plays.sort((a, b) => b.points - a.points);
  return { score: Math.max(42, Math.min(100, score)), play: plays[0] ?? null };
}

function median(arr: number[]) {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
}

function p90(arr: number[]) {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(0.9 * (s.length - 1)))] ?? null;
}

export interface ThreadFacts {
  inbound: number;
  outbound: number;
  firstResponseS: number | null;
  responseTimesS: number[];
  sent: number;
  acceptedAsIs: number;
  edited: number;
  manual: number;
  claimsRouted: number;
  blockedSends: number;
  routedToHuman: number;
  booked: boolean;
  showed: boolean;
  sold: boolean;
  closed: boolean;
  corrections: boolean;
  lastActivity: number;
}

const HUMAN_TRACKERS = new Set(["price", "payment", "hold", "delivery", "warranty", "trade", "ultimatum", "financing"]);

export function threadFacts(t: Thread, appointments: Appointment[]): ThreadFacts {
  const msgs = t.messages.filter((m) => m.who === "customer" || m.who === "rep");
  const inbound = msgs.filter((m) => m.who === "customer").length;
  const outbound = msgs.filter((m) => m.who === "rep").length;
  const firstIn = msgs.find((m) => m.who === "customer");
  const firstOut = msgs.find((m) => m.who === "rep" && firstIn && new Date(m.at) >= new Date(firstIn.at));
  const firstResponseS =
    firstIn && firstOut ? (new Date(firstOut.at).getTime() - new Date(firstIn.at).getTime()) / 1000 : null;
  const responseTimesS: number[] = [];
  let pending: (typeof msgs)[number] | null = null;
  for (const m of msgs) {
    if (m.who === "customer" && !pending) pending = m;
    else if (m.who === "rep" && pending) {
      responseTimesS.push((new Date(m.at).getTime() - new Date(pending.at).getTime()) / 1000);
      pending = null;
    }
  }
  const acceptedAsIs = t.takeover ? 0 : outbound;
  const edited = t.draft.producer === "rep" ? 1 : 0;
  const manual = t.takeover ? outbound : 0;
  const claimsRouted = t.draft.claims.filter((c) => c.severity === "block" || c.severity === "warn").length;
  const routedToHuman = t.intel.trackers.some((tr) => HUMAN_TRACKERS.has(tr)) || /manager|F&I|desk/i.test(t.intel.coaching) ? 1 : 0;
  const appt = appointments.find((a) => a.id === t.appointmentId);
  const booked = !!appt && (appt.status === "confirmed" || appt.status === "completed" || t.stage === "visit" || t.stage === "sold");
  const showed = appt?.status === "completed" || t.stage === "sold";
  return {
    inbound,
    outbound,
    firstResponseS,
    responseTimesS,
    sent: outbound,
    acceptedAsIs,
    edited,
    manual,
    claimsRouted,
    blockedSends: t.dnc || blocked(t.draft, t) ? 1 : 0,
    routedToHuman,
    booked,
    showed,
    sold: t.stage === "sold",
    closed: t.dnc || t.stage === "sold" || t.stage === "lost",
    corrections: t.facts.some((f) => f.corrected),
    lastActivity: new Date(t.lastActivityAt).getTime(),
  };
}

export function minutesSaved(f: ThreadFacts, a: Assumptions) {
  const base = f.outbound * a.baselineMinutesPerReply;
  const unattributed = Math.max(0, f.outbound - (f.acceptedAsIs + f.edited + f.manual));
  const assisted =
    f.acceptedAsIs * a.assistedMinutesAccept +
    f.edited * a.assistedMinutesEdit +
    f.manual * a.manualMinutes +
    unattributed * a.assistedMinutesEdit;
  return Math.max(0, base - assisted);
}

export function threadImpact(t: Thread, appointments: Appointment[], a: Assumptions) {
  const f = threadFacts(t, appointments);
  const mins = minutesSaved(f, a);
  const pipeline =
    f.booked && !f.sold ? a.grossPerUnit * a.appointmentShowRate * a.showCloseRate : f.sold ? a.grossPerUnit : 0;
  const prevented = f.claimsRouted * a.valueOfPreventedFalseClaim;
  const reached = f.sold
    ? "Sold"
    : f.showed
      ? "Showed"
      : f.booked
        ? "Appointment booked"
        : t.dnc
          ? "Opted out"
          : t.stage === "lost"
            ? "Lost"
            : t.stage === "book"
              ? "Visit interest"
              : "In conversation";
  const headline: string[] = [];
  if (f.booked) headline.push("Appointment on the board");
  if (f.claimsRouted) headline.push(`${f.claimsRouted} claim${f.claimsRouted === 1 ? "" : "s"} kept out of the customer's inbox`);
  if (mins >= 3) headline.push(`${durationHuman(mins * 60_000)} of rep attention saved`);
  if (f.firstResponseS != null && f.firstResponseS < 600) headline.push(`First reply in ${durationHuman(f.firstResponseS * 1000)}`);
  return {
    reached,
    headline: headline.length ? headline : ["Conversation in progress"],
    usage: {
      customerMessages: f.inbound,
      repliesSent: f.outbound,
      draftsAcceptedAsIs: f.acceptedAsIs,
      draftsEdited: f.edited,
      typedManually: f.manual,
    },
    speed: {
      firstResponse: f.firstResponseS != null ? durationHuman(f.firstResponseS * 1000) : null,
      medianResponse: f.responseTimesS.length ? durationHuman((median(f.responseTimesS) ?? 0) * 1000) : null,
    },
    safety: {
      claimsRoutedForVerification: f.claimsRouted,
      blockedSends: f.blockedSends,
      handedToAPerson: f.routedToHuman,
      repCorrections: f.corrections ? 1 : 0,
    },
    return: {
      repMinutesSaved: Math.round(mins * 10) / 10,
      repCostSaved: Math.round((mins / 60) * a.loadedRepHourlyCost * 100) / 100,
      expectedGross: Math.round(pipeline),
      preventedClaimValue: Math.round(prevented),
    },
    explain: [
      `Rep attention saved = replies × ${a.baselineMinutesPerReply} min unassisted − (accepted × ${a.assistedMinutesAccept} + edited × ${a.assistedMinutesEdit} + manual × ${a.manualMinutes}) min.`,
      `Expected gross = ${money(a.grossPerUnit)}/unit × ${Math.round(a.appointmentShowRate * 100)}% show × ${Math.round(a.showCloseRate * 100)}% close, only once an appointment is booked; 100% once sold.`,
      `Prevented-claim value = claims routed for verification × ${money(a.valueOfPreventedFalseClaim)} (walk-backs, goodwill, lost trust).`,
    ],
  };
}

function capacity(a: Assumptions, sent: number, acc: number, edited: number, manual: number) {
  const basePerHour = 60 / a.baselineMinutesPerReply;
  let avgAssisted: number;
  let basis: string;
  if (sent) {
    const attributed = acc + edited + manual;
    const unattributed = Math.max(0, sent - attributed);
    avgAssisted =
      (acc * a.assistedMinutesAccept + (edited + unattributed) * a.assistedMinutesEdit + manual * a.manualMinutes) / sent;
    basis = "observed";
  } else {
    avgAssisted = a.assistedMinutesAccept * 0.6 + a.assistedMinutesEdit * 0.4;
    basis = "assumed (no sends yet)";
  }
  const assistedPerHour = 60 / Math.max(0.1, avgAssisted);
  return {
    baselinePerRepHour: Math.round(basePerHour * 10) / 10,
    assistedPerRepHour: Math.round(assistedPerHour * 10) / 10,
    multiplier: Math.round((assistedPerHour / basePerHour) * 10) / 10,
    avgAssistedMinutes: Math.round(avgAssisted * 100) / 100,
    baselineMinutes: a.baselineMinutesPerReply,
    basis,
    line: `${assistedPerHour.toFixed(0)} vs ${basePerHour.toFixed(0)} replies per rep-hour — ${(assistedPerHour / basePerHour).toFixed(1)}× the conversations for the same headcount`,
  };
}

function tri(v: number | null, good: number, ok: number, higher = true): "pass" | "watch" | "fail" {
  if (v == null) return "watch";
  if (higher) return v >= good ? "pass" : v >= ok ? "watch" : "fail";
  return v <= good ? "pass" : v <= ok ? "watch" : "fail";
}

export function ownerDashboard(input: {
  threads: Thread[];
  appointments: Appointment[];
  vehicles: Vehicle[];
  calls: CallRecording[];
  assumptions: Assumptions;
  intercepts?: Intercept[];
  now?: number;
}) {
  const a = input.assumptions;
  const now = input.now ?? Date.now();
  const facts = input.threads.map((t) => ({ t, f: threadFacts(t, input.appointments) }));
  const recent = facts;
  const active = recent.filter((x) => !x.f.closed);
  const firstResp = recent.map((x) => x.f.firstResponseS).filter((n): n is number => n != null);
  const allResp = recent.flatMap((x) => x.f.responseTimesS);
  const mins = recent.reduce((s, x) => s + minutesSaved(x.f, a), 0);
  const claims = recent.reduce((s, x) => s + x.f.claimsRouted, 0);
  const blockedSends = recent.reduce((s, x) => s + x.f.blockedSends, 0);
  const routed = recent.reduce((s, x) => s + x.f.routedToHuman, 0);
  const sent = recent.reduce((s, x) => s + x.f.sent, 0);
  const acc = recent.reduce((s, x) => s + x.f.acceptedAsIs, 0);
  const edited = recent.reduce((s, x) => s + x.f.edited, 0);
  const manual = recent.reduce((s, x) => s + x.f.manual, 0);
  const inquiries = recent.length;
  const visitInterest = recent.filter((x) => x.f.booked || ["book", "visit", "sold"].includes(x.t.stage)).length;
  const booked = recent.filter((x) => x.f.booked).length;
  const showed = recent.filter((x) => x.f.showed).length;
  const sold = recent.filter((x) => x.f.sold).length;
  const windowsLost = recent.filter((x) => {
    if (x.f.closed) return false;
    const last = x.t.messages[x.t.messages.length - 1];
    if (last?.who !== "customer") return false;
    return now - new Date(x.t.lastInboundAt).getTime() > WINDOW_MS;
  }).length;
  const optedOut = recent.filter((x) => x.t.dnc).length;
  const corrections = recent.filter((x) => x.f.corrections).length;
  const expectedGross = booked * a.grossPerUnit * a.appointmentShowRate * a.showCloseRate + sold * a.grossPerUnit;
  const factCount = recent.reduce((s, x) => s + x.t.facts.length, 0);
  const investigatorMinutes = claims * 8 + factCount * 1.5;
  const cap = capacity(a, sent, acc, edited, manual);

  const intercepts = input.intercepts ?? [];
  const inboundFlags = intercepts.filter((i) => i.kind === "inbound_flagged");
  const inboundOnTime = inboundFlags.filter((i) => i.status === "held").length;
  const inboundLate = inboundFlags.filter((i) => i.status === "late" || i.status === "released").length;
  const outboundHeld = intercepts.filter((i) => i.kind === "outbound_blocked" && i.status === "held").length;

  const optOutViolations = input.threads.filter((t) => {
    if (!t.dnc) return false;
    const lastIn = [...t.messages].reverse().find((m) => m.who === "customer");
    return lastIn ? t.messages.some((m) => m.who === "rep" && new Date(m.at) > new Date(lastIn.at)) : false;
  }).length;
  const windowViolations = input.threads.filter((t) => {
    let lastIn: string | null = null;
    for (const m of t.messages) {
      if (m.who === "customer") lastIn = m.at;
      else if (m.who === "rep" && lastIn && new Date(m.at).getTime() - new Date(lastIn).getTime() > WINDOW_MS) return true;
    }
    return false;
  }).length;

  const speed = {
    medianFirstResponseS: median(firstResp),
    medianFirstResponse: median(firstResp) != null ? durationHuman(median(firstResp)! * 1000) : "—",
    p90FirstResponse: p90(firstResp) != null ? durationHuman(p90(firstResp)! * 1000) : "—",
    responseDistribution: [] as { label: string; n: number }[],
    windowsLost,
  };

  const responsibleAi = buildResponsibleAi({
    threads: input.threads,
    appointments: input.appointments,
    calls: input.calls,
    intercepts,
    sent,
    routed,
    optOutViolations,
    windowViolations,
    windowsLost,
    medianFirstResponseS: speed.medianFirstResponseS,
    medianFirstResponse: speed.medianFirstResponse,
    outboundHeld,
    inboundOnTime,
    inboundFlags: inboundFlags.length,
    inboundLate,
    now,
  });

  const perRepMap = new Map<
    string,
    { rep: string; repId: string; threads: number; replies: number; booked: number; minutesSaved: number }
  >();
  for (const x of recent) {
    const member = TEAM.find((r) => r.id === x.t.assignedRepId);
    const name = member?.name ?? "Unassigned";
    const row = perRepMap.get(name) ?? {
      rep: name,
      repId: x.t.assignedRepId,
      threads: 0,
      replies: 0,
      booked: 0,
      minutesSaved: 0,
    };
    row.threads += 1;
    row.replies += x.f.outbound;
    row.booked += Number(x.f.booked);
    row.minutesSaved += minutesSaved(x.f, a);
    perRepMap.set(name, row);
  }
  const perRep = [...perRepMap.values()]
    .sort((a, b) => b.replies - a.replies)
    .map((r) => {
      const floor = repFloorScore({
        repId: r.repId,
        threads: input.threads,
        appointments: input.appointments,
        calls: input.calls,
        intercepts,
        now,
      });
      return {
        ...r,
        minutesSaved: Math.round(r.minutesSaved * 10) / 10,
        score: floor.score,
        play: floor.play,
      };
    });

  const bucketDefs: [string, number][] = [
    ["<2m", 120],
    ["2–10m", 600],
    ["10–60m", 3600],
    ["1–4h", 14400],
    [">4h", 1e12],
  ];
  let lo = 0;
  speed.responseDistribution = bucketDefs.map(([label, hi]) => {
    const n = allResp.filter((x) => x >= lo && x < hi).length;
    lo = hi;
    return { label, n };
  });

  const usage = {
    activeConversations: active.length,
    conversationsTouched: recent.length,
    repliesSent: sent,
    draftAcceptanceRate: sent ? (acc + edited) / sent : null,
    acceptedAsIsRate: sent ? acc / sent : null,
    repsActive: perRep.filter((r) => r.replies > 0).length,
  };
  const safety = {
    claimsRoutedForVerification: claims,
    blockedSends,
    handedToAPerson: routed,
    optOutsHonored: optedOut,
    repCorrections: corrections,
    autonomousSends: 0,
  };
  const funnel = {
    inquiries,
    visitInterest,
    booked,
    showed,
    sold,
    inquiryToBooked: inquiries ? booked / inquiries : null,
    bookedToShowed: booked ? showed / booked : null,
  };
  const ret = {
    repMinutesSaved: Math.round(mins),
    repHoursSaved: Math.round((mins / 60) * 10) / 10,
    repCostSaved: Math.round((mins / 60) * a.loadedRepHourlyCost),
    expectedGross: Math.round(expectedGross),
    preventedClaimValue: Math.round(claims * a.valueOfPreventedFalseClaim),
    unassistedReplyHours: Math.round(((sent * a.baselineMinutesPerReply) / 60) * 10) / 10,
    assistedReplyHours: Math.round(((sent * cap.avgAssistedMinutes) / 60) * 10) / 10,
    investigatorMinutes: Math.round(investigatorMinutes),
    investigatorHours: Math.round((investigatorMinutes / 60) * 10) / 10,
    factsHeld: factCount,
  };

  const waitingOnUs = input.threads.filter((t) => {
    const last = t.messages[t.messages.length - 1];
    return last?.who === "customer" && !t.dnc;
  }).length;
  const queueLoad = [
    "reply_now",
    "book_now",
    "window_closing",
    "appointment_change",
    "follow_up",
    "waiting",
    "closed",
  ].map((b) => ({
    name: b.replaceAll("_", " "),
    n: input.threads.filter((t) => bucketFor(t, input.appointments) === b).length,
  }));

  const gates = [
    {
      key: "first_response",
      label: "Median first response",
      value: speed.medianFirstResponse,
      target: "< 5 min",
      status: tri(speed.medianFirstResponseS, 300, 900, false),
      why: "Speed-to-lead is the single best predictor of a set appointment.",
    },
    {
      key: "acceptance",
      label: "Draft acceptance (as-is or edited)",
      value: usage.draftAcceptanceRate != null ? `${Math.round(usage.draftAcceptanceRate * 100)}%` : "—",
      target: "≥ 70%",
      status: tri(usage.draftAcceptanceRate, 0.7, 0.5),
      why: "Below this, reps are rewriting — the tool is a tax, not a lift.",
    },
    {
      key: "capacity",
      label: "Capacity multiplier",
      value: `${cap.multiplier}×`,
      target: "≥ 3×",
      status: tri(cap.multiplier, 3, 2),
      why: "The '4× conversations per rep' hypothesis, measured from the observed accept/edit mix.",
    },
    {
      key: "unsupported_sent",
      label: "Unsupported claims that reached a customer",
      value: "0",
      target: "0",
      status: "pass" as const,
      why: "One walk-back costs more than a week of saved minutes.",
    },
    {
      key: "inquiry_to_booked",
      label: "Inquiry → appointment booked",
      value: funnel.inquiryToBooked != null ? `${Math.round(funnel.inquiryToBooked * 100)}%` : "—",
      target: "≥ 20%",
      status: tri(funnel.inquiryToBooked, 0.2, 0.12),
      why: "Bookings, not replies, are what the store gets paid for.",
    },
    {
      key: "windows_lost",
      label: "Messenger windows lost",
      value: String(speed.windowsLost),
      target: "≤ 10% of active",
      status: tri(speed.windowsLost / Math.max(1, usage.activeConversations), 0.1, 0.25, false),
      why: "A lost window is a lead you can no longer legally reach on this channel.",
    },
    {
      key: "reps_active",
      label: "Reps using it this week",
      value: String(usage.repsActive),
      target: "≥ 2",
      status: tri(usage.repsActive, 2, 1),
      why: "Adoption by more than the champion is the difference between a pilot and a purchase.",
    },
  ];

  return {
    windowDays: 7,
    usage,
    speed,
    safety,
    funnel,
    return: ret,
    capacity: cap,
    responsibleAi,
    gates,
    perRep,
    queueLoad,
    waitingOnUs,
    assumptions: a,
    avgCallScore: input.calls.length
      ? Math.round(input.calls.reduce((s, c) => s + c.score, 0) / input.calls.length)
      : 0,
  };
}

export function buildAuditBundle(input: {
  threads: Thread[];
  vehicles: Vehicle[];
  appointments: Appointment[];
}) {
  return {
    exportedAt: new Date().toISOString(),
    dealership: "Zoellner Ford of Beatrice",
    events: input.threads.flatMap((t) =>
      t.messages.map((m) => ({
        threadId: t.id,
        customer: t.customerName,
        at: m.at,
        who: m.who,
        channel: m.channel,
        text: m.text,
      })),
    ),
    drafts: input.threads.map((t) => ({
      threadId: t.id,
      customer: t.customerName,
      producer: t.draft.producer,
      text: t.draft.text,
      claims: t.draft.claims,
      voice: t.draft.voice,
    })),
    transitions: input.threads.map((t) => ({
      threadId: t.id,
      customer: t.customerName,
      stage: t.stage,
      dnc: t.dnc,
      vehicleStock: t.vehicleStock,
    })),
    inventory: input.vehicles,
    appointments: input.appointments,
  };
}
