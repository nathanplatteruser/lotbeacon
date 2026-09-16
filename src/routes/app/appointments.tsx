import { createFileRoute, Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { useApp } from "@/lib/store";
import { TEAM } from "@/lib/seed";
import { clock, dayLabel } from "@/lib/format";
import { findVehicle, vehicleLabel } from "@/lib/engine";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/appointments")({
  component: AppointmentsPage,
});

const STATUS_VARIANT = {
  proposed: "silver",
  confirmed: "ok",
  completed: "default",
  no_show: "danger",
  cancelled: "warn",
} as const;

function AppointmentsPage() {
  const appointments = useApp((s) => s.appointments);
  const threads = useApp((s) => s.threads);
  const vehicles = useApp((s) => s.vehicles);
  const selectThread = useApp((s) => s.selectThread);

  const sorted = [...appointments].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
  const confirmed = appointments.filter((a) => a.status === "confirmed" || a.status === "completed");
  const showed = appointments.filter((a) => a.status === "completed").length;
  const noshow = appointments.filter((a) => a.status === "no_show").length;
  const showRate = showed + noshow === 0 ? 0 : showed / (showed + noshow);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">Setter board</p>
          <h1 className="font-display mt-1 text-3xl">Appointments</h1>
        </div>
        <div className="flex gap-6">
          <Stat k={`${confirmed.length}`} v="on the books" />
          <Stat k={`${Math.round(showRate * 100)}%`} v="show rate" />
          <Stat k={`${noshow}`} v="no-shows" />
        </div>
      </header>

      <div className="overflow-hidden rounded-xl border border-border">
        {sorted.map((a, i) => {
          const thread = threads.find((t) => t.id === a.threadId);
          const v = findVehicle(vehicles, a.vehicleStock);
          const setter = TEAM.find((r) => r.id === a.setterId);
          const closer = TEAM.find((r) => r.id === a.closerId);
          return (
            <Link
              key={a.id}
              to="/app/inbox"
              onClick={() => selectThread(a.threadId)}
              className={cn(
                "grid grid-cols-1 gap-1 px-4 py-3 hover:bg-accent/40 sm:grid-cols-[8rem_1fr_auto]",
                i && "border-t border-border",
              )}
            >
              <div>
                <div className="text-sm tabular">{clock(a.at)}</div>
                <div className="text-[12px] text-muted-foreground">{dayLabel(a.at)}</div>
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">{thread?.customerName ?? "Unknown"}</span>
                  <Badge variant={STATUS_VARIANT[a.status]}>{a.status.replace("_", " ")}</Badge>
                  <Badge>{a.type.replace("_", " ")}</Badge>
                </div>
                <p className="mt-1 text-[13px] text-muted-foreground">
                  {v ? vehicleLabel(v) : "No unit"} · set by {setter?.name} · closed by {closer?.name}
                </p>
                <p className="text-[12px] text-muted-foreground">{a.notes}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <div className="font-display text-2xl tabular">{k}</div>
      <div className="text-[12px] text-muted-foreground">{v}</div>
    </div>
  );
}
