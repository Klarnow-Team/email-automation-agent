import json
from datetime import date, datetime, time as dt_time, timedelta, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.booking import Availability, AvailabilityOverride, Booking, BookingQuestion, BookingStatus, CalendarConnection, EventType, EventTypeMember, TeamMember, VacationBlock
from app.services.audit import audit_log as audit_log_svc
from app.schemas.booking import (
    AvailabilityBulk,
    AvailabilityOverrideCreate,
    AvailabilityOverrideResponse,
    AvailabilitySlot,
    BookingQuestionCreate,
    BookingQuestionResponse,
    BookingQuestionUpdate,
    EventTypeCreate,
    EventTypeMemberCreate,
    EventTypeMemberResponse,
    EventTypeResponse,
    EventTypeUpdate,
    VacationBlockCreate,
    VacationBlockResponse,
)

router = APIRouter()


def _event_type_to_response(et: EventType) -> dict:
    return {
        "id": et.id,
        "name": et.name,
        "slug": et.slug,
        "duration_minutes": et.duration_minutes,
        "created_at": et.created_at,
        "description": getattr(et, "description", None),
        "location_type": getattr(et, "location_type", None),
        "location_link": getattr(et, "location_link", None),
        "buffer_before_minutes": getattr(et, "buffer_before_minutes", 0) or 0,
        "buffer_after_minutes": getattr(et, "buffer_after_minutes", 0) or 0,
        "minimum_notice_minutes": getattr(et, "minimum_notice_minutes", 0) or 0,
        "date_range_start_days": getattr(et, "date_range_start_days", None),
        "date_range_end_days": getattr(et, "date_range_end_days", None),
        "max_bookings_per_day": getattr(et, "max_bookings_per_day", None),
        "max_future_bookings": getattr(et, "max_future_bookings", None),
        "timezone": getattr(et, "timezone", None),
        "slot_capacity": getattr(et, "slot_capacity", 1) or 1,
        "max_bookings_per_invitee": getattr(et, "max_bookings_per_invitee", None),
        "max_bookings_per_invitee_period_days": getattr(et, "max_bookings_per_invitee_period_days", None),
        "confirmation_mode": getattr(et, "confirmation_mode", None) or "instant",
        "send_calendar_invite": getattr(et, "send_calendar_invite", True),
        "send_email_confirmation": getattr(et, "send_email_confirmation", True),
        "send_sms_confirmation": getattr(et, "send_sms_confirmation", False),
        "booking_notification_emails": getattr(et, "booking_notification_emails", None),
        "reminder_minutes_before": getattr(et, "reminder_minutes_before", None),
        "payment_required": getattr(et, "payment_required", False),
        "price": float(et.price) if getattr(et, "price", None) is not None else None,
        "currency": getattr(et, "currency", None) or "USD",
        "cancel_unpaid_after_minutes": getattr(et, "cancel_unpaid_after_minutes", None),
        "allow_cancellation": getattr(et, "allow_cancellation", True),
        "allow_reschedule": getattr(et, "allow_reschedule", True),
        "cancellation_deadline_minutes": getattr(et, "cancellation_deadline_minutes", None),
        "cancellation_message": getattr(et, "cancellation_message", None),
        "redirect_after_cancellation_url": getattr(et, "redirect_after_cancellation_url", None),
    }


@router.get("", response_model=List[EventTypeResponse])
def list_event_types(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    rows = db.query(EventType).order_by(EventType.created_at.desc()).offset(skip).limit(limit).all()
    return [_event_type_to_response(r) for r in rows]


@router.post("", response_model=EventTypeResponse, status_code=201)
def create_event_type(body: EventTypeCreate, request: Request, db: Session = Depends(get_db)):
    existing = db.query(EventType).filter(EventType.slug == body.slug).first()
    if existing:
        raise HTTPException(status_code=400, detail="Event type with this slug already exists")
    event_type = EventType(
        name=body.name,
        slug=body.slug,
        duration_minutes=body.duration_minutes,
        description=body.description,
        location_type=body.location_type,
        location_link=body.location_link,
        buffer_before_minutes=body.buffer_before_minutes,
        buffer_after_minutes=body.buffer_after_minutes,
        minimum_notice_minutes=body.minimum_notice_minutes,
        date_range_start_days=body.date_range_start_days,
        date_range_end_days=body.date_range_end_days,
        max_bookings_per_day=body.max_bookings_per_day,
        max_future_bookings=body.max_future_bookings,
        timezone=body.timezone,
        slot_capacity=body.slot_capacity,
        max_bookings_per_invitee=body.max_bookings_per_invitee,
        max_bookings_per_invitee_period_days=body.max_bookings_per_invitee_period_days,
        confirmation_mode=getattr(body, "confirmation_mode", "instant") or "instant",
        send_calendar_invite=getattr(body, "send_calendar_invite", True),
        send_email_confirmation=getattr(body, "send_email_confirmation", True),
        send_sms_confirmation=getattr(body, "send_sms_confirmation", False),
        booking_notification_emails=getattr(body, "booking_notification_emails", None),
        reminder_minutes_before=getattr(body, "reminder_minutes_before", None),
        payment_required=getattr(body, "payment_required", False),
        price=getattr(body, "price", None),
        currency=getattr(body, "currency", "USD"),
        cancel_unpaid_after_minutes=getattr(body, "cancel_unpaid_after_minutes", None),
        allow_cancellation=getattr(body, "allow_cancellation", True),
        allow_reschedule=getattr(body, "allow_reschedule", True),
        cancellation_deadline_minutes=getattr(body, "cancellation_deadline_minutes", None),
        cancellation_message=getattr(body, "cancellation_message", None),
        redirect_after_cancellation_url=getattr(body, "redirect_after_cancellation_url", None),
    )
    db.add(event_type)
    db.commit()
    db.refresh(event_type)
    audit_log_svc(db, "event_type.create", "event_type", str(event_type.id), {"slug": event_type.slug}, request=request)
    return _event_type_to_response(event_type)


@router.get("/{event_type_id}", response_model=EventTypeResponse)
def get_event_type(event_type_id: int, db: Session = Depends(get_db)):
    et = db.query(EventType).filter(EventType.id == event_type_id).first()
    if not et:
        raise HTTPException(status_code=404, detail="Event type not found")
    return _event_type_to_response(et)


@router.patch("/{event_type_id}", response_model=EventTypeResponse)
def update_event_type(event_type_id: int, body: EventTypeUpdate, request: Request, db: Session = Depends(get_db)):
    et = db.query(EventType).filter(EventType.id == event_type_id).first()
    if not et:
        raise HTTPException(status_code=404, detail="Event type not found")
    if body.name is not None:
        et.name = body.name
    if body.slug is not None:
        existing = db.query(EventType).filter(EventType.slug == body.slug, EventType.id != event_type_id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Event type with this slug already exists")
        et.slug = body.slug
    if body.duration_minutes is not None:
        et.duration_minutes = body.duration_minutes
    if body.description is not None:
        et.description = body.description
    if body.location_type is not None:
        et.location_type = body.location_type
    if body.location_link is not None:
        et.location_link = body.location_link
    if body.buffer_before_minutes is not None:
        et.buffer_before_minutes = body.buffer_before_minutes
    if body.buffer_after_minutes is not None:
        et.buffer_after_minutes = body.buffer_after_minutes
    if body.minimum_notice_minutes is not None:
        et.minimum_notice_minutes = body.minimum_notice_minutes
    if body.date_range_start_days is not None:
        et.date_range_start_days = body.date_range_start_days
    if body.date_range_end_days is not None:
        et.date_range_end_days = body.date_range_end_days
    if body.max_bookings_per_day is not None:
        et.max_bookings_per_day = body.max_bookings_per_day
    if body.max_future_bookings is not None:
        et.max_future_bookings = body.max_future_bookings
    if body.timezone is not None:
        et.timezone = body.timezone
    if body.slot_capacity is not None:
        et.slot_capacity = body.slot_capacity
    if body.max_bookings_per_invitee is not None:
        et.max_bookings_per_invitee = body.max_bookings_per_invitee
    if body.max_bookings_per_invitee_period_days is not None:
        et.max_bookings_per_invitee_period_days = body.max_bookings_per_invitee_period_days
    if body.confirmation_mode is not None:
        et.confirmation_mode = body.confirmation_mode
    if body.send_calendar_invite is not None:
        et.send_calendar_invite = body.send_calendar_invite
    if body.send_email_confirmation is not None:
        et.send_email_confirmation = body.send_email_confirmation
    if body.send_sms_confirmation is not None:
        et.send_sms_confirmation = body.send_sms_confirmation
    if body.booking_notification_emails is not None:
        et.booking_notification_emails = body.booking_notification_emails
    if body.reminder_minutes_before is not None:
        et.reminder_minutes_before = body.reminder_minutes_before
    if body.payment_required is not None:
        et.payment_required = body.payment_required
    if body.price is not None:
        et.price = body.price
    if body.currency is not None:
        et.currency = body.currency
    if body.cancel_unpaid_after_minutes is not None:
        et.cancel_unpaid_after_minutes = body.cancel_unpaid_after_minutes
    if body.allow_cancellation is not None:
        et.allow_cancellation = body.allow_cancellation
    if body.allow_reschedule is not None:
        et.allow_reschedule = body.allow_reschedule
    if body.cancellation_deadline_minutes is not None:
        et.cancellation_deadline_minutes = body.cancellation_deadline_minutes
    if body.cancellation_message is not None:
        et.cancellation_message = body.cancellation_message
    if body.redirect_after_cancellation_url is not None:
        et.redirect_after_cancellation_url = body.redirect_after_cancellation_url
    db.commit()
    db.refresh(et)
    audit_log_svc(db, "event_type.update", "event_type", str(event_type_id), {}, request=request)
    return _event_type_to_response(et)


@router.delete("/{event_type_id}", status_code=204)
def delete_event_type(event_type_id: int, request: Request, db: Session = Depends(get_db)):
    et = db.query(EventType).filter(EventType.id == event_type_id).first()
    if not et:
        raise HTTPException(status_code=404, detail="Event type not found")
    db.delete(et)
    db.commit()
    audit_log_svc(db, "event_type.delete", "event_type", str(event_type_id), {}, request=request)
    return None


# --- Availability ---

@router.get("/{event_type_id}/availability")
def get_availability(event_type_id: int, db: Session = Depends(get_db)):
    et = db.query(EventType).filter(EventType.id == event_type_id).first()
    if not et:
        raise HTTPException(status_code=404, detail="Event type not found")
    slots = db.query(Availability).filter(Availability.event_type_id == event_type_id).all()
    return [
        {
            "id": s.id,
            "day_of_week": s.day_of_week,
            "start_time": s.start_time.strftime("%H:%M") if s.start_time else None,
            "end_time": s.end_time.strftime("%H:%M") if s.end_time else None,
        }
        for s in slots
    ]


@router.put("/{event_type_id}/availability")
def set_availability(event_type_id: int, body: AvailabilityBulk, db: Session = Depends(get_db)):
    et = db.query(EventType).filter(EventType.id == event_type_id).first()
    if not et:
        raise HTTPException(status_code=404, detail="Event type not found")
    db.query(Availability).filter(Availability.event_type_id == event_type_id).delete()
    for slot in body.slots:
        start_parts = slot.start_time.split(":")
        end_parts = slot.end_time.split(":")
        start_t = dt_time(int(start_parts[0]), int(start_parts[1]) if len(start_parts) > 1 else 0)
        end_t = dt_time(int(end_parts[0]), int(end_parts[1]) if len(end_parts) > 1 else 0)
        a = Availability(
            event_type_id=event_type_id,
            day_of_week=slot.day_of_week,
            start_time=start_t,
            end_time=end_t,
        )
        db.add(a)
    db.commit()
    return {"updated": len(body.slots)}


# --- Availability overrides ---

@router.get("/{event_type_id}/availability-overrides", response_model=List[AvailabilityOverrideResponse])
def list_availability_overrides(event_type_id: int, db: Session = Depends(get_db)):
    et = db.query(EventType).filter(EventType.id == event_type_id).first()
    if not et:
        raise HTTPException(status_code=404, detail="Event type not found")
    rows = db.query(AvailabilityOverride).filter(AvailabilityOverride.event_type_id == event_type_id).order_by(AvailabilityOverride.override_date).all()
    return [
        {
            "id": r.id,
            "event_type_id": r.event_type_id,
            "override_date": r.override_date,
            "is_available": r.is_available,
            "start_time": r.start_time.strftime("%H:%M") if r.start_time else None,
            "end_time": r.end_time.strftime("%H:%M") if r.end_time else None,
        }
        for r in rows
    ]


@router.post("/{event_type_id}/availability-overrides", response_model=AvailabilityOverrideResponse, status_code=201)
def create_availability_override(event_type_id: int, body: AvailabilityOverrideCreate, db: Session = Depends(get_db)):
    et = db.query(EventType).filter(EventType.id == event_type_id).first()
    if not et:
        raise HTTPException(status_code=404, detail="Event type not found")
    existing = db.query(AvailabilityOverride).filter(
        AvailabilityOverride.event_type_id == event_type_id,
        AvailabilityOverride.override_date == body.override_date,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Override for this date already exists")
    start_t = None
    end_t = None
    if body.is_available and body.start_time and body.end_time:
        sp = body.start_time.split(":")
        ep = body.end_time.split(":")
        start_t = dt_time(int(sp[0]), int(sp[1]) if len(sp) > 1 else 0)
        end_t = dt_time(int(ep[0]), int(ep[1]) if len(ep) > 1 else 0)
    ov = AvailabilityOverride(
        event_type_id=event_type_id,
        override_date=body.override_date,
        is_available=body.is_available,
        start_time=start_t,
        end_time=end_t,
    )
    db.add(ov)
    db.commit()
    db.refresh(ov)
    return {
        "id": ov.id,
        "event_type_id": ov.event_type_id,
        "override_date": ov.override_date,
        "is_available": ov.is_available,
        "start_time": ov.start_time.strftime("%H:%M") if ov.start_time else None,
        "end_time": ov.end_time.strftime("%H:%M") if ov.end_time else None,
    }


@router.delete("/{event_type_id}/availability-overrides/{override_id}", status_code=204)
def delete_availability_override(event_type_id: int, override_id: int, db: Session = Depends(get_db)):
    ov = db.query(AvailabilityOverride).filter(
        AvailabilityOverride.id == override_id,
        AvailabilityOverride.event_type_id == event_type_id,
    ).first()
    if not ov:
        raise HTTPException(status_code=404, detail="Override not found")
    db.delete(ov)
    db.commit()
    return None


# --- Vacation blocks (per event type) ---

@router.get("/{event_type_id}/vacation-blocks", response_model=List[VacationBlockResponse])
def list_event_type_vacation_blocks(event_type_id: int, db: Session = Depends(get_db)):
    et = db.query(EventType).filter(EventType.id == event_type_id).first()
    if not et:
        raise HTTPException(status_code=404, detail="Event type not found")
    rows = db.query(VacationBlock).filter(VacationBlock.event_type_id == event_type_id).order_by(VacationBlock.start_date).all()
    return rows


@router.post("/{event_type_id}/vacation-blocks", response_model=VacationBlockResponse, status_code=201)
def create_event_type_vacation_block(event_type_id: int, body: VacationBlockCreate, db: Session = Depends(get_db)):
    et = db.query(EventType).filter(EventType.id == event_type_id).first()
    if not et:
        raise HTTPException(status_code=404, detail="Event type not found")
    if body.end_date < body.start_date:
        raise HTTPException(status_code=400, detail="end_date must be >= start_date")
    vb = VacationBlock(event_type_id=event_type_id, start_date=body.start_date, end_date=body.end_date, reason=body.reason)
    db.add(vb)
    db.commit()
    db.refresh(vb)
    return vb


@router.delete("/{event_type_id}/vacation-blocks/{block_id}", status_code=204)
def delete_event_type_vacation_block(event_type_id: int, block_id: int, db: Session = Depends(get_db)):
    vb = db.query(VacationBlock).filter(
        VacationBlock.id == block_id,
        VacationBlock.event_type_id == event_type_id,
    ).first()
    if not vb:
        raise HTTPException(status_code=404, detail="Vacation block not found")
    db.delete(vb)
    db.commit()
    return None


# --- Booking form questions ---

def _question_to_response(q: BookingQuestion) -> dict:
    options = None
    if q.options:
        try:
            options = json.loads(q.options)
        except (TypeError, ValueError):
            pass
    show_if = None
    if q.show_if:
        try:
            show_if = json.loads(q.show_if)
        except (TypeError, ValueError):
            pass
    return {
        "id": q.id,
        "event_type_id": q.event_type_id,
        "sort_order": q.sort_order,
        "question_type": q.question_type,
        "label": q.label,
        "required": q.required,
        "options": options,
        "show_if": show_if,
    }


@router.get("/{event_type_id}/booking-questions", response_model=List[BookingQuestionResponse])
def list_booking_questions(event_type_id: int, db: Session = Depends(get_db)):
    et = db.query(EventType).filter(EventType.id == event_type_id).first()
    if not et:
        raise HTTPException(status_code=404, detail="Event type not found")
    rows = db.query(BookingQuestion).filter(BookingQuestion.event_type_id == event_type_id).order_by(BookingQuestion.sort_order, BookingQuestion.id).all()
    return [_question_to_response(r) for r in rows]


@router.post("/{event_type_id}/booking-questions", response_model=BookingQuestionResponse, status_code=201)
def create_booking_question(event_type_id: int, body: BookingQuestionCreate, db: Session = Depends(get_db)):
    et = db.query(EventType).filter(EventType.id == event_type_id).first()
    if not et:
        raise HTTPException(status_code=404, detail="Event type not found")
    if body.question_type not in ("text", "dropdown", "checkbox", "radio"):
        raise HTTPException(status_code=400, detail="question_type must be text, dropdown, checkbox, or radio")
    options_str = json.dumps(body.options) if body.options else None
    show_if_str = json.dumps(body.show_if) if body.show_if else None
    max_order = db.query(BookingQuestion).filter(BookingQuestion.event_type_id == event_type_id).count()
    q = BookingQuestion(
        event_type_id=event_type_id,
        sort_order=max_order,
        question_type=body.question_type,
        label=body.label,
        required=body.required,
        options=options_str,
        show_if=show_if_str,
    )
    db.add(q)
    db.commit()
    db.refresh(q)
    return _question_to_response(q)


@router.patch("/{event_type_id}/booking-questions/{question_id}", response_model=BookingQuestionResponse)
def update_booking_question(event_type_id: int, question_id: int, body: BookingQuestionUpdate, db: Session = Depends(get_db)):
    q = db.query(BookingQuestion).filter(
        BookingQuestion.id == question_id,
        BookingQuestion.event_type_id == event_type_id,
    ).first()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")
    if body.sort_order is not None:
        q.sort_order = body.sort_order
    if body.question_type is not None:
        if body.question_type not in ("text", "dropdown", "checkbox", "radio"):
            raise HTTPException(status_code=400, detail="question_type must be text, dropdown, checkbox, or radio")
        q.question_type = body.question_type
    if body.label is not None:
        q.label = body.label
    if body.required is not None:
        q.required = body.required
    if body.options is not None:
        q.options = json.dumps(body.options) if body.options else None
    if body.show_if is not None:
        q.show_if = json.dumps(body.show_if) if body.show_if else None
    db.commit()
    db.refresh(q)
    return _question_to_response(q)


@router.delete("/{event_type_id}/booking-questions/{question_id}", status_code=204)
def delete_booking_question(event_type_id: int, question_id: int, db: Session = Depends(get_db)):
    q = db.query(BookingQuestion).filter(
        BookingQuestion.id == question_id,
        BookingQuestion.event_type_id == event_type_id,
    ).first()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")
    db.delete(q)
    db.commit()
    return None


# --- Available slots (for booking widget / public page) ---

def _day_of_week_sun0(d: date) -> int:
    """Return 0=Sunday, 1=Monday, ... 6=Saturday."""
    return (d.weekday() + 1) % 7


@router.get("/{event_type_id}/available-slots")
def get_available_slots(
    event_type_id: int,
    from_date: date = Query(..., alias="from", description="Start date (YYYY-MM-DD)"),
    to_date: date = Query(..., alias="to", description="End date (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
):
    """Return bookable slot start/end times for the event type in the given date range, respecting weekly availability, overrides, minimum notice, date range limits, and existing bookings."""
    et = db.query(EventType).filter(EventType.id == event_type_id).first()
    if not et:
        raise HTTPException(status_code=404, detail="Event type not found")
    if to_date < from_date:
        raise HTTPException(status_code=400, detail="to must be >= from")
    duration_minutes = getattr(et, "duration_minutes", 30) or 30
    min_notice = getattr(et, "minimum_notice_minutes", 0) or 0
    range_start_days = getattr(et, "date_range_start_days", None)
    range_end_days = getattr(et, "date_range_end_days", None)
    max_per_day = getattr(et, "max_bookings_per_day", None)
    slot_capacity = getattr(et, "slot_capacity", 1) or 1

    now = datetime.now(timezone.utc)
    today = now.date()

    weekly = db.query(Availability).filter(Availability.event_type_id == event_type_id).all()
    overrides = (
        db.query(AvailabilityOverride)
        .filter(
            AvailabilityOverride.event_type_id == event_type_id,
            AvailabilityOverride.override_date >= from_date,
            AvailabilityOverride.override_date <= to_date,
        )
        .all()
    )
    override_by_date = {o.override_date: o for o in overrides}

    # Vacation blocks: event-type-level and team-member-level (any member on vacation = day excluded for event type)
    vacation_dates: set = set()
    for vb in db.query(VacationBlock).filter(VacationBlock.event_type_id == event_type_id).all():
        d0 = vb.start_date
        while d0 <= vb.end_date:
            vacation_dates.add(d0)
            d0 += timedelta(days=1)
    member_ids = [m.team_member_id for m in db.query(EventTypeMember).filter(EventTypeMember.event_type_id == event_type_id).all()]
    for vb in db.query(VacationBlock).filter(VacationBlock.team_member_id.in_(member_ids)).all() if member_ids else []:
        d0 = vb.start_date
        while d0 <= vb.end_date:
            vacation_dates.add(d0)
            d0 += timedelta(days=1)

    from app.models.booking import BookingStatus
    from_ts = datetime.combine(from_date, dt_time.min).replace(tzinfo=timezone.utc)
    to_ts_end = datetime.combine(to_date, dt_time.max).replace(tzinfo=timezone.utc)
    existing = (
        db.query(Booking)
        .filter(
            Booking.event_type_id == event_type_id,
            Booking.end_at > from_ts,
            Booking.start_at < to_ts_end,
            ~Booking.status.in_([BookingStatus.cancelled, BookingStatus.refunded]),
        )
        .all()
    )

    # External calendar busy: fetch from connected calendars for this event type's members
    from app.services import calendar_service as cal_svc
    external_busy: List[tuple] = []
    if member_ids:
        for conn in (
            db.query(CalendarConnection)
            .filter(
                CalendarConnection.team_member_id.in_(member_ids),
                CalendarConnection.sync_enabled == True,
                CalendarConnection.refresh_token.isnot(None),
            )
        .all()
    ):
            if conn.provider == "google" and conn.refresh_token:
                try:
                    external_busy.extend(
                        cal_svc.fetch_google_busy(conn.refresh_token, from_ts, to_ts_end)
                    )
                except Exception:
                    pass

    slots_out: List[dict] = []
    delta = timedelta(days=1)
    d = from_date
    while d <= to_date:
        if range_start_days is not None and d < today + timedelta(days=range_start_days):
            d += delta
            continue
        if range_end_days is not None and d > today + timedelta(days=range_end_days):
            d += delta
            continue
        if d in vacation_dates:
            d += delta
            continue
        override = override_by_date.get(d)
        if override is not None and not override.is_available:
            d += delta
            continue

        day_week = _day_of_week_sun0(d)
        windows: List[tuple] = []
        if override is not None and override.is_available and override.start_time and override.end_time:
            windows = [(override.start_time, override.end_time)]
        else:
            for av in weekly:
                if av.day_of_week == day_week and av.start_time and av.end_time:
                    windows.append((av.start_time, av.end_time))

        for start_t, end_t in windows:
            slot_start_dt = datetime.combine(d, start_t).replace(tzinfo=timezone.utc)
            end_dt = datetime.combine(d, end_t).replace(tzinfo=timezone.utc)
            if end_dt <= slot_start_dt:
                continue
            while slot_start_dt + timedelta(minutes=duration_minutes) <= end_dt:
                slot_end_dt = slot_start_dt + timedelta(minutes=duration_minutes)
                if slot_start_dt < now + timedelta(minutes=min_notice):
                    slot_start_dt = slot_start_dt + timedelta(minutes=15)
                    continue
                overlap_count = sum(
                    1
                    for b in existing
                    if b.start_at and b.end_at
                    and b.start_at < slot_end_dt
                    and b.end_at > slot_start_dt
                )
                if overlap_count >= slot_capacity:
                    slot_start_dt = slot_start_dt + timedelta(minutes=15)
                    continue
                # Exclude slot if it overlaps any external calendar busy
                if any(
                    bus_start < slot_end_dt and bus_end > slot_start_dt
                    for bus_start, bus_end in external_busy
                ):
                    slot_start_dt = slot_start_dt + timedelta(minutes=15)
                    continue
                if max_per_day is not None:
                    day_start = datetime.combine(d, dt_time.min).replace(tzinfo=timezone.utc)
                    day_end = day_start + timedelta(days=1)
                    day_count = sum(
                        1
                        for b in existing
                        if b.start_at and day_start <= b.start_at < day_end
                    )
                    if day_count >= max_per_day:
                        break
                slots_out.append({
                    "start": slot_start_dt.isoformat(),
                    "end": slot_end_dt.isoformat(),
                })
                slot_start_dt = slot_start_dt + timedelta(minutes=15)
        d += delta

    return {"slots": slots_out}


# --- Event type members (round robin / pool) ---

@router.get("/{event_type_id}/members", response_model=List[EventTypeMemberResponse])
def list_event_type_members(event_type_id: int, db: Session = Depends(get_db)):
    et = db.query(EventType).filter(EventType.id == event_type_id).first()
    if not et:
        raise HTTPException(status_code=404, detail="Event type not found")
    return db.query(EventTypeMember).filter(EventTypeMember.event_type_id == event_type_id).order_by(EventTypeMember.sort_order).all()


@router.post("/{event_type_id}/members", response_model=EventTypeMemberResponse, status_code=201)
def add_event_type_member(event_type_id: int, body: EventTypeMemberCreate, db: Session = Depends(get_db)):
    et = db.query(EventType).filter(EventType.id == event_type_id).first()
    if not et:
        raise HTTPException(status_code=404, detail="Event type not found")
    tm = db.query(TeamMember).filter(TeamMember.id == body.team_member_id).first()
    if not tm:
        raise HTTPException(status_code=404, detail="Team member not found")
    existing = db.query(EventTypeMember).filter(
        EventTypeMember.event_type_id == event_type_id,
        EventTypeMember.team_member_id == body.team_member_id,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Member already assigned")
    em = EventTypeMember(event_type_id=event_type_id, team_member_id=body.team_member_id, sort_order=body.sort_order)
    db.add(em)
    db.commit()
    db.refresh(em)
    return em


@router.delete("/{event_type_id}/members/{member_id}", status_code=204)
def remove_event_type_member(event_type_id: int, member_id: int, db: Session = Depends(get_db)):
    em = db.query(EventTypeMember).filter(
        EventTypeMember.id == member_id,
        EventTypeMember.event_type_id == event_type_id,
    ).first()
    if not em:
        raise HTTPException(status_code=404, detail="Member assignment not found")
    db.delete(em)
    db.commit()
    return None
