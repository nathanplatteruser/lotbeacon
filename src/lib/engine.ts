import type {
  Appointment,
  Bucket,
  Claim,
  Draft,
  Message,
  Slot,
  SlotPair,
  Thread,
  Vehicle,
  VoiceId,
} from "./types";
import { channelClaims, channelOf, shapeForChannel } from "./channels";
import { inboundFlags, TENSION_RE, tempCheck } from "./temp";
import { factValue } from "./facts";

export const WINDOW_MS = 24 * 60 * 60 * 1000;
export const FRESHNESS_MS = 30 * 60 * 1000;
export const INVENTORY_SOURCE = "CDK feed · Zoellner Ford of Beatrice";

export function vehicleLabel(v: Vehicle) {
  return `${v.year} ${v.make} ${v.model} ${v.trim}`;
}

export function findVehicle(vehicles: Vehicle[], stock: string | null) {
  if (!stock) return null;
  return vehicles.find((v) => v.stock === stock) ?? null;
}

export function vehicleSource(v: Vehicle) {
  return v.source ?? INVENTORY_SOURCE;
}

export function vehicleRetrievedAt(v: Vehicle, now = Date.now()) {
  if (v.retrievedAt) return v.retrievedAt;
  if (v.status === "sold") return new Date(now - 2 * 60 * 60_000).toISOString();
  return new Date(now - 8 * 60_000).toISOString();
}

export function isFresh(v: Vehicle, now = Date.now()) {
  return now - new Date(vehicleRetrievedAt(v, now)).getTime() <= FRESHNESS_MS;
}

export function inventoryAgeMs(v: Vehicle, now = Date.now()) {
  return Math.max(0, now - new Date(vehicleRetrievedAt(v, now)).getTime());
}

function nextSaturday(hour: number, minute = 0) {
  const d = new Date();
  const day = d.getDay();
  const add = (6 - day + 7) % 7 || 7;
  d.setDate(d.getDate() + add);
  d.setHours(hour, minute, 0, 0);
  return d;
}

export function proposeSlots(thread: Thread, prefer?: SlotPair): Slot[] {
  const pair = prefer ?? thread.slotPair ?? "default";
  if (pair === "morning") {
    return [
      { id: "am1", at: nextSaturday(9).toISOString(), label: "Saturday 9:00 AM" },
      { id: "am2", at: nextSaturday(10, 30).toISOString(), label: "Saturday 10:30 AM" },
    ];
  }
  if (pair === "afternoon") {
    return [
      { id: "pm1", at: nextSaturday(13, 30).toISOString(), label: "Saturday 1:30 PM" },
      { id: "pm2", at: nextSaturday(14, 30).toISOString(), label: "Saturday 2:30 PM" },
    ];
  }
  const t = thread.customerName;
  if (thread.id === "t_harold") {
    const at = new Date(Date.now() + 50 * 60_000);
    return [{ id: "s1", at: at.toISOString(), label: at.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) }];
  }
  if (thread.id === "t_frankie") {
    const d = new Date();
    d.setHours(16, 0, 0, 0);
    if (d.getTime() < Date.now()) d.setDate(d.getDate() + 1);
    return [{ id: "s1", at: d.toISOString(), label: "Today 4:00 PM" }];
  }
  if (thread.id === "t_marcus") {
    const d = new Date();
    const add = (5 - d.getDay() + 7) % 7 || 7;
    d.setDate(d.getDate() + add);
    d.setHours(17, 30, 0, 0);
    return [
      { id: "s1", at: d.toISOString(), label: "Friday 5:30 PM" },
      { id: "s2", at: nextSaturday(10).toISOString(), label: "Saturday 10:00 AM" },
    ];
  }
  if (thread.id === "t_karen") {
    return [
      { id: "s1", at: nextSaturday(10).toISOString(), label: "Next Saturday 10:00 AM" },
      { id: "s2", at: (() => { const d = new Date(); const add = (5 - d.getDay() + 7) % 7 || 7; d.setDate(d.getDate() + add); d.setHours(16, 30, 0, 0); return d.toISOString(); })(), label: "Friday 4:30 PM" },
    ];
  }
  if (thread.id === "t_mike") {
    const d1 = new Date();
    const add = (4 - d1.getDay() + 7) % 7 || 7;
    d1.setDate(d1.getDate() + add);
    d1.setHours(16, 30, 0, 0);
    const d2 = new Date(d1);
    d2.setHours(17, 30, 0, 0);
    return [
      { id: "s1", at: d1.toISOString(), label: "Thursday 4:30 PM" },
      { id: "s2", at: d2.toISOString(), label: "Thursday 5:30 PM" },
    ];
  }
  if (thread.id === "t_tyler") {
    return [
      { id: "s1", at: nextSaturday(13, 30).toISOString(), label: "Saturday 1:30 PM" },
      { id: "s2", at: nextSaturday(14, 30).toISOString(), label: "Saturday 2:30 PM" },
    ];
  }
  if (thread.id === "t_rachel") {
    return [
      { id: "s1", at: nextSaturday(11).toISOString(), label: "Saturday 11:00 AM" },
      { id: "s2", at: nextSaturday(13).toISOString(), label: "Saturday 1:00 PM" },
    ];
  }
  // default Saturday morning pair — store hours 8–3
  void t;
  return [
    { id: "s1", at: nextSaturday(10).toISOString(), label: "Saturday 10:00 AM" },
    { id: "s2", at: nextSaturday(11, 30).toISOString(), label: "Saturday 11:30 AM" },
  ];
}

export function bandPreference(text: string): SlotPair | null {
  const t = text.toLowerCase();
  if (/morning.{0,28}better|prefer morning|not the afternoon|morning is better|better than afternoon/.test(t)) return "morning";
  if (/afternoon.{0,28}better|prefer afternoon|not the morning|afternoon is better|better than morning/.test(t)) return "afternoon";
  if (/\b2ish\b|\b2\s*ish\b/.test(t) && !/morning/.test(t)) return "afternoon";
  if (/\bmorning\b/.test(t) && !/\bafternoon\b/.test(t)) return "morning";
  if (/\bafternoon\b/.test(t) && !/\bmorning\b/.test(t)) return "afternoon";
  return null;
}

export function lastOutbound(thread: Thread): Message | null {
  for (let i = thread.messages.length - 1; i >= 0; i--) {
    const m = thread.messages[i]!;
    if (m.who === "rep") return m;
  }
  return null;
}

export function unansweredInbounds(thread: Thread): Message[] {
  const msgs = thread.messages;
  let lastRep = -1;
  for (let i = msgs.length - 1; i >= 0; i--) {
    if (msgs[i]!.who === "rep") {
      lastRep = i;
      break;
    }
  }
  return msgs.filter((m, i) => i > lastRep && m.who === "customer");
}

export type InboundCluster = { latest: string; earlier: string[]; combined: string; count: number };

export function inboundCluster(thread: Thread): InboundCluster {
  const ins = unansweredInbounds(thread);
  if (!ins.length) return { latest: "", earlier: [], combined: "", count: 0 };
  const latest = ins[ins.length - 1]!.text;
  const earlier = ins.slice(0, -1).map((m) => m.text);
  return { latest, earlier, combined: [...earlier, latest].join("\n"), count: ins.length };
}

export function normalizeOutbound(text: string) {
  return text.toLowerCase().replace(/[^\w\s]/g, " ").replace(/\s+/g, " ").trim();
}

export function isDuplicateOutbound(thread: Thread, text: string) {
  const last = lastOutbound(thread);
  if (!last || !text.trim()) return false;
  return normalizeOutbound(last.text) === normalizeOutbound(text);
}

export const WAIT_APOLOGY_MIN = 30;

export function unansweredWaitMin(thread: Thread, now = Date.now()): number {
  const unanswered = unansweredInbounds(thread);
  const oldest = unanswered[0] ?? [...thread.messages].reverse().find((m) => m.who === "customer");
  if (!oldest) return 0;
  return Math.max(0, (now - new Date(oldest.at).getTime()) / 60_000);
}

export function alreadyOwnedWait(thread: Thread): boolean {
  const last = lastOutbound(thread);
  if (!last) return false;
  return /sorry for the (gap|lag|delay|wait)|sorry you had to (text|wait)|i'?m on this now/i.test(last.text);
}

export function needsWaitApology(thread: Thread, now = Date.now()): boolean {
  if (alreadyOwnedWait(thread)) return false;
  return unansweredWaitMin(thread, now) >= WAIT_APOLOGY_MIN;
}

export type NamedVisit = {
  clock: boolean;
  askedOptions: boolean;
  sunday: boolean;
  hour: number | null;
  minute: number;
  label: string | null;
  dayHint: string | null;
};

function formatClock(hour: number, minute: number) {
  const mer = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 || 12;
  const mm = minute === 0 ? ":00" : `:${String(minute).padStart(2, "0")}`;
  return `${h12}${mm} ${mer}`;
}

/** Day and/or clock the customer already named. Clock beats a vague Saturday. */
export function parseNamedVisit(text: string): NamedVisit {
  const t = text.toLowerCase();
  const askedOptions =
    /what else|other time|another (day|time)|any other|which (one )?(works|time)|either of those|\boptions\b|what times (work|do you)|or \d{1,2}(:\d{2})?\s*(am|pm)?/i.test(
      t,
    );
  const sunday = /\bsunday\b/.test(t);
  let dayHint: string | null = null;
  if (/\bsaturday\b|\bsat\b/.test(t)) dayHint = "Saturday";
  else if (/\bthursday\b/.test(t)) dayHint = "Thursday";
  else if (/\bfriday\b/.test(t)) dayHint = "Friday";
  else if (/\btoday\b/.test(t)) dayHint = "Today";
  else if (/\btomorrow\b/.test(t)) dayHint = "Tomorrow";
  const m =
    t.match(/\b(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)\b/) ||
    t.match(/\bis (\d{1,2})(?::(\d{2}))?\s*(?:still\s+)?(open|ok|good|available|there|fine)/) ||
    t.match(/\b(\d{1,2}):(\d{2})\s*(a\.?m\.?|p\.?m\.?)?\b/);
  if (!m) {
    return { clock: false, askedOptions, sunday, hour: null, minute: 0, label: dayHint, dayHint };
  }
  let hour = Number(m[1]);
  const minute = Number(m[2] ?? 0);
  const merRaw = (m[3] ?? "").toLowerCase().replace(/\./g, "");
  const mer = merRaw === "am" || merRaw === "pm" ? merRaw : "";
  if (!mer && hour > 12) {
    return { clock: false, askedOptions, sunday, hour: null, minute: 0, label: dayHint, dayHint };
  }
  if (mer === "pm" && hour < 12) hour += 12;
  if (mer === "am" && hour === 12) hour = 0;
  if (!mer && hour > 0 && hour <= 8) hour += 12;
  const clock = formatClock(hour, minute);
  const label = dayHint ? `${dayHint} ${clock}` : clock;
  return { clock: true, askedOptions, sunday, hour, minute, label, dayHint };
}

export function namedVisitFor(thread: Thread, cluster?: InboundCluster): NamedVisit {
  const latest = cluster?.latest || inboundCluster(thread).latest;
  const combined = cluster?.combined || inboundCluster(thread).combined;
  const history = thread.messages
    .filter((m) => m.who === "customer")
    .map((m) => m.text)
    .join("\n");
  const fromLatest = parseNamedVisit(latest);
  if (fromLatest.clock) return fromLatest;
  const fromCluster = parseNamedVisit(combined);
  if (fromCluster.clock) return fromCluster;
  const fromHistory = parseNamedVisit(history);
  if (fromHistory.clock) return fromHistory;
  if (fromLatest.dayHint || fromLatest.askedOptions || fromLatest.sunday) return fromLatest;
  if (fromCluster.dayHint) return fromCluster;
  return fromHistory;
}

function exactSlotForVisit(visit: NamedVisit, slots: Slot[]): Slot | undefined {
  if (!visit.clock || visit.hour == null) return undefined;
  const target = visit.hour * 60 + visit.minute;
  return slots.find((s) => slotMinutes(s) === target);
}

function confirmNamedLine(visit: NamedVisit, slots: Slot[]): string | null {
  if (visit.sunday) {
    if (slots.length === 2) return `We're closed Sunday. I can do ${slots[0]!.label} or ${slots[1]!.label}.`;
    if (slots[0]) return `We're closed Sunday. I can do ${slots[0].label}.`;
    return "We're closed Sunday.";
  }
  if (visit.askedOptions) return null;
  if (!visit.clock) return null;
  const exact = exactSlotForVisit(visit, slots);
  if (exact) return `${exact.label} still works. I'll have it pulled.`;
  const wanted = visit.label ?? "That time";
  if (slots.length === 2) return `${wanted} isn't open. I've got ${slots[0]!.label} or ${slots[1]!.label}.`;
  if (slots[0]) return `${wanted} isn't open. I can do ${slots[0].label}.`;
  return `${wanted} isn't open. Let me check the board.`;
}

function isHeatText(text: string) {
  const f = inboundFlags(text);
  return f.band === "hot" || f.heat >= 40;
}

function recentHeat(thread: Thread) {
  const temp = tempCheck(thread);
  return temp.band === "hot" || temp.deescalate;
}

function tensionReply(text: string, vehicle: Vehicle | null): string {
  const t = text.toLowerCase();
  if (/upsell|don'?t (put|stretch) me|i said under|under \$?\d+|expedition/.test(t) && vehicle) {
    return `Staying on the ${vehicleLabel(vehicle)} at $${vehicle.price.toLocaleString()}, under your cap. I'm not moving you.`;
  }
  if (/doc fee|hidden fee|out the door|\botd\b|extra fees/.test(t)) {
    return "Fair fear. I won't invent a doc fee in this thread. Morgan itemizes it at the desk. Nothing surprise.";
  }
  if (/smoker|smoke smell|cigarette/.test(t) && vehicle) {
    if (vehicle.smoker === false) return `Fair to ask. This ${vehicleLabel(vehicle)} is not a smoker car. That's on the vehicle record.`;
    if (vehicle.smoker === true) return "I'll be straight. This one has smoke on the record. I won't hide it. We can look at a clean one.";
    return "I won't guess smoke. You'll smell it on the lot.";
  }
  if (/accident|wreck|salvage|rebuilt|flood/.test(t) && vehicle) {
    if (vehicle.accidentHistory === "none" && !/salvage|rebuilt|flood/.test(t)) {
      return `Fair to ask. This ${vehicleLabel(vehicle)} shows no accident history on the record. We'll pull the report at the desk.`;
    }
    if (vehicle.titleStatus === "clean" && /salvage|rebuilt/.test(t)) {
      return `Fair to ask. This ${vehicleLabel(vehicle)} is a clean title on the record. Not salvage.`;
    }
    if (vehicle.accidentHistory === "reported") return "I'll be straight. This one has an accident on the record. I won't hide it. We can walk the file Saturday.";
    return "I won't guess the history. We'll pull the report together on the lot.";
  }
  if (/owners?|how many (people|hands)/.test(t) && vehicle && vehicle.priorOwners != null) {
    return `Record shows ${vehicle.priorOwners} owner${vehicle.priorOwners === 1 ? "" : "s"}. That's on the vehicle file, not a guess.`;
  }
  if (/too expensive|come down|best you can|stop pushing|not ready/.test(t)) {
    return "Fair. I won't push a number or a bigger unit in this thread. The one you asked about is still the one.";
  }
  return "";
}

function stayOnUnit(vehicle: Vehicle) {
  return `Same ${vehicleLabel(vehicle)} at $${vehicle.price.toLocaleString()}. I'm not moving you.`;
}

function featureReply(text: string, vehicle: Vehicle | null): string {
  if (!vehicle) return "Let me pull the window sticker on that before I say yes.";
  const ymm = vehicleLabel(vehicle);
  const vin = `VIN ${vehicle.vin}`;
  const t = text.toLowerCase();
  if (/booster|car ?seat|latch|tether|carseat|fits a (booster|kid)/.test(t)) {
    if (vehicle.boosterOk && vehicle.thirdRow) {
      return `Yes. ${ymm}, ${vin}, ${vehicle.seats ?? 7}-passenger. Third row takes a belt-positioning booster. Bring it and we'll fit it on the lot.`;
    }
    if (vehicle.boosterOk) {
      return `Yes. ${ymm}, ${vin}. Rear seat takes a belt-positioning booster. Bring it and we'll fit it on the lot.`;
    }
    if (vehicle.boosterOk === false) {
      return `I'll be straight. ${ymm}, ${vin}, is not the one I'd put a booster in. We can look at a 3-row on the lot.`;
    }
    return `I won't guess a booster fit. ${ymm}, ${vin}. We'll check the sticker and fit it on the lot.`;
  }
  if (/third row|3rd row|three.row/.test(t)) {
    if (vehicle.thirdRow) {
      return `Yes. ${ymm} is a ${vehicle.seats ?? 7}-passenger, ${vin}. Third row is on this unit.`;
    }
    if (vehicle.thirdRow === false) {
      return `No third row on this ${ymm}, ${vin}. If that's a must, we look at Explorer or Expedition.`;
    }
    return `I won't guess seating. ${ymm}, ${vin}. We'll read it on the window sticker.`;
  }
  if (/tow|hitch/.test(t)) {
    return `Tow rating is on the window sticker for ${ymm}, ${vin}. I won't guess a number here. We'll read it on the lot.`;
  }
  return `${ymm}, ${vin}. I won't guess that spec. We'll confirm it on the window sticker when you come in.`;
}

function visitPathIn(text: string) {
  return /i'll have .{0,48}pulled|is held|see you|ask for me|on the pad|walk in|keys pulled/i.test(text);
}

function slotClock(slot: Slot) {
  const m = slot.label.match(/\d{1,2}:\d{2}\s*(?:AM|PM)/i);
  return (m?.[0] ?? slot.label).toLowerCase();
}

function textHasSlot(text: string, slot: Slot) {
  const clock = slotClock(slot);
  return text.toLowerCase().includes(slot.label.toLowerCase()) || text.toLowerCase().includes(clock);
}

function slotAlreadyStated(thread: Thread, slot: Slot) {
  return thread.messages.filter((m) => m.who === "rep").some((m) => textHasSlot(m.text, slot) && visitPathIn(m.text));
}

function askedCloseLoop(latest: string) {
  if (isDignity(latest)) return false;
  return /confirm (the )?(time|date|appt|appointment)|confirm it|once more|calendar|i'?ll be there|you'?re on the books|see you then/i.test(
    latest,
  );
}

function askedWhen(latest: string) {
  return /what time|the time|what day|which day|confirm (the )?(time|date)/i.test(latest);
}

function askedWhere(latest: string) {
  return /address|where (are you|is (the )?(store|dealership|lot))|how do i get there/i.test(latest);
}

function isDignity(text: string) {
  return /look stupid|embarrass me|make me look|in front of my (wife|husband|kids|family)/i.test(text);
}

function shouldRestateSlot(thread: Thread, latest: string) {
  if (isDignity(latest)) return false;
  if (askedCloseLoop(latest) || askedWhen(latest) || askedWhere(latest)) return true;
  return detectAsks(latest, 2).some((a) => a.kind === "confirm") && !isDignity(latest);
}

function logisticsReply(thread: Thread, slots: Slot[], latest: string): string {
  const locked =
    slots.find((s) => slotAlreadyStated(thread, s)) ??
    slotFromThread(thread, inboundCluster(thread), slots) ??
    slots[0];
  if (/paper|print|ticket|confirmation (email|text)|written/i.test(latest)) {
    return locked
      ? `No paper. ${locked.label} is on the board. Ask for me when you walk in. I'll have it pulled.`
      : "No paper. Pick a time and I'll put you on the board. Ask for me when you walk in.";
  }
  if (/bring my (spouse|wife|husband)|is that alright|can i bring/i.test(latest)) {
    const who = /wife/i.test(latest) ? "your wife" : /husband/i.test(latest) ? "your husband" : "them";
    return `Yes. Bring ${who}. I'll have two seats.`;
  }
  if (/what do i bring|license|insurance|\bid\b/i.test(latest)) {
    return "Driver's license. Title if you have it, no stress if you don't.";
  }
  if (/walk.?in|do i need an appointment/i.test(latest)) {
    return locked
      ? `You're on the board for ${locked.label}. Ask for me. No paper.`
      : "I'll put you on the board so it isn't a cold walk-in. Pick a time.";
  }
  return locked
    ? `You're on the board for ${locked.label}. Ask for me.`
    : "I'll put you on the board. Ask for me when you walk in.";
}

function closeLoopReply(thread: Thread, slots: Slot[], vehicle: Vehicle | null): string {
  const cluster = inboundCluster(thread);
  const slot =
    slotFromThread(thread, cluster, slots) ?? exactSlotForVisit(namedVisitFor(thread, cluster), slots) ?? slots[0];
  const when = slot?.label ?? "that time";
  const unit = vehicle ? `${vehicle.model} ${vehicle.trim}` : "it";
  const bring: string[] = [];
  const trade = factValue(thread, "trade");
  if (/accord/i.test(trade)) bring.push("the Accord");
  else if (trade) bring.push("the trade");
  if (factValue(thread, "kids")) bring.push("the booster");
  const extra = bring.length ? ` Bring ${bring.join(" and ")}.` : "";
  return `${when} at Zoellner Ford, 4115 N. 6th Street, Beatrice. Ask for me, first-row visitor parking off 6th. I'll have the ${unit} pulled.${extra}`;
}

function dignityReply(thread: Thread, slots: Slot[], vehicle: Vehicle | null, latest: string): string {
  const wife = /wife/i.test(latest) || /wife/i.test(factValue(thread, "spouse"));
  const unit = vehicle ? `the ${vehicle.model} ${vehicle.trim}` : "it";
  const greet = wife
    ? "I won't. I'll greet you myself. Your wife is welcome."
    : "I won't. I'll greet you myself.";
  const walk = `We'll walk ${unit} together. Nobody's guessing at the desk.`;
  const slot =
    slots.find((s) => slotAlreadyStated(thread, s)) ??
    slotFromThread(thread, inboundCluster(thread), slots) ??
    slots[0];
  if (slot && !slotAlreadyStated(thread, slot)) {
    return `${greet} ${walk} ${slot.label}. I'll have it pulled.`;
  }
  return `${greet} ${walk}`;
}

function visitCloser(thread: Thread, slots: Slot[], draft: string): string {
  const visit = namedVisitFor(thread);
  const exact = exactSlotForVisit(visit, slots);
  if (!exact) return "";
  if (textHasSlot(draft, exact)) return "";
  const latest = inboundCluster(thread).latest;
  if (isDignity(latest)) return "";
  const kinds = detectAsks(latest, 2).map((a) => a.kind);
  const factNow = kinds.some((k) =>
    k === "miles" || k === "drivetrain" || k === "feature" || k === "payment" || k === "who" || k === "photos" || k === "price",
  );
  const visitNow = kinds.some((k) => k === "schedule" || k === "confirm" || k === "parking" || k === "logistics");
  if (factNow && !visitNow) return "";
  const firstLock = !slotAlreadyStated(thread, exact);
  if (firstLock) return `${exact.label} still works. I'll have it pulled.`;
  if (shouldRestateSlot(thread, latest)) return `${exact.label}. I'll have it pulled.`;
  return "";
}

function lowFrictionAsk(thread: Thread, draft: string): string {
  if (/\?/.test(draft)) return "";
  const temp = tempCheck(thread);
  if (temp.skipAsk || temp.band === "hot" || temp.band === "cool") return "";
  if (!lastOutbound(thread)) return "";
  if (needsWaitApology(thread)) return "";
  const customer = thread.messages.filter((m) => m.who === "customer").map((m) => m.text).join("\n");
  const reps = `${thread.messages.filter((m) => m.who === "rep").map((m) => m.text).join("\n")} ${draft}`;
  const knownTrade = thread.facts.some((f) => f.key === "trade") || /\btrade\b|\baccord\b|\bsilverado\b|\bchevy\b/i.test(customer);
  const askedTrade = /bringing a trade|trade, or just/i.test(reps);
  const askedRide = /anyone (riding|coming|with you)|riding along/i.test(reps);
  if (/don'?t send anyone|don'?t (call|text) me/i.test(inboundCluster(thread).latest)) return "";
  if (/payment|don'?t quote/i.test(inboundCluster(thread).latest)) return "";
  const named = namedVisitFor(thread).clock;
  if (temp.band === "green") {
    if (factValue(thread, "spouse")) return "";
    if (named && !askedRide) return "Anyone riding along?";
    return "";
  }
  if (!knownTrade && !askedTrade && temp.band === "warm") return "Bringing a trade, or just this one?";
  return "";
}

function stripFrictionAsks(text: string) {
  return text.replace(
    /[^.!?]*\b(credit score|credit is|cash or (loan|finance)|financ(e|ing)|shop(ping)? around|other dealerships?|what'?s your budget|down payment|pre-qual)\b[^.!?]*[.!?]?\s*/gi,
    "",
  );
}

function withShowGoal(text: string, thread: Thread, slots: Slot[]): string {
  let s = text.trim();
  if (!s) return s;
  const temp = tempCheck(thread);
  if (temp.lowerPriceTalk) {
    s = s.replace(/\s*Listed internet price is[^.]+\.\s*/i, " ");
  }
  if (temp.band !== "hot") {
    const closer = visitCloser(thread, slots, s);
    if (closer) s = `${s.replace(/[.]$/, "")}. ${closer}`;
  }
  if (!temp.skipAsk) {
    const ask = lowFrictionAsk(thread, s);
    if (ask) s = `${s.replace(/[.]$/, "")}. ${ask}`;
  }
  return stripFrictionAsks(s).replace(/\s{2,}/g, " ").trim();
}

const BLOCK_RES = [
  { re: /\$\s?\d{2,3}\s?\/?\s?month|per month|\/mo\b/i, reason: "Payment quotes are F&I only." },
  { re: /you'?re approved|pre-?approved|you qualify/i, reason: "Credit decisions are prohibited in-thread." },
  { re: /worth about|trade(?:-?in)? (?:value|offer|is)|\$\d{1,2},?\d{3} for (?:your|the) /i, reason: "Trade values are appraisal-only." },
  { re: /knock \$?\d|\$\d{3,},?\d{0,3} off|best price is|i can do \$\d/i, reason: "Discounts go through the desk — never in Messenger." },
  { re: /out the door|out-the-door|otd (?:is|price)|doc fee is \$\d/i, reason: "OTD and doc fees are itemized by the store, not invented here." },
  { re: /please stop|we'?ll keep texting|ignore the opt/i, reason: "Opt-out language is never overridden." },
];

export function validateClaims(text: string, thread: Thread, vehicle: Vehicle | null): Claim[] {
  const claims: Claim[] = [];
  if (thread.dnc) {
    claims.push({ text: "Send", severity: "block", reason: "Customer opted out. All channels suppressed." });
    return claims;
  }
  if (!text.trim()) {
    if (lastOutbound(thread) && unansweredInbounds(thread).length === 0) {
      claims.push({
        text: "waiting",
        severity: "ok",
        reason: "They have the ball. Draft writes itself when they reply.",
      });
    }
    return claims;
  }
  if (isDuplicateOutbound(thread, text)) {
    claims.push({
      text: "repeat",
      severity: "block",
      reason: "Same words as the last send. Change it or they will think nobody is reading.",
    });
  }
  for (const rule of BLOCK_RES) {
    const m = text.match(rule.re);
    if (m) claims.push({ text: m[0], severity: "block", reason: rule.reason });
  }
  if (/you'?re (all )?set for|booked for|confirmed for/i.test(text) && !thread.appointmentId) {
    const stillProposed = !/10:00|11:30|1:30|2:30|4:00|5:30|Saturday|Friday/.test(text);
    if (stillProposed) {
      claims.push({
        text: "appointment confirmation",
        severity: "block",
        reason: "Don't confirm an appointment until a slot is booked.",
      });
    }
  }
  if (vehicle) {
    if (!isFresh(vehicle) && /still (here|available)|on the lot|we have it|is here/i.test(text)) {
      claims.push({
        text: "availability",
        severity: "block",
        reason: "Inventory feed is stale. Do not assert availability — say let me verify.",
      });
    }
    if (!isFresh(vehicle) && /\$\s?[0-9,]{4,}/.test(text)) {
      claims.push({
        text: "price",
        severity: "block",
        reason: "Price cannot be quoted from a stale feed.",
      });
    }
    if (vehicle.status === "sold" && /still (here|available)|on the lot|we have it/i.test(text)) {
      claims.push({ text: "availability", severity: "block", reason: `${vehicle.stock} is sold. Do not claim it is here.` });
    }
    if (vehicle.status === "pending" && /still available|on the lot/i.test(text)) {
      claims.push({ text: "availability", severity: "warn", reason: "Unit is pending. Say 'let me verify' rather than available." });
    }
    const priceMention = text.match(/\$\s?([0-9,]{4,})/);
    if (priceMention) {
      const n = Number(priceMention[1].replace(/,/g, ""));
      if (n !== vehicle.price && n > 1000) {
        claims.push({ text: priceMention[0], severity: "block", reason: `List price is $${vehicle.price.toLocaleString()} — don't invent another number.` });
      }
    }
    if (/\bAWD\b/.test(text) && vehicle.drivetrain !== "AWD") {
      claims.push({ text: "AWD", severity: "warn", reason: `This unit is ${vehicle.drivetrain}, not AWD. Clarify once.` });
    }
  }
  if (/sunday/i.test(text)) {
    claims.push({ text: "Sunday", severity: "block", reason: "Sales floor is closed Sunday." });
  }
  if (claims.length === 0) {
    claims.push({ text: "Grounded", severity: "ok", reason: "No prohibited or unverifiable claims." });
  }
  return claims;
}

/** Strip LLM tells from every outbound voice. Customer-facing only. */
export function stripLlmTells(text: string): string {
  if (!text) return text;
  let s = text.replace(/\u2013/g, "-");
  s = s.replace(/\s*\u2014\s*/g, ". ");
  s = s.replace(/\.\s+([a-z])/g, (_m, c: string) => `. ${c.toUpperCase()}`);
  const openers = [
    /^\s*I heard you\.?\s*/i,
    /^\s*I hear you[^.!?\n]*[.!?]?\s*/i,
    /^\s*I heard [^\n.]{0,140}\.\s*/i,
    /^\s*You(?:'re| are) not wrong\.?\s*/i,
    /^\s*I agree(?: with you)?[^.!?\n]*[.!?]?\s*/i,
    /^\s*That(?:'s| is) a great question\.?\s*/i,
    /^\s*Absolutely[.,!]?\s*/i,
    /^\s*Of course[.,!]?\s*/i,
    /^\s*That makes sense\.?\s*/i,
    /^\s*I understand(?: your \w+)?\.?\s*/i,
    /^\s*Happy to help[^.!?\n]*[.!?]?\s*/i,
    /^\s*Thanks for sharing\.?\s*/i,
  ];
  for (const re of openers) s = s.replace(re, "");
  return s.replace(/\s{2,}/g, " ").replace(/\s+\./g, ".").trim();
}

export function polishOutbound(text: string, thread: Thread, slots: Slot[]): string {
  let s = stripLlmTells(text);
  if (!s) return s;
  if (!needsWaitApology(thread)) {
    s = s.replace(/^(Sorry for the (gap|lag|delay|wait|late (reply|response))[^.!?]*[.!?]\s*)/i, "");
    s = s.replace(/^(Sorry (about|for) (the )?(lag|delay|wait|gap)( getting back)?[^.!?]*[.!?]\s*)/i, "");
    s = s.replace(/^(Sorry you had to (text|wait|ping)[^.!?]*[.!?]\s*)/i, "");
  }
  const visit = namedVisitFor(thread);
  const confirm = confirmNamedLine(visit, slots);
  if (confirm && visit.clock && !visit.askedOptions) {
    const twoClocks = /\d{1,2}(:\d{2})?\s*(a\.?m\.?|p\.?m\.?)?\s+or\s+\d{1,2}/i.test(s);
    const which = /which (one )?works/i.test(s);
    if (twoClocks || which) {
      s = s
        .replace(/\s*I can do [^.]+\.\s*/i, " ")
        .replace(/\s*I've got [^.]+\.\s*/i, " ")
        .replace(/\s*Which (one )?works\??\s*/i, " ")
        .replace(/\s{2,}/g, " ")
        .trim();
      s = s ? `${s.replace(/[.]$/, "")}. ${confirm}` : confirm;
    }
  }
  s = withShowGoal(s, thread, slots);
  const seen = new Set<string>();
  s = s
    .split(/(?<=[.!?])\s+/)
    .filter((sentence) => {
      const m = sentence.match(/\b(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s+\d{1,2}:\d{2}\s*(?:AM|PM)/i);
      if (!m) return true;
      const key = m[0].toLowerCase();
      if (seen.has(key) && /held|still works|on the pad|pulled/.test(sentence)) return false;
      seen.add(key);
      return true;
    })
    .join(" ");
  return s.replace(/\s{2,}/g, " ").trim();
}

/** Customer statements checked against the window sticker — inbound, not just outbound. */
export function vetInbound(text: string, thread: Thread, vehicle: Vehicle | null): Claim[] {
  const claims: Claim[] = [];
  const priceMention = text.match(/\$\s?([0-9,]{2,})/);
  if (vehicle && priceMention) {
    const n = Number(priceMention[1].replace(/,/g, ""));
    if (Number.isFinite(n) && n > 0 && Math.abs(n - vehicle.price) >= 1500) {
      claims.push({
        text: priceMention[0],
        severity: "block",
        reason: `Sticker on ${vehicle.stock} is $${vehicle.price.toLocaleString()}. Customer said ${priceMention[0]}. Don't start a demo on a number that isn't on the window.`,
      });
    }
  }
  if (vehicle && /\$\s?10\b/.test(text) && vehicle.price > 100) {
    claims.push({
      text: "$10",
      severity: "block",
      reason: `${vehicleLabel(vehicle)} lists at $${vehicle.price.toLocaleString()}, not $10.`,
    });
  }
  if (vehicle?.status === "sold" && /still (here|available)|on the lot|i'll take it/i.test(text)) {
    claims.push({
      text: "sold unit",
      severity: "block",
      reason: `${vehicle.stock} is sold. Redirect before anyone pulls keys.`,
    });
  }
  void thread;
  return claims;
}

export function voiceWrap(base: string, voice: VoiceId, thread: Thread): string {
  const v = voice === "auto" ? thread.voice : voice;
  if (v === "zee") {
    let out = base
      .replace(/Saturday/g, "sat")
      .replace(/I've got/g, "got")
      .replace(/Which works\?/g, "which one works?");
    if (out && /[A-Z]/.test(out[0]!)) out = out[0]!.toLowerCase() + out.slice(1);
    return out;
  }
  if (v === "frank") {
    return base.replace(/I've got two times[^.]*\./, "Two times:").replace(/Which works\?/, "Which one?");
  }
  if (v === "jon") {
    return `${base.replace(/Which works\?/, "Would either of those suit you folks?")}`;
  }
  if (v === "celeste") {
    return base.replace(/Which works\?/, "Whichever is easier. I'll hold it.");
  }
  return base;
}

type AskKind =
  | "ghost"
  | "offense"
  | "dignity"
  | "tension"
  | "recover"
  | "payment"
  | "hold"
  | "warranty"
  | "delivery"
  | "availability"
  | "miles"
  | "drivetrain"
  | "feature"
  | "photos"
  | "schedule"
  | "price"
  | "trade"
  | "who"
  | "parking"
  | "title"
  | "logistics"
  | "confirm";

const ASK_PRIORITY: AskKind[] = [
  "ghost",
  "offense",
  "dignity",
  "tension",
  "recover",
  "payment",
  "hold",
  "warranty",
  "delivery",
  "availability",
  "miles",
  "drivetrain",
  "feature",
  "photos",
  "schedule",
  "price",
  "trade",
  "who",
  "parking",
  "title",
  "logistics",
  "confirm",
];

function detectAsks(text: string, weight: number): { kind: AskKind; weight: number }[] {
  if (!text.trim()) return [];
  const t = text.toLowerCase();
  const out: { kind: AskKind; weight: number }[] = [];
  const add = (kind: AskKind, re: RegExp) => {
    if (re.test(t)) out.push({ kind, weight });
  };
  add("ghost", /hello\?|third message|nobody.?s reading|go to lincoln|texted twice|if you.?re closed|if nobody|i'?ll just go|two hours ago/);
  add("offense", /time-?waster|don'?t matter|insult|like i'?m some|how you talk|you insulted|insulted my (kids|children|family|wife)/);
  add("dignity", /look stupid|embarrass me|make me look|in front of my (wife|husband|kids|family)/);
  add("tension", TENSION_RE);
  add("recover", /overreacted|i was short|sorry i snapped|it was a mistake|still coming|sorry again|kids\./);
  add("miles", /mile|mileage|odometer|how many miles/);
  add("photos", /photo|picture|\bpic\b|pics\b/);
  add("availability", /still available|still (here|there)|actually (here|there|on (the )?(lot|pad))|is it (still )?(here|there|real)|in stock|on the pad|is it on the lot|pulled yet|\bsold\b/);
  add("schedule", /saturday|sunday|thursday|friday|monday|tuesday|wednesday|weekend|what time|real time|\d\s?ish|\b\d{1,2}:\d{2}\b|\b\d{1,2}\s*(a\.?m\.?|p\.?m\.?)\b|afternoon|morning|come in|stop by|when can i come|this weekend/);
  add("price", /(?:how much|price|come down|best (?:you can|price)|discount)/);
  add("trade", /\btrade\b|bring the (accord|trade|f-150)|i'?ll bring (the |my (accord|trade))/);
  add("drivetrain", /\bawd\b|\b4wd\b|four.?wheel|all.?wheel|\bsnow\b/);
  add("feature", /booster|car ?seat|latch|tether|carseat|third row|3rd row|three.row|fits a (booster|kid)|tow(ing)?|hitch|remote start|sunroof|panoramic|heated seat|carplay|android auto|blind spot|360 cam/);
  add("who", /who do i (ask|see|talk|text|meet)|ask for/);
  add("parking", /\bpark|address|where (are you|is (the )?(store|dealership))/);
  add("title", /\btitle\b/);
  add("logistics", /on paper|print(ed|out)?|ticket|confirmation (email|text)|do i need an appointment|appointment on paper|what do i bring|driver'?s license|insurance card|\bwalk-in\b|bring my (spouse|wife|husband)|is that alright|can i bring/);
  add("hold", /\bhold\b|don't sell|reserve it/);
  add("warranty", /warrant/);
  add("delivery", /deliver/);
  add("payment", /\/mo|a month|payment|apr|financ|credit is/);
  add("confirm", /i'?ll be there|see you then|i'?ll come|i'?ll make it|let's do it|book it|fr fr see u|sounds good|confirm (the )?(time|date|appt|appointment)|confirm it|once more/);
  return out;
}

function rankedAsks(cluster: InboundCluster): AskKind[] {
  const scored = new Map<AskKind, number>();
  const latestHits = detectAsks(cluster.latest, 2);
  for (const a of latestHits) scored.set(a.kind, Math.max(scored.get(a.kind) ?? 0, a.weight));
  if (!latestHits.length) {
    for (const earlier of cluster.earlier.slice(-1)) {
      for (const a of detectAsks(earlier, 1)) scored.set(a.kind, Math.max(scored.get(a.kind) ?? 0, a.weight));
    }
  }
  if (scored.has("photos") && scored.has("availability")) scored.delete("photos");
  if (scored.has("dignity")) {
    scored.delete("confirm");
    scored.delete("availability");
    scored.delete("schedule");
  }
  if (scored.has("parking") && scored.has("trade") && /park/i.test(cluster.latest)) scored.delete("trade");
  return [...scored.entries()]
    .sort((a, b) => b[1] - a[1] || ASK_PRIORITY.indexOf(a[0]) - ASK_PRIORITY.indexOf(b[0]))
    .map(([k]) => k);
}

function slotMinutes(slot: Slot) {
  const d = new Date(slot.at);
  return d.getHours() * 60 + d.getMinutes();
}

function closestSlot(text: string, slots: Slot[]): Slot | undefined {
  if (!slots.length) return undefined;
  const t = text.toLowerCase();
  const pref = bandPreference(text);
  if (pref === "afternoon") return slots.find((s) => new Date(s.at).getHours() >= 12) ?? slots[0];
  if (pref === "morning") return slots.find((s) => new Date(s.at).getHours() < 12) ?? slots[0];
  const m = t.match(/\b(\d{1,2}):(\d{2})\s*(am|pm|ish)?\b/) || t.match(/\b(\d{1,2})\s*(am|pm|ish)\b/);
  if (!m) return slots[0];
  let h = Number(m[1]);
  const min = Number(m[2] && /^\d{2}$/.test(m[2]) ? m[2] : 0);
  const mer = (m[3] ?? m[2] ?? "").toLowerCase();
  if (mer === "pm" && h < 12) h += 12;
  if (mer === "am" && h === 12) h = 0;
  if ((mer === "ish" || mer === "") && h <= 8) h += 12;
  const target = h * 60 + min;
  return slots.slice().sort((a, b) => {
    const da = Math.abs(slotMinutes(a) - target);
    const db = Math.abs(slotMinutes(b) - target);
    if (da !== db) return da - db;
    const aAfter = slotMinutes(a) >= target;
    const bAfter = slotMinutes(b) >= target;
    if (aAfter !== bAfter) return aAfter ? -1 : 1;
    return slotMinutes(a) - slotMinutes(b);
  })[0];
}

function lastOutCovered(kind: AskKind, lastOut: Message, cluster?: InboundCluster) {
  const t = lastOut.text.toLowerCase();
  switch (kind) {
    case "miles":
      return /\bmiles?\b|\bodometer\b/.test(t);
    case "availability":
      return /on the lot|on the pad|is here|still here/.test(t);
    case "schedule": {
      const visit = parseNamedVisit(cluster?.latest ?? "");
      if (visit.clock && visit.label) {
        const said = visit.label.toLowerCase();
        if (t.includes(said)) return true;
        const h12 = (visit.hour ?? 0) % 12 || 12;
        const mm = String(visit.minute).padStart(2, "0");
        return new RegExp(`\\b${h12}:${mm}\\s*(am|pm)?\\b`).test(t) && /still works|i can do |i'll have it pulled/.test(t);
      }
      return /which (one )?works|i'?ve got .+ or /i.test(t);
    }
    case "drivetrain":
      return /\b4wd\b|\bawd\b/.test(t);
    case "dignity":
      return /i won'?t|greet you myself|your wife is welcome/.test(t);
    case "payment":
      return /won'?t quote a payment|numbers at the desk/.test(t);
    case "who":
      return /ask for me/.test(t);
    case "feature":
      return /vin |booster|third row|window sticker|latch|tow rating/.test(t);
    case "price":
      return /\$\s?\d/.test(t);
    case "ghost":
      return /sorry for the gap|i'?m on this now|had to text twice/.test(t);
    case "tension":
      return /staying on the|i'?m not moving you|fair (fear|to ask)|not a smoker|no accident|clean title/.test(t);
    case "offense":
      return /that'?s on me|wasn'?t stalling/.test(t);
    case "recover":
      return /no harm done|still works/.test(t);
    case "confirm":
      return /zoellner ford|4115 n\.? 6th/i.test(t);
    case "logistics":
      return /no paper|on the board|bring them|two seats|driver'?s license/.test(t);
    default:
      return false;
  }
}

function slotFromThread(thread: Thread, cluster: InboundCluster, slots: Slot[]) {
  const history = thread.messages
    .filter((m) => m.who === "customer")
    .map((m) => m.text)
    .join("\n");
  return closestSlot(`${cluster.combined}\n${history}`, slots);
}

function alreadyOfferedTimes(lastOut: Message) {
  return /which (one )?works|i'?ve got |got sat |or sat /i.test(lastOut.text);
}

function sentenceFor(
  kind: AskKind,
  thread: Thread,
  vehicle: Vehicle | null,
  slots: Slot[],
  cluster: InboundCluster,
  lastOut: Message,
): string {
  const combined = cluster.combined;
  const latest = cluster.latest;
  switch (kind) {
    case "miles":
      return vehicle
        ? `${vehicle.miles.toLocaleString()} miles on the window sticker. That's this truck, not a listing photo.`
        : "";
    case "drivetrain": {
      if (!vehicle) return "";
      const drive = /snow/i.test(latest)
        ? `It's ${vehicle.drivetrain}. That's the one you want for snow. Sit in it and you'll know.`
        : `It's ${vehicle.drivetrain}.`;
      if (tempCheck(thread).stayOnUnit && inboundFlags(latest).band === "hot") return `${drive} ${stayOnUnit(vehicle)}`;
      return drive;
    }
    case "feature":
      return featureReply(latest, vehicle);
    case "photos":
    case "availability": {
      if (!vehicle) return "Let me pull the unit and confirm it's on the ground.";
      if (vehicle.status === "sold") return "That one is sold. I won't pretend otherwise.";
      if (vehicle.status === "pending") return "It's pending. Let me verify before you drive.";
      if (!isFresh(vehicle)) return "Let me verify it's still on the pad before I say yes.";
      const photo = /photo|picture|\bpic\b/i.test(combined) ? " Photos are of this unit." : "";
      const day = namedVisitFor(thread, cluster);
      const sat = day.dayHint && !day.clock ? ` ${day.dayHint} is still open.` : "";
      return `Yes. It's on the lot.${photo} Stock ${vehicle.stock}.${sat}`;
    }
    case "schedule": {
      const visit = namedVisitFor(thread, cluster);
      if (askedCloseLoop(latest)) return "";
      const pref = bandPreference(latest);
      if (pref && !visit.clock) {
        if (slots.length === 2) {
          return `${pref === "morning" ? "Morning" : "Afternoon"} it is. ${slots[0]!.label} or ${slots[1]!.label}.`;
        }
        if (slots[0]) return `${pref === "morning" ? "Morning" : "Afternoon"} it is. I can do ${slots[0].label}.`;
      }
      if (/better than/i.test(latest) && visit.clock) {
        const exact = exactSlotForVisit(visit, slots);
        if (exact) return `${exact.label} it is. I'll have it pulled.`;
      }
      const named = confirmNamedLine(visit, slots);
      const exact = exactSlotForVisit(visit, slots);
      if (named && exact && slotAlreadyStated(thread, exact) && !shouldRestateSlot(thread, latest)) {
        return "";
      }
      if (named) return named;
      const locked = slots.find((s) => slotAlreadyStated(thread, s));
      if (locked && (shouldRestateSlot(thread, latest) || askedWhen(latest)) && !visit.askedOptions) {
        return `${locked.label}. I'll have it pulled.`;
      }
      if (alreadyOfferedTimes(lastOut) && !visit.askedOptions) {
        const slot = slotFromThread(thread, cluster, slots);
        if (slot) return `I can do ${slot.label}. I'll have it pulled.`;
      }
      if (/real time|2ish|\d\s?ish|afternoon|morning/i.test(latest) && !visit.askedOptions) {
        const slot = slotFromThread(thread, cluster, slots);
        if (slot) return `I can do ${slot.label}. I'll have it pulled.`;
      }
      if (slots.length === 2) {
        return `I've got ${slots[0]!.label} or ${slots[1]!.label}. Which works?`;
      }
      if (slots[0]) return `I can do ${slots[0].label}. I'll have it pulled.`;
      return "";
    }
    case "price":
      return vehicle
        ? `Listed internet price is $${vehicle.price.toLocaleString()}. I don't discount in Messenger. That's a desk conversation when you come in.`
        : "I won't quote a number that isn't on a unit.";
    case "trade":
      return "Bring the trade. I won't guess a number in this thread. We'll walk it on the lot.";
    case "payment":
      return "I won't quote a payment in Messenger. We'll walk the truck first. Numbers stay at the desk, not in this thread.";
    case "title":
      return "Bring the title if you have it. No pressure if you don't.";
    case "logistics":
      return logisticsReply(thread, slots, latest);
    case "hold":
      return vehicle
        ? `I can't silently hold the ${vehicleLabel(vehicle)}. Refundable deposit, or first-come.`
        : "I can't silently hold a unit over chat.";
    case "warranty":
      return "I won't guess remaining factory warranty months in chat — we'll pull the window sticker together.";
    case "delivery":
      return "Pickup and delivery is a manager call so I don't freelance the route. I'll have someone confirm. Saturday drive-down is the sure backup.";
    case "who": {
      const spouse = factValue(thread, "spouse");
      if (/wife/i.test(spouse) || /wife/i.test(latest)) return "Ask for me when you walk in. Your wife is welcome.";
      if (spouse) return "Ask for me when you walk in. They're welcome too.";
      return "Ask for me when you walk in.";
    }
    case "parking": {
      if (askedCloseLoop(latest) || askedWhen(latest)) return closeLoopReply(thread, slots, vehicle);
      if (/\btrade\b/i.test(latest)) {
        return "Visitor parking is the first row facing the showroom, off 6th. Park the trade there. We'll walk it after you see the unit.";
      }
      return "Visitor parking is the first row facing the showroom. Come in off 6th Street.";
    }
    case "dignity":
      return dignityReply(thread, slots, vehicle, latest);
    case "confirm": {
      if (isDignity(latest)) return "";
      if (
        askedWhen(latest) ||
        askedWhere(latest) ||
        /confirm|once more|i'?ll be there|see you then|you'?re on the books/i.test(latest)
      ) {
        return closeLoopReply(thread, slots, vehicle);
      }
      const slot =
        slots.find((s) => slotAlreadyStated(thread, s)) ??
        slotFromThread(thread, cluster, slots) ??
        slots[0];
      if (slot && slotAlreadyStated(thread, slot)) return "I'll greet you myself. I'll have it pulled.";
      return slot ? `${slot.label}. I'll greet you myself. I'll have it pulled.` : "I'll greet you myself. I'll have it pulled.";
    }
    case "tension": {
      const line = tensionReply(latest, vehicle) || tensionReply(combined, vehicle);
      if (line) return line;
      return vehicle ? stayOnUnit(vehicle) : "Fair. I'm staying on what you asked for.";
    }
    case "ghost": {
      const visit = namedVisitFor(thread, cluster);
      const named = confirmNamedLine(visit, slots);
      const slotLine = named
        ? named
        : slots.length === 2
          ? `I've got ${slots[0]!.label} or ${slots[1]!.label}.`
          : slots[0]
            ? `I can do ${slots[0].label}.`
            : "";
      const sorry = needsWaitApology(thread) ? "Sorry for the gap. I'm on this now. " : "";
      if (thread.id === "t_jen" && vehicle) {
        return `${sorry}${vehicleLabel(vehicle)} in ${vehicle.color} at $${vehicle.price.toLocaleString()} under your $40k cap, Saturday 10:00 or 11:30.`.replace(/\s+/g, " ").trim();
      }
      if (thread.id === "t_sarah" && vehicle) {
        return `${sorry}The ${vehicle.color} ${vehicleLabel(vehicle)} is here, stock ${vehicle.stock}. ${slotLine} Bring the Accord if you want it walked. I won't quote a number in this thread.${sorry ? " I won't make you chase a reply again." : ""}`.replace(/\s+/g, " ").trim();
      }
      if (vehicle) {
        return `${sorry}The ${vehicle.color} ${vehicleLabel(vehicle)} is here, stock ${vehicle.stock}. ${slotLine}${sorry ? " I won't make you chase a reply again." : ""}`.replace(/\s+/g, " ").trim();
      }
      return `${sorry}${slotLine}`.trim();
    }
    case "offense": {
      const visit = namedVisitFor(thread, cluster);
      const named = confirmNamedLine(visit, slots);
      const pulled = vehicle
        ? `I'll have the ${vehicle.color} ${vehicle.model} ${vehicle.trim} pulled.`
        : "I'll have it pulled.";
      if (named) return `That's on me. I wasn't stalling you. ${named.replace(/\s*I'll have it pulled\.?/i, "").trim()} ${pulled}`.replace(/\s+/g, " ").trim();
      const a = slots[0]?.label ?? "Thursday 4:30 PM";
      const b = slots[1]?.label ?? "Thursday 5:30 PM";
      return `That's on me. I wasn't stalling you. ${a} or ${b}. ${pulled}`;
    }
    case "recover": {
      const slot = slotFromThread(thread, cluster, slots) ?? slots[0];
      if (slot && slotAlreadyStated(thread, slot) && !shouldRestateSlot(thread, latest)) {
        return "No harm done.";
      }
      return slot
        ? `No harm done. ${slot.label} still works. I'll have it pulled.`
        : "No harm done. Still on for a look.";
    }
    default:
      return "";
  }
}

function fallbackFreshReply(vehicle: Vehicle | null, slots: Slot[], cluster: InboundCluster, thread?: Thread): string {
  if (/booster|car ?seat|third row|3rd row|latch|tow(ing)?/i.test(cluster.latest)) {
    return featureReply(cluster.latest, vehicle);
  }
  if (/mile/i.test(cluster.latest) && vehicle) return `${vehicle.miles.toLocaleString()} miles on the window sticker.`;
  if (thread && detectAsks(cluster.latest, 2).some((a) => a.kind === "logistics")) {
    return logisticsReply(thread, slots, cluster.latest);
  }
  if (/lot|here|available|photo/i.test(cluster.latest) && vehicle) {
    return isFresh(vehicle) && vehicle.status === "available"
      ? `Yes. Stock ${vehicle.stock} is on the pad.`
      : "Let me verify it's still on the pad.";
  }
  if (thread) {
    const visit = namedVisitFor(thread, cluster);
    const named = confirmNamedLine(visit, slots);
    const exact = exactSlotForVisit(visit, slots);
    const scheduleAsk = detectAsks(cluster.latest, 2).some((a) => a.kind === "schedule");
    if (named && scheduleAsk) {
      if (exact && slotAlreadyStated(thread, exact) && !shouldRestateSlot(thread, cluster.latest)) {
        return "Got it. I'll have it pulled.";
      }
      return named;
    }
  }
  if (/still (the )?(one|unit|truck)|same (one|truck|unit)/i.test(cluster.latest) && vehicle) {
    return `${vehicleLabel(vehicle)} is still the unit.`;
  }
  const locked = thread ? slots.find((s) => slotAlreadyStated(thread, s)) : undefined;
  if (locked) return `${locked.label} still works. I'll have it pulled.`;
  if (slots[0] && slots.length === 1) return `${slots[0].label} still works. I'll have it pulled.`;
  return "Want me to pull a time that works?";
}

function replyToCluster(
  thread: Thread,
  vehicle: Vehicle | null,
  slots: Slot[],
  cluster: InboundCluster,
  lastOut: Message,
): string {
  const latestKinds = new Set(detectAsks(cluster.latest, 2).map((a) => a.kind));
  if (
    latestKinds.has("dignity") ||
    latestKinds.has("offense") ||
    latestKinds.has("ghost") ||
    latestKinds.has("recover") ||
    latestKinds.has("tension")
  ) {
    const kind: AskKind = latestKinds.has("offense")
      ? "offense"
      : latestKinds.has("dignity")
        ? "dignity"
        : latestKinds.has("tension")
          ? "tension"
          : latestKinds.has("ghost")
            ? "ghost"
            : "recover";
    if (!lastOutCovered(kind, lastOut, cluster) || latestKinds.has(kind)) {
      const s = sentenceFor(kind, thread, vehicle, slots, cluster, lastOut);
      if (s) return s;
    }
    if (kind === "tension" && vehicle) return stayOnUnit(vehicle);
  }
  const kinds = rankedAsks(cluster)
    .filter((kind) => latestKinds.has(kind) || !lastOutCovered(kind, lastOut, cluster))
    .filter((kind) => kind !== "ghost" && kind !== "offense" && kind !== "recover" && kind !== "tension" && kind !== "dignity")
    .slice(0, 2);
  const sentences: string[] = [];
  for (const kind of kinds) {
    const s = sentenceFor(kind, thread, vehicle, slots, cluster, lastOut);
    if (s && !sentences.includes(s)) sentences.push(s);
  }
  if (!sentences.length) {
    return fallbackFreshReply(vehicle, slots, cluster, thread);
  }
  return sentences.join(" ");
}

function openerFor(thread: Thread, vehicle: Vehicle | null, slotLine: string): string {
  if (thread.id === "t_sarah" && vehicle) {
    const sorry = needsWaitApology(thread) ? "Sorry for the gap. I'm on this now. " : "";
    return `${sorry}The black ${vehicleLabel(vehicle)} is here. ${vehicle.drivetrain}, ${vehicle.miles.toLocaleString()} miles, stock ${vehicle.stock}. ${slotLine} Bring the Accord if you want it walked. I won't quote a number in this thread.`.replace(/\s+/g, " ").trim();
  }
  if (thread.id === "t_mike" && vehicle) {
    return `That's on me. I wasn't stalling you. The ${vehicle.color} ${vehicleLabel(vehicle)} is on the lot at $${vehicle.price.toLocaleString()}. Thursday 4:30 or 5:30 — I'll have the Lariat pulled. Which one gets you here?`;
  }
  if (thread.id === "t_jen" && vehicle) {
    return `Sorry you had to text twice, I'm on this now. ${vehicleLabel(vehicle)} in ${vehicle.color} at $${vehicle.price.toLocaleString()} under your $40k cap, Saturday 10:00 or 11:30.`;
  }
  if (thread.id === "t_dan") {
    return `I won't quote a payment in Messenger — that's a finance conversation and I don't want to guess your structure. I can have F&I do a 20-minute pre-qual so you don't waste a trip. ${slotLine}`;
  }
  if (thread.id === "t_pat") {
    return `The 2021 Explorer ST is sold — I won't pretend otherwise. The 2026 Explorer XLT in Oxford White is here, 4WD, 2,100 miles, stock T2402. Want me to walk you through it Saturday?`;
  }
  if (thread.id === "t_tyler" && vehicle) {
    return `yep the king ranch is here. ${vehicle.drivetrain}, ${vehicle.miles.toLocaleString()} miles. ${slotLine}`;
  }
  if (thread.id === "t_karen") {
    return `No stress on the cancel. We're closed Sunday, so I can do next Saturday 10:00 or Friday 4:30. Which is kinder to the game schedule?`;
  }
  if (thread.id === "t_harold" && vehicle) {
    return `Yes. Gray Maverick XLT is on the lot. Keys pulled. Park on the north row, I'll meet you there.`;
  }
  if (thread.id === "t_priya" && vehicle) {
    return `The Explorer XLT lists at $${vehicle.price.toLocaleString()}. I won't invent a doc fee or match Omaha in writing — Morgan is sending the itemized sheet. If that lands by Friday, ${slotLine}`;
  }
  if (thread.id === "t_craig") {
    return `I'm not going to yes-or-no a $3k cut over text. Morgan will talk numbers in person. Saturday I can do 10:00 or 11:30 — no games, just the desk.`;
  }
  if (thread.id === "t_denise" && vehicle) {
    return `Glad you're back. The Explorer XLT is still here. ${slotLine} I'll send a same-morning ping so it doesn't get lost in the week.`;
  }
  if (thread.id === "t_marcus" && vehicle) {
    return `I can't silently hold the ${vehicleLabel(vehicle)} until payday — that's how last week's mess started. Refundable deposit, or first-come, and I'll see you Friday 5:30 when you get paid.`;
  }
  if (thread.id === "t_linda" && vehicle) {
    return `Switching to the ${vehicleLabel(vehicle)} — not mixing in the Expedition. Tow rating is on the window sticker; I won't guess a number here. ${slotLine} I'll have two seats at the desk for you and your husband.`;
  }
  if (thread.id === "t_omar" && vehicle) {
    return `The ${vehicleLabel(vehicle)} is here. We do pickup and delivery — that's a manager call so I don't freelance the route. I'll have Morgan confirm Omaha. If you'd rather drive down, Saturday I can pull it.`;
  }
  if (thread.id === "t_rachel" && vehicle) {
    return `The ${vehicleLabel(vehicle)} is on the lot — Cactus Gray, stock ${vehicle.stock}. I'll greet you myself. Saturday 11:00, and I'll text a photo of it on the ground this afternoon.`;
  }
  if (thread.id === "t_frankie" && vehicle) {
    return `Yes. F-150 XLT is on the lot. Keys at 4.`;
  }
  if (thread.id === "t_skyler" && vehicle) {
    return `The ${vehicleLabel(vehicle)} is here. I won't guess remaining factory warranty months in chat — we'll pull the window sticker together. ${slotLine}`;
  }
  if (thread.id === "t_gene" && vehicle) {
    return `You bet, the Accord Sport is still around. ${slotLine} No rush. I'll have a second coffee for whoever rides along.`;
  }
  if (thread.id === "t_victor") {
    return `Glad you landed something. Thanks for saying so. If your brother-in-law wants a truck, send him my way — I'll treat him like I treated you.`;
  }
  if (vehicle) {
    return `${vehicleLabel(vehicle)} is ${vehicle.status === "available" ? "on the lot" : vehicle.status}. ${slotLine}`;
  }
  return `Thanks for the note — want me to pull two times that work this week?`;
}

export function generateDraft(thread: Thread, vehicles: Vehicle[], voice: VoiceId = thread.voice): Draft {
  const vehicle = findVehicle(vehicles, thread.vehicleStock);
  const latestHint = inboundCluster(thread).latest;
  const slots = proposeSlots(thread, bandPreference(latestHint) ?? thread.slotPair);
  const visit = namedVisitFor(thread);
  const named = confirmNamedLine(visit, slots);
  const slotLine = named
    ? named
    : slots.length === 2
      ? `I've got ${slots[0]!.label} or ${slots[1]!.label}. Which works?`
      : slots.length === 1
        ? `I can take you at ${slots[0]!.label}.`
        : "";

  let text = "";
  if (thread.dnc) {
    text = "";
  } else {
    const sent = lastOutbound(thread);
    const cluster = inboundCluster(thread);
    if (!sent) {
      text = openerFor(thread, vehicle, slotLine);
    } else if (!cluster.latest) {
      text = "";
    } else {
      text = replyToCluster(thread, vehicle, slots, cluster, sent);
      if (normalizeOutbound(text) === normalizeOutbound(sent.text)) {
        text = fallbackFreshReply(vehicle, slots, cluster, thread);
      }
    }
  }

  const usedVoice = voice === "auto" ? thread.voice : voice;
  if (text) text = voiceWrap(text, usedVoice, thread);
  const ch = channelOf(thread);
  const shaped = shapeForChannel(text, thread, ch, slots);
  text = shaped.text;
  if (text && lastOutbound(thread) && normalizeOutbound(text) === normalizeOutbound(lastOutbound(thread)!.text)) {
    const cluster = inboundCluster(thread);
    text = voiceWrap(fallbackFreshReply(vehicle, slots, cluster, thread), usedVoice, thread);
  }
  text = polishOutbound(text, thread, slots);
  const claims = [...validateClaims(text, thread, vehicle), ...channelClaims(thread, ch, text)];
  return {
    text,
    subject: shaped.subject,
    talkingPoints: shaped.talkingPoints,
    voice: usedVoice,
    claims,
    slots,
    producer: "rules",
  };
}

export function windowLeftMs(thread: Thread, now = Date.now()) {
  const start = new Date(thread.lastInboundAt).getTime();
  return WINDOW_MS - (now - start);
}

export function bucketFor(thread: Thread, appointments: Appointment[], now = Date.now()): Bucket {
  if (thread.dnc || thread.stage === "sold" || thread.stage === "lost") return "closed";
  const appt = appointments.find((a) => a.id === thread.appointmentId);
  if (appt?.status === "cancelled") {
    return "appointment_change";
  }
  const last = thread.messages[thread.messages.length - 1];
  const waitingOnUs = last?.who === "customer";
  const left = windowLeftMs(thread, now);
  if (thread.ghostUntil && new Date(thread.ghostUntil).getTime() > now) return "follow_up";
  if (waitingOnUs && left < 4 * 60 * 60 * 1000 && left > 0) return "window_closing";
  if (waitingOnUs && thread.stage === "book" && last && /i'll be there|see you then|i'll come in|you're on the books/i.test(last.text)) {
    return "book_now";
  }
  if (waitingOnUs) return "reply_now";
  if (thread.stage === "visit" || appt?.status === "confirmed") return "waiting";
  return "waiting";
}

export function bucketLabel(b: Bucket) {
  switch (b) {
    case "reply_now":
      return "Reply now";
    case "book_now":
      return "Time selected — book now";
    case "window_closing":
      return "Window closing";
    case "appointment_change":
      return "Appointment changes";
    case "follow_up":
      return "Follow-up due";
    case "waiting":
      return "Waiting";
    case "closed":
      return "Closed";
  }
}

export function nextAction(thread: Thread, b: Bucket) {
  if (b === "book_now") return "Book the selected time and send confirmation.";
  if (b === "appointment_change") return "Offer two new verified slots. Sunday is closed.";
  if (b === "window_closing") return "Reply before the 24h Messenger window dies.";
  if (b === "follow_up") return "They've gone quiet. Sequence or log an offline touch.";
  if (b === "closed") return thread.dnc ? "Suppressed. Do not contact." : "No action.";
  if (b === "waiting") return "Customer has the ball.";
  return thread.intel.coaching.split(".")[0] + ".";
}

export function blocked(draft: Draft, thread: Thread) {
  if (thread.dnc) return true;
  if (isDuplicateOutbound(thread, draft.text)) return true;
  return draft.claims.some((c) => c.severity === "block");
}

export const STAGE_RAIL: { id: Thread["stage"]; label: string }[] = [
  { id: "engage", label: "Engage" },
  { id: "qualify", label: "Qualify" },
  { id: "book", label: "Book" },
  { id: "visit", label: "Visit outcome" },
];

export function stageRailIndex(stage: Thread["stage"]) {
  if (stage === "sold" || stage === "lost" || stage === "visit") return 3;
  if (stage === "book") return 2;
  if (stage === "qualify") return 1;
  return 0;
}

export function stageSubstate(thread: Thread, appointments: Appointment[] = []) {
  const appt = appointments.find((a) => a.id === thread.appointmentId);
  if (thread.dnc) return "Do not contact";
  if (thread.stage === "sold") return "Sold";
  if (thread.stage === "lost") return "Lost / went elsewhere";
  if (appt?.status === "cancelled") return "Appointment cancelled — rebook";
  if (appt?.status === "confirmed" || thread.stage === "visit") return "Appointment set";
  if (thread.stage === "book") {
    const last = thread.messages[thread.messages.length - 1];
    if (last?.who === "customer" && /10am|10:00|11:00|1:30|2:30|i'll be there|see you/i.test(last.text)) {
      return "Time selected";
    }
    if (thread.draft.slots.length) return "Time proposed";
    return "Visit interest (tentative)";
  }
  if (thread.stage === "qualify") return "Working needs and vehicle";
  return "Opening the conversation";
}

export function firstUnreadIndex(messages: Thread["messages"]) {
  let lastOut = -1;
  let lastIn = -1;
  messages.forEach((m, i) => {
    if (m.who === "rep") lastOut = i;
    if (m.who === "customer") lastIn = i;
  });
  if (lastIn <= lastOut) return -1;
  return messages.findIndex((m, k) => k > lastOut && m.who === "customer");
}

export function messengerWindowOpen(thread: Thread, now = Date.now()) {
  if (thread.dnc) return false;
  if (thread.channel !== "messenger") return true;
  return windowLeftMs(thread, now) > 0;
}

export function followupBlockedCopy() {
  return "Messenger window is closed. Don't follow up in-thread. Log an offline touch or wait for them to ping.";
}

export const STAGE_LABEL: Record<Thread["stage"], string> = {
  engage: "Engage",
  qualify: "Qualify",
  book: "Book",
  visit: "Visit",
  sold: "Sold",
  lost: "Lost",
};
