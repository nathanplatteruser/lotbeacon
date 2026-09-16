import { createFileRoute } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { repFloorScore } from "@/lib/metrics";
import { TEAM } from "@/lib/seed";
import { useApp } from "@/lib/store";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/team")({
  component: TeamPage,
});

function TeamPage() {
  const threads = useApp((s) => s.threads);
  const appointments = useApp((s) => s.appointments);
  const calls = useApp((s) => s.calls);
  const intercepts = useApp((s) => s.intercepts) ?? [];
  const setRep = useApp((s) => s.setRep);

  const rows = TEAM.filter((r) => r.role !== "finance").map((r) => {
    const owned = threads.filter((t) => t.assignedRepId === r.id || t.setterId === r.id);
    const set = appointments.filter((a) => a.setterId === r.id);
    const showed = set.filter((a) => a.status === "completed").length;
    const noshow = set.filter((a) => a.status === "no_show").length;
    const myCalls = calls.filter((c) => c.repId === r.id);
    const avg = myCalls.length ? Math.round(myCalls.reduce((s, c) => s + c.score, 0) / myCalls.length) : 0;
    const awaiting = owned.filter((t) => t.messages.at(-1)?.who === "customer" && !t.dnc).length;
    const floor = repFloorScore({ repId: r.id, threads, appointments, calls, intercepts });
    return { r, owned, set, showed, noshow, avg, awaiting, myCalls, floor };
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <header className="mb-6">
        <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">Coaching</p>
        <h1 className="font-display mt-1 text-3xl">Team</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Setters vs closers. Each rep has a number they can grow — same math as the Owner scorecard.
        </p>
      </header>
      <div className="grid gap-4 md:grid-cols-2">
        {rows.map(({ r, owned, set, showed, noshow, avg, awaiting, myCalls, floor }) => {
          const rate = showed + noshow === 0 ? 0 : showed / (showed + noshow);
          return (
            <article key={r.id} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-full bg-secondary text-xs">
                    {initials(r.name)}
                  </span>
                  <div>
                    <h2 className="font-medium">{r.name}</h2>
                    <p className="text-[12px] text-muted-foreground">{r.title}</p>
                  </div>
                </div>
                <Badge>{r.role.replace("_", " ")}</Badge>
              </div>
              <div className="mt-4 grid grid-cols-4 gap-3 text-center">
                <div>
                  <div
                    className={cn(
                      "font-display text-2xl tabular",
                      floor.score === 100 ? "text-ok" : floor.score >= 80 ? "text-foreground" : "text-warn",
                    )}
                  >
                    {floor.score}
                  </div>
                  <div className="text-[11px] text-muted-foreground">score</div>
                </div>
                <div>
                  <div className="font-display text-2xl tabular">{owned.length}</div>
                  <div className="text-[11px] text-muted-foreground">conversations</div>
                </div>
                <div>
                  <div className="font-display text-2xl tabular">{set.length}</div>
                  <div className="text-[11px] text-muted-foreground">appointments</div>
                </div>
                <div>
                  <div className="font-display text-2xl tabular">{avg || "—"}</div>
                  <div className="text-[11px] text-muted-foreground">call score</div>
                </div>
              </div>
              <div className="mt-4">
                <div className="mb-1 flex justify-between text-[12px] text-muted-foreground">
                  <span>Show rate</span>
                  <span className="tabular">{Math.round(rate * 100)}%</span>
                </div>
                <Progress value={rate * 100} />
              </div>
              {floor.play ? (
                <div className="mt-3 rounded-md border border-border bg-secondary/40 px-3 py-2">
                  <p className="text-[11px] tracking-wide text-muted-foreground uppercase">Next play</p>
                  <p className="mt-1 text-sm font-medium leading-snug">{floor.play.headline}</p>
                  <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{floor.play.action}</p>
                </div>
              ) : (
                <p className="mt-3 text-[13px] text-muted-foreground">Clean book. Keep the mix.</p>
              )}
              <p className="mt-3 text-[13px] text-muted-foreground">
                {awaiting} waiting on a reply · {myCalls.length} scored calls
              </p>
              <button
                type="button"
                className="mt-3 text-[13px] text-silver hover:text-foreground"
                onClick={() => setRep(r.id)}
              >
                Sit as {r.name.split(" ")[0]}
              </button>
            </article>
          );
        })}
      </div>
    </div>
  );
}
