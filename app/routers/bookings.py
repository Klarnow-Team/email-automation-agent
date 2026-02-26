import json
import uuid
from datetime import datetime, timedelta, time, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.booking import Booking, BookingReminder, BookingStatus, EventType, EventTypeMember, TeamMember
from app.schemas.booking import BookingCreate, BookingUpdate, BookingResponse
from app.services.booking_cancellation import check_cancellation_allowed, check_reschedule_allowed
from app.services.booking_confirmation import (
    parse_notification_emails,
    parse_reminder_minutes,
    send_booking_cancellation_email,
    send_booking_confirmation_email,
    send_booking_reschedule_email,
    send_host_notification_email,
)
from app.services.event_bus import emit as event_emit
from app.services.audit import audit_log as audit_log_svc

router = APIRouter()


def _booking_payload(b: Booking) -> Dict[str, Any]:
    return {
        "booking_id": b.id,
        "event_type_id": b.event_type_id,
        "team_member_id": b.team_member_id,
        "start_at": b.start_at.isoformat() if b.start_at else None,
        "end_at": b.end_at.isoformat() if b.end_at else None,
        "attendee_email": b.attendee_email,
        "attendee_name": b.attendee_name,
        "status": b.status.value if hasattr(b.status, "value") else str(b.status),
    }


def _enqueue_reminders(db: Session, booking: Booking, et: EventType) -> None:
    """Create BookingReminder rows for this booking from event type reminder_minutes_before."""
    minutes_list = parse_reminder_minutes(getattr(et, "reminder_minutes_before", None))
    if not minutes_list or not booking.start_at:
        return
    start = booking.start_at
    if start.tzinfo is None:
        start = start.replace(tzinfo=timezone.utc)
    for mins in minutes_list:
        remind_at = start - timedelta(minutes=mins)
        if remind_at <= datetime.now(timezone.utc):
            continue
        r = BookingReminder(
            booking_id=booking.id,
            remind_at=remind_at,
            channel="email",
            minutes_before=mins,
        )
        db.add(r)
    db.commit()


def _validate_booking_limits(et: EventType, start_at: datetime, end_at: datetime, attendee_email: Optional[str], booking_id: Optional[int], db: Session) -> None:
    """Raise HTTPException if booking violates event type limits."""
    now = datetime.now(timezone.utc) if start_at.tzinfo else datetime.utcnow()
    if start_at.tzinfo is None:
        start_at = start_at.replace(tzinfo=timezone.utc)
    start_date = start_at.date()

    min_notice = getattr(et, "minimum_notice_minutes", None) or 0
    if min_notice > 0:
        cutoff = now + timedelta(minutes=min_notice)
        if start_at < cutoff:
            raise HTTPException(status_code=409, detail=f"Bookings require at least {min_notice} minutes notice.")

    range_start = getattr(et, "date_range_start_days", None)
    if range_start is not None:
        from_date = (now.replace(tzinfo=start_at.tzinfo) if now.tzinfo else now).date() + timedelta(days=range_start)
        if start_date < from_date:
            raise HTTPException(status_code=409, detail="Booking is before the allowed start date.")
    range_end = getattr(et, "date_range_end_days", None)
    if range_end is not None:
        to_date = (now.replace(tzinfo=start_at.tzinfo) if now.tzinfo else now).date() + timedelta(days=range_end)
        if start_date > to_date:
            raise HTTPException(status_code=409, detail="Booking is after the allowed end date.")

    max_per_day = getattr(et, "max_bookings_per_day", None)
    if max_per_day is not None:
        tz = start_at.tzinfo
        day_start = datetime.combine(start_date, time.min).replace(tzinfo=tz) if tz else datetime.combine(start_date, time.min)
        day_end = day_start + timedelta(days=1)
        q = db.query(Booking).filter(Booking.event_type_id == et.id, Booking.start_at >= day_start, Booking.start_at < day_end)
        if booking_id is not None:
            q = q.filter(Booking.id != booking_id)
        if q.count() >= max_per_day:
            raise HTTPException(status_code=409, detail=f"Maximum bookings per day ({max_per_day}) reached for this event type.")

    max_future = getattr(et, "max_future_bookings", None)
    if max_future is not None:
        q = db.query(Booking).filter(
            Booking.event_type_id == et.id,
            Booking.start_at > now,
            Booking.status.in_([BookingStatus.confirmed, BookingStatus.pending_confirmation]),
        )
        if booking_id is not None:
            q = q.filter(Booking.id != booking_id)
        if q.count() >= max_future:
            raise HTTPException(status_code=409, detail=f"Maximum future bookings ({max_future}) reached for this event type.")

    if attendee_email and getattr(et, "max_bookings_per_invitee", None) is not None:
        period_days = getattr(et, "max_bookings_per_invitee_period_days", None) or 365
        period_start = start_at - timedelta(days=period_days)
        q = db.query(Booking).filter(
            Booking.event_type_id == et.id,
            Booking.attendee_email == attendee_email,
            Booking.start_at >= period_start,
            Booking.status.in_([BookingStatus.confirmed, BookingStatus.pending_confirmation]),
        )
        if booking_id is not None:
            q = q.filter(Booking.id != booking_id)
        if q.count() >= et.max_bookings_per_invitee:
            raise HTTPException(status_code=409, detail=f"This invitee may only have {et.max_bookings_per_invitee} booking(s) per {period_days} days.")


def _booking_to_response(b: Booking) -> dict:
    form_responses = None
    if getattr(b, "form_responses", None):
        try:
            form_responses = json.loads(b.form_responses) if isinstance(b.form_responses, str) else b.form_responses
        except (TypeError, ValueError):
            pass
    return {
        "id": b.id,
        "event_type_id": b.event_type_id,
        "team_member_id": b.team_member_id,
        "title": b.title,
        "start_at": b.start_at.isoformat() if b.start_at else None,
        "end_at": b.end_at.isoformat() if b.end_at else None,
        "attendee_name": b.attendee_name,
        "attendee_email": b.attendee_email,
        "attendee_phone": getattr(b, "attendee_phone", None),
        "form_responses": form_responses,
        "gdpr_consent": getattr(b, "gdpr_consent", False),
        "status": b.status.value if hasattr(b.status, "value") else str(b.status),
        "amount": float(b.amount) if b.amount is not None else None,
        "created_at": b.created_at.isoformat() if b.created_at else None,
        "payment_status": getattr(b, "payment_status", None),
        "paid_at": b.paid_at.isoformat() if getattr(b, "paid_at", None) else None,
        "refunded_at": b.refunded_at.isoformat() if getattr(b, "refunded_at", None) else None,
        "currency": getattr(b, "currency", None),
        "cancel_token": getattr(b, "cancel_token", None),
    }


@router.get("", response_model=List[BookingResponse])
def list_bookings(
    skip: int = 0,
    limit: int = 100,
    event_type_id: Optional[int] = None,
    status: Optional[str] = None,
    from_date: Optional[datetime] = Query(None, alias="from"),
    to_date: Optional[datetime] = Query(None, alias="to"),
    db: Session = Depends(get_db),
):
    q = db.query(Booking).order_by(Booking.start_at.desc())
    if event_type_id is not None:
        q = q.filter(Booking.event_type_id == event_type_id)
    if status is not None:
        q = q.filter(Booking.status == status)
    if from_date is not None:
        q = q.filter(Booking.start_at >= from_date)
    if to_date is not None:
        q = q.filter(Booking.start_at <= to_date)
    rows = q.offset(skip).limit(limit).all()
    return [_booking_to_response(r) for r in rows]


@router.post("", status_code=201)
def create_booking(body: BookingCreate, request: Request, db: Session = Depends(get_db)):
    et = db.query(EventType).filter(EventType.id == body.event_type_id).first()
    if not et:
        raise HTTPException(status_code=404, detail="Event type not found")
    slot_capacity = getattr(et, "slot_capacity", 1) or 1
    overlap_other = db.query(Booking).filter(
        Booking.event_type_id != et.id,
        Booking.start_at < body.end_at,
        Booking.end_at > body.start_at,
    ).first()
    if overlap_other:
        raise HTTPException(status_code=409, detail="This time slot is already booked by another event type.")
    overlap_same_count = db.query(Booking).filter(
        Booking.event_type_id == et.id,
        Booking.start_at < body.end_at,
        Booking.end_at > body.start_at,
    ).count()
    if overlap_same_count >= slot_capacity:
        raise HTTPException(status_code=409, detail="This time slot is full for this event type.")
    _validate_booking_limits(et, body.start_at, body.end_at, body.attendee_email, None, db)
    team_member_id = body.team_member_id
    if team_member_id is None:
        members = (
            db.query(EventTypeMember)
            .filter(EventTypeMember.event_type_id == et.id)
            .order_by(EventTypeMember.sort_order)
            .all()
        )
        if members:
            last_booking = (
                db.query(Booking)
                .filter(Booking.event_type_id == et.id)
                .order_by(Booking.start_at.desc())
                .first()
            )
            member_ids = [m.team_member_id for m in members]
            if last_booking and last_booking.team_member_id in member_ids:
                idx = member_ids.index(last_booking.team_member_id)
                next_idx = (idx + 1) % len(member_ids)
                team_member_id = member_ids[next_idx]
            else:
                team_member_id = member_ids[0]
    status_enum = BookingStatus(body.status) if body.status in [s.value for s in BookingStatus] else BookingStatus.pending_confirmation
    form_responses_str = json.dumps(body.form_responses) if getattr(body, "form_responses", None) else None
    payment_required = getattr(et, "payment_required", False)
    amount = body.amount
    currency = getattr(et, "currency", None) or "USD"
    if payment_required and amount is None and getattr(et, "price", None) is not None:
        amount = float(et.price)
    payment_status = "pending" if payment_required and amount else "none"
    cancel_token = uuid.uuid4().hex[:32]
    booking = Booking(
        event_type_id=body.event_type_id,
        team_member_id=team_member_id,
        title=body.title or et.name,
        start_at=body.start_at,
        end_at=body.end_at,
        attendee_name=body.attendee_name,
        attendee_email=body.attendee_email,
        attendee_phone=getattr(body, "attendee_phone", None),
        form_responses=form_responses_str,
        gdpr_consent=getattr(body, "gdpr_consent", False),
        status=status_enum,
        amount=amount,
        payment_status=payment_status,
        currency=currency,
        cancel_token=cancel_token,
    )
    db.add(booking)
    db.commit()
    db.refresh(booking)

    if getattr(et, "send_email_confirmation", True) and booking.attendee_email:
        send_booking_confirmation_email(
            attendee_email=booking.attendee_email,
            attendee_name=booking.attendee_name or "",
            event_name=et.name,
            start_at=booking.start_at,
            end_at=booking.end_at,
            location=getattr(et, "location_link", None) or "",
            is_confirmed=(booking.status == BookingStatus.confirmed),
        )
    emails = parse_notification_emails(getattr(et, "booking_notification_emails", None))
    if emails:
        send_host_notification_email(
            to_emails=emails,
            event_name=et.name,
            attendee_name=booking.attendee_name or "",
            attendee_email=booking.attendee_email or "",
            start_at=booking.start_at,
            end_at=booking.end_at,
            booking_id=booking.id,
        )
    _enqueue_reminders(db, booking, et)
    event_emit(db, "booking.created", _booking_payload(booking))
    audit_log_svc(db, "booking.create", "booking", str(booking.id), {"event_type_id": et.id}, request=request)
    return _booking_to_response(booking)


@router.post("/cancel-unpaid", status_code=200)
def cancel_unpaid_bookings(db: Session = Depends(get_db)):
    """Cancel bookings that require payment but were never paid, past cancel_unpaid_after_minutes. Call from cron or scheduler."""
    now = datetime.now(timezone.utc)
    event_types = db.query(EventType).filter(
        EventType.payment_required == True,
        EventType.cancel_unpaid_after_minutes.isnot(None),
    ).all()
    cancelled_ids = []
    for et in event_types:
        cutoff = now - timedelta(minutes=et.cancel_unpaid_after_minutes)
        pending = (
            db.query(Booking)
            .filter(
                Booking.event_type_id == et.id,
                Booking.status == BookingStatus.pending_confirmation,
                Booking.payment_status == "pending",
                Booking.created_at < cutoff,
            )
            .all()
        )
        for b in pending:
            b.status = BookingStatus.cancelled
            cancelled_ids.append(b.id)
            event_emit(db, "booking.cancelled", _booking_payload(b))
    if cancelled_ids:
        db.commit()
    return {"cancelled_count": len(cancelled_ids), "booking_ids": cancelled_ids}


@router.get("/{booking_id}")
def get_booking(booking_id: int, db: Session = Depends(get_db)):
    b = db.query(Booking).filter(Booking.id == booking_id).first()
    if not b:
        raise HTTPException(status_code=404, detail="Booking not found")
    return _booking_to_response(b)


@router.patch("/{booking_id}")
def update_booking(booking_id: int, body: BookingUpdate, request: Request, db: Session = Depends(get_db)):
    b = db.query(Booking).filter(Booking.id == booking_id).first()
    if not b:
        raise HTTPException(status_code=404, detail="Booking not found")
    old_status = b.status
    old_start = b.start_at
    old_end = b.end_at
    old_paid_at = getattr(b, "paid_at", None)
    et = db.query(EventType).filter(EventType.id == b.event_type_id).first()

    if body.status is not None and body.status == BookingStatus.cancelled.value:
        if et:
            check_cancellation_allowed(db, b, et)
    if (body.start_at is not None or body.end_at is not None) and et:
        check_reschedule_allowed(db, b, et)

    if body.title is not None:
        b.title = body.title
    if body.start_at is not None:
        b.start_at = body.start_at
    if body.end_at is not None:
        b.end_at = body.end_at
    if body.start_at is not None or body.end_at is not None:
        new_start = b.start_at
        new_end = b.end_at
        if et:
            slot_capacity = getattr(et, "slot_capacity", 1) or 1
            overlap_other = db.query(Booking).filter(
                Booking.id != booking_id,
                Booking.event_type_id != b.event_type_id,
                Booking.start_at < new_end,
                Booking.end_at > new_start,
            ).first()
            if overlap_other:
                raise HTTPException(status_code=409, detail="This time slot is already booked by another event type.")
            overlap_same_count = db.query(Booking).filter(
                Booking.id != booking_id,
                Booking.event_type_id == b.event_type_id,
                Booking.start_at < new_end,
                Booking.end_at > new_start,
            ).count()
            if overlap_same_count >= slot_capacity:
                raise HTTPException(status_code=409, detail="This time slot is full for this event type.")
            _validate_booking_limits(et, new_start, new_end, b.attendee_email, booking_id, db)
    if body.attendee_name is not None:
        b.attendee_name = body.attendee_name
    if body.attendee_email is not None:
        b.attendee_email = body.attendee_email
    if body.attendee_phone is not None:
        b.attendee_phone = body.attendee_phone
    if body.form_responses is not None:
        b.form_responses = json.dumps(body.form_responses) if body.form_responses else None
    if body.gdpr_consent is not None:
        b.gdpr_consent = body.gdpr_consent
    if body.status is not None and body.status in [s.value for s in BookingStatus]:
        b.status = BookingStatus(body.status)
    if body.amount is not None:
        b.amount = body.amount
    if body.payment_status is not None:
        b.payment_status = body.payment_status
    if body.paid_at is not None:
        b.paid_at = body.paid_at
    if body.refunded_at is not None:
        b.refunded_at = body.refunded_at
    db.commit()
    db.refresh(b)

    # Emit booking.completed when status set to completed
    if b.status == BookingStatus.completed and old_status != BookingStatus.completed:
        event_emit(db, "booking.completed", _booking_payload(b))
    # Emit payment.completed when paid_at is set for the first time (e.g. from Stripe webhook)
    if body.paid_at is not None and old_paid_at is None and getattr(b, "paid_at", None) is not None:
        event_emit(db, "payment.completed", {**_booking_payload(b), "paid_at": b.paid_at.isoformat() if b.paid_at else None})

    if et and b.attendee_email:
        if b.status == BookingStatus.cancelled and old_status != BookingStatus.cancelled:
            send_booking_cancellation_email(
                attendee_email=b.attendee_email,
                attendee_name=b.attendee_name or "",
                event_name=et.name,
                start_at=old_start,
                end_at=old_end,
            )
            event_emit(db, "booking.cancelled", _booking_payload(b))
        elif b.status == BookingStatus.no_show:
            event_emit(db, "booking.no_show", _booking_payload(b))
        elif (b.start_at != old_start or b.end_at != old_end) and b.status != BookingStatus.cancelled:
            send_booking_reschedule_email(
                attendee_email=b.attendee_email,
                attendee_name=b.attendee_name or "",
                event_name=et.name,
                start_at=b.start_at,
                end_at=b.end_at,
                location=getattr(et, "location_link", None) or "",
            )
            event_emit(db, "booking.rescheduled", _booking_payload(b))
        elif b.status == BookingStatus.confirmed and old_status != BookingStatus.confirmed:
            send_booking_confirmation_email(
                attendee_email=b.attendee_email,
                attendee_name=b.attendee_name or "",
                event_name=et.name,
                start_at=b.start_at,
                end_at=b.end_at,
                location=getattr(et, "location_link", None) or "",
                is_confirmed=True,
            )
            _enqueue_reminders(db, b, et)
            event_emit(db, "booking.confirmed", _booking_payload(b))

    audit_log_svc(db, "booking.update", "booking", str(booking_id), {"status": b.status.value}, request=request)
    return _booking_to_response(b)


@router.delete("/{booking_id}", status_code=204)
def delete_booking(booking_id: int, request: Request, db: Session = Depends(get_db)):
    b = db.query(Booking).filter(Booking.id == booking_id).first()
    if not b:
        raise HTTPException(status_code=404, detail="Booking not found")
    et = db.query(EventType).filter(EventType.id == b.event_type_id).first()
    if et:
        check_cancellation_allowed(db, b, et)
    if et and b.attendee_email and b.status != BookingStatus.cancelled:
        send_booking_cancellation_email(
            attendee_email=b.attendee_email,
            attendee_name=b.attendee_name or "",
            event_name=et.name,
            start_at=b.start_at,
            end_at=b.end_at,
        )
    payload = _booking_payload(b)
    db.delete(b)
    db.commit()
    event_emit(db, "booking.cancelled", payload)
    audit_log_svc(db, "booking.delete", "booking", str(booking_id), {"event_type_id": b.event_type_id}, request=request)
    return None
