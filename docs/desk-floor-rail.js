/* Floor rail + voice law: no LLM tells on any profile. */
(function () {
  if (typeof document === "undefined") return;
  function sanitizeRep(text) {
    if (!text) return text;
    var s = String(text).replace(/\u2014/g, ". ").replace(/\u2013/g, "-");
    var openers = [
      /^\s*I heard you\.?\s*/i,
      /^\s*I hear you\.?\s*/i,
      /^\s*I heard [^\n.]{0,120}\.\s*/i,
      /^\s*You(?:'re| are) not wrong\.?\s*/i,
      /^\s*I agree(?: with you)?[^.]*\.\s*/i,
      /^\s*That(?:'s| is) a great question\.?\s*/i,
      /^\s*Absolutely[.,!]?\s*/i,
      /^\s*Of course[.,!]?\s*/i,
      /^\s*That makes sense\.?\s*/i,
      /^\s*I understand(?: your \w+)?\.?\s*/i,
      /^\s*Happy to help[^.]*\.\s*/i,
      /^\s*Thanks for sharing\.?\s*/i,
    ];
    for (var i = 0; i < openers.length; i++) s = s.replace(openers[i], "");
    return s.replace(/\s{2,}/g, " ").replace(/\s+\./g, ".").trim();
  }
  function wrapDesk() {
    var desk = window.LB_DESK;
    if (!desk || desk.__voiceLaw) return;
    desk.__voiceLaw = true;
    var origDetail = desk.detail;
    if (typeof origDetail === "function") {
      desk.detail = function () {
        var d = origDetail.call(desk);
        if (d.draft) {
          if (d.draft.text) d.draft.text = sanitizeRep(d.draft.text);
          if (d.draft.body) d.draft.body = sanitizeRep(d.draft.body);
        }
        (d.messages || []).forEach(function (m) {
          var outgoing = m.direction === "out" || m.dir === "out" || m.who === "rep" || m.who === "ai";
          if (outgoing && m.text) m.text = sanitizeRep(m.text);
        });
        return d;
      };
    }
    if (typeof desk.editDraft === "function") {
      var origEdit = desk.editDraft;
      desk.editDraft = function (text) { return origEdit.call(desk, sanitizeRep(text)); };
    }
  }
  var _paint = window.__lbPaintVoice;
  function tick() {
    wrapDesk();
    var draft = document.getElementById("draft");
    if (draft && draft.value) {
      var cleaned = sanitizeRep(draft.value);
      if (cleaned !== draft.value) {
        draft.value = cleaned;
        if (window.LB_DESK && window.LB_DESK.editDraft) window.LB_DESK.editDraft(cleaned);
      }
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", tick);
  else tick();
  setInterval(tick, 800);
})();

