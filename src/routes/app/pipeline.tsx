import { createFileRoute, Link } from "@tanstack/react-router";
import { STAGE_LABEL } from "@/lib/engine";
import { useApp } from "@/lib/store";
import type { Stage } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/app/pipeline")({
  component: PipelinePage,
});

const COLS: Stage[] = ["engage", "qualify", "book", "visit", "sold", "lost"];

function PipelinePage() {
  const threads = useApp((s) => s.threads);
  const setStage = useApp((s) => s.setStage);
  const selectThread = useApp((s) => s.selectThread);

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] flex-col">
      <header className="px-4 py-4">
        <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">Desk log</p>
        <h1 className="font-display text-3xl">Pipeline</h1>
      </header>
      <div className="flex min-h-0 flex-1 gap-3 overflow-x-auto px-4 pb-6">
        {COLS.map((col) => {
          const rows = threads.filter((t) => t.stage === col);
          return (
            <section key={col} className="flex w-64 shrink-0 flex-col rounded-xl border border-border bg-card">
              <div className="flex items-center justify-between border-b border-border px-3 py-2">
                <h2 className="text-sm font-medium">{STAGE_LABEL[col]}</h2>
                <span className="text-[12px] tabular text-muted-foreground">{rows.length}</span>
              </div>
              <div className="flex-1 space-y-2 overflow-y-auto p-2">
                {rows.map((t) => (
                  <article key={t.id} className="rounded-md border border-border bg-background p-2.5">
                    <Link
                      to="/app/inbox"
                      onClick={() => selectThread(t.id)}
                      className="text-sm font-medium hover:underline"
                    >
                      {t.customerName}
                    </Link>
                    <p className="mt-1 text-[12px] text-muted-foreground">{t.goal}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <Badge variant={t.intel.trend === "down" ? "danger" : t.intel.trend === "up" ? "ok" : "default"}>
                        {t.intel.score}
                      </Badge>
                      <select
                        className="h-7 rounded-sm border border-border bg-background px-1 text-[11px]"
                        value={t.stage}
                        onChange={(e) => setStage(t.id, e.target.value as Stage)}
                        aria-label={`Move ${t.customerName}`}
                      >
                        {COLS.map((c) => (
                          <option key={c} value={c}>
                            {STAGE_LABEL[c]}
                          </option>
                        ))}
                      </select>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
