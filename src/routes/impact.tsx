import { createFileRoute } from "@tanstack/react-router";
import { ImpactBrief, ImpactStamp } from "@/components/impact-brief";
import { ResearchShell } from "@/components/research-shell";

export const Route = createFileRoute("/impact")({ component: ImpactPage });

function ImpactPage() {
  return (
    <ResearchShell
      current="/impact"
      title="Before & after — one rural Ford floor"
      kicker="Solutions brief · Zoellner Ford of Beatrice · HITL only · pessimistic · Sept 2026"
    >
      <ImpactStamp />
      <ImpactBrief />
    </ResearchShell>
  );
}
