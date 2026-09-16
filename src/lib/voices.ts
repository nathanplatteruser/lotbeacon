import type { VoiceId } from "./types";

/** Tone detection from the customer's own words. A rep's manual pick always wins (voiceLocked). */
const TONE: Record<Exclude<VoiceId, "auto">, string[]> = {
  frank: [
    "listen",
    "look",
    "cut to the chase",
    "bottom line",
    "no bs",
    "whaddya",
    "gimme",
    "outta",
    "gonna need",
    "straight up",
    "real talk",
    "don't waste my time",
    "let's not",
    "what's the deal",
    "c'mon",
    "fuhgeddaboudit",
    "gotta",
  ],
  celeste: [
    "stoked",
    "chill",
    "rad",
    "dude",
    "totally",
    "vibes",
    "no worries",
    "for sure",
    "hella",
    "super",
    "amazing",
    "love that",
    "so good",
    "sounds dreamy",
    "mellow",
  ],
  jon: [
    "ope",
    "you bet",
    "oh gosh",
    "thanks a bunch",
    "folks",
    "appreciate ya",
    "sure thing",
    "no rush",
    "whenever",
    "gosh",
    "darn",
    "heck",
    "pop by",
    "ya know",
    "the missus",
    "the wife and i",
    "we're just",
    "much obliged",
  ],
  dogg: [
    "yo",
    "what's good",
    "whats good",
    "fo sho",
    "fosho",
    "homie",
    "fam",
    "dope",
    "chillin",
    "roll through",
    "rollin",
    "we good",
    "my guy",
    "ya feel",
    "feel me",
    "no doubt",
    "word",
    "aight",
    "bruh",
    "smooth",
    "whip",
  ],
  zee: [
    "lowkey",
    "highkey",
    "fr",
    "ngl",
    "no cap",
    "bet",
    "rn",
    "tbh",
    "lol",
    "lmao",
    "omg",
    "vibe",
    "slaps",
    "bussin",
    "sus",
    "deadass",
    "ong",
    "wyd",
    "hbu",
    "istg",
    "idk",
    "tho",
    "pls",
    "ur",
    "yall",
  ],
};

/** Two independent tells (0.5 + 0.2·n) before overriding the dealership default. */
export const AUTO_VOICE_THRESHOLD = 0.85;

export function detectCustomerVoice(text: string): {
  voice: VoiceId;
  confidence: number;
  signals: string[];
} {
  const low = ` ${text.toLowerCase()} `;
  const scores: Record<string, string[]> = {};
  for (const [vid, words] of Object.entries(TONE)) {
    const hits = words.filter((w) => {
      const escaped = w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return new RegExp(`(?<![a-z'])${escaped}(?![a-z])`, "i").test(low);
    });
    if (hits.length) scores[vid] = hits;
  }
  if (text && text === text.toLowerCase() && text.length > 12 && !/[.!?]$/.test(text.trim())) {
    scores.zee = [...(scores.zee ?? []), "lowercase, no punctuation"];
  }
  const keys = Object.keys(scores);
  if (!keys.length) return { voice: "auto", confidence: 0, signals: [] };
  const best = keys.reduce((a, b) => (scores[a].length >= scores[b].length ? a : b));
  const n = scores[best].length;
  return {
    voice: best as VoiceId,
    confidence: Math.min(0.5 + 0.2 * n, 0.95),
    signals: scores[best],
  };
}

const FOLLOWUPS: Record<1 | 2 | 3, string> = {
  1: "Hey {name}! Just checking in — still happy to help whenever you're ready. Anything I can answer?",
  2: "Hi {name}, circling back once more. No pressure at all — if now isn't the right time, just say so and I'll leave you be.",
  3: "{name}, last note from me. If a visit ever makes sense, my door's open. Thanks for considering us!",
};

export function followupText(stage: number, customerName: string): string {
  const first = customerName.split(" ")[0] ?? "";
  const key = (stage <= 1 ? 1 : stage >= 3 ? 3 : 2) as 1 | 2 | 3;
  return FOLLOWUPS[key]
    .replace("{name}", first)
    .replace("Hey !", "Hey!")
    .replace("Hi ,", "Hi,")
    .replace(", last note", "Last note")
    .trim();
}

export function voiceReasonLine(opts: {
  locked: boolean;
  voice: VoiceId;
  detected: { voice: VoiceId; confidence: number; signals: string[] };
}): string {
  if (opts.locked) return "rep picked this voice";
  if (opts.detected.confidence >= AUTO_VOICE_THRESHOLD && opts.detected.voice !== "auto") {
    const hits = opts.detected.signals.slice(0, 3).join(", ");
    return hits ? `auto · matched customer tone (${hits})` : "auto · matched customer tone";
  }
  return "auto · dealership default";
}
