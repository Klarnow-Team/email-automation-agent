"""Send WhatsApp messages via Twilio. Used for campaign channel=whatsapp."""

import re
from typing import Optional

from loguru import logger

from app.config import get_settings


def _normalize_phone(phone: str) -> Optional[str]:
    """Strip to digits and leading +; ensure E.164-ish (e.g. +1234567890)."""
    if not phone or not isinstance(phone, str):
        return None
    s = phone.strip()
    if not s:
        return None
    digits = re.sub(r"\D", "", s)
    if not digits:
        return None
    if not s.startswith("+"):
        digits = "1" + digits if len(digits) == 10 else digits
    return "+" + digits


def send_whatsapp(to_phone: str, body: str) -> bool:
    """
    Send one WhatsApp message via Twilio.
    to_phone: subscriber phone (E.164 or 10-digit); will be normalized to whatsapp:+...
    body: message text (max 4096 chars for WhatsApp).
    Returns True if sent, False if skipped or failed.
    """
    settings = get_settings()
    if not settings.twilio_account_sid or not settings.twilio_auth_token or not settings.twilio_whatsapp_from:
        logger.warning("WhatsApp/Twilio not configured; skipping send")
        return False

    normalized = _normalize_phone(to_phone)
    if not normalized:
        logger.warning("Invalid phone for WhatsApp: {}", to_phone)
        return False

    from_num = (settings.twilio_whatsapp_from or "").strip()
    if not from_num.lower().startswith("whatsapp:"):
        from_num = "whatsapp:" + from_num
    to_num = normalized if normalized.startswith("whatsapp:") else "whatsapp:" + normalized

    body = (body or "").strip()
    if not body:
        return False
    if len(body) > 4096:
        body = body[:4093] + "..."

    try:
        from twilio.rest import Client

        client = Client(settings.twilio_account_sid, settings.twilio_auth_token)
        client.messages.create(from_=from_num, to=to_num, body=body)
        return True
    except Exception as e:
        logger.exception("Twilio WhatsApp send failed: {}", e)
        return False
