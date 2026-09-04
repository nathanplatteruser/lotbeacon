"""Canonical schema. The LLM never writes here directly — only services do, with provenance.

Every table is tenant-scoped. Every derived fact points at the message that justifies it.
"""
from datetime import datetime, timezone
import enum

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class LeadState(str, enum.Enum):
    NEW = "NEW"
    ENGAGED = "ENGAGED"
    DISCOVERY = "DISCOVERY"
    VEHICLE_MATCH = "VEHICLE_MATCH"
    VEHICLE_INTEREST = "VEHICLE_INTEREST"
    OBJECTION = "OBJECTION"
    HIGH_INTENT = "HIGH_INTENT"
    APPOINTMENT_INTENT = "APPOINTMENT_INTENT"
    APPOINTMENT_SET = "APPOINTMENT_SET"
    ARRIVED = "ARRIVED"
    SOLD = "SOLD"
    LOST = "LOST"
    NURTURE = "NURTURE"
    REVIEW_ELIGIBLE = "REVIEW_ELIGIBLE"
    DO_NOT_CONTACT = "DO_NOT_CONTACT"
    HUMAN_REQUIRED = "HUMAN_REQUIRED"


class Tenant(Base):
    __tablename__ = "tenants"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    dealerships: Mapped[list["Dealership"]] = relationship(back_populates="tenant")


class Dealership(Base):
    __tablename__ = "dealerships"
    id: Mapped[int] = mapped_column(primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"), index=True)
    name: Mapped[str] = mapped_column(String(120))
    page_id: Mapped[str] = mapped_column(String(64), unique=True)  # Facebook Page id
    timezone: Mapped[str] = mapped_column(String(64), default="America/Chicago")
    hours: Mapped[dict] = mapped_column(JSON, default=dict)  # {"mon": "9:00-19:00", ...} — authoritative source for hours claims
    address: Mapped[str] = mapped_column(String(200), default="")
    voice: Mapped[str] = mapped_column(String(64), default="friendly")  # tone only; never overrides policy
    tenant: Mapped[Tenant] = relationship(back_populates="dealerships")


class Rep(Base):
    __tablename__ = "reps"
    id: Mapped[int] = mapped_column(primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"), index=True)
    dealership_id: Mapped[int] = mapped_column(ForeignKey("dealerships.id"), index=True)
    name: Mapped[str] = mapped_column(String(120))
    role: Mapped[str] = mapped_column(String(20), default="rep")  # rep | manager | admin


class Customer(Base):
    """One person as known to ONE dealership. No cross-tenant identity in V1 (blueprint §13)."""

    __tablename__ = "customers"
    __table_args__ = (UniqueConstraint("dealership_id", "psid", name="uq_customer_psid"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"), index=True)
    dealership_id: Mapped[int] = mapped_column(ForeignKey("dealerships.id"), index=True)
    psid: Mapped[str] = mapped_column(String(64))  # Page-scoped ID from Messenger
    display_name: Mapped[str] = mapped_column(String(120), default="")
    opted_out: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Thread(Base):
    __tablename__ = "threads"
    id: Mapped[int] = mapped_column(primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"), index=True)
    dealership_id: Mapped[int] = mapped_column(ForeignKey("dealerships.id"), index=True)
    customer_id: Mapped[int] = mapped_column(ForeignKey("customers.id"), index=True)
    assigned_rep_id: Mapped[int | None] = mapped_column(ForeignKey("reps.id"), nullable=True)
    lead_state: Mapped[LeadState] = mapped_column(Enum(LeadState), default=LeadState.NEW)
    ai_paused: Mapped[bool] = mapped_column(Boolean, default=False)  # "Take over"
    voice: Mapped[str] = mapped_column(String(32), default="dealer")  # active voice profile (tone only)
    voice_locked: Mapped[bool] = mapped_column(Boolean, default=False)  # True once a rep picks manually; auto-detect then stays out
    voice_reason: Mapped[str] = mapped_column(String(200), default="")  # why this voice is active (auto signals or "rep")
    followup_stage: Mapped[int] = mapped_column(Integer, default=0)  # 0 = not in a follow-up sequence; 1..3 = which nudge is next. Rep opts in.
    ghost_hours_sim: Mapped[float | None] = mapped_column(Float, nullable=True)  # DEMO ONLY: pretend the customer has been silent this long
    demo_script: Mapped[list | None] = mapped_column(JSON, nullable=True)  # DEMO ONLY: scripted customer replies after each rep send
    demo_cursor: Mapped[int] = mapped_column(Integer, default=0)
    priority: Mapped[int] = mapped_column(Integer, default=0)
    priority_reason: Mapped[str] = mapped_column(String(200), default="")
    summary: Mapped[str] = mapped_column(Text, default="")
    summary_version: Mapped[str] = mapped_column(String(64), default="")
    last_customer_message_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_activity_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    customer: Mapped[Customer] = relationship()
    messages: Mapped[list["Message"]] = relationship(back_populates="thread", order_by="Message.sent_at")
    facts: Mapped[list["MemoryFact"]] = relationship(back_populates="thread")


class Message(Base):
    """Raw, immutable conversation store. Customer-authored text is evidence; never edited."""

    __tablename__ = "messages"
    __table_args__ = (UniqueConstraint("tenant_id", "external_id", name="uq_message_external"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"), index=True)
    thread_id: Mapped[int] = mapped_column(ForeignKey("threads.id"), index=True)
    external_id: Mapped[str] = mapped_column(String(128))  # Messenger mid — idempotency key
    direction: Mapped[str] = mapped_column(String(3))  # "in" (customer) | "out" (dealership)
    author: Mapped[str] = mapped_column(String(20))  # customer | rep | ai
    text: Mapped[str] = mapped_column(Text)
    sent_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    thread: Mapped[Thread] = relationship(back_populates="messages")


class MemoryFact(Base):
    """Structured customer memory: value + evidence + confidence + extraction version. UNKNOWN stays UNKNOWN."""

    __tablename__ = "memory_facts"
    id: Mapped[int] = mapped_column(primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"), index=True)
    thread_id: Mapped[int] = mapped_column(ForeignKey("threads.id"), index=True)
    key: Mapped[str] = mapped_column(String(64))  # trade_vehicle | preferred_vehicle | timing | budget | objection | ...
    value: Mapped[str] = mapped_column(String(300))
    evidence_message_id: Mapped[int | None] = mapped_column(ForeignKey("messages.id"), nullable=True)
    confidence: Mapped[float] = mapped_column(Float, default=0.0)
    extraction_version: Mapped[str] = mapped_column(String(64))
    corrected_by_rep_id: Mapped[int | None] = mapped_column(ForeignKey("reps.id"), nullable=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    thread: Mapped[Thread] = relationship(back_populates="facts")


class Vehicle(Base):
    """Canonical vehicle. The ONLY source the AI may cite for existence, availability, price, mileage, VIN."""

    __tablename__ = "vehicles"
    __table_args__ = (UniqueConstraint("dealership_id", "stock_number", name="uq_vehicle_stock"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"), index=True)
    dealership_id: Mapped[int] = mapped_column(ForeignKey("dealerships.id"), index=True)
    stock_number: Mapped[str] = mapped_column(String(32))
    vin: Mapped[str] = mapped_column(String(17))
    year: Mapped[int] = mapped_column(Integer)
    make: Mapped[str] = mapped_column(String(40))
    model: Mapped[str] = mapped_column(String(40))
    trim: Mapped[str] = mapped_column(String(60), default="")
    color: Mapped[str] = mapped_column(String(40), default="")
    body: Mapped[str] = mapped_column(String(40), default="")  # SUV | truck | sedan
    mileage: Mapped[int] = mapped_column(Integer, default=0)
    price: Mapped[int] = mapped_column(Integer)  # whole dollars, internet price
    status: Mapped[str] = mapped_column(String(20), default="available")  # available | pending | sold
    source: Mapped[str] = mapped_column(String(64), default="seed")
    retrieved_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)  # freshness


class Appointment(Base):
    __tablename__ = "appointments"
    id: Mapped[int] = mapped_column(primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"), index=True)
    thread_id: Mapped[int] = mapped_column(ForeignKey("threads.id"), index=True)
    vehicle_id: Mapped[int | None] = mapped_column(ForeignKey("vehicles.id"), nullable=True)
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    status: Mapped[str] = mapped_column(String(20), default="requested")  # requested | confirmed | cancelled
    confirmed_by_rep_id: Mapped[int | None] = mapped_column(ForeignKey("reps.id"), nullable=True)


class StateTransition(Base):
    __tablename__ = "state_transitions"
    id: Mapped[int] = mapped_column(primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"), index=True)
    thread_id: Mapped[int] = mapped_column(ForeignKey("threads.id"), index=True)
    old_state: Mapped[str] = mapped_column(String(32))
    new_state: Mapped[str] = mapped_column(String(32))
    reason: Mapped[str] = mapped_column(String(300))
    evidence_message_id: Mapped[int | None] = mapped_column(ForeignKey("messages.id"), nullable=True)
    actor: Mapped[str] = mapped_column(String(40))  # ai:<provider> | rep:<id> | system
    rules_version: Mapped[str] = mapped_column(String(64))
    at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Draft(Base):
    """An AI-prepared reply. Nothing reaches the customer until a rep approves it."""

    __tablename__ = "drafts"
    id: Mapped[int] = mapped_column(primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"), index=True)
    thread_id: Mapped[int] = mapped_column(ForeignKey("threads.id"), index=True)
    trigger_message_id: Mapped[int | None] = mapped_column(ForeignKey("messages.id"), nullable=True)
    text: Mapped[str] = mapped_column(Text)
    structured: Mapped[dict] = mapped_column(JSON, default=dict)  # orchestrator output (intent, NBA, citations, ...)
    validation: Mapped[dict] = mapped_column(JSON, default=dict)  # claims, verdicts, risk
    risk_level: Mapped[str] = mapped_column(String(10), default="green")  # green | yellow | orange | red
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending | blocked | sent | discarded | escalated
    approval_required: Mapped[bool] = mapped_column(Boolean, default=True)
    provider: Mapped[str] = mapped_column(String(32))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class AuditEvent(Base):
    """Append-only. Every AI, human, tool and send action is attributable."""

    __tablename__ = "audit_events"
    id: Mapped[int] = mapped_column(primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"), index=True)
    thread_id: Mapped[int | None] = mapped_column(ForeignKey("threads.id"), nullable=True, index=True)
    actor: Mapped[str] = mapped_column(String(40))
    action: Mapped[str] = mapped_column(String(64))
    detail: Mapped[dict] = mapped_column(JSON, default=dict)
    at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
