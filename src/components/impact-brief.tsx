import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Ban, Check, Clock, Database, FileText, Mail, MapPin, MessageCircle, Phone, Scale, ShieldCheck, Smartphone } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  IMPACT_CALL,
  IMPACT_FEATURES,
  IMPACT_FUNNEL,
  IMPACT_HELD,
  IMPACT_HOURS,
  IMPACT_JOB,
  IMPACT_PATHS,
  IMPACT_RATES,
  IMPACT_SCENE,
  IMPACT_SCORES,
  IMPACT_SOURCES,
  IMPACT_STORE,
  IMPACT_TILES,
  IMPACT_TRADES,
  IMPACT_WEEK,
  MODEL_NOTE,
  type PathId,
} from "@/lib/impact";
import { useApp } from "@/lib/store";
import { cn } from "@/lib/utils";

const VERDICT: Record<(typeof IMPACT_PATHS)[number]["verdict"], { label: string; className: string }> = {
  pursue: { label: "Pursue", className: "text-ok" },
  later: { label: "Later", className: "text-warn" },
  refuse: { label: "Refuse", className: "text-destructive" },
  never: { label: "Never", className: "text-destructive" },
  status: { label: "Today", className: "text-muted-foreground" },
};

export function ImpactBrief() {
  const [side, setSide] = useState<"before" | "after">("before");
  const [path, setPath] = useState<PathId>("hitl");

  return (
    <Tabs defaultValue="after" className="impact-brief">
      <TabsList
        id="impact-tabs"
        className="h-auto w-full justify-start gap-1 overflow-x-auto whitespace-nowrap rounded-lg bg-secondary p-1 md:flex-wrap md:whitespace-normal"
      >
        <TabsTrigger value="store" className="h-11 shrink-0" id="impact-tab-store">
          The store
        </TabsTrigger>
        <TabsTrigger value="options" className="h-11 shrink-0" id="impact-tab-options">
          Options
        </TabsTrigger>
        <TabsTrigger value="channels" className="h-11 shrink-0" id="impact-tab-channels">
          Channels & CRM
        </TabsTrigger>
        <TabsTrigger value="after" className="h-11 shrink-0" id="impact-tab-after">
          Before & after
        </TabsTrigger>
        <TabsTrigger value="tradeoffs" className="h-11 shrink-0" id="impact-tab-tradeoffs">
          Trade-offs
        </TabsTrigger>
        <TabsTrigger value="call" className="h-11 shrink-0" id="impact-tab-call">
          The call
        </TabsTrigger>
      </TabsList>

      <TabsContent value="store" className="mt-8">
        <StoreTab />
      </TabsContent>
      <TabsContent value="options" className="mt-8">
        <OptionsTab path={path} onPath={setPath} />
      </TabsContent>
      <TabsContent value="channels" className="mt-8">
        <ChannelsTab />
      </TabsContent>
      <TabsContent value="after" className="mt-8">
        <AfterTab side={side} onSide={setSide} />
      </TabsContent>
      <TabsContent value="tradeoffs" className="mt-8">
        <TradeTab />
      </TabsContent>
      <TabsContent value="call" className="mt-8">
        <CallTab />
      </TabsContent>
    </Tabs>
  );
}

function StoreTab() {
  const s = IMPACT_STORE;
  return (
    <div className="space-y-6">
      <p className="max-w-3xl text-muted-foreground">{IMPACT_JOB.lead}</p>
      <div className="grid gap-3 md:grid-cols-2">
        <article className="rounded-xl border border-border bg-card p-5">
          <p className="text-[11px] tracking-[0.14em] text-muted-foreground uppercase">The floor</p>
          <h2 className="font-display mt-1 text-2xl">
            {s.name} · {s.city}
          </h2>
          <dl className="mt-4 space-y-3 text-sm">
            {[
              ["Where", `${s.address} · ${s.county}`],
              ["People", s.population],
              ["Drive", s.drive],
              ["Hours", s.hours],
              ["Headcount", s.floor],
              ["Mix", s.mix],
              ["Inbox", s.channel],
            ].map(([k, v]) => (
              <div key={k} className="grid grid-cols-[6.5rem_1fr] gap-3">
                <dt className="text-muted-foreground">{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-5 border-t border-border pt-4 text-sm">
            <MapPin className="mr-1 inline size-3.5 text-silver" />
            {s.northStar}
          </p>
        </article>
        <article className="rounded-xl border border-border bg-card p-5">
          <p className="text-[11px] tracking-[0.14em] text-muted-foreground uppercase">{IMPACT_JOB.title}</p>
          <ul className="mt-4 space-y-3 text-sm leading-relaxed text-muted-foreground">
            {IMPACT_JOB.bullets.map((b) => (
              <li key={b.slice(0, 28)} className="border-l border-silver/40 pl-4">
                {b}
              </li>
            ))}
          </ul>
        </article>
      </div>
      <section className="rounded-xl border border-border bg-card p-5">
        <h3 className="text-[11px] tracking-[0.14em] text-muted-foreground uppercase">When the store is open vs when the DMs arrive</h3>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Open 54 hours a week. Messenger is 168. Forty to fifty percent of internet leads arrive after hours. Autopilot
          would answer them. We draft them and wait for a person — on purpose.
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-7">
          {IMPACT_WEEK.map((d) => (
            <div key={d.day} className="rounded-lg border border-border bg-background p-3">
              <div className="text-[11px] tracking-wide text-muted-foreground uppercase">{d.day}</div>
              <div className="mt-2 text-sm font-medium">{d.open}</div>
              <div className="mt-1 text-[12px] text-muted-foreground">{d.inbound}</div>
              <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">{d.note}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

const FEATURE_ICON = {
  sms: Smartphone,
  email: Mail,
  voice: Phone,
  adf: Database,
  package: FileText,
} as const;

function ChannelsTab() {
  const selectThread = useApp((s) => s.selectThread);
  return (
    <div className="space-y-6">
      <p className="max-w-3xl text-muted-foreground">
        Messenger is the rural inbox. It is not the only glass a Gage County household checks. HITL is the same draft,
        the same claim firewall, on the channel they actually answer — plus a one-way ADF so VinSolutions is not empty
        when they show Saturday, and a one-page package so F&I and the GSM are current without hunting Messenger.
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        {IMPACT_FEATURES.map((f) => {
          const Icon = FEATURE_ICON[f.id as keyof typeof FEATURE_ICON] ?? MessageCircle;
          return (
            <article key={f.id} className="rounded-xl border border-border bg-card p-5" id={`impact-feature-${f.id}`}>
              <div className="flex items-center gap-2 text-[11px] tracking-[0.14em] text-muted-foreground uppercase">
                <Icon className="size-3.5 text-silver" />
                {f.name}
              </div>
              <h3 className="mt-2 font-medium">{f.who}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{f.does}</p>
              <p className="mt-3 text-sm leading-relaxed">
                <span className="text-muted-foreground">Does not · </span>
                {f.doesNot}
              </p>
              <p className="mt-3 border-t border-border pt-3 text-sm">{f.hitl}</p>
              <Button asChild variant="outline" size="sm" className="mt-4">
                <Link
                  to="/app/inbox"
                  search={{ as: "sales" }}
                  onClick={() => selectThread(f.threadId)}
                >
                  {f.prove}
                </Link>
              </Button>
            </article>
          );
        })}
      </div>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="text-[11px] tracking-wide text-muted-foreground uppercase">
              <th className="px-4 py-3">Function</th>
              <th className="px-4 py-3">What fires</th>
              <th className="px-4 py-3">Who still acts</th>
              <th className="px-4 py-3">Refused</th>
            </tr>
          </thead>
          <tbody>
            {[
              ["Messenger", "Verified draft · 24h window · two Saturday slots", "Person hits Send", "Auto-type into facebook.com"],
              ["SMS", "10DLC · STOP footer · segment count · quiet-hours warn", "Person hits Send SMS", "Blast, stealth after 9 pm"],
              ["Email", "Subject · signature · hours · same blocks", "Person hits Send email", "OTD, payment letters, drip autonomy"],
              ["Voice", "Talking points · log reached / voicemail / no-answer", "Person dials", "Auto-dial, voice agent"],
              ["ADF / CRM", "First contact, book, sold, or Push ADF", "Person made the contact", "CRM pull, dual-write, replace VinSolutions"],
              ["Comms package", "One-page to F&I or GSM · live movement · copy link", "Person hits Send package", "Auto-brief, email blast, bot handoff"],
            ].map((r) => (
              <tr key={r[0]} className="border-t border-border">
                {r.map((c, i) => (
                  <td key={i} className={cn("px-4 py-3", i === 0 && "font-medium")}>
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function OptionsTab({ path, onPath }: { path: PathId; onPath: (id: PathId) => void }) {
  const active = IMPACT_PATHS.find((p) => p.id === path) ?? IMPACT_PATHS[4];
  return (
    <div className="space-y-6">
      <p className="max-w-3xl text-muted-foreground">
        Five ways to spend the next ninety days. Only one gives hours back without giving the county a bot, and without
        betting a loaded salary on a coordinator who can leave for Lincoln.
      </p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {IMPACT_PATHS.map((p) => {
          const v = VERDICT[p.verdict];
          return (
            <button
              key={p.id}
              type="button"
              id={`impact-path-${p.id}`}
              onClick={() => onPath(p.id)}
              className={cn(
                "rounded-xl border p-4 text-left transition-colors duration-150",
                path === p.id ? "border-silver/50 bg-card" : "border-border bg-background hover:bg-accent/60",
              )}
            >
              <div className={cn("text-[11px] tracking-[0.14em] uppercase", v.className)}>{v.label}</div>
              <div className="mt-2 font-medium">{p.name}</div>
              <p className="mt-2 text-[12px] text-muted-foreground">{p.sticker}</p>
            </button>
          );
        })}
      </div>
      <article className="rounded-xl border border-border bg-card p-5" id="impact-path-detail">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-2xl">{active.name}</h2>
          <span className={cn("text-[11px] tracking-[0.14em] uppercase", VERDICT[active.verdict].className)}>
            {VERDICT[active.verdict].label}
          </span>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{active.sticker}</p>
        <dl className="mt-5 grid gap-4 md:grid-cols-2">
          <Fact k="Cost" v={active.cost} />
          <Fact k="Time" v={active.time} />
          <Fact k="Fit for Beatrice" v={active.fit} />
          <Fact k="Risk" v={active.risk} />
        </dl>
        <p className="mt-5 border-t border-border pt-4 text-sm leading-relaxed">{active.why}</p>
      </article>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="text-[11px] tracking-wide text-muted-foreground uppercase">
              <th className="px-4 py-3">Path</th>
              <th className="px-4 py-3">Call</th>
              <th className="px-4 py-3">Hours back</th>
              <th className="px-4 py-3">Sends itself</th>
              <th className="px-4 py-3">Invented price</th>
              <th className="px-4 py-3">Survives turnover</th>
            </tr>
          </thead>
          <tbody>
            {[
              ["Keep typing", "Today", "0", "No", "Human error", "n/a"],
              ["Hire BDC", "Later", "High, if they stay", "No", "Human error", "No — the person leaves"],
              ["Autopilot", "Refuse", "Highest claimed", "Yes", "High", "The vendor stays"],
              ["Stealth CUA", "Never", "Claimed", "Yes, hidden", "Plus a ban", "Until Meta notices"],
              ["HITL copilot", "Pursue", "15 h / rep / mo", "Never", "Blocked", "The desk stays"],
            ].map((r) => (
              <tr key={r[0]} className="border-t border-border">
                {r.map((c, i) => (
                  <td key={i} className={cn("px-4 py-3", i === 0 && "font-medium")}>
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AfterTab({ side, onSide }: { side: "before" | "after"; onSide: (s: "before" | "after") => void }) {
  const scene = IMPACT_SCENE[side];
  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <p className="max-w-2xl text-muted-foreground">
          Same 30 Messenger leads. Same six reps. Close rate held flat. The only thing that moves is whether a verified
          draft is sitting there when a person is ready to hit Send.
        </p>
        <div className="inline-flex rounded-lg bg-secondary p-1" role="group" aria-label="Before or after">
          <button
            type="button"
            id="impact-side-before"
            onClick={() => onSide("before")}
            className={cn(
              "h-11 rounded-md px-4 text-sm",
              side === "before" ? "bg-card text-foreground" : "text-muted-foreground",
            )}
          >
            Before
          </button>
          <button
            type="button"
            id="impact-side-after"
            onClick={() => onSide("after")}
            className={cn(
              "h-11 rounded-md px-4 text-sm",
              side === "after" ? "bg-card text-foreground" : "text-muted-foreground",
            )}
          >
            After · HITL
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3" data-side={side}>
        {IMPACT_TILES.map((t) => (
          <article key={t.k} className="rounded-xl border border-border bg-card p-5">
            <div className="text-[11px] tracking-wide text-muted-foreground uppercase">{t.k}</div>
            <div className="font-display mt-2 text-3xl tabular">{side === "before" ? t.before : t.after}</div>
            <p className="mt-2 text-[12px] text-muted-foreground">{t.d}</p>
          </article>
        ))}
      </div>
      <p className="mt-3 text-[12px] text-muted-foreground">
        {MODEL_NOTE} Pessimistic math on one rural Ford floor. Zero autonomous sends is the law, not a lift chip.
      </p>

      <section className="rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-[11px] tracking-[0.14em] text-muted-foreground uppercase">
            One Tuesday · Fairbury ping · {side === "before" ? "as it sits today" : "with a grounded draft"}
          </h2>
          <Clock className="size-4 text-silver" />
        </div>
        <ol className="mt-4 grid gap-3 md:grid-cols-4">
          {scene.map((b) => (
            <li key={b.t} className="rounded-lg border border-border bg-background p-4">
              <div className="text-[11px] tracking-wide text-muted-foreground uppercase">{b.t}</div>
              <div className="mt-2 text-sm font-medium">{b.who}</div>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{b.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-[11px] tracking-[0.14em] text-muted-foreground uppercase">Where the rep’s time goes · hours / month</h2>
          <HoursChart />
          <table className="mt-4 w-full text-left text-sm">
            <thead>
              <tr className="text-[11px] tracking-wide text-muted-foreground uppercase">
                <th className="pb-2">Activity</th>
                <th className="pb-2">Before</th>
                <th className="pb-2">After</th>
                <th className="pb-2">Δ</th>
              </tr>
            </thead>
            <tbody>
              {IMPACT_HOURS.map((r) => (
                <tr key={r.activity} className="border-t border-border">
                  <td className="py-2 pr-3">{r.activity}</td>
                  <td className="py-2 pr-3 tabular">{r.before}</td>
                  <td className="py-2 pr-3 tabular">{r.after}</td>
                  <td className="py-2 tabular">{r.delta}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-border font-medium">
                <td className="py-2 pr-3">Total</td>
                <td className="py-2 pr-3 tabular">33.0</td>
                <td className="py-2 pr-3 tabular">17.8</td>
                <td className="py-2 tabular">−15.2</td>
              </tr>
            </tbody>
          </table>
          <p className="mt-3 text-[12px] text-muted-foreground">
            Posting stays 8.7 on purpose. The 15 hours come from replies, follow-ups, and logging — the work that currently
            keeps a closer on a keyboard while a live up waits.
          </p>
        </article>
        <article className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-[11px] tracking-[0.14em] text-muted-foreground uppercase">Funnel · 30 Messenger leads per rep · pessimistic</h2>
          <FunnelChart />
          <table className="mt-4 w-full text-left text-sm">
            <thead>
              <tr className="text-[11px] tracking-wide text-muted-foreground uppercase">
                <th className="pb-2">Rate</th>
                <th className="pb-2">Before</th>
                <th className="pb-2">After</th>
                <th className="pb-2">Why we moved it (or didn’t)</th>
              </tr>
            </thead>
            <tbody>
              {IMPACT_RATES.map((r) => (
                <tr key={r[0]} className="border-t border-border">
                  {r.map((c, i) => (
                    <td key={i} className="py-2 pr-3">
                      {c}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </article>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {IMPACT_SCORES.map((s) => (
          <article key={s.who} className="rounded-xl border border-border bg-card p-5">
            <h3 className="font-medium">{s.who}</h3>
            <p className="mt-1 text-[12px] italic text-muted-foreground">{s.cares}</p>
            <dl className="mt-4 space-y-2 text-sm">
              {s.rows.map((r) => (
                <div key={r[0]} className="flex items-baseline justify-between gap-2">
                  <dt className="text-muted-foreground">{r[0]}</dt>
                  <dd className="tabular">
                    {r[1]} → <b>{r[2]}</b>
                  </dd>
                </div>
              ))}
            </dl>
          </article>
        ))}
      </section>

      <p className="text-[12px] leading-relaxed text-muted-foreground">
        <b className="text-foreground">Held flat or ignored:</b> {IMPACT_HELD.flat}{" "}
        <b className="text-foreground">Rounded against us:</b> {IMPACT_HELD.against}{" "}
        <b className="text-foreground">Volume:</b> {IMPACT_HELD.volume}{" "}
        <b className="text-foreground">Gross:</b> {IMPACT_HELD.gross}{" "}
        <b className="text-foreground">Store size:</b> {IMPACT_HELD.size}
      </p>
      <p className="text-[12px] leading-relaxed text-muted-foreground">{IMPACT_SOURCES}</p>
    </div>
  );
}

function TradeTab() {
  return (
    <div className="space-y-6">
      <p className="max-w-3xl text-muted-foreground">
        HITL is not free time. It is a set of trades. The ones we accept are the ones a Beatrice owner can live with.
        The ones we refuse are the ones that look like hours-back in a vendor deck.
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        {IMPACT_TRADES.map((t) => (
          <article key={t.title} className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2">
              {t.kind === "refuse" ? (
                <Ban className="size-4 text-destructive" />
              ) : t.kind === "accept" ? (
                <Check className="size-4 text-silver" />
              ) : (
                <ShieldCheck className="size-4 text-ok" />
              )}
              <span
                className={cn(
                  "text-[11px] tracking-[0.14em] uppercase",
                  t.kind === "refuse" ? "text-destructive" : t.kind === "accept" ? "text-muted-foreground" : "text-ok",
                )}
              >
                {t.kind}
              </span>
            </div>
            <h3 className="mt-2 font-medium">{t.title}</h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{t.cost}</p>
            <p className="mt-3 border-t border-border pt-3 text-sm leading-relaxed">{t.keep}</p>
          </article>
        ))}
      </div>
      <article className="rounded-xl border border-border bg-card p-5">
        <h3 className="font-medium">What would change the call</h3>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li>If the floor will not open a queue after two weeks of coaching — do not buy software. Fix the manager meeting.</li>
          <li>If phone volume, not typing, is the bottleneck — hire the BDC. Still give them this desk.</li>
          <li>If Meta grants a clean Marketplace API for personal profiles — drop paste-in. Do not drop human Send.</li>
          <li>If a pilot produces unsupported claims that left the building — kill it. The firewall failed or the stamp won.</li>
        </ul>
      </article>
    </div>
  );
}

function CallTab() {
  return (
    <div className="space-y-6" id="impact-call">
      <article className="rounded-xl border border-silver/40 bg-card p-6">
        <p className="text-[11px] tracking-[0.14em] text-muted-foreground uppercase">Recommendation · 90-day horizon</p>
        <h2 className="font-display mt-3 max-w-3xl text-3xl leading-tight">{IMPACT_CALL.verdict}</h2>
        <ul className="mt-6 max-w-3xl space-y-3 text-sm leading-relaxed text-muted-foreground">
          {IMPACT_CALL.because.map((b) => (
            <li key={b.slice(0, 32)} className="border-l border-silver/40 pl-4">
              {b}
            </li>
          ))}
        </ul>
      </article>
      <div className="grid gap-4 md:grid-cols-2">
        <article className="rounded-xl border border-border bg-card p-5">
          <h3 className="font-medium">How to try it</h3>
          <ol className="mt-4 space-y-3 text-sm text-muted-foreground">
            {IMPACT_CALL.pilot.map((p, i) => (
              <li key={p} className="grid grid-cols-[1.5rem_1fr] gap-2">
                <span className="tabular text-silver">{i + 1}.</span>
                <span>{p}</span>
              </li>
            ))}
          </ol>
        </article>
        <article className="rounded-xl border border-border bg-card p-5">
          <h3 className="font-medium">Sequence · nothing jumps the human</h3>
          <ol className="mt-4 space-y-4">
            {IMPACT_CALL.sequence.map((s) => (
              <li key={s.n} className="grid grid-cols-[2.5rem_1fr] gap-3 text-sm">
                <span className="tabular text-muted-foreground">{s.n}</span>
                <span>
                  <span className="font-medium">{s.t}.</span>{" "}
                  <span className="text-muted-foreground">{s.d}</span>
                </span>
              </li>
            ))}
          </ol>
        </article>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button asChild>
          <Link to="/app/inbox" search={{ as: "sales" }}>
            Work a Tuesday on the desk
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/app/analytics">Edit the assumptions</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/spot">What we refuse</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/pricing">$129 / $399 / $1,190</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/pilot">Request a pilot</Link>
        </Button>
      </div>
    </div>
  );
}

function Fact({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-[11px] tracking-[0.14em] text-muted-foreground uppercase">{k}</dt>
      <dd className="mt-1 text-sm leading-relaxed">{v}</dd>
    </div>
  );
}

function HoursChart() {
  const [on, setOn] = useState(false);
  useEffect(() => setOn(true), []);
  const data = IMPACT_HOURS.map((h) => ({
    name: h.activity.replace("Marketplace listings", "listings").replace("Double-checking tone / price / availability", "Double-checking").replace("Reading, researching, typing DMs", "Typing DMs").replace("Follow-ups on quiet leads", "Follow-ups").replace("CRM / tracking", "CRM"),
    before: h.before,
    after: h.after,
  }));
  if (!on) return <div className="mt-4 h-64" aria-hidden />;
  return (
    <div className="mt-4 h-64" id="impact-hours-chart">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 8, left: 4, bottom: 0 }}>
          <CartesianGrid stroke="var(--color-border)" horizontal={false} />
          <XAxis type="number" domain={[0, 20]} tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} />
          <YAxis
            type="category"
            dataKey="name"
            width={108}
            tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
          />
          <Tooltip
            contentStyle={{
              background: "var(--color-card)",
              border: "1px solid var(--color-border)",
              borderRadius: 8,
              color: "var(--color-foreground)",
            }}
          />
          <Bar dataKey="before" name="Before" fill="var(--color-silver)" fillOpacity={0.45} radius={[0, 2, 2, 0]} />
          <Bar dataKey="after" name="After" fill="var(--color-paper)" radius={[0, 2, 2, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function FunnelChart() {
  const [on, setOn] = useState(false);
  useEffect(() => setOn(true), []);
  const data = IMPACT_FUNNEL.map((f) => ({
    name: f.stage,
    before: f.beforePct,
    after: f.afterPct,
  }));
  if (!on) return <div className="mt-4 h-56" aria-hidden />;
  return (
    <div className="mt-4 h-56" id="impact-funnel-chart">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--color-border)" vertical={false} />
          <XAxis dataKey="name" tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} />
          <YAxis domain={[0, 100]} tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} unit="%" />
          <Tooltip
            contentStyle={{
              background: "var(--color-card)",
              border: "1px solid var(--color-border)",
              borderRadius: 8,
              color: "var(--color-foreground)",
            }}
            formatter={(value) => [`${value}%`, ""]}
          />
          <Bar dataKey="before" name="Before" fill="var(--color-silver)" fillOpacity={0.45} radius={[2, 2, 0, 0]} />
          <Bar dataKey="after" name="After" fill="var(--color-paper)" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ImpactStamp() {
  return (
    <div className="mb-8 grid gap-3 md:grid-cols-3">
      <article className="rounded-xl border border-border bg-card p-5">
        <Scale className="size-4 text-silver" />
        <h2 className="mt-3 font-medium">Keep the human in the loop</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Agentic assist drafts from inventory. A person still hits Send. Ever. Hours back assume paste-in or Page API —
          not a computer-use agent typing into a personal Facebook login. That path is refused; see{" "}
          <Link to="/spot" className="underline-offset-2 hover:underline">
            Spot agents
          </Link>
          .
        </p>
      </article>
      <article className="rounded-xl border border-border bg-card p-5">
        <Clock className="size-4 text-silver" />
        <h2 className="mt-3 font-medium">The constraint is typing</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Several hours a day on keyboards, chasing “is this still available?” The close is the Saturday demo. We do not
          claim a better closer. We claim every lead gets a fast, verified reply and a booked slot.
        </p>
      </article>
      <article className="rounded-xl border border-border bg-card p-5">
        <ShieldCheck className="size-4 text-silver" />
        <h2 className="mt-3 font-medium">Pessimistic on purpose</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Close rate held flat. Show rate almost flat. Rural show-rate gift ignored. After-hours conversion not claimed.
          If the math still works here, it works when the county is kinder.
        </p>
      </article>
    </div>
  );
}
