import { createFileRoute, Link } from "@tanstack/react-router";
import { DealBrief } from "@/components/deal-brief";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PACKAGE_AUDIENCE } from "@/lib/package";
import { relativeTime } from "@/lib/format";
import { TEAM, useApp } from "@/lib/store";
import { communicationSignals } from "@/lib/signals";
import type { CommsPackage, Thread } from "@/lib/types";

export const Route = createFileRoute("/app/handoffs")({
  component: HandoffsPage,
});

function HandoffsPage() {
  const packages = useApp((s) => s.packages);
  const threads = useApp((s) => s.threads);
  const currentRepId = useApp((s) => s.currentRepId);
  const setRep = useApp((s) => s.setRep);
  const selectThread = useApp((s) => s.selectThread);
  const me = TEAM.find((r) => r.id === currentRepId);
  const incoming = [...packages]
    .filter((p) => p.toRepId === currentRepId)
    .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
  const sent = [...packages]
    .filter((p) => p.fromRepId === currentRepId)
    .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
  const floor = [...packages].sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
  const unread = incoming.filter((p) => p.status === "sent").length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">Desk · one page</p>
          <h1 className="font-display mt-1 text-3xl">Handoffs</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Comms packages to finance and the sales manager. Open the live brief — show-likelihood, facts, last
            turns, next step. A person still clicked Send. Nothing autonomous.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => setRep("r_morgan")}>
            Sit as Morgan
          </Button>
          <Button size="sm" variant="outline" onClick={() => setRep("r_dana")}>
            Sit as Dana
          </Button>
        </div>
      </header>

      <section className="mb-8">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-[11px] tracking-[0.14em] text-muted-foreground uppercase">
            For {me?.name.split(" ")[0] ?? "you"}
          </h2>
          {unread > 0 ? <Badge variant="warn">{unread} unopened</Badge> : <Badge>Caught up</Badge>}
        </div>
        {incoming.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Nothing addressed to this desk. Sit as Morgan or Dana, or send a package from a thread.
          </p>
        ) : (
          <PackageTable rows={incoming} threads={threads} selectThread={selectThread} />
        )}
      </section>

      <section className="mb-8">
        <h2 className="text-[11px] tracking-[0.14em] text-muted-foreground uppercase">You sent</h2>
        {sent.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Send from the closer packet on a thread.</p>
        ) : (
          <PackageTable rows={sent} threads={threads} selectThread={selectThread} />
        )}
      </section>

      <section>
        <h2 className="text-[11px] tracking-[0.14em] text-muted-foreground uppercase">Floor log</h2>
        <PackageTable rows={floor} threads={threads} selectThread={selectThread} />
      </section>

      {incoming[0] ? (
        <section className="mt-10">
          <h2 className="mb-3 text-[11px] tracking-[0.14em] text-muted-foreground uppercase">Latest incoming · one page</h2>
          {(() => {
            const t = threads.find((x) => x.id === incoming[0]!.threadId);
            return t ? <DealBrief thread={t} audience={incoming[0]!.audience} /> : null;
          })()}
        </section>
      ) : null}
    </div>
  );
}

function PackageTable({
  rows,
  threads,
  selectThread,
}: {
  rows: CommsPackage[];
  threads: Thread[];
  selectThread: (id: string) => void;
}) {
  return (
    <div className="mt-3 overflow-x-auto rounded-xl border border-border bg-card">
      <table className="w-full min-w-[640px] text-left text-sm" id="handoffs-table">
        <thead>
          <tr className="text-[11px] tracking-wide text-muted-foreground uppercase">
            <th className="p-3">Customer</th>
            <th className="p-3">To</th>
            <th className="p-3">From</th>
            <th className="p-3">Show</th>
            <th className="p-3">Status</th>
            <th className="p-3">When</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => {
            const t = threads.find((x) => x.id === p.threadId);
            const to = TEAM.find((r) => r.id === p.toRepId);
            const from = TEAM.find((r) => r.id === p.fromRepId);
            const sig = t ? communicationSignals(t) : null;
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
                  <div className="text-[11px] text-muted-foreground">{p.note}</div>
                </td>
                <td className="p-3">
                  {to?.name.split(" ")[0]}
                  <div className="text-[11px] text-muted-foreground">{meta.short}</div>
                </td>
                <td className="p-3 text-muted-foreground">{from?.name.split(" ")[0]}</td>
                <td className="p-3 tabular">{sig ? sig.momentum.score : "—"}</td>
                <td className="p-3">
                  <Badge variant={p.status === "opened" ? "ok" : "warn"}>
                    {p.status === "opened" ? "Opened" : "Unopened"}
                  </Badge>
                </td>
                <td className="p-3">
                  <span className="tabular text-muted-foreground">{relativeTime(p.sentAt)}</span>
                  <div className="mt-1">
                    <Link
                      to="/app/inbox"
                      onClick={() => selectThread(p.threadId)}
                      className="text-[12px] text-silver underline-offset-2 hover:underline"
                    >
                      Thread
                    </Link>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
