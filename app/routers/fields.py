"""Custom field definitions for subscribers (MailerLite-style Fields tab)."""
import re
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.subscriber import Subscriber
from app.models.subscriber_field import SubscriberFieldDefinition
from app.schemas.subscriber_field import (
    SubscriberFieldCreate,
    SubscriberFieldResponse,
    SubscriberFieldUpdate,
)

router = APIRouter()


def _slugify(s: str) -> str:
    s = s.strip().lower()
    s = re.sub(r"[^a-z0-9]+", "_", s)
    s = s.strip("_") or "field"
    return s[:64]


def _unique_key(db: Session, base_key: str) -> str:
    key = base_key
    n = 0
    while db.query(SubscriberFieldDefinition).filter(SubscriberFieldDefinition.key == key).first():
        n += 1
        key = f"{base_key}_{n}"[:64]
    return key


@router.get("", response_model=List[SubscriberFieldResponse])
def list_fields(db: Session = Depends(get_db)):
    fields = db.query(SubscriberFieldDefinition).order_by(SubscriberFieldDefinition.title).all()
    if not fields:
        return []
    keys = [f.key for f in fields]
    # Count subscribers that have a non-null, non-empty value for each key (JSONB)
    counts = {}
    for key in keys:
        # PostgreSQL: custom_fields->key is not null and not ''
        count = (
            db.query(func.count(Subscriber.id))
            .filter(
                Subscriber.custom_fields[key].astext.isnot(None),
                Subscriber.custom_fields[key].astext != "",
            )
            .scalar()
            or 0
        )
        counts[key] = count
    return [
        SubscriberFieldResponse(
            id=f.id,
            key=f.key,
            title=f.title,
            field_type=f.field_type,
            created_at=f.created_at,
            subscriber_count=counts.get(f.key, 0),
        )
        for f in fields
    ]


@router.post("", response_model=SubscriberFieldResponse, status_code=201)
def create_field(body: SubscriberFieldCreate, db: Session = Depends(get_db)):
    base_key = _slugify(body.title)
    key = _unique_key(db, base_key)
    row = SubscriberFieldDefinition(
        key=key,
        title=body.title.strip(),
        field_type=body.field_type,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return SubscriberFieldResponse(
        id=row.id,
        key=row.key,
        title=row.title,
        field_type=row.field_type,
        created_at=row.created_at,
        subscriber_count=0,
    )


@router.get("/{field_id}", response_model=SubscriberFieldResponse)
def get_field(field_id: int, db: Session = Depends(get_db)):
    row = db.query(SubscriberFieldDefinition).filter(SubscriberFieldDefinition.id == field_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Field not found")
    count = (
        db.query(func.count(Subscriber.id))
        .filter(
            Subscriber.custom_fields[row.key].astext.isnot(None),
            Subscriber.custom_fields[row.key].astext != "",
        )
        .scalar()
        or 0
    )
    return SubscriberFieldResponse(
        id=row.id,
        key=row.key,
        title=row.title,
        field_type=row.field_type,
        created_at=row.created_at,
        subscriber_count=count,
    )


@router.patch("/{field_id}", response_model=SubscriberFieldResponse)
def update_field(field_id: int, body: SubscriberFieldUpdate, db: Session = Depends(get_db)):
    row = db.query(SubscriberFieldDefinition).filter(SubscriberFieldDefinition.id == field_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Field not found")
    if body.title is not None:
        row.title = body.title.strip()
    if body.field_type is not None:
        row.field_type = body.field_type
    db.commit()
    db.refresh(row)
    count = (
        db.query(func.count(Subscriber.id))
        .filter(
            Subscriber.custom_fields[row.key].astext.isnot(None),
            Subscriber.custom_fields[row.key].astext != "",
        )
        .scalar()
        or 0
    )
    return SubscriberFieldResponse(
        id=row.id,
        key=row.key,
        title=row.title,
        field_type=row.field_type,
        created_at=row.created_at,
        subscriber_count=count,
    )


@router.delete("/{field_id}", status_code=204)
def delete_field(field_id: int, db: Session = Depends(get_db)):
    row = db.query(SubscriberFieldDefinition).filter(SubscriberFieldDefinition.id == field_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Field not found")
    db.delete(row)
    db.commit()
    return None
