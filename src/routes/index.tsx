import { createFileRoute, Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { DemoDoors } from "@/components/demo-doors";
import { Mark } from "@/components/mark";
import { SiteNav } from "@/components/site-nav";
import { Button } from "@/components/ui/button";
import { PLANS, PRICE_LINE } from "@/lib/pricing";
import { MODEL_NOTE } from "@/lib/impact";

export const Route = createFileRoute("/")({ component: Home });

const PROOF = [
  { k: "0", v: "autonomous sends. Ever." },
  { k: "2.8×", v: "conversations per rep-hour", note: MODEL_NOTE },
  { k: "+47%", v: "units per rep · pessimistic", note: MODEL_NOTE },
  { k: "+45%", v: "Messenger foot traffic", note: MODEL_NOTE },
];

const PILLARS = [
  {
    k: "01",
    t: "Inbox that books",
    d: "Marketplace, SMS, email, and lot calls in one queue. Every row is an action: reply, book, rescue, or close the window. J / K to the next lead. Send & next.",
  },
  {
    k: "02",
    t: "Sequences for setters",
    d: "BDC cadences that look like Outreach and speak like a desk: Marketplace 5-touch, no-show rescue, be-back 72h, service-to-sales. Never automatic past opt-out or the 24-hour window.",
  },
  {
    k: "03",
    t: "Intel on every conversation",
    d: "Gong, for the floor. Talk ratio, trackers, show-propensity, coaching clips. Price objections, Omaha matches, angry be-backs — scored, not buried in a DMS note.",
  },
  {
    k: "04",
    t: "Grounded in the lot",
    d: "Drafts may only quote live inventory. Sold units stay sold. Payments, approvals, trade values, and Sunday hours never leave the building. A hallucination firewall sits in front of Send.",
  },
];

const PERSONAS = [
  {
    t: "BDC / BDM",
    d: "Set more appointments without writing the same six texts. Two verified slots. Show-rate you can defend in the Monday meeting.",
  },
  {
    t: "Sales consultant",
    d: "Own the relationship. The copilot remembers the Accord trade, the AWD question, the Saturday. You send. Nothing autonomous.",
  },
  {
    t: "GSM / owner",
    d: "Capacity per rep-hour, responsible-AI scorecard, and the clips you actually coach from. Pilot gates, not vanity dashboards.",
  },
];

function Home() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <SiteNav />

      <section id="start" className="mx-auto max-w-6xl px-4 pt-10 pb-8 md:pt-16">
        <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">Zoellner Ford of Beatrice · live demo</p>
        <h1 className="font-display mt-4 max-w-3xl text-4xl leading-[1.1] tracking-tight md:text-6xl">
          Three doors. Same as grok-demo: Queue, Admin, Owner.
        </h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
          iPhone or MacBook — same product, no install. Sales reps come for volume. Admin verifies they were heard. Owners come to watch the
          guardrails, then try to break them. Style is the dropdown at the very top.
        </p>
        <DemoDoors className="mt-8" />
        <div className="mt-6 flex flex-wrap gap-x-4 gap-y-2 text-sm">
          <Link to="/desk" className="underline-offset-2 hover:underline">
            Open the desk (EN/ES/VI/AR)
          </Link>
          <Link to="/compare" className="underline-offset-2 hover:underline">
            vs the field
          </Link>
          <Link to="/spot" className="underline-offset-2 hover:underline">
            Spot agents
          </Link>
          <Link to="/design" className="underline-offset-2 hover:underline">
            Design rolodex
          </Link>
          <Link to="/impact" className="underline-offset-2 hover:underline">
            Before & after ROI
          </Link>
          <Link to="/pricing" className="underline-offset-2 hover:underline">
            Pricing {PRICE_LINE}
          </Link>
          <Link to="/review" className="underline-offset-2 hover:underline">
            Merge review
          </Link>
          <Link to="/leavebehind" className="underline-offset-2 hover:underline">
            Tyler & Kyle one-pager
          </Link>
        </div>
        <p className="mt-5 text-xs text-muted-foreground">
          Seeded floor. Fake customers. Send never leaves this device. Walk: Reset, Riley Grant, Mike Torres, Admin huddle.
        </p>
      </section>

      <section className="border-y border-border">
        <div className="mx-auto grid max-w-6xl grid-cols-2 md:grid-cols-4">
          {PROOF.map((p, i) => (
            <div key={p.k} className={i < 3 ? "border-r border-border px-4 py-6 md:px-6" : "px-4 py-6 md:px-6"}>
              <div className="font-display text-3xl tabular md:text-4xl">{p.k}</div>
              <div className="mt-1 text-sm text-muted-foreground">{p.v}</div>
              {p.note ? <div className="mt-1 text-[11px] text-muted-foreground">{p.note}</div> : null}
            </div>
          ))}
        </div>
        <p className="mx-auto max-w-6xl px-4 py-3 text-[12px] text-muted-foreground">
          The three lifts are a pessimistic model on one rural Ford floor. {MODEL_NOTE} Zero autonomous sends is the product law, not a forecast.
        </p>
      </section>

      <section id="product" className="mx-auto max-w-6xl px-4 py-20">
        <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">The desk, rewritten</p>
        <h2 className="font-display mt-3 max-w-2xl text-3xl md:text-4xl">
          What Outreach built for software, LotBeacon built for the lot.
        </h2>
        <div className="mt-12 grid gap-10 md:grid-cols-2">
          {PILLARS.map((p) => (
            <article key={p.k}>
              <div className="text-xs tabular text-muted-foreground">{p.k}</div>
              <h3 className="mt-2 text-xl font-medium">{p.t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.d}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-card">
        <div className="mx-auto grid max-w-6xl md:grid-cols-2">
          <div className="border-b border-border px-4 py-12 md:border-r md:border-b-0 md:px-8 md:py-16">
            <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">Live queue</p>
            <h3 className="font-display mt-3 text-2xl">Sarah is at the top.</h3>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
              Black 2026 Explorer Platinum. 2018 Accord to trade. Saturday, tentative. The draft already offers 10:00
              or 11:30 — store hours, no double-book. Send & next. She answers. Book.
            </p>
            <PreviewQueue />
          </div>
          <div className="px-4 py-12 md:px-8 md:py-16">
            <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">Call intel</p>
            <h3 className="font-display mt-3 text-2xl">Mike talked price six times.</h3>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
              Talk ratio 71%. No next step. Coaching: stop lecturing the spec sheet, stop discounting in the thread,
              put Morgan on a Thursday 4:30.
            </p>
            <PreviewIntel />
          </div>
        </div>
      </section>

      <section id="personas" className="mx-auto max-w-6xl px-4 py-20">
        <h2 className="font-display text-3xl md:text-4xl">Three desks. One system of record.</h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {PERSONAS.map((p) => (
            <article key={p.t} className="rounded-xl border border-border bg-card p-5">
              <h3 className="text-lg font-medium">{p.t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.d}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="pricing" className="border-t border-border">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <h2 className="font-display text-3xl md:text-4xl">Priced like a closer, not a seat tax.</h2>
          <p className="mt-3 max-w-xl text-sm text-muted-foreground">
            Commercial list: {PRICE_LINE}. Month to month. Human Send. We are not Beakon.
            Rooftop is 20 seats and the owner suite — not twice Crew.
          </p>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {PLANS.map((t, i) => (
              <article key={t.name} className={cnCard(i === 1)}>
                <div className="text-sm text-muted-foreground">{t.name}</div>
                <div className="font-display mt-2 text-4xl tabular">
                  {t.price}
                  <span className="text-base text-muted-foreground">/mo</span>
                </div>
                <div className="mt-1 text-sm text-muted-foreground">{t.for}</div>
                <ul className="mt-6 space-y-2">
                  {t.items.map((it) => (
                    <li key={it} className="flex items-start gap-2 text-sm">
                      <Check className="mt-0.5 size-4 text-silver" />
                      {it}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-10 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Mark className="size-4" />
            LotBeacon · Zoellner Ford of Beatrice pilot
          </div>
          <Button asChild variant="outline">
            <Link to="/review">Merge review — do not overwrite live yet</Link>
          </Button>
        </div>
      </footer>
    </div>
  );
}

function cnCard(featured: boolean) {
  return featured
    ? "rounded-xl border border-silver/40 bg-card p-5"
    : "rounded-xl border border-border bg-card p-5";
}

function PreviewQueue() {
  const rows = [
    ["Riley Grant", "Reply now", "Vague ping · will over-share"],
    ["Sarah Miller", "Reply now", "Ghosted three pings · Lincoln"],
    ["Mike Torres", "Reply now", "Took manager as an insult"],
    ["Jen Alvarez", "Reply now", "Ghosted SMS · under 40k"],
  ];
  return (
    <div className="mt-8 overflow-hidden rounded-lg border border-border">
      {rows.map((r, i) => (
        <div key={r[0]} className={i ? "flex items-center justify-between border-t border-border px-3 py-3" : "flex items-center justify-between px-3 py-3"}>
          <div>
            <div className="text-sm">{r[0]}</div>
            <div className="text-[12px] text-muted-foreground">{r[2]}</div>
          </div>
          <div className="text-[11px] tracking-wide text-silver uppercase">{r[1]}</div>
        </div>
      ))}
    </div>
  );
}

function PreviewIntel() {
  return (
    <div className="mt-8 rounded-lg border border-border p-4">
      <div className="flex items-baseline justify-between">
        <span className="font-display text-4xl tabular">54</span>
        <span className="text-sm text-muted-foreground">talk 71% · 3 questions · no next step</span>
      </div>
      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-secondary">
        <div className="h-full w-[54%] bg-silver" />
      </div>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
        “Listed isn't what I asked. What's the best you can do today?”
      </p>
    </div>
  );
}
