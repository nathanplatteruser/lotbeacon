import { useEffect, useReducer, useRef } from "react";
import { Sparkline, SparkRail } from "@/components/sparkline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { downloadIcs, googleCalendarUrl } from "@/lib/signals";
import { getDesk } from "@/lib/desk-engine.js";

function desk() {
  return getDesk();
}

type Signal = { key: string; label: string; series: number[]; score: number; trend: string; why: string; delta?: number };

export function DeskWorkspace() {
  const [, bump] = useReducer((n: number) => n + 1, 0);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    desk()?.fromQuery();
    bump();
  }, []);

  const d = desk();
  const detail = d
    ? (d.detail() as {
        customer: { name: string };
        messages: { direction: string; text: string; ago?: string }[];
        draft: { text: string };
        booking: { slots?: { label: string; day_label?: string; iso?: string }[]; selected?: { label: string; day_label: string; iso: string }; stage?: string };
        admin_note: { asked: string; acknowledged: string; holding: string; note: string };
        signals: { headline?: { text: string; why: string }; signals: Signal[] };
        momentum: { series: number[]; trend: string; score: number; label: string };
        facts: { key: string; value: string; certainty: string }[];
        deal_file: { forward_text: string };
        your_move: { text: string };
        next_step: string;
        demo_copy: boolean;
        window: { remaining: string };
        ownership: { line: string };
        vehicle: { year: number; make: string; model: string; trim: string; stock_number: string };
        calendar?: { ics?: string };
        hint: string;
        funnel: { substate: string };
        exchange: { current: number; required: number; max: number; slots: number; closed: boolean; closeKind?: string | null; label: string };
      })
    : null;

  useEffect(() => {
    const pane = endRef.current?.closest("[data-desk-thread]");
    if (pane) pane.scrollTop = pane.scrollHeight;
  }, [detail?.messages.length]);

  function act(fn: () => void) {
    fn();
    bump();
  }

  if (!d || !detail) {
    return <p className="p-6 text-sm text-muted-foreground">Desk engine loading…</p>;
  }

  const ics = (detail.calendar && detail.calendar.ics) || "";
  const pct = detail.exchange.max ? Math.round((detail.exchange.current / detail.exchange.max) * 100) : 0;
  const slots = detail.exchange.slots || detail.exchange.max + 2;
  const closed = detail.exchange.closed;
  const readyToClose = detail.exchange.current >= detail.exchange.max && !closed;
  const showPulse = detail.signals.signals.find((s) => s.key === "show_odds") ?? {
    series: detail.momentum.series,
    trend: detail.momentum.trend,
    score: detail.momentum.score,
    label: detail.momentum.label,
    why: "",
    key: "show_odds",
    delta: 0,
  };

  return (
    <div className="grid min-h-[70vh] gap-0 border border-border lg:grid-cols-[280px_1fr_340px]">
      <aside className="border-b border-border p-4 lg:sticky lg:top-0 lg:max-h-[calc(100dvh-4rem)] lg:overflow-y-auto lg:border-r lg:border-b-0">
        <p className="text-[11px] tracking-wide text-muted-foreground uppercase">Desk</p>
        <p className="mt-2 text-sm">{detail.hint}</p>

        <p className="mt-4 text-[11px] tracking-wide text-muted-foreground uppercase">Thread length</p>
        <p className="mt-1 text-sm tabular">{detail.exchange.label}</p>
        <Progress className="mt-2" value={pct} />
        <p className="mt-1 text-[11px] text-muted-foreground">
          Quick 4 · Medium 10 · Guided 15. A close (book, withdraw, or ghost) only after the last exchange. Each Send fills the next tick.
        </p>

        <p className="mt-4 text-[11px] tracking-wide text-muted-foreground uppercase">Odds they show</p>
        <SparkRail
          series={showPulse.series}
          trend={showPulse.trend}
          score={showPulse.score}
          label={detail.momentum.label}
          slots={slots}
          delta={showPulse.delta}
        />

        <p className="mt-4 text-[11px] tracking-wide text-muted-foreground uppercase">Pulses this exchange</p>
        <ul className="mt-2 space-y-3">
          {detail.signals.signals.map((s) => (
            <li key={`left-${s.key}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm">{s.label}</span>
                <span className="tabular text-sm">
                  {s.score}
                  {typeof s.delta === "number" && s.delta !== 0 ? (
                    <span className={s.trend === "up" ? " text-ok" : s.trend === "down" ? " text-destructive" : " text-warn"}>
                      {" "}
                      {s.delta > 0 ? `+${s.delta}` : s.delta}
                    </span>
                  ) : null}
                </span>
              </div>
              <Sparkline series={s.series} trend={s.trend} nums width={200} height={48} maxPoints={18} slots={slots} />
            </li>
          ))}
        </ul>

        <p className="mt-4 text-[11px] tracking-wide text-muted-foreground uppercase">Language</p>
        <div className="mt-2 flex flex-wrap gap-1">
          {d.LANGS.map((l) => (
            <Button key={l.id} size="xs" variant={d.state.lang === l.id ? "default" : "outline"} onClick={() => act(() => d.setLang(l.id))}>
              {l.label}
            </Button>
          ))}
        </div>
        <p className="mt-4 text-[11px] tracking-wide text-muted-foreground uppercase">Path</p>
        <div className="mt-2 flex flex-col gap-1">
          {d.PATHS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => act(() => d.setPath(p.id))}
              className={`min-h-11 rounded-md border px-3 py-2 text-left text-sm ${d.state.path === p.id ? "border-paper bg-paper text-ink" : "border-border"}`}
            >
              <div>{p.label}</div>
              <div className={`mt-0.5 text-[11px] ${d.state.path === p.id ? "text-ink/70" : "text-muted-foreground"}`}>{p.blurb}</div>
            </button>
          ))}
        </div>
        <Button className="mt-4" variant="ghost" size="sm" onClick={() => act(() => d.resetStep())}>
          Reset path
        </Button>
      </aside>

      <section className="flex min-h-0 flex-col border-b border-border lg:max-h-[calc(100dvh-4rem)] lg:border-r lg:border-b-0">
        <header className="border-b border-border px-4 py-3">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="font-display text-2xl">{detail.customer.name}</h2>
            <Sparkline series={detail.momentum.series} trend={detail.momentum.trend} maxPoints={18} width={140} height={36} slots={slots} />
          </div>
          <p className="mt-1 text-[12px] text-muted-foreground">{detail.ownership.line}</p>
          <p className="text-[12px] text-muted-foreground">Facebook Messenger · {detail.window.remaining} left to reply</p>
          <p className="mt-2 text-sm">{detail.your_move.text}</p>
          {detail.demo_copy ? <p className="mt-1 text-[11px] text-muted-foreground">Demo copy, not a certified translation.</p> : null}
        </header>
        <div data-desk-thread className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {detail.messages.map((m, i) => (
            <div key={i} className={m.direction === "in" ? "max-w-[85%]" : "ml-auto max-w-[85%] rounded-md bg-secondary px-3 py-2"}>
              <div className="text-[11px] text-muted-foreground">{m.direction === "in" ? detail.customer.name : "Alex Reyes"}</div>
              <p className="text-sm">{m.text}</p>
            </div>
          ))}
          <div ref={endRef} />
        </div>
        <div className="border-t border-border p-4">
          <Textarea value={detail.draft.text} onChange={(e) => act(() => d.editDraft(e.target.value))} rows={5} />
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              disabled={
                detail.exchange.closeKind === "withdrawn" ||
                detail.exchange.closeKind === "ghosted" ||
                (d.state.booked && d.state.sent) ||
                (detail.exchange.current >= detail.exchange.max && !d.state.booked)
              }
              onClick={() =>
                act(() => {
                  d.send();
                })
              }
            >
              {d.state.booked && !d.state.sent ? "Send confirmation" : "Send & next"}
            </Button>
            {readyToClose && detail.booking?.selected ? (
              <Button variant="outline" onClick={() => act(() => d.book())}>
                Book {detail.booking.selected.label}
              </Button>
            ) : null}
            {readyToClose ? (
              <>
                <Button variant="outline" onClick={() => act(() => d.withdraw())}>
                  Withdraw
                </Button>
                <Button variant="outline" onClick={() => act(() => d.ghostClose())}>
                  Ghost
                </Button>
              </>
            ) : null}
            {detail.exchange.closeKind === "booked" && ics ? (
              <Button variant="ghost" size="sm" onClick={() => downloadIcs("lotbeacon-visit.ics", ics)}>
                Download .ics
              </Button>
            ) : null}
            {detail.exchange.closeKind === "booked" && detail.booking?.selected ? (
              <Button variant="ghost" size="sm" asChild>
                <a
                  href={googleCalendarUrl({
                    title: `Visit · ${detail.customer.name}`,
                    starts: detail.booking.selected.iso || new Date().toISOString(),
                    customer: detail.customer.name,
                    place: d.SEEDED_ADDRESS,
                  })}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Google Calendar
                </a>
              </Button>
            ) : null}
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Next step held: {detail.next_step}. {detail.exchange.label}. A person still sends. Not a live Facebook inbox.
          </p>
        </div>
      </section>

      <aside className="overflow-y-auto p-4 lg:sticky lg:top-0 lg:max-h-[calc(100dvh-4rem)]">
        <p className="text-[11px] tracking-wide text-muted-foreground uppercase">Admin</p>
        <dl className="mt-2 space-y-2 text-sm">
          <div>
            <dt className="text-muted-foreground">Asked</dt>
            <dd>{detail.admin_note.asked}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Acknowledged</dt>
            <dd>{detail.admin_note.acknowledged}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Holding</dt>
            <dd>
              <Badge>{detail.admin_note.holding}</Badge>
            </dd>
          </div>
          <p className="text-[12px] text-muted-foreground">{detail.admin_note.note}</p>
        </dl>

        {detail.signals.headline ? (
          <div className="mt-4 rounded-md border border-border p-3">
            <div className="text-[11px] tracking-wide uppercase">{detail.signals.headline.text}</div>
            <p className="mt-1 text-[12px] text-muted-foreground">{detail.signals.headline.why}</p>
          </div>
        ) : null}

        <p className="mt-5 text-[11px] tracking-wide text-muted-foreground uppercase">Communication signal · this exchange</p>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Empty ticks are exchanges still ahead. Each Send draws the next point. Close lands on the last mark.
        </p>
        <ul className="mt-2 space-y-4">
          {detail.signals.signals.map((s) => (
            <li key={s.key}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm">{s.label}</span>
                <span className="tabular text-sm">
                  {s.score}
                  {typeof s.delta === "number" && s.delta !== 0 ? (
                    <span className={s.trend === "up" ? " text-ok" : s.trend === "down" ? " text-destructive" : " text-warn"}>
                      {" "}
                      {s.delta > 0 ? `+${s.delta}` : s.delta}
                    </span>
                  ) : null}
                </span>
              </div>
              <Sparkline series={s.series} trend={s.trend} nums refs width={248} height={72} maxPoints={18} slots={slots} />
              <p className="mt-1 text-[11px] text-muted-foreground">{s.why}</p>
            </li>
          ))}
        </ul>

        <p className="mt-5 text-[11px] tracking-wide text-muted-foreground uppercase">Deal file</p>
        <pre className="mt-2 whitespace-pre-wrap text-[12px] text-muted-foreground">{detail.deal_file.forward_text}</pre>
        <Button
          className="mt-2"
          size="sm"
          variant="outline"
          onClick={() => navigator.clipboard.writeText(detail.deal_file.forward_text)}
        >
          Copy deal notes
        </Button>

        <p className="mt-5 text-[11px] tracking-wide text-muted-foreground uppercase">Known</p>
        <ul className="mt-2 space-y-1 text-sm">
          {detail.facts.map((f) => (
            <li key={f.key}>
              <span className="text-muted-foreground">{f.key} · </span>
              {f.value}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-[12px] text-muted-foreground">
          {detail.vehicle.year} {detail.vehicle.make} {detail.vehicle.model} {detail.vehicle.trim} · {detail.vehicle.stock_number} · {detail.funnel.substate}
        </p>
      </aside>
    </div>
  );
}
