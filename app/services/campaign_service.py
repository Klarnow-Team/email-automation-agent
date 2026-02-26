from datetime import datetime, timezone
import random

from sqlalchemy.orm import Session

from app.models.campaign import Campaign, CampaignRecipient, CampaignStatus
from app.models.subscriber import Subscriber, SubscriberStatus
from app.models.suppression import SuppressionEntry, SuppressionType
from app.services.resend_service import send_batch
from app.services.event_bus import emit as event_emit
from app.services.activity_service import log_activity
from app.services.tracking_utils import inject_tracking_html, build_unsubscribe_url
from app.services.email_template import wrap_transactional_html
from app.config import get_settings


def _load_suppressed_set(db: Session):
    """Return (set of suppressed emails, set of suppressed domains)."""
    entries = db.query(SuppressionEntry).all()
    emails = set()
    domains = set()
    for e in entries:
        if e.type == SuppressionType.email:
            emails.add(e.value.lower())
        else:
            domains.add(e.value.lower())
    return emails, domains


def _is_suppressed(email: str, suppressed_emails: set, suppressed_domains: set) -> bool:
    email = (email or "").strip().lower()
    if not email:
        return True
    if email in suppressed_emails:
        return True
    if "@" in email:
        domain = email.split("@", 1)[1]
        if domain in suppressed_domains:
            return True
    return False


def _personalize(text: str, subscriber: Subscriber, extra: dict | None = None) -> str:
    """Replace {{name}}, {{email}}, {{id}} and any extra placeholders with subscriber values."""
    if not text:
        return text
    out = (
        text.replace("{{name}}", subscriber.name or "")
        .replace("{{email}}", subscriber.email or "")
        .replace("{{id}}", str(subscriber.id))
    )
    if extra:
        for k, v in extra.items():
            out = out.replace(k, str(v))
    return out


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

    suppressed_emails, suppressed_domains = _load_suppressed_set(db)
    subscribers = [s for s in subscribers if not _is_suppressed(s.email, suppressed_emails, suppressed_domains)]
    if not subscribers:
        return 0, "No recipients after applying suppression list"

    campaign.status = CampaignStatus.sending
    db.commit()

    settings = get_settings()
    base_url = (settings.tracking_base_url or "").strip()
    secret = settings.tracking_secret or ""

    use_ab = (
        campaign.ab_split_percent
        and campaign.ab_subject_b
        and campaign.ab_html_body_b
    )
    split_b = (campaign.ab_split_percent or 0) / 100.0

    base_for_redirect = (getattr(settings, "frontend_base_url", None) or settings.tracking_base_url or "").strip().rstrip("/")
    email_logo_url = f"{base_for_redirect}/light-klarnow-logo.svg" if base_for_redirect else ""

    emails_to_send = []
    variants = []
    unsubscribe_url_placeholder = "{{unsubscribe_url}}"
    for s in subscribers:
        if use_ab and random.random() < split_b:
            variant = "b"
            subject = _personalize(campaign.ab_subject_b, s)
            raw_html = wrap_transactional_html(campaign.ab_html_body_b, logo_url=email_logo_url)
        else:
            variant = "a" if use_ab else None
            subject = _personalize(campaign.subject, s)
            raw_html = wrap_transactional_html(campaign.html_body, logo_url=email_logo_url)
        unsubscribe_url = build_unsubscribe_url(base_url, secret, s.id) if base_url else "#"
        html = _personalize(raw_html, s, extra={unsubscribe_url_placeholder: unsubscribe_url})
        if base_url:
            html = inject_tracking_html(html, base_url, secret, campaign.id, s.id)
        plain = _personalize(campaign.plain_body or "", s) if getattr(campaign, "plain_body", None) else None
        if plain and not plain.strip():
            plain = None

        # List-Unsubscribe and List-Unsubscribe-Post reduce promotions-tab placement (Gmail/Yahoo)
        headers = None
        if base_url and unsubscribe_url and unsubscribe_url != "#":
            headers = {
                "List-Unsubscribe": f"<{unsubscribe_url}>",
                "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
            }

        payload = {
            "to": s.email,
            "subject": subject,
            "html": html,
            "text": plain,
        }
        if headers is not None:
            payload["headers"] = headers
        emails_to_send.append(payload)
        variants.append((s.id, variant))

    chunk_size = 100
    sent = 0
    for i in range(0, len(emails_to_send), chunk_size):
        chunk = emails_to_send[i : i + chunk_size]
        sub_chunk = subscribers[i : i + chunk_size]
        var_chunk = variants[i : i + chunk_size]
        result = send_batch(chunk)
        if result is None:
            campaign.status = CampaignStatus.draft
            db.commit()
            return sent, "Resend send failed"
        for (sub, (sub_id, variant)) in zip(sub_chunk, var_chunk):
            rec = CampaignRecipient(
                campaign_id=campaign.id,
                subscriber_id=sub_id,
                sent_at=datetime.now(timezone.utc),
                variant=variant,
            )
            db.add(rec)
            sent += 1

    campaign.status = CampaignStatus.sent
    campaign.sent_at = datetime.now(timezone.utc)
    db.commit()
    event_emit(db, "campaign.sent", {"campaign_id": campaign.id, "sent_count": sent})
    log_activity(db, "campaign.sent", "campaign", campaign.id, {"sent_count": sent})
    return sent, ""
