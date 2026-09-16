import type { Thread } from "./types";

export const MIN_EXCHANGES = { quick: 4, medium: 10, guided: 15 } as const;
export type ThreadLength = keyof typeof MIN_EXCHANGES;

export const THREAD_LENGTHS: { id: ThreadLength; label: string; blurb: string }[] = [
  { id: "quick", label: "Quick", blurb: "Four exchanges before any close." },
  { id: "medium", label: "Medium", blurb: "Ten exchanges. Charts climb, dip, recover." },
  { id: "guided", label: "Guided", blurb: "Fifteen exchanges. Watch every tick on both rails." },
];

const PAD = [
  "Still looking at the photos. Is it actually on the lot?",
  "What's the mileage again?",
  "Saturday might work if you have a real time.",
  "Morning is better than afternoon.",
  "Who do I ask for when I walk in?",
  "Where do I park?",
  "Do I need an appointment on paper?",
  "I'll bring my spouse if that is alright.",
  "Ok. Confirm the time once more.",
  "Yeah that works. I'll make it.",
];

export function exchangesNeeded(id: ThreadLength): number {
  return MIN_EXCHANGES[id];
}

export function effectiveScript(script: Thread["demoScript"], length: ThreadLength): string[] {
  const min = MIN_EXCHANGES[length];
  const lines = script.filter((s): s is string => typeof s === "string");
  if (lines.length >= min) return lines.slice(0, min);
  if (lines.length === 0) {
    const out = PAD.slice(0, Math.max(0, min - 1));
    out.push("I'll come in. See you then.");
    return out.slice(0, min);
  }
  const closer = lines[lines.length - 1] ?? "I'll come in. See you then.";
  const body = lines.slice(0, -1);
  let i = 0;
  while (body.length < min - 1) {
    body.push(PAD[i % PAD.length]!);
    i += 1;
  }
  return [...body, closer].slice(0, min);
}

export function remainingExchanges(thread: Thread, length: ThreadLength): number {
  return Math.max(0, MIN_EXCHANGES[length] - thread.demoCursor);
}

export function canCloseThread(thread: Thread, length: ThreadLength): boolean {
  return thread.demoCursor >= MIN_EXCHANGES[length];
}

/** Fixed x-axis for the path: each Send fills the next tick instead of rescaling. */
export function chartSlots(thread: Thread, length: ThreadLength): number {
  const turns = thread.messages.filter((m) => m.who !== "system").length;
  return Math.max(MIN_EXCHANGES[length] * 2 + 6, turns + 2, 8);
}
