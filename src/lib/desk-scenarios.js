// @ts-nocheck
/** Desk path scripts. Each beat is one back-and-forth. Close only after min exchanges. */
import { MIN_EXCHANGES } from "./thread-length";

export { MIN_EXCHANGES };

export function createScenarios({ L, mom, trio, NEXT, CONFIRM_QUICK, CONFIRM_MEDIUM, CONFIRM_GUIDED }) {
  function beat(p) {
    return {
      course: p.course || "grow",
      shopper: p.shopper,
      draft: p.draft,
      next_action: p.next_action,
      holding: p.holding,
      funnel: p.funnel,
      momentum: mom(p.show, p.momLabel),
      signals: trio(p.price, p.vehicle, p.show, p.priceWhy, p.vehicleWhy, p.showWhy),
      headline: p.headline || null,
      admin: p.admin,
      facts: p.facts,
      booking: p.booking,
      clarify: p.clarify || null,
    };
  }

  const Q0 = { current: 1, furthest: 1, state: "NEEDS", substate: "Qualify before any visit" };
  const Q1 = { current: 1, furthest: 1, state: "NEEDS", substate: "Name and purpose on the thread" };
  const Q2 = { current: 2, furthest: 2, state: "APPOINTMENT_INTENT", substate: "Saturday named, time not locked" };
  const Q3 = { current: 2, furthest: 2, state: "APPOINTMENT_INTENT", substate: "Window offered, not booked" };
  const BOOK = { current: 2, furthest: 2, state: "APPOINTMENT_INTENT", substate: "Time selected" };
  const GHOST = { current: 1, furthest: 2, state: "NEEDS", substate: "Ghost risk — thread still open" };
  const HOP = { current: 1, furthest: 2, state: "NEEDS", substate: "Vehicle hop — recover before a book" };

  const quickFacts0 = [
    { key: "who", value: "unknown", certainty: "tentative" },
    { key: "preferred_vehicle", value: "2026 Ford Explorer (Black)", certainty: "stated" },
    { key: "visit_purpose", value: "unknown", certainty: "tentative" },
    { key: "timing", value: "whenever (unconfirmed)", certainty: "tentative" },
  ];

  return {
    quick: {
      hint: "Too-fast yes · four exchanges before any close",
      summary: "wants to drive for fun, no basics yet",
      buddy: "Window shopper · four exchanges, then a real window or they walk",
      next_action_hold: "Collect name, vehicle, buy vs fun, and a real time window. Do not book yet.",
      next_action_yes: "They named Saturday 1:45. A person still taps Book.",
      funnel: Q0,
      momentum: mom([22], "Show odds need a real window"),
      signals: trio(
        [8],
        [40],
        [22],
        "No price talk yet — a low idle, not a fight.",
        "They named the black Explorer.",
        "One inbound is not a qualified visit."
      ),
      headline: { text: "TOO FAST TO QUALIFY", confidence: 90, why: "They will try to skip the desk. Four exchanges before any close." },
      admin_hold: {
        asked: "Is the black Explorer still on the lot?",
        acknowledged: "Yes. Draft asks who they are and whether this is a purchase or a joyride. Not booked.",
        holding: NEXT.later,
        note: "Quick path. Four back-and-forths required before Book is even offered.",
      },
      admin_yes: {
        asked: "1:45 Saturday. I'll come drive it. Not buying.",
        acknowledged: "Yes. Draft restates Saturday 1:45 PM, the Explorer, Alex Reyes, the lot address, and parking.",
        holding: NEXT.yes,
        note: "Four exchanges in. Qualify set is on the thread. A person still taps Book.",
      },
      facts_hold: quickFacts0,
      facts_yes: [
        { key: "who", value: "Riley", certainty: "confirmed" },
        { key: "preferred_vehicle", value: "2026 Ford Explorer (Black)", certainty: "confirmed" },
        { key: "visit_purpose", value: "drive for fun, not buying", certainty: "stated" },
        { key: "timing", value: "Saturday 1:45 PM", certainty: "confirmed" },
      ],
      messages: [
        { dir: "in", ago: "1m", t: L(
          "Hey, is that black Explorer still on the lot?",
          "Hola, ¿sigue en el lote la Explorer negra?",
          "Chào, chiếc Explorer đen còn trên bãi không?",
          "مرحبا، هل الإكسبلورر السوداء ما زالت عندكم؟"
        ) },
      ],
      draft: L(
        "Yes. The 2026 Explorer Platinum in Black is here (stock T2401). Who am I talking to, and are you looking to buy or just wanting to drive it?",
        "Sí. La Explorer Platinum 2026 en negro está aquí (stock T2401). ¿Con quién hablo, y estás comprando o solo quieres manejarla?",
        "Có. Explorer Platinum 2026 màu đen vẫn ở đây (mã T2401). Mình đang nói chuyện với ai, và bạn đang mua hay chỉ muốn lái thử?",
        "نعم. إكسبلورر بلاتينيوم 2026 السوداء موجودة (رقم T2401). مع من أتحدث، وهل تشتري أم تبي تجربها فقط؟"
      ),
      beats: [
        beat({
          course: "qualify",
          shopper: L(
            "Riley. I'll come drive it for kicks. Book me whenever.",
            "Riley. Voy a manejarla por diversión. Resérvame cuando sea.",
            "Riley. Mình qua lái cho vui. Đặt lịch lúc nào cũng được.",
            "رايلي. أجي أقودها للمتعة. احجز لي أي وقت."
          ),
          draft: L(
            "Thanks, Riley. I am not booking a visit yet. Confirm you want the black 2026 Explorer Platinum, whether this is a purchase or just a drive, and a real time window you can make.",
            "Gracias, Riley. Todavía no agendo. Confirma que quieres la Explorer Platinum 2026 negra, si esto es compra o solo un manejo, y una ventana de horario real.",
            "Cảm ơn Riley. Mình chưa đặt lịch. Xác nhận bạn muốn Explorer Platinum 2026 đen, đây là mua hay chỉ lái, và một khung giờ thật.",
            "شكراً رايلي. ما أحجز الآن. أكد إنك تريد الإكسبلورر بلاتينيوم 2024 السوداء، هل هذا شراء أم قيادة فقط، ووقت حقيقي تقدر تجي فيه."
          ),
          next_action: "Name is in. Still missing purpose and a real window. Do not book.",
          holding: NEXT.later,
          funnel: Q1,
          show: [22, 30],
          price: [8, 10],
          vehicle: [40, 58],
          momLabel: "Named, still not qualified",
          priceWhy: "Still no price talk. Idle, not a fight.",
          vehicleWhy: "They kept the black Explorer.",
          showWhy: "A fast yes is not a Saturday. Two more exchanges before any close.",
          headline: { text: "NAME IN · STILL TOO FAST", confidence: 78, why: "Riley is on the thread. Purpose and a clock time are not." },
          admin: {
            asked: "Riley. Drive it for kicks. Book whenever.",
            acknowledged: "Yes. Draft refuses whenever. Asks purpose and a real window.",
            holding: NEXT.later,
            note: "Exchange 1 of 4. Not closed.",
          },
          facts: [
            { key: "who", value: "Riley", certainty: "confirmed" },
            { key: "preferred_vehicle", value: "2026 Ford Explorer (Black)", certainty: "stated" },
            { key: "visit_purpose", value: "drive for fun (unconfirmed)", certainty: "tentative" },
            { key: "timing", value: "whenever (unconfirmed)", certainty: "tentative" },
          ],
          booking: "hold_quick",
          clarify: "Do not book the instant yes.",
        }),
        beat({
          course: "qualify",
          shopper: L(
            "Yeah the black one. Just driving, not buying. Saturday maybe.",
            "Sí, la negra. Solo manejar, no comprar. El sábado tal vez.",
            "Ừ, chiếc đen. Chỉ lái, không mua. Thứ Bảy thì có lẽ.",
            "أيوه السوداء. قيادة فقط، مو شراء. السبت يمكن."
          ),
          draft: L(
            "Got it — Riley, black Explorer, driving for fun. Saturday 1:45 PM is open. Is that a window you can actually make, or still whenever?",
            "Entendido: Riley, Explorer negra, manejar por diversión. Sábado 1:45 PM está libre. ¿Es una ventana real o sigue siendo cuando sea?",
            "Rõ — Riley, Explorer đen, lái cho vui. Thứ Bảy 1:45 chiều còn trống. Đó là giờ thật hay vẫn là lúc nào cũng được?",
            "واضح — رايلي، الإكسبلورر السوداء، قيادة للمتعة. السبت 1:45 مساءً متاح. هل هذا وقت حقيقي ولا لسا أي وقت؟"
          ),
          next_action: "Purpose is in. Offer 1:45. Do not treat maybe as booked.",
          holding: NEXT.later,
          funnel: Q2,
          show: [22, 30, 44],
          price: [8, 10, 12],
          vehicle: [40, 58, 72],
          momLabel: "Saturday named, time not locked",
          priceWhy: "Still no price talk. Idle, not a fight.",
          vehicleWhy: "They confirmed the black Explorer.",
          showWhy: "Saturday maybe is not 1:45. Two exchanges left before a close.",
          headline: { text: "SATURDAY IS SOFT", confidence: 70, why: "Purpose is on the thread. The clock is not." },
          admin: {
            asked: "Black Explorer. Driving, not buying. Saturday maybe.",
            acknowledged: "Yes. Draft offers Saturday 1:45 PM and asks if that is real.",
            holding: NEXT.later,
            note: "Exchange 2 of 4. Not closed.",
          },
          facts: [
            { key: "who", value: "Riley", certainty: "confirmed" },
            { key: "preferred_vehicle", value: "2026 Ford Explorer (Black)", certainty: "confirmed" },
            { key: "visit_purpose", value: "drive for fun, not buying", certainty: "stated" },
            { key: "timing", value: "Saturday (unconfirmed)", certainty: "tentative" },
          ],
          booking: "hold_quick",
        }),
        beat({
          course: "qualify",
          shopper: L(
            "Around 2 works. Don't make it a whole sales pitch.",
            "Como a las 2 me sirve. Que no sea todo un discurso de ventas.",
            "Khoảng 2 giờ được. Đừng biến thành buổi bán hàng.",
            "حوالي الساعة 2 تمام. لا تسويها محاضرة بيع."
          ),
          draft: L(
            "Saturday around 2, no pitch. 1:45 PM is the slot on the board. Confirm that clock and I will put Alex Reyes, 4115 N. 6th Street, and visitor parking in the next draft. Still not booked until a person taps Book.",
            "Sábado cerca de las 2, sin discurso. 1:45 PM es el hueco. Confirma esa hora y en el siguiente borrador pongo a Alex Reyes, 4115 N. 6th Street y el estacionamiento. Sigue sin agendar hasta que una persona pulse Reservar.",
            "Thứ Bảy khoảng 2, không thuyết trình. 1:45 chiều là khung trên bảng. Xác nhận giờ đó, bản nháp sau sẽ ghi Alex Reyes, 4115 N. 6th Street và chỗ đỗ. Chưa đặt lịch cho đến khi người bấm Book.",
            "السبت حوالي 2، بدون عرض بيع. 1:45 مساءً هو الموعد على اللوحة. أكد الساعة وبأحط أليكس رييس و4115 N. 6th Street وموقف الزوار في المسودة الجاية. لسا مو محجوز إلى أن يضغط شخص Book."
          ),
          next_action: "They gave a window. Confirm 1:45 before Book appears.",
          holding: NEXT.later,
          funnel: Q3,
          show: [22, 30, 44, 58],
          price: [8, 10, 12, 14],
          vehicle: [40, 58, 72, 80],
          momLabel: "Window offered, not booked",
          priceWhy: "Still no price talk. Idle, not a fight.",
          vehicleWhy: "They held the black Explorer.",
          showWhy: "Around 2 is close. One more exchange before a close.",
          headline: { text: "WINDOW ON THE TABLE", confidence: 82, why: "One more yes to 1:45 and a person can tap Book." },
          admin: {
            asked: "Around 2 works. No sales pitch.",
            acknowledged: "Yes. Draft offers 1:45 PM, no pitch, and still refuses to mark booked.",
            holding: NEXT.later,
            note: "Exchange 3 of 4. Book is still locked.",
          },
          facts: [
            { key: "who", value: "Riley", certainty: "confirmed" },
            { key: "preferred_vehicle", value: "2026 Ford Explorer (Black)", certainty: "confirmed" },
            { key: "visit_purpose", value: "drive for fun, not buying", certainty: "stated" },
            { key: "timing", value: "Saturday around 2", certainty: "tentative" },
          ],
          booking: "hold_quick",
          clarify: "One more confirm. Then Book.",
        }),
        beat({
          course: "qualify",
          shopper: L(
            "1:45 Saturday. I'll come drive it. Not buying.",
            "1:45 el sábado. Voy a manejarla. No voy a comprar.",
            "1:45 chiều Thứ Bảy. Mình qua lái. Không mua.",
            "1:45 السبت. بجي أقودها. مو شراء."
          ),
          draft: CONFIRM_QUICK,
          next_action: "They named Saturday 1:45. A person still taps Book.",
          holding: NEXT.yes,
          funnel: BOOK,
          show: [22, 30, 44, 58, 72],
          price: [8, 10, 12, 14, 16],
          vehicle: [40, 58, 72, 80, 86],
          momLabel: "Show odds after a real window",
          priceWhy: "Never a price fight. They came to drive.",
          vehicleWhy: "Black Explorer held for four exchanges.",
          showWhy: "Four exchanges in. 1:45 is on the thread. A person still taps Book.",
          headline: { text: "QUALIFIED ENOUGH TO OFFER A TIME", confidence: 86, why: "Name, vehicle, purpose, and 1:45 are on the thread. Four exchanges. A person still taps Book." },
          admin: {
            asked: "1:45 Saturday. I'll come drive it. Not buying.",
            acknowledged: "Yes. Draft restates Saturday 1:45 PM, the Explorer, Alex Reyes, the lot address, and parking.",
            holding: NEXT.yes,
            note: "Exchange 4 of 4. Close is a person tapping Book, then Send.",
          },
          facts: [
            { key: "who", value: "Riley", certainty: "confirmed" },
            { key: "preferred_vehicle", value: "2026 Ford Explorer (Black)", certainty: "confirmed" },
            { key: "visit_purpose", value: "drive for fun, not buying", certainty: "stated" },
            { key: "timing", value: "Saturday 1:45 PM", certainty: "confirmed" },
          ],
          booking: "yes_1345",
          clarify: "Qualify set is in. A person still taps Book.",
        }),
      ],
    },
    medium: mediumPath({ L, beat, mom, trio, NEXT, CONFIRM_MEDIUM, Q0, Q2, Q3, BOOK, GHOST }),
    guided: guidedPath({ L, beat, mom, trio, NEXT, CONFIRM_GUIDED, Q0, Q2, Q3, BOOK, GHOST, HOP }),
  };
}

function mediumPath({ L, beat, mom, trio, NEXT, CONFIRM_MEDIUM, Q0, Q2, Q3, BOOK, GHOST }) {
  const facts0 = [
    { key: "need", value: "3-row seating", certainty: "preferred" },
    { key: "preferred_vehicle", value: "unknown", certainty: "tentative" },
    { key: "trade_vehicle", value: "unknown", certainty: "tentative" },
    { key: "timing", value: "unknown", certainty: "tentative" },
  ];
  return {
    hint: "Average path · ten exchanges before any close",
    summary: "Explorer + Saturday + trade",
    buddy: "Normal climb · ten exchanges, then a yes, a no, or a ghost",
    next_action_hold: "Offer Saturday 10:30 AM or 11:15 AM. Wait for a pick. Do not close early.",
    next_action_yes: "They picked 11:15 AM Saturday. A person still taps Book.",
    funnel: Q0,
    momentum: mom([32], "Show odds at first inbound"),
    signals: trio(
      [36],
      [30],
      [32],
      "No price pushback yet.",
      "They asked for a 3-row. Vehicle not named.",
      "One inbound. Nine exchanges left before a close."
    ),
    headline: { text: "AVERAGE PATH · TEN EXCHANGES", confidence: 72, why: "A normal shopper. Do not skip to Book." },
    admin_hold: {
      asked: "Do you have any 3-row SUVs?",
      acknowledged: "Yes. Draft asks what matters most. Not booked.",
      holding: NEXT.later,
      note: "Medium path. Ten back-and-forths before a close.",
    },
    admin_yes: {
      asked: "11:15. I'll come in. Bring the Accord.",
      acknowledged: "Yes. Draft restates Saturday 11:15 AM, the Explorer, the Accord, Alex Reyes, address, parking.",
      holding: NEXT.yes,
      note: "Ten exchanges in. A person still taps Book.",
    },
    facts_hold: facts0,
    facts_yes: [
      { key: "need", value: "3-row seating", certainty: "preferred" },
      { key: "preferred_vehicle", value: "2026 Ford Explorer (Black)", certainty: "stated" },
      { key: "trade_vehicle", value: "2018 Accord", certainty: "stated" },
      { key: "timing", value: "Saturday 11:15 AM", certainty: "confirmed" },
    ],
    messages: [
      { dir: "in", ago: "2m", t: L(
        "Hi, do you have any 3-row SUVs?",
        "Hola, ¿tienen SUVs de tres filas?",
        "Chào, bên mình có SUV ba hàng ghế không?",
        "مرحبا، عندكم دفع رباعي بثلاث صفوف؟"
      ) },
    ],
    draft: L(
      "Yes we do. What matters most: space, towing, or mileage?",
      "Sí. ¿Qué importa más: espacio, arrastre o millaje?",
      "Có. Bạn cần nhất cái gì: chỗ ngồi, kéo xe, hay số dặm?",
      "نعم. وش الأهم: المساحة، السحب، ولا العداد؟"
    ),
    beats: [
      beat({
        shopper: L("Space. The black Explorer looks right.", "El espacio. La Explorer negra se ve bien.", "Chỗ ngồi. Explorer đen hợp.", "المساحة. الإكسبلورر السوداء مناسبة."),
        draft: L(
          "The black 2026 Explorer Platinum is built for that (stock T2401). Still available. Is that the one you want to sit in?",
          "La Explorer Platinum 2026 negra está hecha para eso (stock T2401). Sigue disponible. ¿Es esa en la que te quieres sentar?",
          "Explorer Platinum 2026 đen đúng cho chỗ ngồi (mã T2401). Vẫn còn. Bạn muốn ngồi xe đó chứ?",
          "الإكسبلورر بلاتينيوم 2024 السوداء لهذا (رقم T2401). لسا موجودة. تبونها تقعدوا فيها؟"
        ),
        next_action: "Vehicle named. Confirm it. Do not book.",
        holding: NEXT.later, funnel: Q0,
        show: [32, 40], price: [36, 40], vehicle: [30, 52],
        momLabel: "Vehicle named",
        priceWhy: "No price fight.", vehicleWhy: "They named the black Explorer.", showWhy: "Exchange 1 of 10. Not closed.",
        admin: { asked: "Space. The black Explorer looks right.", acknowledged: "Yes. Draft confirms T2401 is here.", holding: NEXT.later, note: "Exchange 1 of 10." },
        facts: [
          { key: "need", value: "3-row seating", certainty: "preferred" },
          { key: "preferred_vehicle", value: "2026 Ford Explorer (Black)", certainty: "stated" },
          { key: "trade_vehicle", value: "unknown", certainty: "tentative" },
          { key: "timing", value: "unknown", certainty: "tentative" },
        ],
        booking: "hold_sat",
      }),
      beat({
        shopper: L("Still available? I have a 2018 Accord to trade.", "¿Sigue disponible? Tengo un Accord 2018 de cambio.", "Còn xe không? Mình có Accord 2018 đổi.", "لسا موجودة؟ عندي أكورد 2018 للبدل."),
        draft: L(
          "Yes, T2401 is on the lot. We can walk the Accord when you visit — I will not guess a trade number in this thread. When can you come?",
          "Sí, T2401 está en el lote. Vemos el Accord cuando vengas — no voy a adivinar un número de cambio aquí. ¿Cuándo puedes?",
          "Có, T2401 còn trên bãi. Khi qua mình xem Accord — mình không đoán giá đổi trên chat. Bạn đến khi nào?",
          "نعم، T2401 في المعرض. نقيم الأكورد يوم تجي — لن أخمن رقم بدل هنا. متى تقدر تجي؟"
        ),
        next_action: "Trade named. Do not quote a number. Ask a day.",
        holding: NEXT.later, funnel: Q0,
        show: [32, 40, 48], price: [36, 40, 42], vehicle: [30, 52, 64],
        momLabel: "Trade on the thread",
        priceWhy: "No discount ask.", vehicleWhy: "Explorer plus Accord trade.", showWhy: "Exchange 2 of 10. Not closed.",
        admin: { asked: "Still available? 2018 Accord to trade.", acknowledged: "Yes. Draft confirms T2401 and refuses a trade number.", holding: NEXT.later, note: "Exchange 2 of 10." },
        facts: [
          { key: "need", value: "3-row seating", certainty: "preferred" },
          { key: "preferred_vehicle", value: "2026 Ford Explorer (Black)", certainty: "stated" },
          { key: "trade_vehicle", value: "2018 Accord", certainty: "stated" },
          { key: "timing", value: "unknown", certainty: "tentative" },
        ],
        booking: "hold_sat",
      }),
      beat({
        shopper: L("Saturday might work.", "El sábado tal vez pueda.", "Thứ Bảy có thể qua.", "السبت يمكن أقدر أجي."),
        draft: L(
          "Saturday is open. 10:30 AM or 11:15 AM. Which clock time can you actually make?",
          "El sábado está abierto. 10:30 AM o 11:15 AM. ¿Cuál hora exacta sí puedes?",
          "Thứ Bảy còn. 10:30 sáng hoặc 11:15 sáng. Bạn đến được giờ nào?",
          "السبت متاح. 10:30 أو 11:15 صباحاً. أي ساعة تقدر تجي فيها فعلاً؟"
        ),
        next_action: "Saturday is soft. Offer two times. Do not book.",
        holding: NEXT.later, funnel: Q2,
        show: [32, 40, 48, 56], price: [36, 40, 42, 44], vehicle: [30, 52, 64, 70],
        momLabel: "Saturday on the table",
        priceWhy: "Listed price was not the fight.", vehicleWhy: "They kept the Explorer.", showWhy: "Exchange 3 of 10. Exact time missing.",
        headline: { text: "HIGH INTENT · TIME MISSING", confidence: 76, why: "Saturday is named. The clock is not." },
        admin: { asked: "Saturday might work.", acknowledged: "Yes. Draft offers 10:30 or 11:15.", holding: NEXT.later, note: "Exchange 3 of 10." },
        facts: [
          { key: "need", value: "3-row seating", certainty: "preferred" },
          { key: "preferred_vehicle", value: "2026 Ford Explorer (Black)", certainty: "stated" },
          { key: "trade_vehicle", value: "2018 Accord", certainty: "stated" },
          { key: "timing", value: "Saturday", certainty: "tentative" },
        ],
        booking: "hold_morning",
      }),
      beat({
        shopper: L("Morning is better. Can I bring the Accord?", "Mejor por la mañana. ¿Puedo llevar el Accord?", "Sáng thì hơn. Mang Accord được không?", "الصبح أحسن. أقدر أجيب الأكورد؟"),
        draft: L(
          "Yes. Bring the Accord. Saturday morning is 10:30 AM or 11:15 AM. Which one survives the drive?",
          "Sí. Trae el Accord. Sábado por la mañana es 10:30 AM o 11:15 AM. ¿Cuál sobrevive el viaje?",
          "Được. Mang Accord. Sáng Thứ Bảy là 10:30 hoặc 11:15. Giờ nào sống được với đường đi?",
          "نعم. جيب الأكورد. السبت صباحاً 10:30 أو 11:15. أي ساعة تصمد مع الطريق؟"
        ),
        next_action: "Accord invited. Still no clock pick.",
        holding: NEXT.later, funnel: Q2,
        show: [32, 40, 48, 56, 62], price: [36, 40, 42, 44, 46], vehicle: [30, 52, 64, 70, 74],
        momLabel: "Morning preference",
        priceWhy: "No price pushback.", vehicleWhy: "Explorer plus Accord on the pad.", showWhy: "Exchange 4 of 10. Not closed.",
        admin: { asked: "Morning is better. Can I bring the Accord?", acknowledged: "Yes. Draft invites the Accord and keeps both morning slots.", holding: NEXT.later, note: "Exchange 4 of 10." },
        facts: [
          { key: "need", value: "3-row seating", certainty: "preferred" },
          { key: "preferred_vehicle", value: "2026 Ford Explorer (Black)", certainty: "stated" },
          { key: "trade_vehicle", value: "2018 Accord", certainty: "stated" },
          { key: "timing", value: "Saturday morning", certainty: "tentative" },
        ],
        booking: "hold_morning",
      }),
      beat({
        shopper: L("Is 10:30 too early if I am coming from Lincoln?", "¿10:30 es muy temprano si vengo de Lincoln?", "10:30 có sớm quá nếu mình từ Lincoln không?", "10:30 بدري إذا أنا جاي من لنكولن؟"),
        draft: L(
          "Lincoln is about an hour. 10:30 means leaving by 9. 11:15 is the other morning slot if you want slack.",
          "Lincoln es como una hora. 10:30 implica salir a las 9. 11:15 es el otro hueco de la mañana si quieres holgura.",
          "Lincoln khoảng một giờ. 10:30 nghĩa là xuất phát lúc 9. 11:15 là khung sáng còn lại nếu cần chừa giờ.",
          "لنكولن حوالي ساعة. 10:30 يعني تطلع الساعة 9. 11:15 هو الموعد الصباحي الثاني إذا تبي فسحة."
        ),
        next_action: "Drive-time is real. Keep both slots. Do not pick for them.",
        holding: NEXT.later, funnel: Q3,
        show: [32, 40, 48, 56, 62, 58], price: [36, 40, 42, 44, 46, 46], vehicle: [30, 52, 64, 70, 74, 74],
        momLabel: "Drive-time friction",
        priceWhy: "Still no price fight.", vehicleWhy: "Explorer held.", showWhy: "Exchange 5 of 10. A small dip — they have not picked.",
        headline: { text: "DRIVE TIME IS THE FIGHT", confidence: 68, why: "Lincoln to Beatrice. Offer slack. Do not close." },
        admin: { asked: "Is 10:30 too early from Lincoln?", acknowledged: "Yes. Draft names the hour drive and keeps 11:15.", holding: NEXT.later, note: "Exchange 5 of 10." },
        facts: [
          { key: "need", value: "3-row seating", certainty: "preferred" },
          { key: "preferred_vehicle", value: "2026 Ford Explorer (Black)", certainty: "stated" },
          { key: "trade_vehicle", value: "2018 Accord", certainty: "stated" },
          { key: "timing", value: "Saturday morning · Lincoln drive", certainty: "tentative" },
        ],
        booking: "hold_morning",
      }),
      beat({
        shopper: L("Lincoln is about an hour. 10:30 is tight.", "Lincoln es como una hora. 10:30 viene justo.", "Lincoln khoảng một giờ. 10:30 hơi gấp.", "لنكولن حوالي ساعة. 10:30 ضيق."),
        draft: L(
          "Then 11:15 Saturday. Still morning. Still the Explorer and the Accord. Confirm that clock, or say if you need afternoon.",
          "Entonces 11:15 el sábado. Sigue siendo mañana. Sigue la Explorer y el Accord. Confirma esa hora, o di si necesitas la tarde.",
          "Vậy 11:15 Thứ Bảy. Vẫn là sáng. Vẫn Explorer và Accord. Xác nhận giờ đó, hoặc nói nếu cần buổi chiều.",
          "إذن 11:15 السبت. لسا صباح. لسا الإكسبلورر والأكورد. أكد الساعة، أو قل إذا تبي العصر."
        ),
        next_action: "11:15 is the better morning. Still not booked.",
        holding: NEXT.later, funnel: Q3,
        show: [32, 40, 48, 56, 62, 58, 64], price: [36, 40, 42, 44, 46, 46, 48], vehicle: [30, 52, 64, 70, 74, 74, 76],
        momLabel: "11:15 on the table",
        priceWhy: "No price fight.", vehicleWhy: "Explorer plus Accord.", showWhy: "Exchange 6 of 10. 11:15 offered, not locked.",
        admin: { asked: "10:30 is tight from Lincoln.", acknowledged: "Yes. Draft moves the offer to 11:15.", holding: NEXT.later, note: "Exchange 6 of 10." },
        facts: [
          { key: "need", value: "3-row seating", certainty: "preferred" },
          { key: "preferred_vehicle", value: "2026 Ford Explorer (Black)", certainty: "stated" },
          { key: "trade_vehicle", value: "2018 Accord", certainty: "stated" },
          { key: "timing", value: "Saturday 11:15 AM (offered)", certainty: "tentative" },
        ],
        booking: "hold_morning",
      }),
      beat({
        shopper: L("Who do I ask for?", "¿Por quién pregunto?", "Mình hỏi ai?", "أسأل عن من؟"),
        draft: L(
          "Alex Reyes. You are not on the book yet. Confirm 11:15 Saturday and a person here taps Book.",
          "Alex Reyes. Aún no estás en la agenda. Confirma el sábado a las 11:15 y una persona aquí pulsa Reservar.",
          "Alex Reyes. Bạn chưa có trên sổ. Xác nhận 11:15 Thứ Bảy thì người ở đây bấm Book.",
          "أليكس رييس. لسا مو في الجدول. أكد السبت 11:15 وشخص هنا يضغط Book."
        ),
        next_action: "They asked who. Still missing a locked clock.",
        holding: NEXT.later, funnel: Q3,
        show: [32, 40, 48, 56, 62, 58, 64, 70], price: [36, 40, 42, 44, 46, 46, 48, 50], vehicle: [30, 52, 64, 70, 74, 74, 76, 78],
        momLabel: "They asked for a person",
        priceWhy: "No price fight.", vehicleWhy: "Explorer held.", showWhy: "Exchange 7 of 10. Asking for a name is not a book.",
        admin: { asked: "Who do I ask for?", acknowledged: "Yes. Draft names Alex Reyes and refuses to mark booked.", holding: NEXT.later, note: "Exchange 7 of 10." },
        facts: [
          { key: "need", value: "3-row seating", certainty: "preferred" },
          { key: "preferred_vehicle", value: "2026 Ford Explorer (Black)", certainty: "stated" },
          { key: "trade_vehicle", value: "2018 Accord", certainty: "stated" },
          { key: "timing", value: "Saturday 11:15 AM (offered)", certainty: "tentative" },
        ],
        booking: "hold_morning",
      }),
      beat({
        shopper: L("11:15. Do I need an appointment on paper?", "11:15. ¿Necesito una cita en papel?", "11:15. Có cần giấy hẹn không?", "11:15. أحتاج موعد ورقي؟"),
        draft: L(
          "No paper from this chat. Confirm 11:15 Saturday and a person here puts it on our calendar. Bring a license and the Accord.",
          "No hay papel desde este chat. Confirma el sábado a las 11:15 y una persona lo pone en nuestro calendario. Trae licencia y el Accord.",
          "Không có giấy từ chat này. Xác nhận 11:15 Thứ Bảy thì người ở đây ghi lịch. Mang bằng lái và Accord.",
          "ما في ورقة من هالمحادثة. أكد السبت 11:15 وشخص هنا يحطه في تقويمنا. جيب الرخصة والأكورد."
        ),
        next_action: "They leaned 11:15. Still not booked until they say they will come.",
        holding: NEXT.later, funnel: Q3,
        show: [32, 40, 48, 56, 62, 58, 64, 70, 74], price: [36, 40, 42, 44, 46, 46, 48, 50, 52], vehicle: [30, 52, 64, 70, 74, 74, 76, 78, 80],
        momLabel: "11:15 leaned in",
        priceWhy: "No price fight.", vehicleWhy: "Explorer plus Accord.", showWhy: "Exchange 8 of 10. Close is not a paper form.",
        admin: { asked: "11:15. Do I need an appointment on paper?", acknowledged: "Yes. Draft says no paper from chat. Person still taps Book.", holding: NEXT.later, note: "Exchange 8 of 10." },
        facts: [
          { key: "need", value: "3-row seating", certainty: "preferred" },
          { key: "preferred_vehicle", value: "2026 Ford Explorer (Black)", certainty: "stated" },
          { key: "trade_vehicle", value: "2018 Accord", certainty: "stated" },
          { key: "timing", value: "Saturday 11:15 AM (leaning)", certainty: "tentative" },
        ],
        booking: "hold_morning",
      }),
      beat({
        course: "recover",
        shopper: L("I'll think about it. Lot of Saturday stuff.", "Lo pensaré. Tengo bastante el sábado.", "Mình nghĩ lại. Thứ Bảy nhiều việc.", "بفكر. عندي شغل السبت."),
        draft: L(
          "Understood. 11:15 Saturday is still on the board if you want it. I will not chase. The Explorer stays listed until a person here books you, or you tell me to release it.",
          "Entendido. 11:15 el sábado sigue en el tablero si lo quieres. No te voy a perseguir. La Explorer sigue publicada hasta que una persona te agende, o me digas que la suelte.",
          "Rõ. 11:15 Thứ Bảy vẫn trên bảng nếu bạn muốn. Mình không đuổi. Explorer vẫn niêm yết đến khi người ở đây đặt cho bạn, hoặc bạn bảo bỏ.",
          "مفهوم. 11:15 السبت لسا على اللوحة إذا تبيه. لن ألاحق. الإكسبلورر تبقى معلنة إلى أن يحجزك شخص هنا، أو تقول لي أفلتها."
        ),
        next_action: "Ghost risk. Hold 11:15. Do not close as lost.",
        holding: NEXT.later, funnel: GHOST,
        show: [32, 40, 48, 56, 62, 58, 64, 70, 74, 42], price: [36, 40, 42, 44, 46, 46, 48, 50, 52, 50], vehicle: [30, 52, 64, 70, 74, 74, 76, 78, 80, 72],
        momLabel: "Ghost risk — thread still open",
        priceWhy: "Not a price objection. A calendar objection.",
        vehicleWhy: "Explorer still preferred, show odds dropped.",
        showWhy: "Exchange 9 of 10. They blinked. One more exchange before a close.",
        headline: { text: "GHOST RISK", confidence: 60, why: "I'll think about it is not a no. Hold the slot. Do not mark lost." },
        admin: { asked: "I'll think about it. Lot of Saturday stuff.", acknowledged: "Yes. Draft holds 11:15, refuses to chase, refuses to close as lost.", holding: NEXT.later, note: "Exchange 9 of 10. Ghost risk, not a close." },
        facts: [
          { key: "need", value: "3-row seating", certainty: "preferred" },
          { key: "preferred_vehicle", value: "2026 Ford Explorer (Black)", certainty: "stated" },
          { key: "trade_vehicle", value: "2018 Accord", certainty: "stated" },
          { key: "timing", value: "Saturday 11:15 AM · thinking", certainty: "tentative" },
        ],
        booking: "hold_morning",
        clarify: "Ghost risk. Thread stays open.",
      }),
      beat({
        shopper: L("11:15. I'll come in. Bring the Accord.", "11:15. Voy. Llevo el Accord.", "11:15. Mình sẽ qua. Mang Accord.", "11:15. بجي. بجيب الأكورد."),
        draft: CONFIRM_MEDIUM_1115(L, CONFIRM_MEDIUM),
        next_action: "They picked 11:15 AM Saturday. A person still taps Book.",
        holding: NEXT.yes, funnel: BOOK,
        show: [32, 40, 48, 56, 62, 58, 64, 70, 74, 42, 84], price: [36, 40, 42, 44, 46, 46, 48, 50, 52, 50, 54], vehicle: [30, 52, 64, 70, 74, 74, 76, 78, 80, 72, 88],
        momLabel: "Show odds after they came back",
        priceWhy: "Never a price fight.",
        vehicleWhy: "Explorer plus Accord, recovered.",
        showWhy: "Ten exchanges. They came back. A person still taps Book.",
        headline: { text: "READY TO BOOK", confidence: 88, why: "Ten exchanges. Ghost scare, then a clear 11:15. A person still taps Book." },
        admin: { asked: "11:15. I'll come in. Bring the Accord.", acknowledged: "Yes. Draft restates Saturday 11:15 AM, the Explorer, the Accord, Alex Reyes, address, parking.", holding: NEXT.yes, note: "Exchange 10 of 10. Close is Book, then Send." },
        facts: [
          { key: "need", value: "3-row seating", certainty: "preferred" },
          { key: "preferred_vehicle", value: "2026 Ford Explorer (Black)", certainty: "stated" },
          { key: "trade_vehicle", value: "2018 Accord", certainty: "stated" },
          { key: "timing", value: "Saturday 11:15 AM", certainty: "confirmed" },
        ],
        booking: "yes_1145",
        clarify: "Ten exchanges in. A person still taps Book.",
      }),
    ],
  };
}

function CONFIRM_MEDIUM_1115(L, fallback) {
  return L(
    "Saturday, September 12 at 11:15 AM for the black 2026 Ford Explorer Platinum. Ask for Alex Reyes at 4115 N. 6th Street, Beatrice, NE 68310. Visitor parking is the first row facing the showroom. Come in off 6th Street. Bring the Accord if you want it looked at. A person here still taps Book, then Send. This chat does not mark you booked on its own.",
    "Sábado 12 de septiembre a las 11:15 AM para la Ford Explorer Platinum 2026 negra. Pregunta por Alex Reyes en 4115 N. 6th Street, Beatrice, NE 68310. El estacionamiento de visitantes es la primera fila frente a la sala. Entra por 6th Street. Trae el Accord si quieres que lo veamos. Una persona aquí pulsa Reservar y luego Enviar. Este chat no te marca agendado solo.",
    "Thứ Bảy 12 tháng 9 lúc 11:15 sáng, Ford Explorer Platinum 2026 đen. Hỏi Alex Reyes tại 4115 N. 6th Street, Beatrice, NE 68310. Chỗ đỗ khách là hàng đầu đối diện phòng trưng bày. Vào từ 6th Street. Mang Accord nếu muốn mình xem. Một người ở đây bấm Book rồi Send. Chat này không tự đánh dấu đã đặt lịch.",
    "السبت 12 سبتمبر الساعة 11:15 صباحاً لفورد إكسبلورر بلاتينيوم 2026 السوداء. اسأل عن أليكس رييس في 4115 N. 6th Street, Beatrice, NE 68310. مواقف الزوار الصف الأول أمام صالة العرض. ادخل من 6th Street. أحضر الأكورد إذا تبي نقيمه. شخص هنا يضغط Book ثم Send. هذه المحادثة لا تعلّمك محجوزاً وحدها."
  );
}

function guidedPath({ L, beat, mom, trio, NEXT, CONFIRM_GUIDED, Q0, Q2, Q3, BOOK, GHOST, HOP }) {
  return {
    hint: "Vehicle hop · fifteen exchanges · ghost scare · recover",
    summary: "Explorer to Expedition to F-150, then back",
    buddy: "Long thread · pulses move · recover, then a decision",
    next_action_hold: "Stay with them. Do not book through a hop or a ghost scare.",
    next_action_yes: "They picked Saturday 10:30 AM. A person still taps Book.",
    funnel: Q0,
    momentum: mom([38], "Listed price inbound"),
    signals: trio(
      [48],
      [60],
      [38],
      "They asked listed price. That is allowed.",
      "Black Explorer Platinum is the unit.",
      "Fifteen exchanges before any close."
    ),
    headline: { text: "LONG THREAD · DO NOT SKIP", confidence: 80, why: "Guided path. Fifteen back-and-forths. Hops and a ghost scare live in the middle." },
    admin_hold: {
      asked: "What's the mileage and listed price on the black Explorer Platinum?",
      acknowledged: "Yes. Draft quotes 1,840 miles and $57,990 from the feed.",
      holding: NEXT.later,
      note: "Guided path. Fifteen exchanges before a close.",
    },
    admin_yes: {
      asked: "10:30. See you then.",
      acknowledged: "Yes. Draft restates Saturday 10:30 AM, both vehicles, Alex Reyes, address, parking.",
      holding: NEXT.yes,
      note: "Fifteen exchanges in. A person still taps Book.",
    },
    facts_hold: [
      { key: "preferred_vehicle", value: "2026 Ford Explorer (Black)", certainty: "stated" },
      { key: "asked_about", value: "mileage and listed price", certainty: "asked_about" },
      { key: "timing", value: "unknown", certainty: "tentative" },
    ],
    facts_yes: [
      { key: "preferred_vehicle", value: "2026 Ford Explorer (Black) first; Expedition King Ranch beside it", certainty: "confirmed" },
      { key: "asked_about", value: "Expedition towing and MPG; F-150 resale", certainty: "asked_about" },
      { key: "timing", value: "Saturday 10:30 AM", certainty: "confirmed" },
    ],
    messages: [
      { dir: "in", ago: "2m", t: L(
        "What's the mileage and listed price on the black Explorer Platinum?",
        "¿Cuántas millas tiene la Explorer Platinum negra y cuál es el precio publicado?",
        "Explorer Platinum đen đi bao nhiêu dặm và giá niêm yết bao nhiêu?",
        "كم ميل على الإكسبلورر بلاتينيوم السوداء وكم السعر المعلن؟"
      ) },
    ],
    draft: L(
      "2026 Explorer Platinum, Black, 1,840 miles, listed $57,990 (stock T2401). Want to come drive it Saturday?",
      "Explorer Platinum 2026, negra, 1,840 millas, precio publicado $57,990 (stock T2401). ¿Quieres venir a manejarla el sábado?",
      "Explorer Platinum 2026, màu đen, 1.840 dặm, giá $57,990 (mã T2401). Thứ Bảy qua lái thử không?",
      "إكسبلورر بلاتينيوم 2026، سوداء، 1,840 ميل، السعر المعلن 57,990 دولار (رقم T2401). تحب تجي تجربها السبت؟"
    ),
    beats: guidedBeats({ L, beat, NEXT, CONFIRM_GUIDED, Q0, Q2, Q3, BOOK, GHOST, HOP }),
  };
}

function guidedBeats({ L, beat, NEXT, CONFIRM_GUIDED, Q0, Q2, Q3, BOOK, GHOST, HOP }) {
  const later = NEXT.later;
  const rows = [
    {
      shopper: ["57,990 if that is the real listed price. I can work with that.", "57,990 si ese es el precio publicado de verdad. Con eso puedo trabajar.", "57,990 nếu đúng là giá niêm yết. Mình chấp nhận được.", "57,990 إذا هذا السعر المعلن الحقيقي. أقدر أتعامل معه."],
      draft: ["Yes. That listed price is the one on our feed (stock T2401). Saturday morning or afternoon if you want to sit in it.", "Sí. Ese precio publicado es el del inventario (stock T2401). Sábado por la mañana o por la tarde si quieres sentarte en ella.", "Đúng. Giá niêm yết đó là giá trên feed (mã T2401). Sáng hoặc chiều Thứ Bảy nếu bạn muốn ngồi thử.", "نعم. السعر المعلن هذا هو اللي في التغذية (رقم T2401). السبت صباحاً أو عصراً إذا تبي تجلس فيها."],
      asked: "57,990 if that is the real listed price.",
      next: "Price accepted. Invite Saturday. Do not book.",
      funnel: Q0, show: [38, 52], price: [48, 72], vehicle: [60, 68],
      mom: "Listed price landed", course: "grow", booking: "hold_sat",
      priceWhy: "They accepted listed $57,990.", vehicleWhy: "Explorer still first.", showWhy: "Exchange 1 of 15.",
      facts: [{ key: "preferred_vehicle", value: "2026 Ford Explorer (Black)", certainty: "stated" }, { key: "asked_about", value: "listed price confirmed", certainty: "asked_about" }, { key: "timing", value: "Saturday (offered)", certainty: "tentative" }],
    },
    {
      shopper: ["Wait, what about the Expedition? How does it compare on towing and MPG?", "Espera, ¿y la Expedition? ¿Cómo se compara en arrastre y millas por galón?", "Khoan, còn Expedition thì sao? Kéo xe và mức xăng thế nào so với Explorer?", "لحظة، والإكسبيديشن؟ كيف تقارن بالسحب والاستهلاك؟"],
      draft: ["I heard you. I will not guess towing or MPG in this chat. Those need the window sticker and a person on the lot. I can put the black Explorer and the Expedition King Ranch side by side when you come.", "Te escuché. No voy a adivinar arrastre ni consumo por chat. Eso pide la calcomanía y a una persona en el lote. Puedo poner la Explorer negra y la Expedition King Ranch juntas cuando vengas.", "Mình đã nghe. Mình không đoán số kéo hay xăng trên chat. Cần tem cửa sổ và người trên sân. Khi bạn qua, mình để Explorer đen và Expedition King Ranch cạnh nhau.", "سمعتك. لن أخمن السحب أو الاستهلاك هنا. هذا يحتاج ملصق النافذة وشخص في المعرض. أقدر أحط الإكسبلورر السوداء وإكسبيديشن كينغ راتش جنب بعض يوم تجي."],
      asked: "What about the Expedition? Towing and MPG?",
      next: "Hop. Do not invent towing or MPG. Do not book.",
      funnel: HOP, show: [38, 52, 36], price: [48, 72, 50], vehicle: [60, 68, 40],
      mom: "Expedition hop — show odds dropped", course: "recover", booking: "hold_sat",
      priceWhy: "Price fit dipped when they left the Explorer question.", vehicleWhy: "Expedition hop. Neither unit is locked.", showWhy: "Exchange 2 of 15. Hop is not a close.",
      facts: [{ key: "preferred_vehicle", value: "Explorer or Expedition — hopping", certainty: "tentative" }, { key: "asked_about", value: "Expedition towing and MPG", certainty: "asked_about" }, { key: "timing", value: "Saturday (offered)", certainty: "tentative" }],
    },
    {
      shopper: ["My cousin said F-150s hold value better. Is the Explorer even worth that listed price?", "Mi primo dice que las F-150 mantienen mejor el valor. ¿La Explorer vale ese precio publicado?", "Anh họ mình bảo F-150 giữ giá hơn. Explorer có đáng giá niêm yết đó không?", "ابن عمي يقول إن إف-150 تحافظ على قيمتها أكثر. الإكسبلورر تستاهل السعر المعلن؟"],
      draft: ["I heard the F-150 resale comment and the question of whether the Explorer is worth the listed price. I will not guess resale or invent a discount. T2401 is listed $57,990. S2301 Expedition King Ranch is listed $84,900. Sit in one first so we stop hopping.", "Escuché lo de la reventa de la F-150 y si la Explorer vale el precio publicado. No voy a adivinar reventa ni inventar un descuento. T2401 está en $57,990. La Expedition King Ranch S2301 está en $84,900. Siéntate en una primero para dejar de saltar.", "Mình nghe chuyện F-150 giữ giá và câu hỏi Explorer có đáng giá niêm yết không. Mình không đoán giá trị còn lại và không bịa giảm giá. T2401 niêm yết $57,990. Expedition King Ranch S2301 niêm yết $84,900. Ngồi một xe trước để ngừng nhảy.", "سمعت تعليق إعادة بيع الإف-150 وسؤال هل الإكسبلورر تستاهل السعر المعلن. لن أخمن إعادة البيع ولن أخترع خصماً. T2401 معلنة 57,990. إكسبيديشن كينغ راتش S2301 معلنة 84,900. اجلس في واحدة أولاً عشان نوقف التنقل."],
      asked: "F-150s hold value better. Is the Explorer worth that?",
      next: "Resale and discount are blocked. Stay on two listed prices.",
      funnel: HOP, show: [38, 52, 36, 24], price: [48, 72, 50, 30], vehicle: [60, 68, 40, 28],
      mom: "Resale objection — show odds down", course: "recover", booking: "hold_sat",
      priceWhy: "They challenged listed worth. No discount shipped.", vehicleWhy: "F-150 mention. Still no pad order.", showWhy: "Exchange 3 of 15.",
      facts: [{ key: "preferred_vehicle", value: "Explorer or Expedition — hopping", certainty: "tentative" }, { key: "asked_about", value: "F-150 resale; Explorer worth", certainty: "asked_about" }, { key: "timing", value: "Saturday (offered)", certainty: "tentative" }],
    },
    {
      shopper: ["Ok maybe the Explorer if that listed price is real. I still like the Expedition color though.", "Va, quizá la Explorer si ese precio publicado es real. Igual me gusta el color de la Expedition.", "Ừ, có thể lấy Explorer nếu giá niêm yết đúng. Mình vẫn thích màu Expedition.", "طيب يمكن الإكسبلورر إذا السعر المعلن صحيح. لسا يعجبني لون الإكسبيديشن."],
      draft: ["Yes. Those listed prices are the ones on our feed. Sit in the black Explorer first so you can feel if it is the one. Then we walk to the Expedition if you still want the color.", "Sí. Esos precios publicados son los del inventario. Siéntate primero en la Explorer negra. Luego caminamos a la Expedition si sigues con el color.", "Đúng. Giá niêm yết đó là giá trên feed. Ngồi Explorer đen trước. Rồi mình qua Expedition nếu bạn vẫn thích màu.", "نعم. الأسعار المعلنة هي اللي في التغذية. اجلس في الإكسبلورر السوداء أولاً. بعدين نمشي للإكسبيديشن إذا لسا تبي اللون."],
      asked: "Maybe the Explorer. I still like the Expedition color.",
      next: "Recover starting. Explorer first, Expedition beside. Do not book.",
      funnel: HOP, show: [38, 52, 36, 24, 40], price: [48, 72, 50, 30, 58], vehicle: [60, 68, 40, 28, 48],
      mom: "Recover starting", course: "recover", booking: "hold_sat",
      priceWhy: "Listed prices restated.", vehicleWhy: "Explorer first, Expedition color still in play.", showWhy: "Exchange 4 of 15.",
      facts: [{ key: "preferred_vehicle", value: "Explorer first; Expedition color still in play", certainty: "preferred" }, { key: "asked_about", value: "Expedition color", certainty: "asked_about" }, { key: "timing", value: "Saturday (offered)", certainty: "tentative" }],
    },
    {
      shopper: ["Fine, the Explorer. Can we look at both?", "Va, la Explorer. ¿Podemos ver las dos?", "Thôi, Explorer. Xem cả hai được không?", "طيب الإكسبلورر. نقدر نشوف الاثنتين؟"],
      draft: ["Both on the pad. Black 2026 Explorer Platinum first, Expedition King Ranch next to it. Saturday still works if you want a time.", "Las dos en el patio. Primero la Explorer Platinum 2026 negra, la Expedition King Ranch al lado. El sábado sigue si quieres una hora.", "Cả hai trên pad. Explorer Platinum 2026 đen trước, Expedition King Ranch cạnh. Thứ Bảy vẫn còn nếu bạn muốn một giờ.", "الاثنتين على الساحة. الإكسبلورر بلاتينيوم 2024 السوداء أولاً، إكسبيديشن كينغ راتش بجانبها. السبت لسا متاح إذا تبي وقت."],
      asked: "Fine, the Explorer. Can we look at both?",
      next: "Both on the pad. Invite a day. Do not book.",
      funnel: Q2, show: [38, 52, 36, 24, 40, 50], price: [48, 72, 50, 30, 58, 64], vehicle: [60, 68, 40, 28, 48, 62],
      mom: "Both on the pad", course: "grow", booking: "hold_sat",
      priceWhy: "Both listed prices still hold.", vehicleWhy: "Explorer first, Expedition beside.", showWhy: "Exchange 5 of 15.",
      facts: [{ key: "preferred_vehicle", value: "Explorer first; Expedition beside", certainty: "preferred" }, { key: "asked_about", value: "see both", certainty: "asked_about" }, { key: "timing", value: "Saturday (offered)", certainty: "tentative" }],
    },
    {
      shopper: ["Saturday morning. Which times?", "Sábado por la mañana. ¿Cuáles horas?", "Sáng Thứ Bảy. Giờ nào?", "السبت الصباح. أي ساعات؟"],
      draft: ["Saturday morning: 10:30 AM or 11:15 AM. Which clock time can you actually make?", "Sábado por la mañana: 10:30 AM o 11:15 AM. ¿Cuál hora exacta sí puedes?", "Sáng Thứ Bảy: 10:30 hoặc 11:15. Bạn đến được giờ nào?", "السبت صباحاً: 10:30 أو 11:15. أي ساعة تقدر تجي فيها فعلاً؟"],
      asked: "Saturday morning. Which times?",
      next: "Two morning slots. Wait for a pick.",
      funnel: Q3, show: [38, 52, 36, 24, 40, 50, 58], price: [48, 72, 50, 30, 58, 64, 66], vehicle: [60, 68, 40, 28, 48, 62, 70],
      mom: "Saturday morning offered", course: "grow", booking: "hold_morning",
      priceWhy: "Price not the fight now.", vehicleWhy: "Pad order holds.", showWhy: "Exchange 6 of 15. Clock missing.",
      facts: [{ key: "preferred_vehicle", value: "Explorer first; Expedition beside", certainty: "preferred" }, { key: "asked_about", value: "see both", certainty: "asked_about" }, { key: "timing", value: "Saturday morning", certainty: "tentative" }],
    },
    {
      shopper: ["10:30 might work. Let me ask my wife.", "10:30 tal vez. Voy a preguntarle a mi esposa.", "10:30 có thể được. Để mình hỏi vợ.", "10:30 يمكن. بسأل زوجتي."],
      draft: ["Ask her. 10:30 and 11:15 Saturday morning both stay on the board until you pick. I will not mark you booked on a maybe.", "Pregúntale. 10:30 y 11:15 el sábado por la mañana siguen hasta que elijas. No te voy a marcar agendado por un quizás.", "Hỏi vợ. 10:30 và 11:15 sáng Thứ Bảy vẫn trên bảng đến khi bạn chọn. Mình không đánh dấu đã đặt vì một 'có thể'.", "اسأليها. 10:30 و11:15 السبت صباحاً يبقون إلى أن تختار. لن أعلمك محجوزاً على ممكن."],
      asked: "10:30 might work. Let me ask my wife.",
      next: "Maybe is not a book. Hold both slots.",
      funnel: Q3, show: [38, 52, 36, 24, 40, 50, 58, 50], price: [48, 72, 50, 30, 58, 64, 66, 66], vehicle: [60, 68, 40, 28, 48, 62, 70, 70],
      mom: "Spouse check — not locked", course: "grow", booking: "hold_morning",
      priceWhy: "Price stable.", vehicleWhy: "Pad order holds.", showWhy: "Exchange 7 of 15. Spouse check is not a close.",
      facts: [{ key: "preferred_vehicle", value: "Explorer first; Expedition beside", certainty: "preferred" }, { key: "who", value: "spouse not yet on thread", certainty: "tentative" }, { key: "timing", value: "Saturday 10:30 AM (maybe)", certainty: "tentative" }],
    },
    {
      shopper: ["She said the Expedition looks cheaper. $84,900?", "Ella dice que la Expedition se ve más barata. ¿84,900?", "Vợ bảo Expedition rẻ hơn. $84,900?", "قالت الإكسبيديشن أرخص. 84,900؟"],
      draft: ["Yes. Expedition King Ranch stock S2301 is listed $84,900. The Explorer Platinum T2401 is listed $57,990. Sit in the Explorer first, Expedition on the pad next to it, so the cheaper one is not a guess from a photo.", "Sí. La Expedition King Ranch stock S2301 está en $84,900. La Explorer Platinum T2401 está en $57,990. Siéntate primero en la Explorer, la Expedition al lado, para que la más barata no sea una adivinanza de foto.", "Đúng. Expedition King Ranch mã S2301 niêm yết $84,900. Explorer Platinum T2401 niêm yết $57,990. Ngồi Explorer trước, Expedition cạnh, để xe rẻ hơn không phải đoán từ ảnh.", "نعم. إكسبيديشن كينغ راتش رقم S2301 معلنة 84,900. الإكسبلورر بلاتينيوم T2401 معلنة 57,990. اجلس في الإكسبلورر أولاً، الإكسبيديشن بجانبها، عشان الأرخص ما تكون تخمين من صورة."],
      asked: "She said the Expedition looks cheaper. $84,900?",
      next: "Quote both listed prices. Do not discount. Do not book.",
      funnel: Q3, show: [38, 52, 36, 24, 40, 50, 58, 50, 54], price: [48, 72, 50, 30, 58, 64, 66, 66, 70], vehicle: [60, 68, 40, 28, 48, 62, 70, 70, 66],
      mom: "Spouse on price — both listed", course: "grow", booking: "hold_morning",
      priceWhy: "Both listed prices restated for the spouse.", vehicleWhy: "Explorer first still the plan.", showWhy: "Exchange 8 of 15.",
      facts: [{ key: "preferred_vehicle", value: "Explorer first; Expedition beside", certainty: "preferred" }, { key: "who", value: "spouse comparing listed prices", certainty: "stated" }, { key: "timing", value: "Saturday 10:30 AM (maybe)", certainty: "tentative" }],
    },
    {
      shopper: ["This is taking forever. Maybe I'll just wait.", "Esto se está tardando. A lo mejor mejor espero.", "Lâu quá. Có lẽ mình đợi.", "هذا طول. يمكن أنتظر."],
      draft: ["I heard that. I will not chase. Both units are still listed. 10:30 and 11:15 Saturday morning stay on the board if you want them. Tell me to release you, or pick a clock.", "Te escuché. No te voy a perseguir. Las dos unidades siguen publicadas. 10:30 y 11:15 el sábado por la mañana siguen si las quieres. Dime que te suelte, o elige una hora.", "Mình nghe. Mình không đuổi. Cả hai xe vẫn niêm yết. 10:30 và 11:15 sáng Thứ Bảy vẫn trên bảng nếu bạn muốn. Bảo mình bỏ, hoặc chọn một giờ.", "سمعتك. لن ألاحق. الوحدتان لسا معلنتين. 10:30 و11:15 السبت صباحاً يبقون إذا تبيهم. قل لي أفلتك، أو اختر ساعة."],
      asked: "This is taking forever. Maybe I'll just wait.",
      next: "Ghost scare. Do not mark lost. Do not book.",
      funnel: GHOST, show: [38, 52, 36, 24, 40, 50, 58, 50, 54, 18], price: [48, 72, 50, 30, 58, 64, 66, 66, 70, 40], vehicle: [60, 68, 40, 28, 48, 62, 70, 70, 66, 32],
      mom: "Ghost scare — thread still open", course: "recover", booking: "hold_morning",
      priceWhy: "Not a price no. A patience no.", vehicleWhy: "Units still listed. Shopper cooling.", showWhy: "Exchange 9 of 15. Ghost scare is not a close.",
      headline: { text: "GHOST SCARE", confidence: 55, why: "Maybe I'll wait is not a withdrawal. Hold the board. Do not mark lost." },
      facts: [{ key: "preferred_vehicle", value: "Explorer first; Expedition beside", certainty: "preferred" }, { key: "who", value: "spouse comparing listed prices", certainty: "stated" }, { key: "timing", value: "Saturday morning · cooling", certainty: "tentative" }],
      clarify: "Ghost scare. Thread stays open.",
    },
    {
      shopper: ["Sorry. Kids. Still interested.", "Perdón. Los niños. Sigo interesado.", "Xin lỗi. Bọn trẻ. Vẫn muốn.", "سمحاً. العيال. لسا مهتم."],
      draft: ["Welcome back. Explorer first, Expedition beside, Saturday morning 10:30 or 11:15. Which clock?", "Bienvenido de vuelta. Explorer primero, Expedition al lado, sábado por la mañana 10:30 o 11:15. ¿Cuál hora?", "Mừng bạn quay lại. Explorer trước, Expedition cạnh, sáng Thứ Bảy 10:30 hoặc 11:15. Giờ nào?", "أهلاً بعودتك. الإكسبلورر أولاً، الإكسبيديشن بجانبها، السبت صباحاً 10:30 أو 11:15. أي ساعة؟"],
      asked: "Sorry. Kids. Still interested.",
      next: "Recover. Re-offer the two morning slots.",
      funnel: Q3, show: [38, 52, 36, 24, 40, 50, 58, 50, 54, 18, 46], price: [48, 72, 50, 30, 58, 64, 66, 66, 70, 40, 62], vehicle: [60, 68, 40, 28, 48, 62, 70, 70, 66, 32, 58],
      mom: "They came back", course: "recover", booking: "hold_morning",
      priceWhy: "Price fit recovering with them.", vehicleWhy: "Pad order restated.", showWhy: "Exchange 10 of 15. Recover, not a close.",
      facts: [{ key: "preferred_vehicle", value: "Explorer first; Expedition beside", certainty: "preferred" }, { key: "who", value: "kids delayed the thread", certainty: "stated" }, { key: "timing", value: "Saturday morning", certainty: "tentative" }],
    },
    {
      shopper: ["Both on the pad. Saturday morning. I'll make it work.", "Las dos en el patio. Sábado por la mañana. Yo me acomodo.", "Cả hai trên pad. Sáng Thứ Bảy. Mình xoay được.", "الاثنتين على الساحة. السبت صباح. بضبطها."],
      draft: ["Both on the pad Saturday morning. 10:30 AM or 11:15 AM. Pick the clock you can actually make.", "Las dos en el patio el sábado por la mañana. 10:30 AM o 11:15 AM. Elige la hora que sí puedes.", "Cả hai trên pad sáng Thứ Bảy. 10:30 hoặc 11:15. Chọn giờ bạn đến được.", "الاثنتين على الساحة السبت صباحاً. 10:30 أو 11:15. اختر الساعة اللي تقدر تجي فيها."],
      asked: "Both on the pad. Saturday morning. I'll make it work.",
      next: "Intent is up. Still need a clock.",
      funnel: Q3, show: [38, 52, 36, 24, 40, 50, 58, 50, 54, 18, 46, 62], price: [48, 72, 50, 30, 58, 64, 66, 66, 70, 40, 62, 68], vehicle: [60, 68, 40, 28, 48, 62, 70, 70, 66, 32, 58, 74],
      mom: "Intent recovered", course: "grow", booking: "hold_morning",
      priceWhy: "Price fit climbing with intent.", vehicleWhy: "Both on the pad, confirmed.", showWhy: "Exchange 11 of 15.",
      facts: [{ key: "preferred_vehicle", value: "Explorer first; Expedition beside", certainty: "confirmed" }, { key: "asked_about", value: "see both", certainty: "asked_about" }, { key: "timing", value: "Saturday morning", certainty: "tentative" }],
    },
    {
      shopper: ["Let's do 10:30. Who do I ask for?", "Hagamos las 10:30. ¿Por quién pregunto?", "10:30 đi. Mình hỏi ai?", "خلينا 10:30. أسأل عن من؟"],
      draft: ["Alex Reyes. 10:30 is the slot on the board. Confirm and a person here taps Book. Not booked from this sentence.", "Alex Reyes. 10:30 es el hueco en el tablero. Confirma y una persona aquí pulsa Reservar. Esta frase no te agenda.", "Alex Reyes. 10:30 là khung trên bảng. Xác nhận thì người ở đây bấm Book. Câu này chưa đặt lịch.", "أليكس رييس. 10:30 هو الموعد على اللوحة. أكد وشخص هنا يضغط Book. هالجملة ما تحجزك."],
      asked: "Let's do 10:30. Who do I ask for?",
      next: "10:30 leaned in. One more confirm before Book.",
      funnel: Q3, show: [38, 52, 36, 24, 40, 50, 58, 50, 54, 18, 46, 62, 74], price: [48, 72, 50, 30, 58, 64, 66, 66, 70, 40, 62, 68, 72], vehicle: [60, 68, 40, 28, 48, 62, 70, 70, 66, 32, 58, 74, 82],
      mom: "10:30 leaned in", course: "grow", booking: "hold_morning",
      priceWhy: "Price fit high.", vehicleWhy: "Pad order locked in language.", showWhy: "Exchange 12 of 15. Who is not a book.",
      facts: [{ key: "preferred_vehicle", value: "Explorer first; Expedition beside", certainty: "confirmed" }, { key: "asked_about", value: "who to ask for", certainty: "asked_about" }, { key: "timing", value: "Saturday 10:30 AM (leaning)", certainty: "tentative" }],
    },
    {
      shopper: ["Where do I park?", "¿Dónde estaciono?", "Đỗ xe ở đâu?", "وين أوقف؟"],
      draft: ["Visitor parking is the first row facing the showroom. Come in off 6th Street. Confirm 10:30 Saturday and a person here puts Alex Reyes on the ticket.", "El estacionamiento de visitantes es la primera fila frente a la sala. Entra por 6th Street. Confirma el sábado a las 10:30 y una persona pone a Alex Reyes en la ficha.", "Chỗ đỗ khách là hàng đầu đối diện phòng trưng bày. Vào từ 6th Street. Xác nhận 10:30 Thứ Bảy thì người ở đây ghi Alex Reyes vào phiếu.", "مواقف الزوار الصف الأول أمام صالة العرض. ادخل من 6th Street. أكد السبت 10:30 وشخص هنا يحط أليكس رييس على التذكرة."],
      asked: "Where do I park?",
      next: "Parking answered. Still one confirm from a close.",
      funnel: Q3, show: [38, 52, 36, 24, 40, 50, 58, 50, 54, 18, 46, 62, 74, 80], price: [48, 72, 50, 30, 58, 64, 66, 66, 70, 40, 62, 68, 72, 74], vehicle: [60, 68, 40, 28, 48, 62, 70, 70, 66, 32, 58, 74, 82, 84],
      mom: "Parking asked — almost a visit", course: "grow", booking: "hold_morning",
      priceWhy: "Price not in play.", vehicleWhy: "Pad order holds.", showWhy: "Exchange 13 of 15. Parking is not Book.",
      facts: [{ key: "preferred_vehicle", value: "Explorer first; Expedition beside", certainty: "confirmed" }, { key: "asked_about", value: "parking", certainty: "asked_about" }, { key: "timing", value: "Saturday 10:30 AM (leaning)", certainty: "tentative" }],
    },
    {
      shopper: ["Do I need to bring anything besides the kids?", "¿Traigo algo además de los niños?", "Ngoài bọn trẻ thì mang gì thêm?", "أجيب شيء غير العيال؟"],
      draft: ["A driver's license. The spouse if she wants to sit in the Expedition. Confirm 10:30 Saturday — then a person here taps Book.", "Licencia de conducir. Tu esposa si quiere sentarse en la Expedition. Confirma el sábado a las 10:30 — entonces una persona aquí pulsa Reservar.", "Bằng lái. Vợ nếu muốn ngồi Expedition. Xác nhận 10:30 Thứ Bảy — rồi người ở đây bấm Book.", "رخصة قيادة. الزوجة إذا تبي تجلس في الإكسبيديشن. أكد السبت 10:30 — بعدها شخص هنا يضغط Book."],
      asked: "Do I need to bring anything besides the kids?",
      next: "One more yes to 10:30. Then Book.",
      funnel: Q3, show: [38, 52, 36, 24, 40, 50, 58, 50, 54, 18, 46, 62, 74, 80, 84], price: [48, 72, 50, 30, 58, 64, 66, 66, 70, 40, 62, 68, 72, 74, 76], vehicle: [60, 68, 40, 28, 48, 62, 70, 70, 66, 32, 58, 74, 82, 84, 86],
      mom: "Logistics — last confirm", course: "grow", booking: "hold_morning",
      priceWhy: "Price fit high and flat.", vehicleWhy: "Both on the pad.", showWhy: "Exchange 14 of 15. One yes left.",
      facts: [{ key: "preferred_vehicle", value: "Explorer first; Expedition beside", certainty: "confirmed" }, { key: "who", value: "kids on the visit; spouse optional", certainty: "stated" }, { key: "timing", value: "Saturday 10:30 AM (leaning)", certainty: "tentative" }],
    },
    {
      shopper: ["10:30. See you then.", "10:30. Nos vemos.", "10:30. Gặp nhau.", "10:30. نشوفك."],
      draft: "CONFIRM",
      asked: "10:30. See you then.",
      next: "They picked Saturday 10:30 AM. A person still taps Book.",
      funnel: BOOK, show: [38, 52, 36, 24, 40, 50, 58, 50, 54, 18, 46, 62, 74, 80, 84, 90], price: [48, 72, 50, 30, 58, 64, 66, 66, 70, 40, 62, 68, 72, 74, 76, 84], vehicle: [60, 68, 40, 28, 48, 62, 70, 70, 66, 32, 58, 74, 82, 84, 86, 88],
      mom: "Show odds high after the recover", course: "grow", booking: "yes_1030",
      priceWhy: "Listed prices survived the hop and the ghost scare.",
      vehicleWhy: "Explorer first, Expedition on the pad, recovered.",
      showWhy: "Fifteen exchanges. A person still taps Book.",
      headline: { text: "READY TO BOOK", confidence: 92, why: "Read the thread. Price got good, the hop dropped show odds, a ghost scare flattened it, then momentum climbed. Fifteen exchanges. A person still taps Book." },
      facts: [{ key: "preferred_vehicle", value: "2026 Ford Explorer (Black) first; Expedition King Ranch beside it", certainty: "confirmed" }, { key: "asked_about", value: "Expedition towing and MPG; F-150 resale", certainty: "asked_about" }, { key: "timing", value: "Saturday 10:30 AM", certainty: "confirmed" }],
      clarify: "Fifteen exchanges in. A person still taps Book.",
    },
  ];

  return rows.map(function (r, i) {
    const n = i + 1;
    const draft = r.draft === "CONFIRM" ? CONFIRM_GUIDED : L(r.draft[0], r.draft[1], r.draft[2], r.draft[3]);
    return beat({
      course: r.course,
      shopper: L(r.shopper[0], r.shopper[1], r.shopper[2], r.shopper[3]),
      draft: draft,
      next_action: r.next,
      holding: r.booking && String(r.booking).indexOf("yes_") === 0 ? NEXT.yes : later,
      funnel: r.funnel,
      show: r.show,
      price: r.price,
      vehicle: r.vehicle,
      momLabel: r.mom,
      priceWhy: r.priceWhy,
      vehicleWhy: r.vehicleWhy,
      showWhy: r.showWhy,
      headline: r.headline || null,
      admin: {
        asked: r.asked,
        acknowledged: "Yes. Draft stays a draft. Exchange " + n + " of 15.",
        holding: r.booking && String(r.booking).indexOf("yes_") === 0 ? NEXT.yes : later,
        note: "Exchange " + n + " of 15." + (r.clarify ? " " + r.clarify : ""),
      },
      facts: r.facts,
      booking: r.booking,
      clarify: r.clarify || null,
    });
  });
}
