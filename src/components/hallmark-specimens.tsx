import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/mark";
import {
  SPOT_CLAIMS,
  SPOT_CONFIRM,
  SPOT_CUSTOMER,
  SPOT_DRAFT,
  SPOT_INBOUND,
  SPOT_REPLY,
} from "@/lib/spot";

export function HallmarkWorkbench() {
  return (
    <article className="hm-work" data-macro="workbench">
      <header className="hm-work-head">
        <Wordmark />
        <p>Zoellner Ford of Beatrice · the desk in use</p>
      </header>

      <Frame n="01" kicker="Thread" caption="Sarah names the unit, the trade, and a day. The sidecar already has Saturday.">
        <p className="hm-who">
          {SPOT_CUSTOMER.name} · {SPOT_CUSTOMER.listing}
        </p>
        <blockquote className="hm-bubble">{SPOT_INBOUND}</blockquote>
        <p className="hm-draft-kicker">Grounded draft · T2401</p>
        <p className="hm-draft">{SPOT_DRAFT}</p>
        <ul className="hm-claims">
          {SPOT_CLAIMS.map((c) => (
            <li key={c.text} data-status={c.status}>
              <span>{c.status === "ok" ? "Quoted" : "Blocked"}</span>
              <span>
                {c.text}
                <em>{c.source}</em>
              </span>
            </li>
          ))}
        </ul>
      </Frame>

      <Frame n="02" kicker="Auto-type" caption="Five characters. Then the desk takes the keys back.">
        <p className="hm-who">Composer · empty on purpose</p>
        <div className="hm-composer" aria-label="Empty composer">
          <span>Type a message…</span>
        </div>
        <p className="hm-stamp">Auto-type aborted. A person still sends.</p>
      </Frame>

      <Frame n="03" kicker="Send" caption="She picked 10:00. Jordan confirmed. Meta saw a human.">
        <blockquote className="hm-bubble">{SPOT_REPLY}</blockquote>
        <p className="hm-draft-kicker">Jordan · human Send</p>
        <p className="hm-draft">{SPOT_CONFIRM}</p>
        <p className="hm-meta">HUMAN_AGENT · 7-day window because a human approved</p>
      </Frame>

      <aside className="hm-sticky">
        <p>Context is built. Try the live sidecar, or work Sarah in the queue.</p>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link to="/spot">
              Open the sidecar
              <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/app/inbox" search={{ as: "sales" }}>
              Work the queue
            </Link>
          </Button>
        </div>
      </aside>
    </article>
  );
}

function Frame({
  n,
  kicker,
  caption,
  children,
}: {
  n: string;
  kicker: string;
  caption: string;
  children: ReactNode;
}) {
  return (
    <section className="hm-frame">
      <p className="hm-frame-index">
        {n} · {kicker}
      </p>
      <figure>
        <div className="hm-screen">{children}</div>
        <figcaption>{caption}</figcaption>
      </figure>
    </section>
  );
}

export function HallmarkStatLed() {
  return (
    <article className="hm-stat" data-macro="stat-led">
      <header className="hm-stat-hero">
        <p className="hm-stat-kicker">LotBeacon · responsible-AI scorecard</p>
        <h2 className="hm-stat-figure">
          <span className="hm-stat-num">0</span>
          <span className="hm-stat-words">autonomous sends. Ever.</span>
        </h2>
        <Button asChild variant="outline" className="hm-stat-chip">
          <Link to="/spot">Open the sidecar</Link>
        </Button>
      </header>

      <dl className="hm-stat-ledger">
        <div>
          <dt>2.8×</dt>
          <dd>conversations per rep-hour on a seeded floor. Pessimistic units: +47%.</dd>
        </div>
        <div>
          <dt>7 days</dt>
          <dd>HUMAN_AGENT window exists because a human still approves. Bots do not get it.</dd>
        </div>
        <div>
          <dt>T2401</dt>
          <dd>Black 2026 Explorer Platinum 4WD. 1,840 mi. $57,990 listed. Available. Trade walked on the lot.</dd>
        </div>
        <div>
          <dt>$129</dt>
          <dd>Solo. Crew $399. Rooftop $1,190. Month to month. We are not Beakon.</dd>
        </div>
        <div>
          <dt>Sarah Miller</dt>
          <dd>Beatrice. Marketplace. Accord to trade. Saturday 10:00 booked after a person hit Send.</dd>
        </div>
      </dl>
    </article>
  );
}

export function HallmarkManifesto() {
  const lines = [
    "We will not log into Facebook for you.",
    "We will not type into Messenger.",
    "We will not hide a model from Meta.",
    "Drafts quote live inventory, or they do not leave the building.",
    "Sold units stay sold.",
    "A person still hits Send.",
  ];

  return (
    <article className="hm-man" data-macro="manifesto">
      <p className="hm-man-kicker">LotBeacon · a belief before a buy</p>
      <h2 className="hm-man-display">A person still sends.</h2>
      <ol className="hm-man-list">
        {lines.map((line, i) => (
          <li key={line}>
            <span>{String(i + 1).padStart(2, "0")}</span>
            {line}
          </li>
        ))}
      </ol>
      <p className="hm-man-note">
        Marketplace stays paste-in until Meta opens it. Named Page plus Messenger Platform is v1.0. The
        sidecar on this site is the computer-use idea with the crime taken out.
      </p>
      <Button asChild className="hm-man-cta">
        <Link to="/app/inbox" search={{ as: "sales" }}>
          I agree — work the queue
        </Link>
      </Button>
    </article>
  );
}
