"""Open and click tracking endpoints for campaign emails. No auth — URLs are signed."""
import hmac
import hashlib
import urllib.parse
from base64 import urlsafe_b64decode

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse, Response
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.models.tracking import TrackingEvent

router = APIRouter()

# 1x1 transparent GIF
_TRACKING_PIXEL_GIF = urlsafe_b64decode("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7")


def _sign(key: str, payload: str) -> str:
    return hmac.new(key.encode("utf-8"), payload.encode("utf-8"), hashlib.sha256).hexdigest()


def _verify_signature(key: str, payload: str, sig: str) -> bool:
    if not key or key == "change-me-in-production":
        return True
    return hmac.compare_digest(_sign(key, payload), sig)


@router.get("/t/open")
def track_open(
    c: int,
    s: int,
    sig: str = "",
    db: Session = Depends(get_db),
):
    """Log an open event and return a 1x1 transparent GIF. Called when the tracking pixel is loaded."""
    settings = get_settings()
    payload = f"open:{c}:{s}"
    if not _verify_signature(settings.tracking_secret, payload, sig):
        raise HTTPException(status_code=400, detail="Invalid signature")
    event = TrackingEvent(
        campaign_id=c,
        subscriber_id=s,
        event_type="open",
        payload=None,
    )
    db.add(event)
    db.commit()
    return Response(content=_TRACKING_PIXEL_GIF, media_type="image/gif")


@router.get("/t/click")
def track_click(
    c: int,
    s: int,
    url: str,
    sig: str = "",
    db: Session = Depends(get_db),
):
    """Log a click event and redirect to the destination URL."""
    settings = get_settings()
    payload = f"click:{c}:{s}:{url}"
    if not _verify_signature(settings.tracking_secret, payload, sig):
        raise HTTPException(status_code=400, detail="Invalid signature")
    event = TrackingEvent(
        campaign_id=c,
        subscriber_id=s,
        event_type="click",
        payload={"url": url},
    )
    db.add(event)
    db.commit()
    decoded = urllib.parse.unquote(url)
    if not decoded.startswith(("http://", "https://")):
        decoded = "https://" + decoded
    return RedirectResponse(url=decoded, status_code=302)
