from datetime import date, datetime, time
from typing import Any, Dict, List, Optional

from pydantic import BaseModel

LOCATION_TYPES = ("google_meet", "zoom", "teams", "phone", "in_person", "custom")


class EventTypeCreate(BaseModel):
    name: str
    slug: str
    duration_minutes: int = 30
    description: Optional[str] = None
    location_type: Optional[str] = None
    location_link: Optional[str] = None
    buffer_before_minutes: int = 0
    buffer_after_minutes: int = 0
    minimum_notice_minutes: int = 0
    date_range_start_days: Optional[int] = None
    date_range_end_days: Optional[int] = None
    max_bookings_per_day: Optional[int] = None
    max_future_bookings: Optional[int] = None
    timezone: Optional[str] = None
    slot_capacity: int = 1
    max_bookings_per_invitee: Optional[int] = None
    max_bookings_per_invitee_period_days: Optional[int] = None
    confirmation_mode: str = "instant"
    send_calendar_invite: bool = True
    send_email_confirmation: bool = True
    send_sms_confirmation: bool = False
    booking_notification_emails: Optional[str] = None  # comma-separated or JSON array
    reminder_minutes_before: Optional[str] = None  # JSON array e.g. [1440, 60]
    payment_required: bool = False
    price: Optional[float] = None
    currency: str = "USD"
    cancel_unpaid_after_minutes: Optional[int] = None
    allow_cancellation: bool = True
    allow_reschedule: bool = True
    cancellation_deadline_minutes: Optional[int] = None
    cancellation_message: Optional[str] = None
    redirect_after_cancellation_url: Optional[str] = None


class EventTypeUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    duration_minutes: Optional[int] = None
    description: Optional[str] = None
    location_type: Optional[str] = None
    location_link: Optional[str] = None
    buffer_before_minutes: Optional[int] = None
    buffer_after_minutes: Optional[int] = None
    minimum_notice_minutes: Optional[int] = None
    date_range_start_days: Optional[int] = None
    date_range_end_days: Optional[int] = None
    max_bookings_per_day: Optional[int] = None
    max_future_bookings: Optional[int] = None
    timezone: Optional[str] = None
    slot_capacity: Optional[int] = None
    max_bookings_per_invitee: Optional[int] = None
    max_bookings_per_invitee_period_days: Optional[int] = None
    confirmation_mode: Optional[str] = None
    send_calendar_invite: Optional[bool] = None
    send_email_confirmation: Optional[bool] = None
    send_sms_confirmation: Optional[bool] = None
    booking_notification_emails: Optional[str] = None
    reminder_minutes_before: Optional[str] = None
    payment_required: Optional[bool] = None
    price: Optional[float] = None
    currency: Optional[str] = None
    cancel_unpaid_after_minutes: Optional[int] = None
    allow_cancellation: Optional[bool] = None
    allow_reschedule: Optional[bool] = None
    cancellation_deadline_minutes: Optional[int] = None
    cancellation_message: Optional[str] = None
    redirect_after_cancellation_url: Optional[str] = None


class EventTypeResponse(BaseModel):
    id: int
    name: str
    slug: str
    duration_minutes: int
    created_at: Optional[datetime] = None
    description: Optional[str] = None
    location_type: Optional[str] = None
    location_link: Optional[str] = None
    buffer_before_minutes: int = 0
    buffer_after_minutes: int = 0
    minimum_notice_minutes: int = 0
    date_range_start_days: Optional[int] = None
    date_range_end_days: Optional[int] = None
    max_bookings_per_day: Optional[int] = None
    max_future_bookings: Optional[int] = None
    timezone: Optional[str] = None
    slot_capacity: int = 1
    max_bookings_per_invitee: Optional[int] = None
    max_bookings_per_invitee_period_days: Optional[int] = None
    confirmation_mode: str = "instant"
    send_calendar_invite: bool = True
    send_email_confirmation: bool = True
    send_sms_confirmation: bool = False
    booking_notification_emails: Optional[str] = None
    reminder_minutes_before: Optional[str] = None
    payment_required: bool = False
    price: Optional[float] = None
    currency: str = "USD"
    cancel_unpaid_after_minutes: Optional[int] = None
    allow_cancellation: bool = True
    allow_reschedule: bool = True
    cancellation_deadline_minutes: Optional[int] = None
    cancellation_message: Optional[str] = None
    redirect_after_cancellation_url: Optional[str] = None

    class Config:
        from_attributes = True


class BookingQuestionCreate(BaseModel):
    question_type: str  # text, dropdown, checkbox, radio
    label: str
    required: bool = False
    options: Optional[List[str]] = None  # for dropdown/radio
    show_if: Optional[Dict[str, Any]] = None  # { "question_id": 123, "value": "yes" }


class BookingQuestionUpdate(BaseModel):
    sort_order: Optional[int] = None
    question_type: Optional[str] = None
    label: Optional[str] = None
    required: Optional[bool] = None
    options: Optional[List[str]] = None
    show_if: Optional[Dict[str, Any]] = None


class BookingQuestionResponse(BaseModel):
    id: int
    event_type_id: int
    sort_order: int
    question_type: str
    label: str
    required: bool
    options: Optional[List[str]] = None
    show_if: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True


class AvailabilityOverrideCreate(BaseModel):
    override_date: date
    is_available: bool = True
    start_time: Optional[str] = None  # "HH:MM"
    end_time: Optional[str] = None


class AvailabilityOverrideResponse(BaseModel):
    id: int
    event_type_id: int
    override_date: date
    is_available: bool
    start_time: Optional[str] = None  # "HH:MM"
    end_time: Optional[str] = None

    class Config:
        from_attributes = True


class EventTypeMemberCreate(BaseModel):
    team_member_id: int
    sort_order: int = 0


class EventTypeMemberResponse(BaseModel):
    id: int
    event_type_id: int
    team_member_id: int
    sort_order: int

    class Config:
        from_attributes = True


class AvailabilitySlot(BaseModel):
    day_of_week: int
    start_time: str
    end_time: str


class AvailabilityBulk(BaseModel):
    slots: List[AvailabilitySlot]


class BookingCreate(BaseModel):
    event_type_id: int
    team_member_id: Optional[int] = None
    title: Optional[str] = None
    start_at: datetime
    end_at: datetime
    attendee_name: Optional[str] = None
    attendee_email: Optional[str] = None
    attendee_phone: Optional[str] = None
    form_responses: Optional[Dict[str, Any]] = None
    gdpr_consent: bool = False
    status: str = "pending_confirmation"
    amount: Optional[float] = None


class BookingPublicCreate(BaseModel):
    """Payload from public booking form (invitee)."""
    event_type_id: int
    start_at: datetime
    end_at: datetime
    attendee_name: str
    attendee_email: str
    attendee_phone: Optional[str] = None
    form_responses: Optional[Dict[str, Any]] = None
    gdpr_consent: bool = False


class BookingUpdate(BaseModel):
    title: Optional[str] = None
    start_at: Optional[datetime] = None
    end_at: Optional[datetime] = None
    attendee_name: Optional[str] = None
    attendee_email: Optional[str] = None
    attendee_phone: Optional[str] = None
    form_responses: Optional[Dict[str, Any]] = None
    gdpr_consent: Optional[bool] = None
    status: Optional[str] = None
    amount: Optional[float] = None
    payment_status: Optional[str] = None
    paid_at: Optional[datetime] = None
    refunded_at: Optional[datetime] = None


class BookingResponse(BaseModel):
    id: int
    event_type_id: int
    team_member_id: Optional[int] = None
    title: Optional[str] = None
    start_at: datetime
    end_at: datetime
    attendee_name: Optional[str] = None
    attendee_email: Optional[str] = None
    attendee_phone: Optional[str] = None
    form_responses: Optional[Dict[str, Any]] = None
    gdpr_consent: bool = False
    status: str
    amount: Optional[float] = None
    created_at: Optional[datetime] = None
    payment_status: Optional[str] = None
    paid_at: Optional[datetime] = None
    refunded_at: Optional[datetime] = None
    currency: Optional[str] = None
    cancel_token: Optional[str] = None

    class Config:
        from_attributes = True


class TeamMemberCreate(BaseModel):
    name: str


class TeamMemberResponse(BaseModel):
    id: int
    name: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class VacationBlockCreate(BaseModel):
    start_date: date
    end_date: date
    reason: Optional[str] = None


class VacationBlockResponse(BaseModel):
    id: int
    team_member_id: Optional[int] = None
    event_type_id: Optional[int] = None
    start_date: date
    end_date: date
    reason: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class CalendarConnectionResponse(BaseModel):
    id: int
    team_member_id: int
    provider: str
    email: Optional[str] = None
    sync_enabled: bool = True
    last_synced_at: Optional[datetime] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class CalendarConnectStart(BaseModel):
    team_member_id: int
    provider: str = "google"
