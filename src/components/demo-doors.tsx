import { Link } from "@tanstack/react-router";
import { ArrowRight, LineChart, ShieldCheck, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

const DOORS = [
  {
    desk: "sales" as const,
    kicker: "Sales rep / BDC",
    title: "Click here — work the queue",
    hint: "Same hour, more appointments. Reply, book Saturday, send & next. Phone and Mac are the same desk.",
    to: "/app/inbox" as const,
    featured: true,
    who: "You sit as Jordan, BDC setter",
    Icon: UserRound,
  },
  {
    desk: "admin" as const,
    kicker: "Admin",
    title: "Click here — verify they were heard",
    hint: "Monday huddle. Intercepts, hot buttons, Known quotes. 0 autonomous sends. Same Admin tab.",
    to: "/app/admin" as const,
    featured: false,
    who: "You sit as Morgan, checking the floor",
    Icon: ShieldCheck,
  },
  {
    desk: "owner" as const,
    kicker: "Dealer owner / GSM",
    title: "Click here — watch the floor, then try to break it",
    hint: "Capacity, RAI, gates, 30-day forecast. Invent a discount. Starve the inventory feed. The firewall should hold.",
    to: "/app/analytics" as const,
    featured: false,
    who: "You sit as Morgan, GSM",
    Icon: LineChart,
  },
];

export function DemoDoors({ className }: { className?: string }) {
  return (
    <div className={cn("grid gap-3 md:grid-cols-3", className)}>
      {DOORS.map((d) => {
        const Icon = d.Icon;
        return (
          <Link
            key={d.desk}
            to={d.to}
            search={{ as: d.desk }}
            className={cn(
              "group flex min-h-32 flex-col rounded-lg border p-5 transition-colors",
              d.featured
                ? "border-paper bg-paper text-ink"
                : "border-border bg-card text-foreground hover:border-silver/50",
            )}
          >
            <div className="flex items-center gap-2 text-[11px] tracking-[0.14em] uppercase">
              <Icon className="size-3.5" />
              <span className={d.featured ? "text-ink/70" : "text-muted-foreground"}>{d.kicker}</span>
            </div>
            <div className="mt-3 flex items-start justify-between gap-3">
              <h2 className="font-display text-2xl leading-[1.15] tracking-tight">{d.title}</h2>
              <ArrowRight className="mt-1 size-5 shrink-0 transition-transform group-hover:translate-x-0.5" />
            </div>
            <p className={cn("mt-2 text-sm leading-relaxed", d.featured ? "text-ink/70" : "text-muted-foreground")}>
              {d.hint}
            </p>
            <div className={cn("mt-4 text-xs", d.featured ? "text-ink/60" : "text-muted-foreground")}>{d.who}</div>
          </Link>
        );
      })}
    </div>
  );
}
