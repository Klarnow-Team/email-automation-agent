from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.subscriber import Subscriber, SubscriberStatus
from app.models.group import SubscriberGroup
from app.models.tag import SubscriberTag
from app.models.tracking import SubscriberActivity
from app.schemas.subscriber import SubscriberCreate, SubscriberUpdate, SubscriberResponse, SubscriberImportItem, SubscriberBulkUpdate
from app.services.automation_service import trigger_automations_for_new_subscriber, trigger_automations_for_field_updated
from app.services.event_bus import emit as event_emit
from app.services.activity_service import log_activity

router = APIRouter()


def _subscriber_to_response(s, group_ids=None, tag_ids=None):
    if group_ids is None:
        group_ids = []
    if tag_ids is None:
        tag_ids = []
    data = {
        "id": s.id,
        "email": s.email,
        "name": s.name,
        "status": s.status.value if hasattr(s.status, "value") else s.status,
        "custom_fields": s.custom_fields if getattr(s, "custom_fields", None) is not None else {},
        "created_at": s.created_at,
        "group_ids": group_ids,
        "tag_ids": tag_ids,
    }
    return SubscriberResponse(**data)


def _get_group_tag_maps(db: Session, subscriber_ids: List[int]):
    if not subscriber_ids:
        return {}, {}
    group_map = {}
    for sg in db.query(SubscriberGroup).filter(SubscriberGroup.subscriber_id.in_(subscriber_ids)).all():
        group_map.setdefault(sg.subscriber_id, []).append(sg.group_id)
    tag_map = {}
    for st in db.query(SubscriberTag).filter(SubscriberTag.subscriber_id.in_(subscriber_ids)).all():
        tag_map.setdefault(st.subscriber_id, []).append(st.tag_id)
    return group_map, tag_map


@router.get("", response_model=List[SubscriberResponse])
def list_subscribers(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    subscribers = db.query(Subscriber).offset(skip).limit(limit).all()
    if not subscribers:
        return []
    ids = [s.id for s in subscribers]
    group_map, tag_map = _get_group_tag_maps(db, ids)
    return [
        _subscriber_to_response(s, group_map.get(s.id, []), tag_map.get(s.id, []))
        for s in subscribers
    ]


@router.post("", response_model=SubscriberResponse, status_code=201)
def create_subscriber(body: SubscriberCreate, db: Session = Depends(get_db)):
    existing = db.query(Subscriber).filter(Subscriber.email == body.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Subscriber with this email already exists")
    subscriber = Subscriber(
        email=body.email,
        name=body.name,
        status=SubscriberStatus.active,
        custom_fields=body.custom_fields or {},
    )
    db.add(subscriber)
    db.commit()
    db.refresh(subscriber)
    event_emit(db, "subscriber.created", {"subscriber_id": subscriber.id, "email": subscriber.email})
    log_activity(db, "subscriber.created", "subscriber", subscriber.id, {"email": subscriber.email})
    db.add(SubscriberActivity(subscriber_id=subscriber.id, event_type="subscriber.created", payload={"email": subscriber.email}))
    db.commit()
    trigger_automations_for_new_subscriber(db, subscriber)
    return _subscriber_to_response(subscriber, [], [])


@router.get("/{subscriber_id}", response_model=SubscriberResponse)
def get_subscriber(subscriber_id: int, db: Session = Depends(get_db)):
    subscriber = db.query(Subscriber).filter(Subscriber.id == subscriber_id).first()
    if not subscriber:
        raise HTTPException(status_code=404, detail="Subscriber not found")
    group_map, tag_map = _get_group_tag_maps(db, [subscriber_id])
    return _subscriber_to_response(subscriber, group_map.get(subscriber_id, []), tag_map.get(subscriber_id, []))


@router.patch("/{subscriber_id}", response_model=SubscriberResponse)
def update_subscriber(subscriber_id: int, body: SubscriberUpdate, db: Session = Depends(get_db)):
    subscriber = db.query(Subscriber).filter(Subscriber.id == subscriber_id).first()
    if not subscriber:
        raise HTTPException(status_code=404, detail="Subscriber not found")
    if body.name is not None:
        subscriber.name = body.name
    if body.status is not None:
        subscriber.status = SubscriberStatus(body.status)
    if body.custom_fields is not None:
        subscriber.custom_fields = body.custom_fields
    db.commit()
    db.refresh(subscriber)
    if body.custom_fields is not None:
        trigger_automations_for_field_updated(db, subscriber)
    group_map, tag_map = _get_group_tag_maps(db, [subscriber_id])
    return _subscriber_to_response(subscriber, group_map.get(subscriber_id, []), tag_map.get(subscriber_id, []))


@router.delete("/{subscriber_id}", status_code=204)
def delete_subscriber(subscriber_id: int, db: Session = Depends(get_db)):
    subscriber = db.query(Subscriber).filter(Subscriber.id == subscriber_id).first()
    if not subscriber:
        raise HTTPException(status_code=404, detail="Subscriber not found")
    db.delete(subscriber)
    db.commit()
    return None


@router.get("/{subscriber_id}/activity")
def get_subscriber_activity(subscriber_id: int, skip: int = 0, limit: int = 50, db: Session = Depends(get_db)):
    subscriber = db.query(Subscriber).filter(Subscriber.id == subscriber_id).first()
    if not subscriber:
        raise HTTPException(status_code=404, detail="Subscriber not found")
    rows = (
        db.query(SubscriberActivity)
        .filter(SubscriberActivity.subscriber_id == subscriber_id)
        .order_by(SubscriberActivity.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return [
        {"id": r.id, "event_type": r.event_type, "payload": r.payload, "created_at": r.created_at.isoformat() if r.created_at else None}
        for r in rows
    ]


@router.post("/bulk-update")
def bulk_update_subscribers(body: SubscriberBulkUpdate, db: Session = Depends(get_db)):
    updated = db.query(Subscriber).filter(Subscriber.id.in_(body.subscriber_ids)).all()
    for s in updated:
        if body.name is not None:
            s.name = body.name
        if body.status is not None:
            s.status = SubscriberStatus(body.status)
        if body.custom_fields is not None:
            s.custom_fields = body.custom_fields
    db.commit()
    return {"updated": len(updated)}


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
            custom_fields=item.custom_fields or {},
        )
        db.add(subscriber)
        db.commit()
        db.refresh(subscriber)
        created.append(subscriber)
        event_emit(db, "subscriber.created", {"subscriber_id": subscriber.id, "email": subscriber.email})
        log_activity(db, "subscriber.created", "subscriber", subscriber.id, {"email": subscriber.email})
        db.add(SubscriberActivity(subscriber_id=subscriber.id, event_type="subscriber.created", payload={"email": subscriber.email}))
        db.commit()
        trigger_automations_for_new_subscriber(db, subscriber)
    return [_subscriber_to_response(s, [], []) for s in created]
