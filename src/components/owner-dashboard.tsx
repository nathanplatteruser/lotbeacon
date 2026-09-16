import { useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { buildAuditBundle, ownerDashboard, type RaiPlay } from "@/lib/metrics";
import { money } from "@/lib/format";
import { DEALER } from "@/lib/seed";
import { MODEL_NOTE } from "@/lib/impact";
import { useApp } from "@/lib/store";
import { cn } from "@/lib/utils";

export function OwnerDashboard() {
  const threads = useApp((s) => s.threads);
  const appointments = useApp((s) => s.appointments);
  const vehicles = useApp((s) => s.vehicles);
  const calls = useApp((s) => s.calls);
  const assumptions = useApp((s) => s.assumptions);
  const setAssumptions = useApp((s) => s.setAssumptions);
  const selectThread = useApp((s) => s.selectThread);
  const setRep = useApp((s) => s.setRep);
  const navigate = useNavigate();

  const intercepts = useApp((s) => s.intercepts) ?? [];
  const dash = useMemo(
    () => ownerDashboard({ threads, appointments, vehicles, calls, assumptions, intercepts }),
    [threads, appointments, vehicles, calls, assumptions, intercepts],
  );

  const cap = dash.capacity;
  const rai = dash.responsibleAi;
  const cmax = Math.max(cap.baselinePerRepHour, cap.assistedPerRepHour, 1);
  const C = 2 * Math.PI * 52;
  const ring = C * (rai.score / 100);
  const fmax = Math.max(1, dash.funnel.inquiries);
  const dmax = Math.max(1, ...dash.speed.responseDistribution.map((x) => x.n));
  const passing = dash.gates.filter((g) => g.status === "pass").length;
  const openPoints = rai.total - rai.earned;

  function exportAudit() {
    const blob = new Blob([JSON.stringify(buildAuditBundle({ threads, vehicles, appointments }), null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lotbeacon-audit-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function openPlay(p: RaiPlay) {
    setRep(p.repId);
    if (p.threadId) selectThread(p.threadId);
    void navigate({
      to: p.where === "intel" ? "/app/intel" : "/app/inbox",
      search: (prev: { as?: string }) => ({ ...prev, as: undefined }),
    });
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">Owner / GSM</p>
          <h1 className="font-display mt-1 text-3xl">Owner dashboard</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            {DEALER.name} · last {dash.windowDays} days · every dollar is derived from the assumptions at the bottom —
            edit them to your store.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={exportAudit}>
          Export audit log
        </Button>
      </header>

      <section className="mb-6 grid gap-4 lg:grid-cols-3">
        <article className="rounded-xl border border-paper/40 bg-card p-5">
          <p className="text-[11px] tracking-[0.14em] text-muted-foreground uppercase">Expected growth · booked deals</p>
          <div className="font-display mt-2 text-4xl tabular md:text-5xl">{money(dash.return.expectedGross)}</div>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {dash.funnel.booked} on the board × {Math.round(assumptions.appointmentShowRate * 100)}% show ×{" "}
            {Math.round(assumptions.showCloseRate * 100)}% close × {money(assumptions.grossPerUnit)} front-end. Close
            rate held flat — this is not a close-rate story.
          </p>
        </article>
        <article className="rounded-xl border border-paper/40 bg-card p-5">
          <p className="text-[11px] tracking-[0.14em] text-muted-foreground uppercase">Typing time saved</p>
          <div className="font-display mt-2 text-4xl tabular md:text-5xl">
            {dash.return.repHoursSaved >= 1 ? `${dash.return.repHoursSaved}h` : `${dash.return.repMinutesSaved} min`}
          </div>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Auto-type instead of a blank box. {dash.return.unassistedReplyHours}h from scratch →{" "}
            {dash.return.assistedReplyHours}h with LotBeacon. Same headcount, {cap.multiplier}× the conversations. A
            person still edits and hits Send.
          </p>
        </article>
        <article className="rounded-xl border border-paper/40 bg-card p-5">
          <p className="text-[11px] tracking-[0.14em] text-muted-foreground uppercase">Investigator time saved</p>
          <div className="font-display mt-2 text-4xl tabular md:text-5xl">
            {dash.return.investigatorHours >= 1
              ? `${dash.return.investigatorHours}h`
              : `${dash.return.investigatorMinutes} min`}
          </div>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Trim, year, accident history, availability — fact-checked from the lot feed instead of walking to CDK or
            Carfax mid-thread. {dash.safety.claimsRoutedForVerification} claims routed · {dash.return.factsHeld} facts
            already on the card.
          </p>
        </article>
      </section>

      <section className="mb-6 rounded-xl border border-border bg-card p-5">
        <p className="text-[11px] tracking-[0.14em] text-muted-foreground uppercase">Try to break it</p>
        <h2 className="font-display mt-1 text-xl">These knobs are yours. The firewall is not.</h2>
        <ol className="mt-3 grid gap-3 text-sm text-muted-foreground md:grid-cols-3">
          <li>
            <span className="block font-medium text-foreground">1. Invent a deal</span>
            Paste “$2,500 off, $400 a month, Sunday at 2.” Send must stay blocked.
          </li>
          <li>
            <span className="block font-medium text-foreground">2. Starve the lot feed</span>
            Mark an Explorer stale. Availability and price claims refuse.
          </li>
          <li>
            <span className="block font-medium text-foreground">3. Hurt the math</span>
            Drop show-rate in the assumptions below. Return dollars move. Gates do not lie for you.
          </li>
        </ol>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-[11px] tracking-wide text-muted-foreground uppercase">Capacity per rep-hour</h2>
          <div className="font-display mt-2 text-5xl tabular">{cap.multiplier}×</div>
          <p className="mt-2 text-sm text-muted-foreground">{cap.line}</p>
          <div className="mt-5 space-y-3">
            <Bar label={`Unassisted (${cap.baselineMinutes} min/reply)`} n={cap.baselinePerRepHour} max={cmax} tone="muted" />
            <Bar label={`With LotBeacon (${cap.avgAssistedMinutes} min/reply)`} n={cap.assistedPerRepHour} max={cmax} tone="paper" />
          </div>
          <p className="mt-4 text-[12px] leading-relaxed text-muted-foreground">
            Assisted minutes are {cap.basis}: the accept / edit / manual mix of real sends × your minutes assumptions.
            Same headcount, more conversations — that is the SaaS return.
          </p>
        </article>

        <article className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-[11px] tracking-wide text-muted-foreground uppercase">Pilot decision gates</h2>
          <table className="mt-3 w-full text-left text-sm">
            <thead>
              <tr className="text-[11px] tracking-wide text-muted-foreground uppercase">
                <th className="pb-2 font-medium">Gate</th>
                <th className="pb-2 font-medium">Now</th>
                <th className="pb-2 font-medium">Target</th>
                <th className="pb-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {dash.gates.map((g) => (
                <tr key={g.key} className="border-t border-border" title={g.why}>
                  <td className="py-2 pr-2">{g.label}</td>
                  <td className="py-2 pr-2 tabular font-medium">{g.value}</td>
                  <td className="py-2 pr-2 text-muted-foreground">{g.target}</td>
                  <td className="py-2">
                    <span
                      className={cn(
                        "text-[11px] tracking-wide uppercase",
                        g.status === "pass" && "text-ok",
                        g.status === "watch" && "text-warn",
                        g.status === "fail" && "text-destructive",
                      )}
                    >
                      {g.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-[12px] text-muted-foreground">
            {passing}/{dash.gates.length} gates passing. Go = all pass for two consecutive weeks. Hover a gate for why it
            matters.
          </p>
        </article>
      </div>

      <article className="mt-4 rounded-xl border border-border bg-card p-5" data-tour="rai">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-[11px] tracking-wide text-muted-foreground uppercase">Responsible AI scorecard</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Response · Accuracy · Integrity. Not vanity clicks. {rai.earned}/{rai.total} points on the card
              {openPoints > 0 ? ` · ${openPoints} still on the floor` : ""}.
            </p>
          </div>
          {openPoints > 0 ? (
            <p className="text-[12px] tabular text-warn">+{openPoints} available this week</p>
          ) : (
            <p className="text-[12px] text-ok">All points earned. Keep the mix.</p>
          )}
        </div>

        <div className="mt-5 flex flex-col items-start gap-5 sm:flex-row sm:items-center">
          <div className="relative size-[120px] shrink-0">
            <svg width="120" height="120" viewBox="0 0 120 120" className="-rotate-90">
              <circle cx="60" cy="60" r="52" fill="none" stroke="currentColor" className="text-secondary" strokeWidth="10" />
              <circle
                cx="60"
                cy="60"
                r="52"
                fill="none"
                stroke="currentColor"
                className={rai.score === 100 ? "text-ok" : rai.score >= 70 ? "text-warn" : "text-destructive"}
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={`${ring.toFixed(1)} ${(C - ring).toFixed(1)}`}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-display text-3xl tabular leading-none">{rai.score}</span>
              <span className="text-[10px] text-muted-foreground">
                {rai.passed}/{rai.checks.length} checks
              </span>
            </div>
          </div>
          <div className="grid min-w-0 flex-1 grid-cols-1 gap-3 sm:grid-cols-3">
            {rai.pillars.map((p) => (
              <div key={p.key} className="min-w-0">
                <p className="text-[11px] tracking-wide text-muted-foreground uppercase">{p.label}</p>
                <p className="font-display mt-1 text-2xl tabular">
                  {p.earned}
                  <span className="text-base text-muted-foreground">/{p.total}</span>
                </p>
                <p className="mt-1 text-[12px] leading-snug text-muted-foreground">{p.blurb}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 border-t border-border pt-4">
          <h3 className="text-[11px] tracking-wide text-muted-foreground uppercase">Points</h3>
          <ul className="mt-3 space-y-4">
            {rai.pillars.map((p) => {
              const rows = rai.checks.filter((c) => c.pillar === p.key);
              return (
                <li key={p.key}>
                  <div className="mb-1.5 flex items-baseline justify-between gap-2">
                    <span className="text-[11px] tracking-wide text-muted-foreground uppercase">{p.label}</span>
                    <span className="text-[11px] tabular text-muted-foreground">
                      {p.earned}/{p.total}
                    </span>
                  </div>
                  <ul className="space-y-1.5">
                    {rows.map((c) => (
                      <li key={c.key} className="flex items-start gap-2 text-[13px]">
                        <span className={cn("mt-0.5 shrink-0 tabular", c.pass ? "text-ok" : "text-warn")}>
                          {c.pass ? "✓" : "✕"}
                        </span>
                        <span className="min-w-0 flex-1 leading-snug">
                          <span className={c.pass ? "text-muted-foreground" : "text-foreground"}>{c.label}</span>
                          <span className="ml-2 tabular text-muted-foreground">· {c.value}</span>
                          {!c.pass && c.tip ? (
                            <span className="mt-0.5 block text-[12px] leading-relaxed text-muted-foreground">{c.tip}</span>
                          ) : null}
                        </span>
                        <span
                          className={cn(
                            "shrink-0 tabular text-[12px]",
                            c.pass ? "text-ok" : "text-warn",
                          )}
                        >
                          {c.pass ? `+${c.earned}` : `+${c.points - c.earned}`}
                        </span>
                      </li>
                    ))}
                  </ul>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="mt-6 border-t border-border pt-4">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="text-[11px] tracking-wide text-muted-foreground uppercase">Monday huddle</h3>
            {openPoints > 0 ? <span className="text-[12px] tabular text-warn">+{openPoints} on the floor</span> : null}
          </div>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Three beats. Who, what they did, what to do. Oldest first.
          </p>
          {rai.plays.length ? (
            <ol className="mt-4 divide-y divide-border border-y border-border">
              {rai.plays.map((p, i) => (
                <li key={`${p.kind}-${p.threadId ?? i}`}>
                  <button
                    type="button"
                    onClick={() => openPlay(p)}
                    className="flex w-full flex-col gap-1 px-0 py-4 text-left hover:bg-accent/30 sm:flex-row sm:items-start sm:gap-5"
                  >
                    <span className="flex shrink-0 items-baseline gap-3 sm:w-28">
                      <span className="text-[11px] tabular text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                      <span className="font-display text-lg tabular text-warn">+{p.points}</span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium leading-snug">{p.headline}</span>
                      <span className="mt-1 block text-[13px] leading-relaxed text-muted-foreground">{p.action}</span>
                      {p.evidence ? (
                        <span className="mt-1.5 block text-[12px] leading-relaxed text-muted-foreground">{p.evidence}</span>
                      ) : null}
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">All checks passing. Keep sending from the lot feed.</p>
          )}
        </div>
      </article>

      <section className="mt-4">
        <article className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-[11px] tracking-wide text-muted-foreground uppercase">Held at the gate</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            What never reached the customer — and the one inbound that slipped through late.
          </p>
          <ul className="mt-4 grid gap-x-8 gap-y-4 sm:grid-cols-2">
            {intercepts.map((i) => (
              <li key={i.id}>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-medium">{i.customerName}</span>
                  <span
                    className={cn(
                      "text-[11px] tracking-wide uppercase",
                      i.status === "held" && "text-ok",
                      i.status === "late" && "text-warn",
                    )}
                  >
                    {i.kind === "outbound_blocked" ? "held" : i.status === "late" ? "late" : "caught"}
                  </span>
                </div>
                <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">“{i.quote}”</p>
                {i.sticker ? <p className="mt-1 text-[12px] text-foreground">{i.sticker}</p> : null}
              </li>
            ))}
          </ul>
        </article>
      </section>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          k="Active conversations"
          v={String(dash.usage.activeConversations)}
          d={`${dash.usage.conversationsTouched} touched · ${dash.usage.repliesSent} replies sent`}
        />
        <Kpi
          k="Median first response"
          v={dash.speed.medianFirstResponse}
          d={`P90 ${dash.speed.p90FirstResponse} · ${dash.speed.windowsLost} reply window${dash.speed.windowsLost === 1 ? "" : "s"} lost`}
        />
        <Kpi
          k="Rep attention saved"
          v={`${dash.return.repHoursSaved} h`}
          d={`≈ ${money(dash.return.repCostSaved)} at $${assumptions.loadedRepHourlyCost}/h · ${cap.multiplier}× capacity per reply`}
        />
        <Kpi
          k="Claims routed for verification"
          v={String(dash.safety.claimsRoutedForVerification)}
          d={`${dash.safety.blockedSends} blocked sends · ${dash.safety.handedToAPerson} handed to a person · ${dash.safety.autonomousSends} autonomous sends`}
        />
        <Kpi
          k="Draft acceptance"
          v={dash.usage.draftAcceptanceRate == null ? "—" : `${Math.round(dash.usage.draftAcceptanceRate * 100)}%`}
          d={`${dash.usage.acceptedAsIsRate == null ? "" : `${Math.round(dash.usage.acceptedAsIsRate * 100)}% sent as drafted`} · ${dash.usage.repsActive} reps active`}
        />
        <Kpi
          k="Appointments booked"
          v={String(dash.funnel.booked)}
          d={`${dash.funnel.inquiryToBooked == null ? "" : `${Math.round(dash.funnel.inquiryToBooked * 100)}% of inquiries`} · ${dash.funnel.showed} showed · ${dash.funnel.sold} sold`}
        />
        <Kpi
          k="Expected gross"
          v={money(dash.return.expectedGross)}
          d={`booked × ${Math.round(assumptions.appointmentShowRate * 100)}% show × ${Math.round(assumptions.showCloseRate * 100)}% close × ${money(assumptions.grossPerUnit)}`}
        />
        <Kpi
          k="Prevented-claim value"
          v={money(dash.return.preventedClaimValue)}
          d={`${dash.safety.optOutsHonored} opt-out${dash.safety.optOutsHonored === 1 ? "" : "s"} honored · ${dash.safety.repCorrections} memory corrections`}
        />
      </div>

      <section className="mt-4 rounded-xl border border-border bg-card p-5">
        <p className="text-[11px] tracking-[0.14em] text-muted-foreground uppercase">30-day forecast · pessimistic</p>
        <h2 className="font-display mt-1 text-xl">If this week’s mix holds, and close rate stays flat</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <div className="text-[12px] text-muted-foreground">Expected gross from booked leads</div>
            <div className="font-display text-3xl tabular">{money(dash.return.expectedGross)}</div>
            <p className="mt-1 text-[12px] text-muted-foreground">
              {dash.funnel.booked} booked × {Math.round(assumptions.appointmentShowRate * 100)}% show × {Math.round(assumptions.showCloseRate * 100)}% close × {money(assumptions.grossPerUnit)}
            </p>
          </div>
          <div>
            <div className="text-[12px] text-muted-foreground">Rep hours returned</div>
            <div className="font-display text-3xl tabular">{dash.return.repHoursSaved}h</div>
            <p className="mt-1 text-[12px] text-muted-foreground">{money(dash.return.repCostSaved)} loaded labor · same headcount, more conversations</p>
          </div>
          <div>
            <div className="text-[12px] text-muted-foreground">Research ceiling (not this seed)</div>
            <div className="font-display text-3xl tabular">+47%</div>
            <p className="mt-1 text-[12px] text-muted-foreground">
              {MODEL_NOTE} Units / rep in the Before & after model. 2.8× conversations / hour. +45% Messenger foot traffic. Close rate held flat.
            </p>
          </div>
        </div>
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <article className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-[11px] tracking-wide text-muted-foreground uppercase">Funnel</h2>
          <div className="mt-4 space-y-3">
            <Bar label={`Inquiries (${dash.funnel.inquiries})`} n={dash.funnel.inquiries} max={fmax} tone="muted" />
            <Bar label={`Visit interest (${dash.funnel.visitInterest})`} n={dash.funnel.visitInterest} max={fmax} tone="muted" />
            <Bar label={`Booked (${dash.funnel.booked})`} n={dash.funnel.booked} max={fmax} tone="paper" />
            <Bar label={`Showed (${dash.funnel.showed})`} n={dash.funnel.showed} max={fmax} tone="muted" />
            <Bar label={`Sold (${dash.funnel.sold})`} n={dash.funnel.sold} max={fmax} tone="muted" />
          </div>
        </article>
        <article className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-[11px] tracking-wide text-muted-foreground uppercase">First-response distribution</h2>
          <div className="mt-4 space-y-3">
            {dash.speed.responseDistribution.map((b) => (
              <Bar key={b.label} label={`${b.label} (${b.n})`} n={b.n} max={dmax} tone="muted" />
            ))}
          </div>
        </article>
      </div>

      <article className="mt-4 overflow-x-auto rounded-xl border border-border bg-card p-5">
        <h2 className="text-[11px] tracking-wide text-muted-foreground uppercase">Per-rep this week</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Each rep has a number they can grow. Next play is the fastest +points from their own book.
        </p>
        <table className="mt-3 w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="text-[11px] tracking-wide text-muted-foreground uppercase">
              <th className="pb-2 font-medium">Rep</th>
              <th className="pb-2 font-medium">Score</th>
              <th className="pb-2 font-medium">Threads</th>
              <th className="pb-2 font-medium">Replies</th>
              <th className="pb-2 font-medium">Booked</th>
              <th className="pb-2 font-medium">Minutes saved</th>
              <th className="pb-2 font-medium">Next play</th>
            </tr>
          </thead>
          <tbody>
            {dash.perRep.map((r) => (
              <tr key={r.rep} className="border-t border-border">
                <td className="py-2 pr-2">{r.rep}</td>
                <td className="py-2 pr-2">
                  <span
                    className={cn(
                      "font-display text-lg tabular",
                      r.score === 100 ? "text-ok" : r.score >= 80 ? "text-foreground" : "text-warn",
                    )}
                  >
                    {r.score}
                  </span>
                </td>
                <td className="py-2 pr-2 tabular">{r.threads}</td>
                <td className="py-2 pr-2 tabular">{r.replies}</td>
                <td className="py-2 pr-2 tabular">{r.booked}</td>
                <td className="py-2 pr-2 tabular">{r.minutesSaved}</td>
                <td className="py-2 text-[13px] leading-snug text-muted-foreground">
                  {r.play ? (
                    <>
                      <span className="tabular text-warn">+{r.play.points}</span>{" "}
                      <span className="text-foreground">{r.play.headline}</span>
                    </>
                  ) : (
                    "Clean book."
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </article>

      <article className="mt-4 rounded-xl border border-border bg-card p-5">
        <h2 className="text-[11px] tracking-wide text-muted-foreground uppercase">Return assumptions — edit these</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Changing a number recomputes capacity, expected gross, and gates. This is the owner’s control surface.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Unassisted min / reply" value={assumptions.baselineMinutesPerReply} onChange={(n) => setAssumptions({ baselineMinutesPerReply: n })} />
          <Field label="Accept draft min" value={assumptions.assistedMinutesAccept} onChange={(n) => setAssumptions({ assistedMinutesAccept: n })} />
          <Field label="Edit draft min" value={assumptions.assistedMinutesEdit} onChange={(n) => setAssumptions({ assistedMinutesEdit: n })} />
          <Field label="Manual min" value={assumptions.manualMinutes} onChange={(n) => setAssumptions({ manualMinutes: n })} />
          <Field label="Loaded $/rep-hour" value={assumptions.loadedRepHourlyCost} onChange={(n) => setAssumptions({ loadedRepHourlyCost: n })} />
          <Field label="Show rate" value={assumptions.appointmentShowRate} step={0.01} onChange={(n) => setAssumptions({ appointmentShowRate: n })} />
          <Field label="Show → close" value={assumptions.showCloseRate} step={0.01} onChange={(n) => setAssumptions({ showCloseRate: n })} />
          <Field label="Gross / unit" value={assumptions.grossPerUnit} onChange={(n) => setAssumptions({ grossPerUnit: n })} />
          <Field label="Prevented-claim $" value={assumptions.valueOfPreventedFalseClaim} onChange={(n) => setAssumptions({ valueOfPreventedFalseClaim: n })} />
        </div>
      </article>
    </div>
  );
}

function Kpi({ k, v, d }: { k: string; v: string; d: string }) {
  return (
    <article className="rounded-xl border border-border bg-card p-4">
      <div className="text-[11px] tracking-wide text-muted-foreground uppercase">{k}</div>
      <div className="font-display mt-1 text-2xl tabular">{v}</div>
      <div className="mt-1 text-[12px] text-muted-foreground">{d}</div>
    </article>
  );
}

function Bar({ label, n, max, tone }: { label: string; n: number; max: number; tone: "paper" | "muted" }) {
  const w = Math.max(4, Math.round((n / max) * 100));
  return (
    <div>
      <div className="flex items-baseline justify-between text-[12px]">
        <span className="text-muted-foreground">{label}</span>
        <span className="tabular">{n}</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary">
        <div className={cn("h-full", tone === "paper" ? "bg-paper" : "bg-silver/70")} style={{ width: `${w}%` }} />
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  step = 0.1,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  step?: number;
}) {
  return (
    <label className="block text-[12px]">
      <span className="text-muted-foreground">{label}</span>
      <Input
        type="number"
        step={step}
        value={value}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (Number.isFinite(n)) onChange(n);
        }}
        className="mt-1"
      />
    </label>
  );
}
