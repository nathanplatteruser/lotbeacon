import { Mail, MessageCircle, Phone, Smartphone } from "lucide-react";
import type { CallOutcome, Channel, Thread } from "@/lib/types";
import { CHANNEL_META, COMPOSE_CHANNELS, STORE_SMS, channelOf, customerEmail, firstSmsOutbound, inQuietHours, smsConsentWarn, smsUnits } from "@/lib/channels";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const ICONS: Record<(typeof COMPOSE_CHANNELS)[number], typeof MessageCircle> = {
  messenger: MessageCircle,
  sms: Smartphone,
  email: Mail,
  phone: Phone,
};

const CALL_OUTCOMES: { id: CallOutcome; label: string }[] = [
  { id: "reached", label: "Reached" },
  { id: "voicemail", label: "Voicemail" },
  { id: "no_answer", label: "No answer" },
  { id: "busy", label: "Busy" },
];

export function ChannelSwitcher({
  thread,
  onPick,
}: {
  thread: Thread;
  onPick: (channel: Channel) => void;
}) {
  const current = channelOf(thread);
  return (
    <div>
      <div className="flex flex-wrap gap-1" role="tablist" aria-label="Send on">
        {COMPOSE_CHANNELS.map((ch) => {
          const Icon = ICONS[ch];
          const on = current === ch;
          return (
            <button
              key={ch}
              type="button"
              role="tab"
              aria-selected={on}
              id={`channel-${ch}`}
              onClick={() => onPick(ch)}
              className={cn(
                "inline-flex h-11 min-w-11 items-center gap-1.5 rounded-md border px-3 text-sm",
                on ? "border-paper bg-paper text-ink" : "border-border bg-background text-muted-foreground",
              )}
            >
              <Icon className="size-3.5" />
              {CHANNEL_META[ch].short}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-[12px] text-muted-foreground">{CHANNEL_META[current].hint}</p>
    </div>
  );
}

export function TestSend({
  channel,
  onSend,
  disabled,
}: {
  channel: Channel;
  onSend: () => void;
  disabled?: boolean;
}) {
  const label =
    channel === "sms"
      ? "Send test SMS"
      : channel === "email"
        ? "Send test email"
        : channel === "phone"
          ? "Place test call"
          : "Send test ping";
  return (
    <Button id="test-send" size="sm" variant="ghost" disabled={disabled} onClick={onSend}>
      {label}
    </Button>
  );
}

export function ChannelFields({
  thread,
  onSubject,
}: {
  thread: Thread;
  onSubject: (subject: string) => void;
}) {
  const ch = channelOf(thread);
  if (ch === "email") {
    return (
      <div className="mt-3 space-y-2">
        <label className="block text-[11px] tracking-wide text-muted-foreground uppercase">
          To · {customerEmail(thread)}
        </label>
        <Input
          id="draft-subject"
          value={thread.draft.subject ?? thread.emailSubject ?? ""}
          onChange={(e) => onSubject(e.target.value)}
          placeholder="Subject"
          aria-label="Email subject"
        />
      </div>
    );
  }
  if (ch === "sms") {
    const units = smsUnits(thread.draft.text);
    const consent = smsConsentWarn(thread);
    const quiet = inQuietHours();
    return (
      <div className="mt-3 space-y-1 text-[12px] text-muted-foreground">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span>
            Store 10DLC · {STORE_SMS}
            {firstSmsOutbound(thread) ? " · first outbound" : ""}
          </span>
          <span className="tabular">
            {units.len}/{units.cap} · {units.segments} segment{units.segments === 1 ? "" : "s"}
          </span>
        </div>
        {consent ? <p className="text-warn">{consent}</p> : null}
        {quiet ? <p className="text-warn">Quiet hours (9 pm–8 am Central). TCPA. You can still send.</p> : null}
      </div>
    );
  }
  if (ch === "phone") {
    const points = thread.draft.talkingPoints ?? [];
    return (
      <div className="mt-3 rounded-md border border-border bg-background px-3 py-2">
        <p className="text-[11px] tracking-wide text-muted-foreground uppercase">Talking points · you dial</p>
        <ol className="mt-2 space-y-1.5 text-[13px] leading-relaxed">
          {points.map((p, i) => (
            <li key={i} className="grid grid-cols-[1.25rem_1fr] gap-1">
              <span className="tabular text-muted-foreground">{i + 1}.</span>
              <span>{p}</span>
            </li>
          ))}
        </ol>
      </div>
    );
  }
  return null;
}

export function CallOutcomes({
  onLog,
  disabled,
}: {
  onLog: (outcome: CallOutcome) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {CALL_OUTCOMES.map((o) => (
        <Button key={o.id} id={`call-${o.id}`} size="sm" variant={o.id === "reached" ? "default" : "outline"} disabled={disabled} onClick={() => onLog(o.id)}>
          {o.label}
        </Button>
      ))}
    </div>
  );
}
