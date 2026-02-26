"""Public booking API: event type by slug, create booking (invitee flow)."""
import json
import uuid
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.rate_limit import rate_limit_public
from app.models.booking import Booking, BookingQuestion, BookingReminder, BookingStatus, EventType, EventTypeMember, TeamMember
from app.schemas.booking import BookingPublicCreate
from app.services.booking_confirmation import (
    build_ics,
    parse_notification_emails,
    parse_reminder_minutes,
    send_booking_confirmation_email,
    send_host_notification_email,
    send_booking_cancellation_email,
)
from app.services.event_bus import emit as event_emit
from app.services.booking_cancellation import check_cancellation_allowed

router = APIRouter()


def _event_type_public(et: EventType, questions: List[BookingQuestion], embed_config: Optional[dict] = None) -> dict:
    """Event type payload for public booking page (no internal fields)."""
    if embed_config is None:
        embed_config = {"primary_color": None, "layout": "full", "type": "inline"}
    qs = []
    for q in questions:
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
        qs.append({
            "id": q.id,
            "sort_order": q.sort_order,
            "question_type": q.question_type,
            "label": q.label,
            "required": q.required,
            "options": options,
            "show_if": show_if,
        })
    location = ""
    if getattr(et, "location_type", None) and getattr(et, "location_link", None):
        location = et.location_link or ""
    elif getattr(et, "location_type", None) == "phone" and getattr(et, "location_link", None):
        location = f"Phone: {et.location_link}"
    return {
        "id": et.id,
        "name": et.name,
        "slug": et.slug,
        "duration_minutes": getattr(et, "duration_minutes", 30) or 30,
        "description": getattr(et, "description", None) or "",
        "location_type": getattr(et, "location_type", None),
        "location_link": getattr(et, "location_link", None),
        "location_display": location,
        "confirmation_mode": getattr(et, "confirmation_mode", "instant") or "instant",
        "send_calendar_invite": getattr(et, "send_calendar_invite", True),
        "send_email_confirmation": getattr(et, "send_email_confirmation", True),
        "questions": qs,
        "embed": embed_config,
    }


@router.get("/event-types/by-slug/{slug}")
def get_event_type_by_slug(slug: str, db: Session = Depends(get_db), _: None = Depends(rate_limit_public)):
    """Get event type by slug for the public booking page (includes form questions)."""
    et = db.query(EventType).filter(EventType.slug == slug).first()
    if not et:
        raise HTTPException(status_code=404, detail="Event type not found")
    questions = (
        db.query(BookingQuestion)
        .filter(BookingQuestion.event_type_id == et.id)
        .order_by(BookingQuestion.sort_order, BookingQuestion.id)
        .all()
    )
    from app.models.booking_profile import BookingProfile
    profile = db.query(BookingProfile).first()
    embed_config = {"primary_color": None, "layout": "full", "type": "inline"}
    if profile:
        embed_config = {
            "primary_color": getattr(profile, "embed_primary_color", None),
            "layout": getattr(profile, "embed_layout", "full") or "full",
            "type": getattr(profile, "embed_type", "inline") or "inline",
        }
    return _event_type_public(et, questions, embed_config)


def _validate_form_responses(
    questions: List[BookingQuestion],
    form_responses: Optional[Dict[str, Any]],
    answers_by_id: Dict[int, Any],
) -> None:
    """Validate required questions and conditional visibility. Raises HTTPException."""
    if form_responses is None:
        form_responses = {}
    for q in questions:
        show = True
        if q.show_if:
            try:
                show_if = json.loads(q.show_if) if isinstance(q.show_if, str) else q.show_if
                if isinstance(show_if, dict):
                    qid = show_if.get("question_id")
                    val = show_if.get("value")
                    if qid is not None and val is not None:
                        ans = form_responses.get(str(qid)) or form_responses.get(qid)
                        show = (ans == val)
            except (TypeError, ValueError):
                pass
        if not show:
            continue
        if q.required:
            ans = form_responses.get(str(q.id)) or form_responses.get(q.id)
            if ans is None or (isinstance(ans, str) and not ans.strip()):
                raise HTTPException(status_code=400, detail=f"Required: {q.label}")


@router.post("/bookings")
def create_public_booking(body: BookingPublicCreate, db: Session = Depends(get_db), _: None = Depends(rate_limit_public)):
    """
    Create a booking from the public form (invitee).
    Validates required fields and custom questions, sets status from event type confirmation_mode,
    optionally sends email confirmation and returns .ics for "Add to calendar".
    """
    et = db.query(EventType).filter(EventType.id == body.event_type_id).first()
    if not et:
        raise HTTPException(status_code=404, detail="Event type not found")
    questions = (
        db.query(BookingQuestion)
        .filter(BookingQuestion.event_type_id == et.id)
        .order_by(BookingQuestion.sort_order)
        .all()
    )
    _validate_form_responses(questions, body.form_responses, {})

    # Slot conflict check (same as internal create)
    slot_capacity = getattr(et, "slot_capacity", 1) or 1
    overlap_other = db.query(Booking).filter(
        Booking.event_type_id != et.id,
        Booking.start_at < body.end_at,
        Booking.end_at > body.start_at,
    ).first()
    if overlap_other:
        raise HTTPException(status_code=409, detail="This time slot is no longer available.")
    overlap_count = db.query(Booking).filter(
        Booking.event_type_id == et.id,
        Booking.start_at < body.end_at,
        Booking.end_at > body.start_at,
    ).count()
    if overlap_count >= slot_capacity:
        raise HTTPException(status_code=409, detail="This time slot is no longer available.")

    from app.routers.bookings import _validate_booking_limits
    _validate_booking_limits(et, body.start_at, body.end_at, body.attendee_email, None, db)

    confirmation_mode = getattr(et, "confirmation_mode", "instant") or "instant"
    status = BookingStatus.confirmed if confirmation_mode == "instant" else BookingStatus.pending_confirmation

    # Round-robin team member
    members = (
        db.query(EventTypeMember)
        .filter(EventTypeMember.event_type_id == et.id)
        .order_by(EventTypeMember.sort_order)
        .all()
    )
    team_member_id = None
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
            team_member_id = member_ids[(idx + 1) % len(member_ids)]
        else:
            team_member_id = member_ids[0]

    form_responses_str = json.dumps(body.form_responses) if body.form_responses else None
    cancel_token = uuid.uuid4().hex[:32]
    booking = Booking(
        event_type_id=body.event_type_id,
        team_member_id=team_member_id,
        title=et.name,
        start_at=body.start_at,
        end_at=body.end_at,
        attendee_name=body.attendee_name,
        attendee_email=body.attendee_email,
        attendee_phone=body.attendee_phone,
        form_responses=form_responses_str,
        gdpr_consent=body.gdpr_consent,
        status=status,
        cancel_token=cancel_token,
    )
    db.add(booking)
    db.commit()
    db.refresh(booking)

    location = getattr(et, "location_link", None) or ""
    ics = build_ics(
        title=et.name,
        start_at=body.start_at,
        end_at=body.end_at,
        description=getattr(et, "description", None) or "",
        location=location,
        attendee_name=body.attendee_name,
        attendee_email=body.attendee_email,
    )

    if getattr(et, "send_email_confirmation", True):
        send_booking_confirmation_email(
            attendee_email=body.attendee_email,
            attendee_name=body.attendee_name,
            event_name=et.name,
            start_at=body.start_at,
            end_at=body.end_at,
            location=location,
            is_confirmed=(status == BookingStatus.confirmed),
        )

    emails = parse_notification_emails(getattr(et, "booking_notification_emails", None))
    if emails:
        send_host_notification_email(
            to_emails=emails,
            event_name=et.name,
            attendee_name=body.attendee_name or "",
            attendee_email=body.attendee_email or "",
            start_at=body.start_at,
            end_at=body.end_at,
            booking_id=booking.id,
        )

    from datetime import datetime, timedelta, timezone
    minutes_list = parse_reminder_minutes(getattr(et, "reminder_minutes_before", None))
    if minutes_list and booking.start_at:
        start = booking.start_at.replace(tzinfo=timezone.utc) if booking.start_at.tzinfo else booking.start_at
        now = datetime.now(timezone.utc)
        for mins in minutes_list:
            remind_at = start - timedelta(minutes=mins)
            if remind_at > now:
                r = BookingReminder(
                    booking_id=booking.id,
                    remind_at=remind_at,
                    channel="email",
                    minutes_before=mins,
                )
                db.add(r)
        db.commit()

    event_emit(db, "booking.created", {
        "booking_id": booking.id,
        "event_type_id": booking.event_type_id,
        "team_member_id": booking.team_member_id,
        "start_at": booking.start_at.isoformat() if booking.start_at else None,
        "end_at": booking.end_at.isoformat() if booking.end_at else None,
        "attendee_email": booking.attendee_email,
        "attendee_name": booking.attendee_name,
        "status": booking.status.value,
    })

    return {
        "id": booking.id,
        "event_type_id": booking.event_type_id,
        "title": booking.title,
        "start_at": booking.start_at.isoformat() if booking.start_at else None,
        "end_at": booking.end_at.isoformat() if booking.end_at else None,
        "status": booking.status.value,
        "confirmation_mode": confirmation_mode,
        "ics": ics,
        "cancel_token": cancel_token,
    }


@router.get("/bookings/cancel")
def get_booking_cancel_info(token: str = Query(..., alias="token"), db: Session = Depends(get_db)):
    """Return cancellation info for a booking by cancel token (for public cancel page)."""
    b = db.query(Booking).filter(Booking.cancel_token == token).first()
    if not b:
        raise HTTPException(status_code=404, detail="Booking not found")
    if b.status == BookingStatus.cancelled:
        raise HTTPException(status_code=410, detail="Booking is already cancelled")
    et = db.query(EventType).filter(EventType.id == b.event_type_id).first()
    allow_cancellation = getattr(et, "allow_cancellation", True) if et else True
    deadline_mins = getattr(et, "cancellation_deadline_minutes", None) if et else None
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)
    start = b.start_at.replace(tzinfo=timezone.utc) if b.start_at and not b.start_at.tzinfo else b.start_at
    deadline_met = (deadline_mins is not None and start and (start - now).total_seconds() < deadline_mins * 60)
    return {
        "booking_id": b.id,
        "event_type_name": et.name if et else "",
        "start_at": b.start_at.isoformat() if b.start_at else None,
        "end_at": b.end_at.isoformat() if b.end_at else None,
        "allow_cancellation": allow_cancellation,
        "cancellation_deadline_met": deadline_met,
        "cancellation_message": getattr(et, "cancellation_message", None) if et else None,
        "redirect_after_cancellation_url": getattr(et, "redirect_after_cancellation_url", None) if et else None,
    }


@router.post("/bookings/cancel")
def post_booking_cancel(token: str = Query(..., alias="token"), db: Session = Depends(get_db)):
    """Cancel a booking by cancel token (public link from email)."""
    b = db.query(Booking).filter(Booking.cancel_token == token).first()
    if not b:
        raise HTTPException(status_code=404, detail="Booking not found")
    if b.status == BookingStatus.cancelled:
        return {"cancelled": True, "redirect_after_cancellation_url": None}
    et = db.query(EventType).filter(EventType.id == b.event_type_id).first()
    if et:
        check_cancellation_allowed(db, b, et)
    if et and b.attendee_email:
        send_booking_cancellation_email(
            attendee_email=b.attendee_email,
            attendee_name=b.attendee_name or "",
            event_name=et.name,
            start_at=b.start_at,
            end_at=b.end_at,
        )
    from app.routers.bookings import _booking_payload
    payload = _booking_payload(b)
    b.status = BookingStatus.cancelled
    db.commit()
    db.refresh(b)
    event_emit(db, "booking.cancelled", payload)
    redirect_url = getattr(et, "redirect_after_cancellation_url", None) if et else None
    return {"cancelled": True, "redirect_after_cancellation_url": redirect_url}
