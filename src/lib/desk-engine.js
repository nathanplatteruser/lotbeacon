// @ts-nocheck
import { createScenarios, MIN_EXCHANGES } from "./desk-scenarios.js";

/* LotBeacon desk demo overlay. Synthetic shopper only. Not a live Facebook inbox.
   Languages: English, Spanish, Vietnamese, Arabic (Nebraska DHHS Language and LEP Report Card 2021, ACS).
   Non-English lines are demo copy, not a certified translation. */
(function (global) {
  const THREAD_ID = 90;
  const NEXT = {
    yes: "yes, come in",
    no: "won't come in",
    later: "not yet",
  };
  const REP_NAME = "Alex Reyes";
  const SEEDED_ADDRESS = "4115 N. 6th Street, Beatrice, NE 68310";
  const SAMPLE_ADDRESS = "Sample lot address (edit before send): 100 Main Street, Your Town, ST 00000";
  const PARKING = "Visitor parking is the first row facing the showroom. Come in off 6th Street.";
  const OUTCOME = {
    label: "Point of the desk",
    line: "Confidence and clarity. More of the window-shopper threads handled, higher chance they convert, higher odds they show. Not a measured claim.",
  };

  const LANGS = [
    { id: "en", label: "English" },
    { id: "es", label: "Spanish" },
    { id: "vi", label: "Vietnamese" },
    { id: "ar", label: "Arabic" },
  ];

  const PATHS = [
    {
      id: "quick",
      label: "Quick",
      blurb: "Four exchanges before any close. Charts fill four ticks, then book, withdraw, or ghost.",
    },
    {
      id: "medium",
      label: "Medium",
      blurb: "Ten exchanges. Average path. Charts climb, dip, recover. A close only at the end.",
    },
    {
      id: "guided",
      label: "Guided",
      blurb: "Fifteen exchanges. Vehicle hop, ghost scare, recover. Watch every tick on both rails.",
    },
  ];

  const TAHOE = {
    id: 1,
    stock_number: "T2401",
    vin: "1FM5K8HC5RGA123456",
    year: 2026,
    make: "Ford",
    model: "Explorer",
    trim: "Platinum",
    color: "Black",
    body: "SUV",
    drivetrain: "4WD",
    mileage: 1840,
    price: 57990,
    status: "available",
    source: "pilot-feed-sim",
    retrieved_at: "2026-09-09T03:25:31.054855",
    fresh: true,
    age_seconds: 120,
    age: "2m",
  };

  const YUKON = {
    id: 3,
    stock_number: "S2301",
    vin: "1FMJU1M8XSEA112233",
    year: 2027,
    make: "Ford",
    model: "Expedition",
    trim: "King Ranch",
    color: "Star White",
    body: "SUV",
    drivetrain: "4WD",
    mileage: 12,
    price: 84900,
    status: "available",
    source: "pilot-feed-sim",
    retrieved_at: "2026-09-09T03:25:31.054855",
    fresh: true,
    age_seconds: 120,
    age: "2m",
  };

  function L(en, es, vi, ar) {
    return { en: en, es: es, vi: vi, ar: ar };
  }

  function pulse(key, label, series, why) {
    const score = series[series.length - 1];
    const prev = series.length > 1 ? series[series.length - 2] : score;
    const delta = score - prev;
    const trend = delta > 0 ? "up" : delta < 0 ? "down" : "flat";
    return { key: key, label: label, series: series.slice(), score: score, delta: delta, trend: trend, why: why };
  }

  function trio(priceSeries, vehicleSeries, showSeries, priceWhy, vehicleWhy, showWhy) {
    return [
      pulse("price_fit", "Price fit", priceSeries, priceWhy),
      pulse("vehicle_fit", "Vehicle fit", vehicleSeries, vehicleWhy),
      pulse("show_odds", "Odds they show", showSeries, showWhy),
    ];
  }

  function mom(series, label) {
    const score = series[series.length - 1];
    const prev = series.length > 1 ? series[series.length - 2] : score;
    const delta = score - prev;
    const trend = delta > 0 ? "up" : delta < 0 ? "down" : "flat";
    return { series: series.slice(), trend: trend, delta: delta, label: label, score: score, blocks: series.length };
  }

  const SLOT_1030 = { label: "10:30 AM", day_label: "Saturday, September 12", iso: "2026-09-12T10:30:00-05:00" };
  const SLOT_1145 = { label: "11:15 AM", day_label: "Saturday, September 12", iso: "2026-09-12T11:15:00-05:00" };
  const SLOT_1345 = { label: "1:45 PM", day_label: "Saturday, September 12", iso: "2026-09-12T13:45:00-05:00" };

  const CONFIRM_QUICK = L(
    "Saturday, September 12 at 1:45 PM for the black 2026 Ford Explorer Platinum. Ask for Alex Reyes at 4115 N. 6th Street, Beatrice, NE 68310. Visitor parking is the first row facing the showroom. Come in off 6th Street. A person here still taps Book, then Send. This chat does not mark you booked on its own.",
    "Sábado 12 de septiembre a la 1:45 PM para la Ford Explorer Platinum 2026 negra. Pregunta por Alex Reyes en 4115 N. 6th Street, Beatrice, NE 68310. El estacionamiento de visitantes es la primera fila frente a la sala. Entra por 6th Street. Una persona aquí pulsa Reservar y luego Enviar. Este chat no te marca agendado solo.",
    "Thứ Bảy 12 tháng 9 lúc 1:45 chiều, Ford Explorer Platinum 2026 đen. Hỏi Alex Reyes tại 4115 N. 6th Street, Beatrice, NE 68310. Chỗ đỗ khách là hàng đầu đối diện phòng trưng bày. Vào từ 6th Street. Một người ở đây bấm Book rồi Send. Chat này không tự đánh dấu đã đặt lịch.",
    "السبت 12 سبتمبر الساعة 1:45 مساءً لفورد إكسبلورر بلاتينيوم 2026 السوداء. اسأل عن أليكس رييس في 4115 N. 6th Street, Beatrice, NE 68310. مواقف الزوار الصف الأول أمام صالة العرض. ادخل من 6th Street. شخص هنا يضغط Book ثم Send. هذه المحادثة لا تعلّمك محجوزاً وحدها."
  );

  const CONFIRM_MEDIUM = L(
    "Saturday, September 12 at 10:30 AM for the black 2026 Ford Explorer Platinum. Ask for Alex Reyes at 4115 N. 6th Street, Beatrice, NE 68310. Visitor parking is the first row facing the showroom. Come in off 6th Street. Bring the Accord if you want it looked at. A person here still taps Book, then Send. This chat does not mark you booked on its own.",
    "Sábado 12 de septiembre a las 10:30 AM para la Ford Explorer Platinum 2026 negra. Pregunta por Alex Reyes en 4115 N. 6th Street, Beatrice, NE 68310. El estacionamiento de visitantes es la primera fila frente a la sala. Entra por 6th Street. Trae el Accord si quieres que lo veamos. Una persona aquí pulsa Reservar y luego Enviar. Este chat no te marca agendado solo.",
    "Thứ Bảy 12 tháng 9 lúc 10:30 sáng, Ford Explorer Platinum 2026 đen. Hỏi Alex Reyes tại 4115 N. 6th Street, Beatrice, NE 68310. Chỗ đỗ khách là hàng đầu đối diện phòng trưng bày. Vào từ 6th Street. Mang Accord nếu muốn mình xem. Một người ở đây bấm Book rồi Send. Chat này không tự đánh dấu đã đặt lịch.",
    "السبت 12 سبتمبر الساعة 10:30 صباحاً لفورد إكسبلورر بلاتينيوم 2026 السوداء. اسأل عن أليكس رييس في 4115 N. 6th Street, Beatrice, NE 68310. مواقف الزوار الصف الأول أمام صالة العرض. ادخل من 6th Street. أحضر الأكورد إذا تبي نقيمه. شخص هنا يضغط Book ثم Send. هذه المحادثة لا تعلّمك محجوزاً وحدها."
  );

  const CONFIRM_GUIDED = L(
    "Saturday, September 12 at 10:30 AM. You will look at the black 2026 Ford Explorer Platinum first, with the Expedition King Ranch on the pad next to it. Ask for Alex Reyes at 4115 N. 6th Street, Beatrice, NE 68310. Visitor parking is the first row facing the showroom. Come in off 6th Street. A person here still taps Book, then Send. This chat does not mark you booked on its own.",
    "Sábado 12 de septiembre a las 10:30 AM. Vas a ver primero la Ford Explorer Platinum 2026 negra, con la Expedition King Ranch al lado. Pregunta por Alex Reyes en 4115 N. 6th Street, Beatrice, NE 68310. El estacionamiento de visitantes es la primera fila frente a la sala. Entra por 6th Street. Una persona aquí pulsa Reservar y luego Enviar. Este chat no te marca agendado solo.",
    "Thứ Bảy 12 tháng 9 lúc 10:30 sáng. Bạn xem Ford Explorer Platinum 2026 đen trước, Expedition King Ranch để cạnh đó. Hỏi Alex Reyes tại 4115 N. 6th Street, Beatrice, NE 68310. Chỗ đỗ khách là hàng đầu đối diện phòng trưng bày. Vào từ 6th Street. Một người ở đây bấm Book rồi Send. Chat này không tự đánh dấu đã đặt lịch.",
    "السبت 12 سبتمبر الساعة 10:30 صباحاً. ستنظر أولاً إلى فورد إكسبلورر بلاتينيوم 2026 السوداء، وإكسبيديشن كينغ راتش بجانبها. اسأل عن أليكس رييس في 4115 N. 6th Street, Beatrice, NE 68310. مواقف الزوار الصف الأول أمام صالة العرض. ادخل من 6th Street. شخص هنا يضغط Book ثم Send. هذه المحادثة لا تعلّمك محجوزاً وحدها."
  );

  const SCENARIOS = createScenarios({ L: L, mom: mom, trio: trio, NEXT: NEXT, CONFIRM_QUICK: CONFIRM_QUICK, CONFIRM_MEDIUM: CONFIRM_MEDIUM, CONFIRM_GUIDED: CONFIRM_GUIDED });

  Object.keys(MIN_EXCHANGES).forEach(function (id) {
    const n = ((SCENARIOS[id] && SCENARIOS[id].beats) || []).length;
    if (n < MIN_EXCHANGES[id]) {
      throw new Error("desk path " + id + " needs " + MIN_EXCHANGES[id] + " beats, has " + n);
    }
  });

  const state = {
    lang: "en",
    path: "medium",
    step: 0,
    booked: false,
    sent: false,
    draftOverride: null,
    close: /** @type {null | "withdrawn" | "ghosted"} */ (null),
  };

  function pick(pack) {
    return pack[state.lang] || pack.en;
  }

  function line(entry, lang) {
    const text = entry.t[lang] || entry.t.en;
    const gloss = lang === "en" ? null : entry.t.en;
    return { text: text, gloss: gloss, lang: lang, dir: entry.dir, ago: entry.ago };
  }

  function scenario() {
    return SCENARIOS[state.path];
  }

  function beats() {
    return scenario().beats || [];
  }

  function maxStep() {
    return beats().length;
  }

  function currentBeat() {
    if (state.step <= 0) return null;
    const list = beats();
    return list[Math.min(state.step, list.length) - 1] || null;
  }

  function nextStep() {
    if (state.close === "withdrawn") return NEXT.no;
    if (state.close === "ghosted") return NEXT.later;
    if (state.booked) return NEXT.yes;
    const beat = currentBeat();
    if (beat && beat.holding) return beat.holding;
    const s = scenario();
    if (s.holding) return s.holding;
    return state.step === 0 ? NEXT.later : NEXT.yes;
  }

  function adminNote() {
    const s = scenario();
    const beat = currentBeat();
    const block = beat ? beat.admin : s.admin_hold;
    const note = {
      path: state.path,
      language: state.lang,
      asked: block.asked,
      acknowledged: block.acknowledged,
      holding: block.holding,
      note: block.note,
      demo_copy: state.lang !== "en",
    };
    if (state.close === "withdrawn") {
      note.holding = NEXT.no;
      note.note = "Closed · will not come in. Charts drop on the last tick.";
    } else if (state.close === "ghosted") {
      note.holding = NEXT.later;
      note.note = "Closed · ghosted. They went silent after the last exchange.";
    } else if (state.booked) {
      note.holding = NEXT.yes;
      note.note = "Closed · booked. A person still taps Send to confirm.";
    }
    return note;
  }

  function factList(rows) {
    return rows.map(function (f, i) {
      return {
        id: 9000 + i,
        key: f.key,
        value: f.value,
        certainty: f.certainty,
        confidence: 0.9,
        evidence: { message_id: 9003, text: pick(scenario().messages[scenario().messages.length - 1].t) },
      };
    });
  }

  function dealerPlace() {
    let address = SEEDED_ADDRESS;
    let sample = false;
    try {
      const meta = global.LB_STATIC && global.LB_STATIC.meta;
      if (meta && meta.dealership && typeof meta.dealership.address === "string" && meta.dealership.address.trim()) {
        address = meta.dealership.address.trim();
      }
    } catch (e) { /* ignore */ }
    if (!address) {
      address = SAMPLE_ADDRESS;
      sample = true;
    }
    return { address: address, parking: PARKING, sample: sample };
  }

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function icsUtc(date) {
    return date.getUTCFullYear() + pad2(date.getUTCMonth() + 1) + pad2(date.getUTCDate()) + "T" + pad2(date.getUTCHours()) + pad2(date.getUTCMinutes()) + pad2(date.getUTCSeconds()) + "Z";
  }

  function calendarPack(booking, vehicle) {
    const sel = booking && booking.selected;
    if (!sel || !sel.iso) return null;
    const start = new Date(sel.iso);
    if (isNaN(start.getTime())) return null;
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    const place = dealerPlace();
    const title = "Test drive · " + vehicle.year + " " + vehicle.make + " " + vehicle.model;
    const details = "Ask for " + REP_NAME + ". " + place.parking + " Human still owns Send. Demo visit only.";
    const loc = place.address;
    const dtStart = icsUtc(start);
    const dtEnd = icsUtc(end);
    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//LotBeacon//Desk Demo//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      "UID:lotbeacon-desk-" + THREAD_ID + "-" + dtStart + "@lotbeacon.demo",
      "DTSTAMP:" + dtStart,
      "DTSTART:" + dtStart,
      "DTEND:" + dtEnd,
      "SUMMARY:" + title,
      "DESCRIPTION:" + details,
      "LOCATION:" + loc,
      "END:VEVENT",
      "END:VCALENDAR",
      "",
    ].join("\r\n");
    const gcal = "https://calendar.google.com/calendar/render?action=TEMPLATE"
      + "&text=" + encodeURIComponent(title)
      + "&dates=" + dtStart + "/" + dtEnd
      + "&location=" + encodeURIComponent(loc)
      + "&details=" + encodeURIComponent(details);
    return {
      filename: "lotbeacon-visit.ics",
      ics: ics,
      ics_href: "data:text/calendar;charset=utf-8," + encodeURIComponent(ics),
      gcal: gcal,
      address: loc,
      parking: place.parking,
      sample: place.sample,
      title: title,
    };
  }

  function bookingFrom(kind) {
    const base = {
      date: "2026-09-12",
      date_label: "Saturday, September 12",
      vehicle: TAHOE,
    };
    if (kind === "yes_1030") {
      return Object.assign({}, base, {
        stage: "time_selected",
        timing_text: "Saturday 10:30 AM",
        timing_certainty: "confirmed",
        selected: Object.assign({ source: "customer_named" }, SLOT_1030),
        time_label: SLOT_1030.label,
        slots: [],
        missing: [],
      });
    }
    if (kind === "yes_1145") {
      return Object.assign({}, base, {
        stage: "time_selected",
        timing_text: "Saturday 11:15 AM",
        timing_certainty: "confirmed",
        selected: Object.assign({ source: "customer_named" }, SLOT_1145),
        time_label: SLOT_1145.label,
        slots: [],
        missing: [],
      });
    }
    if (kind === "yes_1345") {
      return Object.assign({}, base, {
        stage: "time_selected",
        timing_text: "Saturday 1:45 PM",
        timing_certainty: "confirmed",
        selected: Object.assign({ source: "customer_named" }, SLOT_1345),
        time_label: SLOT_1345.label,
        slots: [],
        missing: [],
      });
    }
    if (kind === "hold_morning") {
      return Object.assign({}, base, {
        stage: "time_proposed",
        timing_text: "Saturday morning",
        timing_certainty: "tentative",
        selected: null,
        slots: [SLOT_1030, SLOT_1145],
        missing: ["exact time"],
      });
    }
    if (kind === "hold_sat") {
      return Object.assign({}, base, {
        stage: "time_proposed",
        timing_text: "Saturday",
        timing_certainty: "tentative",
        selected: null,
        slots: [SLOT_1030, SLOT_1345],
        missing: ["exact time"],
      });
    }
    if (state.path === "quick") {
      return Object.assign({}, base, {
        stage: "visit_interest_tentative",
        timing_text: "whenever (unconfirmed)",
        timing_certainty: "tentative",
        selected: null,
        slots: [],
        missing: ["who they are", "buy vs drive for fun", "real time window"],
      });
    }
    return Object.assign({}, base, {
      stage: "time_proposed",
      timing_text: "Saturday",
      timing_certainty: "tentative",
      selected: null,
      slots: [SLOT_1030, SLOT_1345],
      missing: ["exact time"],
    });
  }

  function msgObj(i, built) {
    return {
      id: 9001 + i,
      direction: built.dir,
      author: built.dir === "in" ? "customer" : "rep",
      sender: built.dir === "in" ? "customer" : REP_NAME,
      text: built.text,
      gloss: built.gloss,
      lang: built.lang,
      demo_copy: built.lang !== "en",
      sent_at: "2026-09-09T03:24:14.054855",
      ago: built.ago,
    };
  }

  function draftObj(text, gloss, booking) {
    const beat = currentBeat();
    let clarify = null;
    if (beat && beat.clarify) clarify = beat.clarify;
    else if (state.path === "quick" && state.step === 0) clarify = "Do not book the instant yes. Collect name, vehicle, buy vs fun, and a real time window.";
    else if (state.step < maxStep()) clarify = "Exchange " + state.step + " of " + maxStep() + ". Close is not available yet.";
    else if (state.path === "guided" && state.step === 0) clarify = "Fifteen exchanges before any close. Time picked only at the end.";
    return {
      id: 9001,
      text: state.draftOverride != null ? state.draftOverride : text,
      gloss: gloss,
      status: state.sent ? "sent" : "pending",
      risk_level: "green",
      approval_required: true,
      provider: "mock",
      created_at: "2026-09-09T03:26:00.000000",
      structured: {
        intent: "availability",
        recommended_action: "invite_test_drive",
        missing_information: booking.missing || [],
        booking: booking,
        clarify: clarify,
      },
      validation: { claims: [] },
    };
  }

  function visibleEntries(lang) {
    const s = scenario();
    const out = s.messages.map(function (m) { return line(m, lang); });
    const extra = s.beats || [];
    for (let i = 0; i < state.step; i++) {
      const beat = extra[i];
      if (!beat) break;
      const prevDraft = i === 0 ? s.draft : s.beats[i - 1].draft;
      out.push(line({ dir: "out", ago: (30 - i) + "s", t: prevDraft }, lang));
      out.push(line({ dir: "in", ago: (20 - i) + "s", t: beat.shopper }, lang));
    }
    if (state.sent) {
      const snapDraft = currentBeat() ? currentBeat().draft : s.draft;
      out.push(line({ dir: "out", ago: "just now", t: snapDraft }, lang));
    }
    return out;
  }

  function applyCloseToSnap(snap) {
    const kind = state.booked ? "booked" : state.close;
    if (!kind) return snap;
    function bump(series, d) {
      const last = series.length ? series[series.length - 1] : 0;
      return series.concat([Math.max(0, Math.min(100, last + d))]);
    }
    const dShow = kind === "booked" ? 8 : kind === "withdrawn" ? -38 : -48;
    const dPrice = kind === "booked" ? 4 : -10;
    const dVeh = kind === "booked" ? 6 : kind === "withdrawn" ? -22 : -30;
    const show = bump(snap.momentum.series, dShow);
    const label =
      kind === "booked" ? "On the book" : kind === "withdrawn" ? "Withdrawn — they will not come in" : "Ghosted — no reply";
    const signals = snap.signals.map(function (s) {
      const delta = s.key === "show_odds" ? dShow : s.key === "price_fit" ? dPrice : dVeh;
      const series = bump(s.series, delta);
      const why =
        kind === "booked"
          ? s.why
          : kind === "withdrawn"
            ? "They said they will not come in."
            : "They went silent after the last exchange.";
      return pulse(s.key, s.label, series, why);
    });
    return Object.assign({}, snap, {
      momentum: mom(show, label),
      signals: signals,
      next_action:
        kind === "booked"
          ? snap.next_action
          : kind === "withdrawn"
            ? "Closed · will not come in."
            : "Closed · ghosted.",
    });
  }

  function snapshot() {
    const s = scenario();
    const beat = currentBeat();
    let snap;
    if (!beat) {
      snap = {
        draft: s.draft,
        facts: s.facts_hold,
        funnel: s.funnel,
        momentum: s.momentum,
        signals: s.signals,
        headline: s.headline,
        next_action: s.next_action_hold,
        bookingKind: s.bookingKind || (state.path === "quick" ? "hold_quick" : "hold"),
        clarify: null,
      };
    } else {
      snap = {
        draft: beat.draft,
        facts: beat.facts,
        funnel: beat.funnel,
        momentum: beat.momentum,
        signals: beat.signals,
        headline: beat.headline,
        next_action: beat.next_action,
        bookingKind: beat.booking,
        clarify: beat.clarify,
      };
    }
    return applyCloseToSnap(snap);
  }

  function detail() {
    const s = scenario();
    const lang = state.lang;
    const snap = snapshot();
    const messages = visibleEntries(lang).map(function (built, i) { return msgObj(i, built); });
    let booking = bookingFrom(snap.bookingKind);
    if (state.booked && booking.selected) {
      booking = Object.assign({}, booking, { stage: "booked" });
    }
    const facts = factList(snap.facts);
    const admin = adminNote();
    const nxt = nextStep();
    const required = MIN_EXCHANGES[state.path] || maxStep();
    const closedKind = state.booked ? "booked" : state.close;
    const closed = !!closedKind;
    if (state.step < required && booking.selected) {
      booking = Object.assign({}, booking, {
        selected: null,
        stage: "time_proposed",
        missing: [required - state.step + " exchanges before a close"],
      });
    }
    const timePicked = !!(booking.selected);
    const cal = calendarPack(booking, TAHOE);
    const slots = maxStep() + 2;
    let exchangeLabel;
    if (closedKind === "booked") exchangeLabel = state.sent ? "Closed · booked · confirmation sent" : "Closed · booked";
    else if (closedKind === "withdrawn") exchangeLabel = "Closed · will not come in";
    else if (closedKind === "ghosted") exchangeLabel = "Closed · ghosted";
    else if (state.step >= maxStep()) exchangeLabel = "Ready to close · book, withdraw, or ghost";
    else exchangeLabel = "Exchange " + state.step + " of " + maxStep() + " · not closed";
    return {
      id: THREAD_ID,
      customer: { id: THREAD_ID, name: "Riley Cole", psid: "psid_desk_demo", opted_out: false },
      lead_state: snap.funnel.state,
      priority: 90,
      priority_reason: "desk demo",
      ai_paused: false,
      voice: "dealer",
      voice_locked: false,
      voice_reason: "auto · dealership default",
      hint: s.hint,
      demo_remaining: Math.max(0, maxStep() - state.step),
      demo_path: state.path,
      demo_lang: lang,
      demo_copy: lang !== "en",
      exchange: {
        current: state.step,
        required: required,
        max: maxStep(),
        slots: slots,
        closed: closed,
        closeKind: closedKind,
        label: exchangeLabel,
      },
      next_step: nxt,
      admin_note: admin,
      outcome: OUTCOME,
      place: dealerPlace(),
      funnel: {
        stages: [
          { key: "ENGAGE", label: "Engage" },
          { key: "QUALIFY", label: "Qualify" },
          { key: "BOOK", label: "Book" },
          { key: "VISIT", label: "Visit outcome" },
        ],
        current: snap.funnel.current,
        furthest: snap.funnel.furthest,
        paused: null,
        state: snap.funnel.state,
        substate: snap.funnel.substate,
      },
      your_move: {
        kind: closedKind === "booked" && timePicked ? "book" : closed ? "closed" : "approve",
        text: closed
          ? (closedKind === "booked"
            ? "Booked. Suggested wording is still a draft. A person taps Send to confirm."
            : closedKind === "withdrawn"
              ? "They will not come in. Thread is closed."
              : "They went silent. Thread is closed.")
          : timePicked
            ? "They named a time. Suggested wording is still a draft. A person taps Book, then Send."
            : (state.step >= maxStep()
              ? "Last exchange is in. Close as book, withdraw, or ghost — a person still taps."
              : "Send & next. " + (maxStep() - state.step) + " exchanges left before this thread can close."),
      },
      momentum: Object.assign({ kind: "show_likelihood" }, snap.momentum),
      signals: {
        events: messages.filter(function (m) { return m.direction === "in"; }).length,
        headline: snap.headline,
        signals: snap.signals,
      },
      facts: facts,
      deal_file: {
        notes: [
          { key: "show_likelihood", label: "Odds they show", value: snap.momentum.score + "% · " + snap.momentum.label, quote: null, derived: true },
          { key: "admin_ack", label: "Admin note", value: admin.asked, quote: admin.acknowledged, derived: true },
          { key: "next_step", label: "Next step held", value: admin.holding, quote: admin.note, derived: true },
          { key: "outcome", label: OUTCOME.label, value: OUTCOME.line, quote: null, derived: true },
        ],
        forward_text: "Asked: " + admin.asked + "\nAcknowledged: " + admin.acknowledged + "\nHolding: " + admin.holding,
      },
      transitions: [
        { from: "NEW", to: "VEHICLE_MATCH", reason: "synthetic desk path", actor: "demo", at: "2026-09-09T03:26:00.000000", evidence_message_id: 9001 },
      ],
      messages: messages,
      draft: draftObj(pick(snap.draft), lang === "en" ? null : snap.draft.en, booking),
      booking: booking,
      calendar: cal,
      clarify: (draftObj("", null, booking).structured.clarify),
      vehicle: TAHOE,
      ghost: snap.funnel.state === "NEEDS" && snap.funnel.substate && snap.funnel.substate.indexOf("Ghost") !== -1,
      window: { channel: "Facebook Messenger", open: true, reason: "inbound_within_window", remaining: "23h 50m", hours_left: 23.8, closing_soon: false },
      ownership: { rep_id: 1, rep_name: REP_NAME, ai_drafting: true, line: "AI drafting · Alex Reyes sends · no autonomous sends" },
    };
  }

  function row() {
    const s = scenario();
    const snap = snapshot();
    const confirmed = state.step > 0 && nextStep() === NEXT.yes;
    const m = Object.assign({ kind: "show_likelihood" }, snap.momentum);
    return {
      id: THREAD_ID,
      customer: "Riley Cole",
      channel: "Facebook Messenger",
      bucket: "reply_now",
      waiting: confirmed ? null : "1m 12s",
      waiting_seconds: confirmed ? 0 : 72,
      summary: s.summary,
      hint: s.buddy,
      next_action: snap.next_action,
      vehicle: "2026 Explorer",
      window_left: "23h 50m",
      window_hours_left: 23.8,
      unread: !confirmed,
      owner: 1,
      blocked: false,
      needs_person: false,
      last_customer_message_at: "2026-09-09T03:25:00.054855",
      momentum: m,
      state: snap.funnel.state,
      priority: 90,
    };
  }

  function explain() {
    const s = scenario();
    const admin = adminNote();
    return [
      { step: "Read", label: "Synthetic shopper on the " + s.hint + " path", detail: "Not a live Facebook inbox. Demo copy only." },
      { step: "Remember", label: admin.asked, detail: "Facts stay on this path. Unknown stays unknown." },
      { step: "Verify", label: "Explorer T2401 available in the seed feed", detail: "Price and miles may be quoted. Towing, MPG, and resale may not." },
      { step: "Stage", label: snapshot().funnel.substate, detail: "Final next step is one of: yes, come in / won't come in / not yet." },
      { step: "Decide", label: admin.holding, detail: admin.note },
      { step: "Check", label: "No financing, APR, payment, trade value, or booked claim", detail: "Suggested wording is a draft." },
      { step: "Gate", label: "Human Send", detail: "A person still sends. No autonomous sends." },
    ];
  }

  function impact() {
    return {
      reached: "synthetic desk path",
      headline: [
        "Synthetic conversation. Not a live Facebook inbox.",
        "Suggested wording is a draft. A person still sends.",
        OUTCOME.label + ": " + OUTCOME.line,
      ],
      usage: { customer_messages: 1 + state.step, replies_sent: state.step, drafts_accepted_as_is: 0, drafts_edited: 0, typed_manually: 0 },
      speed: { first_response: "2m", median_response: "2m" },
      safety: { claims_routed_for_verification: state.path === "guided" ? 1 : 0, blocked_sends: 0, handed_to_a_person: 1, rep_corrections: 0 },
      return: { rep_minutes_saved: 5, rep_cost_saved: 3, expected_gross: 0, prevented_claim_value: 0 },
      assumptions: {},
      explain: ["Numbers on this card are from the synthetic path, not a live store.", OUTCOME.line],
    };
  }

  function setLang(id) {
    if (!LANGS.some(function (l) { return l.id === id; })) return;
    state.lang = id;
    state.draftOverride = null;
  }

  function setPath(id) {
    if (!SCENARIOS[id]) return;
    state.path = id;
    state.step = 0;
    state.booked = false;
    state.sent = false;
    state.close = null;
    state.draftOverride = null;
  }

  function resetStep() {
    state.step = 0;
    state.booked = false;
    state.sent = false;
    state.close = null;
    state.draftOverride = null;
  }

  function send() {
    if (state.close) {
      return { demo: { replied: false }, next_thread_id: THREAD_ID };
    }
    if (state.step < maxStep()) {
      state.step += 1;
      state.draftOverride = null;
      return { demo: { replied: true }, next_thread_id: THREAD_ID };
    }
    if (state.booked && !state.sent) {
      state.sent = true;
      state.draftOverride = null;
      return { demo: { replied: false, confirmation_played: true }, next_thread_id: THREAD_ID };
    }
    return { demo: { replied: false }, next_thread_id: THREAD_ID };
  }

  function book() {
    const d = detail();
    const sel = d.booking && d.booking.selected;
    if (!sel) {
      return { label: "No time selected", sent: false, booked: false };
    }
    if (state.step < maxStep()) {
      return { label: "Not yet — " + (maxStep() - state.step) + " exchanges left", sent: false, booked: false };
    }
    state.booked = true;
    state.close = null;
    state.draftOverride = null;
    return {
      label: sel.day_label + " · " + sel.label,
      sent: false,
      booked: true,
      confirmation_sent: false,
    };
  }

  function withdraw() {
    if (state.step < maxStep()) {
      return { label: "Not yet — " + (maxStep() - state.step) + " exchanges left", closed: false };
    }
    state.close = "withdrawn";
    state.booked = false;
    state.sent = false;
    state.draftOverride = null;
    return { label: "Closed · will not come in", closed: true };
  }

  function ghostClose() {
    if (state.step < maxStep()) {
      return { label: "Not yet — " + (maxStep() - state.step) + " exchanges left", closed: false };
    }
    state.close = "ghosted";
    state.booked = false;
    state.sent = false;
    state.draftOverride = null;
    return { label: "Closed · ghosted", closed: true };
  }

  function editDraft(text) {
    state.draftOverride = text;
    const d = detail().draft;
    return d;
  }

  function handles(id) {
    return String(id) === String(THREAD_ID);
  }

  function fromQuery() {
    try {
      const q = new URLSearchParams(location.search);
      if (q.get("lang")) setLang(q.get("lang"));
      if (q.get("path")) setPath(q.get("path"));
    } catch (e) { /* ignore */ }
  }

  global.LB_DESK = {
    THREAD_ID: THREAD_ID,
    LANGS: LANGS,
    PATHS: PATHS,
    MIN_EXCHANGES: MIN_EXCHANGES,
    NEXT: NEXT,
    SCENARIOS: SCENARIOS,
    TAHOE: TAHOE,
    YUKON: YUKON,
    OUTCOME: OUTCOME,
    SEEDED_ADDRESS: SEEDED_ADDRESS,
    SAMPLE_ADDRESS: SAMPLE_ADDRESS,
    PARKING: PARKING,
    REP_NAME: REP_NAME,
    state: state,
    setLang: setLang,
    setPath: setPath,
    resetStep: resetStep,
    send: send,
    book: book,
    withdraw: withdraw,
    ghostClose: ghostClose,
    editDraft: editDraft,
    detail: detail,
    row: row,
    explain: explain,
    impact: impact,
    adminNote: adminNote,
    nextStep: nextStep,
    dealerPlace: dealerPlace,
    calendarPack: calendarPack,
    handles: handles,
    fromQuery: fromQuery,
  };
})(typeof window !== "undefined" ? window : globalThis);

export function getDesk() {
  const g = typeof window !== "undefined" ? window : globalThis;
  return g.LB_DESK;
}
