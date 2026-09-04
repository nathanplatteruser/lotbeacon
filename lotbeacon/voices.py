"""Voice profiles — tone only. A voice can never override policy: the validator runs on the result regardless.

Each profile carries a style guide (used verbatim in the Claude prompt) and a small set of deterministic rewrites so
the air-gapped mock shows the same variety. Profiles are demo-scoped; a dealership would configure its own.
"""
import re
from dataclasses import dataclass, field


@dataclass(frozen=True)
class Voice:
    id: str
    label: str
    tagline: str
    style_guide: str  # instructions for the model
    greeting: str  # "{name}" is substituted; empty name handled by caller
    closer: str
    swaps: tuple = field(default_factory=tuple)  # (from, to) applied to mock text, case-sensitive, whole phrases only


VOICES: dict[str, Voice] = {
    "dealer": Voice(
        "dealer", "Dealership default", "Warm, clear, professional",
        "Friendly and professional. Short sentences, plain words, one question max. No slang, no exclamation pile-ups.",
        "Hi {name}!", "",
    ),
    "frank": Voice(
        "frank", "Frank — East Coast", "Fast-talking New Yorker, zero fluff",
        "Brooklyn-born salesman: fast, direct, a little wry. Clipped sentences, 'listen', 'look', 'no games'. Confident, never rude. Still one question max.",
        "{name}, listen.", "No games, just come see it.",
        (("Yes —", "Yeah,"), ("Want to come drive it", "Come drive it"), ("Morning or afternoon work better for you?", "Morning or afternoon — your call."), ("And good news on the", "The"), ("we take trades; our appraiser will put real numbers on it when you're here.", "we take trades, my appraiser puts real numbers on it, done.")),
    ),
    "celeste": Voice(
        "celeste", "Celeste — West Coast", "Sunny California calm, easy-going",
        "Laid-back Californian, warm and unhurried. 'Totally', 'no pressure at all', 'whenever works'. Positive, light, never pushy. One question max.",
        "Hey {name}, so glad you reached out.", "No pressure at all — whenever works for you.",
        (("Yes —", "Totally —"), ("Want to come drive it", "Would love to get you behind the wheel"), ("Morning or afternoon work better for you?", "Morning or afternoon, whatever flows."), ("And good news on", "And honestly, great news on")),
    ),
    "jon": Voice(
        "jon", "Jon — Midwest", "Kind, steady, neighborly",
        "Midwestern and genuinely kind. Patient, humble, helpful; 'happy to', 'no trouble at all', 'you bet'. Sincere warmth without hype. One question max.",
        "Hi {name}, thanks so much for reaching out.", "Happy to help however I can.",
        (("Yes —", "You bet —"), ("Want to come drive it", "Would you like to come drive it"), ("Morning or afternoon work better for you?", "Would morning or afternoon be easier for you?"), ("And good news on", "And no trouble at all on")),
    ),
    "dogg": Voice(
        "dogg", "Dogg — Long Beach", "Laid-back West Coast hip-hop cadence",
        "Ultra-relaxed Long Beach hip-hop cadence: smooth, playful, cool. 'Fo sho', 'we good', 'roll through', 'smooth'. Keep it readable and respectful, light on slang density. One question max.",
        "Ayy {name}, what's good.", "Roll through, we'll keep it smooth.",
        (("Yes —", "Fo sho —"), ("is still here.", "is still sittin' pretty on the lot."), ("Want to come drive it", "Roll through and drive it"), ("Morning or afternoon work better for you?", "Morning or afternoon — we good either way."), ("And good news on the", "And we can do somethin' with that")),
    ),
    "zee": Voice(
        "zee", "Zee — Gen Z", "Lowercase energy, quick and real",
        "Gen Z texting style: casual, lowercase-leaning, quick, sincere, a little playful. 'ngl', 'lowkey', 'fr', 'bet' — sparingly. No corporate voice. One question max.",
        "hey {name}!! ok so", "lmk what works, bet.",
        (("Yes —", "yes!!"), ("is still here.", "is still here fr."), ("Want to come drive it", "wanna come drive it"), ("Morning or afternoon work better for you?", "morning or afternoon?"), ("And good news on", "and lowkey good news on"), ("We're open until", "we're open til")),
    ),
}

DEFAULT_VOICE = "dealer"


def get(voice_id: str | None) -> Voice:
    return VOICES.get(voice_id or DEFAULT_VOICE, VOICES[DEFAULT_VOICE])


def apply_mock(text: str, voice: Voice, customer_name: str) -> str:
    """Restyle a mock draft: swap the greeting, apply phrase swaps, append the closer. Never adds facts or numbers."""
    if not text:
        return text
    first = customer_name.split(" ")[0] if customer_name else ""
    greeting = voice.greeting.replace("{name}", first).replace(" ,", ",").strip()
    if not first:
        greeting = greeting.replace("Hi !", "Hi!").replace("Hey ,", "Hey,").replace(", listen", "Listen").strip()
    # mock drafts begin with "Hey <name>! " or "Hey! "
    for prefix in (f"Hey {first}! ", "Hey! "):
        if text.startswith(prefix):
            text = text[len(prefix):]
            break
    for a, b in voice.swaps:
        text = text.replace(a, b)
    out = f"{greeting} {text}".strip()
    if voice.closer and voice.closer not in out:
        out = f"{out} {voice.closer}"
    return out


# Tone detection from the customer's own words. Deterministic; the Claude provider may also return a voice_hint,
# which is merged with this. A rep's manual pick always wins (thread.voice_locked).
_TONE = {
    "zee": ["lowkey", "highkey", "fr", "ngl", "no cap", "bet", "rn", "tbh", "lol", "lmao", "omg", "vibe", "slaps", "bussin", "sus", "deadass", "ong", "wyd", "hbu", "istg", "idk", "tho", "pls", "ur", "u", "yall"],
    "dogg": ["yo", "what's good", "whats good", "fo sho", "fosho", "homie", "fam", "dope", "chillin", "roll through", "rollin", "we good", "my guy", "ya feel", "feel me", "no doubt", "word", "aight", "bruh", "smooth", "whip"],
    "frank": ["listen", "look", "cut to the chase", "bottom line", "no bs", "whaddya", "gimme", "outta", "gonna need", "straight up", "real talk", "don't waste my time", "let's not", "what's the deal", "c'mon", "fuhgeddaboudit", "gotta"],
    "celeste": ["stoked", "chill", "rad", "dude", "totally", "vibes", "no worries", "for sure", "hella", "super", "amazing", "love that", "so good", "sounds dreamy", "mellow"],
    "jon": ["ope", "you bet", "oh gosh", "thanks a bunch", "folks", "appreciate ya", "sure thing", "no rush", "whenever", "gosh", "darn", "heck", "pop by", "ya know", "the missus", "the wife and i", "we're just", "much obliged"],
}


def detect(text: str) -> tuple[str | None, float, list[str]]:
    """Return (voice_id, confidence, signals). None when the customer sounds neutral → dealership default."""
    low = " " + text.lower() + " "
    scores: dict[str, list[str]] = {}
    for vid, words in _TONE.items():
        hits = [w for w in words if re.search(r"(?<![a-z'])" + re.escape(w) + r"(?![a-z])", low)]
        if hits:
            scores[vid] = hits
    # Gen Z stylistic tells: lowercase-only with no terminal punctuation, or 2+ exclamation runs
    if text and text == text.lower() and len(text) > 12 and not re.search(r"[.!?]$", text.strip()):
        scores.setdefault("zee", []).append("lowercase, no punctuation")
    if not scores:
        return None, 0.0, []
    best = max(scores, key=lambda k: len(scores[k]))
    n = len(scores[best])
    conf = min(0.5 + 0.2 * n, 0.95)
    return best, conf, scores[best]


AUTO_THRESHOLD = 0.85  # two independent tells (0.5 + 0.2·n) before overriding the dealership default


def as_list() -> list[dict]:
    return [{"id": v.id, "label": v.label, "tagline": v.tagline} for v in VOICES.values()]
