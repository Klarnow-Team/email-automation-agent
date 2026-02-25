# Internal/cron endpoints for background processing.
# Call from a scheduler (e.g. cron) to process queued work.

from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.booking import Booking, BookingReminder, BookingStatus, EventType
from app.models.campaign import Campaign, CampaignStatus
from app.services.automation_service import process_due_automation_delays
from app.services.booking_confirmation import send_booking_reminder_email
from app.services.campaign_service import send_campaign

router = APIRouter()


@router.post("/process-automation-delays")
def process_automation_delays(max_processed: int = 100, db: Session = Depends(get_db)):
    """Process due automation delay steps. Call periodically (e.g. every minute)."""
    count = process_due_automation_delays(db, max_processed=max_processed)
    return {"processed": count}


@router.post("/process-booking-reminders")
def process_booking_reminders(max_processed: int = 100, db: Session = Depends(get_db)):
    """Send due booking reminder emails. Call periodically (e.g. every 5–15 minutes)."""
    now = datetime.now(timezone.utc)
    rows = (
        db.query(BookingReminder)
        .filter(BookingReminder.sent_at.is_(None), BookingReminder.remind_at <= now)
        .order_by(BookingReminder.remind_at)
        .limit(max_processed)
        .all()
    )
    sent = 0
    for rem in rows:
        booking = db.query(Booking).filter(Booking.id == rem.booking_id).first()
        if not booking or booking.status in (BookingStatus.cancelled,):
            rem.sent_at = now
            continue
        et = db.query(EventType).filter(EventType.id == booking.event_type_id).first()
        if not et or not booking.attendee_email:
            rem.sent_at = now
            continue
        if rem.channel == "email":
            ok = send_booking_reminder_email(
                attendee_email=booking.attendee_email,
                attendee_name=booking.attendee_name or "",
                event_name=et.name,
                start_at=booking.start_at,
                end_at=booking.end_at,
                location=getattr(et, "location_link", None) or "",
                minutes_before=rem.minutes_before,
            )
            if ok:
                rem.sent_at = now
                sent += 1
    db.commit()
    return {"processed": len(rows), "sent": sent}


@router.post("/process-scheduled-campaigns")
def process_scheduled_campaigns(max_processed: int = 10, db: Session = Depends(get_db)):
    """Send draft campaigns whose scheduled_at is in the past. Call periodically (e.g. every minute)."""
    now = datetime.now(timezone.utc)
    campaigns = (
        db.query(Campaign)
        .filter(
            Campaign.status == CampaignStatus.draft,
            Campaign.scheduled_at.isnot(None),
            Campaign.scheduled_at <= now,
        )
        .order_by(Campaign.scheduled_at)
        .limit(max_processed)
        .all()
    )
    sent_total = 0
    for campaign in campaigns:
        sent, err = send_campaign(db, campaign, recipient_ids=None)
        if not err:
            sent_total += sent
    return {"processed": len(campaigns), "sent_total": sent_total}
