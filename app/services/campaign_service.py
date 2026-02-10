from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.campaign import Campaign, CampaignRecipient, CampaignStatus
from app.models.subscriber import Subscriber, SubscriberStatus
from app.services.resend_service import send_batch


def send_campaign(
    db: Session,
    campaign: Campaign,
    recipient_ids: list[int] | None,
) -> tuple[int, str]:
    """
    Resolve recipients, send via Resend, record CampaignRecipient and update campaign status.
    Returns (sent_count, error_message). error_message is empty on full success.
    """
    if campaign.status != CampaignStatus.draft:
        return 0, "Campaign is not in draft status"

    query = db.query(Subscriber).filter(Subscriber.status == SubscriberStatus.active)
    if recipient_ids:
        query = query.filter(Subscriber.id.in_(recipient_ids))
    subscribers = query.all()
    if not subscribers:
        return 0, "No active subscribers to send to"

    campaign.status = CampaignStatus.sending
    db.commit()

    emails_to_send = [
        {"to": s.email, "subject": campaign.subject, "html": campaign.html_body}
        for s in subscribers
    ]
    chunk_size = 100
    sent = 0
    for i in range(0, len(emails_to_send), chunk_size):
        chunk = emails_to_send[i : i + chunk_size]
        result = send_batch(chunk)
        if result is None:
            campaign.status = CampaignStatus.draft
            db.commit()
            return sent, "Resend send failed"
        for sub in subscribers[i : i + chunk_size]:
            rec = CampaignRecipient(
                campaign_id=campaign.id,
                subscriber_id=sub.id,
                sent_at=datetime.now(timezone.utc),
            )
            db.add(rec)
            sent += 1

    campaign.status = CampaignStatus.sent
    campaign.sent_at = datetime.now(timezone.utc)
    db.commit()
    return sent, ""
