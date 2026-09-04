"""Seed one pilot dealership with inventory and a few live conversations. Idempotent."""
from datetime import datetime, timedelta, timezone

from sqlalchemy import select

from .db import init_db, session_scope
from .models import Dealership, Rep, Tenant, Vehicle
from .pipeline import ingest_inbound, process_message

HOURS = {"mon": "9:00-19:00", "tue": "9:00-19:00", "wed": "9:00-19:00", "thu": "9:00-19:00", "fri": "9:00-18:00", "sat": "9:00-17:00", "sun": "Closed"}

VEHICLES = [
    # stock, vin, year, make, model, trim, color, body, miles, price, status
    ("T2401", "1GNSKSKD5RR123456", 2024, "Chevrolet", "Tahoe", "Premier", "Black", "SUV", 8412, 68950, "available"),
    ("T2402", "1GNSKNKD3RR654321", 2024, "Chevrolet", "Tahoe", "LT", "Summit White", "SUV", 12980, 61400, "available"),
    ("S2301", "1GKS2CKJ7PR112233", 2023, "GMC", "Yukon", "SLT", "Onyx Black", "SUV", 21500, 63200, "available"),
    ("E2201", "1FMSK8DH2NGA44556", 2022, "Ford", "Explorer", "XLT", "Carbonized Gray", "SUV", 31200, 36900, "available"),
    ("F2302", "1FTFW1E85PFA77889", 2023, "Ford", "F-150", "Lariat", "Antimatter Blue", "truck", 18900, 52800, "available"),
    ("F2201", "1FTEW1EP1NKD99001", 2022, "Ford", "F-150", "XLT", "Oxford White", "truck", 40210, 41500, "pending"),
    ("P2401", "1C6SRFFT8RN220011", 2024, "Ram", "1500", "Big Horn", "Granite Crystal", "truck", 6100, 47900, "available"),
    ("C2201", "1HGCV1F34NA330022", 2022, "Honda", "Accord", "Sport", "Platinum White", "sedan", 27800, 26400, "available"),
    ("H2301", "5NMS3DAJ9PH440033", 2023, "Hyundai", "Palisade", "SEL", "Steel Graphite", "SUV", 15300, 39800, "available"),
    ("X2101", "1GNSKCKD2MR550044", 2021, "Chevrolet", "Tahoe", "RST", "Black", "SUV", 44100, 49900, "sold"),
]

CONVERSATIONS = [
    # (psid, name, minutes_ago, text)
    ("psid_sarah_001", "Sarah Miller", 2, "Hey, is that black Tahoe you posted still available? I've got a 2018 Accord to trade and could probably come Saturday."),
    ("psid_mike_002", "Mike Torres", 18, "How much is the blue F-150 Lariat? Is that your best price or can you come down?"),
    ("psid_jen_003", "Jen Alvarez", 41, "Looking for something with a third row under 40k, do you have anything?"),
    ("psid_dan_004", "Dan Whitfield", 66, "Can you do $400/month on the Ram? My credit is around 580."),
    ("psid_pat_005", "Pat O'Neil", 130, "Is the 2021 Tahoe RST still there?"),
    ("psid_lee_006", "Lee Nakamura", 300, "Please stop messaging me."),
]


def run():
    init_db()
    with session_scope() as s:
        tenant = s.scalar(select(Tenant).where(Tenant.name == "Pilot Auto Group"))
        if tenant:
            return {"seeded": False}
        tenant = Tenant(name="Pilot Auto Group")
        s.add(tenant)
        s.flush()
        dealer = Dealership(tenant_id=tenant.id, name="Prairie Chevrolet of Lincoln", page_id="page_100001", timezone="America/Chicago", hours=HOURS, address="4800 N 27th St, Lincoln, NE", voice="friendly")
        s.add(dealer)
        s.flush()
        for n, role in [("Alex Reyes", "rep"), ("Jordan Kim", "rep"), ("Morgan Blake", "manager")]:
            s.add(Rep(tenant_id=tenant.id, dealership_id=dealer.id, name=n, role=role))
        now = datetime.now(timezone.utc)
        for st, vin, y, mk, md, tr, col, body, mi, pr, status in VEHICLES:
            s.add(Vehicle(tenant_id=tenant.id, dealership_id=dealer.id, stock_number=st, vin=vin, year=y, make=mk, model=md, trim=tr, color=col, body=body, mileage=mi, price=pr, status=status, source="pilot-feed-sim", retrieved_at=now - timedelta(seconds=43)))
        s.flush()
        for i, (psid, name, mins, text) in enumerate(CONVERSATIONS):
            thread, msg, new = ingest_inbound(s, dealer, psid, f"mid_seed_{i}", text, name, sent_at=now - timedelta(minutes=mins))
            if new:
                process_message(s, thread, msg)
        return {"seeded": True, "dealership_id": dealer.id}


if __name__ == "__main__":
    print(run())
