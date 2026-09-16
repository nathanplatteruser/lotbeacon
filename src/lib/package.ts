import { TEAM } from "./seed";
import { bucketFor, findVehicle, nextAction, STAGE_LABEL, vehicleLabel } from "./engine";
import { communicationSignals } from "./signals";
import { money, miles } from "./format";
import type {
  Appointment,
  CommsPackage,
  PackageAudience,
  Rep,
  Thread,
  Vehicle,
} from "./types";

export const PACKAGE_AUDIENCE: Record<
  PackageAudience,
  {
    label: string;
    short: string;
    forParam: "finance" | "gsm";
    role: Rep["role"];
    verb: string;
    kicker: string;
  }
> = {
  finance: {
    label: "Finance",
    short: "F&I",
    forParam: "finance",
    role: "finance",
    verb: "Send to finance",
    kicker: "Pencil after they sit. Nothing in this thread is a quote.",
  },
  sales_manager: {
    label: "Sales manager",
    short: "GSM",
    forParam: "gsm",
    role: "gsm",
    verb: "Send to sales manager",
    kicker: "Live deal. Movement updates as the setter keeps working it.",
  },
};

export function destFor(audience: PackageAudience): Rep | undefined {
  return TEAM.find((r) => r.role === PACKAGE_AUDIENCE[audience].role);
}

export function audienceFromSearch(forParam?: string): PackageAudience {
  return forParam === "finance" ? "finance" : "sales_manager";
}

export function briefPath(threadId: string, audience: PackageAudience) {
  return `/app/brief/${threadId}?for=${PACKAGE_AUDIENCE[audience].forParam}`;
}

export function briefHref(threadId: string, audience: PackageAudience) {
  if (typeof window === "undefined") return briefPath(threadId, audience);
  return `${window.location.origin}${briefPath(threadId, audience)}`;
}

export function latestPackage(packages: CommsPackage[], threadId: string, audience?: PackageAudience) {
  const rows = packages
    .filter((p) => p.threadId === threadId && (audience ? p.audience === audience : true))
    .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
  return rows[0] ?? null;
}

export function unreadForRep(packages: CommsPackage[], repId: string) {
  return packages.filter((p) => p.toRepId === repId && p.status === "sent").length;
}

const SAID = {
  payment: /payment|\$\d[\d,]*\s*(\/|a)\s*mo|a month|monthly/,
  tradeValue: /trade (value|allowance)|we can give|i'll give you/,
  otd: /out the door|otd|doc fee/,
  discount: /off today|discount|come down \d/,
  financing: /financ|credit|pre-qual|prequal/,
};

export function threadSaid(thread: Thread) {
  const blob = thread.messages.map((m) => m.text.toLowerCase()).join(" \n ");
  return {
    payment: SAID.payment.test(blob),
    tradeValue: SAID.tradeValue.test(blob),
    otd: SAID.otd.test(blob),
    discount: SAID.discount.test(blob),
    financing: SAID.financing.test(blob),
  };
}

export function buildBrief(
  thread: Thread,
  vehicles: Vehicle[],
  appointments: Appointment[],
  audience: PackageAudience,
) {
  const vehicle = findVehicle(vehicles, thread.vehicleStock);
  const sig = communicationSignals(thread);
  const appt = appointments.find((a) => a.id === thread.appointmentId);
  const bucket = bucketFor(thread, appointments);
  const said = threadSaid(thread);
  const lastTurns = thread.messages.filter((m) => m.who !== "system").slice(-6);
  const notSaid: string[] = [];
  if (!said.payment) notSaid.push("No payment quoted");
  if (!said.otd) notSaid.push("No OTD / doc fee");
  if (!said.tradeValue) notSaid.push("No trade value");
  if (!said.discount) notSaid.push("No discount");
  const financeFocus = thread.facts.filter((f) =>
    /trade|payment|budget|who|vehicle|spouse|kids|process|drivetrain|use_case|credit|purchase_timing|show_intent|timing|visit/.test(f.key),
  );
  return {
    audience,
    meta: PACKAGE_AUDIENCE[audience],
    dest: destFor(audience),
    vehicle,
    vehicleLine: vehicle
      ? `${vehicleLabel(vehicle)} · ${vehicle.color} · ${vehicle.drivetrain} · ${miles(vehicle.miles)} · stock ${vehicle.stock}`
      : "No unit attached",
    sticker: vehicle ? money(vehicle.price) : null,
    sig,
    appt,
    next: nextAction(thread, bucket),
    stage: STAGE_LABEL[thread.stage],
    said,
    notSaid,
    financeFocus: financeFocus.length ? financeFocus : thread.facts,
    lastTurns,
    closer: TEAM.find((r) => r.id === thread.assignedRepId),
    setter: TEAM.find((r) => r.id === thread.setterId),
  };
}
