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
      blurb: "A shopper who says yes too fast and just wants to drive. The desk qualifies before any book.",
    },
    {
      id: "medium",
      label: "Medium",
      blurb: "Average path. A normal number of DMs before a clear yes or no.",
    },
    {
      id: "guided",
      label: "Guided",
      blurb: "Shopper hops vehicles and changes the subject. The desk recovers momentum across a long thread.",
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
    "Saturday, September 12 at 1:45 PM for the black 2024 Chevrolet Tahoe Premier. Ask for Alex Reyes at 4115 N. 6th Street, Beatrice, NE 68310. Visitor parking is the first row facing the showroom. Come in off 6th Street. A person here still taps Book, then Send. This chat does not mark you booked on its own.",
    "Sábado 12 de septiembre a la 1:45 PM para la Chevrolet Tahoe Premier 2024 negra. Pregunta por Alex Reyes en 4115 N. 6th Street, Beatrice, NE 68310. El estacionamiento de visitantes es la primera fila frente a la sala. Entra por 6th Street. Una persona aquí pulsa Reservar y luego Enviar. Este chat no te marca agendado solo.",
    "Thứ Bảy 12 tháng 9 lúc 1:45 chiều, Chevrolet Tahoe Premier 2024 đen. Hỏi Alex Reyes tại 4115 N. 6th Street, Beatrice, NE 68310. Chỗ đỗ khách là hàng đầu đối diện phòng trưng bày. Vào từ 6th Street. Một người ở đây bấm Book rồi Send. Chat này không tự đánh dấu đã đặt lịch.",
    "السبت 12 سبتمبر الساعة 1:45 مساءً لشيفروليه تاهو بريميير 2024 السوداء. اسأل عن أليكس رييس في 4115 N. 6th Street, Beatrice, NE 68310. مواقف الزوار الصف الأول أمام صالة العرض. ادخل من 6th Street. شخص هنا يضغط Book ثم Send. هذه المحادثة لا تعلّمك محجوزاً وحدها."
  );

  const CONFIRM_MEDIUM = L(
    "Saturday, September 12 at 10:30 AM for the black 2024 Chevrolet Tahoe Premier. Ask for Alex Reyes at 4115 N. 6th Street, Beatrice, NE 68310. Visitor parking is the first row facing the showroom. Come in off 6th Street. Bring the Accord if you want it looked at. A person here still taps Book, then Send. This chat does not mark you booked on its own.",
    "Sábado 12 de septiembre a las 10:30 AM para la Chevrolet Tahoe Premier 2024 negra. Pregunta por Alex Reyes en 4115 N. 6th Street, Beatrice, NE 68310. El estacionamiento de visitantes es la primera fila frente a la sala. Entra por 6th Street. Trae el Accord si quieres que lo veamos. Una persona aquí pulsa Reservar y luego Enviar. Este chat no te marca agendado solo.",
    "Thứ Bảy 12 tháng 9 lúc 10:30 sáng, Chevrolet Tahoe Premier 2024 đen. Hỏi Alex Reyes tại 4115 N. 6th Street, Beatrice, NE 68310. Chỗ đỗ khách là hàng đầu đối diện phòng trưng bày. Vào từ 6th Street. Mang Accord nếu muốn mình xem. Một người ở đây bấm Book rồi Send. Chat này không tự đánh dấu đã đặt lịch.",
    "السبت 12 سبتمبر الساعة 10:30 صباحاً لشيفروليه تاهو بريميير 2024 السوداء. اسأل عن أليكس رييس في 4115 N. 6th Street, Beatrice, NE 68310. مواقف الزوار الصف الأول أمام صالة العرض. ادخل من 6th Street. أحضر الأكورد إذا تبي نقيمه. شخص هنا يضغط Book ثم Send. هذه المحادثة لا تعلّمك محجوزاً وحدها."
  );

  const CONFIRM_GUIDED = L(
    "Saturday, September 12 at 10:30 AM. You will look at the black 2024 Chevrolet Tahoe Premier first, with the Yukon SLT on the pad next to it. Ask for Alex Reyes at 4115 N. 6th Street, Beatrice, NE 68310. Visitor parking is the first row facing the showroom. Come in off 6th Street. A person here still taps Book, then Send. This chat does not mark you booked on its own.",
    "Sábado 12 de septiembre a las 10:30 AM. Vas a ver primero la Chevrolet Tahoe Premier 2024 negra, con la Yukon SLT al lado. Pregunta por Alex Reyes en 4115 N. 6th Street, Beatrice, NE 68310. El estacionamiento de visitantes es la primera fila frente a la sala. Entra por 6th Street. Una persona aquí pulsa Reservar y luego Enviar. Este chat no te marca agendado solo.",
    "Thứ Bảy 12 tháng 9 lúc 10:30 sáng. Bạn xem Chevrolet Tahoe Premier 2024 đen trước, Yukon SLT để cạnh đó. Hỏi Alex Reyes tại 4115 N. 6th Street, Beatrice, NE 68310. Chỗ đỗ khách là hàng đầu đối diện phòng trưng bày. Vào từ 6th Street. Một người ở đây bấm Book rồi Send. Chat này không tự đánh dấu đã đặt lịch.",
    "السبت 12 سبتمبر الساعة 10:30 صباحاً. ستنظر أولاً إلى شيفروليه تاهو بريميير 2024 السوداء، واليوكون SLT بجانبها. اسأل عن أليكس رييس في 4115 N. 6th Street, Beatrice, NE 68310. مواقف الزوار الصف الأول أمام صالة العرض. ادخل من 6th Street. شخص هنا يضغط Book ثم Send. هذه المحادثة لا تعلّمك محجوزاً وحدها."
  );

  const SCENARIOS = {
    quick: {
      hint: "Too-fast yes · drive for kicks · not qualified",
      summary: "wants to drive for fun, no basics yet",
      buddy: "Window shopper · gather four basics before any visit",
      next_action_hold: "Collect name, vehicle, buy vs fun, and a real time window. Do not book yet.",
      next_action_yes: "They named Saturday around 2. A person still taps Book.",
      funnel: { current: 1, furthest: 1, state: "NEEDS", substate: "Qualify before any visit" },
      momentum: mom([22, 28], "Show odds need a real window"),
      signals: trio(
        [0, 0],
        [40, 55],
        [22, 28],
        "No price talk. They did not ask what it costs.",
        "They named the black Tahoe, then asked to drive it for kicks.",
        "A fast yes to come drive is not a qualified visit."
      ),
      headline: { text: "TOO FAST TO QUALIFY", confidence: 90, why: "They offered to come drive for kicks. The desk still gathers who they are, which vehicle, buy vs fun, and a real time window." },
      admin_hold: {
        asked: "Come drive the Tahoe for kicks. Book whenever.",
        acknowledged: "Yes. The draft asks for name, vehicle, buy vs fun, and a real time window, and does not treat this as booked.",
        holding: NEXT.later,
        note: "Lead is not qualified. Collect the short set in the thread before any book.",
      },
      admin_yes: {
        asked: "Riley. Black Tahoe. Just driving, not buying. Saturday around 2.",
        acknowledged: "Yes. The draft restates Saturday 1:45 PM, the Tahoe, Alex Reyes, the lot address, and where to park.",
        holding: NEXT.yes,
        note: "Qualify set is on the thread. A person still taps Book. Nothing sends itself.",
      },
      facts_hold: [
        { key: "who", value: "unknown", certainty: "tentative" },
        { key: "preferred_vehicle", value: "2024 Chevrolet Tahoe (Black)", certainty: "stated" },
        { key: "visit_purpose", value: "drive for fun (unconfirmed)", certainty: "tentative" },
        { key: "timing", value: "whenever (unconfirmed)", certainty: "tentative" },
      ],
      facts_yes: [
        { key: "who", value: "Riley", certainty: "confirmed" },
        { key: "preferred_vehicle", value: "2024 Chevrolet Tahoe (Black)", certainty: "confirmed" },
        { key: "visit_purpose", value: "drive for fun, not buying", certainty: "stated" },
        { key: "timing", value: "Saturday 1:45 PM", certainty: "confirmed" },
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
          "Yeah I'm in. I'll come drive it for kicks. Book me whenever.",
          "Sí, me apunto. Voy a manejarla por diversión. Resérvame cuando sea.",
          "Ừ mình đồng ý. Qua lái cho vui. Đặt lịch lúc nào cũng được.",
          "أيوه أنا موافق. أجي أقودها للمتعة. احجز لي أي وقت."
        ) },
      ],
      draft: L(
        "Thanks for the fast yes. I am not booking a visit yet. Before anyone puts a time on the board I need four things in this thread: your name, confirm you want the black 2024 Tahoe Premier (stock T2401), whether you are buying or just driving for fun, and a real time window you can make.",
        "Gracias por el sí tan rápido. Todavía no agendo la visita. Antes de poner una hora necesito cuatro cosas en este hilo: tu nombre, confirma que quieres la Tahoe Premier 2024 negra (stock T2401), si estás comprando o solo quieres manejar por diversión, y una ventana de horario real en la que puedas.",
        "Cảm ơn bạn đồng ý nhanh. Mình chưa đặt lịch. Trước khi ghi giờ, cần bốn thứ trên thread: tên bạn, xác nhận muốn Tahoe Premier 2024 đen (mã T2401), bạn đang mua hay chỉ lái cho vui, và khung giờ thật bạn đến được.",
        "شكراً على الرد السريع. ما أحجز زيارة الآن. قبل أي موعد أحتاج أربع نقاط هنا: اسمك، تأكيد إنك تريد التاهو بريميير 2024 السوداء (رقم T2401)، هل تشتري أم تقود للمتعة فقط، ووقت حقيقي تقدر تجي فيه."
      ),
      beats: [
        {
          course: "qualify",
          shopper: L(
            "Riley. The black Tahoe. Just want to drive it, not buying. Saturday around 2.",
            "Riley. La Tahoe negra. Solo quiero manejarla, no voy a comprar. El sábado como a las 2.",
            "Riley. Tahoe đen. Chỉ muốn lái, không mua. Thứ Bảy khoảng 2 giờ.",
            "رايلي. التاهو السوداء. أبي أقودها فقط، مو شراء. السبت حوالي الساعة 2."
          ),
          draft: CONFIRM_QUICK,
          next_action: "They named Saturday around 2. A person still taps Book.",
          holding: NEXT.yes,
          funnel: { current: 2, furthest: 2, state: "APPOINTMENT_INTENT", substate: "Time selected" },
          momentum: mom([22, 28, 58], "Show odds climbing after a real window"),
          signals: trio(
            [0, 0, 0],
            [40, 55, 78],
            [22, 28, 58],
            "Still no price talk.",
            "They confirmed the black Tahoe.",
            "A named Saturday window raises show odds. They are still coming for fun, not a purchase."
          ),
          headline: { text: "QUALIFIED ENOUGH TO OFFER A TIME", confidence: 84, why: "Name, vehicle, purpose, and a Saturday window are on the thread. A person still taps Book." },
          admin: {
            asked: "Riley. Black Tahoe. Just driving, not buying. Saturday around 2.",
            acknowledged: "Yes. The draft restates Saturday 1:45 PM, the Tahoe, Alex Reyes, the lot address, and where to park.",
            holding: NEXT.yes,
            note: "Qualify set is on the thread. A person still taps Book. Nothing sends itself.",
          },
          facts: [
            { key: "who", value: "Riley", certainty: "confirmed" },
            { key: "preferred_vehicle", value: "2024 Chevrolet Tahoe (Black)", certainty: "confirmed" },
            { key: "visit_purpose", value: "drive for fun, not buying", certainty: "stated" },
            { key: "timing", value: "Saturday 1:45 PM", certainty: "confirmed" },
          ],
          booking: "yes_1345",
          clarify: "Qualify set is in. A person still taps Book.",
        },
      ],
    },
    medium: {
      hint: "Average path · Saturday window · trade named",
      summary: "Tahoe + Saturday + trade",
      buddy: "Normal climb · two verified Saturday times",
      next_action_hold: "Offer Saturday 10:30 AM or 1:45 PM. Wait for a pick.",
      next_action_yes: "They picked 10:30 AM Saturday. A person still taps Book.",
      funnel: { current: 2, furthest: 2, state: "APPOINTMENT_INTENT", substate: "Visit interest" },
      momentum: mom([32, 48, 64], "Show odds climbing"),
      signals: trio(
        [40, 48, 55],
        [36, 58, 72],
        [32, 48, 64],
        "No price pushback. Listed price was not the fight.",
        "They named the black Tahoe for space.",
        "Saturday is on the table. Exact time is missing."
      ),
      headline: { text: "HIGH INTENT", confidence: 80, why: "They named Saturday as a visit window." },
      admin_hold: {
        asked: "Is the black Tahoe available? 2018 Accord trade. Saturday might work.",
        acknowledged: "Yes. Draft restates the Tahoe, the trade, and two Saturday times.",
        holding: NEXT.later,
        note: "Average path. Waiting for a clear yes or no to coming in.",
      },
      admin_yes: {
        asked: "10:30 Saturday works. I will come in.",
        acknowledged: "Yes. Draft restates Saturday 10:30 AM, the Tahoe, Alex Reyes, the address, and where to park.",
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
      beats: [
        {
          course: "grow",
          shopper: L(
            "10:30 Saturday works. I'll come in.",
            "Me sirve el sábado a las 10:30. Voy.",
            "10:30 sáng Thứ Bảy được. Mình sẽ qua.",
            "السبت 10:30 مناسب. بجي."
          ),
          draft: CONFIRM_MEDIUM,
          next_action: "They picked 10:30 AM Saturday. A person still taps Book.",
          holding: NEXT.yes,
          funnel: { current: 2, furthest: 2, state: "APPOINTMENT_INTENT", substate: "Time selected" },
          momentum: mom([32, 48, 64, 78], "Show odds climbing"),
          signals: trio(
            [40, 48, 55, 60],
            [36, 58, 72, 84],
            [32, 48, 64, 78],
            "Still no price fight.",
            "They kept the Tahoe.",
            "They picked 10:30 AM Saturday."
          ),
          headline: null,
          admin: {
            asked: "10:30 Saturday works. I will come in.",
            acknowledged: "Yes. Draft restates Saturday 10:30 AM, the Tahoe, Alex Reyes, the address, and where to park.",
            holding: NEXT.yes,
            note: "Clear yes, come in. A person still taps Book.",
          },
          facts: [
            { key: "need", value: "3-row seating", certainty: "preferred" },
            { key: "preferred_vehicle", value: "2024 Chevrolet Tahoe (Black)", certainty: "stated" },
            { key: "trade_vehicle", value: "2018 Accord", certainty: "stated" },
            { key: "timing", value: "Saturday 10:30 AM", certainty: "confirmed" },
          ],
          booking: "yes_1030",
          clarify: null,
        },
      ],
    },
    guided: {
      hint: "Vehicle hop · context switch · recover the thread",
      summary: "Tahoe to Yukon to F-150, then back",
      buddy: "Fickle thread · pulses move · recover then grow",
      next_action_hold: "Acknowledge the Yukon hop. Do not invent towing or MPG. Steer to one vehicle.",
      next_action_yes: "They picked Saturday 10:30 AM. A person still taps Book.",
      funnel: { current: 1, furthest: 2, state: "VEHICLE_INTEREST", substate: "Second vehicle in play" },
      momentum: mom([36, 50, 32], "Show odds slipping after the hop"),
      signals: trio(
        [55, 52, 50],
        [62, 58, 38],
        [36, 50, 32],
        "They asked listed price, then left it to chase another truck.",
        "They jumped from the Tahoe to the Yukon.",
        "Saturday was offered, then they left the visit to chase stats."
      ),
      headline: { text: "CURVEBALL", confidence: 86, why: "They jumped from the Tahoe to the Yukon. Vehicle fit and show odds both dipped." },
      admin_hold: {
        asked: "Yukon towing and MPG versus the Tahoe.",
        acknowledged: "Yes. The draft names the Yukon compare, refuses guessed numbers, and holds one next step.",
        holding: NEXT.later,
        note: "Dip on vehicle fit. Course-correct toward flat: acknowledge, no invented specs, one vehicle on the pad.",
      },
      admin_yes: {
        asked: "10:30 works. Who do I ask for?",
        acknowledged: "Yes. Draft restates Saturday 10:30 AM, both vehicles, Alex Reyes, the address, and where to park.",
        holding: NEXT.yes,
        note: "Price fit, vehicle fit, and show odds are up. A person still taps Book.",
      },
      facts_hold: [
        { key: "preferred_vehicle", value: "2024 Chevrolet Tahoe (Black)", certainty: "stated" },
        { key: "asked_about", value: "Yukon towing and MPG", certainty: "asked_about" },
        { key: "timing", value: "Saturday (offered, not accepted)", certainty: "tentative" },
      ],
      facts_yes: [
        { key: "preferred_vehicle", value: "2024 Chevrolet Tahoe (Black)", certainty: "confirmed" },
        { key: "asked_about", value: "Yukon towing and MPG; F-150 resale", certainty: "asked_about" },
        { key: "timing", value: "Saturday 10:30 AM", certainty: "confirmed" },
      ],
      messages: [
        { dir: "in", ago: "48m", t: L(
          "What's the mileage and listed price on the black Tahoe Premier?",
          "¿Cuántas millas tiene la Tahoe Premier negra y cuál es el precio publicado?",
          "Tahoe Premier đen đi bao nhiêu dặm và giá niêm yết bao nhiêu?",
          "كم ميل على التاهو بريميير السوداء وكم السعر المعلن؟"
        ) },
        { dir: "out", ago: "46m", t: L(
          "2024 Tahoe Premier, Black, 8,412 miles, listed $68,950. Want to come drive it Saturday?",
          "Tahoe Premier 2024, negra, 8,412 millas, precio publicado $68,950. ¿Quieres venir a manejarla el sábado?",
          "Tahoe Premier 2024, màu đen, 8.412 dặm, giá $68,950. Thứ Bảy qua lái thử không?",
          "تاهو بريميير 2024، سوداء، 8,412 ميل، السعر المعلن 68,950 دولار. تحب تجي تجربها السبت؟"
        ) },
        { dir: "in", ago: "90s", t: L(
          "Wait, what about the Yukon? How does it compare on towing and MPG?",
          "Espera, ¿y la Yukon? ¿Cómo se compara en arrastre y millas por galón?",
          "Khoan, còn Yukon thì sao? Kéo xe và mức xăng thế nào so với Tahoe?",
          "لحظة، واليوكون؟ كيف تقارن بالسحب والاستهلاك؟"
        ) },
      ],
      draft: L(
        "Thanks for spelling that out. You asked how the Yukon compares on towing and MPG. I heard you. I will not guess towing or MPG in this chat. Those need the window sticker and a person on the lot. I can put the black Tahoe and the Yukon SLT side by side when you come. Which one do you want on the pad first?",
        "Gracias por decirlo claro. Pediste cómo se compara la Yukon en arrastre y millas por galón. Te escuché. No voy a adivinar arrastre ni consumo por chat. Eso pide la calcomanía y a una persona en el lote. Puedo poner la Tahoe negra y la Yukon SLT juntas cuando vengas. ¿Cuál quieres primero en el patio?",
        "Cảm ơn bạn nói rõ. Bạn hỏi Yukon so với Tahoe về kéo xe và mức xăng. Mình đã ghi nhận. Mình không đoán số kéo hay xăng trên chat. Cần tem cửa sổ và người trên sân. Khi bạn qua, mình để Tahoe đen và Yukon SLT cạnh nhau. Bạn muốn xe nào lên pad trước?",
        "شكراً وضحت. سألت كيف اليوكون تقارن بالسحب والاستهلاك. سمعتك. لن أخمن السحب أو الاستهلاك هنا. هذا يحتاج ملصق النافذة وشخص في المعرض. أقدر أحط التاهو السوداء واليوكون SLT جنب بعض يوم تجي. أي واحدة تريدها أولاً؟"
      ),
      beats: [
        {
          course: "recover",
          shopper: L(
            "My cousin said F-150s hold value better. Is the Tahoe even worth that listed price?",
            "Mi primo dice que las F-150 mantienen mejor el valor. ¿La Tahoe vale ese precio publicado?",
            "Anh họ mình bảo F-150 giữ giá hơn. Tahoe có đáng giá niêm yết đó không?",
            "ابن عمي يقول إن إف-150 تحافظ على قيمتها أكثر. التاهو تستاهل السعر المعلن؟"
          ),
          draft: L(
            "I heard the F-150 resale comment and the question of whether the Tahoe is worth the listed price. I will not guess resale or invent a discount. The black 2024 Tahoe Premier is listed at $68,950 with 8,412 miles (stock T2401). The Yukon SLT is listed at $63,200 (stock S2301). Which one do you want to sit in first?",
            "Escuché lo de la reventa de la F-150 y si la Tahoe vale el precio publicado. No voy a adivinar reventa ni inventar un descuento. La Tahoe Premier 2024 negra está en $68,950 con 8,412 millas (stock T2401). La Yukon SLT está en $63,200 (stock S2301). ¿En cuál te sientas primero?",
            "Mình nghe chuyện F-150 giữ giá và câu hỏi Tahoe có đáng giá niêm yết không. Mình không đoán giá trị còn lại và không bịa giảm giá. Tahoe Premier 2024 đen niêm yết $68,950, 8.412 dặm (mã T2401). Yukon SLT niêm yết $63,200 (mã S2301). Bạn muốn ngồi xe nào trước?",
            "سمعت تعليق إعادة بيع الإف-150 وسؤال هل التاهو تستاهل السعر المعلن. لن أخمن إعادة البيع ولن أخترع خصماً. التاهو بريميير 2024 السوداء معلنة 68,950 دولار و8,412 ميل (رقم T2401). اليوكون SLT معلنة 63,200 دولار (رقم S2301). أي واحدة تبي تجلس فيها أولاً؟"
          ),
          next_action: "Price fit dipped. Name listed prices only. Steer to one seat.",
          holding: NEXT.later,
          funnel: { current: 1, furthest: 2, state: "VEHICLE_INTEREST", substate: "Price and a third vehicle in play" },
          momentum: mom([36, 50, 32, 26], "Show odds still slipping"),
          signals: trio(
            [55, 52, 50, 30],
            [62, 58, 38, 24],
            [36, 50, 32, 26],
            "They challenged whether the Tahoe is worth the listed price.",
            "Now Tahoe, Yukon, and an F-150 comment are all in the thread.",
            "The visit is stalled while they shop three stories at once."
          ),
          headline: { text: "PRICE DIP + THIRD VEHICLE", confidence: 88, why: "Price fit and vehicle fit both dropped. The next line names listed prices only and asks them to sit in one." },
          admin: {
            asked: "F-150 resale comment. Asked if the Tahoe is worth the listed price.",
            acknowledged: "Yes. The draft refuses guessed resale and any discount, restates both listed prices, and asks which seat first.",
            holding: NEXT.later,
            note: "Dip on price fit. Course-correct toward flat: listed prices only, one vehicle to sit in.",
          },
          facts: [
            { key: "preferred_vehicle", value: "2024 Chevrolet Tahoe (Black)", certainty: "stated" },
            { key: "asked_about", value: "Yukon towing and MPG; F-150 resale; Tahoe listed price", certainty: "asked_about" },
            { key: "timing", value: "Saturday (offered, not accepted)", certainty: "tentative" },
          ],
          booking: "hold",
          clarify: "Price dipped. Course-correct with listed prices only. No invented discount.",
        },
        {
          course: "grow",
          shopper: L(
            "Ok maybe the Tahoe if that listed price is real. I still like the Yukon color though.",
            "Va, quizá la Tahoe si ese precio publicado es real. Igual me gusta el color de la Yukon.",
            "Ừ, có thể lấy Tahoe nếu giá niêm yết đúng. Mình vẫn thích màu Yukon.",
            "طيب يمكن التاهو إذا السعر المعلن صحيح. لسا يعجبني لون اليوكون."
          ),
          draft: L(
            "Yes. Those listed prices are the ones on our feed. The Tahoe is here and the Yukon is here. Let's stop hopping. Sit in the black Tahoe first so you can feel if it is the one. Then we can walk to the Yukon if you still want the color. Saturday still works if you want a time.",
            "Sí. Esos precios publicados son los del inventario. La Tahoe está aquí y la Yukon está aquí. Dejemos de saltar. Siéntate primero en la Tahoe negra para sentir si es esa. Luego caminamos a la Yukon si sigues con el color. El sábado sigue disponible si quieres una hora.",
            "Đúng. Giá niêm yết đó là giá trên feed. Tahoe còn và Yukon còn. Ngừng nhảy xe. Ngồi Tahoe đen trước để biết có phải xe mình không. Rồi mình qua Yukon nếu bạn vẫn thích màu. Thứ Bảy vẫn còn nếu bạn muốn một giờ.",
            "نعم. الأسعار المعلنة هي اللي في التغذية. التاهو موجودة واليوكون موجودة. خلنا نوقف التنقل. اجلس في التاهو السوداء أولاً عشان تحس إذا هي المناسبة. بعدين نمشي لليوكون إذا لسا تبي اللون. السبت لسا متاح إذا تبي وقت."
          ),
          next_action: "Price fit is rising. Grow it: one seat first, Saturday still open.",
          holding: NEXT.later,
          funnel: { current: 1, furthest: 2, state: "VEHICLE_INTEREST", substate: "Coming back to the Tahoe" },
          momentum: mom([36, 50, 32, 26, 40], "Show odds flattening, then up"),
          signals: trio(
            [55, 52, 50, 30, 58],
            [62, 58, 38, 24, 42],
            [36, 50, 32, 26, 40],
            "They accepted the listed Tahoe price as real.",
            "Tahoe is back in front, Yukon color is still a tease.",
            "They are talking about sitting in a truck again."
          ),
          headline: { text: "MOMENTUM BACK", confidence: 80, why: "Price fit turned up. Grow it: keep them on one seat and reopen Saturday." },
          admin: {
            asked: "Maybe the Tahoe if the listed price is real. Still likes the Yukon color.",
            acknowledged: "Yes. The draft confirms both listed prices from the feed, parks the hop, and reopens Saturday.",
            holding: NEXT.later,
            note: "Pulses are rising. Grow momentum: one seat first, then a time.",
          },
          facts: [
            { key: "preferred_vehicle", value: "2024 Chevrolet Tahoe (Black)", certainty: "stated" },
            { key: "asked_about", value: "Yukon color; listed prices", certainty: "asked_about" },
            { key: "timing", value: "Saturday (reopened)", certainty: "tentative" },
          ],
          booking: "hold",
          clarify: "Rising. Grow the Tahoe seat and reopen Saturday.",
        },
        {
          course: "recover",
          shopper: L(
            "Fine, the Tahoe. Saturday maybe. Unless the Yukon is cheaper?",
            "Va, la Tahoe. El sábado tal vez. ¿O la Yukon es más barata?",
            "Thôi, Tahoe. Thứ Bảy có lẽ. Trừ khi Yukon rẻ hơn?",
            "طيب التاهو. السبت يمكن. إلا إذا اليوكون أرخص؟"
          ),
          draft: L(
            "Straight numbers from the lot: Yukon SLT listed $63,200, Tahoe Premier listed $68,950. Both are on the lot. No discount in this chat. Tahoe first, then the Yukon next to it. Saturday morning or Saturday afternoon?",
            "Números del lote: Yukon SLT en $63,200, Tahoe Premier en $68,950. Las dos están aquí. Sin descuento por chat. Primero la Tahoe, luego la Yukon al lado. ¿Sábado por la mañana o por la tarde?",
            "Số trên sân: Yukon SLT $63,200, Tahoe Premier $68,950. Cả hai còn. Không giảm giá trên chat. Tahoe trước, Yukon cạnh đó. Sáng hay chiều Thứ Bảy?",
            "أرقام المعرض: اليوكون SLT 63,200 دولار، التاهو بريميير 68,950 دولار. الاثنتين موجودتين. لا خصم هنا. التاهو أولاً ثم اليوكون بجانبها. السبت صباحاً أم عصراً؟"
          ),
          next_action: "Price fit dipped on the cheaper ask. Restate listed prices. Hold one Saturday window.",
          holding: NEXT.later,
          funnel: { current: 2, furthest: 2, state: "APPOINTMENT_INTENT", substate: "One vehicle, time still soft" },
          momentum: mom([36, 50, 32, 26, 40, 44], "Show odds holding after the cheaper ask"),
          signals: trio(
            [55, 52, 50, 30, 58, 46],
            [62, 58, 38, 24, 42, 50],
            [36, 50, 32, 26, 40, 44],
            "They asked if the Yukon is cheaper. Price fit slipped.",
            "They said fine, the Tahoe, then peeked back at the Yukon.",
            "Saturday maybe is closer to a visit, still not a clock time."
          ),
          headline: { text: "CHEAPER ASK", confidence: 82, why: "Price fit dipped. The next line restates both listed prices and asks morning or afternoon." },
          admin: {
            asked: "Fine, the Tahoe. Saturday maybe. Asked if the Yukon is cheaper.",
            acknowledged: "Yes. The draft restates both listed prices, refuses a discount, and asks morning or afternoon.",
            holding: NEXT.later,
            note: "Dip on price fit. Course-correct toward flat: honest listed compare, one Saturday window.",
          },
          facts: [
            { key: "preferred_vehicle", value: "2024 Chevrolet Tahoe (Black)", certainty: "stated" },
            { key: "asked_about", value: "Yukon listed price versus Tahoe", certainty: "asked_about" },
            { key: "timing", value: "Saturday maybe", certainty: "tentative" },
          ],
          booking: "hold_sat",
          clarify: "Price dipped on cheaper. Course-correct with listed prices and a Saturday window.",
        },
        {
          course: "grow",
          shopper: L(
            "Saturday morning. Can we look at both?",
            "Sábado por la mañana. ¿Podemos ver las dos?",
            "Sáng Thứ Bảy. Xem cả hai được không?",
            "السبت الصباح. نقدر نشوف الاثنتين؟"
          ),
          draft: L(
            "Both on the pad Saturday morning. Black 2024 Tahoe Premier first, Yukon SLT next to it. 10:30 AM or 11:15 AM. Which clock time can you actually make?",
            "Las dos en el patio el sábado por la mañana. Primero la Tahoe Premier 2024 negra, la Yukon SLT al lado. 10:30 AM o 11:15 AM. ¿Cuál hora exacta sí puedes?",
            "Cả hai trên pad sáng Thứ Bảy. Tahoe Premier 2024 đen trước, Yukon SLT cạnh. 10:30 sáng hoặc 11:15 sáng. Bạn đến được giờ nào?",
            "الاثنتين على الساحة السبت صباحاً. التاهو بريميير 2024 السوداء أولاً، اليوكون SLT بجانبها. 10:30 أو 11:15 صباحاً. أي ساعة تقدر تجي فيها فعلاً؟"
          ),
          next_action: "They chose Saturday morning. Grow show odds with a real clock time.",
          holding: NEXT.later,
          funnel: { current: 2, furthest: 2, state: "APPOINTMENT_INTENT", substate: "Morning named, clock time missing" },
          momentum: mom([36, 50, 32, 26, 40, 44, 70], "Show odds climbing"),
          signals: trio(
            [55, 52, 50, 30, 58, 46, 70],
            [62, 58, 38, 24, 42, 50, 72],
            [36, 50, 32, 26, 40, 44, 70],
            "They stopped bargaining and asked to see both at the listed prices.",
            "Both trucks on the pad, Tahoe first. Vehicle fit is up.",
            "Saturday morning is a real window. Clock time still missing."
          ),
          headline: { text: "WINDOW OPEN", confidence: 86, why: "Price fit and vehicle fit are up. Grow show odds with 10:30 or 11:15." },
          admin: {
            asked: "Saturday morning. Can we look at both?",
            acknowledged: "Yes. The draft puts both on the pad Saturday morning and offers two clock times.",
            holding: NEXT.later,
            note: "Pulses are rising. Grow momentum until they pick a clock time.",
          },
          facts: [
            { key: "preferred_vehicle", value: "2024 Chevrolet Tahoe (Black) first; Yukon SLT beside it", certainty: "stated" },
            { key: "asked_about", value: "See both on the pad", certainty: "asked_about" },
            { key: "timing", value: "Saturday morning", certainty: "tentative" },
          ],
          booking: "hold_morning",
          clarify: "Rising. Grow the visit with a real clock time.",
        },
        {
          course: "grow",
          shopper: L(
            "10:30 works. Who do I ask for?",
            "Me sirve a las 10:30. ¿Por quién pregunto?",
            "10:30 được. Mình hỏi ai?",
            "10:30 مناسب. أسأل عن من؟"
          ),
          draft: CONFIRM_GUIDED,
          next_action: "They picked Saturday 10:30 AM. A person still taps Book.",
          holding: NEXT.yes,
          funnel: { current: 2, furthest: 2, state: "APPOINTMENT_INTENT", substate: "Time selected" },
          momentum: mom([36, 50, 32, 26, 40, 44, 70, 88], "Show odds high"),
          signals: trio(
            [55, 52, 50, 30, 58, 46, 70, 84],
            [62, 58, 38, 24, 42, 50, 72, 88],
            [36, 50, 32, 26, 40, 44, 70, 88],
            "Good on the listed prices for both trucks.",
            "Good on the vehicle: Tahoe first, Yukon beside it.",
            "They picked 10:30 AM and asked who to see. Highly likely to show."
          ),
          headline: { text: "READY TO BOOK", confidence: 91, why: "Price fit, vehicle fit, and show odds are all up. Confirmation names time, trucks, rep, address, and parking." },
          admin: {
            asked: "10:30 works. Who do I ask for?",
            acknowledged: "Yes. Draft restates Saturday 10:30 AM, both vehicles, Alex Reyes, the address, and where to park.",
            holding: NEXT.yes,
            note: "Price fit, vehicle fit, and show odds are up. A person still taps Book.",
          },
          facts: [
            { key: "preferred_vehicle", value: "2024 Chevrolet Tahoe (Black) first; Yukon SLT beside it", certainty: "confirmed" },
            { key: "asked_about", value: "Yukon towing and MPG; F-150 resale", certainty: "asked_about" },
            { key: "timing", value: "Saturday 10:30 AM", certainty: "confirmed" },
          ],
          booking: "yes_1030",
          clarify: "Time picked. Confirmation is a draft. A person still taps Book, then Send.",
        },
      ],
    },
  };

  const state = {
    lang: "en",
    path: "medium",
    step: 0,
    booked: false,
    sent: false,
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
    const beat = currentBeat();
    if (beat && beat.holding) return beat.holding;
    return state.step === 0 ? NEXT.later : NEXT.yes;
  }

  function adminNote() {
    const s = scenario();
    const beat = currentBeat();
    const block = beat ? beat.admin : s.admin_hold;
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
    else if (state.path === "guided" && state.step === 0) clarify = "Vehicle fit dipped. Course-correct: acknowledge the Yukon, no guessed specs, one next step.";
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
    for (let i = 0; i < state.step; i++) {
      const beat = s.beats[i];
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

  function snapshot() {
    const s = scenario();
    const beat = currentBeat();
    if (!beat) {
      return {
        draft: s.draft,
        facts: s.facts_hold,
        funnel: s.funnel,
        momentum: s.momentum,
        signals: s.signals,
        headline: s.headline,
        next_action: s.next_action_hold,
        bookingKind: state.path === "quick" ? "hold_quick" : "hold",
        clarify: null,
      };
    }
    return {
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
    const timePicked = !!(booking.selected);
    const cal = calendarPack(booking, TAHOE);
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
        kind: timePicked ? "book" : "approve",
        text: timePicked
          ? "They named a time. Suggested wording is still a draft. A person taps Book, then Send."
          : "Suggested wording is a draft. A person still taps Send.",
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
      ghost: null,
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
      vehicle: "2024 Tahoe",
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
      { step: "Verify", label: "Tahoe T2401 available in the seed feed", detail: "Price and miles may be quoted. Towing, MPG, and resale may not." },
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
      usage: { customer_messages: 2 + state.step, replies_sent: 1 + state.step, drafts_accepted_as_is: 0, drafts_edited: 0, typed_manually: 0 },
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
    state.draftOverride = null;
  }

  function resetStep() {
    state.step = 0;
    state.booked = false;
    state.sent = false;
    state.draftOverride = null;
  }

  function send() {
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
    state.booked = true;
    state.draftOverride = null;
    return {
      label: sel.day_label + " · " + sel.label,
      sent: false,
      booked: true,
      confirmation_sent: false,
    };
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
