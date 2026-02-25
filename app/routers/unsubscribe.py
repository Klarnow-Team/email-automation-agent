"""One-click unsubscribe from campaign emails. No auth — link is signed."""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.models.subscriber import Subscriber, SubscriberStatus
from app.models.tracking import SubscriberActivity, TrackingEvent
from app.services.tracking_utils import verify_unsubscribe_signature

router = APIRouter(tags=["unsubscribe"])


def _perform_unsubscribe(subscriber_id: int, db: Session):
    """Unsubscribe by subscriber ID. Idempotent. Caller must verify signature and load subscriber."""
    subscriber = db.query(Subscriber).filter(Subscriber.id == subscriber_id).first()
    if not subscriber:
        raise HTTPException(status_code=404, detail="Subscriber not found")
    if subscriber.status == SubscriberStatus.unsubscribed:
        return
    subscriber.status = SubscriberStatus.unsubscribed
    db.add(SubscriberActivity(subscriber_id=subscriber.id, event_type="unsubscribe", payload={}))
    db.add(TrackingEvent(campaign_id=None, subscriber_id=subscriber.id, event_type="unsubscribe", payload={}))
    db.commit()


@router.get("/unsubscribe")
def unsubscribe_get(
    s: int,
    sig: str = "",
    db: Session = Depends(get_db),
):
    """
    Unsubscribe a subscriber by ID. Link must be signed (sig).
    Sets status to unsubscribed, logs tracking event, redirects to frontend confirmation.
    """
    settings = get_settings()
    if not verify_unsubscribe_signature(settings.tracking_secret, s, sig):
        raise HTTPException(status_code=400, detail="Invalid or expired link")

    _perform_unsubscribe(s, db)

    redirect_base = (getattr(settings, "frontend_base_url", None) or settings.tracking_base_url or "").strip().rstrip("/")
    if redirect_base:
        return RedirectResponse(url=f"{redirect_base}/unsubscribe?done=1", status_code=302)
    return {"status": "ok", "message": "You have been unsubscribed"}


@router.post("/unsubscribe")
def unsubscribe_post(
    s: int,
    sig: str = "",
    db: Session = Depends(get_db),
):
    """
    One-click unsubscribe (RFC 8058 / List-Unsubscribe-Post). Same as GET but returns 200 JSON.
    Gmail and other clients POST here when user clicks "Unsubscribe" in the UI.
    """
    settings = get_settings()
    if not verify_unsubscribe_signature(settings.tracking_secret, s, sig):
        raise HTTPException(status_code=400, detail="Invalid or expired link")

    _perform_unsubscribe(s, db)

    return {"status": "ok", "message": "You have been unsubscribed"}
