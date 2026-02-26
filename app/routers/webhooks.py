from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.event_bus import WebhookSubscription
from app.schemas.webhook import WebhookSubscriptionCreate, WebhookSubscriptionResponse, WebhookSubscriptionUpdate

router = APIRouter()


@router.get("", response_model=List[WebhookSubscriptionResponse])
def list_webhooks(db: Session = Depends(get_db)):
    return db.query(WebhookSubscription).all()


@router.post("", response_model=WebhookSubscriptionResponse, status_code=201)
def create_webhook(body: WebhookSubscriptionCreate, db: Session = Depends(get_db)):
    sub = WebhookSubscription(
        url=body.url,
        event_types=body.event_types,
        enabled=True,
        secret=getattr(body, "secret", None),
    )
    db.add(sub)
    db.commit()
    db.refresh(sub)
    return sub


@router.get("/{webhook_id}", response_model=WebhookSubscriptionResponse)
def get_webhook(webhook_id: int, db: Session = Depends(get_db)):
    sub = db.query(WebhookSubscription).filter(WebhookSubscription.id == webhook_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Webhook not found")
    return sub


@router.patch("/{webhook_id}", response_model=WebhookSubscriptionResponse)
def update_webhook(webhook_id: int, body: WebhookSubscriptionUpdate, db: Session = Depends(get_db)):
    sub = db.query(WebhookSubscription).filter(WebhookSubscription.id == webhook_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Webhook not found")
    if body.url is not None:
        sub.url = body.url
    if body.event_types is not None:
        sub.event_types = body.event_types
    if body.enabled is not None:
        sub.enabled = body.enabled
    if body.secret is not None:
        sub.secret = body.secret
    db.commit()
    db.refresh(sub)
    return sub


@router.delete("/{webhook_id}", status_code=204)
def delete_webhook(webhook_id: int, db: Session = Depends(get_db)):
    sub = db.query(WebhookSubscription).filter(WebhookSubscription.id == webhook_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Webhook not found")
    db.delete(sub)
    db.commit()
    return None
