"""Desk demo at grok-demo.html: language + thread-length controls. Offline, synthetic only."""
from __future__ import annotations

import json
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HTML = ROOT / "docs" / "grok-demo.html"
JS = ROOT / "docs" / "grok-demo-desk.js"
NEXT = {"yes, come in", "won't come in", "not yet"}
BOOKED_BAIT = re.compile(
    r"\b(you're booked|you are booked|you're set|you are set|see you tomorrow|locked in|i booked|all set for)\b",
    re.I,
)
EM = "\u2014"


def _desk(script: str) -> dict:
    src = JS.read_text(encoding="utf-8")
    proc = subprocess.run(
        [
            "node",
            "-e",
            src + "\n" + script + "\nprocess.stdout.write(JSON.stringify(out));",
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    return json.loads(proc.stdout)


def _user_facing_blobs() -> list[str]:
    data = _desk(
        """
        const out = { langs: LB_DESK.LANGS, paths: LB_DESK.PATHS, blobs: [] };
        for (const pid of Object.keys(LB_DESK.SCENARIOS)) {
          const s = LB_DESK.SCENARIOS[pid];
          out.blobs.push(s.hint, s.summary, s.buddy, s.next_action_hold, s.next_action_yes);
          for (const block of [s.admin_hold, s.admin_yes]) {
            out.blobs.push(block.asked, block.acknowledged, block.holding, block.note);
          }
          for (const m of s.messages) {
            out.blobs.push(...Object.values(m.t));
          }
          out.blobs.push(...Object.values(s.draft));
          for (const beat of (s.beats || [])) {
            out.blobs.push(...Object.values(beat.shopper), ...Object.values(beat.draft));
            if (beat.admin) {
              out.blobs.push(beat.admin.asked, beat.admin.acknowledged, beat.admin.holding, beat.admin.note);
            }
            if (beat.next_action) out.blobs.push(beat.next_action);
            if (beat.clarify) out.blobs.push(beat.clarify);
            if (beat.headline && beat.headline.text) out.blobs.push(beat.headline.text, beat.headline.why || '');
            for (const sig of (beat.signals || [])) out.blobs.push(sig.label, sig.why);
          }
        }
        for (const p of LB_DESK.PATHS) out.blobs.push(p.label, p.blurb);
        out.blobs.push(LB_DESK.OUTCOME.label, LB_DESK.OUTCOME.line, LB_DESK.PARKING, LB_DESK.SEEDED_ADDRESS);
        """
    )
    return [str(x) for x in data["blobs"] if x]


def test_html_has_phone_first_controls_before_thread():
    html = HTML.read_text(encoding="utf-8")
    assert "grok-demo-desk.js" in html
    assert 'id="deskLang"' in html
    assert 'id="deskPath"' in html
    assert 'id="deskbar"' in html
    deskbar_at = html.index('id="deskbar"')
    thread_at = html.index('id="main"')
    assert deskbar_at < thread_at
    assert "English" in html and "Spanish" in html and "Vietnamese" in html and "Arabic" in html
    assert "Quick" in html and "Medium" in html and "Guided" in html
    assert "data-view=\"admin\"" in html
    assert "min-height:48px" in html
    assert "Not a live Facebook inbox" in html
    assert "A person still sends" in html
    assert "Point of the desk" in html
    assert "Download .ics" in html or "calIcs" in html
    assert "Dell" not in html.split("LB_STATIC=")[0]


def test_languages_and_paths_match_nebraska_top_four():
    data = _desk("const out = { langs: LB_DESK.LANGS.map(l=>l.id), paths: LB_DESK.PATHS.map(p=>p.id) };")
    assert data["langs"] == ["en", "es", "vi", "ar"]
    assert data["paths"] == ["quick", "medium", "guided"]


def test_switching_language_or_path_redraws_thread():
    data = _desk(
        """
        LB_DESK.setPath('medium'); LB_DESK.setLang('en');
        const en = LB_DESK.detail().messages.map(m=>m.text);
        LB_DESK.setLang('es');
        const es = LB_DESK.detail().messages.map(m=>m.text);
        LB_DESK.setPath('guided');
        const guided = LB_DESK.detail().messages.map(m=>m.text);
        const out = { en, es, guided, gloss: LB_DESK.detail().messages.map(m=>m.gloss), demo: LB_DESK.detail().demo_copy };
        """
    )
    assert data["en"] != data["es"]
    assert data["es"] != data["guided"]
    assert all(g for g in data["gloss"])
    assert data["demo"] is True
    assert any("Yukon" in t or "yukon" in t.lower() for t in data["guided"])


def test_quick_qualifies_before_any_book():
    data = _desk(
        """
        LB_DESK.setPath('quick'); LB_DESK.setLang('en');
        const d = LB_DESK.detail();
        const shopper = d.messages.filter(m=>m.direction==='in').map(m=>m.text).join(' ');
        const missing = (d.booking.missing||[]).join(' ').toLowerCase();
        LB_DESK.send();
        const after = LB_DESK.detail();
        const out = {
          shopper,
          draft: d.draft.text,
          next: d.next_step,
          admin: d.admin_note,
          slots: (d.booking.slots||[]).length,
          stage: d.booking.stage,
          missing,
          after_draft: after.draft.text,
          after_next: after.next_step,
          after_stage: after.booking.stage,
          after_shopper: after.messages.filter(m=>m.direction==='in').map(m=>m.text).join(' '),
        };
        """
    )
    assert re.search(r"kicks|for fun|whenever", data["shopper"], re.I)
    assert re.search(r"book me|i'm in|im in", data["shopper"], re.I)
    assert re.search(r"not booking|not booking a visit", data["draft"], re.I)
    assert re.search(r"\bname\b", data["draft"], re.I)
    assert re.search(r"tahoe", data["draft"], re.I)
    assert re.search(r"buying|driving for fun|just driving", data["draft"], re.I)
    assert re.search(r"time window", data["draft"], re.I)
    assert BOOKED_BAIT.search(data["draft"]) is None
    assert "booked" not in data["draft"].lower()
    assert data["next"] == "not yet"
    assert data["slots"] == 0
    assert data["stage"] != "booked"
    assert "who" in data["missing"]
    assert "fun" in data["missing"] or "window" in data["missing"]
    assert data["admin"]["holding"] == "not yet"
    assert "Riley" in data["after_shopper"]
    assert re.search(r"not buying|just want to drive|just driving", data["after_shopper"], re.I)
    assert data["after_next"] == "yes, come in"
    assert data["after_stage"] == "time_selected"
    assert BOOKED_BAIT.search(data["after_draft"]) is None


def test_old_quick_easy_yes_layup_copy_is_gone():
    blobs = "\n".join(_user_facing_blobs()).lower()
    assert "easy yes" not in blobs
    assert "refuse the layup" not in blobs
    assert "layup" not in blobs
    assert "refuses the bait" not in blobs


def test_guided_jumps_cars_and_lands_a_next_step():
    data = _desk(
        """
        LB_DESK.setPath('guided'); LB_DESK.setLang('en');
        const start = LB_DESK.detail();
        const pulses = [];
        const drafts = [start.draft.text];
        pulses.push(start.signals.signals.map(s=>({key:s.key,score:s.score,trend:s.trend,series:s.series})));
        while (LB_DESK.state.step < LB_DESK.SCENARIOS.guided.beats.length) {
          LB_DESK.send();
          const d = LB_DESK.detail();
          drafts.push(d.draft.text);
          pulses.push(d.signals.signals.map(s=>({key:s.key,score:s.score,trend:s.trend,series:s.series})));
        }
        const done = LB_DESK.detail();
        const out = {
          start_texts: start.messages.map(m=>m.text).join(' '),
          start_draft: start.draft.text,
          start_next: start.next_step,
          start_admin: start.admin_note,
          count: done.messages.length,
          in_count: done.messages.filter(m=>m.direction==='in').length,
          out_count: done.messages.filter(m=>m.direction==='out').length,
          texts: done.messages.map(m=>m.text).join(' '),
          after_next: done.next_step,
          after_admin: done.admin_note,
          drafts,
          pulses,
          keys: done.signals.signals.map(s=>s.key),
        };
        """
    )
    assert "Yukon" in data["start_texts"]
    assert "Tahoe" in data["start_texts"]
    assert "F-150" in data["texts"]
    assert "Yukon" in data["texts"]
    assert "Tahoe" in data["texts"]
    assert re.search(r"heard you|i heard you|thanks for spelling", data["start_draft"], re.I)
    assert "will not guess" in data["start_draft"].lower()
    assert data["start_next"] == "not yet"
    assert "Yukon" in data["start_admin"]["asked"]
    assert data["start_admin"]["acknowledged"].lower().startswith("yes")
    assert data["count"] >= 10
    assert data["in_count"] >= 5 and data["out_count"] >= 5
    assert data["after_next"] == "yes, come in"
    assert data["after_admin"]["holding"] == "yes, come in"
    assert set(data["keys"]) >= {"price_fit", "vehicle_fit", "show_odds"}
    trends = {key: [] for key in ("price_fit", "vehicle_fit", "show_odds")}
    for snap in data["pulses"]:
        for s in snap:
            if s["key"] in trends:
                trends[s["key"]].append(s["trend"])
    for key, series in trends.items():
        assert "up" in series, key
        assert "down" in series, key
    assert any("will not guess" in t.lower() or "not guess" in t.lower() or "no discount" in t.lower() for t in data["drafts"])
    assert any("listed" in t.lower() and "68,950" in t for t in data["drafts"])


def test_confirmation_names_visit_facts_and_calendar():
    data = _desk(
        """
        const rows = [];
        for (const path of ['quick','medium','guided']) {
          LB_DESK.setPath(path); LB_DESK.setLang('en');
          while (LB_DESK.state.step < LB_DESK.SCENARIOS[path].beats.length) LB_DESK.send();
          const before = LB_DESK.detail();
          const booked = LB_DESK.book();
          const after = LB_DESK.detail();
          rows.push({
            path,
            draft: before.draft.text,
            stage: before.booking.stage,
            booked_stage: after.booking.stage,
            sent: booked.sent,
            cal: before.calendar,
            place: before.place,
          });
        }
        const out = { rows };
        """
    )
    for row in data["rows"]:
        text = row["draft"]
        assert "September 12" in text
        assert re.search(r"10:30 AM|1:45 PM", text)
        assert "Tahoe" in text
        assert "Alex Reyes" in text
        assert "4115 N. 6th Street" in text
        assert "Visitor parking" in text or "parking" in text.lower()
        assert BOOKED_BAIT.search(text) is None
        assert "discount" not in text.lower() or "no discount" in text.lower()
        assert row["stage"] == "time_selected"
        assert row["booked_stage"] == "booked"
        assert row["sent"] is False
        cal = row["cal"]
        assert cal
        assert "BEGIN:VCALENDAR" in cal["ics"]
        assert "4115 N. 6th Street" in cal["ics"]
        assert "LOCATION:" in cal["ics"]
        assert cal["gcal"].startswith("https://calendar.google.com/calendar/render")
        assert "4115" in cal["gcal"]
        assert cal["filename"].endswith(".ics")
        assert row["place"]["address"] == "4115 N. 6th Street, Beatrice, NE 68310"
        assert row["place"]["sample"] is False


def test_outcome_line_is_labeled_not_a_measured_claim():
    html = HTML.read_text(encoding="utf-8")
    assert "Point of the desk" in html
    assert "Confidence and clarity" in html
    assert "window-shopper" in html
    assert "paid for itself" not in html.lower()
    data = _desk("const out = { outcome: LB_DESK.OUTCOME, impact: (LB_DESK.setPath('guided'), LB_DESK.impact()) };")
    assert data["outcome"]["label"] == "Point of the desk"
    assert "Not a measured claim" in data["outcome"]["line"]
    assert "paid for itself" not in data["outcome"]["line"].lower()
    assert any("Point of the desk" in h for h in data["impact"]["headline"])


def test_medium_ends_on_allowed_next_step():
    data = _desk(
        """
        LB_DESK.setPath('medium'); LB_DESK.setLang('en');
        const hold = LB_DESK.nextStep();
        LB_DESK.send();
        const out = { hold, yes: LB_DESK.nextStep(), draft: LB_DESK.detail().draft.text };
        """
    )
    assert data["hold"] == "not yet"
    assert data["yes"] == "yes, come in"
    assert "Book" in data["draft"]


def test_non_english_has_english_gloss_and_demo_copy_label():
    html = HTML.read_text(encoding="utf-8")
    assert "Demo copy. Not a certified translation." in html
    data = _desk(
        """
        const out = { rows: [] };
        for (const lang of ['es','vi','ar']) {
          for (const path of ['quick','medium','guided']) {
            LB_DESK.setPath(path); LB_DESK.setLang(lang);
            const d = LB_DESK.detail();
            out.rows.push({
              lang, path,
              msgs: d.messages.map(m=>({text:m.text,gloss:m.gloss,lang:m.lang})),
              draft: d.draft.text,
              draft_gloss: d.draft.gloss,
              demo: d.demo_copy,
            });
          }
        }
        """
    )
    for row in data["rows"]:
        assert row["demo"] is True
        assert row["draft_gloss"]
        assert row["draft"] != row["draft_gloss"]
        for m in row["msgs"]:
            assert m["gloss"]
            assert m["text"] != m["gloss"]
            assert m["lang"] == row["lang"]


def test_no_em_dash_dell_or_live_meta_in_desk_copy():
    blobs = _user_facing_blobs()
    joined = "\n".join(blobs)
    assert EM not in joined
    assert "Dell" not in joined
    assert "live Facebook" not in joined.lower()
    assert "graph.facebook" not in joined.lower()
    for blob in blobs:
        assert blob.split()  # no empty lines passed off as copy


def test_admin_note_always_has_ask_ack_hold():
    data = _desk(
        """
        const out = { notes: [] };
        for (const path of ['quick','medium','guided']) {
          LB_DESK.setPath(path); LB_DESK.setLang('en');
          out.notes.push(LB_DESK.adminNote());
          LB_DESK.send();
          out.notes.push(LB_DESK.adminNote());
        }
        """
    )
    for n in data["notes"]:
        assert n["asked"]
        assert n["acknowledged"]
        assert n["holding"] in NEXT
        assert n["note"]


PILOT_MAILTO = "mailto:nathanplatter@gmail.com?subject=LotBeacon%20pilot%20request%20%28shop%2C%20named%20Page%2C%20what%20we%20will%20paste%29"
FUNNEL_COPY = (
    "This recording cannot run a live inquiry. Request a pilot. Send your name, the shop, the named Page, and what you will paste. A person replies. Nothing here sends to Facebook.",
    "Or skip the recording. Request a pilot with your name, shop, named Page, and what you will paste.",
    "Draft language in this recording. The customer does not see it until a person sends. Not a certified translation.",
    "This sets the shopper path in the recording. It does not set how long your reply will be.",
    "Plays this recording forward. Does not send to Facebook.",
)


def test_recording_closes_analyze_and_keeps_language_path_controls():
    html = HTML.read_text(encoding="utf-8")
    head = html.split("LB_STATIC=", 1)[0]
    for line in FUNNEL_COPY:
        assert line in html
        assert EM not in line
    assert PILOT_MAILTO in html
    assert 'id="anaRun"' not in html
    assert ">Analyze<" not in html
    assert "Try a live inquiry" not in html
    assert "api('/api/analyze'" not in html
    assert 'id="deskLang"' in html and 'id="deskPath"' in html
    assert "English" in head and "Spanish" in head and "Vietnamese" in head and "Arabic" in head
    assert "Quick" in head and "Medium" in head and "Guided" in head
    assert 'title="Plays this recording forward. Does not send to Facebook."' in html
    blurb_at = html.index('id="deskBlurb"')
    path_note = "This sets the shopper path in the recording. It does not set how long your reply will be."
    assert html.index(path_note) > blurb_at


PARENT_BANNER = "Synthetic shopper. Not a live Facebook inbox. A person still sends."
PARENT_CLOSE = (
    "This recording cannot run a live inquiry. Request a pilot. "
    "Send your name, the shop, the named Page, and what you will paste. "
    "A person replies. Nothing here sends to Facebook."
)


def test_parent_closes_live_inquiry_to_four_field_pilot():
    index = (ROOT / "docs" / "index.html").read_text(encoding="utf-8")
    assert PARENT_BANNER in index
    assert "Open the desk" in index
    assert 'href="grok-demo.html"' in index
    assert PARENT_CLOSE in index
    assert PILOT_MAILTO in index
    assert "your name" in index and "the shop" in index and "named Page" in index and "what you will paste" in index
    assert "Try a live inquiry" not in index
    assert 'id="anaRun"' not in index
    assert ">Analyze<" not in index
    assert "api('/api/analyze'" not in index
    assert "Paste a real customer message" not in index
    assert "pipeline runs against live inventory" not in index
    assert "checkout.stripe.com" not in index
    assert EM not in PARENT_BANNER
    assert EM not in PARENT_CLOSE


def test_close_live_inquiry_rewrites_live_app_source():
    from scripts.export_showcase import PILOT_COPY, close_live_inquiry

    src = (ROOT / "lotbeacon" / "web" / "index.html").read_text(encoding="utf-8")
    assert "Try a live inquiry" in src
    out = close_live_inquiry(src)
    assert "Try a live inquiry" not in out
    assert PILOT_COPY in out
    assert PILOT_MAILTO in out
    assert 'id="anaRun"' not in out
    assert ">Analyze<" not in out
    assert "api('/api/analyze'" not in out
    assert "pipeline runs against live inventory" not in out


def test_export_showcase_closes_live_inquiry_and_leaves_desk_alone():
    src = (ROOT / "scripts" / "export_showcase.py").read_text(encoding="utf-8")
    assert PARENT_BANNER in src
    assert "This recording cannot run a live inquiry." in src
    assert "Send your name, the shop, the named Page, and what you will paste." in src
    assert "nathanplatter@gmail.com" in src
    assert "LotBeacon%20pilot%20request%20%28shop%2C%20named%20Page%2C%20what%20we%20will%20paste%29" in src
    assert "def close_live_inquiry" in src
    assert '(docs / "grok-demo.html").write_text' not in src
    assert "left alone" in src
    assert "This recording cannot run a live inquiry." in src
    assert "The live-inquiry analyzer runs Claude against live inventory" not in src


def test_parent_pricing_compare_point_at_desk_and_drop_retired_prices():
    index = (ROOT / "docs" / "index.html").read_text(encoding="utf-8")
    pricing = (ROOT / "docs" / "pricing.html").read_text(encoding="utf-8")
    compare = (ROOT / "docs" / "compare.html").read_text(encoding="utf-8")
    assert PARENT_BANNER in index
    assert 'href="grok-demo.html"' in index
    assert "Open the desk" in index
    assert 'href="./">try the interactive demo' not in pricing
    assert 'href="grok-demo.html">try the interactive demo' in pricing
    assert 'href="./">try the demo' not in compare
    assert 'href="grok-demo.html">try the demo' in compare
    for page in (pricing, compare):
        assert 'href="grok-demo.html"' in page
        assert "Open the desk" in page
        assert "checkout.stripe.com" not in page
    assert "Published price" not in compare
    assert "$549" not in compare
    assert "$1,347" not in compare
    assert "$2,990" not in compare
    assert "Solo $129" in compare and "Three Amigos $299" in compare and "Dealership $599" in compare


def test_human_still_owns_send_and_next_step_vocab():
    html = HTML.read_text(encoding="utf-8")
    assert "Suggested wording is a draft" in html
    assert "no autonomous sends" in html
    data = _desk(
        """
        const out = { nexts: [] };
        for (const path of ['quick','medium','guided']) {
          LB_DESK.setPath(path);
          out.nexts.push(LB_DESK.nextStep());
          LB_DESK.send();
          out.nexts.push(LB_DESK.nextStep());
        }
        """
    )
    assert set(data["nexts"]) <= NEXT
