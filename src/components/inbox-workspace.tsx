import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Ban,
  Check,
  ChevronLeft,
  Clock,
  ShieldAlert,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";
import { rewriteDraft } from "@/lib/ai";
import {
  bucketFor,
  bucketLabel,
  blocked,
  findVehicle,
  firstUnreadIndex,
  followupBlockedCopy,
  messengerWindowOpen,
  nextAction,
  STAGE_LABEL,
  STAGE_RAIL,
  stageRailIndex,
  stageSubstate,
  vehicleLabel,
  windowLeftMs,
  isFresh,
  unansweredInbounds,
  lastOutbound,
  namedVisitFor,
  unansweredWaitMin,
  needsWaitApology,
} from "@/lib/engine";
import { durationHuman, relativeTime } from "@/lib/format";
import { DEALER, TEAM, VOICES } from "@/lib/seed";
import { Sparkline, SparkRail } from "@/components/sparkline";
import { communicationSignals, dealFileText, downloadIcs, appointmentIcs, googleCalendarUrl } from "@/lib/signals";
import { useApp } from "@/lib/store";
import type { Bucket, SlotPair, Thread } from "@/lib/types";
import {
  THREAD_LENGTHS,
  MIN_EXCHANGES,
  canCloseThread,
  chartSlots,
  remainingExchanges,
} from "@/lib/thread-length";
import { AUTO_VOICE_THRESHOLD, detectCustomerVoice } from "@/lib/voices";
import { CHANNEL_META, channelOf } from "@/lib/channels";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { WhyThisAction, InventoryEvidence, ThreadImpact } from "@/components/copilot-panels";
import { CallOutcomes, ChannelFields, ChannelSwitcher, TestSend } from "@/components/channel-compose";
import { CrmStrip } from "@/components/crm-strip";
import { CommsSend } from "@/components/comms-send";
import { adfXml, downloadAdf, latestPush, leadIdFor } from "@/lib/crm";

const BUCKET_ORDER: Bucket[] = [
  "reply_now",
  "book_now",
  "window_closing",
  "appointment_change",
  "follow_up",
  "waiting",
  "closed",
];

const FACT_LABEL: Record<string, string> = {
  trade: "Trade",
  trade_vehicle: "Trade",
  preferred_vehicle: "Vehicle",
  vehicle: "Vehicle",
  timing: "Visit",
  need: "Need",
  asked_about: "Asked",
  budget: "Budget",
  payment: "Payment target",
  payment_target: "Payment target",
  who: "Who",
  visit_purpose: "Purpose",
  spouse: "Spouse",
  kids: "Kids",
  use_case: "Use",
  drivetrain: "Drivetrain",
  process: "Process",
  objection: "Risk",
  contact: "Contact",
  visit: "Show",
  credit: "Credit",
  purchase_timing: "Buy window",
  show_intent: "Show odds",
};

export function InboxWorkspace() {
  const threads = useApp((s) => s.threads);
  const appointments = useApp((s) => s.appointments);
  const vehicles = useApp((s) => s.vehicles);
  const selectedId = useApp((s) => s.selectedThreadId);
  const selectThread = useApp((s) => s.selectThread);
  const currentRepId = useApp((s) => s.currentRepId);
  const threadLength = useApp((s) => s.threadLength);
  const setThreadLength = useApp((s) => s.setThreadLength);
  const grouped = useMemo(() => {
    const map = new Map<Bucket, Thread[]>();
    for (const b of BUCKET_ORDER) map.set(b, []);
    for (const t of threads) {
      const b = bucketFor(t, appointments);
      map.get(b)!.push(t);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime());
    }
    return map;
  }, [threads, appointments]);

  const selected = threads.find((t) => t.id === selectedId) ?? null;
  const [mobilePane, setMobilePane] = useState<"list" | "thread">(selected ? "thread" : "list");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const typing = tag === "TEXTAREA" || tag === "INPUT" || tag === "SELECT";
      const actionable = BUCKET_ORDER.flatMap((b) => grouped.get(b) ?? []).filter(
        (t) => bucketFor(t, appointments) !== "closed" && bucketFor(t, appointments) !== "waiting",
      );
      const list = actionable.length ? actionable : threads;
      const idx = list.findIndex((t) => t.id === selectedId);
      if (!typing && (e.key === "j" || e.key === "J")) {
        const next = list[Math.min(idx + 1, list.length - 1)];
        if (next) selectThread(next.id);
      }
      if (!typing && (e.key === "k" || e.key === "K")) {
        const prev = list[Math.max(idx - 1, 0)];
        if (prev) selectThread(prev.id);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        if (!selected) return;
        if (selected.stage === "lost" || selected.stage === "sold" || selected.stage === "visit") return;
        if (remainingExchanges(selected, threadLength) === 0) return;
        if (channelOf(selected) === "phone") return;
        if (blocked(selected.draft, selected) || !selected.draft.text) return;
        useApp.getState().sendAndNext(selected.id);
      }
      if (!typing && e.key === "e") {
        e.preventDefault();
        document.getElementById("draft-box")?.focus();
      }
      if (!typing && (e.key === "1" || e.key === "2") && selected?.draft.slots.length) {
        e.preventDefault();
        const current = selected.slotPair ?? "default";
        if (e.key === "1") useApp.getState().setSlotPair(selected.id, "default");
        else useApp.getState().setSlotPair(selected.id, current === "morning" ? "afternoon" : "morning");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [grouped, appointments, threads, selectedId, selectThread, selected, threadLength]);

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] min-h-0 lg:h-[calc(100dvh-3.5rem)]">
      <section
        data-tour="queue"
        className={cn(
          "w-full shrink-0 overflow-y-auto border-r border-border lg:w-[22rem]",
          mobilePane === "thread" && "hidden lg:block",
        )}
      >
        <div className="sticky top-0 z-10 border-b border-border bg-card/95 px-3 py-3 backdrop-blur">
          <div className="text-xs tracking-wide text-muted-foreground uppercase">Inbox</div>
          <div className="mt-1 text-sm text-muted-foreground">
            {threads.filter((x) => { const last = x.messages[x.messages.length-1]; return last?.who === "customer" && !x.dnc; }).length} need you · {threads.length} total · J / K · ⌘↵
          </div>
          <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">
            Demo walk. Reset, then{" "}
            <button type="button" className="underline underline-offset-2" onClick={() => selectThread("t_riley")}>
              Riley
            </button>{" "}
            (vague to packet),{" "}
            <button type="button" className="underline underline-offset-2" onClick={() => selectThread("t_mike")}>
              Mike
            </button>{" "}
            (firewall), then{" "}
            <Link to="/app/admin" search={{ as: "admin" }} className="underline underline-offset-2">
              Admin huddle
            </Link>
            .
          </p>
          <p className="mt-3 text-[11px] tracking-wide text-muted-foreground uppercase">Thread length</p>
          <div className="mt-1 flex flex-col gap-1">
            {THREAD_LENGTHS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setThreadLength(p.id);
                  toast(`${p.label} · ${p.blurb}`);
                }}
                className={cn(
                  "min-h-11 rounded-md border px-3 py-2 text-left text-sm",
                  threadLength === p.id ? "border-paper bg-paper text-ink" : "border-border",
                )}
              >
                <div>{p.label}</div>
                <div className={cn("mt-0.5 text-[11px]", threadLength === p.id ? "text-ink/70" : "text-muted-foreground")}>
                  {p.blurb}
                </div>
              </button>
            ))}
          </div>
        </div>
        {BUCKET_ORDER.map((b) => {
          const rows = grouped.get(b) ?? [];
          if (!rows.length) return null;
          return (
            <div key={b} className="px-2 py-2">
              <div className="px-2 pb-1 text-[11px] tracking-wide text-muted-foreground uppercase">
                {bucketLabel(b)}
                <span className="ml-2 tabular">{rows.length}</span>
              </div>
              {rows.map((t) => {
                const last = t.messages[t.messages.length - 1];
                const active = t.id === selectedId;
                const left = windowLeftMs(t);
                const waitingOnUs = last?.who === "customer" && !t.dnc;
                const hotWait = waitingOnUs && Date.now() - new Date(t.lastInboundAt).getTime() > 10 * 60_000;
                const hotWin = t.channel === "messenger" && left > 0 && left < 4 * 3600_000;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      selectThread(t.id);
                      setMobilePane("thread");
                    }}
                    className={cn(
                      "mb-0.5 w-full rounded-md border-l-2 px-2.5 py-2 text-left",
                      active ? "border-l-paper bg-accent" : "border-l-transparent hover:bg-accent/50",
                    )}
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-1.5 truncate text-sm font-medium">
                        {waitingOnUs ? <span className="size-2 shrink-0 rounded-full bg-paper" /> : null}
                        {t.customerName}
                        <span className="shrink-0 text-[10px] tracking-wide text-muted-foreground uppercase">
                          {CHANNEL_META[t.channel].short}
                        </span>
                      </span>
                      <span className={cn("shrink-0 text-[11px] tabular", hotWait ? "font-medium text-paper" : "text-muted-foreground")}>
                        {waitingOnUs ? `waiting ${relativeTime(t.lastInboundAt)}` : relativeTime(t.lastActivityAt)}
                      </span>
                    </div>
                    {t.hint ? (
                      <p className="mt-1 inline-flex max-w-full truncate rounded-full bg-warn/15 px-2 py-0.5 text-[11px] italic text-warn">
                        {t.hint}
                      </p>
                    ) : null}
                    <p className="mt-0.5 truncate text-[12px] text-foreground/80">{last?.text}</p>
                    <p className="mt-1 truncate text-[11px] text-silver">{nextAction(t, b)}</p>
                    {t.channel === "messenger" && left > 0 && b !== "closed" ? (
                      <p className={cn("mt-0.5 text-[11px] tabular", hotWin ? "font-medium text-destructive" : "text-muted-foreground")}>
                        {durationHuman(left)} left to reply
                      </p>
                    ) : null}
                    {(() => {
                      const sig = communicationSignals(t);
                      const slots = chartSlots(t, threadLength);
                      return (
                        <SparkRail
                          series={sig.momentum.series}
                          trend={sig.momentum.trend}
                          score={sig.momentum.score}
                          label={sig.momentum.label}
                          slots={slots}
                          delta={sig.momentum.delta}
                        />
                      );
                    })()}
                  </button>
                );
              })}
            </div>
          );
        })}
      </section>

      <section
        className={cn(
          "flex min-w-0 flex-1 flex-col",
          mobilePane === "list" && "hidden lg:flex",
        )}
      >
        {selected ? (
          <ThreadPane
            thread={selected}
            onBack={() => setMobilePane("list")}
            currentRepId={currentRepId}
            vehicle={findVehicle(vehicles, selected.vehicleStock)}
          />
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            Pick a lead.
          </div>
        )}
      </section>
    </div>
  );
}

function ThreadPane({
  thread,
  onBack,
  currentRepId,
  vehicle,
}: {
  thread: Thread;
  onBack: () => void;
  currentRepId: string;
  vehicle: ReturnType<typeof findVehicle>;
}) {
  const appointments = useApp((s) => s.appointments);
  const setDraftText = useApp((s) => s.setDraftText);
  const sendAndNext = useApp((s) => s.sendAndNext);
  const bookSlot = useApp((s) => s.bookSlot);
  const closeThread = useApp((s) => s.closeThread);
  const threadLength = useApp((s) => s.threadLength);
  const setVoice = useApp((s) => s.setVoice);
  const takeover = useApp((s) => s.takeover);
  const applyGrokDraft = useApp((s) => s.applyGrokDraft);
  const startFollowup = useApp((s) => s.startFollowup);
  const stopFollowup = useApp((s) => s.stopFollowup);
  const setSlotPair = useApp((s) => s.setSlotPair);
  const setStage = useApp((s) => s.setStage);
  const logOffline = useApp((s) => s.logOffline);
  const correctFact = useApp((s) => s.correctFact);
  const setOutboundChannel = useApp((s) => s.setOutboundChannel);
  const setDraftSubject = useApp((s) => s.setDraftSubject);
  const logCall = useApp((s) => s.logCall);
  const sendTest = useApp((s) => s.sendTest);
  const intercepts = useApp((s) => s.intercepts) ?? [];
  const threadIntercepts = intercepts.filter((i) => i.threadId === thread.id);
  const endRef = useRef<HTMLDivElement>(null);
  const [rewriting, setRewriting] = useState(false);
  const [hlId, setHlId] = useState<string | null>(null);
  const [simText, setSimText] = useState("");
  const left = windowLeftMs(thread);
  const isBlocked = blocked(thread.draft, thread);
  const owner = TEAM.find((r) => r.id === thread.assignedRepId);
  const lastCustomer = [...thread.messages].reverse().find((m) => m.who === "customer");
  const timePicked = lastCustomer && /i'll be there|see you then|i'll come in|you're on the books/i.test(lastCustomer.text);
  const remaining = remainingExchanges(thread, threadLength);
  const readyToClose = canCloseThread(thread, threadLength) && thread.stage !== "lost" && thread.stage !== "sold" && thread.stage !== "visit";
  const closed = thread.stage === "lost" || thread.stage === "sold" || thread.stage === "visit";
  const needed = THREAD_LENGTHS.find((p) => p.id === threadLength);
  const unreadAt = firstUnreadIndex(thread.messages);
  const fu = thread.followupStage ?? 0;
  const pair = thread.slotPair ?? "default";
  const detected = lastCustomer ? detectCustomerVoice(lastCustomer.text) : { voice: "auto" as const, confidence: 0, signals: [] as string[] };
  const autoLabel =
    detected.confidence >= AUTO_VOICE_THRESHOLD && detected.voice !== "auto"
      ? VOICES.find((v) => v.id === detected.voice)?.label ?? "matched"
      : "Dealership default";

  async function runRewrite() {
    if (rewriting || thread.dnc || closed) return;
    setRewriting(true);
    try {
      const res = await rewriteDraft({
        data: {
          customer: thread.customerName,
          goal: thread.goal,
          missing: thread.missing,
          facts: thread.facts.map((f) => `${f.key}: ${f.value}`).join("; "),
          vehicle: vehicle
            ? `${vehicleLabel(vehicle)}, ${vehicle.color}, ${vehicle.drivetrain}, ${vehicle.miles} mi, $${vehicle.price}, ${vehicle.status}, stock ${vehicle.stock}`
            : "none",
          hours: Object.entries(DEALER.hours)
            .map(([d, h]) => `${d} ${h}`)
            .join(", "),
          voice: thread.voice,
          lastMessages: (() => {
            const unanswered = unansweredInbounds(thread);
            const last = lastOutbound(thread);
            const prior = thread.messages
              .filter((m) => unanswered.every((u) => u.id !== m.id))
              .slice(-4)
              .map((m) => `${m.who}: ${m.text}`)
              .join("\n");
            const cluster = unanswered.length
              ? `Unanswered since last send (${unanswered.length}; latest last):\n${unanswered.map((m) => `customer: ${m.text}`).join("\n")}`
              : "No unanswered inbound. Do not invent a chase message.";
            return `${prior}${last ? `\nlast outbound: ${last.text}` : ""}\n${cluster}`;
          })(),
          prohibited: "payments, approvals, trade values, discounts, doc fees, Sunday hours, sold-unit availability",
          namedVisit: (() => {
            const v = namedVisitFor(thread);
            if (v.clock && v.label) return `${v.label}. Confirm this if it is on the available list. Do not offer a second time unless they asked for options.`;
            if (v.dayHint) return `${v.dayHint} (no clock yet). Offer two times from the available list.`;
            if (v.sunday) return "Sunday. Closed. Offer Saturday from the available list.";
            return "None named. Offer two times from the available list only if you need a visit on the books.";
          })(),
          availableSlots: thread.draft.slots.map((s) => s.label).join(" · ") || "none",
          waitMinutes: unansweredWaitMin(thread),
          apologize: needsWaitApology(thread),
        },
      });
      if (res.ok) {
        applyGrokDraft(thread.id, res.text);
        toast("Draft rewritten. Claims re-checked.");
      } else {
        toast(res.error);
      }
    } finally {
      setRewriting(false);
    }
  }

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [thread.messages.length, thread.id]);

  function offline(channel: string) {
    const note = window.prompt("Quick note (optional):", "") ?? "";
    logOffline(thread.id, channel, note.trim() || undefined);
    toast(`Logged ${channel}`);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
      <div className="flex min-w-0 min-h-0 flex-1 flex-col border-b border-border lg:border-r lg:border-b-0">
        <div className="flex items-start gap-2 border-b border-border px-3 py-3">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={onBack} aria-label="Back">
            <ChevronLeft className="size-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-medium">{thread.customerName}</h2>
              <Badge>{CHANNEL_META[thread.channel].label}</Badge>
              {thread.outboundChannel && thread.outboundChannel !== thread.channel ? (
                <Badge variant="silver">via {CHANNEL_META[thread.outboundChannel].short}</Badge>
              ) : null}
              {thread.dnc && <Badge variant="danger">Do not contact</Badge>}
            </div>
            <p data-tour="meta" className="mt-1 text-[12px] text-muted-foreground">
              {thread.source} · {thread.city} · AI drafting · {owner?.name ?? "unassigned"} sends · no autonomous sends
            </p>
            <p data-tour="buddy" className="mt-1 text-[12px] italic text-warn">{thread.hint}</p>
            <p className="mt-1 text-[12px] text-ok">Next step: {thread.goal}</p>
            <StageRail thread={thread} onStage={setStage} sub={stageSubstate(thread, appointments)} />
          </div>
          <div className="hidden text-right text-[11px] text-muted-foreground sm:block">
            {thread.channel === "messenger" && left > 0 && (
              <div className="inline-flex items-center gap-1">
                <Clock className="size-3" />
                {durationHuman(left)} left to reply
              </div>
            )}
            {thread.channel === "messenger" && left <= 0 && (
              <div className="text-warn">reply window closed — call or text</div>
            )}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-5">
          {thread.messages.map((m, k) => (
            <div key={m.id} id={`msg-${m.id}`}>
              {k === unreadAt && (
                <div className="my-3 flex items-center gap-3 text-[11px] tracking-[0.14em] text-muted-foreground uppercase">
                  <span className="h-px flex-1 bg-border" />
                  New
                  <span className="h-px flex-1 bg-border" />
                </div>
              )}
              <div className={cn("mb-3 flex", m.who === "customer" ? "justify-start" : "justify-end")}>
              <div
                className={cn(
                  "max-w-[min(100%,34rem)] rounded-lg px-3 py-2",
                  m.who === "customer" && "bg-secondary text-foreground",
                  m.who === "rep" && "bg-primary text-primary-foreground",
                  m.who === "system" && "border border-dashed border-border bg-transparent text-muted-foreground",
                  m.who === "ai" && "bg-accent text-foreground",
                  hlId === m.id && "ring-2 ring-silver",
                )}
              >
                  <div className="mb-1 flex gap-2 text-[10px] tracking-wide uppercase opacity-70">
                    <span>{m.sender}</span>
                    <span>{CHANNEL_META[m.channel].short}</span>
                    <span className="tabular">{relativeTime(m.at)}</span>
                  </div>
                  {m.subject ? <p className="mb-1 text-[12px] font-medium">{m.subject}</p> : null}
                  <p className="text-sm leading-relaxed">{m.text}</p>
                  {m.who === "customer"
                    ? threadIntercepts
                        .filter((i) => i.kind === "inbound_flagged" && m.text.includes(i.quote.slice(0, 24)))
                        .map((i) => (
                          <p key={i.id} className="mt-2 border-t border-border/60 pt-2 text-[11px] leading-snug text-warn">
                            Flagged · {i.sticker ?? "does not match the lot"} · {i.status === "late" ? "caught late" : "held"}
                          </p>
                        ))
                    : null}
                </div>
              </div>
            </div>
          ))}
          {thread.ghostUntil && (
            <div className="mb-3 rounded-md border border-dashed border-border px-3 py-3 text-sm text-muted-foreground">
              [{thread.customerName} hasn't replied in {durationHuman(Math.max(0, Date.now() - new Date(thread.lastInboundAt).getTime()))}]
              {!messengerWindowOpen(thread) && (
                <p className="mt-2 text-[12px] text-warn">{followupBlockedCopy()}</p>
              )}
              <div className="mt-2 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={fu >= 3}
                  onClick={() => {
                    startFollowup(thread.id);
                    toast(
                      fu >= 2
                        ? "All 3 nudges drafted"
                        : messengerWindowOpen(thread)
                          ? `Follow-up ${fu + 1} drafted`
                          : "Window closed — call instead",
                    );
                  }}
                >
                  {fu >= 3 ? "All 3 nudges sent" : fu ? `Send nudge ${fu + 1} of 3` : "Start follow-up sequence"}
                </Button>
                {fu > 0 && (
                  <Button size="sm" variant="ghost" onClick={() => stopFollowup(thread.id)}>
                    Stop
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => offline("call")}>Log a call</Button>
                <Button size="sm" variant="ghost" onClick={() => offline("text")}>Log a text</Button>
                <Button size="sm" variant="ghost" onClick={() => offline("email")}>Log an email</Button>
                <Button size="sm" variant="ghost" onClick={() => offline("came in")}>Log came in</Button>
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>
      </div>

      <aside className="flex w-full shrink-0 flex-col overflow-y-auto lg:w-[380px]">
        <div data-tour="card" className="border-b border-border px-4 py-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="text-[11px] tracking-wide text-muted-foreground uppercase">One action</div>
              <p className="truncate text-sm">
                {thread.goal}
                <span className="text-muted-foreground"> · {thread.missing}</span>
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap justify-end gap-1">
              <span data-tour="why">
                <WhyThisAction thread={thread} vehicle={vehicle} />
              </span>
              <span data-tour="impact">
                <ThreadImpact thread={thread} />
              </span>
            </div>
          </div>
          {vehicle ? (
            <div className="mt-1 flex items-center justify-between gap-2 text-sm">
              <span className="min-w-0 truncate">
                {vehicleLabel(vehicle)}
                <span className="ml-2 inline-block align-baseline">
                  <InventoryEvidence vehicle={vehicle} compact />
                </span>
              </span>
              <Badge variant={vehicle.status === "available" ? "ok" : vehicle.status === "sold" ? "danger" : "warn"}>
                {vehicle.status}
              </Badge>
            </div>
          ) : null}
          {threadIntercepts.length > 0 ? (
            <div className="mt-2 rounded-md border border-warn/40 px-2.5 py-2">
              <p className="text-[10px] tracking-wide text-warn uppercase">Held at the gate</p>
              {threadIntercepts.map((i) => (
                <p key={i.id} className="mt-1 text-[11px] leading-snug text-muted-foreground">
                  {i.kind === "outbound_blocked" ? "Outbound held" : i.status === "late" ? "Inbound late" : "Inbound flagged"}
                  {" · "}
                  {i.sticker ?? i.reason}
                </p>
              ))}
            </div>
          ) : null}
          <div className="mt-1.5 flex items-center justify-between gap-2">
            <span className="text-[11px] tracking-wide text-muted-foreground uppercase">Reply style</span>
            <select
              className="h-8 max-w-[11rem] rounded-sm border border-border bg-background px-2 text-xs"
              value={thread.voiceLocked ? thread.voice : "auto"}
              onChange={(e) => setVoice(thread.id, e.target.value as Thread["voice"])}
              aria-label="Reply style"
            >
              <option value="auto">Auto ({autoLabel})</option>
              {VOICES.filter((v) => v.id !== "auto").map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div data-tour="signals">
          <SignalsPane thread={thread} compact />
        </div>

        <details className="border-b border-border px-4 py-2">
          <summary className="cursor-pointer text-[11px] tracking-wide text-muted-foreground uppercase">
            Known · {thread.facts.length} fact{thread.facts.length === 1 ? "" : "s"}
          </summary>
          <ul className="mt-2 flex flex-wrap gap-1">
            {thread.facts.length === 0 ? (
              <li className="text-[12px] text-muted-foreground">Nothing yet</li>
            ) : null}
            {thread.facts.map((f) => (
              <li key={f.id}>
                <button
                  type="button"
                  className="rounded-full border border-border px-2 py-0.5 text-[12px]"
                  title="Click to see their own words. Right-click to correct."
                  onClick={() => {
                    const hit = thread.messages.find((m) => f.evidence && m.text.includes(f.evidence)) ?? thread.messages.find((m) => m.who === "customer");
                    if (hit) {
                      setHlId(hit.id);
                      document.getElementById(`msg-${hit.id}`)?.scrollIntoView({ block: "center" });
                    }
                    toast(f.evidence ? `“${f.evidence}”` : `${f.key}: ${f.value}`);
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    const next = window.prompt(`Correct ${f.key} (empty = keep)`, f.value);
                    if (next != null && next !== f.value) correctFact(thread.id, f.id, next);
                  }}
                >
                  <span className="text-muted-foreground">{FACT_LABEL[f.key] ?? f.key}: </span>
                  <b>{f.value}</b>
                </button>
              </li>
            ))}
          </ul>
          <DemoSim threadId={thread.id} remaining={remaining > 0} vehicleStock={thread.vehicleStock} simText={simText} setSimText={setSimText} />
        </details>

        <div className="flex-1 px-4 py-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="text-[11px] tracking-wide text-muted-foreground uppercase">Draft · Messenger is home</div>
            <Button type="button" variant="ghost" size="sm" disabled={rewriting || thread.dnc || closed} onClick={() => void runRewrite()}>
              <Sparkles className="size-4" />
              {rewriting ? "Rewriting" : "Rewrite"}
            </Button>
          </div>
          <ChannelSwitcher
            thread={thread}
            onPick={(ch) => {
              setOutboundChannel(thread.id, ch);
              toast(`Compose on ${CHANNEL_META[ch].label}`);
            }}
          />
          <ChannelFields thread={thread} onSubject={(s) => setDraftSubject(thread.id, s)} />
          {channelOf(thread) !== "phone" ? (
            <Textarea
              id="draft-box"
              value={thread.draft.text}
              onChange={(e) => setDraftText(thread.id, e.target.value)}
              disabled={thread.dnc}
              rows={5}
              className="mt-3 min-h-24"
            />
          ) : (
            <p className="mt-3 text-[12px] text-muted-foreground">
              Opener: {thread.draft.text} You dial. We do not place the call.
            </p>
          )}
          <div className="mt-2 space-y-1">
            {thread.draft.claims.map((c, i) => (
              <div key={i} className="flex items-start gap-2 text-[12px]">
                {c.severity === "ok" && <Check className="mt-0.5 size-3.5 text-ok" />}
                {c.severity === "warn" && <TriangleAlert className="mt-0.5 size-3.5 text-warn" />}
                {c.severity === "block" && <Ban className="mt-0.5 size-3.5 text-destructive" />}
                <span className={c.severity === "block" ? "text-destructive" : "text-muted-foreground"}>{c.reason}</span>
              </div>
            ))}
          </div>

          {thread.draft.slots.length >= 2 && !thread.dnc && (
            <div className="mt-3 flex flex-wrap gap-1">
              {(
                [
                  ["default", thread.draft.slots[0] && thread.draft.slots[1] ? `1 · ${thread.draft.slots[0].label} + ${thread.draft.slots[1].label}` : "1 · offered pair"],
                  ["morning", "2 · both morning"],
                  ["afternoon", "both afternoon"],
                ] as [SlotPair, string][]
              ).map(([id, label]) => (
                <Button
                  key={id}
                  size="sm"
                  variant={pair === id ? "default" : "outline"}
                  onClick={() => {
                    setSlotPair(thread.id, id);
                    toast(
                      id === "morning"
                        ? "Offering Saturday 9:00 or 10:30"
                        : id === "afternoon"
                          ? "Offering Saturday 1:00 or 2:00"
                          : "Offering the verified pair",
                    );
                  }}
                >
                  {label}
                </Button>
              ))}
            </div>
          )}

          {timePicked && readyToClose && thread.draft.slots[0] ? (
            <div className="mt-3 rounded-md border border-ok/40 bg-ok/10 px-3 py-2">
              <div className="text-[11px] tracking-wide text-ok uppercase">Time selected · path complete</div>
              <div className="mt-0.5 font-medium">{thread.draft.slots[0].label}</div>
              <p className="text-[12px] text-muted-foreground">
                {vehicle ? vehicleLabel(vehicle) : "Visit"} · {owner?.name ?? "you"} · Book, withdraw, or ghost
              </p>
            </div>
          ) : null}

          {readyToClose && thread.draft.slots.length > 0 && !thread.dnc ? (
            <div className="mt-3 grid grid-cols-2 gap-2">
              {thread.draft.slots.map((slot) => (
                <Button
                  key={slot.id}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    bookSlot(thread.id, slot.id);
                    toast(`Booked ${slot.label}`);
                  }}
                >
                  Book {slot.label}
                </Button>
              ))}
            </div>
          ) : null}

          <div className="mt-3 rounded-md border border-border px-3 py-2">
            <div className="flex items-baseline justify-between gap-2 text-[12px]">
              <span className="text-muted-foreground">
                {needed?.label} · {thread.demoCursor} / {MIN_EXCHANGES[threadLength]}
              </span>
              <span className="tabular">
                {closed
                  ? thread.stage === "visit"
                    ? "Closed · booked"
                    : thread.goal
                  : remaining > 0
                    ? `${remaining} exchanges left before a close`
                    : "Ready to close"}
              </span>
            </div>
            <Progress
              className="mt-2"
              value={Math.round((thread.demoCursor / MIN_EXCHANGES[threadLength]) * 100)}
            />
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {channelOf(thread) === "phone" ? (
              <CallOutcomes
                disabled={thread.dnc || closed}
                onLog={(outcome) => {
                  logCall(thread.id, outcome);
                  toast(
                    outcome === "reached"
                      ? "Call logged · reached. ADF queued."
                      : `Call logged · ${outcome.replace("_", " ")}`,
                  );
                }}
              />
            ) : (
              <Button
                disabled={isBlocked || !thread.draft.text || closed || remaining === 0}
                onClick={() => {
                  sendAndNext(thread.id);
                  toast(
                    remaining <= 1
                      ? "Last required exchange is in. Close when you are ready."
                      : `${CHANNEL_META[channelOf(thread)].send}. They answered. Charts ticked.`,
                  );
                }}
              >
                {remaining > 0 ? CHANNEL_META[channelOf(thread)].send : "Path complete"}
              </Button>
            )}
            <TestSend
              channel={channelOf(thread)}
              disabled={thread.dnc || closed}
              onSend={() => {
                const ch = channelOf(thread);
                sendTest(thread.id, ch);
                toast(
                  ch === "sms"
                    ? "Test SMS delivered · store 10DLC. Demo carrier, not a personal cell."
                    : ch === "email"
                      ? "Test email landed in the inbox. Demo mailer."
                      : ch === "phone"
                        ? "Store line rang once. You still dial live. Demo ring."
                        : "Test ping on this synthetic Messenger thread.",
                );
              }}
            />
            {readyToClose ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    closeThread(thread.id, "withdrawn");
                    toast("Closed · will not come in");
                  }}
                >
                  Withdraw
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    closeThread(thread.id, "ghosted");
                    toast("Closed · ghosted");
                  }}
                >
                  Ghost
                </Button>
              </>
            ) : null}
            <Button variant="ghost" size="sm" onClick={() => takeover(thread.id)}>
              {thread.takeover ? "Resume AI" : "Take over"}
            </Button>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Producer: {thread.draft.producer} · you are {TEAM.find((r) => r.id === currentRepId)?.name}
          </p>
          <CrmStrip thread={thread} />
          <CommsSend thread={thread} />
        </div>

        <DealPacket thread={thread} />
      </aside>
    </div>
  );
}

function StageRail({
  thread,
  onStage,
  sub,
}: {
  thread: Thread;
  onStage: (id: string, stage: Thread["stage"]) => void;
  sub: string;
}) {
  const cur = stageRailIndex(thread.stage);
  return (
    <div data-tour="stages" className="mt-2">
      <div className="flex flex-wrap items-center gap-1">
        {STAGE_RAIL.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={() => onStage(thread.id, s.id)}
            className={cn(
              "rounded-full px-2 py-0.5 text-[11px]",
              i < cur && "text-muted-foreground",
              i === cur && "bg-accent text-foreground",
              i > cur && "text-muted-foreground/60",
            )}
          >
            {s.label}
          </button>
        ))}
        <select
          className="ml-1 h-7 rounded-sm border border-border bg-background px-1 text-[11px]"
          value={thread.stage}
          aria-label="Correct stage"
          onChange={(e) => onStage(thread.id, e.target.value as Thread["stage"])}
        >
          {Object.entries(STAGE_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">{sub}</p>
    </div>
  );
}

function SignalsPane({ thread, compact }: { thread: Thread; compact?: boolean }) {
  const threadLength = useApp((s) => s.threadLength);
  const sig = communicationSignals(thread);
  const slots = chartSlots(thread, threadLength);
  const sparkH = compact ? 56 : 72;
  return (
    <div id="signals-pane" data-tour="signals" className={cn("px-4", compact ? "border-b border-border py-2" : "border-t border-border py-3")}>
      <div className="mb-1 flex items-center gap-2 text-[11px] tracking-wide text-muted-foreground uppercase">
        <ShieldAlert className="size-3.5" />
        Show-likelihood
      </div>
      {sig.headline ? (
        <p className="mb-1 text-[12px] tracking-wide uppercase">{sig.headline.text}</p>
      ) : null}
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm">{sig.momentum.label}</span>
        <span className="font-display text-3xl tabular">{sig.momentum.score}</span>
      </div>
      <Sparkline series={sig.momentum.series} trend={sig.momentum.trend} nums refs width={248} height={sparkH} maxPoints={8} slots={slots} />
      <ul className="mt-2 grid grid-cols-5 gap-1">
        {sig.signals.map((s) => (
          <li key={s.key} className="min-w-0 text-center">
            <div className="font-display text-sm tabular">{s.score}</div>
            <div className="truncate text-[10px] leading-tight text-muted-foreground">{s.label}</div>
          </li>
        ))}
      </ul>
      <details className="mt-2">
        <summary className="cursor-pointer text-[11px] tracking-wide text-muted-foreground uppercase">
          Sub-metrics over time
        </summary>
        <ul className="mt-2 space-y-3">
          {sig.signals.map((s) => (
            <li key={s.key}>
              <div className="flex items-center justify-between text-[12px]">
                <span>{s.label}</span>
                <span className="tabular">
                  {s.score}{" "}
                  <span className={s.trend === "up" ? "text-ok" : s.trend === "down" ? "text-destructive" : "text-warn"}>
                    {s.delta > 0 ? `+${s.delta}` : s.delta}
                  </span>
                </span>
              </div>
              <Sparkline series={s.series} trend={s.trend} nums width={248} height={56} maxPoints={8} slots={slots} />
              <p className="text-[11px] text-muted-foreground">{s.why}</p>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}

function DealPacket({ thread }: { thread: Thread }) {
  const vehicles = useApp((s) => s.vehicles);
  const currentRepId = useApp((s) => s.currentRepId);
  const pushes = useApp((s) => s.crmPushes);
  const vehicle = findVehicle(vehicles, thread.vehicleStock);
  const last = latestPush(pushes, thread.id);
  const xml =
    last?.xml ??
    adfXml({
      thread,
      vehicle,
      dealer: DEALER,
      repName: TEAM.find((r) => r.id === currentRepId)?.name ?? "Desk",
      trigger: last?.trigger ?? "manual",
      at: last?.at,
    });
  const start = thread.draft.slots[0]?.at ?? new Date(Date.now() + 2 * 24 * 3600_000).toISOString();
  const icsOpts = {
    title: `Visit · ${thread.customerName}`,
    starts: start,
    customer: thread.customerName,
    place: `${DEALER.name}, ${DEALER.address}`,
  };

  return (
    <div id="deal-packet" className="border-t border-border px-4 py-3">
      <p className="text-[11px] tracking-wide text-muted-foreground uppercase">Closer packet</p>
      <pre className="mt-1 max-h-28 overflow-auto whitespace-pre-wrap text-[12px] text-muted-foreground">{dealFileText(thread)}</pre>
      <div className="mt-2 flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          id="copy-deal-notes"
          onClick={() => {
            navigator.clipboard.writeText(dealFileText(thread));
            toast("Deal notes copied. Paste into VinSolutions or the desk log.");
          }}
        >
          Copy deal notes
        </Button>
        <Button
          size="sm"
          variant="outline"
          id="deal-adf"
          onClick={() => {
            downloadAdf(`${leadIdFor(thread)}.adf.xml`, xml);
            toast("ADF downloaded. VinSolutions / Elead / DriveCentric import this file.");
          }}
        >
          Download ADF
        </Button>
        <Button
          size="sm"
          variant="ghost"
          id="deal-ics"
          onClick={() =>
            downloadIcs(`lotbeacon-${thread.customerName.replace(/\s+/g, "-").toLowerCase()}.ics`, appointmentIcs(icsOpts))
          }
        >
          Download .ics
        </Button>
        <Button size="sm" variant="ghost" asChild>
          <a href={googleCalendarUrl(icsOpts)} target="_blank" rel="noopener noreferrer">
            Google Calendar
          </a>
        </Button>
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">
        Or send the one-page to finance or the GSM — they get live movement, not a paste. Calendar is a courtesy hold.
        A person still hits Send. Nothing autonomous.
      </p>
      <p className="mt-2 text-[13px] text-muted-foreground">{thread.intel.coaching}</p>
    </div>
  );
}

function DemoSim({
  threadId,
  remaining,
  vehicleStock,
  simText,
  setSimText,
}: {
  threadId: string;
  remaining: boolean;
  vehicleStock: string | null;
  simText: string;
  setSimText: (v: string) => void;
}) {
  const simulateReceive = useApp((s) => s.simulateReceive);
  const markVehicle = useApp((s) => s.markVehicle);
  const staleVehicle = useApp((s) => s.staleVehicle);
  const refreshVehicle = useApp((s) => s.refreshVehicle);
  const vehicles = useApp((s) => s.vehicles);
  const vehicle = findVehicle(vehicles, vehicleStock);

  return (
    <div className="mt-3 rounded-md border border-border p-3">
      <div className="text-[11px] tracking-wide text-muted-foreground uppercase">Demo: simulate customer</div>
      <Textarea
        className="mt-2 min-h-16"
        rows={3}
        value={simText}
        placeholder="What they say next…"
        onChange={(e) => setSimText(e.target.value)}
      />
      <div className="mt-2 flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={!simText.trim()}
          onClick={() => {
            simulateReceive(threadId, simText.trim());
            setSimText("");
            toast("Received. Draft re-checked.");
          }}
        >
          Receive
        </Button>
        {remaining ? (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              simulateReceive(threadId);
              toast("Next scripted line received. Draft re-checked.");
            }}
          >
            Receive next line
          </Button>
        ) : null}
        {vehicle ? (
          <select
            className="h-8 rounded-sm border border-border bg-background px-2 text-xs"
            defaultValue=""
            aria-label="Inventory event"
            onChange={(e) => {
              const val = e.target.value;
              e.currentTarget.value = "";
              if (!val) return;
              if (val === "stale") staleVehicle(vehicle.stock);
              else if (val === "fresh") refreshVehicle(vehicle.stock);
              else markVehicle(vehicle.stock, val as "sold" | "pending" | "available");
              toast("Inventory changed · draft re-checked");
            }}
          >
            <option value="">Inventory event…</option>
            <option value="sold">Mark {vehicle.model} sold</option>
            <option value="pending">Mark pending</option>
            <option value="available">Mark available</option>
            <option value="stale">Make feed stale</option>
            <option value="fresh">Refresh feed</option>
          </select>
        ) : null}
      </div>
    </div>
  );
}
