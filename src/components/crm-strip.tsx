import { useMemo, useState } from "react";
import { Database } from "lucide-react";
import { toast } from "sonner";
import { adfXml, CRM_STATUS, CRM_TARGETS, CRM_TRIGGER, downloadAdf, latestPush, leadIdFor } from "@/lib/crm";
import { DEALER, TEAM } from "@/lib/seed";
import { findVehicle } from "@/lib/engine";
import { useApp } from "@/lib/store";
import type { Thread } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function CrmStrip({ thread }: { thread: Thread }) {
  const pushes = useApp((s) => s.crmPushes);
  const vehicles = useApp((s) => s.vehicles);
  const currentRepId = useApp((s) => s.currentRepId);
  const pushCrm = useApp((s) => s.pushCrm);
  const [open, setOpen] = useState(false);
  const last = latestPush(pushes, thread.id);
  const vehicle = findVehicle(vehicles, thread.vehicleStock);
  const xml = useMemo(() => {
    const source = last?.xml;
    if (source) return source;
    return adfXml({
      thread,
      vehicle,
      dealer: DEALER,
      repName: TEAM.find((r) => r.id === currentRepId)?.name ?? "Desk",
      trigger: last?.trigger ?? "manual",
      at: last?.at,
    });
  }, [last, thread, vehicle, currentRepId]);
  const tone = last ? CRM_STATUS[last.status].tone : "muted";
  const badge =
    tone === "ok" ? "ok" : tone === "warn" ? "warn" : tone === "danger" ? "danger" : "default";

  return (
    <div className="mt-3 rounded-md border border-border px-3 py-2" id="crm-strip">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 text-[11px] tracking-wide text-muted-foreground uppercase">
            <Database className="size-3.5 text-silver" />
            CRM · {CRM_TARGETS[DEALER.crmTarget].label}
          </div>
          <p className="mt-1 text-[12px] text-muted-foreground">
            {leadIdFor(thread)}
            {last
              ? ` · ${CRM_TRIGGER[last.trigger]} · ${CRM_STATUS[last.status].label}`
              : " · not in the desk log yet · 14% of leads never get logged"}
          </p>
        </div>
        <Badge variant={badge}>{last ? CRM_STATUS[last.status].label : "Unsent"}</Badge>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          id="crm-push"
          onClick={() => {
            pushCrm(thread.id, "manual");
            toast(`ADF queued to ${CRM_TARGETS[DEALER.crmTarget].label}`);
          }}
        >
          Push ADF
        </Button>
        <Button size="sm" variant="ghost" id="crm-preview" onClick={() => setOpen(true)}>
          Preview XML
        </Button>
        <Button
          size="sm"
          variant="ghost"
          id="crm-export"
          onClick={() => {
            downloadAdf(`${leadIdFor(thread)}.adf.xml`, xml);
            toast("ADF downloaded. VinSolutions / Elead / DriveCentric import this file.");
          }}
        >
          Download ADF
        </Button>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[min(92vw,40rem)]">
          <DialogHeader>
            <DialogTitle>ADF 1.0 · {leadIdFor(thread)}</DialogTitle>
            <DialogDescription>
              One-way push to {CRM_TARGETS[DEALER.crmTarget].label} ({CRM_TARGETS[DEALER.crmTarget].maker}
              ). We do not pull the CRM. A person still owns the thread.
            </DialogDescription>
          </DialogHeader>
          <pre className="max-h-80 overflow-auto rounded-md border border-border bg-background p-3 font-mono text-[11px] leading-snug whitespace-pre text-muted-foreground">
            {xml}
          </pre>
        </DialogContent>
      </Dialog>
    </div>
  );
}
