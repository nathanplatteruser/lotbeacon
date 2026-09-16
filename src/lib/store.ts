import { create } from "zustand";
import { persist } from "zustand/middleware";
import { buildSeed, TEAM } from "./seed";
import { blocked, generateDraft, validateClaims, findVehicle, messengerWindowOpen, followupBlockedCopy, proposeSlots, vetInbound, isDuplicateOutbound, unansweredInbounds, lastOutbound, stripLlmTells, polishOutbound, bandPreference } from "./engine";
import { DEFAULT_ASSUMPTIONS } from "./metrics";
import { AUTO_VOICE_THRESHOLD, detectCustomerVoice, followupText, voiceReasonLine } from "./voices";
import { MIN_EXCHANGES, canCloseThread, effectiveScript, type ThreadLength } from "./thread-length";
import { STORE_SMS, channelClaims, channelOf, customerEmail, shapeForChannel } from "./channels";
import { buildCrmPush } from "./crm";
import { destFor, PACKAGE_AUDIENCE } from "./package";
import { inboundFlags, tempCheck } from "./temp";
import { harvestFacts, mergeFacts } from "./facts";
import type {
  Appointment,
  Assumptions,
  CallOutcome,
  CallRecording,
  Channel,
  CommsPackage,
  CrmPush,
  CrmTrigger,
  Enrollment,
  Intercept,
  PackageAudience,
  Sequence,
  SlotPair,
  Thread,
  Vehicle,
  VoiceId,
} from "./types";

export type SeedShape = ReturnType<typeof buildSeed>;

interface Actions {
  setRep: (id: string) => void;
  selectThread: (id: string | null) => void;
  setDraftText: (threadId: string, text: string) => void;
  setVoice: (threadId: string, voice: VoiceId) => void;
  regenerateDraft: (threadId: string) => void;
  applyGrokDraft: (threadId: string, text: string) => void;
  sendAndNext: (threadId: string) => void;
  bookSlot: (threadId: string, slotId: string) => void;
  closeThread: (threadId: string, kind: "withdrawn" | "ghosted") => void;
  setThreadLength: (id: ThreadLength) => void;
  takeover: (threadId: string) => void;
  setStage: (threadId: string, stage: Thread["stage"]) => void;
  setOutboundChannel: (threadId: string, channel: Channel) => void;
  setDraftSubject: (threadId: string, subject: string) => void;
  logCall: (threadId: string, outcome: CallOutcome) => void;
  pushCrm: (threadId: string, trigger?: CrmTrigger) => void;
  sendPackage: (threadId: string, audience: PackageAudience) => void;
  markPackageOpened: (id: string) => void;
  sendTest: (threadId: string, channel: Channel) => void;
  correctFact: (threadId: string, factId: string, value: string) => void;
  markVehicle: (stock: string, status: Vehicle["status"]) => void;
  staleVehicle: (stock: string) => void;
  refreshVehicle: (stock: string) => void;
  enroll: (threadId: string, sequenceId: string) => void;
  pauseEnrollment: (id: string) => void;
  advanceEnrollment: (id: string) => void;
  logOffline: (threadId: string, channel: string, note?: string) => void;
  startFollowup: (threadId: string) => void;
  stopFollowup: (threadId: string) => void;
  setSlotPair: (threadId: string, pair: SlotPair) => void;
  simulateReceive: (threadId: string, text?: string) => void;
  setAssumptions: (patch: Partial<Assumptions>) => void;
  resetDemo: () => void;
}

export type Store = SeedShape & Actions & { hydrated: boolean; assumptions: Assumptions; threadLength: ThreadLength };

function voiceForThread(t: Thread): { voice: VoiceId; voiceLocked: boolean; voiceReason: string } {
  const lastCustomer = [...t.messages].reverse().find((m) => m.who === "customer");
  const detected = lastCustomer
    ? detectCustomerVoice(lastCustomer.text)
    : { voice: "auto" as VoiceId, confidence: 0, signals: [] as string[] };
  const voiceLocked = t.voiceLocked ?? false;
  if (voiceLocked) {
    return { voice: t.voice, voiceLocked, voiceReason: t.voiceReason || "rep picked this voice" };
  }
  const autoVoice =
    detected.confidence >= AUTO_VOICE_THRESHOLD && detected.voice !== "auto" ? detected.voice : t.voice;
  return {
    voice: autoVoice,
    voiceLocked: false,
    voiceReason: voiceReasonLine({ locked: false, voice: autoVoice, detected }),
  };
}

function hydrateDrafts(threads: Thread[], vehicles: Vehicle[]) {
  return threads.map((t) => {
    const v = voiceForThread(t);
    const next: Thread = {
      ...t,
      ...v,
      followupStage: t.followupStage ?? 0,
      slotPair: t.slotPair ?? "default",
      messages: t.messages.map((m) =>
        m.who === "rep" || m.who === "ai" ? { ...m, text: stripLlmTells(m.text) } : m,
      ),
    };
    return {
      ...next,
      draft: t.draft.text ? t.draft : generateDraft(next, vehicles, next.voice),
    };
  });
}

function applySeed(): SeedShape {
  const s = buildSeed();
  return { ...s, threads: hydrateDrafts(s.threads, s.vehicles) };
}

function recheck(threads: Thread[], vehicles: Vehicle[]) {
  return threads.map((t) => {
    const vehicle = findVehicle(vehicles, t.vehicleStock);
    return { ...t, draft: { ...t.draft, claims: validateClaims(t.draft.text, t, vehicle) } };
  });
}

function applyInbound(s: { threads: Thread[]; vehicles: Vehicle[]; intercepts?: Intercept[] }, threadId: string, text: string, bumpCursor: boolean) {
  const now = new Date().toISOString();
  let intercept: Intercept | null = null;
  const threads = s.threads.map((x) => {
    if (x.id !== threadId) return x;
    const next: Thread = {
      ...x,
      demoCursor: bumpCursor ? x.demoCursor + 1 : x.demoCursor,
      lastInboundAt: now,
      lastActivityAt: now,
      followupStage: 0,
      ghostUntil: null,
      messages: [
        ...x.messages,
        {
          id: `sim_${Date.now()}`,
          at: now,
          who: "customer",
          sender: x.customerName,
          channel: x.channel,
          text,
        },
      ],
    };
    const vehicle = findVehicle(s.vehicles, next.vehicleStock);
    const inbound = vetInbound(text, next, vehicle);
    if (inbound.length) {
      intercept = {
        id: `int_in_${Date.now()}`,
        threadId,
        customerName: next.customerName,
        at: now,
        kind: "inbound_flagged",
        channel: next.channel,
        quote: text.slice(0, 180),
        sticker: vehicle ? `${vehicle.year} ${vehicle.model} · $${vehicle.price.toLocaleString()}` : undefined,
        reason: inbound[0]!.reason,
        savedMinutes: 20,
        status: "held",
        repId: next.assignedRepId,
      };
    }
    const harvested = harvestFacts(text);
    const facts = mergeFacts(next.facts, harvested);
    const pref = bandPreference(text);
    return {
      ...next,
      facts,
      slotPair: pref ?? next.slotPair,
      draft: generateDraft({ ...next, facts, slotPair: pref ?? next.slotPair }, s.vehicles, next.voice),
    };
  });
  return {
    threads,
    intercepts: intercept ? [intercept, ...(s.intercepts ?? [])] : s.intercepts,
  };
}

function queueCrm(s: Store, thread: Thread, trigger: CrmTrigger, note?: string): { crmPushes: CrmPush[]; queuedId: string | null } {
  const dup = s.crmPushes.some(
    (p) => p.threadId === thread.id && p.trigger === trigger && (p.status === "queued" || p.status === "sent" || p.status === "acked"),
  );
  if (dup && trigger !== "manual") return { crmPushes: s.crmPushes, queuedId: null };
  const push = buildCrmPush({
    thread,
    vehicle: findVehicle(s.vehicles, thread.vehicleStock),
    trigger,
    status: "queued",
    note,
    repName: TEAM.find((r) => r.id === s.currentRepId)?.name,
  });
  return { crmPushes: [...s.crmPushes, push], queuedId: push.id };
}

function scheduleCrm(id: string | null) {
  if (!id || typeof window === "undefined") return;
  window.setTimeout(() => {
    useApp.setState((s) => ({
      crmPushes: s.crmPushes.map((p) =>
        p.id === id && p.status === "queued" ? { ...p, status: "sent" as const, at: new Date().toISOString() } : p,
      ),
    }));
  }, 700);
  window.setTimeout(() => {
    useApp.setState((s) => ({
      crmPushes: s.crmPushes.map((p) =>
        p.id === id && p.status === "sent" ? { ...p, status: "acked" as const } : p,
      ),
    }));
  }, 1600);
}

export const useApp = create<Store>()(
  persist(
    (set) => ({
      ...applySeed(),
      assumptions: DEFAULT_ASSUMPTIONS,
      threadLength: "medium" as ThreadLength,
      hydrated: false,
      setRep: (id) => set({ currentRepId: id }),
      selectThread: (id) => set({ selectedThreadId: id }),
      setDraftText: (threadId, text) =>
        set((s) => ({
          threads: s.threads.map((t) => {
            if (t.id !== threadId) return t;
            const vehicle = findVehicle(s.vehicles, t.vehicleStock);
            const claims = [...validateClaims(text, t, vehicle), ...channelClaims(t, channelOf(t), text)];
            return { ...t, draft: { ...t.draft, text, claims, producer: "rep" } };
          }),
        })),
      setVoice: (threadId, voice) =>
        set((s) => ({
          threads: s.threads.map((t) => {
            if (t.id !== threadId) return t;
            const lastCustomer = [...t.messages].reverse().find((m) => m.who === "customer");
            const detected = lastCustomer
              ? detectCustomerVoice(lastCustomer.text)
              : { voice: "auto" as VoiceId, confidence: 0, signals: [] as string[] };
            const locked = voice !== "auto";
            const resolved: VoiceId =
              voice === "auto"
                ? detected.confidence >= AUTO_VOICE_THRESHOLD && detected.voice !== "auto"
                  ? detected.voice
                  : "auto"
                : voice;
            const next: Thread = {
              ...t,
              voice: resolved,
              voiceLocked: locked,
              voiceReason: locked
                ? "rep picked this voice"
                : voiceReasonLine({ locked: false, voice: resolved, detected }),
            };
            return { ...next, draft: generateDraft(next, s.vehicles, next.voice) };
          }),
        })),
      regenerateDraft: (threadId) =>
        set((s) => ({
          threads: s.threads.map((t) =>
            t.id === threadId ? { ...t, draft: generateDraft(t, s.vehicles, t.voice) } : t,
          ),
        })),
      applyGrokDraft: (threadId, text) =>
        set((s) => ({
          threads: s.threads.map((t) => {
            if (t.id !== threadId) return t;
            const cleaned = polishOutbound(text, t, t.draft.slots.length ? t.draft.slots : proposeSlots(t));
            const vehicle = findVehicle(s.vehicles, t.vehicleStock);
            const claims = validateClaims(cleaned, t, vehicle);
            const ch = channelOf(t);
            const shaped = shapeForChannel(cleaned, t, ch, t.draft.slots);
            return {
              ...t,
              draft: {
                ...t.draft,
                ...shaped,
                claims: [...claims, ...channelClaims(t, ch, shaped.text)],
                producer: "grok",
              },
            };
          }),
        })),
      sendAndNext: (threadId) => {
        let queuedId: string | null = null;
        set((s) => {
          const t = s.threads.find((x) => x.id === threadId);
          if (!t) return s;
          if (t.stage === "lost" || t.stage === "sold" || t.stage === "visit") return s;
          if (isDuplicateOutbound(t, t.draft.text)) return s;
          if (blocked(t.draft, t)) {
            const claim = t.draft.claims.find((c) => c.severity === "block");
            const intercept: Intercept = {
              id: `int_${Date.now()}`,
              threadId,
              customerName: t.customerName,
              at: new Date().toISOString(),
              kind: "outbound_blocked",
              channel: channelOf(t),
              quote: t.draft.text.slice(0, 180),
              reason: claim?.reason ?? "Firewall held this send.",
              savedMinutes: 12,
              status: "held",
              repId: s.currentRepId,
            };
            return { intercepts: [intercept, ...s.intercepts] };
          }
          const now = new Date().toISOString();
          const ch = channelOf(t);
          if (ch === "phone") return s;
          const outbound = {
            id: `out_${Date.now()}`,
            at: now,
            who: "rep" as const,
            sender: TEAM.find((r) => r.id === s.currentRepId)?.name ?? "Rep",
            channel: ch,
            text: polishOutbound(t.draft.text, t, t.draft.slots),
            subject: ch === "email" ? t.draft.subject ?? t.emailSubject : undefined,
          };
          const nextThread: Thread = {
            ...t,
            messages: [...t.messages, outbound],
            lastActivityAt: now,
            takeover: t.takeover,
          };

          const script = effectiveScript(t.demoScript, s.threadLength);
          const step = script[t.demoCursor];
          let ghostUntil = t.ghostUntil ?? null;
          let demoCursor = t.demoCursor;
          let stage = t.stage;
          const extra: Thread["messages"] = [];
          const min = MIN_EXCHANGES[s.threadLength];

          if (typeof step === "string" && demoCursor < min) {
            const replyAt = new Date(Date.now() + 600).toISOString();
            extra.push({
              id: `in_${Date.now()}`,
              at: replyAt,
              who: "customer",
              sender: t.customerName,
              channel: ch === "email" || ch === "sms" ? ch : t.channel,
              text: step,
            });
            demoCursor += 1;
            nextThread.lastInboundAt = replyAt;
            nextThread.lastActivityAt = replyAt;
            if (demoCursor >= min && /i'll be there|see you|i'll come|10:00 saturday/i.test(step)) {
              if (stage === "engage" || stage === "qualify" || stage === "book") stage = "book";
            }
          }

          const merged: Thread = {
            ...nextThread,
            messages: [...nextThread.messages, ...extra],
            demoCursor,
            ghostUntil,
            stage,
            followupStage: extra.some((m) => m.who === "customer") ? 0 : nextThread.followupStage,
          };
          const inbound = extra[extra.length - 1];
          if (inbound) {
            const pref = bandPreference(inbound.text);
            if (pref) merged.slotPair = pref;
            merged.facts = mergeFacts(merged.facts, harvestFacts(inbound.text));
            const latest = inboundFlags(inbound.text);
            if (latest.band === "hot" || latest.band === "green" || latest.fears.length) {
              const kind: "commit" | "risk" | "objection" =
                latest.band === "green" || latest.commit || latest.recover
                  ? "commit"
                  : latest.band === "hot"
                    ? "risk"
                    : "objection";
              const temp = tempCheck(merged, inbound.text, findVehicle(s.vehicles, merged.vehicleStock));
              merged.intel = {
                ...merged.intel,
                moments: [
                  ...merged.intel.moments,
                  { at: inbound.at, label: temp.why, kind, quote: inbound.text.slice(0, 120) },
                ].slice(-8),
                sentiment: latest.band === "hot" ? "negative" : latest.band === "green" ? "positive" : merged.intel.sentiment,
              };
            }
          }
          merged.draft = generateDraft(merged, s.vehicles, merged.voice);

          const threads = s.threads.map((x) => (x.id === threadId ? merged : x));
          const crm = queueCrm(s, merged, "first_contact", `First ${ch} send. Human approved.`);
          queuedId = crm.queuedId;
          return { threads, selectedThreadId: threadId, crmPushes: crm.crmPushes };
        });
        scheduleCrm(queuedId);
      },
      bookSlot: (threadId, slotId) => {
        let queuedId: string | null = null;
        set((s) => {
          const t = s.threads.find((x) => x.id === threadId);
          if (!t) return s;
          if (!canCloseThread(t, s.threadLength)) return s;
          const slot = t.draft.slots.find((sl) => sl.id === slotId) ?? t.draft.slots[0];
          if (!slot) return s;
          const apptId = t.appointmentId ?? `a_${threadId}`;
          const appt: Appointment = {
            id: apptId,
            threadId,
            vehicleStock: t.vehicleStock,
            at: slot.at,
            status: "confirmed",
            type: "test_drive",
            setterId: s.currentRepId,
            closerId: t.assignedRepId,
            notes: `Booked ${slot.label} from inbox.`,
          };
          const now = new Date().toISOString();
          const ch = channelOf(t);
          const confirm = {
            id: `out_book_${Date.now()}`,
            at: now,
            who: "rep" as const,
            sender: TEAM.find((r) => r.id === s.currentRepId)?.name ?? "Rep",
            channel: ch === "phone" ? "sms" : ch,
            text: `You're on the books for ${slot.label}. I'll have the vehicle pulled. See you then.`,
          };
          let booked: Thread | null = null;
          const threads = s.threads.map((x) => {
            if (x.id !== threadId) return x;
            const next: Thread = {
              ...x,
              appointmentId: apptId,
              stage: "visit",
              missing: "day-of reminder",
              goal: `Show ${slot.label}`,
              messages: [...x.messages, confirm],
              lastActivityAt: now,
              facts: x.facts.map((f) =>
                f.key === "timing" ? { ...f, value: slot.label, certainty: "confirmed" } : f,
              ),
            };
            next.draft = generateDraft(next, s.vehicles, next.voice);
            booked = next;
            return next;
          });
          const existing = s.appointments.some((a) => a.id === apptId);
          const appointments = existing
            ? s.appointments.map((a) => (a.id === apptId ? appt : a))
            : [...s.appointments, appt];
          const crm = booked ? queueCrm(s, booked, "book", `Booked ${slot.label}. ADF to the desk log.`) : { crmPushes: s.crmPushes, queuedId: null };
          queuedId = crm.queuedId;
          return { threads, appointments, crmPushes: crm.crmPushes };
        });
        scheduleCrm(queuedId);
      },
      closeThread: (threadId, kind) =>
        set((s) => {
          const t = s.threads.find((x) => x.id === threadId);
          if (!t) return s;
          if (!canCloseThread(t, s.threadLength)) return s;
          const now = new Date().toISOString();
          const note =
            kind === "withdrawn"
              ? `${t.customerName} will not come in. Thread closed.`
              : `${t.customerName} went silent. Thread closed.`;
          return {
            threads: s.threads.map((x) => {
              if (x.id !== threadId) return x;
              return {
                ...x,
                stage: "lost" as const,
                goal: kind === "withdrawn" ? "Closed · will not come in" : "Closed · ghosted",
                missing: "closed",
                lastActivityAt: now,
                messages: [
                  ...x.messages,
                  {
                    id: `sys_close_${Date.now()}`,
                    at: now,
                    who: "system" as const,
                    sender: "LotBeacon",
                    channel: x.channel,
                    text: note,
                  },
                ],
              };
            }),
          };
        }),
      setThreadLength: (id) =>
        set((s) => ({
          ...applySeed(),
          selectedThreadId: "t_sarah",
          assumptions: s.assumptions,
          threadLength: id,
          hydrated: true,
        })),
      takeover: (threadId) =>
        set((s) => ({
          threads: s.threads.map((t) =>
            t.id === threadId ? { ...t, takeover: !t.takeover } : t,
          ),
        })),
      setStage: (threadId, stage) => {
        let queuedId: string | null = null;
        set((s) => {
          const t = s.threads.find((x) => x.id === threadId);
          const threads = s.threads.map((x) => (x.id === threadId ? { ...x, stage } : x));
          if (!t || (stage !== "sold" && stage !== "visit")) return { threads };
          const trigger = stage === "sold" ? "sold" : "book";
          if (stage === "visit" && s.crmPushes.some((p) => p.threadId === threadId && p.trigger === "book")) {
            return { threads };
          }
          const next = threads.find((x) => x.id === threadId) ?? t;
          const crm = queueCrm({ ...s, threads }, next, trigger as CrmTrigger);
          queuedId = crm.queuedId;
          return { threads, crmPushes: crm.crmPushes };
        });
        scheduleCrm(queuedId);
      },
      setOutboundChannel: (threadId, channel) =>
        set((s) => ({
          threads: s.threads.map((t) => {
            if (t.id !== threadId) return t;
            const next: Thread = { ...t, outboundChannel: channel };
            const draft = generateDraft(next, s.vehicles, next.voice);
            if (t.draft.producer === "rep" && t.draft.text) {
              const shaped = shapeForChannel(t.draft.text, next, channel, draft.slots);
              const vehicle = findVehicle(s.vehicles, t.vehicleStock);
              return {
                ...next,
                draft: {
                  ...draft,
                  ...shaped,
                  claims: [...validateClaims(shaped.text, next, vehicle), ...channelClaims(next, channel, shaped.text)],
                  producer: "rep" as const,
                },
              };
            }
            return { ...next, draft };
          }),
        })),
      setDraftSubject: (threadId, subject) =>
        set((s) => ({
          threads: s.threads.map((t) =>
            t.id === threadId
              ? { ...t, emailSubject: subject, draft: { ...t.draft, subject, producer: "rep" as const } }
              : t,
          ),
        })),
      logCall: (threadId, outcome) => {
        let queuedId: string | null = null;
        set((s) => {
          const t = s.threads.find((x) => x.id === threadId);
          if (!t || t.dnc) return s;
          const now = new Date().toISOString();
          const label =
            outcome === "reached"
              ? "Reached. Talking points used. You hung up. ADF queued."
              : outcome === "voicemail"
                ? "Voicemail. No essay. One callback window."
                : outcome === "busy"
                  ? "Busy. Try SMS while the line is hot."
                  : "No answer. Do not auto-dial again.";
          const next: Thread = {
            ...t,
            callPlacedAt: now,
            lastActivityAt: now,
            messages: [
              ...t.messages,
              {
                id: `call_${Date.now()}`,
                at: now,
                who: "system",
                sender: TEAM.find((r) => r.id === s.currentRepId)?.name ?? "Rep",
                channel: "phone",
                text: `Call logged · ${outcome.replace("_", " ")}. ${label}`,
              },
            ],
          };
          next.draft = generateDraft(next, s.vehicles, next.voice);
          const threads = s.threads.map((x) => (x.id === threadId ? next : x));
          const crm =
            outcome === "reached"
              ? queueCrm(s, next, "first_contact", "Call reached. ADF from the desk, not a bot.")
              : { crmPushes: s.crmPushes, queuedId: null };
          queuedId = crm.queuedId;
          return { threads, crmPushes: crm.crmPushes };
        });
        scheduleCrm(queuedId);
      },
      pushCrm: (threadId, trigger = "manual") => {
        let queuedId: string | null = null;
        set((s) => {
          const t = s.threads.find((x) => x.id === threadId);
          if (!t) return s;
          const crm = queueCrm(s, t, trigger, "Manual ADF push. Human clicked it.");
          queuedId = crm.queuedId;
          const now = new Date().toISOString();
          const threads = s.threads.map((x) =>
            x.id === threadId
              ? {
                  ...x,
                  lastActivityAt: now,
                  messages: [
                    ...x.messages,
                    {
                      id: `crm_sys_${Date.now()}`,
                      at: now,
                      who: "system" as const,
                      sender: "LotBeacon",
                      channel: x.channel,
                      text: `ADF queued to ${x.customerName}'s prospect. Human Send still owns the conversation.`,
                    },
                  ],
                }
              : x,
          );
          return { threads, crmPushes: crm.crmPushes };
        });
        scheduleCrm(queuedId);
      },
      sendPackage: (threadId, audience) =>
        set((s) => {
          const t = s.threads.find((x) => x.id === threadId);
          const dest = destFor(audience);
          if (!t || !dest) return s;
          const now = new Date().toISOString();
          const from = TEAM.find((r) => r.id === s.currentRepId);
          const meta = PACKAGE_AUDIENCE[audience];
          const pkg: CommsPackage = {
            id: `pkg_${audience}_${threadId}_${Date.now()}`,
            threadId,
            audience,
            toRepId: dest.id,
            fromRepId: s.currentRepId,
            status: "sent",
            sentAt: now,
            note:
              audience === "finance"
                ? `F&I brief · ${t.customerName}. No payment in-thread.`
                : `Closer brief · ${t.customerName}. Live movement.`,
          };
          return {
            packages: [...s.packages, pkg],
            threads: s.threads.map((x) =>
              x.id === threadId
                ? {
                    ...x,
                    lastActivityAt: now,
                    messages: [
                      ...x.messages,
                      {
                        id: `pkg_sys_${Date.now()}`,
                        at: now,
                        who: "system" as const,
                        sender: from?.name ?? "Desk",
                        channel: x.channel,
                        text: `Comms package sent to ${dest.name} · ${dest.title}. One-page ${meta.short} brief. A person clicked it.`,
                      },
                    ],
                  }
                : x,
            ),
          };
        }),
      markPackageOpened: (id) =>
        set((s) => ({
          packages: s.packages.map((p) =>
            p.id === id && p.status === "sent"
              ? { ...p, status: "opened" as const, openedAt: new Date().toISOString() }
              : p,
          ),
        })),
      sendTest: (threadId, channel) =>
        set((s) => {
          const t = s.threads.find((x) => x.id === threadId);
          if (!t || t.dnc) return s;
          const now = new Date().toISOString();
          const dest =
            channel === "email"
              ? customerEmail(t)
              : channel === "phone" || channel === "sms"
                ? t.phone
                : "Messenger thread";
          const line =
            channel === "sms"
              ? `Test SMS · store 10DLC ${STORE_SMS} → ${dest}. Delivered to the device. Not a personal cell. Demo carrier.`
              : channel === "email"
                ? `Test email → ${dest}. Landed in the inbox. Store signature. Demo mailer.`
                : channel === "phone"
                  ? `Test call · store line ${STORE_SMS} rang ${dest} once. You still dial live. Demo ring.`
                  : `Test Messenger ping on this synthetic thread. Human Send still required for the real conversation.`;
          return {
            threads: s.threads.map((x) =>
              x.id === threadId
                ? {
                    ...x,
                    lastActivityAt: now,
                    messages: [
                      ...x.messages,
                      {
                        id: `test_${Date.now()}`,
                        at: now,
                        who: "system" as const,
                        sender: "LotBeacon",
                        channel,
                        text: line,
                      },
                    ],
                  }
                : x,
            ),
          };
        }),
      correctFact: (threadId, factId, value) =>
        set((s) => ({
          threads: s.threads.map((t) =>
            t.id === threadId
              ? {
                  ...t,
                  facts: t.facts.map((f) =>
                    f.id === factId ? { ...f, value, corrected: true, certainty: "confirmed" as const } : f,
                  ),
                }
              : t,
          ),
        })),
      markVehicle: (stock, status) =>
        set((s) => {
          const vehicles = s.vehicles.map((v) => (v.stock === stock ? { ...v, status } : v));
          return { vehicles, threads: recheck(s.threads, vehicles) };
        }),
      staleVehicle: (stock) =>
        set((s) => {
          const vehicles = s.vehicles.map((v) =>
            v.stock === stock ? { ...v, retrievedAt: new Date(Date.now() - 2 * 60 * 60_000).toISOString() } : v,
          );
          return { vehicles, threads: recheck(s.threads, vehicles) };
        }),
      refreshVehicle: (stock) =>
        set((s) => {
          const vehicles = s.vehicles.map((v) =>
            v.stock === stock ? { ...v, retrievedAt: new Date().toISOString() } : v,
          );
          return { vehicles, threads: recheck(s.threads, vehicles) };
        }),
      enroll: (threadId, sequenceId) =>
        set((s) => {
          const id = `e_${threadId}_${sequenceId}`;
          const enrollment: Enrollment = {
            id,
            sequenceId,
            threadId,
            status: "active",
            stepIndex: 0,
            enrolledAt: new Date().toISOString(),
            nextAt: new Date(Date.now() + 30 * 60_000).toISOString(),
          };
          return {
            enrollments: [...s.enrollments.filter((e) => e.threadId !== threadId), enrollment],
            threads: s.threads.map((t) =>
              t.id === threadId ? { ...t, sequenceEnrollmentId: id } : t,
            ),
          };
        }),
      pauseEnrollment: (id) =>
        set((s) => ({
          enrollments: s.enrollments.map((e) =>
            e.id === id ? { ...e, status: e.status === "paused" ? "active" : "paused" } : e,
          ),
        })),
      advanceEnrollment: (id) =>
        set((s) => ({
          enrollments: s.enrollments.map((e) => {
            if (e.id !== id) return e;
            const seq = s.sequences.find((q) => q.id === e.sequenceId);
            const next = e.stepIndex + 1;
            if (!seq || next >= seq.steps.length) return { ...e, status: "finished", stepIndex: next };
            return { ...e, stepIndex: next, nextAt: new Date(Date.now() + 60 * 60_000).toISOString() };
          }),
        })),
      logOffline: (threadId, channel, note) =>
        set((s) => ({
          threads: s.threads.map((t) =>
            t.id === threadId
              ? {
                  ...t,
                  ghostUntil: null,
                  followupStage: 0,
                  messages: [
                    ...t.messages,
                    {
                      id: `off_${Date.now()}`,
                      at: new Date().toISOString(),
                      who: "system" as const,
                      sender: "LotBeacon",
                      channel: t.channel,
                      text: note
                        ? `Offline touch logged: ${channel} — ${note}`
                        : `Offline touch logged: ${channel}.`,
                    },
                  ],
                }
              : t,
          ),
        })),

      simulateReceive: (threadId, text) =>
        set((s) => {
          const t = s.threads.find((x) => x.id === threadId);
          if (!t) return s;
          if (text?.trim()) return applyInbound(s, threadId, text.trim(), false);
          const script = effectiveScript(t.demoScript, s.threadLength);
          const step = script[t.demoCursor];
          if (typeof step === "string") return applyInbound(s, threadId, step, true);
          return s;
        }),
      startFollowup: (threadId) =>
        set((s) => ({
          threads: s.threads.map((t) => {
            if (t.id !== threadId) return t;
            const stage = Math.min((t.followupStage ?? 0) + 1, 3);
            const open = messengerWindowOpen(t);
            if (!open) {
              return {
                ...t,
                followupStage: stage,
                draft: {
                  ...t.draft,
                  text: "",
                  claims: [
                    {
                      text: "follow-up",
                      severity: "block" as const,
                      reason: followupBlockedCopy(),
                    },
                  ],
                  slots: [],
                  producer: "rules" as const,
                },
              };
            }
            const text = followupText(stage, t.customerName);
            const vehicle = findVehicle(s.vehicles, t.vehicleStock);
            return {
              ...t,
              followupStage: stage,
              draft: {
                text,
                voice: t.voice,
                claims: validateClaims(text, t, vehicle),
                slots: [],
                producer: "rules" as const,
              },
            };
          }),
        })),
      stopFollowup: (threadId) =>
        set((s) => ({
          threads: s.threads.map((t) => {
            if (t.id !== threadId) return t;
            const next = { ...t, followupStage: 0 };
            return { ...next, draft: generateDraft(next, s.vehicles, next.voice) };
          }),
        })),
      setSlotPair: (threadId, pair) =>
        set((s) => ({
          threads: s.threads.map((t) => {
            if (t.id !== threadId) return t;
            const next: Thread = { ...t, slotPair: pair };
            const draft = generateDraft(next, s.vehicles, next.voice);
            draft.slots = proposeSlots(next, pair);
            return { ...next, draft };
          }),
        })),
      setAssumptions: (patch) =>
        set((s) => ({
          assumptions: { ...s.assumptions, ...patch },
        })),
      resetDemo: () =>
        set((s) => ({ ...applySeed(), selectedThreadId: "t_riley", assumptions: DEFAULT_ASSUMPTIONS, threadLength: s.threadLength })),
    }),
    {
      name: "lotbeacon-g2-v13",
      partialize: (s) => ({
        currentRepId: s.currentRepId,
        selectedThreadId: s.selectedThreadId,
        vehicles: s.vehicles,
        threads: s.threads,
        appointments: s.appointments,
        sequences: s.sequences as Sequence[],
        enrollments: s.enrollments,
        calls: s.calls as CallRecording[],
        crmPushes: s.crmPushes as CrmPush[],
        packages: s.packages as CommsPackage[],
        intercepts: s.intercepts as Intercept[],
        version: s.version,
        assumptions: s.assumptions,
        threadLength: s.threadLength,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        if (state.version !== 13) {
          const fresh = applySeed();
          Object.assign(state, fresh);
        }
        if (!state.assumptions) state.assumptions = DEFAULT_ASSUMPTIONS;
        if (!state.threadLength) state.threadLength = "medium";
        if (!state.crmPushes) state.crmPushes = [];
        if (!state.packages) state.packages = [];
        if (!state.intercepts) state.intercepts = [];
        state.threads = (state.threads ?? []).map((t) => {
          const unanswered = unansweredInbounds(t);
          const sent = lastOutbound(t);
          const dup = isDuplicateOutbound(t, t.draft.text);
          if (unanswered.length && (dup || !t.draft.text)) {
            return { ...t, draft: generateDraft(t, state.vehicles, t.voice) };
          }
          if (sent && !unanswered.length && dup) {
            return { ...t, draft: generateDraft(t, state.vehicles, t.voice) };
          }
          const vehicle = findVehicle(state.vehicles, t.vehicleStock);
          const claims = [...validateClaims(t.draft.text, t, vehicle), ...channelClaims(t, channelOf(t), t.draft.text)];
          return { ...t, draft: { ...t.draft, claims } };
        });
        state.hydrated = true;
      },
    },
  ),
);

export function useCurrentRep() {
  return useApp((s) => TEAM.find((r) => r.id === s.currentRepId) ?? TEAM[0]);
}

export { TEAM };
