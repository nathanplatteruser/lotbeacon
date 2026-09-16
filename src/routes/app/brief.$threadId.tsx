import { useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Printer } from "lucide-react";
import { DealBrief } from "@/components/deal-brief";
import { Button } from "@/components/ui/button";
import { audienceFromSearch, destFor, latestPackage, PACKAGE_AUDIENCE } from "@/lib/package";
import { useApp } from "@/lib/store";

export const Route = createFileRoute("/app/brief/$threadId")({
  validateSearch: (raw: Record<string, unknown>): { for?: "finance" | "gsm" } => ({
    for: raw.for === "finance" || raw.for === "gsm" ? raw.for : undefined,
  }),
  component: BriefPage,
});

function BriefPage() {
  const { threadId } = Route.useParams();
  const search = Route.useSearch();
  const audience = audienceFromSearch(search.for);
  const threads = useApp((s) => s.threads);
  const packages = useApp((s) => s.packages);
  const currentRepId = useApp((s) => s.currentRepId);
  const markPackageOpened = useApp((s) => s.markPackageOpened);
  const setRep = useApp((s) => s.setRep);
  const thread = threads.find((t) => t.id === threadId) ?? null;
  const dest = destFor(audience);
  const last = thread ? latestPackage(packages, thread.id, audience) : null;

  useEffect(() => {
    if (!last || last.status !== "sent") return;
    if (currentRepId !== last.toRepId) return;
    markPackageOpened(last.id);
  }, [last, currentRepId, markPackageOpened]);

  if (!thread) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <p className="text-sm text-muted-foreground">That deal is not on this floor.</p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/app/handoffs">Handoffs</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="brief-page mx-auto max-w-2xl px-4 py-6 sm:px-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 print:hidden">
        <div>
          <p className="text-[11px] tracking-[0.16em] text-muted-foreground uppercase">
            {PACKAGE_AUDIENCE[audience].label} · one page
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Live movement. {dest ? `${dest.name} opens this to get current.` : "Desk brief."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {dest && currentRepId !== dest.id ? (
            <Button size="sm" variant="outline" onClick={() => setRep(dest.id)}>
              Sit as {dest.name.split(" ")[0]}
            </Button>
          ) : null}
          <Button size="sm" variant="outline" onClick={() => window.print()}>
            <Printer className="size-3.5" />
            Print
          </Button>
          <Button size="sm" variant="ghost" asChild>
            <Link to="/app/inbox">Inbox</Link>
          </Button>
        </div>
      </div>
      <DealBrief thread={thread} audience={audience} />
    </div>
  );
}
