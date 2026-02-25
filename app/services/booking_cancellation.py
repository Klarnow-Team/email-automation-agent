"""Booking cancellation and reschedule validation (deadline, allow flags)."""
from datetime import datetime, timezone
from typing import Optional, Tuple

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.booking import Booking, EventType


def check_cancellation_allowed(
    db: Session,
    booking: Booking,
    event_type: EventType,
) -> None:
    """Raise HTTPException 403 with cancellation_message and redirect if not allowed."""
    if not getattr(event_type, "allow_cancellation", True):
        raise HTTPException(
            status_code=403,
            detail={
                "code": "cancellation_not_allowed",
                "message": getattr(event_type, "cancellation_message", None) or "Cancellation is not allowed for this booking.",
                "redirect_after_cancellation_url": getattr(event_type, "redirect_after_cancellation_url", None),
            },
        )
    deadline_mins = getattr(event_type, "cancellation_deadline_minutes", None)
    if deadline_mins is not None and booking.start_at:
        start = booking.start_at.replace(tzinfo=timezone.utc) if booking.start_at.tzinfo else booking.start_at
        now = datetime.now(timezone.utc)
        if (start - now).total_seconds() < deadline_mins * 60:
            raise HTTPException(
                status_code=403,
                detail={
                    "code": "cancellation_deadline_passed",
                    "message": getattr(event_type, "cancellation_message", None) or "Cancellation deadline has passed.",
                    "redirect_after_cancellation_url": getattr(event_type, "redirect_after_cancellation_url", None),
                },
            )


def check_reschedule_allowed(
    db: Session,
    booking: Booking,
    event_type: EventType,
) -> None:
    """Raise HTTPException 403 if reschedule not allowed."""
    if not getattr(event_type, "allow_reschedule", True):
        raise HTTPException(
            status_code=403,
            detail={
                "code": "reschedule_not_allowed",
                "message": getattr(event_type, "cancellation_message", None) or "Rescheduling is not allowed for this booking.",
                "redirect_after_cancellation_url": getattr(event_type, "redirect_after_cancellation_url", None),
            },
        )
    deadline_mins = getattr(event_type, "cancellation_deadline_minutes", None)
    if deadline_mins is not None and booking.start_at:
        start = booking.start_at.replace(tzinfo=timezone.utc) if booking.start_at.tzinfo else booking.start_at
        now = datetime.now(timezone.utc)
        if (start - now).total_seconds() < deadline_mins * 60:
            raise HTTPException(
                status_code=403,
                detail={
                    "code": "reschedule_deadline_passed",
                    "message": getattr(event_type, "cancellation_message", None) or "Reschedule deadline has passed.",
                    "redirect_after_cancellation_url": getattr(event_type, "redirect_after_cancellation_url", None),
                },
            )
