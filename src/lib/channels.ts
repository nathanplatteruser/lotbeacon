import type { Channel, Claim, Draft, Thread } from "./types";

export const COMPOSE_CHANNELS = ["messenger", "sms", "email", "phone"] as const;
export type ComposeChannel = (typeof COMPOSE_CHANNELS)[number];

export const CHANNEL_META: Record<
  Channel,
  { label: string; short: string; send: string; hint: string }
> = {
  messenger: {
    label: "Messenger",
    short: "MSG",
    send: "Send",
    hint: "Home inbox. 24-hour window, 7-day if a person already replied. Human Send. Trackable.",
  },
  sms: {
    label: "SMS",
    short: "SMS",
    send: "Send SMS",
    hint: "Ghosted rescue or appointment confirm. Store 10DLC only — never a personal cell. STOP is forever.",
  },
  email: {
    label: "Email",
    short: "EML",
    send: "Send email",
    hint: "Paper trail and booked-visit confirm. Subject + body. Payments and OTD still blocked.",
  },
  phone: {
    label: "Voice",
    short: "CALL",
    send: "Place call",
    hint: "Ghosted rescue. Talking points, not a bot. You dial the store line. Never a personal cell.",
  },
  lot: {
    label: "Lot",
    short: "LOT",
    send: "Log visit",
    hint: "They came in. Log it. Do not invent what was said on the pad.",
  },
};

export const STORE_SMS = "(402) 223-3547";

export function channelOf(thread: Thread): Channel {
  return thread.outboundChannel ?? thread.channel;
}

export function firstName(full: string) {
  return full.split(/\s+/)[0] ?? full;
}

export function customerEmail(thread: Thread) {
  if (thread.email) return thread.email;
  const parts = thread.customerName
    .toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .trim()
    .split(/\s+/);
  const first = parts[0] ?? "shopper";
  const last = parts[parts.length - 1] ?? "lead";
  return `${first}.${last}@example.com`;
}

export function inQuietHours(now = new Date(), timeZone = "America/Chicago") {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", hour12: false }).format(now),
  );
  return hour < 8 || hour >= 21;
}

export function isSunday(now = new Date(), timeZone = "America/Chicago") {
  const day = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(now);
  return day === "Sun";
}

export function firstSmsOutbound(thread: Thread) {
  return !thread.messages.some((m) => m.who === "rep" && m.channel === "sms");
}

/** Marketplace pinged us; they did not text the 10DLC. First SMS is a warn, not a block. */
export function smsConsentWarn(thread: Thread) {
  if (thread.dnc) return null;
  if (thread.channel === "sms") return null;
  if (thread.messages.some((m) => m.channel === "sms" && m.who === "customer")) return null;
  return "First SMS to a Marketplace number. 10DLC, store-identified. They did not text this line first.";
}

function firstSentences(text: string, n: number) {
  const parts = text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.slice(0, n).join(" ");
}

export function smsUnits(text: string) {
  const len = text.length;
  if (len <= 160) return { len, segments: 1, cap: 160 };
  return { len, segments: Math.ceil(len / 153), cap: 153 * Math.ceil(len / 153) };
}

export function shapeForChannel(
  text: string,
  thread: Thread,
  channel: Channel,
  slots: { label: string }[],
): Pick<Draft, "text" | "subject" | "talkingPoints"> {
  if (channel === "sms") {
    let body = firstSentences(text, 4);
    if (body.length > 280) body = `${body.slice(0, 277).trim()}…`;
    if (firstSmsOutbound(thread)) {
      body = `${body}\n\nReply STOP to opt out. Zoellner Ford of Beatrice ${STORE_SMS}`;
    }
    return { text: body };
  }

  if (channel === "email") {
    const first = firstName(thread.customerName);
    const unit = thread.facts.find((f) => f.key === "vehicle" || f.key === "preferred_vehicle");
    const slot = slots[0]?.label;
    const subject =
      thread.emailSubject ||
      (unit
        ? `${unit.value} — ${slot ?? "two times that work"}`
        : `Zoellner Ford of Beatrice — ${slot ?? "a time that works"}`);
    const body = `Hi ${first},\n\n${text}\n\n${thread.assignedRepId === "r_jordan" ? "Jordan Hale" : thread.assignedRepId === "r_maya" ? "Maya Chen" : thread.assignedRepId === "r_morgan" ? "Morgan Blake" : "Alex Reyes"}\nZoellner Ford of Beatrice\n${STORE_SMS}\nMon–Fri 8–6 · Sat 8–3 · closed Sunday`;
    return { text: body, subject };
  }

  if (channel === "phone") {
    const opener = firstSentences(text, 1);
    const points = [
      `Open as yourself, Zoellner Ford of Beatrice. Do not say “an AI drafted this.”`,
      `Goal: ${thread.goal}`,
      ...thread.facts.slice(0, 4).map((f) => `${f.key}: ${f.value} (${f.certainty})`),
      slots.length
        ? `Offer ${slots.map((s) => s.label).join(" or ")} — a time, not an open question.`
        : "If they will visit, offer two verified times.",
      "Do not: payments, approvals, trade values, discounts, doc fees, Sunday hours.",
      "After: log reached / voicemail / no-answer. Push ADF if they book.",
    ];
    return { text: opener, talkingPoints: points };
  }

  return { text };
}

export function channelClaims(thread: Thread, channel: Channel, text: string): Claim[] {
  const claims: Claim[] = [];
  if (channel === "sms") {
    const consent = smsConsentWarn(thread);
    if (consent) {
      claims.push({
        text: "10DLC",
        severity: "warn",
        reason: consent,
      });
    }
    if (inQuietHours()) {
      claims.push({
        text: "quiet hours",
        severity: "warn",
        reason: "Central quiet hours (9 pm–8 am). TCPA. You can still send; the county will remember if you do.",
      });
    }
    const units = smsUnits(text);
    if (units.segments > 2) {
      claims.push({
        text: "SMS length",
        severity: "warn",
        reason: `${units.segments} segments. Cut it. A farm household does not read a novel on a flip-up.`,
      });
    }
  }
  return claims;
}
