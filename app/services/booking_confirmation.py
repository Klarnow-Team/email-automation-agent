"""Booking confirmation and notifications: .ics, confirmation/cancellation/reschedule/reminder/host emails."""
import json
from datetime import datetime, timedelta, timezone
from typing import List

from loguru import logger
from sqlalchemy.orm import Session

from app.config import get_settings
from app.services.resend_service import send_email


def _ics_escape(s: str) -> str:
    """Escape special chars for ICS."""
    if not s:
        return ""
    return s.replace("\\", "\\\\").replace(";", "\\;").replace(",", "\\,").replace("\n", "\\n")


def build_ics(
    title: str,
    start_at: datetime,
    end_at: datetime,
    description: str = "",
    location: str = "",
    attendee_name: str = "",
    attendee_email: str = "",
) -> str:
    """Build ICS file content for the booking (invitee can add to calendar)."""
    # Use UTC for DTSTART/DTEND in Z format
    def fmt(d: datetime) -> str:
        if d.tzinfo:
            return d.strftime("%Y%m%dT%H%M%SZ")
        return d.strftime("%Y%m%dT%H%M%S") + "Z"

    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Booking//EN",
        "CALSCALE:GREGORIAN",
        "BEGIN:VEVENT",
        f"UID:booking-{start_at.timestamp()}@booking",
        f"DTSTAMP:{fmt(start_at)}",
        f"DTSTART:{fmt(start_at)}",
        f"DTEND:{fmt(end_at)}",
        f"SUMMARY:{_ics_escape(title)}",
    ]
    if description:
        lines.append(f"DESCRIPTION:{_ics_escape(description)}")
    if location:
        lines.append(f"LOCATION:{_ics_escape(location)}")
    if attendee_email:
        lines.append(f"ATTENDEE;CN={_ics_escape(attendee_name)};RSVP=FALSE:mailto:{attendee_email}")
    lines.append("END:VEVENT")
    lines.append("END:VCALENDAR")
    return "\r\n".join(lines)


def send_booking_confirmation_email(
    attendee_email: str,
    attendee_name: str,
    event_name: str,
    start_at: datetime,
    end_at: datetime,
    location: str = "",
    is_confirmed: bool = True,
) -> bool:
    """Send a confirmation email to the invitee. Returns True if sent."""
    settings = get_settings()
    if not settings.resend_api_key:
        logger.warning("RESEND_API_KEY not set; skipping booking confirmation email")
        return False
    start_fmt = start_at.strftime("%A, %B %d, %Y at %I:%M %p") if start_at else ""
    end_fmt = end_at.strftime("%I:%M %p") if end_at else ""
    status_line = "Your booking is confirmed." if is_confirmed else "Your booking is pending confirmation."
    html = f"""
    <p>Hi {attendee_name or 'there'},</p>
    <p>{status_line}</p>
    <p><strong>{event_name}</strong></p>
    <p>When: {start_fmt} – {end_fmt}</p>
    """ + (f"<p>Where: {location}</p>" if location else "") + """
    <p>You can add this event to your calendar using the "Add to calendar" link on the confirmation page.</p>
    """
    try:
        result = send_email(
            to=attendee_email,
            subject=f"Booking confirmation: {event_name}",
            html=html.strip(),
        )
        return result is not None
    except Exception as e:
        logger.exception("Failed to send booking confirmation: {}", e)
        return False


def send_booking_cancellation_email(
    attendee_email: str,
    attendee_name: str,
    event_name: str,
    start_at: datetime,
    end_at: datetime,
) -> bool:
    """Send cancellation email to the invitee. Returns True if sent."""
    settings = get_settings()
    if not settings.resend_api_key:
        return False
    start_fmt = start_at.strftime("%A, %B %d, %Y at %I:%M %p") if start_at else ""
    html = f"""
    <p>Hi {attendee_name or 'there'},</p>
    <p>Your booking has been cancelled.</p>
    <p><strong>{event_name}</strong></p>
    <p>Previously scheduled: {start_fmt}</p>
    <p>You can book a new time if needed.</p>
    """
    try:
        result = send_email(
            to=attendee_email,
            subject=f"Booking cancelled: {event_name}",
            html=html.strip(),
        )
        return result is not None
    except Exception as e:
        logger.exception("Failed to send cancellation email: {}", e)
        return False


def send_booking_reschedule_email(
    attendee_email: str,
    attendee_name: str,
    event_name: str,
    start_at: datetime,
    end_at: datetime,
    location: str = "",
) -> bool:
    """Send reschedule confirmation to the invitee. Returns True if sent."""
    settings = get_settings()
    if not settings.resend_api_key:
        return False
    start_fmt = start_at.strftime("%A, %B %d, %Y at %I:%M %p") if start_at else ""
    end_fmt = end_at.strftime("%I:%M %p") if end_at else ""
    html = f"""
    <p>Hi {attendee_name or 'there'},</p>
    <p>Your booking has been rescheduled.</p>
    <p><strong>{event_name}</strong></p>
    <p>New time: {start_fmt} – {end_fmt}</p>
    """ + (f"<p>Where: {location}</p>" if location else "")
    try:
        result = send_email(
            to=attendee_email,
            subject=f"Booking rescheduled: {event_name}",
            html=html.strip(),
        )
        return result is not None
    except Exception as e:
        logger.exception("Failed to send reschedule email: {}", e)
        return False


def send_booking_reminder_email(
    attendee_email: str,
    attendee_name: str,
    event_name: str,
    start_at: datetime,
    end_at: datetime,
    location: str = "",
    minutes_before: int = 60,
) -> bool:
    """Send a reminder email before the booking. Returns True if sent."""
    settings = get_settings()
    if not settings.resend_api_key:
        return False
    start_fmt = start_at.strftime("%A, %B %d, %Y at %I:%M %p") if start_at else ""
    end_fmt = end_at.strftime("%I:%M %p") if end_at else ""
    when = "in 1 hour" if minutes_before == 60 else f"in {minutes_before // 60} hours" if minutes_before >= 60 else f"in {minutes_before} minutes"
    html = f"""
    <p>Hi {attendee_name or 'there'},</p>
    <p>This is a reminder that your booking is coming up {when}.</p>
    <p><strong>{event_name}</strong></p>
    <p>When: {start_fmt} – {end_fmt}</p>
    """ + (f"<p>Where: {location}</p>" if location else "")
    try:
        result = send_email(
            to=attendee_email,
            subject=f"Reminder: {event_name} – {start_fmt}",
            html=html.strip(),
        )
        return result is not None
    except Exception as e:
        logger.exception("Failed to send reminder email: {}", e)
        return False


def send_host_notification_email(
    to_emails: List[str],
    event_name: str,
    attendee_name: str,
    attendee_email: str,
    start_at: datetime,
    end_at: datetime,
    booking_id: int,
) -> bool:
    """Send new-booking notification to host/team emails. Returns True if at least one sent."""
    settings = get_settings()
    if not settings.resend_api_key or not to_emails:
        return False
    start_fmt = start_at.strftime("%A, %B %d, %Y at %I:%M %p") if start_at else ""
    end_fmt = end_at.strftime("%I:%M %p") if end_at else ""
    html = f"""
    <p>New booking received.</p>
    <p><strong>{event_name}</strong></p>
    <p>Attendee: {attendee_name or '—'} ({attendee_email or '—'})</p>
    <p>When: {start_fmt} – {end_fmt}</p>
    <p>Booking ID: {booking_id}</p>
    """
    ok = False
    for addr in to_emails:
        addr = (addr or "").strip()
        if not addr or "@" not in addr:
            continue
        try:
            result = send_email(
                to=addr,
                subject=f"New booking: {event_name} – {attendee_name or attendee_email}",
                html=html.strip(),
            )
            if result is not None:
                ok = True
        except Exception as e:
            logger.warning("Failed to send host notification to {}: {}", addr, e)
    return ok


def parse_notification_emails(booking_notification_emails: str | None) -> List[str]:
    """Parse comma-separated or JSON array of emails from event type setting."""
    if not booking_notification_emails or not booking_notification_emails.strip():
        return []
    s = booking_notification_emails.strip()
    if s.startswith("["):
        try:
            out = json.loads(s)
            return [str(x).strip() for x in out if x and "@" in str(x)]
        except (TypeError, ValueError):
            pass
    return [x.strip() for x in s.split(",") if x.strip() and "@" in x.strip()]


def parse_reminder_minutes(reminder_minutes_before: str | None) -> List[int]:
    """Parse reminder_minutes_before JSON array, e.g. [1440, 60]. Returns list of positive ints."""
    if not reminder_minutes_before or not reminder_minutes_before.strip():
        return []
    try:
        out = json.loads(reminder_minutes_before)
        if not isinstance(out, list):
            return []
        return [int(x) for x in out if isinstance(x, (int, float)) and int(x) > 0]
    except (TypeError, ValueError):
        return []
