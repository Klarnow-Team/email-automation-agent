"""Booking domain: event types, team members, bookings, availability."""
import enum
from decimal import Decimal
from sqlalchemy import Column, Date, DateTime, Enum, ForeignKey, Integer, Numeric, String, Text, Time, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class BookingStatus(str, enum.Enum):
    pending_confirmation = "pending_confirmation"
    confirmed = "confirmed"
    cancelled = "cancelled"
    rescheduled = "rescheduled"
    no_show = "no_show"
    completed = "completed"
    refunded = "refunded"


class EventType(Base):
    __tablename__ = "event_types"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    slug = Column(String(255), nullable=False, unique=True, index=True)
    duration_minutes = Column(Integer, default=30, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    # Basic settings
    description = Column(Text, nullable=True)
    location_type = Column(String(50), nullable=True)  # google_meet, zoom, teams, phone, in_person, custom
    location_link = Column(String(500), nullable=True)
    buffer_before_minutes = Column(Integer, default=0, nullable=False)
    buffer_after_minutes = Column(Integer, default=0, nullable=False)
    minimum_notice_minutes = Column(Integer, default=0, nullable=False)
    date_range_start_days = Column(Integer, nullable=True)
    date_range_end_days = Column(Integer, nullable=True)
    max_bookings_per_day = Column(Integer, nullable=True)
    max_future_bookings = Column(Integer, nullable=True)
    timezone = Column(String(64), nullable=True)
    slot_capacity = Column(Integer, default=1, nullable=False)  # 1 = 1:1, >1 = group
    max_bookings_per_invitee = Column(Integer, nullable=True)
    max_bookings_per_invitee_period_days = Column(Integer, nullable=True)
    # Booking flow (user side)
    confirmation_mode = Column(String(20), default="instant", nullable=False)  # instant | manual
    send_calendar_invite = Column(Boolean, default=True, nullable=False)
    send_email_confirmation = Column(Boolean, default=True, nullable=False)
    send_sms_confirmation = Column(Boolean, default=False, nullable=False)
    # Comma-separated emails to notify on new booking (host/team)
    booking_notification_emails = Column(Text, nullable=True)
    # JSON array of minutes before start to send reminder, e.g. [1440, 60] for 24h and 1h
    reminder_minutes_before = Column(Text, nullable=True)

    # Payment (optional): require payment before confirmation
    payment_required = Column(Boolean, default=False, nullable=False)
    price = Column(Numeric(10, 2), nullable=True)
    currency = Column(String(3), default="USD", nullable=False)
    cancel_unpaid_after_minutes = Column(Integer, nullable=True)

    # Reschedule & cancellation controls
    allow_cancellation = Column(Boolean, default=True, nullable=False)
    allow_reschedule = Column(Boolean, default=True, nullable=False)
    cancellation_deadline_minutes = Column(Integer, nullable=True)  # e.g. 1440 = 24h before
    cancellation_message = Column(Text, nullable=True)
    redirect_after_cancellation_url = Column(String(500), nullable=True)

    bookings = relationship("Booking", back_populates="event_type")
    booking_questions = relationship("BookingQuestion", back_populates="event_type", cascade="all, delete-orphan")
    availability = relationship("Availability", back_populates="event_type", cascade="all, delete-orphan")
    availability_overrides = relationship("AvailabilityOverride", back_populates="event_type", cascade="all, delete-orphan")
    event_type_members = relationship("EventTypeMember", back_populates="event_type", cascade="all, delete-orphan")
    vacation_blocks = relationship("VacationBlock", back_populates="event_type", cascade="all, delete-orphan")


class TeamMember(Base):
    __tablename__ = "team_members"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    bookings = relationship("Booking", back_populates="team_member")
    event_type_members = relationship("EventTypeMember", back_populates="team_member", cascade="all, delete-orphan")
    vacation_blocks = relationship("VacationBlock", back_populates="team_member", cascade="all, delete-orphan")
    calendar_connections = relationship("CalendarConnection", back_populates="team_member", cascade="all, delete-orphan")


class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    event_type_id = Column(Integer, ForeignKey("event_types.id", ondelete="CASCADE"), nullable=False)
    team_member_id = Column(Integer, ForeignKey("team_members.id", ondelete="SET NULL"), nullable=True)
    title = Column(String(500), nullable=True)
    start_at = Column(DateTime(timezone=True), nullable=False)
    end_at = Column(DateTime(timezone=True), nullable=False)
    attendee_name = Column(String(255), nullable=True)
    attendee_email = Column(String(255), nullable=True)
    attendee_phone = Column(String(50), nullable=True)
    form_responses = Column(Text, nullable=True)  # JSON: { "question_id": "value" }
    gdpr_consent = Column(Boolean, default=False, nullable=False)
    status = Column(Enum(BookingStatus), default=BookingStatus.pending_confirmation, nullable=False)
    amount = Column(Numeric(10, 2), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    # Payment tracking
    payment_status = Column(String(20), default="none", nullable=False)  # none, pending, paid, refunded
    stripe_payment_intent_id = Column(String(255), nullable=True)
    paid_at = Column(DateTime(timezone=True), nullable=True)
    refunded_at = Column(DateTime(timezone=True), nullable=True)
    currency = Column(String(3), nullable=True)
    cancel_token = Column(String(64), nullable=True, index=True)

    event_type = relationship("EventType", back_populates="bookings")
    team_member = relationship("TeamMember", back_populates="bookings")
    reminders = relationship("BookingReminder", back_populates="booking", cascade="all, delete-orphan")


class BookingReminder(Base):
    """Scheduled reminder for a booking (email/SMS). Processed by worker."""
    __tablename__ = "booking_reminders"

    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id", ondelete="CASCADE"), nullable=False)
    remind_at = Column(DateTime(timezone=True), nullable=False)
    channel = Column(String(20), default="email", nullable=False)  # email, sms
    minutes_before = Column(Integer, nullable=False)  # e.g. 1440 for 24h
    sent_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    booking = relationship("Booking", back_populates="reminders")


class Availability(Base):
    __tablename__ = "availability"

    id = Column(Integer, primary_key=True, index=True)
    event_type_id = Column(Integer, ForeignKey("event_types.id", ondelete="CASCADE"), nullable=False)
    day_of_week = Column(Integer, nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)

    event_type = relationship("EventType", back_populates="availability")


class AvailabilityOverride(Base):
    __tablename__ = "availability_overrides"

    id = Column(Integer, primary_key=True, index=True)
    event_type_id = Column(Integer, ForeignKey("event_types.id", ondelete="CASCADE"), nullable=False)
    override_date = Column(Date, nullable=False)
    is_available = Column(Boolean, default=True, nullable=False)
    start_time = Column(Time, nullable=True)
    end_time = Column(Time, nullable=True)

    event_type = relationship("EventType", back_populates="availability_overrides")


class EventTypeMember(Base):
    __tablename__ = "event_type_members"

    id = Column(Integer, primary_key=True, index=True)
    event_type_id = Column(Integer, ForeignKey("event_types.id", ondelete="CASCADE"), nullable=False)
    team_member_id = Column(Integer, ForeignKey("team_members.id", ondelete="CASCADE"), nullable=False)
    sort_order = Column(Integer, default=0, nullable=False)

    event_type = relationship("EventType", back_populates="event_type_members")
    team_member = relationship("TeamMember", back_populates="event_type_members")


class BookingQuestion(Base):
    """Custom question on the booking form (text, dropdown, checkbox, radio)."""
    __tablename__ = "booking_questions"

    id = Column(Integer, primary_key=True, index=True)
    event_type_id = Column(Integer, ForeignKey("event_types.id", ondelete="CASCADE"), nullable=False)
    sort_order = Column(Integer, default=0, nullable=False)
    question_type = Column(String(20), nullable=False)  # text, dropdown, checkbox, radio
    label = Column(String(500), nullable=False)
    required = Column(Boolean, default=False, nullable=False)
    options = Column(Text, nullable=True)  # JSON array for dropdown/radio: ["A","B"]
    show_if = Column(Text, nullable=True)  # JSON: { "question_id": 123, "value": "yes" } for conditional

    event_type = relationship("EventType", back_populates="booking_questions")


class VacationBlock(Base):
    """Date range when the team member or event type is fully unavailable (vacation / time off)."""
    __tablename__ = "vacation_blocks"

    id = Column(Integer, primary_key=True, index=True)
    team_member_id = Column(Integer, ForeignKey("team_members.id", ondelete="CASCADE"), nullable=True)
    event_type_id = Column(Integer, ForeignKey("event_types.id", ondelete="CASCADE"), nullable=True)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    reason = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    team_member = relationship("TeamMember", back_populates="vacation_blocks")
    event_type = relationship("EventType", back_populates="vacation_blocks")


class CalendarConnection(Base):
    """OAuth connection to an external calendar (Google, Outlook, etc.) for busy detection."""
    __tablename__ = "calendar_connections"

    id = Column(Integer, primary_key=True, index=True)
    team_member_id = Column(Integer, ForeignKey("team_members.id", ondelete="CASCADE"), nullable=False)
    provider = Column(String(50), nullable=False)  # google, outlook, apple
    email = Column(String(255), nullable=True)
    refresh_token = Column(Text, nullable=True)  # store encrypted in production
    sync_enabled = Column(Boolean, default=True, nullable=False)
    last_synced_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    team_member = relationship("TeamMember", back_populates="calendar_connections")
