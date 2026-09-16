import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const STEPS = [
  {
    sel: "[data-tour='queue']",
    title: "The inbox",
    text: "Not a leaderboard. Each row: who, how long they have waited, show-likelihood of making the appointment (green climbing, yellow holding, red slipping), what happened, and the exact next action.",
  },
  {
    sel: "[data-tour='buddy']",
    title: "Buddy notes (demo)",
    text: "The amber line is the two-second briefing a coworker would text you: price grinder, serial ghoster, angry be-back. Demo-only for now — beta testers decide if it ships.",
  },
  {
    sel: "[data-tour='meta']",
    title: "Channel, window, ownership",
    text: "Facebook Messenger with a live countdown on the 24-hour reply window, and one plain line saying who drafts and who sends. No autonomous sends, ever.",
  },
  {
    sel: "[data-tour='stages']",
    title: "Four stages, auto-derived",
    text: "Engage → Qualify → Book → Visit outcome. The sub-state is precise: visit interest (tentative) is not appointment requested.",
  },
  {
    sel: "[data-tour='card']",
    title: "One action card",
    text: "Goal · Missing · Known (click a fact to see the customer's own words) · Verified vehicle · the draft. Two real appointment slots. When the customer picks one, this becomes a one-click Book + confirm.",
  },
  {
    sel: "[data-tour='why']",
    title: "Why this action?",
    text: "The card explains itself: what it read, what it remembers, what it verified in inventory, which stage, which action, which claims it checked, and the human gate. No black box.",
  },
  {
    sel: "[data-tour='impact']",
    title: "Business impact",
    text: "What this conversation has produced: rep attention saved, first-response time, claims kept out of the customer's inbox, expected gross once booked.",
  },
  {
    sel: "[data-tour='signals']",
    title: "Signals and the deal file",
    text: "Five communication signals, evidence quotes, and a one-click comms package to finance or the sales manager. They open a live one-page — movement included — instead of hunting Messenger.",
  },
  {
    sel: "[data-tour='owner']",
    title: "Owner dashboard",
    text: "Capacity, gates, and the Responsible AI scorecard: Response, Accuracy, Integrity. Points sit under the ring. Named plays tell each rep exactly how to make their number bigger.",
  },
  {
    sel: "[data-tour='live-inquiry']",
    title: "Try a live inquiry",
    text: "Paste a message a real customer sent your store today. The whole pipeline runs against live inventory and shows the draft, the verdicts and the decision path — nothing is stored.",
  },
  {
    sel: "[data-tour='keys']",
    title: "Keyboard-first",
    text: "J/K walk the queue, E edits, ⌘↵ sends and opens the next lead, 1/2 swap the slot pair (default / morning / afternoon). Built for volume.",
  },
];

export function GuidedTour({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [i, setI] = useState(0);

  useEffect(() => {
    if (!open) {
      document.querySelectorAll(".tour-spot").forEach((el) => el.classList.remove("tour-spot"));
      return;
    }
    setI(0);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    document.querySelectorAll(".tour-spot").forEach((el) => el.classList.remove("tour-spot"));
    let step = i;
    let target: Element | null = null;
    while (step < STEPS.length) {
      target = document.querySelector(STEPS[step].sel);
      if (target) break;
      step += 1;
    }
    if (step !== i && step < STEPS.length) {
      setI(step);
      return;
    }
    if (!target) return;
    target.classList.add("tour-spot");
    target.scrollIntoView({ block: "nearest", behavior: "smooth" });
    return () => target?.classList.remove("tour-spot");
  }, [open, i]);

  if (!open) return null;
  const st = STEPS[i];
  if (!st) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-60">
      <div className="pointer-events-auto fixed right-4 bottom-24 z-60 w-[min(92vw,22rem)] rounded-xl border border-border bg-primary p-4 text-primary-foreground shadow-panel lg:bottom-8">
        <p className="text-[11px] tracking-[0.14em] uppercase opacity-80">
          {i + 1} of {STEPS.length} · {st.title}
        </p>
        <p className="mt-2 text-sm leading-relaxed">{st.text}</p>
        <div className="mt-3 flex justify-end gap-2">
          <Button
            size="sm"
            variant="ghost"
            className="text-primary-foreground hover:bg-primary-foreground/10"
            onClick={onClose}
          >
            Skip
          </Button>
          <Button
            size="sm"
            className="bg-background text-foreground hover:opacity-90"
            onClick={() => {
              if (i >= STEPS.length - 1) onClose();
              else setI(i + 1);
            }}
          >
            {i >= STEPS.length - 1 ? "Done" : "Next"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function TourButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Guided tour"
      aria-label="Guided tour"
      className="grid size-8 place-items-center rounded-full border border-border text-sm font-medium hover:bg-accent"
    >
      ?
    </button>
  );
}
