"""
Event bus: store events and dispatch to webhook subscriptions.
Retries with backoff; optional HMAC signing when subscription has secret.
"""
import hashlib
import hmac
import json
import threading
import time
from typing import Any

import httpx
from sqlalchemy.orm import Session

from app.models.event_bus import Event, WebhookSubscription


def emit(db: Session, event_type: str, payload: dict[str, Any] | None = None) -> Event:
    """Store event and dispatch to all matching webhook subscriptions (async in background)."""
    event = Event(event_type=event_type, payload=payload or {})
    db.add(event)
    db.commit()
    db.refresh(event)

    subs = (
        db.query(WebhookSubscription)
        .filter(WebhookSubscription.enabled == True)
        .all()
    )
    for sub in subs:
        if sub.event_types is None or event_type in sub.event_types:
            secret = getattr(sub, "secret", None) or None
            pl = event.payload if isinstance(event.payload, dict) else {}
            threading.Thread(target=_post_webhook, args=(sub.url, event_type, pl, secret), daemon=True).start()

    return event


def _sign_payload(payload_bytes: bytes, secret: str) -> str:
    return "sha256=" + hmac.new(secret.encode("utf-8"), payload_bytes, hashlib.sha256).hexdigest()


def _post_webhook(url: str, event_type: str, payload: dict, secret: str | None = None) -> None:
    body = {"event": event_type, "payload": payload}
    body_bytes = json.dumps(body, sort_keys=True).encode("utf-8")
    headers = {"Content-Type": "application/json"}
    if secret:
        headers["X-Webhook-Signature"] = _sign_payload(body_bytes, secret)
    for attempt in range(3):
        try:
            with httpx.Client(timeout=10.0) as client:
                r = client.post(url, content=body_bytes, headers=headers)
                if r.status_code < 500:
                    return
        except Exception:
            pass
        if attempt < 2:
            time.sleep(2**attempt)
