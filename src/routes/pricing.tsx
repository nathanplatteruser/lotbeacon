import { createFileRoute, Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { ResearchShell } from "@/components/research-shell";
import { Button } from "@/components/ui/button";
import { FOUNDING_LINE, PLANS, PRICE_LINE } from "@/lib/pricing";

export const Route = createFileRoute("/pricing")({ component: PricingPage });

function PricingPage() {
  return (
    <ResearchShell
      current="/pricing"
      title="Pricing — HITL copilot, store license"
      kicker="Month to month. No setup fee. No per-message meter. We are not Beakon."
    >
      <p className="max-w-2xl text-muted-foreground">
        Buy the HITL gate, not the bot skin. Sentiment tools miss buy-today. Autopilot invents the discount. You still
        hit Send. Rooftop is a 20-seat store license — owner huddle, intercept log, inbound vetting — not twice Crew for
        four times the floor.
      </p>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {PLANS.map((p) => (
          <article
            key={p.name}
            className={"featured" in p && p.featured ? "rounded-xl border border-silver/50 bg-card p-5" : "rounded-xl border border-border bg-card p-5"}
          >
            <div className="text-sm text-muted-foreground">{p.name}</div>
            <div className="font-display mt-2 text-4xl tabular">
              {p.price}
              <span className="text-base text-muted-foreground">/mo</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{p.for}</p>
            <p className="mt-1 text-[12px] text-muted-foreground">{p.seat}</p>
            <p className="mt-3 text-[12px]">
              {p.bar} · {p.story}
            </p>
            <ul className="mt-5 space-y-2">
              {p.items.map((it) => (
                <li key={it} className="flex items-start gap-2 text-sm">
                  <Check className="mt-0.5 size-4 text-silver" />
                  {it}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>

      <section className="mt-8 rounded-xl border border-border bg-card p-5">
        <h2 className="font-medium">Why Rooftop is not 2× Crew</h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
          A Nebraska Ford floor is 6 people. A typical franchise sales + BDC desk is 15–20. Crew is the rural pod —
          channels, ADF, the Saturday packet. Rooftop is the store: 20 seats, Monday huddle, inbound sticker checks,
          intercept log, RAI scorecard. Per-seat it is cheaper ($59 vs $80). The dollar is 3× because the product is
          different — not because we doubled a three-person license and called it a rooftop.
        </p>
      </section>

      <section className="mt-10 grid gap-4 md:grid-cols-2">
        <article className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-medium">Why these prices · vs the field</h2>
          <table className="mt-3 w-full text-left text-sm">
            <tbody>
              {[
                ["Meta Inbox", "Free", "Table stakes — we sell judgment on top"],
                ["ManyChat / respond.io", "~$17–349", "Bots that send — wrong risk for pricing asks"],
                ["LotDesk", "$299+", "Crew sits beside — we are HITL, not auto-book"],
                ["Podium (per rooftop)", "$389–799", "Messaging + reviews. Not a claim firewall."],
                ["BDC.AI", "from $595", "Replacement BDC. We do not replace headcount."],
                ["Integrated dealer AI", "$499–1,500", "The rooftop band. We include 20 seats."],
                ["LotBeacon Rooftop", "$1,190", "20 seats · huddle · intercepts · inbound vetting · human Send"],
              ].map((r) => (
                <tr key={r[0]} className="border-t border-border">
                  <td className="py-2 pr-3">{r[0]}</td>
                  <td className="py-2 pr-3 tabular">{r[1]}</td>
                  <td className="py-2 text-muted-foreground">{r[2]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>
        <article className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-medium">What we will not claim</h2>
          <table className="mt-3 w-full text-left text-sm">
            <tbody>
              {[
                ["Live Meta inbox today", "Seeded preview. Live Page Messenger is next."],
                ["Spot agent auto-types into personal Facebook", "Never. Sidecar copies. A person sends. Official path is Page API."],
                ["AI takes $2,500 off", "Hard refuse. Never invent discounts."],
                ["Replaces your BDC", "Anti-goal vs LotDesk / Matador / BDC.AI"],
                ["Books holds for you", "We escalate humans."],
                ["We’re Beakon", "Wrong product."],
              ].map((r) => (
                <tr key={r[0]} className="border-t border-border">
                  <td className="py-2 pr-3 font-medium">{r[0]}</td>
                  <td className="py-2 text-muted-foreground">{r[1]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>
      </section>

      <section className="mt-8 rounded-xl border border-border bg-card p-5">
        <h2 className="font-medium">Founding-dealer note · Beatrice only</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          First 90 days at half list if you want to kick tires on live Marketplace threads. Still month to month.{" "}
          {FOUNDING_LINE}. After 90 days, commercial list. No setup fee. No per-message meter.
        </p>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        {[
          ["What does it cost?", `${PRICE_LINE}. Month to month. The bot vendors quote $399–2,999 and lock a year.`],
          [
            "That’s too expensive.",
            "One incremental unit at $2,400 gross pays for Rooftop for two months. The huddle, the intercept log, and inbound vetting are why it is not 2× Crew.",
          ],
          [
            "Meta Inbox is free.",
            "Free is the table. We sell judgment on top — claim firewall, two verified slots, inbound sticker checks, owner scorecard you can break.",
          ],
        ].map(([q, a]) => (
          <article key={q} className="rounded-xl border border-border bg-card p-5">
            <h3 className="font-medium">“{q}”</h3>
            <p className="mt-2 text-sm text-muted-foreground">{a}</p>
          </article>
        ))}
      </section>

      <div className="mt-8">
        <Button asChild>
          <Link to="/pilot">Request a pilot</Link>
        </Button>
      </div>
    </ResearchShell>
  );
}
