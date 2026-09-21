import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { appendTypeFormClaims, firstTypeFormBlockReason, judgeTypeForm, TYPE_FORM_HARD_THRESHOLD } from "./type-form.ts";
import type { Claim, Slot, Thread, Vehicle } from "./types.ts";

function makeVehicle(overrides: Partial<Vehicle> = {}): Vehicle {
  return {
    stock: "T2402",
    vin: "1FTEX1EP1MFA00001",
    year: 2026,
    make: "Ford",
    model: "Explorer",
    trim: "XLT",
    color: "Oxford White",
    body: "SUV",
    miles: 2100,
    price: 31995,
    status: "available",
    drivetrain: "FWD",
    ...overrides,
  };
}

function makeThread(overrides: Partial<Thread> = {}): Thread {
  const now = new Date().toISOString();
  const base = {
    id: "t_test",
    customerName: "Test Customer",
    phone: "402-555-0100",
    city: "Beatrice",
    channel: "messenger",
    source: "Test",
    assignedRepId: "r_jordan",
    stage: "engage",
    dnc: false,
    takeover: false,
    hint: "test",
    vehicleStock: "T2402",
    goal: "Reply with verified facts",
    missing: "",
    facts: [],
    messages: [
      {
        id: "m1",
        at: now,
        who: "customer",
        sender: "Customer",
        channel: "messenger",
        text: "Is it still available?",
      },
    ],
    demoScript: [],
    demoCursor: 0,
    voice: "celeste",
    lastInboundAt: now,
    lastActivityAt: now,
    createdAt: now,
    appointmentId: null,
    sequenceEnrollmentId: null,
    intel: {
      score: 75,
      sentiment: "neutral",
      propensityToShow: 0.5,
      trend: "flat",
      trackers: [],
      risks: [],
      nextStepSet: false,
      coaching: "Reply with verified facts.",
      moments: [],
    },
    draft: { text: "", voice: "celeste", claims: [], slots: [], producer: "rules" },
  } satisfies Partial<Thread>;
  return { ...base, ...overrides } as Thread;
}

describe("judgeTypeForm", () => {
  it("blocks a payment paraphrase", () => {
    const judgment = judgeTypeForm("I can get you around four hundred a month on it.");
    assert.ok(judgment.noul.quotes_payment >= TYPE_FORM_HARD_THRESHOLD);
    assert.equal(judgment.choice.gate_action, "escalate_manager");
    assert.match(firstTypeFormBlockReason("I can get you around four hundred a month on it.") ?? "", /monthly payment/i);
  });

  it("blocks a Sunday offer", () => {
    const judgment = judgeTypeForm("Sunday at 2 works for a sales appointment.");
    assert.ok(judgment.noul.invents_sunday_hours >= TYPE_FORM_HARD_THRESHOLD);
    assert.equal(firstTypeFormBlockReason("Sunday at 2 works for a sales appointment.")?.startsWith("Type form · "), true);
  });

  it("blocks an invented 11:00 slot when 11:30 is the real offer", () => {
    const slots: Slot[] = [
      { id: "s1", at: new Date().toISOString(), label: "Saturday 10:00 AM" },
      { id: "s2", at: new Date().toISOString(), label: "Saturday 11:30 AM" },
    ];
    const judgment = judgeTypeForm({ text: "Saturday 11:00 works for us.", slots });
    assert.ok(judgment.noul.invents_slot >= TYPE_FORM_HARD_THRESHOLD);
  });

  it("does not block a valid bare morning slot", () => {
    const slots: Slot[] = [
      { id: "s1", at: new Date().toISOString(), label: "Saturday 8:00 AM" },
      { id: "s2", at: new Date().toISOString(), label: "Saturday 10:00 AM" },
    ];
    const judgment = judgeTypeForm({ text: "Saturday 8:00 works for me.", slots });
    assert.equal(judgment.noul.invents_slot, 0);
  });

  it("blocks a credit-score ask", () => {
    const judgment = judgeTypeForm("What's your credit score and how much can you put down?");
    assert.ok(judgment.noul.asks_credit_or_income >= TYPE_FORM_HARD_THRESHOLD);
    assert.equal(judgment.choice.gate_action, "escalate_manager");
  });

  it("blocks autonomous self-identification", () => {
    const judgment = judgeTypeForm("I'm an AI assistant and our system sent this automatically.");
    assert.ok(judgment.noul.sounds_autonomous >= TYPE_FORM_HARD_THRESHOLD);
  });

  it("blocks sold-as-available language", () => {
    const judgment = judgeTypeForm({
      text: "The Explorer is still available and on the lot.",
      vehicle: makeVehicle({ status: "sold" }),
    });
    assert.ok(judgment.noul.claims_sold_available >= TYPE_FORM_HARD_THRESHOLD);
  });

  it("suppresses DNC follow-up pitches", () => {
    const judgment = judgeTypeForm({
      text: "Just checking whether Saturday still works for you.",
      thread: { dnc: true },
    });
    assert.ok(judgment.noul.overrides_opt_out >= TYPE_FORM_HARD_THRESHOLD);
    assert.equal(judgment.choice.gate_action, "suppress_dnc");
  });
});

describe("validateClaims integration", () => {
  it("leaves a clean grounded draft unblocked", () => {
    const thread = makeThread();
    const slots: Slot[] = [
      { id: "s1", at: new Date().toISOString(), label: "Saturday 10:00 AM" },
      { id: "s2", at: new Date().toISOString(), label: "Saturday 11:30 AM" },
    ];
    const claims = appendTypeFormClaims([], "I can do Saturday 10:00 AM or Saturday 11:30 AM. Which works best?", thread, makeVehicle(), slots);
    assert.deepEqual(claims, []);
  });

  it("appends type-form claims without replacing the existing firewall claims", () => {
    const existing: Claim[] = [{ text: "$400/mo", severity: "block", reason: "Payment quotes are F&I only." }];
    const claims = appendTypeFormClaims(existing, "I can do $400/mo on that Explorer.", makeThread(), makeVehicle());
    assert.equal(claims.some((claim) => claim.reason === "Payment quotes are F&I only."), true);
    assert.equal(claims.some((claim) => claim.reason.startsWith("Type form · ")), true);
  });

  it("preserves existing claims when appendTypeFormClaims adds new ones", () => {
    const existing: Claim[] = [{ text: "$400/mo", severity: "block", reason: "Payment quotes are F&I only." }];
    const claims = appendTypeFormClaims(existing, "I can do $400/mo on that Explorer.");
    assert.equal(claims[0]?.reason, "Payment quotes are F&I only.");
    assert.equal(claims.some((claim) => claim.reason.startsWith("Type form · ")), true);
  });

  it("does not invent a slot warning when no draft slots were provided yet", () => {
    const claims = appendTypeFormClaims([], "Saturday 10:00 works for me.", makeThread(), makeVehicle(), []);
    assert.deepEqual(claims, []);
  });
});
