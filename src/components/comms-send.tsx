import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Check, FileText, Link2 } from "lucide-react";
import { toast } from "sonner";
import { DealBrief } from "@/components/deal-brief";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { briefHref, destFor, latestPackage, PACKAGE_AUDIENCE } from "@/lib/package";
import { relativeTime } from "@/lib/format";
import { useApp } from "@/lib/store";
import type { PackageAudience, Thread } from "@/lib/types";

export function CommsSend({ thread }: { thread: Thread }) {
  const sendPackage = useApp((s) => s.sendPackage);
  const packages = useApp((s) => s.packages);
  const navigate = useNavigate();
  const [preview, setPreview] = useState<PackageAudience | null>(null);

  function openBrief(audience: PackageAudience) {
    navigate({
      to: "/app/brief/$threadId",
      params: { threadId: thread.id },
      search: { for: PACKAGE_AUDIENCE[audience].forParam },
    });
  }

  function send(audience: PackageAudience) {
    const dest = destFor(audience);
    sendPackage(thread.id, audience);
    toast(`Sent to ${dest?.name ?? PACKAGE_AUDIENCE[audience].label} · ${dest?.title ?? ""}`.trim(), {
      action: {
        label: "Open brief",
        onClick: () => openBrief(audience),
      },
    });
  }

  function copyLink(audience: PackageAudience) {
    const href = briefHref(thread.id, audience);
    navigator.clipboard.writeText(href);
    toast("Link copied. Text it to the desk — they see live movement.");
  }

  return (
    <div id="comms-package" data-tour="package" className="mt-3">
      <p className="text-[11px] tracking-wide text-muted-foreground uppercase">Comms package</p>
      <p className="mt-1 text-[12px] text-muted-foreground">
        One click. One page. Finance pencils; the GSM walks in current. The link stays live while the deal moves.
      </p>
      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {(["sales_manager", "finance"] as const).map((audience) => {
          const last = latestPackage(packages, thread.id, audience);
          const dest = destFor(audience);
          const meta = PACKAGE_AUDIENCE[audience];
          return (
            <div key={audience} className="rounded-md border border-border p-2.5">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-medium">{meta.label}</span>
                {last ? (
                  <span className="text-[11px] text-muted-foreground">
                    {last.status === "opened" ? "Opened" : "Sent"} {relativeTime(last.openedAt ?? last.sentAt)}
                  </span>
                ) : (
                  <span className="text-[11px] text-muted-foreground">{dest?.name.split(" ")[0]}</span>
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Button
                  size="sm"
                  id={`send-package-${meta.forParam}`}
                  onClick={() => send(audience)}
                >
                  {last ? "Send again" : meta.verb}
                </Button>
                {last ? (
                  <Button size="sm" variant="outline" onClick={() => openBrief(audience)}>
                    <Check className="size-3.5" />
                    Open
                  </Button>
                ) : (
                  <Button size="sm" variant="ghost" onClick={() => setPreview(audience)}>
                    Preview
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <Button size="sm" variant="ghost" id="copy-package-link-gsm" onClick={() => copyLink("sales_manager")}>
          <Link2 className="size-3.5" />
          Copy GSM link
        </Button>
        <Button size="sm" variant="ghost" id="copy-package-link-fi" onClick={() => copyLink("finance")}>
          <Link2 className="size-3.5" />
          Copy F&I link
        </Button>
        <Button size="sm" variant="ghost" id="preview-package" onClick={() => setPreview("sales_manager")}>
          <FileText className="size-3.5" />
          Preview page
        </Button>
      </div>

      <Dialog open={preview != null} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="w-[min(92vw,40rem)] max-h-[86dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>One-page brief</DialogTitle>
            <DialogDescription>
              What {preview ? destFor(preview)?.name : "the desk"} sees. Send still takes a click.
            </DialogDescription>
          </DialogHeader>
          {preview ? <DealBrief thread={thread} audience={preview} compact /> : null}
          {preview ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                onClick={() => {
                  send(preview);
                  setPreview(null);
                }}
              >
                {PACKAGE_AUDIENCE[preview].verb}
              </Button>
              <Button variant="outline" onClick={() => setPreview(null)}>
                Close
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
