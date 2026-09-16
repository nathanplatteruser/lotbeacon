/** Spot agents — computer-use / in-page UI grounding. Not a HeyGen product name. */

export type SpotClaim = { text: string; status: "ok" | "block"; source: string };

export const SPOT_CUSTOMER = {
  name: "Sarah Miller",
  city: "Beatrice, NE",
  listing: "Black 2026 Explorer Platinum · Marketplace",
  stock: "T2401",
};

export const SPOT_INBOUND =
  "Hey, is that black Explorer you posted still available? I've got a 2018 Accord to trade and could probably come Saturday.";

export const SPOT_DRAFT =
  "Yes — the black 2026 Explorer Platinum 4WD is on the lot (stock T2401, 1,840 mi, $57,990). Saturday 10:00 or 11:30. Bring the Accord. I won't quote a trade number in this thread — we'll walk it on the lot.";

export const SPOT_REPLY =
  "10:00 works. Do I need an appointment?";

export const SPOT_CONFIRM =
  "You're on the book Saturday 10:00. 4115 N. 6th, Beatrice. Bring the Accord and a driver's license. See you then.";

export const SPOT_CLAIMS: SpotClaim[] = [
  { text: "black 2026 Explorer Platinum 4WD", status: "ok", source: "CDK feed · T2401 · available" },
  { text: "$57,990 listed asking", status: "ok", source: "lot price · not a discount" },
  { text: "Saturday 10:00 or 11:30", status: "ok", source: "store hours Sat 8:00–15:00" },
  { text: "trade number in-thread", status: "block", source: "never — walked on the lot" },
];

export const SPOT_WHAT = {
  title: "What it is",
  lead: "A spot agent is sales language for a computer-use agent: software that looks at a screen, finds a control, and acts on it. Spot the last inbound. Spot the composer. Spot Send. The same loop as Anthropic Computer Use, OpenAI Operator, Microsoft Copilot Studio computer use, and in-page agents such as Superhuman Go.",
  bullets: [
    "It is not a HeyGen SKU. HeyGen ships Interactive Avatars, a Video Agent, HyperFrames, and an in-browser HeyGen Agent inside Superhuman Go. A solutions director talking about spotting UI is describing that category — an agent that grounds on visible controls instead of calling an API.",
    "Two architectures. Vision: screenshot → click at coordinates. DOM: read the page tree → fill a field. Both are “spot the button.” Neither is a Meta-approved way to drive a personal Facebook session.",
    "LotBeacon already does the useful half: a sidecar that drafts from inventory. The missing half on Marketplace is not stealth typing. It is a legal channel into the thread.",
  ],
};

export const SPOT_WHERE = {
  title: "Where it can go",
  paths: [
    {
      k: "Now · this demo",
      v: "A sidecar beside a synthetic Marketplace thread we own. It spots the last inbound, the composer, and Send. Copy and human paste work. Auto-type and auto-send refuse. A person still hits Send.",
    },
    {
      k: "Today · live stores",
      v: "Paste-in. The rep pastes the inbound into LotBeacon, gets a grounded draft, pastes it back into Messenger, and sends. Slow. The version a Ford compliance officer signs.",
    },
    {
      k: "v1.0 · official Page",
      v: "Named Facebook Page + Messenger Platform after App Review. Drafts flow through the Send API. HUMAN_AGENT 7-day tag applies because a human approves. No spotting required. This is the product.",
    },
    {
      k: "v1.1 · companion",
      v: "A desktop window beside Facebook — not injected into facebook.com. Queue the inbound (paste or a future read-only capture that legal signs). Verified draft. Rep still sends in Messenger. CARVID’s opposite: we do not drive the session.",
    },
    {
      k: "On the lot site",
      v: "HeyGen Interactive Avatar or any on-site agent belongs on zoellnerfordofbeatrice.com, not inside a personal inbox. Different room of the store.",
    },
    {
      k: "Internal tools",
      v: "Computer-use against the DMS, HomeNet, or vAuto — systems with no public API and that we have permission to operate — is a real automation job. Personal Facebook is not that job.",
    },
  ],
};

export const SPOT_COULD = {
  title: "What it could be",
  bullets: [
    "A LotBeacon companion that sits next to Marketplace and makes the 90-second paste-in loop feel like 15 seconds — without ever attaching to the Facebook cookie.",
    "Page inbox as the system of record, Marketplace as a paste-in overflow until Meta opens those threads. Honest about the gap instead of papering over it with a browser bot.",
    "If Meta ships a sanctioned Marketplace seller API or expands Meta Business Agent to personal seller threads, we take that API. We do not scrape our way there.",
    "HeyGen on the website: a face that can walk a shopper to Saturday 10:00, then hand the appointment to the same queue. Avatar is a channel. It is not a Facebook login.",
    "The thing it will not become: an agent that logs into someone’s Facebook, types like them, and hides that the words came from a model.",
  ],
};

export const SPOT_NEVER = [
  {
    t: "Log into a personal Facebook profile",
    d: "Messenger Platform is Pages only. There is no API for a personal inbox, friends list, or Marketplace seller thread on a profile. Session capture, saved passwords, and “act as you” CLIs are how accounts get disabled.",
  },
  {
    t: "Auto-type or auto-paste into messenger.com / facebook.com",
    d: "Meta Terms of Service §3.2.3 and the Automated Data Collection Terms forbid accessing or collecting data by automated means — including while logged in. Scripts, extensions, and computer-use agents that drive the Facebook UI are the disallowed means.",
  },
  {
    t: "Hide that a model wrote the reply",
    d: "HUMAN_AGENT exists so a person can answer outside 24 hours. Automated messages under that tag are a disallowed use. California and German automated-experience rules require disclosure. Mimicking human cadence so Meta “does not figure it out” is the intent element of the same violation.",
  },
  {
    t: "Ship CARVID’s architecture under our name",
    d: "Live in the personal thread today, send without asking, from the rep’s Facebook session. Fast. Unsanctioned. One sweep and the profile is gone. We price against that risk, not against that speed.",
  },
];

export const SPOT_SIGNALS = [
  {
    k: "Input fingerprint",
    v: "Paste vs keypress, inter-key timing, no pointer wander. Meta’s privacy policy lists mouse movement as a signal that helps tell humans from bots.",
  },
  {
    k: "Session shape",
    v: "Extension IDs, automation CDP, headless flags, identical drafts across accounts, 24/7 reply latency no human desk hits.",
  },
  {
    k: "Policy, not just telemetry",
    v: "Even a perfect human impression still violates automated-access terms if a program drove the UI. Hiding the program is not a loophole. It is the violation.",
  },
  {
    k: "What actually stays legal",
    v: "A person reads a grounded draft, pastes it, and taps Send. Volume still has to look like a desk. The firewall is why we bother — not stealth.",
  },
];

export const SPOT_SOURCES = [
  "Meta Messenger Platform policy — HUMAN_AGENT allowed usages; automated messages disallowed",
  "Meta Human Agent feature — App Review, business verification, 7-day window for human replies",
  "Facebook Terms of Service 3.2.3 — no automated access, including while logged in",
  "Meta Automated Data Collection Terms — Platform APIs are the only allowable programmatic access",
  "Meta Privacy Policy — device signals include whether the mouse is moving",
  "Anthropic Computer Use, OpenAI Operator / CUA, Microsoft Copilot Studio computer use (2025–2026)",
  "HeyGen Interactive Avatar, Realtime API + visible Chrome, Superhuman Go in-page HeyGen Agent — not Facebook login",
  "CARVID / FB Auto Reply — browser-session Marketplace auto-reply, policy risk already on /compare",
];
