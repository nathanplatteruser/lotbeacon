import { createFileRoute, Link } from "@tanstack/react-router";
import { ResearchShell } from "@/components/research-shell";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/compare")({ component: ComparePage });

type Cell = { v: "y" | "n" | "p"; t: string };

const COLS = [
  "LotBeacon",
  "Podium",
  "Gubagoo",
  "Impel",
  "Conversica",
  "Fullpath",
  "Tekion",
  "VinSolutions",
  "CARVID / FB Auto Reply",
  "Meta AI",
];

const ROWS: { cap: string; cells: Cell[] }[] = [
  {
    cap: "Facebook Messenger (Page inbox)",
    cells: [
      { v: "y", t: "official API" },
      { v: "y", t: "✓" },
      { v: "y", t: "✓" },
      { v: "n", t: "not published" },
      { v: "n", t: "not published" },
      { v: "n", t: "ads only" },
      { v: "n", t: "text/email" },
      { v: "p", t: "manual, no AI" },
      { v: "y", t: "via extension" },
      { v: "y", t: "✓" },
    ],
  },
  {
    cap: "Marketplace threads (personal profile)",
    cells: [
      { v: "p", t: "paste-in today; HITL sidecar" },
      { v: "n", t: "✕" },
      { v: "p", t: "human agents" },
      { v: "n", t: "✕" },
      { v: "n", t: "✕" },
      { v: "n", t: "✕" },
      { v: "n", t: "✕" },
      { v: "n", t: "✕" },
      { v: "y", t: "browser session (policy risk)" },
      { v: "y", t: "listing-scoped" },
    ],
  },
  {
    cap: "Computer-use / spot agent on personal Messenger",
    cells: [
      { v: "p", t: "HITL sidecar; copy, never auto-type" },
      { v: "n", t: "✕" },
      { v: "n", t: "✕" },
      { v: "n", t: "✕" },
      { v: "n", t: "✕" },
      { v: "n", t: "✕" },
      { v: "n", t: "✕" },
      { v: "n", t: "✕" },
      { v: "y", t: "drives logged-in browser" },
      { v: "n", t: "own surfaces only" },
    ],
  },
  {
    cap: "Human approves every send",
    cells: [
      { v: "y", t: "always" },
      { v: "n", t: "autonomous" },
      { v: "p", t: "vendor's agents" },
      { v: "n", t: "✕" },
      { v: "n", t: "✕" },
      { v: "n", t: "✕" },
      { v: "n", t: "✕" },
      { v: "p", t: "review + auto" },
      { v: "n", t: "✕" },
      { v: "p", t: "seller previews" },
    ],
  },
  {
    cap: "Per-claim price/availability check",
    cells: [
      { v: "y", t: "blocks unsupported" },
      { v: "n", t: "not published" },
      { v: "n", t: "✕" },
      { v: "p", t: "guards marketing" },
      { v: "p", t: "brand-accurate" },
      { v: "p", t: "after $1 Tahoe" },
      { v: "p", t: "reads inventory, auto-sends" },
      { v: "n", t: "✕" },
      { v: "n", t: "✕" },
      { v: "p", t: "listing data" },
    ],
  },
  {
    cap: "Routes financing / trade / hold to a person",
    cells: [
      { v: "y", t: "by rule" },
      { v: "p", t: "escalation" },
      { v: "y", t: "humans anyway" },
      { v: "p", t: "alerts" },
      { v: "p", t: "~" },
      { v: "p", t: "~" },
      { v: "p", t: "~" },
      { v: "p", t: "~" },
      { v: "n", t: "✕" },
      { v: "n", t: "✕" },
    ],
  },
  {
    cap: "Per-rep queue with next action",
    cells: [
      { v: "y", t: "✓" },
      { v: "p", t: "shared inbox" },
      { v: "n", t: "leads pushed out" },
      { v: "p", t: "worklists" },
      { v: "n", t: "✕" },
      { v: "n", t: "✕" },
      { v: "p", t: "CRM tasks" },
      { v: "p", t: "CRM tasks" },
      { v: "n", t: "✕" },
      { v: "n", t: "✕" },
    ],
  },
  {
    cap: "Two verified slots + one-click book",
    cells: [
      { v: "y", t: "human Send" },
      { v: "y", t: "auto" },
      { v: "p", t: "~" },
      { v: "y", t: "auto" },
      { v: "y", t: "auto" },
      { v: "y", t: "auto" },
      { v: "y", t: "auto" },
      { v: "y", t: "✓" },
      { v: "p", t: "~" },
      { v: "n", t: "✕" },
    ],
  },
  {
    cap: "7-day human-agent reply window",
    cells: [
      { v: "y", t: "eligible by design" },
      { v: "n", t: "24 h" },
      { v: "p", t: "~" },
      { v: "n", t: "✕" },
      { v: "n", t: "✕" },
      { v: "n", t: "✕" },
      { v: "n", t: "n/a" },
      { v: "p", t: "~" },
      { v: "n", t: "✕" },
      { v: "n", t: "✕" },
    ],
  },
  {
    cap: "Owner ROI with editable assumptions",
    cells: [
      { v: "y", t: "+ AI scorecard" },
      { v: "p", t: "engagement" },
      { v: "p", t: "~" },
      { v: "p", t: "~" },
      { v: "p", t: "~" },
      { v: "y", t: "CDP" },
      { v: "p", t: "~" },
      { v: "p", t: "~" },
      { v: "n", t: "✕" },
      { v: "n", t: "✕" },
    ],
  },
  {
    cap: "SMS / email / voice",
    cells: [
      { v: "y", t: "HITL · 10DLC / subject / talking points" },
      { v: "y", t: "all" },
      { v: "y", t: "chat/SMS" },
      { v: "y", t: "SMS/email/WhatsApp" },
      { v: "y", t: "SMS/email" },
      { v: "y", t: "SMS/email" },
      { v: "y", t: "text/email" },
      { v: "y", t: "✓" },
      { v: "n", t: "✕" },
      { v: "n", t: "✕" },
    ],
  },
  {
    cap: "CRM push (ADF)",
    cells: [
      { v: "y", t: "ADF XML · VinSolutions demo" },
      { v: "y", t: "✓" },
      { v: "y", t: "✓" },
      { v: "y", t: "✓" },
      { v: "y", t: "✓" },
      { v: "y", t: "✓" },
      { v: "y", t: "is the CRM" },
      { v: "y", t: "is the CRM" },
      { v: "y", t: "✓" },
      { v: "n", t: "✕" },
    ],
  },
  {
    cap: "Internal comms package (F&I / GSM)",
    cells: [
      { v: "y", t: "one-page · live movement · human Send" },
      { v: "p", t: "shared inbox" },
      { v: "n", t: "✕" },
      { v: "p", t: "worklists" },
      { v: "n", t: "✕" },
      { v: "p", t: "CRM tasks" },
      { v: "p", t: "CRM tasks" },
      { v: "p", t: "notes" },
      { v: "n", t: "✕" },
      { v: "n", t: "✕" },
    ],
  },
  {
    cap: "Contract",
    cells: [
      { v: "y", t: "month to month" },
      { v: "n", t: "annual, auto-renew" },
      { v: "p", t: "DMS term" },
      { v: "n", t: "12 months" },
      { v: "n", t: "annual" },
      { v: "n", t: "annual" },
      { v: "p", t: "DMS term" },
      { v: "p", t: "term" },
      { v: "y", t: "monthly" },
      { v: "p", t: "—" },
    ],
  },
];

function Mark({ v, t }: Cell) {
  const cls = v === "y" ? "text-ok" : v === "n" ? "text-destructive" : "text-warn";
  const g = v === "y" ? "✓" : v === "n" ? "✕" : "~";
  return (
    <span className={cls}>
      <b>{g}</b> {t}
    </span>
  );
}

function ComparePage() {
  return (
    <ResearchShell
      current="/compare"
      title="LotBeacon vs the field — better, worse, or the same"
      kicker="Researched Sept 2026 · vendor sites, G2/Capterra, DealerRefresh, Meta policy"
    >
      <p className="max-w-3xl text-muted-foreground">
        Every AI vendor here sells an autonomous agent that replaces the BDC, or a chat widget for the website.
        Nobody sells a copilot for the rep who already owns the Messenger thread. That is the gap. This page is
        honest about where the gap cuts the other way.
      </p>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <article className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-medium">Where LotBeacon is better</h2>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>
              <b className="text-foreground">Human approves every send.</b> Podium markets “100% autonomously.” A G2
              reviewer: the assistant starts answering when we don’t want them to.
            </li>
            <li>
              <b className="text-foreground">Per-claim verification.</b> Fullpath’s bot “sold” a Tahoe for $1. Gubagoo
              location is right “about 70%” of the time. We block the sentence.
            </li>
            <li>
              <b className="text-foreground">Built for the rep, not the BDC.</b> Queue, buddy notes, one-click booking,
              “why this action.” Competitors hand reps a lead; we hand them the next move.
            </li>
            <li>
              <b className="text-foreground">7-day human-agent window.</b> Because a person sends, Meta policy allows
              7 days. Autonomous bots are limited to 24 hours.
            </li>
            <li>
              <b className="text-foreground">Month-to-month price.</b> Most rivals are quote-only with 12-month lock-in.
            </li>
          </ul>
        </article>
        <article className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-medium">Where LotBeacon is worse (today)</h2>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>
              <b className="text-foreground">Voice is talking points, not a phone AI.</b> Numa/Toma own the inbound
              line. We log reached / voicemail. We do not auto-dial Beatrice.
            </li>
            <li>
              <b className="text-foreground">No live Marketplace pickup.</b> Personal-profile threads are paste-in
              today. A HITL{" "}
              <Link to="/spot" className="underline-offset-2 hover:underline">
                spot sidecar
              </Link>{" "}
              copies, never auto-types. CARVID reads them live — at policy risk.
            </li>
            <li>
              <b className="text-foreground">ADF is outbound only.</b> We push a prospect. We do not pull VinSolutions
              or replace the CRM.
            </li>
            <li>
              <b className="text-foreground">No 24/7 human backstop.</b> Gubagoo staffs overnight. We draft overnight;
              a rep sends at 8 AM.
            </li>
            <li>
              <b className="text-foreground">Zero case studies.</b> Impel is in 3,000+ Ford stores.
            </li>
          </ul>
        </article>
        <article className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-medium">Where it’s the same</h2>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>Appointment booking against a calendar. Ours proposes two verified slots; theirs book autonomously.</li>
            <li>Reads live inventory. Difference: we block when the answer isn’t there; they generate.</li>
            <li>Reply styles vs “brand voice.” Feature, not a moat.</li>
            <li>Owner dashboards. Ours shows the assumptions behind every dollar.</li>
          </ul>
        </article>
      </div>

      <section className="mt-10 overflow-x-auto rounded-xl border border-border bg-card p-4">
        <h2 className="text-[11px] tracking-[0.14em] text-muted-foreground uppercase">
          Feature matrix · what each one actually does for a Messenger lead
        </h2>
        <table className="mt-3 w-full min-w-[1100px] text-left text-[12px]">
          <thead>
            <tr>
              <th className="pb-2 pr-3 font-medium">Capability</th>
              {COLS.map((c, i) => (
                <th key={c} className={cn("pb-2 pr-3 font-medium", i === 0 && "bg-accent/40")}>
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r.cap} className="border-t border-border">
                <td className="py-2 pr-3 font-medium">{r.cap}</td>
                {r.cells.map((c, i) => (
                  <td key={i} className={cn("py-2 pr-3", i === 0 && "bg-accent/40")}>
                    <Mark {...c} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-[11px] text-muted-foreground">
          ✓ published · ~ partial or marketing without a mechanism · ✕ not offered or not published. “Not published”
          means we searched and found nothing.
        </p>
      </section>

      <p className="mt-6 rounded-lg border border-warn/40 bg-card p-4 text-sm text-muted-foreground">
        <b className="text-foreground">The Marketplace reality.</b> Meta removed business-Page vehicle listings on Jan
        30, 2023. Dealers post from personal profiles. Meta does not expose those threads to any API. Tools that
        “auto-reply to Marketplace” drive the rep’s logged-in browser. LotBeacon: Page inbox through the official API
        after App Review; Marketplace via paste-in today, a HITL spot sidecar in this demo (copy, human Send), and a
        read-only companion in v1.1. Slower. The version a Ford compliance officer signs. We will not auto-type into a
        personal Facebook session so Meta “does not figure it out.” That path is documented — and refused — on{" "}
        <Link to="/spot" className="underline-offset-2 hover:underline">
          Spot agents
        </Link>
        . For the Beatrice floor specifically — hours, reputation, hire-vs-assist — see the{" "}
        <Link to="/impact" className="underline-offset-2 hover:underline">
          solutions brief
        </Link>
        .
      </p>

      <section className="mt-10 grid gap-4 md:grid-cols-2">
        {[
          {
            t: "Podium — Jerry AI BDC",
            w: "~$399–599+/location, annual. 10k+ businesses.",
            g: "One inbox for text, calls, webchat, Messenger.",
            b: "Sells 100% autonomously. 65 BBB complaints in 3 years, mostly billing.",
            s: "Podium answers for you. LotBeacon answers with you.",
          },
          {
            t: "Gubagoo (Reynolds)",
            w: "Bundled with Reynolds DMS.",
            g: "24/7 real humans; OEM programs.",
            b: "Someone else talks to your customer. Location right ~70% of the time.",
            s: "Gubagoo outsources the conversation. We keep it with the person who shakes the hand.",
          },
          {
            t: "Impel AI",
            w: "FordDirect 3,000+ stores. 12-month.",
            g: "OEM co-op, omnichannel, merchandising.",
            b: "DealerRefresh: generic, awkward. No Messenger. No published hallucination mechanism.",
            s: "If Ford already gives you Impel for email, fine. It isn’t in Messenger, and it never asks before it sends.",
          },
          {
            t: "Conversica",
            w: "~$2,999/mo start, $5–15k setup.",
            g: "Dormant-lead reactivation.",
            b: "No Messenger. No human approval. G2: responses feel off. Price.",
            s: "Conversica costs five LotBeacon seats before setup. It emails; your customers are on Messenger.",
          },
          {
            t: "Fullpath (Cox)",
            w: "~$1k–$5k+.",
            g: "First-party data, Cox ecosystem.",
            b: "The $1 Tahoe. Then a hallucinations agent and a disclaimer.",
            s: "Fullpath added a hallucination checker after the $1 Tahoe. LotBeacon was built as one.",
          },
          {
            t: "CARVID · FB Auto Reply",
            w: "$0–799.",
            g: "Live in the Marketplace thread today.",
            b: "Sends without asking, from the rep’s Facebook session. Policy risk. One sweep and the profile is gone.",
            s: "Same price range, opposite risk. They’re fast and unsanctioned.",
          },
          {
            t: "Meta’s own tools",
            w: "Free.",
            g: "Listing-scoped facts are correct by construction.",
            b: "Knows one listing, not the lot. Can’t book, route financing, or remember the customer.",
            s: "Meta answers “is it available.” We answer “then come Saturday at 10:30.”",
          },
          {
            t: "LotDesk · BDC.AI · Matador · Beakon",
            w: "See Pricing.",
            g: "LotDesk books/holds. BDC.AI replaces the desk. Matador routes intent. Beakon is lot GPS ($895–995).",
            b: "None of them is a HITL Messenger copilot with a claim firewall.",
            s: "Buy the HITL gate, not the bot skin. We are not Beakon.",
          },
          {
            t: "Tekion ARC · VinSolutions Vinessa · DriveCentric Genie · CDK AIVA",
            w: "$500–10,000/mo as part of a suite. Already in the store.",
            g: "The record of truth. Tekion’s inventory grounding is the closest thing to our firewall. DriveCentric polishes a rep’s draft.",
            b: "Text and email only; no Messenger AI. VinSolutions dealer: no sales attributed to Vinessa. You can’t buy the AI à la carte.",
            s: "Your CRM is where the deal gets logged. LotBeacon is where the Messenger deal gets made.",
          },
          {
            t: "Numa · Toma · Swirl · Nobi",
            w: "Adjacent, not overlapping.",
            g: "Numa/Toma: voice AI for the service drive and phones. Swirl: autonomous website agent. Nobi: $25/mo web-chat with citations.",
            b: "Nobi’s numbered citations are the only other published verification approach, and it’s website-only.",
            s: "Different rooms of the store. Nothing here touches a Messenger thread.",
          },
        ].map((c) => (
          <article key={c.t} className="rounded-xl border border-border bg-card p-5">
            <h3 className="font-medium">{c.t}</h3>
            <p className="mt-1 text-[12px] text-muted-foreground">{c.w}</p>
            <p className="mt-3 text-sm">
              <span className="text-muted-foreground">Good at · </span>
              {c.g}
            </p>
            <p className="mt-1 text-sm">
              <span className="text-muted-foreground">Falls short · </span>
              {c.b}
            </p>
            <p className="mt-3 text-sm italic text-muted-foreground">{c.s}</p>
          </article>
        ))}
      </section>

      <div className="mt-10 grid gap-4 md:grid-cols-2">
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-[11px] tracking-[0.14em] text-muted-foreground uppercase">What this research changed · roadmap</h2>
          <dl className="mt-4 space-y-3 text-sm">
            {[
              ["v1.0", "Meta App Review for Page Messenger + human-agent 7-day window. Turns the 24-h countdown into a 7-day one for every follow-up a rep approves."],
              ["v1.0", "Live ADF/XML to VinSolutions, Elead/CDK, DriveCentric, DealerSocket. Demo already pushes the prospect. Production is the same XML against a real endpoint."],
              ["v1.0", "Inventory feed connectors: HomeNet, vAuto, DealerCenter CSV. The firewall is only as good as the feed."],
              ["v1.0", "Spanish reply style with the same claim checks. No rival publishes bilingual approval flow."],
              ["v1.1", "Marketplace HITL companion: profile threads in the queue with a verified draft; the rep still sends in Facebook. Spot sidecar ships in this demo. Auto-type / session steal / stealth cadence: dropped, same as autonomous sequences."],
              ["Now", "SMS via the store’s 10DLC, email subject+body, voice talking points. Same approval flow. Removes “one channel” from the worse column."],
              ["Dropped", "Autonomous follow-up sequences. Every rival sells it; every complaint is about it. Staying human-approved is the product."],
            ].map(([k, v], i) => (
              <div key={`${k}-${i}`} className="grid grid-cols-[4.5rem_1fr] gap-3">
                <dt className="font-medium">{k}</dt>
                <dd className="text-muted-foreground">{v}</dd>
              </div>
            ))}
          </dl>
        </section>
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-[11px] tracking-[0.14em] text-muted-foreground uppercase">What this research changed · pricing</h2>
          <p className="mt-4 text-sm text-muted-foreground">
            Current list: <b className="text-foreground">Solo $129</b> · <b className="text-foreground">Crew $399</b> ·{" "}
            <b className="text-foreground">Rooftop $1,190</b>. Twenty seats on Rooftop, not ten. Month to month, no setup
            fee. Founding-dealer note lives on pricing.
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            Why not cheaper: a CARVID seat and a LotBeacon seat are not the same product. One is an unsanctioned
            auto-sender; the other is an approved-send copilot with a claim firewall and an owner scorecard. Why not
            more: until three dealerships have before/after numbers, price is a beta-recruiting tool, not a margin tool.
          </p>
        </section>
      </div>

      <section className="mt-10 rounded-xl border border-border bg-card p-5">
        <h2 className="text-[11px] tracking-[0.14em] text-muted-foreground uppercase">Sources</h2>
        <p className="mt-3 text-[12px] leading-relaxed text-muted-foreground">
          Podium: automotive.podium.com · G2 reviews · BBB complaints (65 in 3 years) · reported $399–599+/location. Gubagoo:
          ChatSmart · G2 · Capterra · Auto Remarketing. Impel: impel.ai · DealerRefresh thread · Ringlead 2026. Conversica:
          conversica.com · G2 · Capterra · ~$2,999/mo start. Fullpath: ChatGPT-4 for dealers · the $1 Tahoe (The Autopian) ·
          Cox acquisition. CRMs: Tekion ARC · VinSolutions virtual assistant · DriveCentric · CDK AIVA. Marketplace:
          CARVID · FB Auto Reply AI · Jan 2023 Page listing removal · Meta AI seller replies Mar 2026. Meta policy:
          Messenger 24-h window, human-agent 7-day (automated messages disallowed under that tag). Automated Data
          Collection Terms + ToS 3.2.3 (no automated access, including while logged in). Spot / computer-use: Anthropic
          Computer Use · OpenAI Operator · Copilot Studio computer use · HeyGen Interactive Avatar / Superhuman Go
          (in-page, not Facebook login). Adjacent: Numa · Toma · Swirl · Nobi. Response rates: Digital Air
          Strike — 64% of dealers didn’t respond on Messenger.
        </p>
      </section>
    </ResearchShell>
  );
}
