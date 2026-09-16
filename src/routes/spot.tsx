import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { SpotRolodex } from "@/components/spot-rolodex";
import { SpotSidecar } from "@/components/spot-sidecar";
import { ResearchShell } from "@/components/research-shell";
import { Button } from "@/components/ui/button";
import { isSpotLookId, type SpotLookId } from "@/lib/spot-looks";
import {
  SPOT_CLAIMS,
  SPOT_CONFIRM,
  SPOT_COULD,
  SPOT_CUSTOMER,
  SPOT_DRAFT,
  SPOT_INBOUND,
  SPOT_NEVER,
  SPOT_SIGNALS,
  SPOT_SOURCES,
  SPOT_WHAT,
  SPOT_WHERE,
} from "@/lib/spot";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/spot")({ component: SpotPage });

function SpotPage() {
  const [look, setLook] = useState<SpotLookId>("now");
  const onLook = useCallback((id: SpotLookId) => {
    if (isSpotLookId(id)) setLook(id);
  }, []);

  return (
    <ResearchShell
      current="/spot"
      title="Spot agents"
      kicker="Researched Sept 2026 · HeyGen category, CUA / Operator, Meta ToS · 0 stealth sends"
    >
      <p className="max-w-3xl text-sm text-muted-foreground">
        HITL sidecar beside a synthetic Marketplace thread. Copy and paste work. Auto-type, auto-send, and hiding the
        model from Meta refuse — even here. Two decks in the rolodex: six surfaces, five architectures. Same desk.
        Now is what we ship. A third catalog — Hallmark landings, Archify diagrams, OpenMontage film — lives on{" "}
        <Link to="/design" className="underline-offset-2 hover:underline">
          Design
        </Link>
        .
      </p>

      <HitlWalkthrough />

      <div className="mt-6">
        <SpotRolodex look={look} onChange={onLook} />
        <div className="spot-flip-stage">
          <SpotSidecar key={look} look={look} />
        </div>
      </div>

      <p className="mt-10 max-w-3xl text-muted-foreground">
        The bottleneck is real: dealers sell from personal Facebook profiles because Meta pulled vehicle listings off
        Pages in January 2023, and there is no two-way API from a personal Marketplace thread into a model. A HeyGen
        solutions director’s “spot agents” is the right category — an agent that finds the composer when no API exists —
        and the wrong weapon against facebook.com. Connecting a backend LLM to a personal Facebook session so Meta
        cannot tell the replies are generated is not a product we will ship.
      </p>

      <div className="mt-8 grid gap-3 md:grid-cols-3">
        <Verdict k="Viable as stealth?" v="No" d="Logging in, auto-typing, auto-pasting, or hiding generation from Meta is ToS, HUMAN_AGENT abuse, and detection-evasion." />
        <Verdict k="Viable as HITL sidecar?" v="Yes" d="Spot the thread. Draft from inventory. Copy or paste. A person sends. That is this page." />
        <Verdict k="Viable as Page API?" v="Yes — that’s v1.0" d="Named Page, App Review, Send API, 7-day human-agent window because a human still approves." />
      </div>

      <section className="mt-12">
        <h2 className="font-display text-2xl">{SPOT_WHAT.title}</h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">{SPOT_WHAT.lead}</p>
        <ul className="mt-4 max-w-3xl space-y-3 text-sm leading-relaxed text-muted-foreground">
          {SPOT_WHAT.bullets.map((b) => (
            <li key={b.slice(0, 24)}>{b}</li>
          ))}
        </ul>
      </section>

      <section className="mt-12">
        <h2 className="font-display text-2xl">{SPOT_WHERE.title}</h2>
        <dl className="mt-5 grid gap-3 md:grid-cols-2">
          {SPOT_WHERE.paths.map((p) => (
            <div key={p.k} className="rounded-lg border border-border bg-card p-5">
              <dt className="text-[11px] tracking-[0.14em] text-muted-foreground uppercase">{p.k}</dt>
              <dd className="mt-2 text-sm leading-relaxed">{p.v}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-12">
        <h2 className="font-display text-2xl">{SPOT_COULD.title}</h2>
        <ul className="mt-4 max-w-3xl space-y-3 text-sm leading-relaxed text-muted-foreground">
          {SPOT_COULD.bullets.map((b) => (
            <li key={b.slice(0, 24)} className="border-l border-silver/40 pl-4">
              {b}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12">
        <h2 className="font-display text-2xl">What we will never build</h2>
        <p className="mt-3 max-w-3xl text-sm text-muted-foreground">
          Written down so a dealer, a Ford compliance officer, and a future engineer all hear the same no.
        </p>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {SPOT_NEVER.map((n) => (
            <article key={n.t} className="rounded-lg border border-border bg-card p-5">
              <h3 className="font-medium">{n.t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{n.d}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="font-display text-2xl">Why Meta would still know</h2>
        <p className="mt-3 max-w-3xl text-sm text-muted-foreground">
          The ask was whether typing instead of pasting, or matching human cadence, would hide the model. It would not
          make the architecture legal, and it would not reliably hide it.
        </p>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {SPOT_SIGNALS.map((s) => (
            <article key={s.k} className="rounded-lg border border-border bg-card p-5">
              <h3 className="text-sm font-medium">{s.k}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.v}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-12 rounded-lg border border-paper/30 bg-card p-5 md:p-8">
        <p className="text-[11px] tracking-[0.14em] text-muted-foreground uppercase">The product decision</p>
        <h2 className="font-display mt-2 text-2xl md:text-3xl">Keep the spot. Drop the stealth.</h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Marketplace personal DMs stay paste-in until Meta opens them. Page Messenger goes through the official API.
          The sidecar you just used is the computer-use idea with the crime taken out: it spots a thread, it drafts
          from the lot, and a human still sends. That is also why we get the 7-day window the bots do not.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Button asChild>
            <Link to="/app/inbox" search={{ as: "sales" }}>
              Work Sarah in the inbox
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/compare">vs the field — CARVID is the cautionary tale</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/pilot">Request a pilot</Link>
          </Button>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-[11px] tracking-[0.14em] text-muted-foreground uppercase">Sources</h2>
        <ul className="mt-3 max-w-3xl space-y-1 text-[12px] leading-relaxed text-muted-foreground">
          {SPOT_SOURCES.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </section>
    </ResearchShell>
  );
}

function Verdict({ k, v, d }: { k: string; v: string; d: string }) {
  return (
    <article className="rounded-lg border border-border bg-card p-5">
      <p className="text-[11px] tracking-[0.14em] text-muted-foreground uppercase">{k}</p>
      <p className="font-display mt-2 text-3xl">{v}</p>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{d}</p>
    </article>
  );
}

const WALK = [
  {
    n: "1",
    kicker: "The ping",
    title: "Sarah asks about the Explorer",
    body: SPOT_INBOUND,
    note: `${SPOT_CUSTOMER.name} · ${SPOT_CUSTOMER.city} · ${SPOT_CUSTOMER.listing}. Marketplace. No API. This is how rural Ford stores still sell.`,
  },
  {
    n: "2",
    kicker: "The spot",
    title: "Sidecar finds inbound, composer, Send",
    body: "Three controls on a screen we own. Same loop as Operator / Computer Use. We look. We do not click Send.",
    note: "Spotting is the useful half. Driving a personal Facebook session is the half we refuse.",
  },
  {
    n: "3",
    kicker: "The draft",
    title: "Inventory-grounded. Trade number blocked.",
    body: SPOT_DRAFT,
    note: "Claims checked against the lot feed. A person still has to hit Send.",
    claims: SPOT_CLAIMS,
  },
  {
    n: "4",
    kicker: "The send",
    title: "You paste. You hit Send.",
    body: SPOT_CONFIRM,
    note: "Saturday 10:00 lands. That is why we get the 7-day window the bots do not. Never a personal cell. Never a stealth type.",
  },
] as const;

function HitlWalkthrough() {
  const [step, setStep] = useState(0);
  const cur = WALK[step]!;
  return (
    <section id="hitl-walk" className="mt-8 rounded-xl border border-border bg-card p-5 md:p-6">
      <p className="text-[11px] tracking-[0.14em] text-muted-foreground uppercase">Sales setting · click through</p>
      <h2 className="font-display mt-1 text-2xl">How the HITL sidecar works on the floor</h2>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Saturday morning. Jordan is working Sarah. Four clicks. The model drafts. A person still sends.
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
        {WALK.map((s, i) => (
          <button
            key={s.n}
            type="button"
            id={`hitl-step-${s.n}`}
            onClick={() => setStep(i)}
            className={cn(
              "min-h-11 rounded-md border px-3 py-2 text-left",
              i === step ? "border-paper bg-paper text-ink" : "border-border hover:bg-accent/60",
            )}
          >
            <div className={cn("text-[11px] tracking-wide uppercase", i === step ? "text-ink/70" : "text-muted-foreground")}>
              {s.n} · {s.kicker}
            </div>
            <div className="mt-0.5 text-sm leading-snug">{s.title}</div>
          </button>
        ))}
      </div>
      <div className="mt-4 rounded-md border border-border bg-background px-4 py-3">
        <p className="text-[11px] tracking-wide text-muted-foreground uppercase">
          Step {cur.n} · {cur.kicker}
        </p>
        <p className="mt-2 text-sm leading-relaxed">{cur.body}</p>
        {"claims" in cur && cur.claims ? (
          <ul className="mt-3 space-y-1.5 text-[12px]">
            {cur.claims.map((c) => (
              <li key={c.text} className="flex items-start gap-2">
                <span className={c.status === "ok" ? "text-ok" : "text-destructive"}>{c.status === "ok" ? "✓" : "✕"}</span>
                <span>
                  {c.text}
                  <span className="text-muted-foreground"> · {c.source}</span>
                </span>
              </li>
            ))}
          </ul>
        ) : null}
        <p className="mt-3 text-[12px] text-muted-foreground">{cur.note}</p>
      </div>
      <p className="mt-3 text-[12px] text-muted-foreground">
        The live sidecar is the same loop. Copy works. Auto-type and auto-send refuse.
      </p>
    </section>
  );
}
