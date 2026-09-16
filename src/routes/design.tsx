import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { ArchifySequence, ArchifyWorkflow } from "@/components/archify-hitl";
import { DesignRolodex } from "@/components/design-rolodex";
import { HallmarkManifesto, HallmarkStatLed, HallmarkWorkbench } from "@/components/hallmark-specimens";
import { OpenMontageReel } from "@/components/openmontage-reel";
import { ResearchShell } from "@/components/research-shell";
import { Button } from "@/components/ui/button";
import { isRolodexId, type RolodexId } from "@/lib/design-rolodex";

export const Route = createFileRoute("/design")({ component: DesignPage });

function DesignPage() {
  const [card, setCard] = useState<RolodexId>("workbench");
  const onCard = useCallback((id: RolodexId) => {
    if (isRolodexId(id)) setCard(id);
  }, []);

  return (
    <ResearchShell
      current="/design"
      title="Design rolodex"
      kicker="Hallmark · Archify · OpenMontage · curiosity, not a ship vote"
    >
      <p className="max-w-3xl text-sm text-muted-foreground">
        Three structurally different ways to show the desk we already built. Hallmark: landing craft, not
        color swaps. Archify: diagrams you can present, nodes taken from the sidecar. OpenMontage: a quiet
        launch film. Home and the Now sidecar stay what we ship.
      </p>

      <div className="mt-6">
        <DesignRolodex card={card} onChange={onCard} />
        <div className="spot-flip-stage" data-card={card}>
          <Specimen key={card} id={card} />
        </div>
      </div>

      <section className="mt-12">
        <h2 className="font-display text-2xl">What this is not</h2>
        <ul className="mt-4 max-w-3xl space-y-3 text-sm leading-relaxed text-muted-foreground">
          <li>Not a replacement for the live home page. That URL stays the conference door.</li>
          <li>Not another paint job on the sidecar. Surface and architecture looks still live on Spot agents.</li>
          <li>
            Not Hallmark theme colors, Archify stock presets, or trailer grammar. Paper, ink, silver.
            Newsreader. A person still sends.
          </li>
        </ul>
      </section>

      <div className="mt-8 flex flex-wrap gap-2">
        <Button asChild>
          <Link to="/spot">Back to the sidecar</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/">Canonical home</Link>
        </Button>
      </div>
    </ResearchShell>
  );
}

function Specimen({ id }: { id: RolodexId }) {
  switch (id) {
    case "workbench":
      return <HallmarkWorkbench />;
    case "statled":
      return <HallmarkStatLed />;
    case "manifesto":
      return <HallmarkManifesto />;
    case "workflow":
      return <ArchifyWorkflow />;
    case "sequence":
      return <ArchifySequence />;
    case "film":
      return <OpenMontageReel />;
  }
}
