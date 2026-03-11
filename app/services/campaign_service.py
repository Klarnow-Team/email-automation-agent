from datetime import datetime, timezone
import random

from sqlalchemy.orm import Session

from app.models.campaign import Campaign, CampaignRecipient, CampaignStatus
from app.models.subscriber import Subscriber, SubscriberStatus
from app.models.suppression import SuppressionEntry, SuppressionType
from app.services.resend_service import send_batch
from app.services.whatsapp_service import send_whatsapp
from app.services.event_bus import emit as event_emit
from app.services.activity_service import log_activity
from app.services.tracking_utils import inject_tracking_html, build_unsubscribe_url
from app.services.email_template import wrap_transactional_html
from app.config import get_settings
import re


def _html_to_plain(html: str) -> str:
    """Strip HTML tags and collapse whitespace for a plain-text fallback. Improves deliverability (multipart preferred)."""
    if not html:
        return ""
    text = re.sub(r"<br\s*/?>", "\n", html, flags=re.IGNORECASE)
    text = re.sub(r"</p>", "\n", text, flags=re.IGNORECASE)
    text = re.sub(r"<[^>]+>", "", text)
    text = re.sub(r"\n\s*\n", "\n\n", text)
    return text.strip() or ""


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


def _rewrite_image_urls_for_email(html: str, public_base_url: str) -> str:
    """Replace localhost, 127.0.0.1, and relative /uploads/ image URLs with public_base_url so images load when recipients open the email."""
    if not html or not public_base_url:
        return html
    base = public_base_url.rstrip("/")

    def replace_src(match: re.Match) -> str:
        quote = match.group(1)
        url = (match.group(2) or "").strip()
        if not url:
            return match.group(0)
        if "/t/open" in url:
            return match.group(0)
        if url.startswith("/") and "/uploads/" in url:
            new_url = f"{base}{url}"
            return f'src={quote}{new_url}{quote}'
        if "localhost" in url.lower() or "127.0.0.1" in url:
            if "/uploads/" in url:
                path = "/uploads/" + url.split("/uploads/", 1)[-1].split("?")[0].split("#")[0]
                new_url = f"{base}{path}"
                return f'src={quote}{new_url}{quote}'
        return match.group(0)

    return re.sub(r'src=(["\'])([^"\']*?)["\']', replace_src, html, flags=re.IGNORECASE)


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
    Resolve recipients, send via Resend (email) or Twilio (whatsapp), record CampaignRecipient and update campaign status.
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

    channel = (getattr(campaign, "channel", None) or "email").lower()
    if channel == "whatsapp":
        subscribers = [s for s in subscribers if getattr(s, "phone", None) and str(s.phone).strip()]
        if not subscribers:
            return 0, "No recipients with a phone number. Add phone numbers to subscribers for WhatsApp campaigns."
        settings = get_settings()
        if not settings.twilio_account_sid or not settings.twilio_whatsapp_from:
            return 0, "WhatsApp is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_WHATSAPP_FROM."
        campaign.status = CampaignStatus.sending
        db.commit()
        sent = 0
        message_body = (campaign.plain_body or campaign.subject or "").strip()
        if not message_body:
            campaign.status = CampaignStatus.draft
            db.commit()
            return 0, "WhatsApp campaign needs a message (plain body or subject)."
        for s in subscribers:
            personalized = _personalize(message_body, s)
            if send_whatsapp(s.phone, personalized):
                rec = CampaignRecipient(
                    campaign_id=campaign.id,
                    subscriber_id=s.id,
                    sent_at=datetime.now(timezone.utc),
                    variant=None,
                )
                db.add(rec)
                sent += 1
        campaign.status = CampaignStatus.sent
        campaign.sent_at = datetime.now(timezone.utc)
        db.commit()
        event_emit(db, "campaign.sent", {"campaign_id": campaign.id, "sent_count": sent})
        log_activity(db, "campaign.sent", "campaign", campaign.id, {"sent_count": sent})
        return sent, ""
    # --- Email path ---
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

    emails_to_send = []
    variants = []
    unsubscribe_url_placeholder = "{{unsubscribe_url}}"
    for s in subscribers:
        if use_ab and random.random() < split_b:
            variant = "b"
            subject = _personalize(campaign.ab_subject_b, s)
            raw_html = wrap_transactional_html(campaign.ab_html_body_b)
        else:
            variant = "a" if use_ab else None
            subject = _personalize(campaign.subject, s)
            raw_html = wrap_transactional_html(campaign.html_body)
        unsubscribe_url = build_unsubscribe_url(base_url, secret, s.id) if base_url else "#"
        html = _personalize(raw_html, s, extra={unsubscribe_url_placeholder: unsubscribe_url})
        # Rewrite image URLs (localhost, /uploads/) to public base so images load for recipients
        if base_url:
            html = _rewrite_image_urls_for_email(html, base_url)
        # Open/click tracking: pixel at /t/open and link wraps to /t/click when TRACKING_BASE_URL is set
        if base_url:
            html = inject_tracking_html(html, base_url, secret, campaign.id, s.id)
        plain = _personalize(campaign.plain_body or "", s) if getattr(campaign, "plain_body", None) else None
        if plain and not plain.strip():
            plain = None
        if plain is None:
            plain = _html_to_plain(html)

        # Minimal headers: avoid Precedence/list/bulk so Gmail is less likely to route to Promotions.
        # List-Unsubscribe + List-Unsubscribe-Post only when we have an unsubscribe URL (required for one-click).
        headers = {}
        if base_url and unsubscribe_url and unsubscribe_url != "#":
            headers["List-Unsubscribe"] = f"<{unsubscribe_url}>"
            headers["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click"

        payload = {
            "to": s.email,
            "subject": subject,
            "html": html,
            "text": plain,
            "headers": headers,
        }
        if (reply_to := (settings.resend_reply_to or "").strip()):
            payload["reply_to"] = reply_to
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
