"""Deterministic, air-gapped provider. Rules + templates, no network.

Good enough to run the whole pipeline honestly, and it makes every test reproducible.
"""
import re

from .. import voices
from ..booking import COMMITTED, TENTATIVE
from .base import Classification, DraftContext, ExtractedFact

DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
MAKES = [
    "honda", "toyota", "ford", "chevy", "chevrolet", "gmc", "ram", "dodge", "jeep", "nissan", "hyundai",
    "kia", "subaru", "mazda", "volkswagen", "vw", "bmw", "mercedes", "audi", "lexus", "acura", "tesla", "buick",
]
VEHICLE_RE = re.compile(r"\b((?:19|20)\d{2})\s+(" + "|".join(MAKES) + r")\s+([A-Za-z0-9\-]+)", re.I)


class MockProvider:
    name = "mock"

    # ---------- classification ----------
    def classify(self, text: str, history: list[dict]) -> Classification:
        t = text.lower()
        sig: list[str] = []

        def has(*words):
            hits = [w for w in words if re.search(r"\b" + re.escape(w) + r"\b", t)]
            sig.extend(hits)
            return bool(hits)

        sentiment = "neutral"
        if has("stop messaging", "stop texting", "unsubscribe", "leave me alone", "do not contact", "don't contact"):
            return Classification("opt_out", "negative", None, 0.99, sig)
        if has("bought", "buying one somewhere else", "went with another", "already purchased", "found one elsewhere", "somewhere else last", "went elsewhere", "purchased elsewhere"):
            return Classification("sold_elsewhere", "neutral", None, 0.9, sig)
        if has("ridiculous", "scam", "waste of my time", "terrible", "never again", "furious", "angry", "lied"):
            return Classification("complaint", "angry", "trust", 0.9, sig)
        if has("thanks", "great", "awesome", "perfect", "love"):
            sentiment = "positive"

        intent, objection, conf = "general", None, 0.6
        if has("cancel", "can't make it", "cant make it", "have to push", "need to push", "reschedule", "something came up", "won't be able to make", "not going to make it", "postpone", "rain check"):
            intent, conf = "reschedule", 0.9
        elif has("hold it", "put it on hold", "hold the", "reserve it", "hold for me", "save it for me", "deposit"):
            intent, conf = "hold", 0.85
        elif has("warranty", "certified", "cpo", "powertrain", "bumper to bumper"):
            intent, conf = "warranty", 0.85
        elif has("deliver", "delivery", "bring it to me", "ship it", "drop it off"):
            intent, conf = "delivery", 0.85
        elif has("credit", "finance", "financing", "apr", "interest rate", "per month", "a month", "/mo", "payment", "approved", "pre-approved", "down payment"):
            intent, objection, conf = "financing", "payment", 0.9
        elif (has("worth", "what's my", "whats my", "give me for", "value my", "appraise", "appraisal") and has("trade", "trade-in", "trade in", "my car", "my truck", "my suv")) or has("trade value", "trade-in value"):
            intent, objection, conf = "trade", "trade", 0.85
        elif has("best price", "lowest", "discount", "deal", "negotiate", "too expensive", "expensive", "cheaper", "come down", "knock", "off first", "off and", "can you match", "price match", "out-the-door", "out the door", "doc fee", "fees"):
            intent, objection, conf = "price", "price", 0.85
        elif has("still available", "available", "still have", "still there", "sold yet", "in stock"):
            intent, conf = "availability", 0.9
        elif has("price", "cost", "how much", "asking"):
            intent, conf = "price", 0.85
        elif has("test drive", "come by", "come in", "stop by", "swing by", "pop by", "come out", "come over", "visit", "appointment", "schedule", "on my way", "be there", "in an hour", "checkbook", "right now", "this weekend", "this week") or any(has(d) for d in DAYS):
            intent, conf = "schedule", 0.85
        elif has("looking for", "do you have", "any", "something with", "3 row", "third row", "3-row", "under"):
            intent, conf = "vehicle_search", 0.75

        if intent != "schedule" and any(d in t for d in DAYS):
            sig.append("day_mention")
        vh, vconf, vsig = voices.detect(text)
        return Classification(intent, sentiment, objection, conf, sig + [f"tone:{x}" for x in vsig], vh, vconf)

    # ---------- memory extraction ----------
    def extract_facts(self, text: str, inventory_hint: list[dict]) -> list[ExtractedFact]:
        facts: list[ExtractedFact] = []
        t = text

        # Trade vehicle: "I've got a 2018 Accord to trade", "trade in my 2016 F-150"
        m = re.search(r"(?:trade(?:-|\s)?in|trade)\D{0,40}?((?:19|20)\d{2}\s+[A-Za-z][A-Za-z0-9\- ]{1,30}?)(?=\s+(?:to|for|in|that|with|and|,|\.|$))", t, re.I)
        if not m:
            m = re.search(r"((?:19|20)\d{2}\s+[A-Za-z][A-Za-z0-9\-]{1,20}(?:\s+[A-Za-z0-9\-]{1,20})?)\s+(?:to|for)\s+trade", t, re.I)
        if m:
            facts.append(ExtractedFact("trade_vehicle", m.group(1).strip(), 0.95, m.group(0).strip()))

        # Timing: day of week / this week / soon
        low = t.lower()
        timing_cert = "confirmed" if COMMITTED.search(t) else ("tentative" if TENTATIVE.search(t) else "stated")
        for d in DAYS:
            if re.search(r"\b" + d + r"\b", low):
                facts.append(ExtractedFact("timing", d.capitalize(), 0.9, _window(t, d), timing_cert))
                break
        else:
            for phrase, val in [("this week", "This week"), ("this weekend", "This weekend"), ("next week", "Next week"), ("today", "Today"), ("tomorrow", "Tomorrow"), ("asap", "ASAP"), ("in an hour", "Today")]:
                if phrase in low:
                    facts.append(ExtractedFact("timing", val, 0.85, _window(t, phrase), timing_cert if val != "Today" else "confirmed"))
                    break

        # Preferred vehicle: match against the inventory hint (stock the dealership actually has)
        best, best_score = None, 0
        for v in inventory_hint:
            model = v["model"].lower()
            if not re.search(r"\b" + re.escape(model) + r"\b", low):
                continue
            score = 1 + (2 if str(v["year"]) in low else 0) + (1 if v.get("color", "").lower() and v["color"].lower() in low else 0)
            if score > best_score:
                best, best_score = v, score
        if best:
            color_hit = bool(best.get("color")) and best["color"].lower() in low
            label = f"{best['year']} {best['make']} {best['model']}" + (f" ({best['color']})" if color_hit else "")
            facts.append(ExtractedFact("preferred_vehicle", label, min(0.6 + 0.15 * best_score, 0.95), _window(t, best["model"].lower())))

        # Needs vs questions: "is it AWD?" is a QUESTION about drivetrain, not a requirement.
        is_question = "?" in t or re.search(r"\b(is it|does it|do you|can it|has it|is that)\b", low) is not None
        for phrase, val in [("3 row", "3-row seating"), ("3rd row", "3-row seating"), ("third row", "3-row seating"), ("3-row", "3-row seating"), ("tow", "Towing"), ("awd", "AWD"), ("4x4", "4x4"), ("4wd", "4WD"), ("leather", "Leather")]:
            if re.search(r"(?<![a-z])" + re.escape(phrase) + r"(?![a-z])", low):
                if val in ("AWD", "4WD", "4x4", "Towing") and is_question and not re.search(r"\b(need|must|has to|have to|require|want)\b", low):
                    facts.append(ExtractedFact("asked_about", val if val != "4x4" else "4WD", 0.9, _window(t, phrase), "asked_about"))
                else:
                    cert = "required" if re.search(r"\b(need|must|has to|have to|require)\b", low) else "preferred"
                    facts.append(ExtractedFact("need", val, 0.85, _window(t, phrase), cert))

        # Budget: ONLY when a number is stated. "not crazy expensive" stays UNKNOWN.
        m = re.search(r"(?:under|below|less than|max|budget(?: is| of)?|around|up to)\s*(?:\$\s*(\d{1,3})(?:,(\d{3}))?\s*(k)?|(\d{1,3})\s*k\b)", low)
        if m and "credit" not in low[max(0, m.start() - 30): m.start()]:
            if m.group(4):
                amt = f"${m.group(4)}k"
            else:
                amt = "$" + m.group(1) + ("k" if m.group(3) else (f",{m.group(2)}" if m.group(2) else ""))
            facts.append(ExtractedFact("budget", amt, 0.8, _window(t, m.group(0))))
        m = re.search(r"\$?(\d{3})\s*(?:/|a|per)\s*mo", low)
        if m:
            facts.append(ExtractedFact("payment_target", f"${m.group(1)}/mo (customer-stated, not a quote)", 0.85, _window(t, m.group(0))))

        # Objections / sensitive
        if re.search(r"\bcredit\b.*\b\d{3}\b|\b\d{3}\b.*\bcredit\b", low):
            facts.append(ExtractedFact("financing_sensitive", "Customer mentioned credit score — human handles financing", 0.9, _window(t, "credit")))
        return facts

    # ---------- drafting ----------
    def draft(self, ctx: DraftContext) -> str:
        name = ctx.customer_name.split(" ")[0] if ctx.customer_name else ""
        hi = f"Hey {name}! " if name else "Hey! "
        parts: list[str] = []
        v = ctx.vehicle
        action = ctx.recommended_action

        if action == "escalate_opt_out":
            return ""  # nothing to send; suppression handled by policy
        if action == "human_takeover":
            return ""

        if action in ("answer_availability", "invite_test_drive", "resolve_vehicle_questions"):
            if v and ctx.vehicle_fresh and v["status"] == "available":
                parts.append(f"Yes — the {v['year']} {v['make']} {v['model']}" + (f" {v['trim']}" if v.get("trim") else "") + (f" in {v['color']}" if v.get("color") else "") + " is still here.")
            elif v and ctx.vehicle_fresh and v["status"] != "available":
                parts.append(f"I have to be straight with you — that {v['year']} {v['make']} {v['model']} just went {v['status']}.")
                if ctx.alternatives:
                    a = ctx.alternatives[0]
                    parts.append(f"We do have a {a['year']} {a['make']} {a['model']}" + (f" in {a['color']}" if a.get("color") else "") + " I can pull up for you.")
            elif v and not ctx.vehicle_fresh:
                parts.append(f"Let me verify that {v['year']} {v['make']} {v['model']} is still on the lot before I say yes — give me a couple of minutes.")
            else:
                parts.append("Let me confirm which unit you're looking at so I can check it for you.")

        if "trade_vehicle" in ctx.facts and action in ("answer_availability", "invite_test_drive", "resolve_vehicle_questions") and not ctx.appointment:
            parts.append(f"And good news on the {ctx.facts['trade_vehicle']} — we take trades; our appraiser will put real numbers on it when you're here.")

        if ctx.clarify:
            parts.append(ctx.clarify)
        if action == "invite_test_drive":
            when = ctx.facts.get("timing")
            if ctx.slots and len(ctx.slots) >= 2:
                day = ctx.slots[0]["day_label"].split(",")[0]
                parts.append(f"Would {ctx.slots[0]['label']} or {ctx.slots[1]['label']} work better {day}? I'll have it pulled up front.")
            elif ctx.slots:
                parts.append(f"Does {ctx.slots[0]['label']} {ctx.slots[0]['day_label'].split(',')[0]} work? I'll have it pulled up front.")
            elif when:
                when = when if when.lower() in DAYS or when.isupper() else when[0].lower() + when[1:]
                parts.append(f"Want to come drive it {when}? Morning or afternoon easier for you?")
            else:
                parts.append("Want to come take it for a spin this week? Tell me a day and I'll get it pulled up front.")
        elif action == "ask_qualifying_question":
            if "need" not in ctx.facts:
                parts.append("What matters most to you in the next one — space, towing, gas mileage?")
            elif "timing" not in ctx.facts:
                parts.append("When are you hoping to make the switch?")
        elif action == "answer_price":
            if v and ctx.vehicle_fresh:
                parts.append(f"It's listed at ${v['price']:,}.")
            else:
                parts.append("Let me pull the current price on that one and get right back to you.")
        elif action == "route_financing_to_human":
            parts.append("Payments and financing are something our finance team handles directly so you get real numbers, not guesses — I'll have them reach out. Meanwhile, want to see the vehicle in person?")
        elif action == "route_trade_to_human":
            parts.append("Trade values come from our appraiser, not from me — bring it by and we'll give you a written number the same visit.")
        elif action == "route_price_objection_to_human":
            parts.append("Totally fair to ask. Pricing conversations go through our sales manager — I'll flag this and get you a straight answer.")
        elif action == "offer_alternatives":
            if v and ctx.vehicle_fresh and v["status"] != "available":
                parts.append(f"I have to be straight with you — that {v['year']} {v['make']} {v['model']} just went {v['status']}.")
            if ctx.alternatives:
                names = ", ".join(f"{a['year']} {a['make']} {a['model']}" for a in ctx.alternatives[:3])
                parts.append(f"A few that fit what you described: {names}. Want details on any of them?")
            else:
                parts.append("Nothing on the lot matches that exactly right now — want me to watch for one and let you know?")
        elif action == "pre_visit_help":
            ap = ctx.appointment or {}
            if "title" in " ".join(m.get("text", "") for m in ctx.recent_messages[-1:]).lower() or "bring" in " ".join(m.get("text", "") for m in ctx.recent_messages[-1:]).lower():
                parts.append("Yes — bring your license, and for the trade the title (or payoff info) and registration.")
            else:
                parts.append("Happy to help with that when you're here.")
            if ap:
                parts.append(f"See you {ap['day_label'].split(',')[0]} at {ap['label']}!")
        elif action == "offer_reschedule":
            parts.append("No problem at all — life happens. What day works better for you? I'll get it set up.")
        elif action == "route_hold_to_human":
            parts.append("I'd love to help with that — holds go through our sales manager, so let me ask and get right back to you.")
        elif action == "route_warranty_to_human":
            parts.append("Good question — I don't want to guess on coverage. Let me pull the exact warranty details on that unit and send them over.")
        elif action == "route_delivery_to_human":
            parts.append("We may be able to do that — let me check our delivery policy for your area and confirm.")
        elif action == "acknowledge_and_close":
            parts.append("Understood — thanks for letting me know, and congrats on the new ride. If anything changes down the road, we're here.")

        if ctx.hours_today and action in ("invite_test_drive", "answer_availability") and not ctx.slots:
            parts.append(f"We're open until {ctx.hours_today.split('-')[-1].strip()} today.")
        text = (hi + " ".join(parts)).strip()
        v = next((x for x in voices.VOICES.values() if x.style_guide == ctx.voice), voices.get(None))
        return voices.apply_mock(text, v, ctx.customer_name)


def _window(text: str, needle: str, span: int = 40) -> str:
    i = text.lower().find(needle.lower())
    if i < 0:
        return text[:80]
    return text[max(0, i - span): i + len(needle) + span].strip()
