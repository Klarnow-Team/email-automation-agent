"""Compute open and click rates for a set of subscriber IDs (e.g. segment or group members)."""
from typing import List, Optional, Tuple

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.campaign import CampaignRecipient
from app.models.tracking import TrackingEvent


def get_rates_for_subscriber_ids(
    db: Session, subscriber_ids: List[int]
) -> Tuple[Optional[float], Optional[float]]:
    """
    Return (open_rate, click_rate) as percentages 0–100, or (None, None) if no emails sent.
    Rates are computed over all campaign sends to these subscribers.
    """
    if not subscriber_ids:
        return None, None
    sent = (
        db.query(func.count(CampaignRecipient.id))
        .filter(
            CampaignRecipient.subscriber_id.in_(subscriber_ids),
            CampaignRecipient.sent_at.isnot(None),
        )
        .scalar()
        or 0
    )
    if sent == 0:
        return None, None
    opens = (
        db.query(func.count(TrackingEvent.id))
        .filter(
            TrackingEvent.subscriber_id.in_(subscriber_ids),
            TrackingEvent.event_type == "open",
        )
        .scalar()
        or 0
    )
    clicks = (
        db.query(func.count(TrackingEvent.id))
        .filter(
            TrackingEvent.subscriber_id.in_(subscriber_ids),
            TrackingEvent.event_type == "click",
        )
        .scalar()
        or 0
    )
    open_rate = round(opens / sent * 100, 1)
    click_rate = round(clicks / sent * 100, 1)
    return open_rate, click_rate
