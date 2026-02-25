from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.tag import Tag, SubscriberTag
from app.schemas.tag import TagCreate, TagUpdate, TagResponse, TagSubscribersUpdate

router = APIRouter()


@router.get("", response_model=List[TagResponse])
def list_tags(db: Session = Depends(get_db)):
    tags = db.query(Tag).all()
    if not tags:
        return []
    ids = [t.id for t in tags]
    counts = dict(
        db.query(SubscriberTag.tag_id, func.count(SubscriberTag.id))
        .filter(SubscriberTag.tag_id.in_(ids))
        .group_by(SubscriberTag.tag_id)
        .all()
    )
    return [
        TagResponse(
            id=t.id,
            name=t.name,
            created_at=t.created_at,
            subscriber_count=counts.get(t.id, 0),
        )
        for t in tags
    ]


@router.post("", response_model=TagResponse, status_code=201)
def create_tag(body: TagCreate, db: Session = Depends(get_db)):
    tag = Tag(name=body.name)
    db.add(tag)
    db.commit()
    db.refresh(tag)
    return TagResponse(id=tag.id, name=tag.name, created_at=tag.created_at, subscriber_count=0)


@router.get("/{tag_id}", response_model=TagResponse)
def get_tag(tag_id: int, db: Session = Depends(get_db)):
    tag = db.query(Tag).filter(Tag.id == tag_id).first()
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    count = db.query(func.count(SubscriberTag.id)).filter(SubscriberTag.tag_id == tag_id).scalar() or 0
    return TagResponse(id=tag.id, name=tag.name, created_at=tag.created_at, subscriber_count=count)


@router.patch("/{tag_id}", response_model=TagResponse)
def update_tag(tag_id: int, body: TagUpdate, db: Session = Depends(get_db)):
    tag = db.query(Tag).filter(Tag.id == tag_id).first()
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    if body.name is not None:
        tag.name = body.name
    db.commit()
    db.refresh(tag)
    count = db.query(func.count(SubscriberTag.id)).filter(SubscriberTag.tag_id == tag_id).scalar() or 0
    return TagResponse(id=tag.id, name=tag.name, created_at=tag.created_at, subscriber_count=count)


@router.delete("/{tag_id}", status_code=204)
def delete_tag(tag_id: int, db: Session = Depends(get_db)):
    tag = db.query(Tag).filter(Tag.id == tag_id).first()
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    db.delete(tag)
    db.commit()
    return None


@router.get("/{tag_id}/subscriber-ids")
def get_tag_subscriber_ids(tag_id: int, db: Session = Depends(get_db)):
    tag = db.query(Tag).filter(Tag.id == tag_id).first()
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    ids = [st.subscriber_id for st in db.query(SubscriberTag.subscriber_id).filter(SubscriberTag.tag_id == tag_id).all()]
    return {"subscriber_ids": ids}


@router.put("/{tag_id}/subscribers")
def set_tag_subscribers(tag_id: int, body: TagSubscribersUpdate, db: Session = Depends(get_db)):
    tag = db.query(Tag).filter(Tag.id == tag_id).first()
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    db.query(SubscriberTag).filter(SubscriberTag.tag_id == tag_id).delete()
    for sid in body.subscriber_ids:
        db.add(SubscriberTag(subscriber_id=sid, tag_id=tag_id))
    db.commit()
    return {"subscriber_ids": body.subscriber_ids}


@router.post("/{tag_id}/subscribers/{subscriber_id}")
def add_subscriber_to_tag(tag_id: int, subscriber_id: int, db: Session = Depends(get_db)):
    tag = db.query(Tag).filter(Tag.id == tag_id).first()
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    existing = db.query(SubscriberTag).filter(
        SubscriberTag.tag_id == tag_id,
        SubscriberTag.subscriber_id == subscriber_id,
    ).first()
    if existing:
        return {"message": "Subscriber already has tag"}
    db.add(SubscriberTag(subscriber_id=subscriber_id, tag_id=tag_id))
    db.commit()
    return {"message": "Tag added to subscriber"}


@router.delete("/{tag_id}/subscribers/{subscriber_id}", status_code=204)
def remove_subscriber_from_tag(tag_id: int, subscriber_id: int, db: Session = Depends(get_db)):
    db.query(SubscriberTag).filter(
        SubscriberTag.tag_id == tag_id,
        SubscriberTag.subscriber_id == subscriber_id,
    ).delete()
    db.commit()
    return None
