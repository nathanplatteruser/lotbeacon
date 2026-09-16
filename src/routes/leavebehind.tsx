import { createFileRoute, Link } from "@tanstack/react-router";
import { ResearchShell } from "@/components/research-shell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/leavebehind")({ component: LeavebehindPage });

const SHOPPERS = [
  {
    who: "Sarah Miller — Beatrice. Marketplace.",
    said: "Third message. If nobody’s reading this I’ll just go to Lincoln.",
    bot: "Yes it’s available! What time works for you?",
    kyle: "Own the wait in one line. Confirm the black Explorer (4WD, miles, stock). Saturday 10:00 or 11:30. Invite the Accord. Do not guess a trade number.",
    why: "Three pings, one dropped promise. Show-likelihood is down. The save is the reply, not a brochure.",
  },
  {
    who: "Mike Torres — Lincoln. Autotrader. Blue F-150 Lariat.",
    said: "Don’t send me to a manager like I’m some time-waster. That’s how you talk to people who don’t matter.",
    bot: "Routes him to a manager in the thread and trains the insult.",
    kyle: "Own the tone. Do not mention a manager. Thursday 4:30 or 5:30 — have the Lariat pulled. A time, not a number.",
    why: "Warm, then took ‘manager’ as an insult. The next sentence is the save. The graph will tick back up.",
  },
  {
    who: "Jen Alvarez — Beatrice. Website.",
    said: "I texted twice. Lincoln has one. If you’re closed just say so.",
    bot: "Pitches the Expedition she cannot pay for, or stays silent.",
    kyle: "Apologize for the two texts. Explorer XLT at $34,800. Don’t stretch her into an Expedition. Two Saturday times.",
    why: "Ghosted SMS. She gave a cap. Honor it and she shows.",
  },
  {
    who: "Dan Whitfield — Fairbury.",
    said: "Can you do $400/month on the F-150? Credit is around 580.",
    bot: "Quotes $400 and a store is now on the hook for a payment it cannot keep.",
    kyle: "No payment in Messenger. Hand to F&I for a 20-minute pre-qual. Book only if he still wants to see the truck.",
    why: "Trip anxiety, not tire-kicking. A human who will not lie about credit is the closer.",
  },
  {
    who: "Pat O’Neil — Crete.",
    said: "Is the 2021 Explorer ST still there? (It is sold.)",
    bot: "“Yes!” on a dead listing and burns the store when he drives 40 minutes.",
    kyle: "Sold. Here is the in-stock XLT, here is the price on the lot, Saturday or I release you.",
    why: "Honesty plus a live unit. Ghosting him is how a multi-store group wins the next ping.",
  },
];

function LeavebehindPage() {
  return (
    <ResearchShell
      current="/leavebehind"
      title="Sneak peek for Tyler & Kyle"
      kicker="Zoellner Ford of Beatrice · written to read on a phone between ups"
    >
      <p className="max-w-2xl text-muted-foreground">
        Nathan bought a car from you off Facebook Marketplace. He is Exhibit A: inquired, shopped, and closed because a
        real person treated him like a human instead of a Twilio drip. LotBeacon does not replace Kyle. It makes Kyle
        more Kyle, and Tyler more Tyler — faster replies that still sound like the store, with a firewall so the lot
        never invents a price.
      </p>

      <div className="mt-8 grid gap-3 md:grid-cols-2">
        <article className="rounded-xl border border-paper bg-paper p-5 text-ink">
          <p className="text-[11px] tracking-[0.14em] uppercase opacity-70">Kyle’s view · the floor</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li>A queue scored by show-likelihood, not who yelled last.</li>
            <li>A grounded draft already in the box. You read it. You hit Send. The tool never sends for you.</li>
            <li>Two real Saturday slots. One tap books.</li>
            <li>If the draft invents a discount, quotes $400/month, or says a sold Explorer is still here — Send locks.</li>
          </ul>
          <Button asChild className="mt-4" size="sm">
            <Link to="/app/inbox" search={{ as: "sales" }}>
              Click here — work the queue
            </Link>
          </Button>
        </article>
        <article className="rounded-xl border border-border bg-card p-5">
          <p className="text-[11px] tracking-[0.14em] text-muted-foreground uppercase">Tyler’s view · the tower</p>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>Capacity: how many conversations the floor can work before quality dies.</li>
            <li>RAI scorecard: Response, Accuracy, Integrity. Not vanity clicks.</li>
            <li>Gates you can try to break: starve the lot feed, invent a discount, drag show-rate.</li>
            <li>Assumptions you can touch. No black-box AI score. Paint is yours. The firewall is not.</li>
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild size="sm" variant="outline">
              <Link to="/app/analytics" search={{ as: "owner" }}>
                Owner dashboard
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link to="/app/admin" search={{ as: "admin" }}>
                Admin
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link to="/spot">Spot agents</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link to="/design">Design rolodex</Link>
            </Button>
          </div>
        </article>
      </div>

      <h2 className="mt-12 text-[11px] tracking-[0.14em] text-muted-foreground uppercase">
        Five window shoppers who convert when a senior sales person reads the thread
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Fake customers in the demo. Also every Saturday on Marketplace. Nathan was Sarah with extra steps.
      </p>
      <div className="mt-5 space-y-3">
        {SHOPPERS.map((s, i) => (
          <article key={s.who} className="rounded-xl border border-border bg-card p-5">
            <p className="text-[11px] tabular text-muted-foreground">{String(i + 1).padStart(2, "0")}</p>
            <h3 className="mt-1 font-medium">{s.who}</h3>
            <p className="mt-2 text-sm italic">“{s.said}”</p>
            <div className="mt-3 grid gap-3 text-sm md:grid-cols-3">
              <div>
                <div className="text-[11px] tracking-wide text-destructive uppercase">Bot move</div>
                <p className="mt-1 text-muted-foreground">{s.bot}</p>
              </div>
              <div>
                <div className="text-[11px] tracking-wide text-ok uppercase">Kyle move</div>
                <p className="mt-1">{s.kyle}</p>
              </div>
              <div>
                <div className="text-[11px] tracking-wide text-muted-foreground uppercase">Why they convert</div>
                <p className="mt-1 text-muted-foreground">{s.why}</p>
              </div>
            </div>
          </article>
        ))}
      </div>

      <section className="mt-10 overflow-x-auto rounded-xl border border-border bg-card p-5">
        <h2 className="text-[11px] tracking-[0.14em] text-muted-foreground uppercase">How this is different</h2>
        <table className="mt-3 w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="text-[11px] tracking-wide text-muted-foreground uppercase">
              <th className="pb-2 pr-3">Thing</th>
              <th className="pb-2 pr-3">LotBeacon</th>
              <th className="pb-2 pr-3">Meta AI / cheap auto-reply</th>
              <th className="pb-2 pr-3">Podium / Impel / Conversica</th>
              <th className="pb-2">Gubagoo / Vin / Tekion</th>
            </tr>
          </thead>
          <tbody>
            {[
              ["Who hits Send", "You. Always.", "The model", "Often the model", "Their agents / mix"],
              ["Spot agent on personal Facebook", "Sidecar drafts. You paste. You send.", "n/a", "Not their job", "n/a"],
              ["Invented discount / dead unit", "Blocked", "Often ships", "Guardrails vary", "Inventory lives there"],
              ["Two real slots + book", "Yes", "No", "Auto-book", "CRM task / sometimes"],
              ["Owner scorecard you can break", "Yes", "No", "Engagement dashboards", "Reports"],
              ["Contract", "Month to month", "Free / cheap monthly", "Annual", "DMS / suite term"],
            ].map((r) => (
              <tr key={r[0]} className="border-t border-border">
                {r.map((c) => (
                  <td key={c} className="py-2 pr-3">
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-[12px] text-muted-foreground">
          Where others are the better buy: 24/7 humans covering chat → Gubagoo. After-hours voice bot → not this product.
          The CRM itself → VinSolutions / Tekion. $25 website chat with citations → Nobi.
        </p>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        {[
          ["Solo", "$129/mo", "One setter · 1 seat"],
          ["Crew", "$399/mo", "Five on the floor"],
          ["Rooftop", "$1,190/mo", "20 seats · huddle · inbound vetting"],
        ].map(([n, p, w]) => (
          <article key={n} className="rounded-xl border border-border bg-card p-5">
            <div className="text-sm text-muted-foreground">{n}</div>
            <div className="font-display mt-1 text-3xl tabular">{p}</div>
            <p className="mt-2 text-sm text-muted-foreground">{w}</p>
          </article>
        ))}
      </section>

      <p className="mt-8 max-w-2xl text-sm text-muted-foreground">
        The pitch is not “replace the floor with a bot.” The pitch is: keep the thing Sid Dillon, Woodhouse, and Baxter
        cannot buy — Kyle being Kyle, Tyler being Tyler, and a 40-minute drive that is worth it because the people are
        worth it. Fifteen minutes. Fake customers. You try to break it.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button asChild>
          <Link to="/app/inbox" search={{ as: "sales" }}>
            Open the desk
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/pilot">Request a pilot</Link>
        </Button>
      </div>
    </ResearchShell>
  );
}
