from collections import Counter
from datetime import date, datetime, timedelta, timezone
from typing import Any, List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.campaign import CampaignRecipient
from app.models.subscriber import Subscriber, SubscriberStatus
from app.models.group import SubscriberGroup
from app.models.tag import SubscriberTag
from app.models.tracking import SubscriberActivity, TrackingEvent
from app.schemas.subscriber import SubscriberCreate, SubscriberUpdate, SubscriberResponse, SubscriberImportItem, SubscriberBulkUpdate
from app.services.automation_service import trigger_automations_for_new_subscriber, trigger_automations_for_field_updated
from app.services.event_bus import emit as event_emit
from app.services.activity_service import log_activity

router = APIRouter()


def _subscriber_to_response(s, group_ids=None, tag_ids=None):
    if group_ids is None:
        group_ids = []
    if tag_ids is None:
        tag_ids = []
    data = {
        "id": s.id,
        "email": s.email,
        "name": s.name,
        "phone": getattr(s, "phone", None),
        "status": s.status.value if hasattr(s.status, "value") else s.status,
        "custom_fields": s.custom_fields if getattr(s, "custom_fields", None) is not None else {},
        "created_at": s.created_at,
        "group_ids": group_ids,
        "tag_ids": tag_ids,
    }
    return SubscriberResponse(**data)


def _get_group_tag_maps(db: Session, subscriber_ids: List[int]):
    if not subscriber_ids:
        return {}, {}
    group_map = {}
    for sg in db.query(SubscriberGroup).filter(SubscriberGroup.subscriber_id.in_(subscriber_ids)).all():
        group_map.setdefault(sg.subscriber_id, []).append(sg.group_id)
    tag_map = {}
    for st in db.query(SubscriberTag).filter(SubscriberTag.subscriber_id.in_(subscriber_ids)).all():
        tag_map.setdefault(st.subscriber_id, []).append(st.tag_id)
    return group_map, tag_map


@router.get("", response_model=List[SubscriberResponse])
def list_subscribers(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    subscribers = db.query(Subscriber).offset(skip).limit(limit).all()
    if not subscribers:
        return []
    ids = [s.id for s in subscribers]
    group_map, tag_map = _get_group_tag_maps(db, ids)
    return [
        _subscriber_to_response(s, group_map.get(s.id, []), tag_map.get(s.id, []))
        for s in subscribers
    ]


@router.get("/stats")
def get_subscriber_stats(
    period: str = "30d",
    db: Session = Depends(get_db),
) -> Any:
    """MailerLite-style subscriber stats: total active, new today, new in period, new this month, unsubscribed in period, and chart data (subscribes vs unsubscribes)."""
    # Resolve period to days
    period_days = 30
    if period == "7d":
        period_days = 7
    elif period == "30d":
        period_days = 30
    elif period == "2m":
        period_days = 60
    elif period == "3m":
        period_days = 90
    elif period == "6m":
        period_days = 180
    elif period == "year":
        period_days = 365
    elif period == "last_year":
        period_days = 365
    else:
        period_days = 30

    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    period_start = now - timedelta(days=period_days)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    total_active = db.query(Subscriber).filter(Subscriber.status == SubscriberStatus.active).count()
    new_today = (
        db.query(Subscriber).filter(Subscriber.created_at >= today_start).count()
    )
    new_in_period = (
        db.query(Subscriber).filter(Subscriber.created_at >= period_start).count()
    )
    new_this_month = (
        db.query(Subscriber).filter(Subscriber.created_at >= month_start).count()
    )
    unsubscribed_in_period = (
        db.query(TrackingEvent)
        .filter(
            TrackingEvent.event_type == "unsubscribe",
            TrackingEvent.created_at >= period_start,
        )
        .count()
    )

    # Chart: daily subscribes and unsubscribes over the period
    subq = (
        db.query(
            func.date(Subscriber.created_at).label("d"),
            func.count(Subscriber.id).label("c"),
        )
        .filter(Subscriber.created_at >= period_start)
        .group_by(func.date(Subscriber.created_at))
        .all()
    )
    unsubq = (
        db.query(
            func.date(TrackingEvent.created_at).label("d"),
            func.count(TrackingEvent.id).label("c"),
        )
        .filter(
            TrackingEvent.event_type == "unsubscribe",
            TrackingEvent.created_at >= period_start,
        )
        .group_by(func.date(TrackingEvent.created_at))
        .all()
    )
    day_start = period_start.date()
    by_date_sub = {str(d): c for d, c in subq}
    by_date_unsub = {str(d): c for d, c in unsubq}
    dates: List[str] = []
    subscribes: List[int] = []
    unsubscribes: List[int] = []
    for i in range(period_days):
        d = day_start + timedelta(days=i)
        d_str = d.isoformat()
        dates.append(d_str)
        subscribes.append(by_date_sub.get(d_str, 0))
        unsubscribes.append(by_date_unsub.get(d_str, 0))

    # Top domains (from active subscriber emails)
    domain_counts: Counter = Counter()
    for (email,) in db.query(Subscriber.email).filter(Subscriber.status == SubscriberStatus.active).all():
        if email and "@" in email:
            domain = email.split("@")[-1].strip().lower()
            if domain:
                domain_counts[domain] += 1
    top_domains = [{"domain": d, "count": c} for d, c in domain_counts.most_common(5)]

    # Overall rates (all-time): sent, opens, clicks
    total_sent = db.query(CampaignRecipient).filter(CampaignRecipient.sent_at.isnot(None)).count()
    total_opens = db.query(TrackingEvent).filter(TrackingEvent.event_type == "open").count()
    total_clicks = db.query(TrackingEvent).filter(TrackingEvent.event_type == "click").count()
    avg_open_rate = round(total_opens / total_sent * 100, 1) if total_sent else 0.0
    avg_click_rate = round(total_clicks / total_sent * 100, 1) if total_sent else 0.0

    avg_new_subscribers = round(new_in_period / period_days, 1) if period_days else 0.0
    avg_unsubscribes = round(unsubscribed_in_period / period_days, 1) if period_days else 0.0

    # Subscriber engagement (in period): read_never (0 opens), read_sometimes (1-2 opens), read_often (3+ opens)
    open_counts_q = (
        db.query(TrackingEvent.subscriber_id, func.count(TrackingEvent.id).label("c"))
        .filter(
            TrackingEvent.event_type == "open",
            TrackingEvent.created_at >= period_start,
            TrackingEvent.subscriber_id.isnot(None),
        )
        .group_by(TrackingEvent.subscriber_id)
        .all()
    )
    read_sometimes = sum(1 for _, c in open_counts_q if 1 <= c <= 2)
    read_often = sum(1 for _, c in open_counts_q if c >= 3)
    unique_openers = len(open_counts_q)
    read_never = max(0, total_active - unique_openers)

    # Top email clients and reading environment (from open/click events in period with payload)
    client_counter: Counter = Counter()
    environment_counter: Counter = Counter()
    for evt in (
        db.query(TrackingEvent.payload)
        .filter(
            TrackingEvent.event_type.in_(["open", "click"]),
            TrackingEvent.created_at >= period_start,
        )
        .all()
    ):
        p = evt[0] if isinstance(evt, (list, tuple)) else evt
        if p and isinstance(p, dict):
            client_counter[p.get("email_client") or "Unknown"] += 1
            environment_counter[p.get("environment") or "desktop"] += 1

    top_email_clients = [{"client": c, "count": n} for c, n in client_counter.most_common(5)]
    reading_environment = [
        {"environment": "webmail", "count": environment_counter.get("webmail", 0)},
        {"environment": "desktop", "count": environment_counter.get("desktop", 0)},
        {"environment": "mobile", "count": environment_counter.get("mobile", 0)},
    ]

    return {
        "total_active": total_active,
        "new_today": new_today,
        "new_in_period": new_in_period,
        "new_this_month": new_this_month,
        "unsubscribed_in_period": unsubscribed_in_period,
        "period": period,
        "chart": {
            "dates": dates,
            "subscribes": subscribes,
            "unsubscribes": unsubscribes,
        },
        "top_domains": top_domains,
        "top_email_clients": top_email_clients,
        "reading_environment": reading_environment,
        "subscriber_engagement": {
            "read_never": read_never,
            "read_sometimes": read_sometimes,
            "read_often": read_often,
            "active_count": total_active,
        },
        "avg_open_rate": avg_open_rate,
        "avg_click_rate": avg_click_rate,
        "avg_new_subscribers": avg_new_subscribers,
        "avg_unsubscribes": avg_unsubscribes,
    }


@router.post("", response_model=SubscriberResponse, status_code=201)
def create_subscriber(body: SubscriberCreate, db: Session = Depends(get_db)):
    existing = db.query(Subscriber).filter(Subscriber.email == body.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Subscriber with this email already exists")
    subscriber = Subscriber(
        email=body.email,
        name=body.name,
        phone=body.phone,
        status=SubscriberStatus.active,
        custom_fields=body.custom_fields or {},
    )
    db.add(subscriber)
    db.commit()
    db.refresh(subscriber)
    event_emit(db, "subscriber.created", {"subscriber_id": subscriber.id, "email": subscriber.email})
    log_activity(db, "subscriber.created", "subscriber", subscriber.id, {"email": subscriber.email})
    db.add(SubscriberActivity(subscriber_id=subscriber.id, event_type="subscriber.created", payload={"email": subscriber.email}))
    db.commit()
    trigger_automations_for_new_subscriber(db, subscriber)
    return _subscriber_to_response(subscriber, [], [])


@router.get("/{subscriber_id}", response_model=SubscriberResponse)
def get_subscriber(subscriber_id: int, db: Session = Depends(get_db)):
    subscriber = db.query(Subscriber).filter(Subscriber.id == subscriber_id).first()
    if not subscriber:
        raise HTTPException(status_code=404, detail="Subscriber not found")
    group_map, tag_map = _get_group_tag_maps(db, [subscriber_id])
    return _subscriber_to_response(subscriber, group_map.get(subscriber_id, []), tag_map.get(subscriber_id, []))


@router.patch("/{subscriber_id}", response_model=SubscriberResponse)
def update_subscriber(subscriber_id: int, body: SubscriberUpdate, db: Session = Depends(get_db)):
    subscriber = db.query(Subscriber).filter(Subscriber.id == subscriber_id).first()
    if not subscriber:
        raise HTTPException(status_code=404, detail="Subscriber not found")
    if body.name is not None:
        subscriber.name = body.name
    if body.status is not None:
        subscriber.status = SubscriberStatus(body.status)
    if body.phone is not None:
        subscriber.phone = body.phone
    if body.custom_fields is not None:
        subscriber.custom_fields = body.custom_fields
    db.commit()
    db.refresh(subscriber)
    if body.custom_fields is not None:
        trigger_automations_for_field_updated(db, subscriber)
    group_map, tag_map = _get_group_tag_maps(db, [subscriber_id])
    return _subscriber_to_response(subscriber, group_map.get(subscriber_id, []), tag_map.get(subscriber_id, []))


@router.delete("/{subscriber_id}", status_code=204)
def delete_subscriber(subscriber_id: int, db: Session = Depends(get_db)):
    subscriber = db.query(Subscriber).filter(Subscriber.id == subscriber_id).first()
    if not subscriber:
        raise HTTPException(status_code=404, detail="Subscriber not found")
    db.delete(subscriber)
    db.commit()
    return None


@router.get("/{subscriber_id}/activity")
def get_subscriber_activity(subscriber_id: int, skip: int = 0, limit: int = 50, db: Session = Depends(get_db)):
    subscriber = db.query(Subscriber).filter(Subscriber.id == subscriber_id).first()
    if not subscriber:
        raise HTTPException(status_code=404, detail="Subscriber not found")
    rows = (
        db.query(SubscriberActivity)
        .filter(SubscriberActivity.subscriber_id == subscriber_id)
        .order_by(SubscriberActivity.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return [
        {"id": r.id, "event_type": r.event_type, "payload": r.payload, "created_at": r.created_at.isoformat() if r.created_at else None}
        for r in rows
    ]


@router.post("/bulk-update")
def bulk_update_subscribers(body: SubscriberBulkUpdate, db: Session = Depends(get_db)):
    updated = db.query(Subscriber).filter(Subscriber.id.in_(body.subscriber_ids)).all()
    for s in updated:
        if body.name is not None:
            s.name = body.name
        if body.status is not None:
            s.status = SubscriberStatus(body.status)
        if body.phone is not None:
            s.phone = body.phone
        if body.custom_fields is not None:
            s.custom_fields = body.custom_fields
    db.commit()
    return {"updated": len(updated)}


@router.post("/import", response_model=List[SubscriberResponse])
def import_subscribers(body: List[SubscriberImportItem], db: Session = Depends(get_db)):
    created = []
    for item in body:
        existing = db.query(Subscriber).filter(Subscriber.email == item.email).first()
        if existing:
            continue
        subscriber = Subscriber(
            email=item.email,
            name=item.name,
            phone=item.phone,
            status=SubscriberStatus.active,
            custom_fields=item.custom_fields or {},
        )
        db.add(subscriber)
        db.commit()
        db.refresh(subscriber)
        created.append(subscriber)
        event_emit(db, "subscriber.created", {"subscriber_id": subscriber.id, "email": subscriber.email})
        log_activity(db, "subscriber.created", "subscriber", subscriber.id, {"email": subscriber.email})
        db.add(SubscriberActivity(subscriber_id=subscriber.id, event_type="subscriber.created", payload={"email": subscriber.email}))
        db.commit()
        trigger_automations_for_new_subscriber(db, subscriber)
    return [_subscriber_to_response(s, [], []) for s in created]
