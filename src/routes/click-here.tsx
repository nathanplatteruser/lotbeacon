import { createFileRoute, Link } from "@tanstack/react-router";
import { DemoDoors } from "@/components/demo-doors";
import { SiteNav } from "@/components/site-nav";

export const Route = createFileRoute("/click-here")({ component: ClickHere });

function ClickHere() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <SiteNav />
      <div className="bg-paper px-4 py-2.5 text-center text-sm font-medium text-ink">
        Do not open GitHub. This page is the demo door. iPhone or MacBook. Nothing to install.
      </div>
      <div className="mx-auto max-w-3xl px-4 py-10">
        <p className="mt-6 text-xs tracking-[0.18em] text-muted-foreground uppercase">
          LotBeacon · Zoellner Ford of Beatrice seed
        </p>
        <h1 className="font-display mt-3 text-4xl leading-[1.1] md:text-5xl">Pick a door. That is the whole instruction.</h1>
        <p className="mt-3 max-w-xl text-muted-foreground">
          Same product on iPhone and MacBook. Fake customers. Send never leaves this device. You pick the paint. You do
          not pick the rules.
        </p>
        <DemoDoors className="mt-8" />
        <div className="mt-6 flex flex-wrap gap-x-4 gap-y-2 text-sm">
          <Link to="/desk" className="underline-offset-2 hover:underline">
            Language / path desk
          </Link>
          <Link to="/compare" className="underline-offset-2 hover:underline">
            vs the field
          </Link>
          <Link to="/spot" className="underline-offset-2 hover:underline">
            Spot agents
          </Link>
          <Link to="/design" className="underline-offset-2 hover:underline">
            Design rolodex
          </Link>
          <Link to="/leavebehind" className="underline-offset-2 hover:underline">
            Tyler & Kyle one-pager
          </Link>
          <Link to="/pricing" className="underline-offset-2 hover:underline">
            Pricing
          </Link>
        </div>
      </div>
    </div>
  );
}
