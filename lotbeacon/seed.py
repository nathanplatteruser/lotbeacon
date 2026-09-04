"""Seed one pilot dealership with inventory and twenty live conversations. Idempotent.

Each conversation is a persona with a quirk. Display names are plain on purpose — a demo audience shouldn't be able to
guess what's coming. The presenter's cheat-sheet is PERSONAS below (and in the README).

DEMO MECHANIC: every persona has a `script` of what they say next each time the rep sends. A string replies instantly;
{"ghost": hours} means they go quiet — the app shows the silence and lets the rep opt into a follow-up sequence.
"""
from datetime import datetime, timedelta, timezone

from sqlalchemy import select

from .config import DEALER_ADDRESS, DEALER_NAME
from .db import init_db, session_scope
from .models import Dealership, Draft, Message, Rep, Tenant, Thread, Vehicle
from .pipeline import audit, ingest_inbound, process_message
from .ai.mock import MockProvider

HOURS = {"mon": "9:00-19:00", "tue": "9:00-19:00", "wed": "9:00-19:00", "thu": "9:00-19:00", "fri": "9:00-18:00", "sat": "9:00-17:00", "sun": "Closed"}

VEHICLES = [
    # stock, vin, year, make, model, trim, color, body, miles, price, status, drivetrain
    ("T2401", "1GNSKSKD5RR123456", 2024, "Chevrolet", "Tahoe", "Premier", "Black", "SUV", 8412, 68950, "available", "4WD"),
    ("T2402", "1GNSKNKD3RR654321", 2024, "Chevrolet", "Tahoe", "LT", "Summit White", "SUV", 12980, 61400, "available", "4WD"),
    ("S2301", "1GKS2CKJ7PR112233", 2023, "GMC", "Yukon", "SLT", "Onyx Black", "SUV", 21500, 63200, "available", "4WD"),
    ("E2201", "1FMSK8DH2NGA44556", 2022, "Ford", "Explorer", "XLT", "Carbonized Gray", "SUV", 31200, 36900, "available", "AWD"),
    ("F2302", "1FTFW1E85PFA77889", 2023, "Ford", "F-150", "Lariat", "Antimatter Blue", "truck", 18900, 52800, "available", "4WD"),
    ("F2201", "1FTEW1EP1NKD99001", 2022, "Ford", "F-150", "XLT", "Oxford White", "truck", 40210, 41500, "pending", "4WD"),
    ("P2401", "1C6SRFFT8RN220011", 2024, "Ram", "1500", "Big Horn", "Granite Crystal", "truck", 6100, 47900, "available", "4WD"),
    ("C2201", "1HGCV1F34NA330022", 2022, "Honda", "Accord", "Sport", "Platinum White", "sedan", 27800, 26400, "available", "FWD"),
    ("H2301", "5NMS3DAJ9PH440033", 2023, "Hyundai", "Palisade", "SEL", "Steel Graphite", "SUV", 15300, 39800, "available", "AWD"),
    ("X2101", "1GNSKCKD2MR550044", 2021, "Chevrolet", "Tahoe", "RST", "Black", "SUV", 44100, 49900, "sold", "4WD"),
    ("B2301", "5UXCR6C09P9A55066", 2023, "BMW", "X5", "xDrive40i", "Alpine White", "SUV", 19800, 58900, "available", "AWD"),
    ("K2401", "5XYP3DHC5RG660077", 2024, "Kia", "Telluride", "SX", "Wolf Gray", "SUV", 4300, 46700, "available", "AWD"),
]

G = lambda h: {"ghost": h}  # noqa: E731

# (psid, display name, history [(minutes_ago, "c"|"r", text)], script [what they say after each future rep send])
CONVERSATIONS = [
    ("psid_001", "Sarah Miller", [
        (190, "c", "Hi, do you have any 3 row SUVs?"), (185, "r", "Hi Sarah! We do — a few. What matters most: space, towing, mileage?"),
        (95, "c", "The Tahoe looks nice, is it AWD?"), (90, "r", "The 2024 Premier in Black is 4WD, yes. Want the details?"),
        (2, "c", "Hey, is that black Tahoe you posted still available? I've got a 2018 Accord to trade and could probably come Saturday.")],
        ["Saturday morning works great. 10am?", "Perfect, see you then! Should I bring the Accord title?", "Thanks so much!"]),
    ("psid_002", "Mike Torres", [
        (140, "c", "Is the blue F-150 Lariat still available? Could stop by this week."), (135, "r", "It is! When's good for you?"),
        (18, "c", "How much is it? Is that your best price or can you come down? Honestly feels too expensive.")],
        ["Fine, have the manager call me. If the number's right I'll come Thursday.", G(20), "Never heard from your manager. Is Thursday still on or not?"]),
    ("psid_003", "Jen Alvarez", [(41, "c", "Looking for something with a third row under 40k, do you have anything?")],
        ["The Palisade sounds good. Is it AWD? And how many miles?", "Great, could I see it this weekend?"]),
    ("psid_004", "Dan Whitfield", [(66, "c", "Can you do $400/month on the Ram? My credit is around 580.")],
        ["Ok. When will finance reach out? I don't want to waste a trip if it won't work.", G(30)]),
    ("psid_005", "Pat O'Neil", [(130, "c", "Is the 2021 Tahoe RST still there?")],
        ["Dang. What about the 2024 LT, how much is that one?", "Bit more than I wanted. I'll think about it.", G(50)]),
    ("psid_006", "Lee Nakamura", [(300, "c", "Please stop messaging me.")], []),
    ("psid_007", "Tyler Brooks", [(9, "c", "yo is the yukon still there?? lowkey been looking for a 3rd row fr, could swing by this weekend")],
        ["bet. saturday afternoon? like 2ish", "fr fr see u then"]),
    ("psid_008", "Karen Doyle", [
        (400, "c", "Love the white Tahoe LT. Can I come Saturday at 10?"), (395, "r", "You're set for Saturday at 10, Karen!"),
        (25, "c", "Ugh, something came up with my daughter's game. I have to cancel Saturday.")],
        ["Could Sunday work? Or next Saturday same time?", "Next Saturday at 10 then. Sorry again!", G(72)]),
    ("psid_009", "Harold Finch", [
        (12, "c", "hi"), (11, "c", "is the telluride still there"), (11, "c", "the gray one"), (10, "c", "i can be there in an hour with my checkbook")],
        ["on my way", "here. where do i park"]),
    ("psid_010", "Priya Raman", [
        (500, "c", "What's the price on the Palisade SEL?"), (495, "r", "It's listed at $39,800."),
        (200, "c", "Is that with all fees? What's the out-the-door number?"), (195, "r", "Fees are set by the store — I'll have our manager send an itemized sheet."),
        (30, "c", "Still waiting on that sheet. Also is that your best price?")],
        ["Ok. And what's the doc fee exactly?", "I found a similar one listed for $1,200 less in Omaha. Can you match?", "I'll come in Saturday if the itemized sheet is ready by then."]),
    ("psid_011", "Craig Bauer", [
        (600, "c", "I'll come look at the Ram if you knock $3k off first."), (590, "r", "I hear you, Craig. Pricing goes through our sales manager — let me flag it."),
        (240, "c", "So? Yes or no on the $3k. I'm not driving 40 minutes to haggle in person.")],
        ["Not good enough. $2,500 off and I'm there today.", G(48), "Alright. If the manager will talk numbers in person I'll come Saturday. No games."]),
    ("psid_012", "Denise Okafor", [
        (2000, "c", "Interested in the Explorer XLT. Is it a one-owner?"), (1995, "r", "Let me pull the history report for you and send it over."),
        (1500, "c", "Great thanks"), (1490, "r", "Sent! Any questions, I'm here."),
        (15, "c", "Sorry for going dark — work was crazy. Still want it. Can I come Saturday morning for a test drive?")],
        ["9:30 Saturday. I'll be there.", G(26), "Still coming Saturday! Just been slammed."]),
    ("psid_013", "Marcus Bell", [(60, "c", "Can you hold the black Tahoe Premier for me until Friday? I get paid then.")],
        ["Ok, if you can't hold it I guess I'll take my chances. Can I put a deposit down?", "Alright. I'll come Friday after work then. 5:30?"]),
    ("psid_014", "Linda Schwartz", [
        (700, "c", "Is the Yukon SLT available?"), (695, "r", "Yes it is! Want to come see it?"),
        (20, "c", "Actually forget the Yukon, my husband wants to look at the F-150 Lariat instead. Does it tow 10k?")],
        ["He says that works. Can we both come Saturday around noon?", "Great. Also does it have the tow package or is that extra?"]),
    ("psid_015", "Omar Haddad", [(45, "c", "Any chance you deliver to Omaha? I'd take the Accord Sport if so.")],
        ["If delivery isn't possible I could drive down Saturday. Is it a clean title?", G(18)]),
    ("psid_016", "Rachel Kim", [
        (900, "c", "This is ridiculous. I drove 45 minutes last week and the car I asked about was already sold. You people lied."),
        (880, "r", "Rachel, I'm sorry — that shouldn't have happened. This is Morgan, the sales manager. Can I make it right?"),
        (35, "c", "Okay... I appreciate that. If the X5 is actually there I'd look at it Saturday.")],
        ["Saturday at 11. Please make sure it's actually there this time.", "Thank you. See you Saturday."]),
    ("psid_017", "Frankie Russo", [(22, "c", "Listen, bottom line — is the Ram Big Horn on the lot or not? Gotta know today, I'm not wasting a trip.")],
        ["Good. I'll be there at 4. Have the keys ready.", "Done."]),
    ("psid_018", "Skyler Nguyen", [(55, "c", "Hey! Totally chill if not, but does the Tahoe Premier still have factory warranty? Would be so good, no worries either way.")],
        ["Amazing, thank you!! Whenever works for a test drive, super flexible.", "Saturday is perfect, so stoked."]),
    ("psid_019", "Gene Lindqvist", [(75, "c", "Ope, sorry to bother ya. Is the Accord still around? No rush at all, the wife and I could pop by whenever works for you folks.")],
        ["Oh that'd be great. Saturday morning if that's not too much trouble?", "You bet. Thanks a bunch, see ya then."]),
    ("psid_020", "Victor Alvarez", [
        (3000, "c", "Interested in the Tahoe LT, what's the mileage?"), (2990, "r", "12,980 miles on that one. Want to come see it?"),
        (40, "c", "Thanks but I ended up buying one somewhere else last weekend. Appreciate you being straight with me though.")],
        ["Will do. My brother-in-law is actually looking for a truck, I'll send him your way."]),
]

# Presenter cheat-sheet — never shown in the app.
PERSONAS = {
    "Sarah Miller": "Textbook climb: needs → specific unit → trade + Saturday. Green sparkline. Replies confirm 10am.",
    "Mike Torres": "Warm, then price pushback (red dip). Later GHOSTS 20h waiting on the manager — rep must decide to follow up.",
    "Jen Alvarez": "3-row under 40k → alternatives; then asks specifics about the Palisade; then wants the weekend.",
    "Dan Whitfield": "$400/mo + credit score → financing to human, no numbers. Then ghosts 30h.",
    "Pat O'Neil": "Asks about a SOLD unit → honest + alternatives; price hesitation; ghosts 50h.",
    "Lee Nakamura": "Opt-out → suppressed forever. Nothing scripted; nothing can be sent.",
    "Tyler Brooks": "Voice auto-matches Zee (Gen Z). Books Saturday 2ish.",
    "Karen Doyle": "Booked, then CANCELS. Appointment auto-cancelled; AI offers a new day; she rebooks; then ghosts 72h.",
    "Harold Finch": "Rapid-fire typer — 4 sends = ONE communication block. Hot to sign; 'on my way'.",
    "Priya Raman": "Repeats 'best price / fees / match Omaha' three ways. Every time → manager, never a number.",
    "Craig Bauer": "Won't come in until he wins. AI never concedes; he ghosts 48h, then relents to talk in person.",
    "Denise Okafor": "Went quiet a day, came back hot; books; ghosts 26h; comes back. Sparkline dips and jumps.",
    "Marcus Bell": "Asks for a HOLD (orange, human). Then tries a deposit. Then books Friday 5:30.",
    "Linda Schwartz": "Switches Yukon → F-150 mid-thread. Memory supersedes, doesn't merge. Husband joins Saturday.",
    "Omar Haddad": "Delivery request (orange). Then offers to drive down; then ghosts 18h.",
    "Rachel Kim": "Angry (human required) → manager steps in → de-escalates → Saturday 11. Red then green.",
    "Frankie Russo": "Voice auto-matches Frank. Comes at 4.",
    "Skyler Nguyen": "Voice auto-matches Celeste; warranty question routes to human; flexible on time.",
    "Gene Lindqvist": "Voice auto-matches Jon (Midwest). Saturday morning.",
    "Victor Alvarez": "Bought elsewhere → LOST. AI stops selling, says thanks. Then a referral.",
}


def run():
    init_db()
    with session_scope() as s:
        tenant = s.scalar(select(Tenant).where(Tenant.name == "Pilot Auto Group"))
        if tenant:
            return {"seeded": False}
        tenant = Tenant(name="Pilot Auto Group")
        s.add(tenant)
        s.flush()
        dealer = Dealership(tenant_id=tenant.id, name=DEALER_NAME, page_id="page_100001", timezone="America/Chicago", hours=HOURS, address=DEALER_ADDRESS, voice="friendly")
        s.add(dealer)
        s.flush()
        for n, role in [("Alex Reyes", "rep"), ("Jordan Kim", "rep"), ("Morgan Blake", "manager")]:
            s.add(Rep(tenant_id=tenant.id, dealership_id=dealer.id, name=n, role=role))
        now = datetime.now(timezone.utc)
        for st, vin, y, mk, md, tr, col, body, mi, pr, status, drv in VEHICLES:
            s.add(Vehicle(tenant_id=tenant.id, dealership_id=dealer.id, stock_number=st, vin=vin, year=y, make=mk, model=md, trim=tr, color=col, body=body, drivetrain=drv, mileage=mi, price=pr, status=status, source="pilot-feed-sim", retrieved_at=now - timedelta(seconds=43)))
        s.flush()
        for i, (psid, name, msgs, script) in enumerate(CONVERSATIONS):
            thread: Thread | None = None
            for j, (mins, who, text) in enumerate(msgs):
                when = now - timedelta(minutes=mins)
                if who == "c":
                    thread, msg, new = ingest_inbound(s, dealer, psid, f"mid_seed_{i}_{j}", text, name, sent_at=when)
                    if new:
                        process_message(s, thread, msg, provider=MockProvider())
                else:
                    s.add(Message(tenant_id=tenant.id, thread_id=thread.id, external_id=f"out_seed_{i}_{j}", direction="out", author="rep", text=text, sent_at=when))
                    d = s.scalar(select(Draft).where(Draft.thread_id == thread.id).order_by(Draft.id.desc()))
                    if d and d.status in ("pending", "escalated", "blocked"):
                        d.status = "sent"
                    thread.last_activity_at = when
                    audit(s, thread, "rep:seed", "message.sent", {"seed": True})
                    s.flush()
                    s.expire(thread)
            if thread is not None:
                thread.demo_script = script
                thread.demo_cursor = 0
        return {"seeded": True, "dealership_id": dealer.id, "conversations": len(CONVERSATIONS)}


if __name__ == "__main__":
    print(run())
