import { Sparkline } from "@/components/sparkline";
import { Badge } from "@/components/ui/badge";
import { DEALER, TEAM } from "@/lib/seed";
import { buildBrief, latestPackage, PACKAGE_AUDIENCE } from "@/lib/package";
import { clock, dayLabel, relativeTime } from "@/lib/format";
import { chartSlots } from "@/lib/thread-length";
import { useApp } from "@/lib/store";
import { CHANNEL_META } from "@/lib/channels";
import { cn } from "@/lib/utils";
import type { PackageAudience, Thread } from "@/lib/types";

export function DealBrief({
  thread,
  audience,
  compact,
}: {
  thread: Thread;
  audience: PackageAudience;
  compact?: boolean;
}) {
  const vehicles = useApp((s) => s.vehicles);
  const appointments = useApp((s) => s.appointments);
  const packages = useApp((s) => s.packages);
  const threadLength = useApp((s) => s.threadLength);
  const brief = buildBrief(thread, vehicles, appointments, audience);
  const last = latestPackage(packages, thread.id, audience);
  const from = last ? TEAM.find((r) => r.id === last.fromRepId) : null;
  const slots = chartSlots(thread, threadLength);
  const meta = PACKAGE_AUDIENCE[audience];
  const finance = audience === "finance";

  return (
    <article
      id="deal-brief"
      className={cn("deal-brief rounded-xl border border-border bg-card", compact ? "p-4" : "p-5 sm:p-7")}
    >
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
        <div>
          <p className="text-[11px] tracking-[0.16em] text-muted-foreground uppercase">
            LotBeacon · {meta.short} brief
          </p>
          <h1 className="font-display mt-1 text-2xl leading-tight sm:text-3xl">{thread.customerName}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {thread.city} · {thread.phone}
            {thread.email ? ` · ${thread.email}` : ""}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[11px] tracking-wide text-muted-foreground uppercase">{DEALER.name}</p>
          <p className="text-[12px] text-muted-foreground">{DEALER.address.split(",")[0]}</p>
          {last ? (
            <p className="mt-2 text-[12px] text-muted-foreground">
              {last.status === "opened" ? "Opened" : "Sent"} {relativeTime(last.openedAt ?? last.sentAt)}
              {from ? ` · ${from.name.split(" ")[0]}` : ""}
            </p>
          ) : (
            <p className="mt-2 text-[12px] text-muted-foreground">Live · not sent yet</p>
          )}
        </div>
      </header>

      <p className="mt-4 text-sm text-muted-foreground">{meta.kicker}</p>

      <div className="mt-5 grid gap-5 sm:grid-cols-[1fr_auto] sm:items-end">
        <div>
          <p className="text-[11px] tracking-wide text-muted-foreground uppercase">{brief.sig.momentum.label}</p>
          {brief.sig.headline ? (
            <p className="mt-1 text-[12px] tracking-wide uppercase">{brief.sig.headline.text}</p>
          ) : null}
          <Sparkline
            series={brief.sig.momentum.series}
            trend={brief.sig.momentum.trend}
            nums
            refs
            width={compact ? 240 : 320}
            height={compact ? 56 : 72}
            slots={slots}
          />
        </div>
        <div className="text-right">
          <div className="font-display text-5xl tabular leading-none">{brief.sig.momentum.score}</div>
          <div className="mt-1 text-[11px] tracking-wide text-muted-foreground uppercase">Show-likelihood</div>
        </div>
      </div>

      <ul className="mt-4 grid grid-cols-5 gap-2">
        {brief.sig.signals.map((s) => (
          <li key={s.key} className="min-w-0 rounded-md border border-border bg-background px-2 py-2 text-center">
            <div className="font-display text-lg tabular leading-none">{s.score}</div>
            <div
              className={cn(
                "mt-1 text-[10px] tabular",
                s.trend === "up" ? "text-ok" : s.trend === "down" ? "text-destructive" : "text-muted-foreground",
              )}
            >
              {s.delta > 0 ? `+${s.delta}` : s.delta}
            </div>
            <div className="mt-1 truncate text-[10px] leading-tight text-muted-foreground">{s.label}</div>
          </li>
        ))}
      </ul>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <section>
          <p className="text-[11px] tracking-wide text-muted-foreground uppercase">Vehicle</p>
          <p className="mt-1 text-sm">{brief.vehicleLine}</p>
          {brief.vehicle ? (
            <p className="mt-1 text-[12px] text-muted-foreground">
              {finance ? "Window sticker · not quoted in-thread" : "Inventory"} · {brief.sticker} · {brief.vehicle.status}
              {brief.vehicle.vin ? ` · ${brief.vehicle.vin}` : ""}
            </p>
          ) : null}
        </section>
        <section>
          <p className="text-[11px] tracking-wide text-muted-foreground uppercase">Deal</p>
          <p className="mt-1 text-sm">
            {brief.stage} · {thread.goal}
          </p>
          <p className="mt-1 text-[12px] text-muted-foreground">
            {brief.closer ? `Closer ${brief.closer.name}` : "Unassigned closer"}
            {brief.setter ? ` · setter ${brief.setter.name.split(" ")[0]}` : ""}
            {brief.appt ? ` · ${dayLabel(brief.appt.at)} ${clock(brief.appt.at)}` : ""}
          </p>
        </section>
      </div>

      <section className="mt-6">
        <p className="text-[11px] tracking-wide text-muted-foreground uppercase">Known</p>
        <ul className="mt-2 space-y-1.5">
          {(finance ? brief.financeFocus : thread.facts).map((f) => (
            <li key={f.id} className="text-sm">
              <span className="text-muted-foreground">{f.key} · </span>
              {f.value}
              {f.evidence ? <span className="text-muted-foreground"> · “{f.evidence}”</span> : null}
            </li>
          ))}
        </ul>
      </section>

      {thread.intel.moments.length ? (
        <section className="mt-6">
          <p className="text-[11px] tracking-wide text-muted-foreground uppercase">Hot buttons</p>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-[11px] text-destructive">Can break it</p>
              <ul className="mt-1 space-y-1">
                {thread.intel.moments.filter((m) => m.kind === "risk" || m.kind === "objection").length ? (
                  thread.intel.moments
                    .filter((m) => m.kind === "risk" || m.kind === "objection")
                    .map((m) => (
                      <li key={`${m.at}-${m.label}`} className="text-sm">
                        {m.label}
                        <span className="text-muted-foreground"> · “{m.quote}”</span>
                      </li>
                    ))
                ) : (
                  <li className="text-sm text-muted-foreground">None on the last turns</li>
                )}
              </ul>
            </div>
            <div>
              <p className="text-[11px] text-ok">Moved it back</p>
              <ul className="mt-1 space-y-1">
                {thread.intel.moments.filter((m) => m.kind === "commit" || m.kind === "positive").length ? (
                  thread.intel.moments
                    .filter((m) => m.kind === "commit" || m.kind === "positive")
                    .map((m) => (
                      <li key={`${m.at}-${m.label}`} className="text-sm">
                        {m.label}
                        <span className="text-muted-foreground"> · “{m.quote}”</span>
                      </li>
                    ))
                ) : (
                  <li className="text-sm text-muted-foreground">None on the last turns</li>
                )}
              </ul>
            </div>
          </div>
        </section>
      ) : null}

      {finance ? (
        <section className="mt-6 rounded-md border border-border bg-background p-3">
          <p className="text-[11px] tracking-wide text-muted-foreground uppercase">What has not been said</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {brief.notSaid.map((n) => (
              <Badge key={n} variant="ok">
                {n}
              </Badge>
            ))}
            {brief.said.financing ? <Badge variant="warn">They asked about financing</Badge> : null}
            {brief.said.payment ? <Badge variant="danger">Payment language is on the thread</Badge> : null}
          </div>
          <p className="mt-2 text-[12px] text-muted-foreground">
            F&I pencils at the desk. The thread is not a worksheet.
          </p>
        </section>
      ) : (
        <section className="mt-6">
          <p className="text-[11px] tracking-wide text-muted-foreground uppercase">Next ten seconds</p>
          <p className="mt-1 text-sm">{brief.next}</p>
          {thread.intel.risks.length ? (
            <p className="mt-2 text-[12px] text-muted-foreground">Risk · {thread.intel.risks.join(" · ")}</p>
          ) : null}
        </section>
      )}

      <section className="mt-6">
        <p className="text-[11px] tracking-wide text-muted-foreground uppercase">Last turns</p>
        <div className="mt-3">
          {brief.lastTurns.map((m) => (
            <div key={m.id} className={cn("mb-3 flex", m.who === "customer" ? "justify-start" : "justify-end")}>
              <div
                className={cn(
                  "max-w-[min(100%,34rem)] rounded-lg px-3 py-2",
                  m.who === "customer" && "bg-secondary text-foreground",
                  m.who === "rep" && "bg-primary text-primary-foreground",
                  m.who === "ai" && "bg-accent text-foreground",
                )}
              >
                <div className="mb-1 flex gap-2 text-[10px] tracking-wide uppercase opacity-70">
                  <span>{m.sender}</span>
                  <span>{CHANNEL_META[m.channel].short}</span>
                  <span className="tabular">{relativeTime(m.at)}</span>
                </div>
                <p className="text-sm leading-relaxed">{m.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {thread.intel.coaching ? (
        <p className="mt-6 border-t border-border pt-4 text-sm text-muted-foreground">{thread.intel.coaching}</p>
      ) : null}

      <p className="mt-5 text-[11px] text-muted-foreground">
        A person still hits Send. This page is a briefing, not an autonomous handoff.
      </p>
    </article>
  );
}
