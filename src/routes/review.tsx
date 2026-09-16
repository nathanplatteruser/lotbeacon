import { createFileRoute, Link } from "@tanstack/react-router";
import { ResearchShell } from "@/components/research-shell";

export const Route = createFileRoute("/review")({ component: ReviewPage });

const ROWS: { area: string; original: string; g2: string; status: "in" | "ported" | "keep" | "gap" }[] = [
  { area: "Zoellner seed · 20 personas · 12 vehicles", original: "Yes", g2: "Yes, same names/stock", status: "in" },
  { area: "Queue / Admin / Owner as three doors", original: "grok-demo nav", g2: "Landing doors + Admin tab", status: "ported" },
  { area: "Action queue buckets + Send & next + J/K/E/1/2", original: "Yes", g2: "Yes", status: "in" },
  { area: "Why this action · live inquiry · inventory evidence", original: "Yes", g2: "Yes · live inquiry actually runs here", status: "in" },
  { area: "Owner capacity / RAI / gates / 8 usage-return tiles", original: "8 tiles", g2: "Same 8 tiles + 30-day forecast + RAI point ledger (Response / Accuracy / Integrity) with named floor plays", status: "ported" },
  { area: "30-day forecast strip (pessimistic + research ceiling)", original: "Impact + OG +47% / 2.8× / +45%", g2: "Owner dash + landing proof + impact tiles", status: "ported" },
  { area: "Show-likelihood sparkline rail (numbers, 0–100, % show)", original: "sparkRail 176×56", g2: "Queue + Admin rails", status: "ported" },
  { area: "Five communication signals + deal file + copy notes", original: "signals.py", g2: "Right pane with deltas, quotes, copy", status: "ported" },
  { area: "Simulate customer + inventory event (sold/stale)", original: "Webhook sim + inv dropdown", g2: "Free-text receive + next-line + inventory event", status: "ported" },
  { area: "Fact click → source quote; right-click correct", original: "Yes", g2: "Yes", status: "ported" },
  { area: "Download .ics + Google Calendar", original: "Desk confirmation", g2: "Both on booked threads", status: "ported" },
  { area: "Desk: EN/ES/VI/AR · Quick/Medium/Guided · Admin note", original: "grok-demo.html", g2: "/desk — same engine", status: "ported" },
  { area: "Admin: asked / acknowledged / holding (desk + floor)", original: "Admin tab", g2: "/app/admin desk panel + floor table", status: "ported" },
  { area: "vs the field matrix + player cards + roadmap + sources", original: "compare.html", g2: "/compare including Contract, CRM, Numa, roadmap", status: "ported" },
  { area: "Before & after ROI research (+47% / 2.8× / +45%)", original: "impact-estimate.html", g2: "/impact architect brief: store, 5 options, channels & CRM, Before/HITL toggle, trade-offs, the call. Same pessimistic math.", status: "ported" },
  { area: "Tyler & Kyle leave-behind (5 shoppers)", original: "tyler-kyle-leavebehind.md", g2: "/leavebehind", status: "ported" },
  { area: "CLICK-HERE dedicated door page", original: "CLICK-HERE.html", g2: "/click-here", status: "ported" },
  { area: "Commercial pricing $129 / $399 / $1,190 + founding 90 days", original: "pricing.html", g2: "/pricing", status: "ported" },
  { area: "Request a pilot", original: "mailto form", g2: "/pilot", status: "ported" },
  { area: "Takeover · voices · claim firewall · 24h window", original: "Yes", g2: "Yes", status: "in" },
  { area: "Thread Impact drawer (usage/speed/safety/return)", original: "Yes", g2: "Yes + memory corrections", status: "in" },
  { area: "3-nudge follow-up + offline log", original: "Yes", g2: "Yes", status: "ported" },
  { area: "Guided tour (11 steps)", original: "Yes", g2: "? in the header", status: "ported" },
  { area: "Reply instead when a time is selected", original: "sendAnyway", g2: "Reply instead on the card", status: "ported" },
  { area: "Buddy notes + 24h countdown on queue rows", original: "Yes", g2: "Amber pills + window left", status: "ported" },
  { area: "Sequences · Gong intel · Team · Pipeline kanban", original: "No", g2: "G2-only. Keep.", status: "keep" },
  { area: "Themes (SpaceX Black / Classic White / Zoellner Blue / Husker Red)", original: "Ford chrome only", g2: "Keep", status: "keep" },
  { area: "Spot agents · HITL sidecar (copy, never auto-type)", original: "Not documented", g2: "/spot — computer-use beside a synthetic thread; stealth refused", status: "keep" },
  { area: "SMS / email / voice compose (HITL)", original: "Messenger-first", g2: "Channel switcher · 10DLC / subject / talking points · human Send", status: "keep" },
  { area: "CRM push (ADF)", original: "Honestly next", g2: "Demo ADF XML to VinSolutions on first contact, book, sold, manual", status: "ported" },
  { area: "Comms package to F&I / GSM (one-page + live link)", original: "Copy deal notes", g2: "One-click send · live brief · Handoffs desk", status: "keep" },
  { area: "Live Meta Page wiring", original: "Honestly next", g2: "Same — not claimed", status: "gap" },
];

function ReviewPage() {
  const n = {
    in: ROWS.filter((r) => r.status === "in").length,
    ported: ROWS.filter((r) => r.status === "ported").length,
    keep: ROWS.filter((r) => r.status === "keep").length,
    gap: ROWS.filter((r) => r.status === "gap").length,
  };
  return (
    <ResearchShell
      current="/review"
      title="Merge review — original Pages vs this G2 desk"
      kicker="Do not overwrite the live URL until you have walked this list."
    >
      <p className="max-w-3xl text-muted-foreground">
        Goal: keep this design. Keep every original insight, ROI frame, desk interaction, and guardrail. Then the
        github.io/lotbeacon hyperlink stays; the page upgrades.{" "}
        <b className="text-foreground">
          {n.in} already shared · {n.ported} ported · {n.keep} G2-only keep · {n.gap} still open (live Meta — not
          claimed on either side)
        </b>
        .
      </p>
      <div className="mt-6 flex flex-wrap gap-2 text-[12px]">
        <Link to="/desk" className="underline">
          Open the desk
        </Link>
        <Link to="/app/admin" search={{ as: "admin" }} className="underline">
          Admin
        </Link>
        <Link to="/compare" className="underline">
          vs the field
        </Link>
        <Link to="/spot" className="underline">
          Spot agents
        </Link>
        <Link to="/impact" className="underline">
          before & after
        </Link>
        <Link to="/leavebehind" className="underline">
          Tyler & Kyle
        </Link>
        <Link to="/pricing" className="underline">
          pricing
        </Link>
        <Link to="/app/inbox" search={{ as: "sales" }} className="underline">
          sales inbox
        </Link>
        <Link to="/app/analytics" search={{ as: "owner" }} className="underline">
          owner dashboard
        </Link>
      </div>
      <div className="mt-8 overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="text-[11px] tracking-wide text-muted-foreground uppercase">
              <th className="p-3">Surface</th>
              <th className="p-3">Original repo / grok-demo</th>
              <th className="p-3">This G2 build</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r.area} className="border-t border-border">
                <td className="p-3 font-medium">{r.area}</td>
                <td className="p-3 text-muted-foreground">{r.original}</td>
                <td className="p-3 text-muted-foreground">{r.g2}</td>
                <td className="p-3 tabular uppercase">
                  {r.status === "in" && <span className="text-ok">shared</span>}
                  {r.status === "ported" && <span className="text-ok">ported</span>}
                  {r.status === "keep" && <span className="text-silver">keep</span>}
                  {r.status === "gap" && <span className="text-warn">open</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-6 text-sm text-muted-foreground">
        Stress tests after you approve: invent a discount, starve the Explorer feed, drop show-rate, paste a financing
        ask, book Sarah Saturday, open Riley on Quick and refuse to book “for kicks.” Forecast dollars must move when
        you edit assumptions.
      </p>
    </ResearchShell>
  );
}
