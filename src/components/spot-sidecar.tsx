import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Ban,
  Copy,
  Crosshair,
  Keyboard,
  Scan,
  Send,
  ShieldOff,
} from "lucide-react";
import { toast } from "sonner";
import {
  SPOT_CLAIMS,
  SPOT_CONFIRM,
  SPOT_CUSTOMER,
  SPOT_DRAFT,
  SPOT_INBOUND,
  SPOT_REPLY,
} from "@/lib/spot";
import { lookById, type SpotLookId } from "@/lib/spot-looks";
import { firstTypeFormBlockReason } from "@/lib/type-form";
import type { Slot, Vehicle } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type Msg = { id: string; who: "customer" | "rep" | "system"; text: string };
type AbortKind = "autotype" | "autosend" | "stealth" | null;
type SpotKey = "inbound" | "composer" | "send";

const SPOT_TYPE_FORM_VEHICLE: Vehicle = {
  stock: SPOT_CUSTOMER.stock,
  vin: "1FM5K8GC0TGA00001",
  year: 2026,
  make: "Ford",
  model: "Explorer",
  trim: "Platinum",
  color: "Black",
  body: "SUV",
  miles: 1840,
  price: 57990,
  status: "available",
  drivetrain: "4WD",
};

const SPOT_TYPE_FORM_SLOTS: Slot[] = [
  { id: "spot-1", at: new Date().toISOString(), label: "Saturday 10:00 AM" },
  { id: "spot-2", at: new Date().toISOString(), label: "Saturday 11:30 AM" },
];

export function SpotSidecar({ look = "now" }: { look?: SpotLookId }) {
  const spec = lookById(look);
  const [messages, setMessages] = useState<Msg[]>([
    { id: "m1", who: "customer", text: SPOT_INBOUND },
  ]);
  const [composer, setComposer] = useState("");
  const [spotted, setSpotted] = useState<Record<SpotKey, boolean>>({
    inbound: false,
    composer: false,
    send: false,
  });
  const [scanning, setScanning] = useState(false);
  const [ready, setReady] = useState(false);
  const [abort, setAbort] = useState<AbortKind>(null);
  const [sent, setSent] = useState(false);
  const [booked, setBooked] = useState(false);
  const typingRef = useRef<number | null>(null);
  const scanRef = useRef<number[]>([]);

  const draft = booked ? "" : sent ? SPOT_CONFIRM : SPOT_DRAFT;

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    runScan(reduce);
    return () => {
      scanRef.current.forEach((id) => window.clearTimeout(id));
      if (typingRef.current) window.clearInterval(typingRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [look]);

  function runScan(instant: boolean) {
    scanRef.current.forEach((id) => window.clearTimeout(id));
    scanRef.current = [];
    setScanning(true);
    setReady(false);
    setAbort(null);
    setSpotted({ inbound: false, composer: false, send: false });
    const mark = (key: SpotKey, delay: number) => {
      const id = window.setTimeout(() => {
        setSpotted((s) => ({ ...s, [key]: true }));
      }, delay);
      scanRef.current.push(id);
    };
    if (instant) {
      setSpotted({ inbound: true, composer: true, send: true });
      setScanning(false);
      setReady(true);
      return;
    }
    mark("inbound", 280);
    mark("composer", 720);
    mark("send", 1100);
    const done = window.setTimeout(() => {
      setScanning(false);
      setReady(true);
    }, 1400);
    scanRef.current.push(done);
  }

  async function copyDraft() {
    if (!draft) return;
    try {
      await navigator.clipboard.writeText(draft);
      toast("Draft copied. Paste is yours.");
    } catch {
      toast("Clipboard blocked in this preview — use Paste into composer.");
    }
  }

  function pasteDraft() {
    if (!draft) return;
    setComposer(draft);
    setAbort(null);
    toast("Pasted by you. Send is still yours.");
  }

  function refuseAutoType() {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (typingRef.current) window.clearInterval(typingRef.current);
    if (reduce || !draft) {
      setComposer("");
      setAbort("autotype");
      return;
    }
    const snippet = draft.slice(0, 5);
    let i = 0;
    setComposer("");
    typingRef.current = window.setInterval(() => {
      i += 1;
      setComposer(snippet.slice(0, i));
      if (i >= snippet.length) {
        if (typingRef.current) window.clearInterval(typingRef.current);
        typingRef.current = null;
        setComposer("");
        setAbort("autotype");
      }
    }, 70);
  }

  function humanSend() {
    const text = composer.trim();
    if (!text) return;
    const blockedReason = firstTypeFormBlockReason({
      text,
      thread: { dnc: false },
      vehicle: SPOT_TYPE_FORM_VEHICLE,
      slots: SPOT_TYPE_FORM_SLOTS,
    });
    if (blockedReason) {
      toast(blockedReason);
      return;
    }
    const next: Msg[] = [...messages, { id: `r-${messages.length}`, who: "rep", text }];
    if (!sent) {
      next.push({ id: "sys-1", who: "system", text: "Sent by Jordan Hale · 0 auto-typed · 0 autonomous" });
      next.push({ id: "c-2", who: "customer", text: SPOT_REPLY });
      setSent(true);
    } else {
      next.push({ id: "sys-2", who: "system", text: "Booked Saturday 10:00 · human Send · claim firewall held" });
      setBooked(true);
    }
    setMessages(next);
    setComposer("");
    setAbort(null);
    toast(booked || sent ? "Saturday 10:00 is on the book." : "Sarah has the two slots. She answered.");
  }

  function resetScene() {
    if (typingRef.current) window.clearInterval(typingRef.current);
    setMessages([{ id: "m1", who: "customer", text: SPOT_INBOUND }]);
    setComposer("");
    setAbort(null);
    setSent(false);
    setBooked(false);
    runScan(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }

  return (
    <div className="spot-shell" data-spot-look={look} data-spot-layout={spec.layout}>
      <section className="spot-thread">
        <header className="spot-thread-head">
          <div>
            <p className="spot-kicker">Synthetic Marketplace thread · not Facebook</p>
            <h2 className="spot-thread-title">
              {SPOT_CUSTOMER.name} · {SPOT_CUSTOMER.city}
            </h2>
            <p className="spot-thread-sub">{SPOT_CUSTOMER.listing}</p>
          </div>
          <Button variant="outline" size="sm" onClick={resetScene}>
            Reset scene
          </Button>
        </header>

        <div className="spot-thread-body">
          {messages.map((m) =>
            m.who === "system" ? (
              <p key={m.id} className="spot-system">
                {m.text}
              </p>
            ) : (
              <SpotBubble
                key={m.id}
                who={m.who}
                text={m.text}
                spotted={m.who === "customer" && m.id === lastCustomerId(messages) ? spotted.inbound : false}
                label={m.who === "customer" && m.id === lastCustomerId(messages) ? "spotted · last inbound" : undefined}
              />
            ),
          )}
        </div>

        <div className="spot-composer-wrap">
          <div className="spot-composer-row">
            <SpotFrame active={spotted.composer} label="spotted · composer" className="min-w-0 flex-1">
              <textarea
                value={composer}
                onChange={(e) => setComposer(e.target.value)}
                rows={3}
                placeholder="Human composer. The sidecar never types here."
                className="spot-composer"
                aria-label="Synthetic Messenger composer"
              />
            </SpotFrame>
            <SpotFrame active={spotted.send} label="spotted · send">
              <Button
                type="button"
                className="h-11"
                disabled={!composer.trim()}
                onClick={humanSend}
                aria-label="Send as human"
                id="spot-send"
              >
                <Send className="size-4" />
                Send
              </Button>
            </SpotFrame>
          </div>
          <p className="spot-status">
            {scanning
              ? "Scanning the thread…"
              : ready
                ? "Targets locked. Sidecar is a suggestion. Send is a person."
                : "Spot the controls."}
          </p>
        </div>
      </section>

      <section className="spot-desk">
        <div className="spot-desk-kicker">
          <Crosshair className="size-3.5" />
          LotBeacon spot sidecar
        </div>
        <h3 className="spot-desk-title">Grounded draft. Human Send.</h3>
        <p className="spot-desk-lead">
          This is the honest computer-use story: the agent finds the thread and writes beside it. It does not log into
          Facebook. It does not hide.
        </p>

        <div className={cn("spot-draft", abort && "is-abort")}>
          {abort ? (
            <AbortCard kind={abort} onDismiss={() => setAbort(null)} />
          ) : booked ? (
            <p className="text-sm text-muted-foreground">Thread closed. Saturday 10:00 is on the book. Reset to run it again.</p>
          ) : (
            <p className="spot-draft-text">{draft}</p>
          )}
        </div>

        <ul className="spot-claims">
          {SPOT_CLAIMS.map((c) => (
            <li key={c.text} className={c.status === "ok" ? "is-ok" : "is-block"}>
              <span className="spot-claim-mark">{c.status === "ok" ? "✓" : "✕"}</span>
              <span>
                <span className="spot-claim-text">{c.text}</span>
                <span className="spot-claim-src"> · {c.source}</span>
              </span>
            </li>
          ))}
        </ul>

        <div className="spot-actions">
          <Button variant="outline" className="h-11" onClick={copyDraft} disabled={!draft} id="spot-copy">
            <Copy className="size-4" />
            Copy draft
          </Button>
          <Button className="h-11" onClick={pasteDraft} disabled={!draft} id="spot-paste">
            Paste into composer
          </Button>
          <Button variant="outline" className="h-11" onClick={refuseAutoType} id="spot-autotype">
            <Keyboard className="size-4" />
            Auto-type
          </Button>
          <Button variant="outline" className="h-11" onClick={() => setAbort("autosend")} id="spot-autosend">
            <Ban className="size-4" />
            Auto-send
          </Button>
        </div>

        <button type="button" onClick={() => setAbort("stealth")} id="spot-stealth" className="spot-stealth">
          <ShieldOff className="size-3.5 shrink-0" />
          Hide from Meta that this was drafted
        </button>

        <div className="spot-foot">
          <Button variant="ghost" size="sm" onClick={() => runScan(false)}>
            <Scan className="size-4" />
            Re-run spot scan
          </Button>
        </div>
      </section>
    </div>
  );
}

function lastCustomerId(messages: Msg[]) {
  const last = [...messages].reverse().find((m) => m.who === "customer");
  return last?.id;
}

function SpotBubble({
  who,
  text,
  spotted,
  label,
}: {
  who: "customer" | "rep";
  text: string;
  spotted: boolean;
  label?: string;
}) {
  const mine = who === "rep";
  return (
    <div className={cn("spot-bubble-wrap", mine ? "is-mine" : "is-theirs")}>
      <SpotFrame active={spotted} label={label}>
        <p className={cn("spot-bubble", mine ? "is-out" : "is-in")}>{text}</p>
      </SpotFrame>
    </div>
  );
}

function SpotFrame({
  active,
  label,
  className,
  children,
}: {
  active: boolean;
  label?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("spot-frame", className)}>
      {active && label && <span className="spot-frame-label">{label}</span>}
      <div className={cn("spot-frame-box", active && "is-spotted")}>{children}</div>
    </div>
  );
}

function AbortCard({ kind, onDismiss }: { kind: Exclude<AbortKind, null>; onDismiss: () => void }) {
  const copy = {
    autotype: {
      t: "Auto-type aborted",
      d: "A computer-use agent would have finished typing into messenger.com. We will not. Meta Terms §3.2.3 and the Automated Data Collection Terms cover automated access even while you are logged in. This composer is synthetic, and we still stop.",
    },
    autosend: {
      t: "Auto-send refused",
      d: "HUMAN_AGENT is a 7-day window for a person. Automated messages under that tag are a disallowed use. LotBeacon’s product rule is the same as Meta’s: a human hits Send. Ever.",
    },
    stealth: {
      t: "Hiding the model is the violation",
      d: "Mimicking keystroke cadence, skipping paste events, or stripping bot tells so Meta “does not figure it out” is not a clever integration. It is the intent to evade. We document that path so a dealer never buys it from us, or from CARVID under another name.",
    },
  }[kind];
  return (
    <div id="spot-abort">
      <p className="text-sm font-medium">{copy.t}</p>
      <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{copy.d}</p>
      <button type="button" onClick={onDismiss} className="mt-2 text-[12px] text-silver underline-offset-2 hover:underline">
        Dismiss
      </button>
    </div>
  );
}
