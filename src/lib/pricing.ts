/** Commercial list — Sept 2026. Rooftop is a 20-seat store license, not 2× Crew. */

export const PLANS = [
  {
    id: "solo",
    name: "Solo",
    for: "One setter on Messenger who still hits Send.",
    price: "$129",
    amount: 129,
    seat: "1 seat · ~$99/mo yearly · about $4 a day",
    bar: "3× value bar ~$387/mo",
    story: "3–5 hrs returned, or one rescued same-day path / 6–8 wks",
    items: ["Attention / action queue", "Thread memory", "Intent ≠ sentiment", "Draft · human Send", "Firewall · manager escalate"],
    founding: "$65",
  },
  {
    id: "crew",
    name: "Crew",
    for: "Five on the floor — setter, closer, manager. The rural pod.",
    price: "$399",
    amount: 399,
    seat: "5 seats · ~$329/mo yearly · +$49/seat overage",
    bar: "3× value bar ~$1,197/mo",
    story: "Shared queue vs five Meta logins · ~½ unit / mo across the pod",
    items: [
      "Everything in Solo",
      "SMS / email / voice — a person still hits Send",
      "CRM push (ADF) on first contact and book",
      "Comms package to F&I / GSM",
      "Team board · shared queue",
    ],
    featured: true,
    founding: "$200",
  },
  {
    id: "rooftop",
    name: "Rooftop",
    for: "Tyler + the floor — 20 seats, Monday huddle, inbound vetting, audit.",
    price: "$1,190",
    amount: 1190,
    seat: "20 seats · ~$990/mo yearly · +$49/seat overage",
    bar: "3× value bar ~$3,570/mo",
    story: "Half a unit / mo, or one avoided $8k walk-back, pays the year",
    items: [
      "Everything in Crew",
      "Owner / GSM dashboard · Monday huddle",
      "Held-at-the-gate intercept log",
      "Inbound sticker checks",
      "Full audit · RAI scorecard",
    ],
    founding: "$595",
  },
] as const;

export const PRICE_LINE = "Solo $129 · Crew $399 · Rooftop $1,190";
export const FOUNDING_LINE = "Solo $65 · Crew $200 · Rooftop $595";
