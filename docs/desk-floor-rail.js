/* Floor rail: show-likelihood graph, four cards, history, channel, packets. */
(function () {
  if (typeof document === "undefined") return;
  const CHANNELS = [
    { id: "messenger", label: "Facebook Messenger" },
    { id: "sms", label: "SMS" },
    { id: "email", label: "Email" },
    { id: "phone", label: "Phone" },
  ];

  function css() {
    if (document.getElementById("lb-floor-css")) return;
    const s = document.createElement("style");
    s.id = "lb-floor-css";
    s.textContent = `
      .lb-floor { font: 13px/1.4 Georgia, "Iowan Old Style", "Times New Roman", serif; color: #f4f1ea; }
      .lb-floor h3 { margin: 0 0 8px; font-size: 12px; letter-spacing: .12em; text-transform: uppercase; color: #9a958c; font-weight: 600; }
      .lb-show { background: #121214; border: 1px solid #2a2a2e; border-radius: 6px; padding: 10px 12px 8px; margin: 0 0 10px; }
      .lb-show .num { font-size: 28px; letter-spacing: -0.03em; }
      .lb-show .num span { font-size: 13px; color: #9a958c; margin-left: 6px; }
      .lb-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin: 0 0 10px; }
      .lb-card { background: #121214; border: 1px solid #2a2a2e; border-radius: 5px; padding: 8px 9px 7px; min-height: 86px; }
      .lb-card b { display: block; font-size: 11px; letter-spacing: .08em; text-transform: uppercase; color: #9a958c; font-weight: 600; }
      .lb-card .sc { font-size: 18px; margin: 2px 0 2px; }
      .lb-card .why { font-size: 11px; color: #c8ccd4; }
      .lb-card.hot { border-color: #8c2f1e; }
      .lb-hist { margin: 0 0 10px; border: 1px solid #2a2a2e; border-radius: 5px; background: #0e0e10; }
      .lb-hist summary { cursor: pointer; padding: 8px 10px; color: #c8ccd4; font-size: 12px; }
      .lb-hist table { width: 100%; border-collapse: collapse; font-size: 11px; }
      .lb-hist th, .lb-hist td { padding: 4px 8px; border-top: 1px solid #2a2a2e; text-align: right; }
      .lb-hist th:first-child, .lb-hist td:first-child { text-align: left; color: #9a958c; }
      .lb-pack { display: flex; flex-wrap: wrap; gap: 6px; margin: 8px 0; }
      .lb-pack button { font: 12px/1.2 Georgia, serif; background: #f4f1ea; color: #09090b; border: 0; border-radius: 3px; padding: 7px 9px; cursor: pointer; }
      .lb-pack button.quiet { background: transparent; color: #f4f1ea; border: 1px solid #3a3a3e; }
      .lb-obj { margin: 8px 0 0; }
      .lb-obj .row { border-top: 1px solid #2a2a2e; padding: 7px 0; }
      .lb-obj .tag { font-size: 10px; letter-spacing: .1em; text-transform: uppercase; color: #9a958c; }
      .lb-obj .tag.sug { color: #c4a574; }
      .lb-obj .q { color: #9a958c; font-style: italic; margin-top: 3px; }
      .lb-ch { display: flex; align-items: center; gap: 8px; margin: 0 0 8px; font-size: 12px; color: #9a958c; }
      .lb-ch select { font: 12px Georgia, serif; background: #121214; color: #f4f1ea; border: 1px solid #3a3a3e; border-radius: 3px; padding: 4px 6px; }
    `;
    document.head.appendChild(s);
  }

  function spark(series, color) {
    const s = (series && series.length ? series : [0]).map(function (n) { return Math.max(0, Math.min(100, n)); });
    const w = 200, h = 36, p = 4;
    const pts = s.map(function (n, i) {
      const x = p + (s.length === 1 ? w / 2 : i * (w - p * 2) / (s.length - 1));
      const y = h - p - (n / 100) * (h - p * 2);
      return x.toFixed(1) + "," + y.toFixed(1);
    }).join(" ");
    const last = pts.split(" ").pop().split(",");
    return '<svg width="100%" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none"><polyline fill="none" stroke="' + color + '" stroke-width="2.2" points="' + pts + '"></polyline><circle cx="' + last[0] + '" cy="' + last[1] + '" r="2.6" fill="' + color + '"></circle></svg>';
  }

  function packetBody(kind) {
    const d = window.LB_DESK && window.LB_DESK.detail && window.LB_DESK.detail();
    if (!d) return "";
    const obj = (d.deal_file && d.deal_file.objections) || { known: [], suggested: [] };
    const lines = ["LotBeacon desk brief — " + kind.toUpperCase(), "Zoellner Ford of Beatrice · 4115 N. 6th Street", "", "Customer: " + (d.customer && d.customer.name), "Channel: " + (d.window && d.window.channel), "Show likelihood: " + (d.momentum && d.momentum.score) + "% · " + (d.momentum && d.momentum.label), "", "KNOWN FROM THE THREAD"];
    (d.facts || []).forEach(function (f) {
      lines.push("- " + f.value + " (" + f.certainty + ")");
      if (f.evidence && f.evidence.text) lines.push('  "' + f.evidence.text + '"');
    });
    lines.push("", "KNOWN RISKS — do not treat as a layup");
    (obj.known || []).forEach(function (o) {
      lines.push("- " + o.label + ": " + o.risk);
      if (o.quote) lines.push('  "' + o.quote + '"');
    });
    lines.push("", "ANTICIPATE — suggested, not stated");
    (obj.suggested || []).forEach(function (o) { lines.push("- " + o.label + ": " + o.risk); });
    lines.push("", "A person still hit Send on the customer thread.");
    return lines.join("\n");
  }

  function sendPacket(kind) {
    const to = "nathanplatter@gmail.com";
    const body = packetBody(kind);
    const sub = kind + " · Riley Cole · Zoellner Ford of Beatrice";
    if (window.LB_DESK && window.LB_DESK.logPacket) window.LB_DESK.logPacket(kind, to);
    window.location.href = "mailto:" + encodeURIComponent(to) + "?subject=" + encodeURIComponent(sub) + "&body=" + encodeURIComponent(body);
  }

  function fallbackCards(d) {
    const sigs = (d.signals && d.signals.signals) || [];
    const by = {};
    sigs.forEach(function (s) { by[s.key] = s; });
    const price = by.price_fit || { series: [40], score: 40, why: "No price talk yet.", trend: "flat" };
    const veh = by.vehicle_fit || { series: [40], score: 40, why: "Unit not confirmed.", trend: "flat" };
    const show = by.show_odds || d.momentum || { series: [30], score: 30, why: "No visit window.", trend: "flat" };
    const friction = (price.series || []).map(function (n) { return Math.max(0, 100 - n); });
    const engage = (veh.series || []).map(function (n, i) { return Math.round(((n + ((show.series && show.series[i]) || n)) / 2)); });
    const obj = friction.map(function (n) { return Math.round(n * 0.45); });
    return [
      { key: "price_friction", label: "Price friction", score: friction[friction.length - 1] || 0, series: friction, why: price.why },
      { key: "engagement", label: "Engagement", score: engage[engage.length - 1] || 0, series: engage, why: veh.why },
      { key: "visit", label: "Visit", score: show.score || 0, series: show.series || [], why: show.why },
      { key: "objections", label: "Objections", score: obj[obj.length - 1] || 0, series: obj, why: "Soft risks still belong on the brief." }
    ];
  }

  function fallbackObjections(d) {
    const blob = ((d.messages || []).map(function (m) { return (m.text || m.body || ""); }).join(" ") + " " + ((d.facts || []).map(function (f) { return f.value; }).join(" "))).toLowerCase();
    const known = [];
    const suggested = [];
    if (/accord|trade/.test(blob)) known.push({ label: "Trade on the lot", kind: "known", risk: "They will want a number on the Accord. Do not value it in Messenger.", quote: "I have a 2018 Accord to trade" });
    if (/saturday/.test(blob)) known.push({ label: "Visit window", kind: "known", risk: "Saturday is named. Clock time may not be locked.", quote: "Saturday might work" });
    if (/spouse|wife|husband|married/.test(blob)) known.push({ label: "Spouse has to confirm", kind: "known", risk: "This is not a one-person yes. Closer should greet two people.", quote: "Need my spouse to confirm." });
    else if (/3-row|space|family|third row/.test(blob)) suggested.push({ label: "Possible second decision maker", kind: "suggested", risk: "They asked for space / a third row. Nobody said married. Ask who else sits in the vehicle before you treat this as a layup.", quote: "Space. The black Tahoe looks right." });
    if (/580|credit/.test(blob)) known.push({ label: "Credit on the table", kind: "known", risk: "They put a score in chat. F&I owns the next sentence. Do not quote a payment.", quote: "My credit is around 580." });
    else suggested.push({ label: "Credit not on the thread", kind: "suggested", risk: "No score in chat. Do not assume a layup. Finance should still run the deal.", quote: "" });
    if (/lincoln|worth that listed|come down|too expensive/.test(blob)) known.push({ label: "Price / shopping heat", kind: "known", risk: "They cooled off or challenged the listed price. No discount in the thread.", quote: "" });
    return { known: known, suggested: suggested };
  }

  function paintSide() {
    const side = document.getElementById("side");
    if (!side || !window.LB_DESK) return;
    css();
    if (side.querySelector(".lb-floor")) return;
    const d = window.LB_DESK.detail();
    const cards = (d.deal_file && d.deal_file.rail) || (window.LB_DESK.railCards && window.LB_DESK.railCards()) || fallbackCards(d);
    const obj = (d.deal_file && d.deal_file.objections) || (window.LB_DESK.objectionSet && window.LB_DESK.objectionSet()) || fallbackObjections(d);
    const m = d.momentum || { score: 0, label: "", series: [], trend: "flat" };
    const wrap = document.createElement("div");
    wrap.className = "lb-floor panel";
    const trend = m.trend === "up" ? "climbing" : m.trend === "down" ? "slipping" : "holding";
    let hist = "<tr><th>Turn</th>";
    cards.forEach(function (c) { hist += "<th>" + c.label.split(" ")[0] + "</th>"; });
    hist += "<th>Show</th></tr>";
    const n = Math.max.apply(null, cards.map(function (c) { return (c.series || []).length; }).concat([(m.series && m.series.length) || 1]));
    for (let i = 0; i < n; i++) {
      hist += "<tr><td>" + (i + 1) + "</td>";
      cards.forEach(function (c) { hist += "<td>" + ((c.series && c.series[i] != null) ? c.series[i] : "—") + "</td>"; });
      hist += "<td>" + ((m.series && m.series[i] != null) ? m.series[i] + "%" : "—") + "</td></tr>";
    }
    const objHtml = [].concat(obj.known || [], obj.suggested || []).map(function (o) {
      return '<div class="row"><div class="tag ' + (o.kind === "suggested" ? "sug" : "") + '">' + (o.kind === "suggested" ? "Anticipate" : "Known") + " · " + o.label + "</div><div>" + o.risk + "</div>" + (o.quote ? '<div class="q">“' + o.quote + '”</div>' : "") + "</div>";
    }).join("");
    wrap.innerHTML = "<h3>Show likelihood</h3><div class=\"lb-show\"><div class=\"num\">" + (m.score || 0) + "%<span>" + trend + " · " + (m.label || "") + "</span></div>" + spark(m.series || [], "#6a9a74") + "</div><div class=\"lb-cards\">" + cards.map(function (c) {
      const hot = c.key === "objections" && c.score >= 40;
      return '<div class="lb-card' + (hot ? " hot" : "") + '"><b>' + c.label + '</b><div class="sc">' + c.score + "</div>" + spark(c.series, hot ? "#c45c4a" : "#c8ccd4") + '<div class="why">' + (c.why || "") + "</div></div>";
    }).join("") + "</div><details class=\"lb-hist\"><summary>How this moved — turn by turn</summary><table>" + hist + "</table></details><h3>One-page brief</h3><p style=\"margin:0 0 6px;color:#9a958c;font-size:12px\">Same facts the closer and finance should walk in with. Known is a quote. Anticipate is a flag, not a fact.</p><div class=\"lb-pack\"><button type=\"button\" data-k=\"sales manager\">Send to sales manager</button><button type=\"button\" data-k=\"finance\" class=\"quiet\">Send to finance</button><button type=\"button\" data-k=\"set visit\" class=\"quiet\">Set visit</button></div><div class=\"lb-obj\">" + (objHtml || "<div class=\"row\">No risks flagged yet.</div>") + "</div>";
    side.insertBefore(wrap, side.firstChild);
    wrap.querySelectorAll(".lb-pack button").forEach(function (b) {
      b.addEventListener("click", function () { sendPacket(b.getAttribute("data-k")); });
    });
  }

  function paintComposer() {
    const card = document.getElementById("card");
    const draft = document.getElementById("draft");
    if (!card || !draft || card.querySelector(".lb-ch")) return;
    const row = document.createElement("div");
    row.className = "lb-ch";
    const cur = (window.LB_DESK && window.LB_DESK.state && window.LB_DESK.state.channel) || "messenger";
    row.innerHTML = '<span>Send on</span><select id="lbChannel" aria-label="Message medium">' + CHANNELS.map(function (c) {
      return '<option value="' + c.id + '"' + (c.id === cur ? " selected" : "") + ">" + c.label + "</option>";
    }).join("") + "</select><span>Almost always Messenger.</span>";
    draft.parentNode.insertBefore(row, draft);
    row.querySelector("select").addEventListener("change", function (e) {
      if (window.LB_DESK && window.LB_DESK.setChannel) window.LB_DESK.setChannel(e.target.value);
    });
  }

  function paint() { paintSide(); paintComposer(); }
  const obs = new MutationObserver(function () { paint(); });
  function arm() {
    const side = document.getElementById("side");
    const card = document.getElementById("card");
    if (side) obs.observe(side, { childList: true });
    if (card) obs.observe(card, { childList: true, subtree: true });
    paint();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", arm);
  else arm();
  setTimeout(paint, 400);
  setTimeout(paint, 1200);
})();
