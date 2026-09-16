import { createFileRoute } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InventoryEvidence } from "@/components/copilot-panels";
import { findVehicle, vehicleLabel } from "@/lib/engine";
import { miles, money } from "@/lib/format";
import { useApp } from "@/lib/store";
import { toast } from "sonner";

export const Route = createFileRoute("/app/inventory")({
  component: InventoryPage,
});

function InventoryPage() {
  const vehicles = useApp((s) => s.vehicles);
  const threads = useApp((s) => s.threads);
  const markVehicle = useApp((s) => s.markVehicle);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <header className="mb-6">
        <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">Authoritative feed</p>
        <h1 className="font-display mt-1 text-3xl">Inventory</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          The only record a draft may quote. Mark a unit sold and every open claim re-checks — Send blocks if a
          rep still says “it’s here.”
        </p>
      </header>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-border bg-card text-[11px] tracking-wide text-muted-foreground uppercase">
            <tr>
              <th className="px-3 py-2 font-medium">Stock</th>
              <th className="px-3 py-2 font-medium">Unit</th>
              <th className="px-3 py-2 font-medium">Drivetrain</th>
              <th className="px-3 py-2 font-medium">Miles</th>
              <th className="px-3 py-2 font-medium">Price</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Conversations</th>
              <th className="px-3 py-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {vehicles.map((v) => {
              const using = threads.filter((t) => t.vehicleStock === v.stock);
              return (
                <tr key={v.stock} className="border-t border-border">
                  <td className="px-3 py-3 font-mono text-[12px]">
                    {v.stock}
                    <div>
                      <InventoryEvidence vehicle={v} compact />
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    {vehicleLabel(v)}
                    <div className="text-[12px] text-muted-foreground">
                      {v.color} · {v.body}
                    </div>
                  </td>
                  <td className="px-3 py-3">{v.drivetrain}</td>
                  <td className="px-3 py-3 tabular">{miles(v.miles)}</td>
                  <td className="px-3 py-3 tabular">{money(v.price)}</td>
                  <td className="px-3 py-3">
                    <Badge
                      variant={v.status === "available" ? "ok" : v.status === "sold" ? "danger" : "warn"}
                    >
                      {v.status}
                    </Badge>
                  </td>
                  <td className="px-3 py-3 text-[12px] text-muted-foreground">
                    {using.map((t) => t.customerName.split(" ")[0]).join(", ") || "—"}
                  </td>
                  <td className="px-3 py-3">
                    {v.status !== "sold" ? (
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => {
                          markVehicle(v.stock, "sold");
                          toast(`${v.stock} sold — drafts re-validated`);
                        }}
                      >
                        Mark sold
                      </Button>
                    ) : (
                      <Button size="xs" variant="ghost" onClick={() => markVehicle(v.stock, "available")}>
                        Restore
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {findVehicle(vehicles, "T2401")?.status === "sold" && (
        <p className="mt-4 text-sm text-destructive">
          Explorer Platinum is sold. Sarah’s “still available” claim will block Send until the draft is rewritten.
        </p>
      )}
    </div>
  );
}
