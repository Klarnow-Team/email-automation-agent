"""
Dashboard summary and quick actions.
Exposes aggregated stats, growth, alerts, and recent activity for the dashboard UI.
"""
from datetime import date, datetime, timedelta, timezone
from typing import Any, List, Literal

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.activity import ActivityLog, SystemAlert
from app.models.automation import Automation, AutomationRun, PendingAutomationDelay
from app.models.booking import Booking, BookingStatus, EventType, TeamMember
from app.models.campaign import Campaign, CampaignRecipient, CampaignStatus
from app.models.event_bus import WebhookSubscription
from app.models.segment import Segment
from app.models.subscriber import Subscriber, SubscriberStatus
from app.models.tracking import TrackingEvent

router = APIRouter()


# --- At-a-glance (single light call for hero / top stats) ---

class AtAGlance(BaseModel):
    subscribers: int
    campaigns: int
    drafts: int
    automations: int
    active_automations: int
    event_types: int
    segments: int
    webhooks: int
    upcoming_bookings: int
    pending_confirmations: int


@router.get("/at-a-glance", response_model=AtAGlance)
def get_at_a_glance(db: Session = Depends(get_db)) -> Any:
    """Lightweight counts for dashboard hero. One query per entity."""
    now = datetime.now(timezone.utc)
    return AtAGlance(
        subscribers=db.query(Subscriber).count(),
        campaigns=db.query(Campaign).count(),
        drafts=db.query(Campaign).filter(Campaign.status == CampaignStatus.draft).count(),
        automations=db.query(Automation).count(),
        active_automations=db.query(Automation).filter(Automation.is_active == 1).count(),
        event_types=db.query(EventType).count(),
        segments=db.query(Segment).count(),
        webhooks=db.query(WebhookSubscription).filter(WebhookSubscription.enabled == True).count(),
        upcoming_bookings=db.query(Booking).filter(
            Booking.start_at > now,
            Booking.status.in_([BookingStatus.confirmed, BookingStatus.pending_confirmation]),
        ).count(),
        pending_confirmations=db.query(Booking).filter(Booking.status == BookingStatus.pending_confirmation).count(),
    )


class RecentBookingItem(BaseModel):
    id: int
    event_type_name: str
    start_at: str
    end_at: str
    attendee_name: str | None
    attendee_email: str | None
    status: str


@router.get("/recent-bookings", response_model=List[RecentBookingItem])
def get_recent_bookings(limit: int = 8, db: Session = Depends(get_db)) -> Any:
    """Latest bookings (any status) for dashboard widget."""
    rows = (
        db.query(Booking)
        .order_by(Booking.created_at.desc())
        .limit(min(limit, 20))
        .all()
    )
    out = []
    for b in rows:
        et = db.query(EventType).filter(EventType.id == b.event_type_id).first()
        out.append(
            RecentBookingItem(
                id=b.id,
                event_type_name=et.name if et else "",
                start_at=b.start_at.isoformat() if b.start_at else "",
                end_at=b.end_at.isoformat() if b.end_at else "",
                attendee_name=b.attendee_name,
                attendee_email=b.attendee_email,
                status=b.status.value,
            )
        )
    return out


class DashboardSummary(BaseModel):
    total_subscribers: int
    total_campaigns: int
    campaigns_sent: int
    drafts: int
    total_automations: int
    active_automations: int
    new_subscribers_7d: int
    campaigns_sent_7d: int
    runs_waiting: int
    recent_campaigns: List[dict]
    recent_subscribers: List[dict]


@router.get("/summary", response_model=DashboardSummary)
def get_summary(db: Session = Depends(get_db)) -> Any:
    """Aggregated dashboard stats and recent activity. Safe for multi-tenant if filtered by tenant_id later."""
    now = datetime.now(timezone.utc)
    seven_days_ago = now - timedelta(days=7)

    total_subscribers = db.query(Subscriber).count()
    total_campaigns = db.query(Campaign).count()
    campaigns_sent = db.query(Campaign).filter(Campaign.status == CampaignStatus.sent).count()
    drafts = db.query(Campaign).filter(Campaign.status == CampaignStatus.draft).count()
    total_automations = db.query(Automation).count()
    active_automations = db.query(Automation).filter(Automation.is_active == 1).count()

    new_subscribers_7d = (
        db.query(Subscriber).filter(Subscriber.created_at >= seven_days_ago).count()
    )
    campaigns_sent_7d = (
        db.query(Campaign)
        .filter(Campaign.status == CampaignStatus.sent, Campaign.sent_at >= seven_days_ago)
        .count()
    )
    runs_waiting = db.query(AutomationRun).filter(AutomationRun.status == "waiting").count()

    recent_campaigns = [
        {
            "id": c.id,
            "name": c.name,
            "subject": c.subject,
            "status": c.status.value if hasattr(c.status, "value") else str(c.status),
            "sent_at": c.sent_at.isoformat() if c.sent_at else None,
            "created_at": c.created_at.isoformat() if c.created_at else None,
        }
        for c in db.query(Campaign)
        .order_by(Campaign.created_at.desc())
        .limit(5)
        .all()
    ]
    recent_subscribers = [
        {
            "id": s.id,
            "email": s.email,
            "name": s.name,
            "status": s.status.value if hasattr(s.status, "value") else str(s.status),
            "created_at": s.created_at.isoformat() if s.created_at else None,
        }
        for s in db.query(Subscriber).order_by(Subscriber.created_at.desc()).limit(5).all()
    ]

    return DashboardSummary(
        total_subscribers=total_subscribers,
        total_campaigns=total_campaigns,
        campaigns_sent=campaigns_sent,
        drafts=drafts,
        total_automations=total_automations,
        active_automations=active_automations,
        new_subscribers_7d=new_subscribers_7d,
        campaigns_sent_7d=campaigns_sent_7d,
        runs_waiting=runs_waiting,
        recent_campaigns=recent_campaigns,
        recent_subscribers=recent_subscribers,
    )


@router.get("/activity")
def get_activity(skip: int = 0, limit: int = 50, db: Session = Depends(get_db)):
    """Recent activity log entries."""
    rows = (
        db.query(ActivityLog)
        .order_by(ActivityLog.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return [
        {
            "id": r.id,
            "action": r.action,
            "entity_type": r.entity_type,
            "entity_id": r.entity_id,
            "payload": r.payload,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in rows
    ]


# --- System overview (control center) ---

class SubscriberCounts(BaseModel):
    total: int
    active: int
    unsubscribed: int
    bounced: int
    suppressed: int


class CampaignPerformance(BaseModel):
    emails_sent: int
    delivered: int
    opens: int
    clicks: int
    unsubscribes: int
    spam_complaints: int


class AutomationPerformance(BaseModel):
    active_automations: int
    subscribers_in_automations: int
    emails_queued: int
    emails_sent_via_automation: int


class FormsPerformance(BaseModel):
    views: int
    submissions: int
    conversion_rate: float


class RevenueTracking(BaseModel):
    campaign_revenue: float
    automation_revenue: float
    per_subscriber_value: float


class DashboardOverview(BaseModel):
    subscriber_counts: SubscriberCounts
    campaign_performance: CampaignPerformance
    automation_performance: AutomationPerformance
    forms_performance: FormsPerformance
    revenue: RevenueTracking
    last_sent_campaign_id: int | None


@router.get("/overview", response_model=DashboardOverview)
def get_overview(db: Session = Depends(get_db)) -> Any:
    """Full system overview for control center dashboard."""
    now = datetime.now(timezone.utc)

    # Subscriber counts by status
    total_s = db.query(Subscriber).count()
    active_s = db.query(Subscriber).filter(Subscriber.status == SubscriberStatus.active).count()
    unsub_s = db.query(Subscriber).filter(Subscriber.status == SubscriberStatus.unsubscribed).count()
    bounced_s = db.query(Subscriber).filter(Subscriber.status == SubscriberStatus.bounced).count()
    suppressed_s = db.query(Subscriber).filter(Subscriber.status == SubscriberStatus.suppressed).count()

    # Campaign performance: emails_sent = count of recipient records with sent_at
    emails_sent = db.query(CampaignRecipient).filter(CampaignRecipient.sent_at.isnot(None)).count()
    delivered = db.query(TrackingEvent).filter(TrackingEvent.event_type == "delivered").count()
    opens = db.query(TrackingEvent).filter(TrackingEvent.event_type == "open").count()
    clicks = db.query(TrackingEvent).filter(TrackingEvent.event_type == "click").count()
    unsubscribes = db.query(TrackingEvent).filter(TrackingEvent.event_type == "unsubscribe").count()
    spam = db.query(TrackingEvent).filter(TrackingEvent.event_type == "spam_complaint").count()
    if delivered == 0 and emails_sent > 0:
        delivered = emails_sent  # assume delivered = sent when no tracking yet

    # Automation performance
    active_auto = db.query(Automation).filter(Automation.is_active == 1).count()
    runs_in_progress = (
        db.query(AutomationRun)
        .filter(AutomationRun.status.in_(["running", "waiting"]))
        .count()
    )
    queued = db.query(PendingAutomationDelay).count()
    # Emails sent via automation: count automation runs that have completed at least one step (simplified: runs with completed_at or current_step > 0)
    automation_emails_sent = db.query(AutomationRun).filter(AutomationRun.current_step > 0).count()

    # Forms: placeholder (no form model yet)
    forms_views = 0
    forms_submissions = 0
    forms_rate = 0.0

    # Revenue: placeholder
    rev_campaign = 0.0
    rev_automation = 0.0
    per_sub_value = 0.0 if total_s == 0 else 0.0

    # Last sent campaign (for duplicate action)
    last_sent = (
        db.query(Campaign)
        .filter(Campaign.status == CampaignStatus.sent)
        .order_by(Campaign.sent_at.desc())
        .first()
    )
    last_sent_id = last_sent.id if last_sent else None

    return DashboardOverview(
        subscriber_counts=SubscriberCounts(
            total=total_s,
            active=active_s,
            unsubscribed=unsub_s,
            bounced=bounced_s,
            suppressed=suppressed_s,
        ),
        campaign_performance=CampaignPerformance(
            emails_sent=emails_sent,
            delivered=delivered,
            opens=opens,
            clicks=clicks,
            unsubscribes=unsubscribes,
            spam_complaints=spam,
        ),
        automation_performance=AutomationPerformance(
            active_automations=active_auto,
            subscribers_in_automations=runs_in_progress,
            emails_queued=queued,
            emails_sent_via_automation=automation_emails_sent,
        ),
        forms_performance=FormsPerformance(
            views=forms_views,
            submissions=forms_submissions,
            conversion_rate=forms_rate,
        ),
        revenue=RevenueTracking(
            campaign_revenue=rev_campaign,
            automation_revenue=rev_automation,
            per_subscriber_value=per_sub_value,
        ),
        last_sent_campaign_id=last_sent_id,
    )


class GrowthPoint(BaseModel):
    date: str
    count: int


@router.get("/subscriber-growth", response_model=List[GrowthPoint])
def get_subscriber_growth(
    period: Literal["7d", "30d"] = "7d",
    db: Session = Depends(get_db),
) -> Any:
    """Subscriber growth for chart: daily counts over the last 7 or 30 days."""
    days = 7 if period == "7d" else 30
    now = datetime.now(timezone.utc)
    start = now - timedelta(days=days)
    # Group by date(created_at) and count
    subq = (
        db.query(
            func.date(Subscriber.created_at).label("d"),
            func.count(Subscriber.id).label("c"),
        )
        .filter(Subscriber.created_at >= start)
        .group_by(func.date(Subscriber.created_at))
        .all()
    )
    by_date = {str(d): c for d, c in subq}
    out: List[GrowthPoint] = []
    for i in range(days):
        d = date(now.year, now.month, now.day) - timedelta(days=days - 1 - i)
        d_str = d.isoformat()
        out.append(GrowthPoint(date=d_str, count=by_date.get(d_str, 0)))
    return out


class AlertItem(BaseModel):
    id: int
    alert_type: str
    enabled: bool
    last_triggered_at: str | None


@router.get("/alerts", response_model=List[AlertItem])
def get_alerts(db: Session = Depends(get_db)) -> Any:
    """System alerts (sending paused, domain issues, automation errors, etc.)."""
    rows = db.query(SystemAlert).all()
    return [
        AlertItem(
            id=r.id,
            alert_type=r.alert_type,
            enabled=r.enabled,
            last_triggered_at=r.last_triggered_at.isoformat() if r.last_triggered_at else None,
        )
        for r in rows
    ]


# --- Booking control center (stub until booking domain exists) ---

class BookingTrendPoint(BaseModel):
    date: str
    count: int


class EventTypePerformanceItem(BaseModel):
    id: int
    name: str
    slug: str
    bookings_count: int


class TodayScheduleItem(BaseModel):
    id: int
    title: str
    start_at: str
    end_at: str
    attendee_name: str | None
    attendee_email: str | None
    status: str


class PendingConfirmationItem(BaseModel):
    id: int
    event_type_name: str
    attendee_email: str | None
    requested_at: str


class TeamBookingLoadItem(BaseModel):
    member_id: int
    member_name: str
    bookings_count: int


class BookingOverview(BaseModel):
    # Core metrics
    upcoming_bookings: int
    total_bookings: int
    cancellations: int
    reschedules: int
    revenue: float
    payments_enabled: bool
    # Time range applied for total_bookings / trends (e.g. "7d", "30d", "90d")
    time_range: str
    booking_trends: List[BookingTrendPoint]
    event_type_performance: List[EventTypePerformanceItem]
    # Widgets
    today_schedule: List[TodayScheduleItem]
    pending_confirmations: List[PendingConfirmationItem]
    team_booking_load: List[TeamBookingLoadItem]


@router.get("/booking-overview", response_model=BookingOverview)
def get_booking_overview(
    range_param: Literal["7d", "30d", "90d"] = Query("30d", alias="range"),
    db: Session = Depends(get_db),
) -> Any:
    """Booking control center data from EventType and Booking models."""
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    days = {"7d": 7, "30d": 30, "90d": 90}[range_param]
    start = today_start - timedelta(days=days)

    # Upcoming: start_at > now, status in (confirmed, pending_confirmation)
    upcoming_bookings = (
        db.query(Booking)
        .filter(
            Booking.start_at > now,
            Booking.status.in_([BookingStatus.confirmed, BookingStatus.pending_confirmation]),
        )
        .count()
    )

    # Total in range (non-cancelled): from start through now
    total_bookings = (
        db.query(Booking)
        .filter(
            Booking.start_at >= start,
            Booking.start_at <= now,
            Booking.status != BookingStatus.cancelled,
        )
        .count()
    )

    cancellations = (
        db.query(Booking)
        .filter(Booking.start_at >= start, Booking.status == BookingStatus.cancelled)
        .count()
    )
    reschedules = (
        db.query(Booking)
        .filter(Booking.start_at >= start, Booking.status == BookingStatus.rescheduled)
        .count()
    )

    # Revenue: sum of amount for non-cancelled in range
    revenue_row = (
        db.query(func.coalesce(func.sum(Booking.amount), 0))
        .filter(
            Booking.start_at >= start,
            Booking.status != BookingStatus.cancelled,
            Booking.amount.isnot(None),
        )
        .scalar()
    )
    revenue = float(revenue_row) if revenue_row is not None else 0.0
    payments_enabled = db.query(Booking).filter(Booking.amount.isnot(None)).limit(1).first() is not None

    # Booking trends: count per day in range
    trend_q = (
        db.query(func.date(Booking.start_at).label("d"), func.count(Booking.id).label("c"))
        .filter(
            Booking.start_at >= start,
            Booking.status != BookingStatus.cancelled,
        )
        .group_by(func.date(Booking.start_at))
        .all()
    )
    by_date = {str(d): c for d, c in trend_q}
    booking_trends = []
    for i in range(days):
        d = date(now.year, now.month, now.day) - timedelta(days=days - 1 - i)
        booking_trends.append(BookingTrendPoint(date=d.isoformat(), count=by_date.get(d.isoformat(), 0)))

    # Event type performance: count bookings per event type in range
    et_perf_q = (
        db.query(EventType.id, EventType.name, EventType.slug, func.count(Booking.id).label("cnt"))
        .outerjoin(Booking, (Booking.event_type_id == EventType.id) & (Booking.start_at >= start) & (Booking.status != BookingStatus.cancelled))
        .group_by(EventType.id, EventType.name, EventType.slug)
        .all()
    )
    event_type_performance = [
        EventTypePerformanceItem(id=et_id, name=et_name, slug=et_slug, bookings_count=cnt or 0)
        for et_id, et_name, et_slug, cnt in et_perf_q
    ]

    # Today's schedule: confirmed or pending, start today
    today_end = today_start + timedelta(days=1)
    today_bookings = (
        db.query(Booking)
        .filter(
            Booking.start_at >= today_start,
            Booking.start_at < today_end,
            Booking.status.in_([BookingStatus.confirmed, BookingStatus.pending_confirmation]),
        )
        .order_by(Booking.start_at)
        .all()
    )
    today_schedule = [
        TodayScheduleItem(
            id=b.id,
            title=b.title or "",
            start_at=b.start_at.strftime("%H:%M") if b.start_at else "",
            end_at=b.end_at.strftime("%H:%M") if b.end_at else "",
            attendee_name=b.attendee_name,
            attendee_email=b.attendee_email,
            status=b.status.value,
        )
        for b in today_bookings
    ]

    # Pending confirmations
    pending = (
        db.query(Booking)
        .filter(Booking.status == BookingStatus.pending_confirmation)
        .order_by(Booking.created_at.desc())
        .all()
    )
    pending_confirmations = []
    for b in pending:
        et = db.query(EventType).filter(EventType.id == b.event_type_id).first()
        pending_confirmations.append(
            PendingConfirmationItem(
                id=b.id,
                event_type_name=et.name if et else "",
                attendee_email=b.attendee_email,
                requested_at=b.created_at.isoformat() if b.created_at else "",
            )
        )

    # Team booking load: count per team_member in range
    team_q = (
        db.query(TeamMember.id, TeamMember.name, func.count(Booking.id).label("cnt"))
        .outerjoin(Booking, (Booking.team_member_id == TeamMember.id) & (Booking.start_at >= start) & (Booking.status != BookingStatus.cancelled))
        .group_by(TeamMember.id, TeamMember.name)
        .all()
    )
    team_booking_load = [
        TeamBookingLoadItem(member_id=tid, member_name=tname, bookings_count=cnt or 0)
        for tid, tname, cnt in team_q
    ]

    return BookingOverview(
        upcoming_bookings=upcoming_bookings,
        total_bookings=total_bookings,
        cancellations=cancellations,
        reschedules=reschedules,
        revenue=revenue,
        payments_enabled=payments_enabled,
        time_range=range_param,
        booking_trends=booking_trends,
        event_type_performance=event_type_performance,
        today_schedule=today_schedule,
        pending_confirmations=pending_confirmations,
        team_booking_load=team_booking_load,
    )
