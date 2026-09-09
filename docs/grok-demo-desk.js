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
      blurb: "Shopper offers an easy yes. The desk refuses the bait and double-confirms.",
    },
    {
      id: "medium",
      label: "Medium",
      blurb: "Average path. A normal number of DMs before a clear yes or no.",
    },
    {
      id: "guided",
      label: "Guided",
      blurb: "Stats, a second vehicle, then one qualified next step.",
    },
  ];

  const TAHOE = {
    id: 1,
    stock_number: "T2401",
    vin: "1GNSKSKD5RR123456",
    year: 2024,
    make: "Chevrolet",
    model: "Tahoe",
    trim: "Premier",
    color: "Black",
    body: "SUV",
    drivetrain: "4WD",
    mileage: 8412,
    price: 68950,
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
    vin: "1GKS2CKJ7PR112233",
    year: 2023,
    make: "GMC",
    model: "Yukon",
    trim: "SLT",
    color: "Onyx Black",
    body: "SUV",
    drivetrain: "4WD",
    mileage: 21500,
    price: 63200,
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

  /* Shopper + already-sent rep lines, then the live suggested draft.
     Gloss for non-English is always the English line. */
  const SCENARIOS = {
    quick: {
      hint: "Easy yes early · desk refuses the layup",
      summary: "offered an instant yes",
      buddy: "Layup on the table · qualify before any visit",
      next_action_hold: "Qualify, validate, double-confirm. Do not book yet.",
      next_action_yes: "They confirmed the visit. A person still taps Book.",
      funnel: { current: 1, furthest: 1, state: "NEEDS", substate: "Qualify before booking" },
      momentum: { series: [40, 72], trend: "up", delta: 32, label: "Show-likelihood climbing", score: 72, blocks: 2 },
      signals: [
        { key: "purchase_intent", label: "Purchase intent", series: [40, 88], score: 88, delta: 48, trend: "up", why: "They offered tomorrow at 10 and said they would take it." },
        { key: "price_friction", label: "Price friction", series: [0, 0], score: 0, delta: 0, trend: "flat", why: "No price pushback in this path." },
        { key: "engagement", label: "Engagement", series: [50, 70], score: 70, delta: 20, trend: "up", why: "Short, fast replies." },
        { key: "visit_progression", label: "Visit progression", series: [20, 55], score: 55, delta: 35, trend: "up", why: "They named a time. The desk has not confirmed it." },
        { key: "objection_hints", label: "Objection hints", series: [0, 0], score: 0, delta: 0, trend: "flat", why: "No objection language." },
      ],
      headline: { text: "EASY YES. HOLD.", confidence: 92, why: "They asked to be booked on the spot. A human might grab it. The desk will not." },
      admin_hold: {
        asked: "Book me tomorrow at 10. I will take the Tahoe if it is still there.",
        acknowledged: "Yes. The draft names the time they offered and does not treat it as booked.",
        holding: NEXT.later,
        note: "Layup refused. Qualify the vehicle, the Saturday 10 AM window, and that this is a drive, not a sight-unseen buy.",
      },
      admin_yes: {
        asked: "Yes to all three. Saturday 10 AM, just the drive.",
        acknowledged: "Yes. The draft restates the three confirms.",
        holding: NEXT.yes,
        note: "Qualified next step is yes, come in. A person still taps Book. Chat does not mark them booked.",
      },
      facts_hold: [
        { key: "preferred_vehicle", value: "2024 Chevrolet Tahoe (Black)", certainty: "stated" },
        { key: "timing", value: "tomorrow at 10 (unconfirmed)", certainty: "tentative" },
      ],
      facts_yes: [
        { key: "preferred_vehicle", value: "2024 Chevrolet Tahoe (Black)", certainty: "confirmed" },
        { key: "timing", value: "Saturday 10 AM", certainty: "confirmed" },
      ],
      messages: [
        { dir: "in", ago: "14m", t: L(
          "Hey, is that black Tahoe still on the lot?",
          "Hola, ¿sigue en el lote la Tahoe negra?",
          "Chào, chiếc Tahoe đen còn trên bãi không?",
          "مرحبا، هل التاهو السوداء ما زالت عندكم؟"
        ) },
        { dir: "out", ago: "12m", t: L(
          "Yes. The 2024 Tahoe Premier in Black is here. Want to come see it this week?",
          "Sí. La Tahoe Premier 2024 en negro está aquí. ¿Quieres venir a verla esta semana?",
          "Có. Tahoe Premier 2024 màu đen vẫn ở đây. Bạn muốn qua xem tuần này không?",
          "نعم. تاهو بريميير 2024 السوداء موجودة. تحب تجي تشوفها هذا الأسبوع؟"
        ) },
        { dir: "in", ago: "1m", t: L(
          "Yes. Book me for tomorrow at 10. I'll take it if it's still there.",
          "Sí. Apúntame mañana a las 10. Me la llevo si sigue ahí.",
          "Được. Đặt cho mình ngày mai lúc 10 giờ. Nếu còn thì mình lấy.",
          "نعم. احجز لي غداً الساعة 10. إذا ظلت موجودة آخذها."
        ) },
      ],
      draft: L(
        "Thanks, Riley. I hear you want tomorrow at 10, and I am not booking that yet. Confirm three things first: you want to drive the black 2024 Tahoe Premier (stock T2401), you can get to Beatrice at 10 AM Saturday, and this is a test drive, not a purchase sight unseen. Reply yes to those three and a person here will book the visit.",
        "Gracias, Riley. Te oí: quieres mañana a las 10, y todavía no te agendo. Primero confirma tres cosas: quieres manejar la Tahoe Premier 2024 negra (stock T2401), puedes llegar a Beatrice a las 10 AM el sábado, y esto es una prueba de manejo, no una compra a ciegas. Responde sí a esas tres y una persona aquí agenda la visita.",
        "Cảm ơn Riley. Mình nghe bạn muốn ngày mai lúc 10, và mình chưa đặt lịch. Xác nhận ba việc: bạn muốn lái Tahoe Premier 2024 đen (mã T2401), bạn tới được Beatrice lúc 10 giờ sáng Thứ Bảy, và đây là lái thử chứ không mua khi chưa xem. Trả lời có cho cả ba, rồi một người ở đây mới đặt lịch.",
        "شكراً رايلي. سمعت إنك تريد غداً الساعة 10، وما أحجز الآن. أكد ثلاث نقاط: تريد تجربة التاهو بريميير 2024 السوداء (رقم T2401)، تقدر توصل بيترس الساعة 10 صباح السبت، وهذه تجربة قيادة لا شراء من غير مشاهدة. رد بنعم على الثلاث، وبعدها شخص هنا يحجز الزيارة."
      ),
      after: {
        shopper: L(
          "Yes to all three. Saturday 10 AM, just the drive.",
          "Sí a las tres. Sábado a las 10 AM, solo la prueba de manejo.",
          "Đồng ý cả ba. 10 giờ sáng Thứ Bảy, chỉ lái thử.",
          "نعم للثلاث. السبت الساعة 10 صباحاً، تجربة القيادة فقط."
        ),
        draft: L(
          "Got it. Saturday 10 AM for the black 2024 Tahoe Premier, test drive only. A person still has to tap Book. I will not mark you booked from this chat.",
          "Listo. Sábado a las 10 AM para la Tahoe Premier 2024 negra, solo prueba de manejo. Una persona todavía tiene que pulsar Reservar. No te marco como agendado desde el chat.",
          "Rõ. 10 giờ sáng Thứ Bảy, Tahoe Premier 2024 đen, chỉ lái thử. Một người vẫn phải bấm Book. Mình không đánh dấu đã đặt lịch từ chat.",
          "تمام. السبت 10 صباحاً للتاهو بريميير 2024 السوداء، تجربة قيادة فقط. شخص ما زال يضغط Book. لن أعلّمك محجوزاً من هذه المحادثة."
        ),
      },
    },
    medium: {
      hint: "Average path · Saturday window · trade named",
      summary: "Tahoe + Saturday + trade",
      buddy: "Normal climb · two verified Saturday times",
      next_action_hold: "Offer Saturday 10:30 AM or 1:45 PM. Wait for a pick.",
      next_action_yes: "They picked 10:30 AM Saturday. A person still taps Book.",
      funnel: { current: 2, furthest: 2, state: "APPOINTMENT_INTENT", substate: "Visit interest" },
      momentum: { series: [32, 48, 64], trend: "up", delta: 32, label: "Show-likelihood climbing", score: 64, blocks: 3 },
      signals: [
        { key: "purchase_intent", label: "Purchase intent", series: [36, 52, 70], score: 70, delta: 18, trend: "up", why: "They named the Tahoe and a Saturday window." },
        { key: "price_friction", label: "Price friction", series: [0, 0, 0], score: 0, delta: 0, trend: "flat", why: "No price pushback." },
        { key: "engagement", label: "Engagement", series: [40, 55, 62], score: 62, delta: 7, trend: "up", why: "Steady back and forth." },
        { key: "visit_progression", label: "Visit progression", series: [10, 35, 60], score: 60, delta: 25, trend: "up", why: "Saturday is on the table. Exact time is missing." },
        { key: "objection_hints", label: "Objection hints", series: [0, 0, 0], score: 0, delta: 0, trend: "flat", why: "No objection language." },
      ],
      headline: { text: "HIGH INTENT", confidence: 80, why: "They named Saturday as a visit window." },
      admin_hold: {
        asked: "Is the black Tahoe available? 2018 Accord trade. Saturday might work.",
        acknowledged: "Yes. Draft restates the Tahoe, the trade, and two Saturday times.",
        holding: NEXT.later,
        note: "Average path. Waiting for a clear yes or no to coming in.",
      },
      admin_yes: {
        asked: "10:30 Saturday works. I will come in.",
        acknowledged: "Yes. Draft restates Saturday 10:30 AM.",
        holding: NEXT.yes,
        note: "Clear yes, come in. A person still taps Book.",
      },
      facts_hold: [
        { key: "need", value: "3-row seating", certainty: "preferred" },
        { key: "preferred_vehicle", value: "2024 Chevrolet Tahoe (Black)", certainty: "stated" },
        { key: "trade_vehicle", value: "2018 Accord", certainty: "stated" },
        { key: "timing", value: "Saturday", certainty: "tentative" },
      ],
      facts_yes: [
        { key: "need", value: "3-row seating", certainty: "preferred" },
        { key: "preferred_vehicle", value: "2024 Chevrolet Tahoe (Black)", certainty: "stated" },
        { key: "trade_vehicle", value: "2018 Accord", certainty: "stated" },
        { key: "timing", value: "Saturday 10:30 AM", certainty: "confirmed" },
      ],
      messages: [
        { dir: "in", ago: "38m", t: L(
          "Hi, do you have any 3-row SUVs?",
          "Hola, ¿tienen SUVs de tres filas?",
          "Chào, bên mình có SUV ba hàng ghế không?",
          "مرحبا، عندكم دفع رباعي بثلاث صفوف؟"
        ) },
        { dir: "out", ago: "36m", t: L(
          "Yes we do. What matters most: space, towing, or mileage?",
          "Sí. ¿Qué importa más: espacio, arrastre o millaje?",
          "Có. Bạn cần nhất cái gì: chỗ ngồi, kéo xe, hay số dặm?",
          "نعم. وش الأهم: المساحة، السحب، ولا العداد؟"
        ) },
        { dir: "in", ago: "2m", t: L(
          "Space. The black Tahoe looks right. Still available? I have a 2018 Accord to trade. Saturday might work.",
          "El espacio. La Tahoe negra se ve bien. ¿Sigue disponible? Tengo un Accord 2018 de cambio. El sábado tal vez pueda.",
          "Chỗ ngồi. Tahoe đen hợp. Còn xe không? Mình có Accord 2018 đổi. Thứ Bảy có thể qua.",
          "المساحة. التاهو السوداء مناسبة. لسا موجودة؟ عندي أكورد 2018 للبدل. السبت يمكن أقدر أجي."
        ) },
      ],
      draft: L(
        "Yes, the black 2024 Tahoe Premier is here (stock T2401). We can look at your 2018 Accord when you visit. Saturday 10:30 AM or 1:45 PM. Which one works?",
        "Sí, la Tahoe Premier 2024 negra está aquí (stock T2401). Podemos ver tu Accord 2018 cuando vengas. Sábado 10:30 AM o 1:45 PM. ¿Cuál te sirve?",
        "Có, Tahoe Premier 2024 đen vẫn ở đây (mã T2401). Khi bạn qua mình xem luôn Accord 2018. Thứ Bảy 10:30 sáng hoặc 1:45 chiều. Khung nào tiện?",
        "نعم، تاهو بريميير 2024 السوداء موجودة (رقم T2401). نقدر نقيم أكورد 2018 يوم تجي. السبت 10:30 صباحاً أو 1:45 عصراً. أي وقت يناسبك؟"
      ),
      after: {
        shopper: L(
          "10:30 Saturday works. I'll come in.",
          "Me sirve el sábado a las 10:30. Voy.",
          "10:30 sáng Thứ Bảy được. Mình sẽ qua.",
          "السبت 10:30 مناسب. بجي."
        ),
        draft: L(
          "Saturday 10:30 AM for the black 2024 Tahoe Premier. A person still taps Book to lock the visit. Bring the Accord if you want it looked at.",
          "Sábado 10:30 AM para la Tahoe Premier 2024 negra. Una persona todavía pulsa Reservar para fijar la visita. Trae el Accord si quieres que lo veamos.",
          "10:30 sáng Thứ Bảy, Tahoe Premier 2024 đen. Một người vẫn bấm Book để chốt lịch. Mang Accord nếu muốn mình xem.",
          "السبت 10:30 صباحاً للتاهو بريميير 2024 السوداء. شخص ما زال يضغط Book لتثبيت الزيارة. أحضر الأكورد إذا تبي نقيمه."
        ),
      },
    },
    guided: {
      hint: "Stats ask · jumped to Yukon · steer back",
      summary: "asked Yukon stats, mentioned F-150",
      buddy: "Curveball · two vehicles · hold one next step",
      next_action_hold: "Acknowledge Yukon and F-150. Steer to one vehicle and one Saturday window.",
      next_action_yes: "They chose the Tahoe Saturday morning. A person still taps Book.",
      funnel: { current: 1, furthest: 2, state: "VEHICLE_INTEREST", substate: "Second vehicle in play" },
      momentum: { series: [36, 50, 38], trend: "down", delta: -12, label: "Show-likelihood slipping", score: 38, blocks: 3 },
      signals: [
        { key: "purchase_intent", label: "Purchase intent", series: [40, 55, 48], score: 48, delta: -7, trend: "down", why: "They asked for figures, then jumped vehicles." },
        { key: "price_friction", label: "Price friction", series: [10, 10, 18], score: 18, delta: 8, trend: "up", why: "They asked for listed price, then more numbers." },
        { key: "engagement", label: "Engagement", series: [45, 70, 82], score: 82, delta: 12, trend: "up", why: "Long, distracted message. Still talking." },
        { key: "visit_progression", label: "Visit progression", series: [40, 40, 22], score: 22, delta: -18, trend: "down", why: "Saturday was offered, then they left the visit to chase stats." },
        { key: "objection_hints", label: "Objection hints", series: [0, 0, 12], score: 12, delta: 12, trend: "up", why: "Cousin comparison can stall a visit if unanswered." },
      ],
      headline: { text: "CURVEBALL", confidence: 86, why: "They jumped from the Tahoe to the Yukon and mentioned an F-150." },
      admin_hold: {
        asked: "Yukon towing and MPG versus the Tahoe. Also an F-150 resale comment. Asked for those numbers in chat.",
        acknowledged: "Yes. The draft names the Yukon compare and the F-150 comment, then holds one next step.",
        holding: NEXT.later,
        note: "Acknowledged. Do not invent towing, MPG, or resale. Steer to one vehicle on the pad and one Saturday window.",
      },
      admin_yes: {
        asked: "Ok the Tahoe. Saturday morning if you can.",
        acknowledged: "Yes. Draft restates Tahoe plus Saturday morning.",
        holding: NEXT.yes,
        note: "They picked one vehicle after the jump. Next step is yes, come in. A person still taps Book.",
      },
      facts_hold: [
        { key: "preferred_vehicle", value: "2024 Chevrolet Tahoe (Black)", certainty: "stated" },
        { key: "asked_about", value: "Yukon towing and MPG; F-150 resale", certainty: "asked_about" },
        { key: "timing", value: "Saturday (offered, not accepted)", certainty: "tentative" },
      ],
      facts_yes: [
        { key: "preferred_vehicle", value: "2024 Chevrolet Tahoe (Black)", certainty: "confirmed" },
        { key: "asked_about", value: "Yukon towing and MPG; F-150 resale", certainty: "asked_about" },
        { key: "timing", value: "Saturday morning", certainty: "confirmed" },
      ],
      messages: [
        { dir: "in", ago: "26m", t: L(
          "What's the mileage and listed price on the black Tahoe Premier?",
          "¿Cuántas millas tiene la Tahoe Premier negra y cuál es el precio publicado?",
          "Tahoe Premier đen đi bao nhiêu dặm và giá niêm yết bao nhiêu?",
          "كم ميل على التاهو بريميير السوداء وكم السعر المعلن؟"
        ) },
        { dir: "out", ago: "24m", t: L(
          "2024 Tahoe Premier, Black, 8,412 miles, listed $68,950. Want to come drive it Saturday?",
          "Tahoe Premier 2024, negra, 8,412 millas, precio publicado $68,950. ¿Quieres venir a manejarla el sábado?",
          "Tahoe Premier 2024, màu đen, 8.412 dặm, giá $68,950. Thứ Bảy qua lái thử không?",
          "تاهو بريميير 2024، سوداء، 8,412 ميل، السعر المعلن 68,950 دولار. تحب تجي تجربها السبت؟"
        ) },
        { dir: "in", ago: "90s", t: L(
          "Wait, what about the Yukon? How does it compare on towing and MPG? My cousin also said F-150s hold value better. Can you send those numbers?",
          "Espera, ¿y la Yukon? ¿Cómo se compara en arrastre y millas por galón? Mi primo dice que las F-150 mantienen mejor el valor. ¿Me mandas esos números?",
          "Khoan, còn Yukon thì sao? Kéo xe và mức xăng thế nào so với Tahoe? Anh họ mình bảo F-150 giữ giá hơn. Gửi giúp mấy số đó được không?",
          "لحظة، واليوكون؟ كيف تقارن بالسحب والاستهلاك؟ ابن عمي يقول إن إف-150 تحافظ على قيمتها أكثر. تقدر ترسل هذه الأرقام؟"
        ) },
      ],
      draft: L(
        "Thanks for spelling that out. You asked how the Yukon compares on towing and MPG, and you mentioned F-150 resale. I heard you. I will not guess towing, MPG, or resale in this chat. Those need the window sticker and a person on the lot. I can put the black Tahoe and the Yukon SLT side by side when you come. Which one do you want on the pad first, Saturday morning or Saturday afternoon?",
        "Gracias por decirlo claro. Pediste cómo se compara la Yukon en arrastre y millas por galón, y mencionaste el valor de reventa de la F-150. Te escuché. No voy a adivinar arrastre, consumo ni reventa por chat. Eso pide la calcomanía y a una persona en el lote. Puedo poner la Tahoe negra y la Yukon SLT juntas cuando vengas. ¿Cuál quieres primero, sábado por la mañana o por la tarde?",
        "Cảm ơn bạn nói rõ. Bạn hỏi Yukon so với Tahoe về kéo xe và mức xăng, và nhắc F-150 giữ giá. Mình đã ghi nhận. Mình không đoán số kéo, xăng hay giá trị còn lại trên chat. Cần tem cửa sổ và người trên sân. Khi bạn qua, mình để Tahoe đen và Yukon SLT cạnh nhau. Bạn muốn xe nào lên pad trước, sáng hay chiều Thứ Bảy?",
        "شكراً وضحت. سألت كيف اليوكون تقارن بالسحب والاستهلاك، وذكرت قيمة إعادة بيع الإف-150. سمعتك. لن أخمن السحب أو الاستهلاك أو إعادة البيع هنا. هذا يحتاج ملصق النافذة وشخص في المعرض. أقدر أحط التاهو السوداء واليوكون SLT جنب بعض يوم تجي. أي واحدة تريدها أولاً، السبت صباحاً أم عصراً؟"
      ),
      after: {
        shopper: L(
          "Ok the Tahoe. Saturday morning if you can.",
          "Va, la Tahoe. Sábado por la mañana si se puede.",
          "Ừ, Tahoe. Sáng Thứ Bảy nếu được.",
          "طيب التاهو. السبت الصباح إذا ممكن."
        ),
        draft: L(
          "Tahoe first, Saturday morning. I still have your Yukon and F-150 questions for the lot visit. A person taps Book to hold the time.",
          "Primero la Tahoe, sábado por la mañana. Sigo con tus preguntas de la Yukon y la F-150 para cuando vengas. Una persona pulsa Reservar para guardar la hora.",
          "Tahoe trước, sáng Thứ Bảy. Câu hỏi Yukon và F-150 mình giữ cho lúc bạn tới. Một người bấm Book để giữ giờ.",
          "التاهو أولاً، السبت صباحاً. أسئلة اليوكون والإف-150 باقية لزيارة المعرض. شخص يضغط Book لحجز الوقت."
        ),
      },
    },
  };

  const state = {
    lang: "en",
    path: "medium",
    step: 0,
    draftOverride: null,
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

  function nextStep() {
    return state.step === 0 ? NEXT.later : NEXT.yes;
  }

  function adminNote() {
    const s = scenario();
    const block = state.step === 0 ? s.admin_hold : s.admin_yes;
    return {
      path: state.path,
      language: state.lang,
      asked: block.asked,
      acknowledged: block.acknowledged,
      holding: block.holding,
      note: block.note,
      demo_copy: state.lang !== "en",
    };
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

  function bookingHold() {
    if (state.path === "quick") {
      return {
        stage: "visit_interest_tentative",
        date: "2026-09-12",
        date_label: "Saturday, September 12",
        timing_text: "tomorrow at 10 (unconfirmed)",
        timing_certainty: "tentative",
        selected: null,
        slots: [],
        missing: ["qualified vehicle", "real Saturday window", "drive vs buy"],
        vehicle: TAHOE,
      };
    }
    return {
      stage: "time_proposed",
      date: "2026-09-12",
      date_label: "Saturday, September 12",
      timing_text: "Saturday",
      timing_certainty: "tentative",
      selected: null,
      slots: [
        { label: "10:30 AM", day_label: "Saturday, September 12", iso: "2026-09-12T10:30:00-05:00" },
        { label: "1:45 PM", day_label: "Saturday, September 12", iso: "2026-09-12T13:45:00-05:00" },
      ],
      missing: ["exact time"],
      vehicle: TAHOE,
    };
  }

  function bookingYes() {
    return {
      stage: "time_selected",
      date: "2026-09-12",
      date_label: "Saturday, September 12",
      timing_text: "Saturday 10:30 AM",
      timing_certainty: "confirmed",
      selected: { label: "10:30 AM", day_label: "Saturday, September 12", iso: "2026-09-12T10:30:00-05:00", source: "customer_named" },
      slots: [],
      missing: [],
      vehicle: TAHOE,
    };
  }

  function msgObj(i, built) {
    return {
      id: 9001 + i,
      direction: built.dir,
      author: built.dir === "in" ? "customer" : "rep",
      sender: built.dir === "in" ? "customer" : "Alex Reyes",
      text: built.text,
      gloss: built.gloss,
      lang: built.lang,
      demo_copy: built.lang !== "en",
      sent_at: "2026-09-09T03:24:14.054855",
      ago: built.ago,
    };
  }

  function draftObj(text, gloss, booking) {
    return {
      id: 9001,
      text: state.draftOverride != null ? state.draftOverride : text,
      gloss: gloss,
      status: "pending",
      risk_level: "green",
      approval_required: true,
      provider: "mock",
      created_at: "2026-09-09T03:26:00.000000",
      structured: {
        intent: "availability",
        recommended_action: "invite_test_drive",
        missing_information: booking.missing || [],
        booking: booking,
        clarify: state.path === "quick" && state.step === 0
          ? "Do not take the layup. Qualify, validate, double-confirm."
          : state.path === "guided" && state.step === 0
            ? "Acknowledge the Yukon and F-150 ask, then one next step."
            : null,
      },
      validation: { claims: [] },
    };
  }

  function detail() {
    const s = scenario();
    const lang = state.lang;
    const confirmed = state.step > 0;
    const messages = s.messages.map(function (m, i) { return msgObj(i, line(m, lang)); });
    if (confirmed) {
      const sent = line({ dir: "out", ago: "20s", t: s.draft }, lang);
      messages.push(msgObj(messages.length, sent));
      const shop = line({ dir: "in", ago: "8s", t: s.after.shopper }, lang);
      messages.push(msgObj(messages.length, shop));
    }
    const draftPack = confirmed ? s.after.draft : s.draft;
    const booking = confirmed ? bookingYes() : bookingHold();
    const facts = factList(confirmed ? s.facts_yes : s.facts_hold);
    const admin = adminNote();
    const nxt = nextStep();
    return {
      id: THREAD_ID,
      customer: { id: THREAD_ID, name: "Riley Cole", psid: "psid_desk_demo", opted_out: false },
      lead_state: s.funnel.state,
      priority: 90,
      priority_reason: "desk demo",
      ai_paused: false,
      voice: "dealer",
      voice_locked: false,
      voice_reason: "auto · dealership default",
      hint: s.hint,
      demo_remaining: confirmed ? 0 : 1,
      demo_path: state.path,
      demo_lang: lang,
      demo_copy: lang !== "en",
      next_step: nxt,
      admin_note: admin,
      funnel: {
        stages: [
          { key: "ENGAGE", label: "Engage" },
          { key: "QUALIFY", label: "Qualify" },
          { key: "BOOK", label: "Book" },
          { key: "VISIT", label: "Visit outcome" },
        ],
        current: confirmed ? 2 : s.funnel.current,
        furthest: 2,
        paused: null,
        state: confirmed ? "APPOINTMENT_INTENT" : s.funnel.state,
        substate: confirmed ? "Time selected" : s.funnel.substate,
      },
      your_move: {
        kind: confirmed ? "book" : "approve",
        text: confirmed
          ? "They said yes, come in. Suggested wording is still a draft. A person sends, then taps Book."
          : "Suggested wording is a draft. A person still taps Send.",
      },
      momentum: Object.assign({ kind: "show_likelihood" }, s.momentum, confirmed ? { series: s.momentum.series.concat([78]), score: 78, trend: "up", delta: 14, label: "Show-likelihood climbing", blocks: s.momentum.blocks + 1 } : {}),
      signals: {
        events: messages.filter(function (m) { return m.direction === "in"; }).length,
        headline: confirmed ? null : s.headline,
        signals: s.signals,
      },
      facts: facts,
      deal_file: {
        notes: [
          { key: "show_likelihood", label: "Show-likelihood", value: (confirmed ? 78 : s.momentum.score) + "% · " + (confirmed ? "Show-likelihood climbing" : s.momentum.label), quote: null, derived: true },
          { key: "admin_ack", label: "Admin note", value: admin.asked, quote: admin.acknowledged, derived: true },
          { key: "next_step", label: "Next step held", value: admin.holding, quote: admin.note, derived: true },
        ],
        forward_text: "Asked: " + admin.asked + "\nAcknowledged: " + admin.acknowledged + "\nHolding: " + admin.holding,
      },
      transitions: [
        { from: "NEW", to: "VEHICLE_MATCH", reason: "synthetic desk path", actor: "demo", at: "2026-09-09T03:26:00.000000", evidence_message_id: 9001 },
      ],
      messages: messages,
      draft: draftObj(pick(draftPack), lang === "en" ? null : draftPack.en, booking),
      booking: booking,
      clarify: (draftObj("", null, booking).structured.clarify),
      vehicle: TAHOE,
      ghost: null,
      window: { channel: "Facebook Messenger", open: true, reason: "inbound_within_window", remaining: "23h 50m", hours_left: 23.8, closing_soon: false },
      ownership: { rep_id: 1, rep_name: "Alex Reyes", ai_drafting: true, line: "AI drafting · Alex Reyes sends · no autonomous sends" },
    };
  }

  function row() {
    const s = scenario();
    const confirmed = state.step > 0;
    const m = Object.assign({ kind: "show_likelihood" }, s.momentum);
    return {
      id: THREAD_ID,
      customer: "Riley Cole",
      channel: "Facebook Messenger",
      bucket: "reply_now",
      waiting: confirmed ? null : "1m 12s",
      waiting_seconds: confirmed ? 0 : 72,
      summary: s.summary,
      hint: s.buddy,
      next_action: confirmed ? s.next_action_yes : s.next_action_hold,
      vehicle: "2024 Tahoe",
      window_left: "23h 50m",
      window_hours_left: 23.8,
      unread: !confirmed,
      owner: 1,
      blocked: false,
      needs_person: false,
      last_customer_message_at: "2026-09-09T03:25:00.054855",
      momentum: m,
      state: confirmed ? "APPOINTMENT_INTENT" : s.funnel.state,
      priority: 90,
    };
  }

  function explain() {
    const s = scenario();
    const admin = adminNote();
    return [
      { step: "Read", label: "Synthetic shopper on the " + s.hint + " path", detail: "Not a live Facebook inbox. Demo copy only." },
      { step: "Remember", label: admin.asked, detail: "Facts stay on this path. Unknown stays unknown." },
      { step: "Verify", label: "Tahoe T2401 available in the seed feed", detail: "Price and miles may be quoted. Towing, MPG, and resale may not." },
      { step: "Stage", label: s.funnel.substate, detail: "Final next step is one of: yes, come in / won't come in / not yet." },
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
      ],
      usage: { customer_messages: 2 + state.step, replies_sent: 1 + state.step, drafts_accepted_as_is: 0, drafts_edited: 0, typed_manually: 0 },
      speed: { first_response: "2m", median_response: "2m" },
      safety: { claims_routed_for_verification: state.path === "guided" ? 1 : 0, blocked_sends: 0, handed_to_a_person: 1, rep_corrections: 0 },
      return: { rep_minutes_saved: 5, rep_cost_saved: 3, expected_gross: 0, prevented_claim_value: 0 },
      assumptions: {},
      explain: ["Numbers on this card are from the synthetic path, not a live store."],
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
    state.draftOverride = null;
  }

  function resetStep() {
    state.step = 0;
    state.draftOverride = null;
  }

  function send() {
    if (state.step === 0) {
      state.step = 1;
      state.draftOverride = null;
      return { demo: { replied: true }, next_thread_id: THREAD_ID };
    }
    return { demo: { replied: false }, next_thread_id: THREAD_ID };
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
    NEXT: NEXT,
    SCENARIOS: SCENARIOS,
    TAHOE: TAHOE,
    YUKON: YUKON,
    state: state,
    setLang: setLang,
    setPath: setPath,
    resetStep: resetStep,
    send: send,
    editDraft: editDraft,
    detail: detail,
    row: row,
    explain: explain,
    impact: impact,
    adminNote: adminNote,
    nextStep: nextStep,
    handles: handles,
    fromQuery: fromQuery,
  };
})(typeof window !== "undefined" ? window : globalThis);
