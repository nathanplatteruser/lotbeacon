import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useApp } from "@/lib/store";
import { relativeTime } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/app/sequences")({
  component: SequencesPage,
});

function SequencesPage() {
  const sequences = useApp((s) => s.sequences);
  const enrollments = useApp((s) => s.enrollments);
  const threads = useApp((s) => s.threads);
  const pauseEnrollment = useApp((s) => s.pauseEnrollment);
  const advanceEnrollment = useApp((s) => s.advanceEnrollment);
  const enroll = useApp((s) => s.enroll);
  const selectThread = useApp((s) => s.selectThread);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <header className="mb-6">
        <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">BDC cadences</p>
        <h1 className="font-display mt-1 text-3xl">Sequences</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Outreach-style steps, dealership rules. Nothing fires past an opt-out or a dead Messenger window.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        {sequences.map((seq) => {
          const active = enrollments.filter((e) => e.sequenceId === seq.id);
          return (
            <article key={seq.id} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-medium">{seq.name}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{seq.purpose}</p>
                </div>
                <Badge>{active.length} live</Badge>
              </div>
              <ol className="mt-4 space-y-2">
                {seq.steps.map((st, i) => (
                  <li key={i} className="flex gap-3 text-sm">
                    <span className="w-10 shrink-0 tabular text-muted-foreground">D{st.day}</span>
                    <span className="w-20 shrink-0 text-silver">{st.channel}</span>
                    <span>{st.title}</span>
                  </li>
                ))}
              </ol>
            </article>
          );
        })}
      </div>

      <h2 className="mt-10 text-sm tracking-wide text-muted-foreground uppercase">Live enrollments</h2>
      <div className="mt-3 overflow-hidden rounded-xl border border-border">
        {enrollments.map((e, i) => {
          const seq = sequences.find((s) => s.id === e.sequenceId);
          const thread = threads.find((t) => t.id === e.threadId);
          const step = seq?.steps[Math.min(e.stepIndex, (seq.steps.length || 1) - 1)];
          return (
            <div
              key={e.id}
              className={i ? "flex flex-wrap items-center gap-3 border-t border-border px-4 py-3" : "flex flex-wrap items-center gap-3 px-4 py-3"}
            >
              <button
                type="button"
                className="text-left text-sm font-medium hover:underline"
                onClick={() => selectThread(e.threadId)}
              >
                {thread?.customerName ?? e.threadId}
              </button>
              <span className="text-sm text-muted-foreground">{seq?.name}</span>
              <Badge variant={e.status === "active" ? "ok" : e.status === "paused" ? "warn" : "default"}>
                {e.status}
              </Badge>
              <span className="text-[12px] text-muted-foreground">
                Step {Math.min(e.stepIndex + 1, seq?.steps.length ?? 1)} · {step?.channel} · next {relativeTime(e.nextAt)}
              </span>
              <div className="ml-auto flex gap-2">
                <Button size="xs" variant="outline" onClick={() => pauseEnrollment(e.id)}>
                  {e.status === "paused" ? "Resume" : "Pause"}
                </Button>
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={() => {
                    advanceEnrollment(e.id);
                    toast("Step completed");
                  }}
                >
                  Complete step
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
        Enroll from a thread, or drop a waiting lead into Marketplace 5-touch.
        <div className="mt-3 flex flex-wrap gap-2">
          {threads
            .filter((t) => !t.sequenceEnrollmentId && !t.dnc && t.stage !== "lost")
            .slice(0, 6)
            .map((t) => (
              <Button
                key={t.id}
                size="sm"
                variant="outline"
                onClick={() => {
                  enroll(t.id, "seq_mkt");
                  toast(`Enrolled ${t.customerName}`);
                }}
              >
                Enroll {t.customerName.split(" ")[0]}
              </Button>
            ))}
        </div>
      </div>
    </div>
  );
}
