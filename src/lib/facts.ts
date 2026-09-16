import type { Fact, Thread } from "./types";

const RANK: Record<Fact["certainty"], number> = {
  asked: 0,
  tentative: 1,
  preferred: 2,
  required: 3,
  confirmed: 4,
};

function clip(text: string, re: RegExp) {
  const m = text.match(re);
  return (m?.[0] ?? text).replace(/\s+/g, " ").trim().slice(0, 90);
}

function fact(key: string, value: string, certainty: Fact["certainty"], evidence: string): Fact {
  return { id: `hf_${key}`, key, value, certainty, evidence };
}

export function harvestFacts(text: string): Fact[] {
  const t = text.trim();
  if (!t) return [];
  const out: Fact[] = [];
  const add = (key: string, value: string, certainty: Fact["certainty"], re: RegExp) => {
    out.push(fact(key, value, certainty, clip(t, re)));
  };

  if (/\bwhite f-?150\b/i.test(t)) {
    add("vehicle", "white F-150", "preferred", /white f-?150/i);
  }

  if (/my wife|wife coming|bring my wife|in front of my wife|wife wants to sit/i.test(t)) {
    add("spouse", "wife involved", "confirmed", /(?:my |in front of my )?wife[^.]{0,40}/i);
  } else if (/my husband|husband coming|bring my husband/i.test(t)) {
    add("spouse", "husband involved", "confirmed", /(?:my )?husband[^.]{0,40}/i);
  } else if (/\b(spouse|partner)\b/i.test(t)) {
    add("spouse", "spouse involved", "confirmed", /\b(spouse|partner)\b[^.]{0,40}/i);
  }

  if (/booster|car ?seat/i.test(t)) {
    add("kids", "needs booster / car seat", "confirmed", /(?:booster|car ?seat)[^.]{0,40}/i);
  } else if (/\bmy kids\b|\bkids\b/i.test(t) && /insulted|family|children|boosters/i.test(t)) {
    add("kids", "has kids", "confirmed", /kids/i);
  }

  if (/drive in snow|i drive in snow|for snow|we drive in snow/i.test(t)) {
    add("use_case", "drives in snow", "confirmed", /(?:drive in snow|for snow|we drive in snow)/i);
  }
  if (/\btow|\bboat\b|hitch/i.test(t)) {
    const snow = out.find((f) => f.key === "use_case");
    const value = snow ? `${snow.value} + tows a boat` : "tows a boat";
    const i = out.findIndex((f) => f.key === "use_case");
    if (i >= 0) out[i] = fact("use_case", value, "confirmed", clip(t, /tow.{0,28}|boat.{0,20}/i));
    else add("use_case", value, "confirmed", /tow.{0,28}|boat.{0,20}/i);
  }
  if (/\b4wd right\b|need (4wd|awd)|four.?wheel|don'?t want a 2wd/i.test(t)) {
    add("drivetrain", "needs 4WD", "confirmed", /4wd|awd|four.?wheel|2wd/i);
  }

  const tradeHit = t.match(
    /\b(20\d{2})\s+(chevy\s+|chevrolet\s+|gmc\s+|ford\s+|honda\s+|ram\s+)?(silverado|sierra|f-?150|accord|camry|ram|tahoe|equinox)[^.]{0,48}/i,
  );
  if (tradeHit) {
    add("trade", tradeHit[0].replace(/\s+/g, " ").trim().slice(0, 60), "confirmed", /20\d{2}.{0,40}/i);
  } else if (/park the trade|bringing a trade|bring the (accord|trade|chevy|silverado)|my (accord|trade|silverado|chevy)|happy to bring it|got a 20\d{2}/i.test(t)) {
    const unit = t.match(/\baccord\b/i) ? "Accord" : t.match(/\bsilverado\b/i) ? "Silverado" : "has a trade";
    add("trade", unit, "confirmed", /(?:park the trade|bringing a trade|bring the \w+|my (accord|silverado|chevy)|happy to bring it|got a 20\d{2})/i);
  }

  const creditHit = t.match(/credit'?s? (?:is |like |around |about )?(\d{3})/i);
  if (creditHit?.[1]) {
    add("credit", creditHit[1], "confirmed", /credit'?s? (?:is |like |around |about )?\d{3}/i);
  }

  if (/lease is up|need something this month|october 1|this month/i.test(t) && /lease|need something|october/i.test(t)) {
    add("purchase_timing", /october/i.test(t) ? "need a unit by Oct 1" : "buying this month", "confirmed", /lease is up.{0,24}|need something this month|october 1/i);
  }

  if (/90 percent|90%|i'?ll show if|not flaking/i.test(t)) {
    add("show_intent", "will show ~90% if the unit is here", "confirmed", /90 percent|90%|i'?ll show if|not flaking/i);
  } else if (/not even sure if i should come/i.test(t)) {
    add("visit", "unsure about coming in", "tentative", /not even sure if i should come/i);
  }

  if (/i'?m the only decision|wife just wants to sit/i.test(t)) {
    add("who", "customer decides · spouse sits", "confirmed", /only decision|wife just wants to sit/i);
  }

  if (/talk numbers on the lot|don'?t quote me a (payment|number)|not asking you to run numbers/i.test(t)) {
    add("process", "numbers on the lot, not in chat", "confirmed", /(?:talk numbers on the lot|don'?t quote me a \w+|not asking you to run numbers)/i);
  }

  if (/don'?t send anyone else|don'?t (call|text) me|nobody else to call/i.test(t)) {
    add("contact", "this number only, no extra callers", "confirmed", /don'?t send anyone else|don'?t (call|text) me/i);
  }

  if (/i'?ll come|i'?ll be there|see you then|we'?ll be there/i.test(t)) {
    add("visit", "committed to show", "confirmed", /i'?ll come|i'?ll be there|we'?ll be there/i);
  }

  if (/thursday 4:30 still works|4:30 still works|saturday 10:00|saturday 10\b|10:00 still/i.test(t)) {
    add("timing", clip(t, /(?:thursday|saturday|friday)?\s*\d{1,2}:\d{2}(?:\s*(?:am|pm))?|saturday 10/i) || "named time", "confirmed", /\d{1,2}:\d{2}|thursday|saturday 10|saturday/i);
  } else if (/morning is better|prefer morning|better than afternoon|saturday morning is easiest/i.test(t)) {
    add("timing", "prefers morning", "confirmed", /morning.{0,24}afternoon|prefer morning|saturday morning is easiest/i);
  } else if (/afternoon is better|prefer afternoon|better than morning|2ish/i.test(t)) {
    add("timing", "prefers afternoon", "confirmed", /afternoon|2ish|prefer afternoon/i);
  }

  return out;
}

export function mergeFacts(existing: Fact[], harvested: Fact[]): Fact[] {
  if (!harvested.length) return existing;
  const next = existing.map((f) => ({ ...f }));
  for (const h of harvested) {
    const i = next.findIndex((f) => f.key === h.key);
    if (i < 0) {
      next.push({ ...h, id: `f_${h.key}_${next.length + 1}` });
      continue;
    }
    const cur = next[i]!;
    if (RANK[h.certainty] >= RANK[cur.certainty]) {
      next[i] = {
        ...cur,
        value: h.value,
        certainty: h.certainty,
        evidence: h.evidence || cur.evidence,
      };
    }
  }
  return next.slice(0, 16);
}

export function factValue(thread: Thread, key: string) {
  return thread.facts.find((f) => f.key === key)?.value ?? "";
}
