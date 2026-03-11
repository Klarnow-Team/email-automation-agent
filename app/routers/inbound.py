"""
Inbound webhook for Zapier/Make integrations.
POST /api/inbound/webhook with X-API-Key header.
Actions: create_subscriber, trigger_automation
"""

from typing import Any, Dict, Literal, Optional

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.models.automation import Automation
from app.models.subscriber import Subscriber, SubscriberStatus
from app.schemas.subscriber import SubscriberCreate
from app.services.automation_service import run_automation_for_subscriber, trigger_automations_for_new_subscriber
from app.services.event_bus import emit as event_emit
from app.services.activity_service import log_activity
from app.models.tracking import SubscriberActivity

router = APIRouter()


def _verify_api_key(x_api_key: Optional[str] = Header(None, alias="X-API-Key")) -> None:
    settings = get_settings()
    if not settings.inbound_webhook_api_key:
        raise HTTPException(status_code=503, detail="Inbound webhook is not configured (no API key set)")
    if not x_api_key or x_api_key != settings.inbound_webhook_api_key:
        raise HTTPException(status_code=401, detail="Invalid or missing API key")


# --- Schemas ---

class InboundPayloadCreateSubscriber(BaseModel):
    email: EmailStr
    name: Optional[str] = None
    custom_fields: Optional[Dict[str, str]] = None


class InboundPayloadTriggerAutomation(BaseModel):
    automation_id: int
    subscriber_id: Optional[int] = None
    email: Optional[EmailStr] = None


class InboundWebhookBody(BaseModel):
    action: Literal["create_subscriber", "trigger_automation"]
    payload: Dict[str, Any]


# --- Endpoint ---

@router.post("/webhook")
def inbound_webhook(
    body: InboundWebhookBody,
    x_api_key: Optional[str] = Header(None, alias="X-API-Key"),
    db: Session = Depends(get_db),
):
    """
    Inbound webhook for external tools (Zapier, Make, etc.).
    Requires X-API-Key header matching INBOUND_WEBHOOK_API_KEY.
    Actions:
    - create_subscriber: payload { email, name?, custom_fields? }
    - trigger_automation: payload { automation_id, subscriber_id? | email? }
    """
    _verify_api_key(x_api_key)

    if body.action == "create_subscriber":
        p = InboundPayloadCreateSubscriber(**body.payload)
        existing = db.query(Subscriber).filter(Subscriber.email == p.email).first()
        if existing:
            return {"ok": True, "subscriber_id": existing.id, "created": False, "message": "Subscriber already exists"}
        create = SubscriberCreate(email=p.email, name=p.name, custom_fields=p.custom_fields)
        subscriber = Subscriber(
            email=create.email,
            name=create.name,
            status=SubscriberStatus.active,
            custom_fields=create.custom_fields or {},
        )
        db.add(subscriber)
        db.commit()
        db.refresh(subscriber)
        event_emit(db, "subscriber.created", {"subscriber_id": subscriber.id, "email": subscriber.email})
        log_activity(db, "subscriber.created", "subscriber", subscriber.id, {"email": subscriber.email})
        db.add(SubscriberActivity(subscriber_id=subscriber.id, event_type="subscriber.created", payload={"email": subscriber.email}))
        db.commit()
        trigger_automations_for_new_subscriber(db, subscriber)
        return {"ok": True, "subscriber_id": subscriber.id, "created": True}

    if body.action == "trigger_automation":
        p = InboundPayloadTriggerAutomation(**body.payload)
        automation = db.query(Automation).filter(Automation.id == p.automation_id).first()
        if not automation:
            raise HTTPException(status_code=404, detail="Automation not found")
        subscriber = None
        if p.subscriber_id:
            subscriber = db.query(Subscriber).filter(Subscriber.id == p.subscriber_id).first()
        if not subscriber and p.email:
            subscriber = db.query(Subscriber).filter(Subscriber.email == p.email).first()
        if not subscriber:
            raise HTTPException(status_code=404, detail="Subscriber not found (provide subscriber_id or email)")
        run = run_automation_for_subscriber(db, automation, subscriber)
        if not run:
            raise HTTPException(status_code=400, detail="Automation has no steps")
        return {"ok": True, "run_id": run.id, "status": run.status}

    raise HTTPException(status_code=400, detail=f"Unknown action: {body.action}")
