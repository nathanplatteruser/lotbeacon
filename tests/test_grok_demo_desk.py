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
          out.blobs.push(...Object.values(s.draft), ...Object.values(s.after.shopper), ...Object.values(s.after.draft));
        }
        for (const p of LB_DESK.PATHS) out.blobs.push(p.label, p.blurb);
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


def test_quick_refuses_the_instant_yes():
    data = _desk(
        """
        LB_DESK.setPath('quick'); LB_DESK.setLang('en');
        const d = LB_DESK.detail();
        const shopper = d.messages.filter(m=>m.direction==='in').map(m=>m.text).join(' ');
        const out = {
          shopper,
          draft: d.draft.text,
          next: d.next_step,
          admin: d.admin_note,
          slots: (d.booking.slots||[]).length,
        };
        """
    )
    assert re.search(r"\byes\b", data["shopper"], re.I)
    assert re.search(r"book me|tomorrow at 10", data["shopper"], re.I)
    assert "not booking" in data["draft"].lower() or "not booking that yet" in data["draft"].lower()
    assert BOOKED_BAIT.search(data["draft"]) is None
    assert "booked" not in data["draft"].lower()
    assert data["next"] == "not yet"
    assert data["slots"] == 0
    assert "acknowledged" in data["admin"]["acknowledged"].lower() or data["admin"]["acknowledged"].lower().startswith("yes")
    assert data["admin"]["holding"] == "not yet"


def test_guided_jumps_cars_and_lands_a_next_step():
    data = _desk(
        """
        LB_DESK.setPath('guided'); LB_DESK.setLang('en');
        const d = LB_DESK.detail();
        const texts = d.messages.map(m=>m.text).join(' ');
        LB_DESK.send();
        const after = LB_DESK.detail();
        const out = {
          texts,
          draft: d.draft.text,
          next: d.next_step,
          admin: d.admin_note,
          after_next: after.next_step,
          after_texts: after.messages.map(m=>m.text).join(' '),
          after_admin: after.admin_note,
        };
        """
    )
    assert "Yukon" in data["texts"]
    assert "F-150" in data["texts"]
    assert "Tahoe" in data["texts"]
    assert re.search(r"heard you|i heard you|thanks for spelling", data["draft"], re.I)
    assert "will not guess" in data["draft"].lower()
    assert data["next"] == "not yet"
    assert "Yukon" in data["admin"]["asked"]
    assert data["admin"]["acknowledged"].lower().startswith("yes")
    assert data["after_next"] == "yes, come in"
    assert "Tahoe" in data["after_texts"]
    assert data["after_admin"]["holding"] == "yes, come in"


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


def test_parent_pricing_compare_point_at_desk_and_drop_retired_prices():
    index = (ROOT / "docs" / "index.html").read_text(encoding="utf-8")
    pricing = (ROOT / "docs" / "pricing.html").read_text(encoding="utf-8")
    compare = (ROOT / "docs" / "compare.html").read_text(encoding="utf-8")
    assert "Synthetic shopper. Not a live Facebook inbox. A person still sends." in index
    assert 'href="grok-demo.html"' in index
    assert "Open the desk" in index
    assert FUNNEL_COPY[0] in index
    assert PILOT_MAILTO in index
    assert "Try a live inquiry" not in index
    assert 'id="anaRun"' not in index
    assert ">Analyze<" not in index
    assert "api('/api/analyze'" not in index
    assert "checkout.stripe.com" not in index
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
