from typing import List, Optional

import resend
from loguru import logger
from resend.exceptions import ValidationError as ResendValidationError

from app.config import get_settings

settings = get_settings()
if settings.resend_api_key:
    resend.api_key = settings.resend_api_key

_RESEND_DEV_DOMAIN = "resend.dev"
_SANDBOX_HINT = (
    "When using the default from address (onboarding@resend.dev), you can only send to your Resend "
    "account email or to Resend test addresses (e.g. delivered@resend.dev). "
    "To send to any recipient, verify a domain at https://resend.com/domains and set RESEND_FROM_EMAIL to use it. "
    "For local testing you can set RESEND_SANDBOX_REDIRECT=delivered@resend.dev to redirect all recipients to a test address."
)


def _apply_sandbox_redirect(from_addr: str, to: str | List[str]) -> List[str]:
    """If sending from @resend.dev and RESEND_SANDBOX_REDIRECT is set, return that as the only recipient."""
    if not settings.resend_sandbox_redirect:
        return [to] if isinstance(to, str) else to
    if _RESEND_DEV_DOMAIN not in from_addr.lower():
        return [to] if isinstance(to, str) else to
    return [settings.resend_sandbox_redirect]


def send_email(
    to: str | List[str],
    subject: str,
    html: str,
    from_email: Optional[str] = None,
) -> Optional[dict]:
    """Send a single email (or to multiple recipients). Returns Resend response or None on failure."""
    if not settings.resend_api_key:
        logger.warning("RESEND_API_KEY not set; skipping send")
        return None
    from_addr = from_email or settings.resend_from_email
    recipients = _apply_sandbox_redirect(from_addr, to)
    params = {
        "from": from_addr,
        "to": recipients,
        "subject": subject,
        "html": html,
    }
    try:
        result = resend.Emails.send(params)
        return result
    except ResendValidationError as e:
        logger.error("Resend validation failed: {}. {}", e, _SANDBOX_HINT)
        raise
    except Exception as e:
        logger.exception("Resend send failed: {}", e)
        return None


def send_batch(emails: List[dict]) -> Optional[dict]:
    """Send batch of emails. Each item: { "to": str, "subject": str, "html": str, "text": str (optional) }. Returns Resend batch response or None."""
    if not settings.resend_api_key:
        logger.warning("RESEND_API_KEY not set; skipping batch send")
        return None
    from_addr = settings.resend_from_email
    params_list = []
    for e in emails:
        p = {
            "from": from_addr,
            "to": _apply_sandbox_redirect(from_addr, e["to"]),
            "subject": e["subject"],
            "html": e["html"],
        }
        if e.get("text") is not None:
            p["text"] = e["text"]
        params_list.append(p)
    try:
        result = resend.Batch.send(params_list)
        return result
    except ResendValidationError as e:
        logger.error("Resend validation failed: {}. {}", e, _SANDBOX_HINT)
        raise
    except Exception as e:
        logger.exception("Resend batch send failed: {}", e)
        return None


class ResendService:
    send_email = staticmethod(send_email)
    send_batch = staticmethod(send_batch)


resend_service = ResendService()
