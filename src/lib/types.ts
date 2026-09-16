export type Channel = "messenger" | "sms" | "email" | "phone" | "lot";
export type Role = "sales" | "bdc" | "bdc_manager" | "gsm" | "finance";
export type Stage = "engage" | "qualify" | "book" | "visit" | "sold" | "lost";
export type Bucket =
  | "reply_now"
  | "book_now"
  | "window_closing"
  | "appointment_change"
  | "follow_up"
  | "waiting"
  | "closed";
export type VehicleStatus = "available" | "pending" | "sold" | "hold";
export type ClaimSeverity = "ok" | "warn" | "block";
export type ApptStatus = "proposed" | "confirmed" | "completed" | "no_show" | "cancelled";
export type SequenceStatus = "active" | "paused" | "finished" | "replied";
export type CrmTarget = "vinsolutions" | "elead" | "drivecentric" | "dealersocket";
export type CrmPushStatus = "unsent" | "queued" | "sent" | "acked" | "failed";
export type CrmTrigger = "first_contact" | "book" | "manual" | "sold";
export type CallOutcome = "reached" | "voicemail" | "no_answer" | "busy";
export type PackageAudience = "finance" | "sales_manager";
export type PackageStatus = "sent" | "opened";

export type SlotPair = "default" | "morning" | "afternoon";
export type VoiceId = "auto" | "frank" | "celeste" | "jon" | "dogg" | "zee";

export type Intent =
  | "opt_out"
  | "sold_elsewhere"
  | "complaint"
  | "reschedule"
  | "hold"
  | "warranty"
  | "delivery"
  | "financing"
  | "trade"
  | "price"
  | "availability"
  | "schedule"
  | "vehicle_search"
  | "general";

export interface Rep {
  id: string;
  name: string;
  role: Role;
  title: string;
  email: string;
}

export interface Vehicle {
  stock: string;
  vin: string;
  year: number;
  make: string;
  model: string;
  trim: string;
  color: string;
  body: string;
  miles: number;
  price: number;
  status: VehicleStatus;
  drivetrain: string;
  source?: string;
  retrievedAt?: string;
  accidentHistory?: "none" | "reported";
  smoker?: boolean;
  priorOwners?: number;
  titleStatus?: "clean" | "salvage" | "rebuilt";
  thirdRow?: boolean;
  seats?: number;
  boosterOk?: boolean;
}

export interface Fact {
  id: string;
  key: string;
  value: string;
  certainty: "asked" | "preferred" | "required" | "tentative" | "confirmed";
  evidence: string;
  corrected?: boolean;
}

export interface Message {
  id: string;
  at: string;
  who: "customer" | "rep" | "ai" | "system";
  sender: string;
  channel: Channel;
  text: string;
  subject?: string;
}

export interface Claim {
  text: string;
  severity: ClaimSeverity;
  reason: string;
}

export interface Slot {
  id: string;
  at: string;
  label: string;
}

export interface Draft {
  text: string;
  voice: VoiceId;
  claims: Claim[];
  slots: Slot[];
  producer: "rules" | "grok" | "rep";
  subject?: string;
  talkingPoints?: string[];
}

export interface Moment {
  at: string;
  label: string;
  kind: "positive" | "risk" | "commit" | "objection";
  quote: string;
}

export interface Intel {
  score: number;
  sentiment: "positive" | "neutral" | "negative" | "mixed";
  propensityToShow: number;
  trend: "up" | "flat" | "down";
  trackers: string[];
  risks: string[];
  nextStepSet: boolean;
  coaching: string;
  moments: Moment[];
  talkRatio?: number;
}

export interface Thread {
  id: string;
  customerName: string;
  phone: string;
  email?: string;
  city: string;
  channel: Channel;
  outboundChannel?: Channel;
  source: string;
  assignedRepId: string;
  setterId?: string;
  stage: Stage;
  dnc: boolean;
  takeover: boolean;
  hint: string;
  vehicleStock: string | null;
  goal: string;
  missing: string;
  facts: Fact[];
  messages: Message[];
  demoScript: Array<string | { ghost: number }>;
  demoCursor: number;
  ghostUntil?: string | null;
  voice: VoiceId;
  voiceLocked?: boolean;
  voiceReason?: string;
  followupStage?: number;
  slotPair?: SlotPair;
  lastInboundAt: string;
  lastActivityAt: string;
  createdAt: string;
  appointmentId: string | null;
  sequenceEnrollmentId: string | null;
  intel: Intel;
  draft: Draft;
  emailSubject?: string;
  callPlacedAt?: string | null;
}

export interface Appointment {
  id: string;
  threadId: string;
  vehicleStock: string | null;
  at: string;
  status: ApptStatus;
  type: "test_drive" | "write_up" | "delivery" | "be_back";
  setterId: string;
  closerId: string;
  notes: string;
}

export interface SequenceStep {
  day: number;
  channel: Channel;
  title: string;
  template: string;
}

export interface Sequence {
  id: string;
  name: string;
  ownerRole: Role;
  purpose: string;
  steps: SequenceStep[];
}

export interface Enrollment {
  id: string;
  sequenceId: string;
  threadId: string;
  status: SequenceStatus;
  stepIndex: number;
  enrolledAt: string;
  nextAt: string;
}

export interface TranscriptLine {
  t: number;
  speaker: "rep" | "customer" | "manager";
  text: string;
  tracker?: string;
}

export interface CallRecording {
  id: string;
  threadId: string;
  title: string;
  durationSec: number;
  occurredAt: string;
  repId: string;
  score: number;
  talkRatio: number;
  questionsAsked: number;
  nextStepSet: boolean;
  trackers: { key: string; label: string; count: number; tone: "pos" | "neg" | "neu" }[];
  transcript: TranscriptLine[];
  coaching: string[];
}

export interface CrmPush {
  id: string;
  threadId: string;
  target: CrmTarget;
  status: CrmPushStatus;
  trigger: CrmTrigger;
  at: string;
  leadId: string;
  note: string;
  xml?: string;
}

export interface CommsPackage {
  id: string;
  threadId: string;
  audience: PackageAudience;
  toRepId: string;
  fromRepId: string;
  status: PackageStatus;
  sentAt: string;
  openedAt?: string;
  note: string;
}

export interface Dealer {
  name: string;
  address: string;
  timezone: string;
  hours: Record<string, string>;
  smsNumber: string;
  crmDealerId: string;
  crmTarget: CrmTarget;
}

export interface Assumptions {
  baselineMinutesPerReply: number;
  assistedMinutesAccept: number;
  assistedMinutesEdit: number;
  manualMinutes: number;
  loadedRepHourlyCost: number;
  appointmentShowRate: number;
  showCloseRate: number;
  grossPerUnit: number;
  valueOfPreventedFalseClaim: number;
}

export interface ExplainStep {
  step: string;
  label: string;
  detail: string;
  claims?: { text: string; verdict: string; note?: string }[];
}

export interface Classification {
  intent: Intent;
  sentiment: "angry" | "positive" | "negative" | "neutral";
  objection: string | null;
  confidence: number;
  signals: string[];
}

export interface AnalyzeResult {
  stored: boolean;
  customerName: string;
  intent: Intent;
  sentiment: Classification["sentiment"];
  objection: string | null;
  confidence: number;
  leadState: Stage;
  recommendedAction: string;
  nbaReason: string;
  voice: VoiceId;
  facts: Fact[];
  vehicle: Vehicle | null;
  draft: Draft;
  explain: ExplainStep[];
  booking: { slots: Slot[] } | null;
}

export type InterceptKind = "outbound_blocked" | "inbound_flagged";
export type InterceptStatus = "held" | "late" | "released";

export interface Intercept {
  id: string;
  threadId: string;
  customerName: string;
  at: string;
  kind: InterceptKind;
  channel: Channel;
  quote: string;
  sticker?: string;
  reason: string;
  savedMinutes: number;
  status: InterceptStatus;
  repId: string;
}
