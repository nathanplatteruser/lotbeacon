import type { Thread } from "./types";
import { inboundFlags } from "./temp";

export type SignalKey = "purchase_intent" | "price_friction" | "engagement" | "visit_progression" | "objection_hints";

export interface SignalRow {
  key: SignalKey;
  label: string;
  series: number[];
  score: number;
  delta: number;
  trend: "up" | "flat" | "down";
  why: string;
}

const LABELS: Record<SignalKey, string> = {
  purchase_intent: "Purchase intent",
  price_friction: "Price friction",
  engagement: "Engagement",
  visit_progression: "Visit progression",
  objection_hints: "Objection hints",
};

function clamp(n: number) {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function trendOf(series: number[]): { trend: "up" | "flat" | "down"; delta: number } {
  if (series.length < 2) return { trend: series[0] != null && series[0] <= 10 ? "down" : "flat", delta: 0 };
  const window = series.slice(-3);
  const delta = window[window.length - 1]! - window[0]!;
  if (series[series.length - 1]! <= 10) return { trend: "down", delta };
  if (delta >= 6) return { trend: "up", delta };
  if (delta <= -6) return { trend: "down", delta };
  return { trend: "flat", delta };
}

function scorePoint(text: string, index: number, who: Thread["messages"][number]["who"]): Record<SignalKey, number> {
  const t = text.toLowerCase();
  const flags = inboundFlags(text);
  const intentSchedule =
    /saturday|sunday|thursday|come in|test drive|book|i'll be there|see you|10:30|11:15|i'll come|stop by|this week|4:30|5:30/.test(
      t,
    );
  const price = /price|best you can|discount|off today|payment|\$|come down|too expensive|how much/.test(t);
  const angry = flags.band === "hot" || flags.fears.some((k) => k === "upsell" || k === "pressure" || k === "fees");
  const ghosty = flags.ghost || flags.band === "cool";
  const recover = flags.recover;
  const commit = flags.commit;
  const trade = /trade|accord|tow package/.test(t);
  const settled = who === "rep" && /staying on the|i'?m not moving you|fair (fear|to ask)|not a smoker|no accident/.test(t);
  const pulled = who === "rep" && /i'll have it pulled|is held|on the pad/.test(t);

  const climb = 10 + index * 4;
  const repBoost = who === "rep" ? 4 : 0;
  const purchase = clamp(
    climb +
      (intentSchedule ? 14 : 0) +
      (commit ? 20 : 0) +
      (recover ? 16 : 0) +
      (flags.factQuestion ? 8 : 0) +
      (settled ? 10 : 0) +
      (pulled ? 8 : 0) +
      repBoost -
      (angry ? 28 : 0) -
      (ghosty ? 28 : 0),
  );
  const friction = clamp(
    (price && !settled ? 42 + index * 3 : 6 + index * 2) +
      (angry ? 16 : 0) +
      (flags.fears.includes("fees") ? 18 : 0) -
      (who === "rep" && !price ? 8 : 0) -
      (settled ? 14 : 0),
  );
  const engagement = clamp(
    28 +
      index * 4 +
      (intentSchedule ? 10 : 0) +
      (recover ? 14 : 0) +
      (flags.factQuestion ? 8 : 0) +
      (text.length > 90 ? 8 : 0) +
      (who === "customer" ? 6 : 0) +
      (settled ? 8 : 0) -
      (ghosty ? 24 : 0) -
      (angry ? 22 : 0),
  );
  const visit = clamp(
    8 +
      index * 5 +
      (intentSchedule ? 12 : 0) +
      (commit ? 22 : 0) +
      (recover ? 18 : 0) +
      (pulled ? 12 : 0) +
      (settled ? 10 : 0) +
      repBoost -
      (ghosty ? 34 : 0) -
      (angry ? 32 : 0),
  );
  const objections = clamp(
    (price ? 24 : 0) +
      (angry ? 22 : 0) +
      (ghosty ? 18 : 0) +
      (trade ? 12 : 0) +
      (flags.fears.length ? 10 : 0) -
      (recover ? 10 : 0) -
      (settled ? 16 : 0),
  );
  return {
    purchase_intent: purchase,
    price_friction: friction,
    engagement,
    visit_progression: visit,
    objection_hints: objections,
  };
}

function why(key: SignalKey, thread: Thread, score: number, prev: number | null): string {
  if (key === "purchase_intent") {
    if (thread.stage === "book" || thread.stage === "visit") return "Visit interest is on the record.";
    if (prev != null && score < prev) return "The latest message pulled purchase intent down.";
    return "Purchase intent held after this communication.";
  }
  if (key === "price_friction") {
    if (score === 0) return "No price pushback in this communication.";
    if (thread.intel.trackers.includes("price")) return "They pushed on price in their own words.";
    return "Price friction is still on the thread.";
  }
  if (key === "engagement") {
    if (thread.intel.sentiment === "negative") return "Tone went negative in this communication.";
    if (thread.intel.sentiment === "positive") return "Tone turned positive in this communication.";
    return "They kept the conversation moving.";
  }
  if (key === "visit_progression") {
    if (thread.stage === "book") return "A time is booked or on offer.";
    if (prev != null && score < prev) return "The latest message pulled show-likelihood down.";
    return "This communication did not move the visit backward.";
  }
  const present = thread.intel.trackers.filter((t) => ["price", "financing", "trade", "hold"].includes(t));
  return present.length ? `Objection hints on file: ${present.join(", ")}.` : "No classic objection in this communication.";
}

export function communicationSignals(thread: Thread): {
  events: number;
  headline: { text: string; why: string } | null;
  signals: SignalRow[];
  momentum: { series: number[]; trend: "up" | "flat" | "down"; score: number; label: string; delta: number };
} {
  const turns = thread.messages.filter((m) => m.who !== "system");
  const points = turns.map((m, i) => scorePoint(m.text, i, m.who));
  const keys: SignalKey[] = ["purchase_intent", "price_friction", "engagement", "visit_progression", "objection_hints"];
  const signals: SignalRow[] = keys.map((key) => {
    const series = points.map((p) => p[key]);
    const { trend, delta } = trendOf(series);
    const score = series[series.length - 1] ?? 0;
    const prev = series.length > 1 ? series[series.length - 2]! : null;
    return { key, label: LABELS[key], series, score, delta, trend, why: why(key, thread, score, prev) };
  });
  const by = Object.fromEntries(signals.map((s) => [s.key, s])) as Record<SignalKey, SignalRow>;
  const parts: string[] = [];
  if (by.purchase_intent.score >= 70) parts.push("HIGH INTENT");
  if (by.price_friction.score >= 50 && by.price_friction.trend === "up") parts.push("PRICE FRICTION ESCALATING");
  else if (by.price_friction.score >= 60) parts.push("PRICE FRICTION");
  if (by.objection_hints.score >= 36 && by.objection_hints.trend === "up") parts.push("OBJECTION HINTS RISING");
  const momSeries = points.map((p) => p.visit_progression);
  const momTrend = trendOf(momSeries);
  const score = momSeries[momSeries.length - 1] ?? Math.round(thread.intel.propensityToShow * 100);
  const label =
    momTrend.trend === "up"
      ? "Show-likelihood climbing"
      : momTrend.trend === "down"
        ? "Show-likelihood slipping"
        : "Show-likelihood holding";
  return {
    events: turns.length,
    headline: parts.length ? { text: parts.join(" · "), why: by.purchase_intent.why } : null,
    signals,
    momentum: { series: momSeries.length ? momSeries : [score], trend: momTrend.trend, score, label, delta: momTrend.delta },
  };
}

export function dealFileText(thread: Thread) {
  const sig = communicationSignals(thread);
  const hurt = thread.intel.moments.filter((m) => m.kind === "risk" || m.kind === "objection");
  const recovered = thread.intel.moments.filter((m) => m.kind === "commit" || m.kind === "positive");
  const lines = [
    `Deal file · ${thread.customerName} · ${thread.city}`,
    `Show-likelihood: ${sig.momentum.score}% · ${sig.momentum.label}`,
    `Stage: ${thread.stage} · goal: ${thread.goal}`,
    `Channel: ${thread.channel} · source: ${thread.source}`,
    ...thread.facts.map((f) => `${f.key}: ${f.value}${f.evidence ? `  "${f.evidence}"` : ""}`),
    ...sig.signals.map((s) => `${s.label}: ${s.score} (${s.trend}${s.delta ? ` ${s.delta > 0 ? "+" : ""}${s.delta}` : ""}) · ${s.why}`),
    hurt.length ? `Can break it: ${hurt.map((m) => `${m.label} ("${m.quote}")`).join(" · ")}` : "",
    recovered.length ? `Moved it back: ${recovered.map((m) => `${m.label} ("${m.quote}")`).join(" · ")}` : "",
    thread.intel.coaching ? `Coaching: ${thread.intel.coaching}` : "",
    "A person still hits Send. Nothing autonomous.",
  ];
  return lines.filter(Boolean).join("\n");
}

export function appointmentIcs(opts: {
  title: string;
  starts: string;
  customer: string;
  place: string;
}) {
  const dt = opts.starts.replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z").slice(0, 15);
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//LotBeacon//Desk//EN",
    "BEGIN:VEVENT",
    `UID:lotbeacon-${stamp}@zoellner`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${dt}`,
    `SUMMARY:${opts.title}`,
    `DESCRIPTION:Ask for the assigned rep. ${opts.customer}. A person still hits Send — this file is not an autonomous book.`,
    `LOCATION:${opts.place}`,
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}

export function downloadIcs(filename: string, body: string) {
  const blob = new Blob([body], { type: "text/calendar" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function gcalStamp(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z").slice(0, 15) + "Z";
}

export function googleCalendarUrl(opts: {
  title: string;
  starts: string;
  customer: string;
  place: string;
}) {
  const start = gcalStamp(opts.starts);
  const end = gcalStamp(new Date(new Date(opts.starts).getTime() + 45 * 60_000).toISOString());
  const p = new URLSearchParams({
    action: "TEMPLATE",
    text: opts.title,
    dates: `${start}/${end}`,
    details: `Ask for the assigned rep. ${opts.customer}. A person still hits Send.`,
    location: opts.place,
  });
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}
