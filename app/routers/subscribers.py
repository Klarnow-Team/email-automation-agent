from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.subscriber import Subscriber, SubscriberStatus
from app.schemas.subscriber import SubscriberCreate, SubscriberUpdate, SubscriberResponse, SubscriberImportItem
from app.services.automation_service import trigger_automations_for_new_subscriber

router = APIRouter()


@router.get("", response_model=List[SubscriberResponse])
def list_subscribers(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    subscribers = db.query(Subscriber).offset(skip).limit(limit).all()
    return subscribers


@router.post("", response_model=SubscriberResponse, status_code=201)
def create_subscriber(body: SubscriberCreate, db: Session = Depends(get_db)):
    existing = db.query(Subscriber).filter(Subscriber.email == body.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Subscriber with this email already exists")
    subscriber = Subscriber(
        email=body.email,
        name=body.name,
        status=SubscriberStatus.active,
    )
    db.add(subscriber)
    db.commit()
    db.refresh(subscriber)
    trigger_automations_for_new_subscriber(db, subscriber)
    return subscriber


@router.get("/{subscriber_id}", response_model=SubscriberResponse)
def get_subscriber(subscriber_id: int, db: Session = Depends(get_db)):
    subscriber = db.query(Subscriber).filter(Subscriber.id == subscriber_id).first()
    if not subscriber:
        raise HTTPException(status_code=404, detail="Subscriber not found")
    return subscriber


@router.patch("/{subscriber_id}", response_model=SubscriberResponse)
def update_subscriber(subscriber_id: int, body: SubscriberUpdate, db: Session = Depends(get_db)):
    subscriber = db.query(Subscriber).filter(Subscriber.id == subscriber_id).first()
    if not subscriber:
        raise HTTPException(status_code=404, detail="Subscriber not found")
    if body.name is not None:
        subscriber.name = body.name
    if body.status is not None:
        subscriber.status = SubscriberStatus(body.status)
    db.commit()
    db.refresh(subscriber)
    return subscriber


@router.delete("/{subscriber_id}", status_code=204)
def delete_subscriber(subscriber_id: int, db: Session = Depends(get_db)):
    subscriber = db.query(Subscriber).filter(Subscriber.id == subscriber_id).first()
    if not subscriber:
        raise HTTPException(status_code=404, detail="Subscriber not found")
    db.delete(subscriber)
    db.commit()
    return None


@router.post("/import", response_model=List[SubscriberResponse])
def import_subscribers(body: List[SubscriberImportItem], db: Session = Depends(get_db)):
    created = []
    for item in body:
        existing = db.query(Subscriber).filter(Subscriber.email == item.email).first()
        if existing:
            continue
        subscriber = Subscriber(
            email=item.email,
            name=item.name,
            status=SubscriberStatus.active,
        )
        db.add(subscriber)
        db.commit()
        db.refresh(subscriber)
        created.append(subscriber)
        trigger_automations_for_new_subscriber(db, subscriber)
    return created
