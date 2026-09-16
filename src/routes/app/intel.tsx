import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useApp } from "@/lib/store";
import { TEAM } from "@/lib/seed";
import { mmss, relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/intel")({
  component: IntelPage,
});

function IntelPage() {
  const calls = useApp((s) => s.calls);
  const threads = useApp((s) => s.threads);
  const selectedThreadId = useApp((s) => s.selectedThreadId);
  const fromThread = calls.find((c) => c.threadId === selectedThreadId);
  const [activeId, setActiveId] = useState(fromThread?.id ?? calls[0]?.id ?? "");
  const call = calls.find((c) => c.id === activeId) ?? calls[0];
  const thread = threads.find((t) => t.id === call?.threadId);
  const rep = TEAM.find((r) => r.id === call?.repId);
  const atRisk = [...threads]
    .filter((t) => t.intel.risks.length && !t.dnc)
    .sort((a, b) => a.intel.score - b.intel.score)
    .slice(0, 6);

  if (!call) return null;

  return (
    <div className="flex min-h-[calc(100dvh-3.5rem)] flex-col lg:flex-row">
      <aside className="w-full shrink-0 overflow-y-auto border-b border-border lg:w-80 lg:border-r lg:border-b-0">
        <div className="px-4 py-4">
          <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">Conversation intelligence</p>
          <h1 className="font-display mt-1 text-2xl">Calls & trackers</h1>
        </div>
        {calls.map((c) => {
          const t = threads.find((x) => x.id === c.threadId);
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setActiveId(c.id)}
              className={cn(
                "block w-full border-t border-border px-4 py-3 text-left hover:bg-accent/40",
                c.id === call.id && "bg-accent",
              )}
            >
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-medium">{t?.customerName}</span>
                <span className="font-display text-lg tabular">{c.score}</span>
              </div>
              <p className="text-[12px] text-muted-foreground">{c.title.split("·")[0]} · {mmss(c.durationSec)}</p>
            </button>
          );
        })}
        <div className="border-t border-border px-4 py-4">
          <div className="text-[11px] tracking-wide text-muted-foreground uppercase">At-risk threads</div>
          <ul className="mt-2 space-y-2">
            {atRisk.map((t) => (
              <li key={t.id} className="text-[13px]">
                <span className="font-medium">{t.customerName}</span>
                <span className="ml-2 tabular text-muted-foreground">{t.intel.score}</span>
                <div className="text-[12px] text-destructive">{t.intel.risks[0]}</div>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <section className="min-w-0 flex-1 overflow-y-auto px-4 py-6 sm:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-medium">{thread?.customerName}</h2>
            <p className="text-sm text-muted-foreground">
              {rep?.name} · {relativeTime(call.occurredAt)} · {mmss(call.durationSec)}
            </p>
          </div>
          <div className="text-right">
            <div className="font-display text-4xl tabular">{call.score}</div>
            <div className="text-[12px] text-muted-foreground">deal score</div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-3">
          <Metric label="Talk ratio" value={`${Math.round(call.talkRatio * 100)}%`} hint="Rep airtime" />
          <Metric label="Questions" value={String(call.questionsAsked)} hint="Discovery" />
          <Metric label="Next step" value={call.nextStepSet ? "Set" : "Missing"} hint="Time on calendar" />
        </div>
        <div className="mt-4">
          <div className="mb-1 flex justify-between text-[12px] text-muted-foreground">
            <span>Listen</span>
            <span>Talk</span>
          </div>
          <Progress value={call.talkRatio * 100} />
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {call.trackers.map((tr) => (
            <Badge key={tr.key} variant={tr.tone === "neg" ? "danger" : tr.tone === "pos" ? "ok" : "default"}>
              {tr.label} · {tr.count}
            </Badge>
          ))}
        </div>

        <h3 className="mt-8 text-sm tracking-wide text-muted-foreground uppercase">Transcript</h3>
        <ol className="mt-3 space-y-3">
          {call.transcript.map((line, i) => (
            <li key={i} className="grid grid-cols-[3.5rem_1fr] gap-3 text-sm">
              <span className="tabular text-muted-foreground">{mmss(line.t)}</span>
              <div>
                <span className="text-[11px] tracking-wide text-silver uppercase">{line.speaker}</span>
                {line.tracker && (
                  <Badge className="ml-2" variant="warn">
                    {line.tracker}
                  </Badge>
                )}
                <p className="mt-0.5 leading-relaxed">{line.text}</p>
              </div>
            </li>
          ))}
        </ol>

        <h3 className="mt-8 text-sm tracking-wide text-muted-foreground uppercase">Coaching</h3>
        <ul className="mt-3 space-y-2">
          {call.coaching.map((c) => (
            <li key={c} className="rounded-md border border-border bg-card px-3 py-2 text-sm leading-relaxed">
              {c}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Metric({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="font-display mt-1 text-2xl tabular">{value}</div>
      <div className="text-[11px] text-muted-foreground">{hint}</div>
    </div>
  );
}
