/** Solutions brief for a rural Nebraska Ford floor. Numbers match the existing pessimistic model. */

export const MODEL_NOTE = "Model, not a paid rooftop.";

export const IMPACT_STORE = {
  name: "Zoellner Ford of Beatrice",
  city: "Beatrice, NE",
  county: "Gage County",
  address: "4115 N. 6th Street",
  population: "~12,000 in town · ~21,000 in the county",
  drive: "40 minutes to Lincoln Ford stores · 90 to Omaha",
  hours: "Mon–Fri 8–6 · Sat 8–3 · Sun closed",
  floor: "6 reps who are also the BDC. No overnight desk.",
  mix: "F-150, Super Duty, Explorer, Expedition, Bronco, Maverick — Ford and Lincoln, plus trades",
  channel: "Facebook Marketplace is the actual inbox. OEM form leads are thinner out here.",
  northStar: "In-person Saturday demo. Not a chat close. Not a payment quoted in Messenger.",
};

export const IMPACT_JOB = {
  title: "The job to be done",
  lead: "A rural Ford owner does not need a better paragraph. He needs the people already on his floor to turn “is this still available?” into a truck that is actually here, at a time a farm or ranch household can drive 20–40 minutes, without inventing a number the county will repeat at breakfast.",
  bullets: [
    "Reps already spend several hours a day on keyboards: posting, reading, retyping, double-checking, chasing quiet threads.",
    "The close happens on the lot. Rural walk-in close on a showed appointment is 50–70%; internet close without a visit is 6–8%. The thread’s only job is the visit.",
    "After supper is when the DMs arrive. The store is closed. Lincoln is still open, or a bot is.",
    "One invented “$400 a month” does not stay in the thread. It becomes the story at church, the co-op, and the next trade.",
    "Hiring a dedicated BDC in Gage County is a $45–60k loaded bet that also has to answer the phone — and can leave for Lincoln.",
  ],
};

export type PathId = "today" | "bdc" | "autopilot" | "stealth" | "hitl";

export const IMPACT_PATHS: {
  id: PathId;
  name: string;
  verdict: "pursue" | "later" | "refuse" | "never" | "status";
  sticker: string;
  cost: string;
  time: string;
  fit: string;
  risk: string;
  why: string;
}[] = [
  {
    id: "today",
    name: "Keep typing",
    verdict: "status",
    sticker: "Status quo",
    cost: "$0 software · ~33 messaging hours / rep / month",
    time: "47 min median first reply · after-hours sit until open",
    fit: "What the floor does now. Marketplace on a personal login. Hours on the glass, not the lot.",
    risk: "43% of internet leads mishandled. 44% of reps quit after one follow-up. Lincoln answers first.",
    why: "Free in cash, expensive in Saturday slots. Do nothing and the next town’s speed becomes your showroom’s empty chairs.",
  },
  {
    id: "bdc",
    name: "Hire a BDC coordinator",
    verdict: "later",
    sticker: "People, not software",
    cost: "~$45–60k loaded / year · $3.8–5k / month",
    time: "Can hit a 5-minute SLA if they sit the queue and the phones",
    fit: "Right when phone volume justifies a body. Hard to recruit and keep in Beatrice.",
    risk: "Turnover. The playbook walks out the door. Still types every reply by hand unless you also buy a desk.",
    why: "Pursue when you also need the phone covered. Do not hire a person just to retype Marketplace. Pair with HITL if you hire.",
  },
  {
    id: "autopilot",
    name: "Autonomous message agent",
    verdict: "refuse",
    sticker: "Conversica / Impel / “AI that sends”",
    cost: "from ~$595 / month · 12-month lock-ins common",
    time: "Seconds. 24/7. Highest claimed hours back.",
    fit: "Wrong for a county where the owner’s name is on the building.",
    risk: "Invented payments and sold units. Meta 24-hour bot window. Town reputation. Impel is in 3,000+ Ford stores — that is their risk, not a reason to copy it.",
    why: "The extra hours are real. The extra sentences are not yours. A rural Ford store cannot afford a bot that “sold” an Explorer for $1.",
  },
  {
    id: "stealth",
    name: "Stealth spot agent",
    verdict: "never",
    sticker: "Computer-use on a personal Facebook login",
    cost: "Hidden · account loss is the invoice",
    time: "Would type into messenger.com so Meta “does not figure it out.”",
    fit: "The rural channel is Marketplace on a personal profile. That is exactly the surface Meta forbids automating.",
    risk: "ToS 3.2.3, Automated Data Collection Terms, HUMAN_AGENT abuse, detection, ban. The lot’s Facebook is the lot’s lot.",
    why: "Never. HITL sidecar may copy. A person pastes and sends. Official path is a named Page + Messenger Platform.",
  },
  {
    id: "hitl",
    name: "HITL message assist",
    verdict: "pursue",
    sticker: "LotBeacon · human Send · claim firewall",
    cost: "$129 / $399 / $1,190 month-to-month",
    time: "7 min → 2.5 min to read, tweak, approve. Drafts overnight, send at 8 AM.",
    fit: "Six people who already sell. No new headcount. Voice stays the store’s. Inventory is the only source of vehicle claims.",
    risk: "Adoption (they have to open the queue). Rubber-stamp (they have to read). After-hours still wait until open. Paste-in on Marketplace until Page API.",
    why: "The only option that gives hours back without giving the county a bot. Time is recovered. Judgment stays on the floor. That is the product.",
  },
];

export const IMPACT_HOURS = [
  { activity: "Posting Marketplace listings", before: 8.7, after: 8.7, delta: "0", note: "Out of scope v1. We start when the DM arrives." },
  { activity: "Reading, researching, typing DMs", before: 17.5, after: 6.2, delta: "−11.3", note: "150 replies / month. 7 min → 2.5 min to read, tweak, approve." },
  { activity: "Double-checking tone / price / availability", before: 1.5, after: 1.0, delta: "−0.5", note: "Financing and trade routed with context. Send locks on invent." },
  { activity: "Follow-ups on quiet leads", before: 3.8, after: 1.5, delta: "−2.3", note: "44% of reps quit after one try. 3-nudge, one click each." },
  { activity: "CRM / tracking", before: 1.5, after: 0.3, delta: "−1.2", note: "14% of leads never get logged. ADF fires on first send and on book." },
];

export const IMPACT_FUNNEL = [
  { stage: "Contacted", beforePct: 63, afterPct: 78, beforeN: "18.9", afterN: "23.4", why: "No lead sits unanswered. Still needs the customer to answer." },
  { stage: "Appointment set", beforePct: 26, afterPct: 37, beforeN: "7.9", afterN: "11.2", why: "Two verified Saturday slots. Phone-lead benchmark is 75%; we claim far less." },
  { stage: "Showed", beforePct: 15, afterPct: 22, beforeN: "4.6", afterN: "6.7", why: "Barely moved on purpose. Rural show can run 70–80%; we model 60%." },
  { stage: "Sold", beforePct: 6.3, afterPct: 9.3, beforeN: "1.9", afterN: "2.8", why: "Close rate on the floor held flat at 41%. Closing happens on the lot." },
];

export const IMPACT_RATES = [
  ["Contact rate", "63%", "78%", "No lead sits unanswered. Still needs the customer to answer."],
  ["Set rate of contacted", "42%", "48%", "Two verified slots. Phone-lead benchmark is 75%; we claim far less."],
  ["Show rate", "58%", "60%", "Barely moved on purpose. Rural show is often higher; we do not take the gift."],
  ["Close rate (showed)", "41%", "41%", "Held flat. Agentic assist does not make the rep a better closer."],
  ["Lead → sold", "6.3%", "9.3%", "Industry internet close ~6%. We stay under the 12–18% sub-5-minute responders report."],
];

export const IMPACT_TILES = [
  { k: "Rep hours back / month", before: "0 h", after: "15 h", d: "33 h → 18 h on messaging, same lead volume. ~2 selling days." },
  { k: "Units / rep / month, same leads", before: "1.9", after: "2.8", d: "+0.9 from speed, no dropped leads, two-slot booking. Close rate held flat. That’s +47%." },
  { k: "Store gross / month, 6 reps", before: "—", after: "+$12.6k–$25.9k", d: "At $2,400 gross/unit. Low = same volume. High = +33% conversations with the hours they got back." },
  { k: "Conversations per rep-hour", before: "8.6", after: "~24", d: "2.8× with a verified draft. Same headcount. The SaaS return is capacity, not magic close rate." },
  { k: "Messenger foot traffic / store", before: "28 shows", after: "40–54", d: "+45%. Paid leads actually worked 57% → ~100%." },
  { k: "Autonomous sends", before: "0", after: "0", d: "A person still hits Send. Ever. That is the product, not a toggle." },
];

export const IMPACT_SCORES = [
  {
    who: "Owner / GM",
    cares: "Units per month. Then gross. Then whether the county still trusts the store.",
    rows: [
      ["Units / rep / month", "1.9", "2.8"],
      ["Units / store / month, 6 reps", "11.4", "16.8"],
      ["…if freed hours → +33% conversations", "11.4", "22.2"],
      ["Gross added / month", "—", "$12.6k–25.9k"],
      ["Unsupported claims sent", "unknown", "0 by design"],
      ["Autonomous sends", "n/a", "0"],
    ],
  },
  {
    who: "Sales reps",
    cares: "Shows, close rate, time spent on what pays — the lot, not the glass.",
    rows: [
      ["Median first reply", "47 min", "< 5 min"],
      ["Shows / rep / month", "4.6", "6.7"],
      ["Hours on messaging / month", "33", "18"],
      ["Conversations one rep can carry", "30", "40–60"],
      ["Replies per rep-hour", "8.6", "~24"],
      ["Leads dropped / mishandled", "43%", "≈ 0"],
    ],
  },
  {
    who: "Marketing / BDC",
    cares: "Qualified bodies on the floor. Saturday traffic. The Page’s reputation.",
    rows: [
      ["Paid leads actually worked", "57%", "~100%"],
      ["After-hours leads in window", "rarely", "drafted by 8 AM"],
      ["Shows / store / month", "28", "40–54"],
      ["“Very responsive” badge", "no", "in reach"],
      ["Cost per worked lead", "1.75×", "≈ 1.0×"],
      ["Opt-outs + audit", "manual", "automatic"],
    ],
  },
];

export const IMPACT_WEEK = [
  { day: "Sun", open: "Closed", inbound: "All day", note: "DMs arrive. Nothing leaves until Monday 8:00." },
  { day: "Mon", open: "8–6", inbound: "After supper 6:30–9", note: "First-of-week catch-up fights the leftover Sunday pile." },
  { day: "Tue", open: "8–6", inbound: "After supper", note: "Typical rural ping: “still available?” while the lot is dark." },
  { day: "Wed", open: "8–6", inbound: "After supper", note: "Same. Drafts can wait at the top of the queue at open." },
  { day: "Thu", open: "8–6", inbound: "After supper", note: "Thursday 4:30 / 5:30 is the weekday demo pair." },
  { day: "Fri", open: "8–6", inbound: "Evening heavier", note: "Weekend intent shows up here. Two Saturday slots, not a brochure." },
  { day: "Sat", open: "8–3", inbound: "Afternoon + evening", note: "The demo day. After 3 the floor is gone. The phone is not." },
];

export const IMPACT_SCENE = {
  before: [
    { t: "Tue 5:42 pm", who: "Dan · Fairbury", text: "Is that 2023 F-150 XLT still available?" },
    { t: "Tue 6:00 pm", who: "Store", text: "Closed. The ping sits on a personal Facebook login." },
    { t: "Tue 9:10 pm", who: "Dan", text: "Messages a Lincoln store that answers." },
    { t: "Wed 8:12 am", who: "Rep", text: "Types seven minutes while a first-up waits on the lot. Dan is already gone. Never hits the CRM." },
  ],
  after: [
    { t: "Tue 5:42 pm", who: "Dan · Fairbury", text: "Is that 2023 F-150 XLT still available?" },
    { t: "Tue 5:43 pm", who: "LotBeacon", text: "Draft grounded on stock F2201. Pending. Two Thursday slots. No payment. No stealth send. ADF waits for a person." },
    { t: "Wed 8:00 am", who: "Rep", text: "Reads it. Tweaks one line. Hits Send. Two and a half minutes. First-contact ADF queues to VinSolutions." },
    { t: "Thu 4:30 pm", who: "Dan", text: "On the lot. The truck is actually here. Book ADF already in the desk log. Close rate is still the closer’s." },
  ],
};

export type TradeKind = "accept" | "mitigate" | "refuse";

export const IMPACT_TRADES: {
  kind: TradeKind;
  title: string;
  cost: string;
  keep: string;
}[] = [
  {
    kind: "accept",
    title: "After-hours still wait until open",
    cost: "A 10 pm shopper can still buy from Lincoln tonight. We will not auto-send into a dark store to steal that unit.",
    keep: "Drafts sit at the top of the queue at 8:00. HUMAN_AGENT 7-day window because a person still approves. Reputation > one ghosted evening.",
  },
  {
    kind: "accept",
    title: "Marketplace stays paste-in for now",
    cost: "The rural channel is a personal profile. There is no clean two-way API. Extra clicks vs a Page inbox.",
    keep: "Compliant. The sidecar copies; it does not type. Named Page + Messenger Platform is v1.0, not a stealth workaround.",
  },
  {
    kind: "accept",
    title: "ADF is outbound only",
    cost: "We push a prospect into VinSolutions. We do not pull their desk log, dual-write notes, or replace the CRM.",
    keep: "14% of leads never get logged. First-contact and book fire the XML. A person can still hit Push ADF. The objection “not in my CRM” dies without selling a second system of record.",
  },
  {
    kind: "accept",
    title: "Voice is talking points, not a phone bot",
    cost: "Numa and Toma own the inbound line. We will not auto-dial Beatrice to steal hours.",
    keep: "You dial. We log reached / voicemail / no-answer. Talking points carry the same blocks: no payment, no Sunday, no invented stock. ADF if they book.",
  },
  {
    kind: "mitigate",
    title: "Reps have to open the queue",
    cost: "If they ignore it, the 15 hours do not come back. Software cannot recover a floor that will not look.",
    keep: "One next action per row. J/K, Send & next. Pilot the pod that already lives in Messenger, not the holdouts first.",
  },
  {
    kind: "mitigate",
    title: "Rubber-stamp risk",
    cost: "A tired closer can hit Send without reading. In a county of 21,000 that sentence is public.",
    keep: "Send locks on price, payment, sold units, Sunday hours, discounts. Voice set to Midwest neighbor, not city-store English.",
  },
  {
    kind: "mitigate",
    title: "Does not answer the phone",
    cost: "HITL is not a BDC hire. Inbound calls, service drive, and walk-ups are untouched.",
    keep: "Buy this to stop retyping DMs. Hire a coordinator later if phone volume justifies a body — same playbook.",
  },
  {
    kind: "mitigate",
    title: "SMS quiet hours and 10DLC",
    cost: "A 10 pm shopper can still be texted. TCPA is 8 am–9 pm Central. First SMS to a Marketplace number is a warn, not a silent blast.",
    keep: "Same claim firewall as Messenger. STOP is forever. Store-identified. Segments counted. The county will remember a midnight text more than a missed unit.",
  },
  {
    kind: "mitigate",
    title: "Capacity can outrun judgment",
    cost: "2.8× conversations per hour can become worse conversations if they skip the read.",
    keep: "We model +33% volume in the high case, not the 3× the math allows. Close rate held flat on purpose.",
  },
  {
    kind: "refuse",
    title: "Autonomous send, stealth type, invented numbers",
    cost: "Highest claimed hours. Highest chance the county learns the store from a sentence nobody would have said out loud.",
    keep: "Zero autonomous sends. Zero computer-use into facebook.com. Zero payments, trade values, or discounts in-thread.",
  },
  {
    kind: "refuse",
    title: "Replacing the closer",
    cost: "Vendors will sell “AI that books and sells.” Closing a Ford in Beatrice is still a person, a truck, and a desk.",
    keep: "Assist the reply. Route financing, trade, holds. The appointment is the handoff, not the close.",
  },
];

export const IMPACT_FEATURES: {
  id: string;
  name: string;
  who: string;
  threadId: string;
  does: string;
  doesNot: string;
  hitl: string;
  prove: string;
}[] = [
  {
    id: "sms",
    name: "SMS · store 10DLC",
    who: "Jen Alvarez · website VDP · Beatrice",
    threadId: "t_jen",
    does: "Same verified draft, cut to two sentences, STOP footer on first outbound, segment count on the glass. Mirror a Marketplace ping onto the number a farm household actually answers.",
    doesNot: "Blast. Quiet-hours stealth. A second personality. A bot that texts after 9 pm because Lincoln would.",
    hitl: "Human Send. 10DLC identified as Zoellner Ford of Beatrice. STOP is forever.",
    prove: "Open Jen. Compose stays on SMS. Send. Or hop Sarah from Messenger to SMS and read the first-outbound warn.",
  },
  {
    id: "email",
    name: "Email · subject + body",
    who: "Priya Raman · Cars.com · Omaha commute",
    threadId: "t_priya",
    does: "Subject line, store signature, hours, the same claim firewall. The paper trail a fee interrogator asked for — without inventing a doc fee or matching Omaha in writing.",
    doesNot: "OTD quotes. Payment letters. A drip that sends itself at 6:02 am.",
    hitl: "Human Send. Payments and OTD still blocked. Manager sheet stays a manager sheet.",
    prove: "Open Priya. Subject is already there. Send. CRM row is waiting on VinSolutions ack.",
  },
  {
    id: "voice",
    name: "Voice · talking points",
    who: "Rachel Kim · angry be-back · Lincoln",
    threadId: "t_rachel",
    does: "Opener, inventory facts, two times, the blocks. Log reached / voicemail / no-answer / busy. The call is still a person. ADF if they book.",
    doesNot: "Auto-dial. A voice agent. A voicemail essay. “An AI drafted this.”",
    hitl: "You dial. We log. Talking points carry the same inventory firewall as Messenger.",
    prove: "Open Rachel. Stays on CALL. Log Reached. ADF queues. You never hear a bot.",
  },
  {
    id: "adf",
    name: "CRM push · ADF 1.0",
    who: "Sarah Miller · first contact + Saturday book",
    threadId: "t_sarah",
    does: "Prospect XML into VinSolutions (Elead / DriveCentric / DealerSocket ready). Fires on first human send, on book, on sold, or when a person hits Push ADF. Preview the XML. Ack comes back in the log.",
    doesNot: "Pull the CRM. Dual-write every note. Replace VinSolutions. Invent a lead that nobody sent.",
    hitl: "A person still owns the thread. The desk log and the CRM agree because a human made the contact.",
    prove: "Sarah starts unsent. Send once — first_contact queues, sends, acks. Book — a second ADF. Admin has the log.",
  },
  {
    id: "package",
    name: "Comms package · one-page brief",
    who: "Sarah Miller · Saturday Explorer · in process",
    threadId: "t_sarah",
    does: "One click sends a live one-page to the GSM or F&I. Show-likelihood, facts, last turns, next step. Copy a link. They open it and are current before they walk the lot — movement keeps updating while the setter works.",
    doesNot: "An email blast. Dual-write into VinSolutions. Auto-notify when a draft exists. A bot briefing the floor.",
    hitl: "A person hits Send package. The recipient opens the brief. Nothing leaves the store without a click.",
    prove: "Open Sarah. Send to sales manager. Open the one-page. Watch show-likelihood on the brief.",
  },
];

export const IMPACT_CALL = {
  verdict: "Pursue HITL message assist. Refuse autonomy and stealth. Hire a BDC only when the phone needs a body.",
  because: [
    "The constraint is typing time and dropped Marketplace pings, not close skill. Holding close rate flat is the honest model.",
    "A rural store cannot spend reputation to buy seconds. Autopilot’s hours-back are real; the sentences are not the owner’s.",
    "A BDC hire is the right second move, not the first. $1,190/month Rooftop vs ~$4,000/month loaded. One extra unit a month at $2,400 gross pays for Rooftop twice over. The pessimistic model already shows +0.9 units per rep on the same 30 leads.",
    "Marketplace is where Beatrice actually lives. Paste-in + HITL sidecar is the legal on-ramp. Page API is the product. Logging into a personal Facebook so Meta cannot tell is never the product.",
    "SMS, email, and voice talking points are the same draft on the channel the household actually uses. The phone bot is not this product.",
    "ADF closes the “not in my CRM” objection without replacing VinSolutions. First contact and book write the prospect. 14% never-logged is the hole; outbound XML is the patch.",
    "A one-page comms package is the Saturday handoff. Finance pencils after they sit. The GSM opens a live brief instead of hunting Messenger. A person still clicked Send.",
    "Saturday showed appointments are the north star. Messages sent, ‘engagement,’ and bot-handled contact counts are not.",
  ],
  pilot: [
    "90 days, month to month, one Crew ($399, five seats) that already lives in Messenger.",
    "Compare their first-reply, shows, unsupported-claim count, and CRM-logged rate to the rest of the floor. Assumptions stay editable.",
    "Success: median first reply under 5 minutes during open hours; after-hours drafted by open; 0 unsupported claims sent; Saturday shows up; first-contact ADF acked.",
    "Kill criteria: queue ignored after two weeks of coaching; Send used as a stamp; anyone asking to “just let it send.”",
  ],
  sequence: [
    { n: "0", t: "Now", d: "Paste-in companion + HITL sidecar. Messenger, SMS (store 10DLC), email, voice talking points. Human Send. ADF queued on first contact and on book. One-click comms package to F&I and the GSM." },
    { n: "1", t: "v1.0", d: "Named Page, App Review, Messenger Platform. Live ADF to VinSolutions / Elead / DriveCentric / DealerSocket — the desk already shows the XML." },
    { n: "2", t: "v1.1", d: "Marketplace HITL companion in the queue. Desktop sidecar copies. Still no auto-type." },
    { n: "3", t: "Not this", d: "Phone bot (Numa-class) is not the product. Hire a coordinator if the inbound line needs a body. Pair them with this desk." },
  ],
};

export const IMPACT_HELD = {
  flat: "close rate on the showroom floor (41%); Marketplace posting time; any lift from the six reply styles; any lift from the momentum tracker or buddy notes; service, referral and repeat-buyer effects; rural show-rate gift (often 70–80%, we model 60%).",
  against:
    "assisted reply time 2.5 min (demo measures 1.5–3.0); set rate 48% (phone leads hit 75%); show rate +2 pts only; after-hours conversion we do not claim — drafts wait until open.",
  volume:
    "the high case assumes reps use about half the recovered hours to carry 40 conversations instead of 30, still well under the ~3× capacity the reply-time math allows.",
  gross: "$2,400 per used unit, front + back, editable on the owner dashboard.",
  size: "6 reps, ~150 internet/Messenger leads per month (NADA average), 30 per rep. Beatrice is smaller than that average; if lead volume is lower, hours-back scale down and the unit math still holds per conversation.",
};

export const IMPACT_SOURCES =
  "Sources: Demand Local / Foureyes (63% contact, 42% set, 58% show, 41% close; Urban Science 6% internet-lead 30-day close; Chili Piper 42-h average, 78% buy from first responder) · Ringlead 2026 / Pied Piper (47-min business-hours response; Foureyes 43% mishandled; 40–50% after hours; close 24% under 60s → 6% after 90 min) · Cox (34% of leads missed without a BDC) · Shiftly Auto (14.1% never logged; 44% of reps stop after one follow-up) · AutoSweet (“Very responsive” = 90% within 15 min) · Dealers United (40% after hours) · SimpSocial (8–12 units/mo baseline) · Strolid rural BDC (lead waste unaffordable; rural show 70–80% vs metro 50–60% — we do not take that gift) · LocalShift / dealer Messenger practice (5-minute rule; ~60% of pings are “is this still available?”) · Fowlerville Ford (rural village store: one person on internet leads moved e-close from bottom 100 to top 10 in the Ford Detroit region) · Pied Piper 2025 ILE (Ford dealers 66, industry 65; dealers who move under 40 to over 80 sell ~50% more units from the same leads). Rep time-on-task figures are forum consensus (r/askcarsales), labeled as estimates.";
