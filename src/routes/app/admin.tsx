import { useEffect, useReducer } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { SparkRail, Sparkline } from "@/components/sparkline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buildAuditBundle } from "@/lib/metrics";
import { DEALER } from "@/lib/seed";
import { communicationSignals } from "@/lib/signals";
import { nextAction, bucketFor } from "@/lib/engine";
import { TEAM, useApp } from "@/lib/store";
import { chartSlots } from "@/lib/thread-length";
import { getDesk } from "@/lib/desk-engine.js";
import { CRM_STATUS, CRM_TARGETS, CRM_TRIGGER } from "@/lib/crm";
import { PACKAGE_AUDIENCE } from "@/lib/package";
import { relativeTime } from "@/lib/format";

export const Route = createFileRoute("/app/admin")({
  component: AdminPage,
});

function AdminPage() {
  const threads = useApp((s) => s.threads);
  const appointments = useApp((s) => s.appointments);
  const vehicles = useApp((s) => s.vehicles);
  const threadLength = useApp((s) => s.threadLength);

  function exportAudit() {
    const blob = new Blob([JSON.stringify(buildAuditBundle({ threads, vehicles, appointments }), null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lotbeacon-audit-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const open = threads.filter((t) => !t.dnc && t.stage !== "sold" && t.stage !== "lost");

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">GSM · Monday huddle</p>
          <h1 className="font-display mt-1 text-3xl">Monday huddle</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            What the gate held. What can break a deal. What we already know, in their words. Zero autonomous sends.
            Inbox is the thread. This door is the floor at 7:45.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/desk">Open language / path desk</Link>
          </Button>
          <Button variant="outline" size="sm" onClick={exportAudit}>
            Export audit log
          </Button>
        </div>
      </header>

      <MondayHuddle />

      <h2 className="mt-10 text-[11px] tracking-[0.14em] text-muted-foreground uppercase">
        Floor · asked / acknowledged / holding
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Aggregated list of every sales rep's open contacts. One row per shopper. Inbox is where a setter works a
        single thread.
      </p>
      <div className="mt-3 overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="text-[11px] tracking-wide text-muted-foreground uppercase">
              <th className="p-3">Customer</th>
              <th className="p-3">Asked</th>
              <th className="p-3">Acknowledged</th>
              <th className="p-3">Holding</th>
              <th className="p-3">Show-likelihood</th>
            </tr>
          </thead>
          <tbody>
            {open.map((t) => {
              const asked = [...t.messages].reverse().find((m) => m.who === "customer");
              const ack = [...t.messages].reverse().find((m) => m.who === "rep");
              const sig = communicationSignals(t);
              const bucket = bucketFor(t, appointments);
              return (
                <tr key={t.id} className="border-t border-border align-top">
                  <td className="p-3">
                    <Link to="/app/inbox" search={{ as: "sales" }} className="font-medium underline-offset-4 hover:underline">
                      {t.customerName}
                    </Link>
                    <div className="text-[11px] text-muted-foreground">{t.hint}</div>
                  </td>
                  <td className="max-w-[16rem] p-3 text-muted-foreground">{asked?.text ?? "—"}</td>
                  <td className="max-w-[16rem] p-3 text-muted-foreground">{ack?.text ?? "Not yet. A person still sends."}</td>
                  <td className="p-3">
                    <div>{nextAction(t, bucket)}</div>
                    <div className="text-[11px] text-muted-foreground">{t.goal}</div>
                  </td>
                  <td className="p-3">
                    <SparkRail
                      series={sig.momentum.series}
                      trend={sig.momentum.trend}
                      score={sig.momentum.score}
                      label={sig.momentum.label}
                      slots={chartSlots(t, threadLength)}
                      delta={sig.momentum.delta}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <DeskAdminPanel />

      <CrmLog />

      <PackageLog />

      <p className="mt-4 text-[12px] text-muted-foreground">
        Suggested wording stays a draft. No live Meta attach. Pulses move when you receive the next demo line or send.
      </p>
    </div>
  );
}

function MondayHuddle() {
  const threads = useApp((s) => s.threads);
  const intercepts = useApp((s) => s.intercepts) ?? [];
  const selectThread = useApp((s) => s.selectThread);
  const threadLength = useApp((s) => s.threadLength);
  const held = intercepts.filter((i) => i.status === "held");
  const late = intercepts.filter((i) => i.status === "late");
  const hot = threads
    .flatMap((t) =>
      (t.intel.moments ?? [])
        .filter((m) => m.kind === "risk" || m.kind === "objection")
        .map((m) => ({ ...m, threadId: t.id, name: t.customerName })),
    )
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 8);
  const featured = ["t_riley", "t_sarah", "t_mike", "t_jen"]
    .map((id) => threads.find((t) => t.id === id))
    .filter((t): t is NonNullable<typeof t> => Boolean(t));
  const movers = [...threads]
    .filter((t) => !t.dnc && t.stage !== "sold" && t.stage !== "lost")
    .sort((a, b) => new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime())
    .slice(0, 5);

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-border p-3">
          <div className="text-[11px] tracking-wide text-muted-foreground uppercase">Autonomous sends</div>
          <div className="font-display mt-1 text-2xl tabular">0</div>
          <p className="mt-1 text-[12px] text-muted-foreground">A person still hits Send. Ever.</p>
        </div>
        <div className="rounded-lg border border-border p-3">
          <div className="text-[11px] tracking-wide text-muted-foreground uppercase">Held at the gate</div>
          <div className="font-display mt-1 text-2xl tabular">{held.length}</div>
          <p className="mt-1 text-[12px] text-muted-foreground">{late.length} late · minutes the floor did not burn</p>
        </div>
        <div className="rounded-lg border border-border p-3">
          <div className="text-[11px] tracking-wide text-muted-foreground uppercase">Hot buttons</div>
          <div className="font-display mt-1 text-2xl tabular">{hot.length}</div>
          <p className="mt-1 text-[12px] text-muted-foreground">Risks and objections with their words</p>
        </div>
      </div>

      <h2 className="mt-6 text-[11px] tracking-[0.14em] text-muted-foreground uppercase">Held at the gate</h2>
      {intercepts.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">Gate held. Nothing to review.</p>
      ) : (
        <ul className="mt-3 divide-y divide-border border-y border-border">
          {intercepts.map((i) => (
            <li key={i.id} className="py-3">
              <Link
                to="/app/inbox"
                search={{ as: "admin" }}
                onClick={() => selectThread(i.threadId)}
                className="font-medium underline-offset-4 hover:underline"
              >
                {i.customerName}
              </Link>
              <span className={i.status === "held" ? "ml-2 text-[11px] uppercase text-ok" : "ml-2 text-[11px] uppercase text-warn"}>
                {i.status}
              </span>
              <p className="mt-1 text-sm text-muted-foreground">“{i.quote}”</p>
              <p className="mt-1 text-[12px] text-muted-foreground">{i.reason}</p>
            </li>
          ))}
        </ul>
      )}

      <h2 className="mt-6 text-[11px] tracking-[0.14em] text-muted-foreground uppercase">Hot buttons</h2>
      {hot.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">Gate held. Nothing to review.</p>
      ) : (
        <ul className="mt-3 divide-y divide-border border-y border-border">
          {hot.map((m) => (
            <li key={`${m.threadId}-${m.at}-${m.label}`} className="py-3">
              <button type="button" className="text-left" onClick={() => selectThread(m.threadId)}>
                <span className="font-medium">{m.name}</span>
                <span className="ml-2 text-[11px] uppercase text-muted-foreground">{m.kind}</span>
                <p className="mt-1 text-sm">{m.label}</p>
                <p className="mt-1 text-[12px] text-muted-foreground">“{m.quote}”</p>
              </button>
            </li>
          ))}
        </ul>
      )}

      <h2 className="mt-6 text-[11px] tracking-[0.14em] text-muted-foreground uppercase">Known · their words</h2>
      <div className="mt-3 grid gap-4 md:grid-cols-2">
        {featured.map((t) => (
          <article key={t.id} className="rounded-lg border border-border p-3">
            <Link
              to="/app/inbox"
              search={{ as: "admin" }}
              onClick={() => selectThread(t.id)}
              className="font-medium underline-offset-4 hover:underline"
            >
              {t.customerName}
            </Link>
            <p className="mt-1 text-[12px] text-muted-foreground">{t.hint}</p>
            <ul className="mt-2 space-y-1.5">
              {t.facts.slice(0, 6).map((f) => (
                <li key={f.id} className="text-sm">
                  <span className="text-muted-foreground">{f.key}: </span>
                  <b>{f.value}</b>
                  {f.evidence ? <div className="text-[12px] text-muted-foreground">“{f.evidence}”</div> : null}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>

      <h2 className="mt-6 text-[11px] tracking-[0.14em] text-muted-foreground uppercase">Show-likelihood · moved</h2>
      <ul className="mt-3 grid gap-3 sm:grid-cols-2">
        {movers.map((t) => {
          const sig = communicationSignals(t);
          return (
            <li key={t.id} className="rounded-lg border border-border p-3">
              <div className="flex items-baseline justify-between gap-2">
                <Link
                  to="/app/inbox"
                  search={{ as: "admin" }}
                  onClick={() => selectThread(t.id)}
                  className="font-medium underline-offset-4 hover:underline"
                >
                  {t.customerName}
                </Link>
                <span className="text-[12px] tabular text-muted-foreground">{sig.momentum.score}</span>
              </div>
              <SparkRail
                series={sig.momentum.series}
                trend={sig.momentum.trend}
                score={sig.momentum.score}
                label={sig.momentum.label}
                slots={chartSlots(t, threadLength)}
                delta={sig.momentum.delta}
              />
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function CrmLog() {
  const pushes = useApp((s) => s.crmPushes);
  const threads = useApp((s) => s.threads);
  const selectThread = useApp((s) => s.selectThread);
  const ordered = [...pushes].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  return (
    <section className="mt-10">
      <h2 className="text-[11px] tracking-[0.14em] text-muted-foreground uppercase">
        CRM push · ADF 1.0 · {CRM_TARGETS[DEALER.crmTarget].label}
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        One-way prospect push. First contact, book, sold, or a person hitting Push ADF. We do not pull VinSolutions. The
        thread still needs a human Send.
      </p>
      <div className="mt-3 overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="text-[11px] tracking-wide text-muted-foreground uppercase">
              <th className="p-3">Lead</th>
              <th className="p-3">Trigger</th>
              <th className="p-3">Status</th>
              <th className="p-3">When</th>
              <th className="p-3">Note</th>
            </tr>
          </thead>
          <tbody>
            {ordered.map((p) => {
              const t = threads.find((x) => x.id === p.threadId);
              const tone = CRM_STATUS[p.status].tone;
              return (
                <tr key={p.id} className="border-t border-border">
                  <td className="p-3">
                    <Link
                      to="/app/inbox"
                      search={{ as: "sales" }}
                      onClick={() => selectThread(p.threadId)}
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      {t?.customerName ?? p.threadId}
                    </Link>
                    <div className="text-[11px] tabular text-muted-foreground">{p.leadId}</div>
                  </td>
                  <td className="p-3">{CRM_TRIGGER[p.trigger]}</td>
                  <td className="p-3">
                    <Badge variant={tone === "ok" ? "ok" : tone === "warn" ? "warn" : tone === "danger" ? "danger" : "default"}>
                      {CRM_STATUS[p.status].label}
                    </Badge>
                  </td>
                  <td className="p-3 tabular text-muted-foreground">{relativeTime(p.at)}</td>
                  <td className="p-3 text-muted-foreground">{p.note}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function PackageLog() {
  const packages = useApp((s) => s.packages);
  const threads = useApp((s) => s.threads);
  const ordered = [...packages].sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
  return (
    <section className="mt-10">
      <h2 className="text-[11px] tracking-[0.14em] text-muted-foreground uppercase">Comms packages · F&I / GSM</h2>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        One-page briefs a person sent to finance or the sales manager. The link stays live — movement updates as the
        setter works the thread.
      </p>
      <div className="mt-3 overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="text-[11px] tracking-wide text-muted-foreground uppercase">
              <th className="p-3">Customer</th>
              <th className="p-3">To</th>
              <th className="p-3">From</th>
              <th className="p-3">Status</th>
              <th className="p-3">When</th>
              <th className="p-3">Note</th>
            </tr>
          </thead>
          <tbody>
            {ordered.map((p) => {
              const t = threads.find((x) => x.id === p.threadId);
              const to = TEAM.find((r) => r.id === p.toRepId);
              const from = TEAM.find((r) => r.id === p.fromRepId);
              const meta = PACKAGE_AUDIENCE[p.audience];
              return (
                <tr key={p.id} className="border-t border-border">
                  <td className="p-3">
                    <Link
                      to="/app/brief/$threadId"
                      params={{ threadId: p.threadId }}
                      search={{ for: meta.forParam }}
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      {t?.customerName ?? p.threadId}
                    </Link>
                  </td>
                  <td className="p-3">
                    {to?.name.split(" ")[0]}
                    <div className="text-[11px] text-muted-foreground">{meta.short}</div>
                  </td>
                  <td className="p-3 text-muted-foreground">{from?.name.split(" ")[0]}</td>
                  <td className="p-3">
                    <Badge variant={p.status === "opened" ? "ok" : "warn"}>
                      {p.status === "opened" ? "Opened" : "Unopened"}
                    </Badge>
                  </td>
                  <td className="p-3 tabular text-muted-foreground">{relativeTime(p.sentAt)}</td>
                  <td className="p-3 text-muted-foreground">{p.note}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function DeskAdminPanel() {
  const [, bump] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    getDesk()?.fromQuery();
    bump();
  }, []);
  const d = getDesk();
  if (!d) return null;
  const n = d.adminNote();
  const path = d.PATHS.find((p) => p.id === d.state.path);
  const lang = d.LANGS.find((l) => l.id === d.state.lang);
  const raw = d.detail() as {
    signals?: { signals?: { key: string; label: string; series: number[]; score: number; trend: string; why: string }[] };
    exchange?: { slots?: number };
  };
  const pulses = raw.signals?.signals ?? [];
  const slots = raw.exchange?.slots;

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] tracking-[0.14em] text-muted-foreground uppercase">Desk path · Riley Cole</p>
          <h2 className="font-display mt-1 text-xl">What they asked, what we acknowledged, what we are holding</h2>
        </div>
        <div className="flex flex-wrap gap-1">
          {d.LANGS.map((l) => (
            <Button
              key={l.id}
              size="xs"
              variant={d.state.lang === l.id ? "default" : "outline"}
              onClick={() => {
                d.setLang(l.id);
                bump();
              }}
            >
              {l.label}
            </Button>
          ))}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1">
        {d.PATHS.map((p) => (
          <Button
            key={p.id}
            size="sm"
            variant={d.state.path === p.id ? "default" : "outline"}
            onClick={() => {
              d.setPath(p.id);
              bump();
            }}
          >
            {p.label}
          </Button>
        ))}
      </div>
      <dl className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <dt className="text-[11px] tracking-wide text-muted-foreground uppercase">Language</dt>
          <dd className="mt-1 text-sm">{lang?.label ?? "English"}</dd>
        </div>
        <div>
          <dt className="text-[11px] tracking-wide text-muted-foreground uppercase">Thread length</dt>
          <dd className="mt-1 text-sm">
            {path?.label} · {path?.blurb}
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-[11px] tracking-wide text-muted-foreground uppercase">What they asked</dt>
          <dd className="mt-1 text-sm">{n.asked}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-[11px] tracking-wide text-muted-foreground uppercase">Acknowledged</dt>
          <dd className="mt-1 text-sm">{n.acknowledged}</dd>
        </div>
        <div>
          <dt className="text-[11px] tracking-wide text-muted-foreground uppercase">Next step the desk is holding</dt>
          <dd className="mt-1">
            <Badge>{n.holding}</Badge>
          </dd>
        </div>
        <div>
          <dt className="text-[11px] tracking-wide text-muted-foreground uppercase">Note</dt>
          <dd className="mt-1 text-sm text-muted-foreground">{n.note}</dd>
        </div>
      </dl>
      <div className="mt-5">
        <p className="text-[11px] tracking-wide text-muted-foreground uppercase">Pulses this step</p>
        {pulses.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Step the thread on Queue to watch price fit, vehicle fit, and odds they show move.
          </p>
        ) : (
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {pulses.map((s) => (
              <li key={s.key}>
                <div className="flex items-baseline justify-between text-sm">
                  <span>{s.label}</span>
                  <span className="tabular">{s.score}</span>
                </div>
                <Sparkline series={s.series} trend={s.trend} nums refs width={200} height={56} slots={slots} />
                <p className="text-[11px] text-muted-foreground">{s.why}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="mt-5 text-sm">
        <span className="text-muted-foreground">{d.OUTCOME.label} · </span>
        {d.OUTCOME.line}
      </p>
      {n.demo_copy ? (
        <p className="mt-2 text-[12px] text-muted-foreground">
          Non-English lines are demo copy. Not a certified translation. Languages follow the Nebraska DHHS Language and
          LEP Report Card 2021 (ACS).
        </p>
      ) : null}
    </section>
  );
}
