import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  appendTypeFormClaims,
  claimsFromJudgment,
  judgeTypeFormLocal,
  TYPE_FORM_REASON_PREFIX,
  typeFormClaims,
} from "./type-form.ts";
import type { Claim, Thread, Vehicle } from "./types.ts";

function vehicle(patch: Partial<Vehicle> = {}): Vehicle {
  return {
    stock: "F150-1",
    vin: "1FTFW1E84NFA00001",
    year: 2022,
    make: "Ford",
    model: "F-150",
    trim: "XLT",
    color: "White",
    body: "Truck",
    miles: 24100,
    price: 42990,
    status: "available",
    drivetrain: "4WD",
    retrievedAt: new Date().toISOString(),
    thirdRow: false,
    boosterOk: false,
    seats: 5,
    titleStatus: "clean",
    ...patch,
  };
}

function thread(patch: Partial<Thread> = {}): Thread {
  return {
    id: "t_test",
    customerName: "Riley Cole",
    customerHandle: "riley",
    city: "Beatrice",
    channel: "messenger",
    source: "Marketplace",
    assignedRepId: "r_jordan",
    stage: "engage",
    vehicleStock: "F150-1",
    lastInboundAt: new Date().toISOString(),
    lastActivityAt: new Date().toISOString(),
    unread: true,
    dnc: false,
    takeover: false,
    hint: "test",
    goal: "Book Saturday",
    missing: [],
    facts: [],
    voice: "celeste",
    voiceLocked: false,
    voiceReason: "test",
    demoScript: [],
    demoCursor: 0,
    messages: [
      {
        id: "m1",
        threadId: "t_test",
        who: "customer",
        sender: "Riley Cole",
        at: new Date().toISOString(),
        channel: "messenger",
        text: "Is the white F-150 still there?",
      },
    ],
    draft: { text: "", voice: "celeste", claims: [], slots: [{ id: "s1", at: new Date().toISOString(), label: "Saturday 10:00 AM" }, { id: "s2", at: new Date().toISOString(), label: "Saturday 11:30 AM" }], producer: "rules" },
    intel: {
      score: 70,
      sentiment: "neutral",
      propensityToShow: 0.5,
      trend: "flat",
      talkRatio: 0.5,
      questionsAsked: 1,
      nextStepSet: false,
      trackers: [],
      moments: [],
      coaching: "test",
    },
    appointmentId: null,
    ...patch,
  } as Thread;
}

function hasBlock(claims: Claim[], needle: string) {
  return claims.some((c) => c.severity === "block" && c.reason.includes(needle));
}

describe("type form local judge", () => {
  it("prefixes every typed-form reason",
    () => {
      const claims = typeFormClaims("We can do $400/mo on the F-150.", thread(), vehicle());
      assert.ok(claims.every((c) => c.reason.startsWith(TYPE_FORM_REASON_PREFIX) || c.severity === "ok"));
      assert.ok(hasBlock(claims, "Payment quotes"));
    },
  );

  it("catches a payment paraphrase the regex ladder also cares about",
    () => {
      const claims = typeFormClaims("We can get you around four hundred a month.", thread(), vehicle());
      assert.ok(hasBlock(claims, "Payment quotes"));
    },
  );

  it("blocks invented Sunday hours",
    () => {
      const claims = typeFormClaims("See you Sunday at 2.", thread(), vehicle());
      assert.ok(hasBlock(claims, "closed Sunday"));
    },
  );

  it("blocks a clock that is not on the board",
    () => {
      const t = thread();
      const claims = typeFormClaims("I can do Saturday 11:00 AM.", t, vehicle(), t.draft.slots);
      assert.ok(hasBlock(claims, "not on the board"));
    },
  );

  it("allows a clock that is on the board",
    () => {
      const t = thread();
      const claims = typeFormClaims("Saturday 10:00 AM still works. I'll have it pulled.", t, vehicle(), t.draft.slots);
      assert.equal(
        claims.some((c) => c.text === "invents_slot" && c.severity === "block"),
        false,
      );
    },
  );

  it("blocks a credit-score ask",
    () => {
      const claims = typeFormClaims("What's your credit score?", thread(), vehicle());
      assert.ok(hasBlock(claims, "Credit, income"));
    },
  );

  it("blocks autonomous self-ID",
    () => {
      const claims = typeFormClaims("This is an automated message from LotBeacon.", thread(), vehicle());
      assert.ok(hasBlock(claims, "Nothing autonomous"));
    },
  );

  it("blocks sold-as-available",
    () => {
      const claims = typeFormClaims("Yes, still here on the lot.", thread(), vehicle({ status: "sold" }));
      assert.ok(hasBlock(claims, "sold, pending, or stale"));
    },
  );

  it("suppresses DNC pitches",
    () => {
      const claims = typeFormClaims("Still want to see the F-150 Saturday?", thread({ dnc: true }), vehicle());
      assert.ok(claims.some((c) => c.severity === "block" && /opted out|Opt-out/i.test(c.reason)));
    },
  );

  it("appends to existing firewall claims instead of replacing them",
    () => {
      const existing: Claim[] = [{ text: "Grounded", severity: "ok", reason: "No prohibited or unverifiable claims." }];
      const t = thread();
      const merged = appendTypeFormClaims(existing, "What's your credit score?", t, vehicle(), t.draft.slots);
      assert.ok(merged.some((c) => c.reason.startsWith(TYPE_FORM_REASON_PREFIX) && c.severity === "block"));
    },
  );

  it("keeps a clean draft send_ready",
    () => {
      const t = thread();
      const judgment = judgeTypeFormLocal({
        draft: { text: "The white 2022 Ford F-150 XLT is on the lot. Saturday 10:00 AM still works. I'll have it pulled." },
        thread: {
          dnc: false,
          channel: "messenger",
          appointmentId: null,
          facts: [],
          lastInbound: "Is the white F-150 still there?",
          lastOutbound: "",
        },
        vehicle: {
          stock: "F150-1",
          ymm: "2022 Ford F-150 XLT",
          vin: "1FTFW1E84NFA00001",
          status: "available",
          price: 42990,
          drivetrain: "4WD",
          miles: 24100,
          fresh: true,
          smoker: false,
          accident: "none",
          thirdRow: false,
          boosterOk: false,
          seats: 5,
          titleStatus: "clean",
        },
        slots: ["Saturday 10:00 AM", "Saturday 11:30 AM"],
        inboundHeat: "Is the white F-150 still there?",
      });
      assert.equal(judgment.gate_action, "send_ready");
      assert.equal(judgment.source, "local");
      assert.ok(judgment.groundedness >= 1);
      const claims = claimsFromJudgment(judgment);
      assert.equal(claims.some((c) => c.severity === "block"), false);
    },
  );
});
