import { createFileRoute, Link } from "@tanstack/react-router";
import { DeskWorkspace } from "@/components/desk-workspace";
import { ResearchShell } from "@/components/research-shell";

export const Route = createFileRoute("/desk")({ component: DeskPage });

function DeskPage() {
  return (
    <ResearchShell
      current="/desk"
      title="The LotBeacon desk"
      kicker="Not a live Facebook inbox. Synthetic shopper. A person still sends."
    >
      <p className="mb-6 max-w-2xl text-sm text-muted-foreground">
        Point of the desk: confidence and clarity. More window-shopper threads handled, higher chance they convert,
        higher odds they show. Not a measured claim. Thread length is a path, not a skip: Quick is four back-and-forths
        before any close, Medium ten, Guided fifteen — proceeding, withdrawing, or ghosting only after that. Watch the
        sparkline rails on the left and the signal charts on the right move with every Send & next. Languages: English,
        Spanish, Vietnamese, Arabic — Nebraska’s top four; non-English is demo copy, not a certified translation.
        Marketplace personal threads stay paste-in; computer-use that types into Facebook is refused — see{" "}
        <Link to="/spot" className="underline-offset-2 hover:underline">
          Spot agents
        </Link>
        .
      </p>
      <DeskWorkspace />
    </ResearchShell>
  );
}
