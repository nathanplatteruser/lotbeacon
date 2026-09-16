import { useMemo, useState, type ReactNode } from "react";
import { Ban, Check, CircleHelp, ShieldAlert, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  findVehicle,
  isFresh,
  vehicleLabel,
} from "@/lib/engine";
import { money } from "@/lib/format";
import {
  analyzeInquiry,
  explainThread,
  INQUIRY_EXAMPLES,
  vehicleEvidence,
} from "@/lib/pipeline";
import { threadImpact } from "@/lib/metrics";
import { DEALER, VOICES } from "@/lib/seed";
import { useApp } from "@/lib/store";
import type { AnalyzeResult, ExplainStep, Thread, Vehicle, VoiceId } from "@/lib/types";
import { cn } from "@/lib/utils";

function StepList({ steps }: { steps: ExplainStep[] }) {
  return (
    <ol className="space-y-3">
      {steps.map((s, i) => (
        <li key={s.step} className="grid grid-cols-[4.5rem_1fr] gap-3">
          <div>
            <div className="text-[10px] tracking-wide text-muted-foreground uppercase">{String(i + 1).padStart(2, "0")}</div>
            <div className="text-sm font-medium">{s.step}</div>
          </div>
          <div className="rounded-md border border-border bg-secondary/40 px-3 py-2">
            <div className="text-sm">{s.label}</div>
            <div className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{s.detail}</div>
            {s.claims && s.claims.length > 0 ? (
              <ul className="mt-2 space-y-1">
                {s.claims.map((c, i) => (
                  <li key={i} className={cn("text-[12px]", c.verdict === "supported" ? "text-ok" : "text-destructive")}>
                    {c.verdict === "supported" ? "✓" : "✕"} {c.verdict} — “{c.text}”{c.note ? ` · ${c.note}` : ""}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}

export function WhyThisAction({ thread, vehicle }: { thread: Thread; vehicle: Vehicle | null }) {
  const [open, setOpen] = useState(false);
  const steps = useMemo(() => explainThread(thread, vehicle), [thread, vehicle]);
  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <CircleHelp className="size-4" />
        Why this action
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] w-[min(92vw,720px)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Why this action</DialogTitle>
            <DialogDescription>
              Read → Remember → Verify → Stage → Decide → Check → Gate. Every step cites its evidence. Nothing
              autonomous.
            </DialogDescription>
          </DialogHeader>
          <p className="mb-4 text-sm">
            <span className="text-muted-foreground">Next move · </span>
            {thread.goal}
          </p>
          <StepList steps={steps} />
        </DialogContent>
      </Dialog>
    </>
  );
}

export function InventoryEvidence({ vehicle, compact = false }: { vehicle: Vehicle; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const threads = useApp((s) => s.threads);
  const vehicles = useApp((s) => s.vehicles);
  const staleVehicle = useApp((s) => s.staleVehicle);
  const refreshVehicle = useApp((s) => s.refreshVehicle);
  const markVehicle = useApp((s) => s.markVehicle);
  const live = findVehicle(vehicles, vehicle.stock) ?? vehicle;
  const evidence = vehicleEvidence(live, threads);

  return (
    <>
      <button type="button" className="text-left" onClick={() => setOpen(true)}>
        {compact ? (
          <span className="text-xs text-silver underline-offset-4 hover:underline">Evidence</span>
        ) : (
          <>
            <div className="text-[11px] tracking-wide text-muted-foreground uppercase">Verified vehicle</div>
            <div className="mt-0.5 text-sm underline-offset-4 hover:underline">{vehicleLabel(live)}</div>
            <div className="text-[12px] text-muted-foreground">
              {live.color} · {live.drivetrain} · {live.miles.toLocaleString()} mi · {money(live.price)}
            </div>
          </>
        )}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] w-[min(92vw,640px)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {live.year} {live.make} {live.model} {live.trim}
            </DialogTitle>
            <DialogDescription>
              Stock {live.stock} · VIN {live.vin} · the only record the AI may quote from
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Row k="Status" v={live.status} />
            <Row k="Internet price" v={money(live.price)} />
            <Row k="Mileage" v={live.miles.toLocaleString()} />
            <Row k="Drivetrain" v={live.drivetrain} />
            <Row k="Color" v={live.color} />
            <Row k="Body" v={live.body} />
            <Row k="Source" v={evidence.source} />
            <Row k="Retrieved" v={`${evidence.age} ago · ${evidence.fresh ? "fresh" : "stale"}`} />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {Object.entries(evidence.mayAssert).map(([k, ok]) => (
              <Badge key={k} variant={ok ? "ok" : "danger"}>
                {ok ? "May" : "May not"} {k === "availability" ? "say it is available" : k === "price" ? "quote the price" : k === "mileage" ? "state mileage" : "state drivetrain"}
              </Badge>
            ))}
          </div>
          <p className="mt-3 text-[12px] text-muted-foreground">{evidence.freshnessRule}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {live.status !== "sold" ? (
              <Button size="sm" variant="outline" onClick={() => markVehicle(live.stock, "sold")}>
                Mark sold
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={() => markVehicle(live.stock, "available")}>
                Restore to lot
              </Button>
            )}
            {isFresh(live) ? (
              <Button size="sm" variant="outline" onClick={() => staleVehicle(live.stock)}>
                Make feed stale
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={() => refreshVehicle(live.stock)}>
                Refresh feed
              </Button>
            )}
          </div>
          <h4 className="mt-5 text-[11px] tracking-wide text-muted-foreground uppercase">
            Conversations leaning on this unit ({evidence.usedIn.length})
          </h4>
          <ul className="mt-2 space-y-1 text-sm">
            {evidence.usedIn.length === 0 && <li className="text-muted-foreground">None yet.</li>}
            {evidence.usedIn.map((u) => (
              <li key={u.threadId} className="flex justify-between gap-2">
                <button
                  type="button"
                  className="text-left underline-offset-4 hover:underline"
                  onClick={() => {
                    useApp.getState().selectThread(u.threadId);
                    setOpen(false);
                  }}
                >
                  {u.customer}
                </button>
                <span className="text-muted-foreground">
                  {u.stage} · {u.risk}
                </span>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <div className="text-[11px] tracking-wide text-muted-foreground uppercase">{k}</div>
      <div className="mt-0.5 font-medium">{v}</div>
    </div>
  );
}

export function ThreadImpact({ thread }: { thread: Thread }) {
  const [open, setOpen] = useState(false);
  const appointments = useApp((s) => s.appointments);
  const assumptions = useApp((s) => s.assumptions);
  const impact = useMemo(() => threadImpact(thread, appointments, assumptions), [thread, appointments, assumptions]);
  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        Impact
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="flex w-[min(92vw,420px)] flex-col overflow-y-auto p-5">
          <p className="text-[11px] tracking-wide text-muted-foreground uppercase">{impact.reached}</p>
          <h2 className="font-display mt-1 text-2xl">{thread.customerName}</h2>
          <div className="mt-4 space-y-2">
            {impact.headline.map((h) => (
              <div key={h} className="rounded-md bg-secondary px-3 py-2 text-sm">
                {h}
              </div>
            ))}
          </div>
          <Group title="Usage">
            <KV k="Customer messages" v={String(impact.usage.customerMessages)} />
            <KV k="Replies sent" v={String(impact.usage.repliesSent)} />
            <KV k="Accepted as-is" v={String(impact.usage.draftsAcceptedAsIs)} />
            <KV k="Edited" v={String(impact.usage.draftsEdited)} />
            <KV k="Typed manually" v={String(impact.usage.typedManually)} />
          </Group>
          <Group title="Speed">
            <KV k="First response" v={impact.speed.firstResponse ?? "—"} />
            <KV k="Median response" v={impact.speed.medianResponse ?? "—"} />
          </Group>
          <Group title="Safety">
            <KV k="Claims routed" v={String(impact.safety.claimsRoutedForVerification)} />
            <KV k="Blocked sends" v={String(impact.safety.blockedSends)} />
            <KV k="Handed to a person" v={String(impact.safety.handedToAPerson)} />
            <KV k="Rep corrections to AI memory" v={String(impact.safety.repCorrections)} />
          </Group>
          <Group title="Return">
            <KV k="Rep minutes saved" v={String(impact.return.repMinutesSaved)} />
            <KV k="Rep cost saved" v={money(impact.return.repCostSaved)} />
            <KV k="Expected gross" v={money(impact.return.expectedGross)} />
            <KV k="Prevented-claim value" v={money(impact.return.preventedClaimValue)} />
          </Group>
          <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">{impact.explain.join(" ")}</p>
        </SheetContent>
      </Sheet>
    </>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mt-5">
      <h3 className="mb-2 text-[11px] tracking-wide text-muted-foreground uppercase">{title}</h3>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{k}</span>
      <span className="tabular">{v}</span>
    </div>
  );
}

export function LiveInquiryButton({ label = "Try a live inquiry" }: { label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        {label}
      </Button>
      <LiveInquiryDialog open={open} onOpenChange={setOpen} />
    </>
  );
}

export function LiveInquiryDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const vehicles = useApp((s) => s.vehicles);
  const [text, setText] = useState("");
  const [voice, setVoice] = useState<VoiceId | "">("");
  const [ex, setEx] = useState(0);
  const [result, setResult] = useState<AnalyzeResult | null>(null);

  function run() {
    const t = text.trim();
    if (!t) return;
    setResult(analyzeInquiry(t, vehicles, voice));
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) setResult(null);
      }}
    >
      <DialogContent className="max-h-[90vh] w-[min(92vw,720px)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Try a live inquiry</DialogTitle>
          <DialogDescription>
            Paste what a real customer typed. Classify, extract, verify against live inventory, decide, draft, firewall.
            Nothing is stored.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          placeholder="Paste the customer's message…"
        />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={run} disabled={!text.trim()}>
            Analyze
          </Button>
          <select
            className="h-8 rounded-sm border border-border bg-background px-2 text-xs"
            value={voice}
            onChange={(e) => setVoice(e.target.value as VoiceId | "")}
            aria-label="Reply style"
          >
            <option value="">Reply style: auto</option>
            {VOICES.filter((v) => v.id !== "auto").map((v) => (
              <option key={v.id} value={v.id}>
                {v.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="text-xs text-silver underline-offset-4 hover:underline"
            onClick={() => {
              setText(INQUIRY_EXAMPLES[ex % INQUIRY_EXAMPLES.length]!);
              setEx((n) => n + 1);
            }}
          >
            Try an example
          </button>
        </div>
        {result && <AnalyzeOut result={result} />}
        <p className="mt-3 text-[11px] text-muted-foreground">
          {DEALER.name} hours: Sat {DEALER.hours.sat}, Sun closed. Payments, trades, holds never leave a person.
        </p>
      </DialogContent>
    </Dialog>
  );
}

function AnalyzeOut({ result }: { result: AnalyzeResult }) {
  const blocked = result.draft.claims.some((c) => c.severity === "block") || !result.draft.text;
  const held = result.draft.claims.filter((c) => c.severity !== "ok").length;
  const supported = result.draft.claims.filter((c) => c.severity === "ok").length;
  return (
    <div className="mt-5 space-y-4">
      <div className={cn("rounded-lg border p-4", blocked ? "border-destructive/50" : "border-border")}>
        <div className="text-[11px] tracking-wide text-muted-foreground uppercase">Draft · not stored</div>
        <p className="mt-2 text-sm leading-relaxed">
          {result.draft.text || (
            <span className="text-muted-foreground italic">
              No AI draft — handed to a person: {result.recommendedAction}
            </span>
          )}
        </p>
        <p className="mt-3 text-[12px]">
          {held === 0 && result.draft.text ? (
            <span className="text-ok">Every claim supported. A person still sends.</span>
          ) : blocked ? (
            <span className="text-destructive">
              {held} claim{held === 1 ? "" : "s"} held back. Send stays locked.
            </span>
          ) : (
            <span className="text-warn">{held} flagged · {supported} supported. Review before Send.</span>
          )}
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-[12px] text-muted-foreground">
          <span>
            stage <b className="text-foreground">{result.leadState}</b>
          </span>
          <span>
            action <b className="text-foreground">{result.recommendedAction}</b>
          </span>
          <span>
            voice <b className="text-foreground">{result.voice}</b>
          </span>
          {result.vehicle && (
            <span>
              unit <b className="text-foreground">{vehicleLabel(result.vehicle)}</b>
            </span>
          )}
        </div>
        <div className="mt-3 space-y-1">
          {result.draft.claims.map((c, i) => (
            <div key={i} className="flex items-start gap-2 text-[12px]">
              {c.severity === "ok" && <Check className="mt-0.5 size-3.5 text-ok" />}
              {c.severity === "warn" && <TriangleAlert className="mt-0.5 size-3.5 text-warn" />}
              {c.severity === "block" && <Ban className="mt-0.5 size-3.5 text-destructive" />}
              <span className={c.severity === "block" ? "text-destructive" : "text-muted-foreground"}>{c.reason}</span>
            </div>
          ))}
        </div>
      </div>
      {result.facts.length > 0 && (
        <div>
          <div className="mb-2 text-[11px] tracking-wide text-muted-foreground uppercase">Remembered</div>
          <ul className="space-y-1 text-sm">
            {result.facts.map((f) => (
              <li key={f.id}>
                <span className="text-muted-foreground">{f.key} · </span>
                {f.value}
                <span className="ml-1 text-[11px] text-muted-foreground">{f.certainty}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div>
        <div className="mb-2 flex items-center gap-2 text-[11px] tracking-wide text-muted-foreground uppercase">
          <ShieldAlert className="size-3.5" />
          Decision path
        </div>
        <StepList steps={result.explain} />
      </div>
    </div>
  );
}
