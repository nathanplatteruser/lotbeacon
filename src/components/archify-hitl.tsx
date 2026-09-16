import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  ARCHIFY_HAPPY_IDS,
  ARCHIFY_LANES,
  ARCHIFY_NODES,
  ARCHIFY_SEQUENCE,
} from "@/lib/design-rolodex";
import { cn } from "@/lib/utils";

export function ArchifyWorkflow() {
  const [on, setOn] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  function play(path: "happy" | "abort" | "refuse") {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    const ids =
      path === "happy"
        ? ARCHIFY_HAPPY_IDS
        : path === "abort"
          ? ["inbound", "spot", "autotype"]
          : ["inbound", "spot", "stealth"];
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setOn(ids[ids.length - 1] ?? null);
      setPlaying(false);
      return;
    }
    setPlaying(true);
    ids.forEach((id, i) => {
      const t = window.setTimeout(() => {
        setOn(id);
        if (i === ids.length - 1) setPlaying(false);
      }, i * 720);
      timers.current.push(t);
    });
  }

  return (
    <article className="af-board" data-archify="workflow">
      <header className="af-head">
        <p className="af-kicker">Archify · T·02 workflow · evidence: the sidecar you already used</p>
        <h2 className="af-title">How a Marketplace reply actually leaves the building</h2>
        <div className="af-actions">
          <Button type="button" size="sm" onClick={() => play("happy")} disabled={playing} id="af-play-happy">
            Play happy path
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => play("abort")} disabled={playing} id="af-play-abort">
            Play abort
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => play("refuse")} disabled={playing} id="af-play-refuse">
            Play stealth refuse
          </Button>
        </div>
      </header>

      <div className="af-lanes" role="list">
        {ARCHIFY_LANES.map((lane) => (
          <section key={lane.id} className="af-lane" role="listitem">
            <h3>
              <span>{lane.kicker}</span>
              {lane.label}
            </h3>
            <ol>
              {ARCHIFY_NODES.filter((n) => n.lane === lane.id).map((n) => (
                <li
                  key={n.id}
                  data-path={n.path}
                  data-on={on === n.id ? "1" : undefined}
                  className={cn("af-node", on === n.id && "is-on")}
                >
                  <span className="af-n">{n.n}</span>
                  <strong>{n.t}</strong>
                  <p>{n.d}</p>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
      <p className="af-foot">
        No invented nodes. Copy, paste, abort, and stealth refuse are the same controls as the live sidecar.
        Meta is a policy lane, not a system we log into.
      </p>
    </article>
  );
}

export function ArchifySequence() {
  const [step, setStep] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  function play() {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setStep(ARCHIFY_SEQUENCE.length - 1);
      setPlaying(false);
      return;
    }
    setPlaying(true);
    ARCHIFY_SEQUENCE.forEach((_, i) => {
      const t = window.setTimeout(() => {
        setStep(i);
        if (i === ARCHIFY_SEQUENCE.length - 1) setPlaying(false);
      }, i * 800);
      timers.current.push(t);
    });
  }

  const people = ["Jordan", "Sidecar", "Composer", "Meta"] as const;

  return (
    <article className="af-seq" data-archify="sequence">
      <header className="af-head">
        <p className="af-kicker">Archify · T·03 sequence · evidence: auto-type abort in the sidecar</p>
        <h2 className="af-title">Auto-type lasts five characters</h2>
        <Button type="button" size="sm" onClick={play} disabled={playing} id="af-play-seq">
          Play sequence
        </Button>
      </header>

      <div className="af-seq-board">
        <div className="af-seq-people">
          {people.map((p) => (
            <div key={p}>{p}</div>
          ))}
        </div>
        <ol className="af-seq-rows">
          {ARCHIFY_SEQUENCE.map((row, i) => (
            <li key={row.t} className={cn("af-seq-row", step === i && "is-on")} data-step={i}>
              <p className="af-seq-msg">
                <strong>
                  {row.from}
                  {row.from === row.to ? "" : ` → ${row.to}`}
                </strong>
                <span>{row.t}</span>
              </p>
              <p className="af-seq-note">{row.note}</p>
            </li>
          ))}
        </ol>
      </div>
      <p className="af-foot">
        Meta never receives a message in this trace. That is the point of the abort: the composer stays empty, so
        there is nothing to hide.
      </p>
    </article>
  );
}
