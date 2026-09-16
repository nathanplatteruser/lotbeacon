import { DEALER, TEAM } from "./seed";
import { customerEmail, firstName } from "./channels";
import type { CrmPush, CrmPushStatus, CrmTarget, CrmTrigger, Dealer, Thread, Vehicle } from "./types";

export const CRM_TARGETS: Record<CrmTarget, { label: string; maker: string }> = {
  vinsolutions: { label: "VinSolutions", maker: "Cox Automotive" },
  elead: { label: "Elead CRM", maker: "CDK" },
  drivecentric: { label: "DriveCentric", maker: "DriveCentric" },
  dealersocket: { label: "DealerSocket", maker: "Tekion" },
};

export const CRM_TRIGGER: Record<CrmTrigger, string> = {
  first_contact: "First contact",
  book: "Appointment booked",
  sold: "Sold",
  manual: "Manual push",
};

export const CRM_STATUS: Record<CrmPushStatus, { label: string; tone: "muted" | "warn" | "ok" | "danger" }> = {
  unsent: { label: "Not in CRM", tone: "muted" },
  queued: { label: "Queued", tone: "warn" },
  sent: { label: "Sent", tone: "warn" },
  acked: { label: "Acked", tone: "ok" },
  failed: { label: "Failed", tone: "danger" },
};

export function leadIdFor(thread: Thread) {
  const digits = thread.phone.replace(/\D/g, "").slice(-4) || "0000";
  return `ZB-402-${digits}`;
}

export function lastName(full: string) {
  const parts = full.trim().split(/\s+/);
  return parts.length > 1 ? parts[parts.length - 1]! : full;
}

function xmlEscape(s: string) {
  return s.replace(/[&<>"']/g, (ch) => {
    if (ch === "&") return "&" + "amp;";
    if (ch === "<") return "&" + "lt;";
    if (ch === ">") return "&" + "gt;";
    if (ch === '"') return "&" + "quot;";
    return "&#39;";
  });
}

/** ADF 1.0 prospect XML. Demo-safe. One-way push — we do not pull VinSolutions. */
export function adfXml(opts: {
  thread: Thread;
  vehicle: Vehicle | null;
  dealer?: Dealer;
  repName: string;
  trigger: CrmTrigger;
  at?: string;
}) {
  const dealer = opts.dealer ?? DEALER;
  const t = opts.thread;
  const at = opts.at ?? new Date().toISOString();
  const v = opts.vehicle;
  const comments = [
    `${t.source}. ${t.goal}.`,
    `Channel: ${t.outboundChannel ?? t.channel}. Trigger: ${opts.trigger}.`,
    "Human-approved. No payment, trade value, or discount in-thread.",
    t.missing ? `Missing: ${t.missing}.` : "",
  ]
    .filter(Boolean)
    .join(" ");
  const repEmail = TEAM.find((r) => r.name === opts.repName)?.email ?? "desk@zoellner.example";

  const vehicleLines = v
    ? [
        `    <vehicle status="${v.status === "available" ? "used" : xmlEscape(v.status)}" interest="buy">`,
        `      <id>${xmlEscape(v.stock)}</id>`,
        `      <year>${v.year}</year>`,
        `      <make>${xmlEscape(v.make)}</make>`,
        `      <model>${xmlEscape(v.model)}</model>`,
        `      <vin>${xmlEscape(v.vin)}</vin>`,
        `      <stock>${xmlEscape(v.stock)}</stock>`,
        `      <trim>${xmlEscape(v.trim)}</trim>`,
        `      <colorcombination>`,
        `        <exteriorcolor>${xmlEscape(v.color)}</exteriorcolor>`,
        `      </colorcombination>`,
        `      <odometer status="used" units="mi">${v.miles}</odometer>`,
        `      <price type="offer" currency="USD">${v.price}</price>`,
        `    </vehicle>`,
      ]
    : [
        `    <vehicle interest="buy">`,
        `      <make>Ford</make>`,
        `      <comments>No unit pinned. Do not invent stock.</comments>`,
        `    </vehicle>`,
      ];

  const lines = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<?adf version="1.0"?>`,
    `<adf>`,
    `  <prospect status="new">`,
    `    <id sequence="1" source="LotBeacon">${xmlEscape(leadIdFor(t))}</id>`,
    `    <requestdate>${xmlEscape(at)}</requestdate>`,
    ...vehicleLines,
    `    <customer>`,
    `      <contact>`,
    `        <name part="first">${xmlEscape(firstName(t.customerName))}</name>`,
    `        <name part="last">${xmlEscape(lastName(t.customerName))}</name>`,
    `        <phone type="voice" time="nopreference">${xmlEscape(t.phone)}</phone>`,
    `        <email>${xmlEscape(customerEmail(t))}</email>`,
    `        <address>`,
    `          <city>${xmlEscape(t.city)}</city>`,
    `          <regioncode>NE</regioncode>`,
    `          <country>US</country>`,
    `        </address>`,
    `      </contact>`,
    `      <comments>${xmlEscape(comments)}</comments>`,
    `    </customer>`,
    `    <vendor>`,
    `      <id source="LotBeacon">${xmlEscape(dealer.crmDealerId)}</id>`,
    `      <vendorname>${xmlEscape(dealer.name)}</vendorname>`,
    `      <contact>`,
    `        <name part="full">${xmlEscape(opts.repName)}</name>`,
    `        <email>${xmlEscape(repEmail)}</email>`,
    `        <phone>${xmlEscape(dealer.smsNumber)}</phone>`,
    `        <address>`,
    `          <street>4115 N. 6th Street</street>`,
    `          <city>Beatrice</city>`,
    `          <regioncode>NE</regioncode>`,
    `          <postalcode>68310</postalcode>`,
    `          <country>US</country>`,
    `        </address>`,
    `      </contact>`,
    `    </vendor>`,
    `    <provider>`,
    `      <name part="full">LotBeacon</name>`,
    `      <service>HITL message assist</service>`,
    `      <url>https://lotbeacon.example</url>`,
    `      <email>adf@lotbeacon.example</email>`,
    `    </provider>`,
    `  </prospect>`,
    `</adf>`,
    ``,
  ];
  return lines.join("\n");
}

export function buildCrmPush(opts: {
  thread: Thread;
  vehicle: Vehicle | null;
  trigger: CrmTrigger;
  status?: CrmPushStatus;
  at?: string;
  note?: string;
  repName?: string;
}): CrmPush {
  const at = opts.at ?? new Date().toISOString();
  const repName = opts.repName ?? TEAM.find((r) => r.id === opts.thread.assignedRepId)?.name ?? "Desk";
  const xml = adfXml({
    thread: opts.thread,
    vehicle: opts.vehicle,
    dealer: DEALER,
    repName,
    trigger: opts.trigger,
    at,
  });
  return {
    id: `crm_${opts.thread.id}_${opts.trigger}_${at.slice(11, 19).replace(/:/g, "")}`,
    threadId: opts.thread.id,
    target: DEALER.crmTarget,
    status: opts.status ?? "queued",
    trigger: opts.trigger,
    at,
    leadId: leadIdFor(opts.thread),
    note: opts.note ?? `${CRM_TRIGGER[opts.trigger]} → ${CRM_TARGETS[DEALER.crmTarget].label}`,
    xml,
  };
}

export function latestPush(pushes: CrmPush[], threadId: string) {
  return [...pushes].reverse().find((p) => p.threadId === threadId) ?? null;
}

export function downloadAdf(filename: string, xml: string) {
  const blob = new Blob([xml], { type: "application/xml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
