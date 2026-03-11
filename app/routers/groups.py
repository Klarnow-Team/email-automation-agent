from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.group import Group, SubscriberGroup
from app.schemas.group import GroupCreate, GroupUpdate, GroupResponse, GroupSubscribersUpdate
from app.services.automation_service import trigger_automations_for_group_joined, trigger_automations_for_group_left
from app.services.rate_stats import get_rates_for_subscriber_ids

router = APIRouter()


@router.get("", response_model=List[GroupResponse])
def list_groups(db: Session = Depends(get_db)):
    groups = db.query(Group).all()
    if not groups:
        return []
    group_ids = [g.id for g in groups]
    counts = dict(
        db.query(SubscriberGroup.group_id, func.count(SubscriberGroup.id))
        .filter(SubscriberGroup.group_id.in_(group_ids))
        .group_by(SubscriberGroup.group_id)
        .all()
    )
    result = []
    for g in groups:
        member_ids = [
            row[0]
            for row in db.query(SubscriberGroup.subscriber_id)
            .filter(SubscriberGroup.group_id == g.id)
            .all()
        ]
        open_rate, click_rate = get_rates_for_subscriber_ids(db, member_ids)
        result.append(
            GroupResponse(
                id=g.id,
                name=g.name,
                created_at=g.created_at,
                subscriber_count=counts.get(g.id, 0),
                open_rate=open_rate,
                click_rate=click_rate,
            )
        )
    return result


@router.post("", response_model=GroupResponse, status_code=201)
def create_group(body: GroupCreate, db: Session = Depends(get_db)):
    group = Group(name=body.name)
    db.add(group)
    db.commit()
    db.refresh(group)
    return GroupResponse(id=group.id, name=group.name, created_at=group.created_at, subscriber_count=0)


@router.get("/{group_id}", response_model=GroupResponse)
def get_group(group_id: int, db: Session = Depends(get_db)):
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    count = db.query(func.count(SubscriberGroup.id)).filter(SubscriberGroup.group_id == group_id).scalar() or 0
    member_ids = [
        row[0]
        for row in db.query(SubscriberGroup.subscriber_id).filter(SubscriberGroup.group_id == group_id).all()
    ]
    open_rate, click_rate = get_rates_for_subscriber_ids(db, member_ids)
    return GroupResponse(
        id=group.id,
        name=group.name,
        created_at=group.created_at,
        subscriber_count=count,
        open_rate=open_rate,
        click_rate=click_rate,
    )


@router.patch("/{group_id}", response_model=GroupResponse)
def update_group(group_id: int, body: GroupUpdate, db: Session = Depends(get_db)):
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    if body.name is not None:
        group.name = body.name
    db.commit()
    db.refresh(group)
    count = db.query(func.count(SubscriberGroup.id)).filter(SubscriberGroup.group_id == group_id).scalar() or 0
    member_ids = [
        row[0]
        for row in db.query(SubscriberGroup.subscriber_id).filter(SubscriberGroup.group_id == group_id).all()
    ]
    open_rate, click_rate = get_rates_for_subscriber_ids(db, member_ids)
    return GroupResponse(
        id=group.id,
        name=group.name,
        created_at=group.created_at,
        subscriber_count=count,
        open_rate=open_rate,
        click_rate=click_rate,
    )


@router.delete("/{group_id}", status_code=204)
def delete_group(group_id: int, db: Session = Depends(get_db)):
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    db.delete(group)
    db.commit()
    return None


@router.get("/{group_id}/subscriber-ids")
def get_group_subscriber_ids(group_id: int, db: Session = Depends(get_db)):
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    ids = [sg.subscriber_id for sg in db.query(SubscriberGroup.subscriber_id).filter(SubscriberGroup.group_id == group_id).all()]
    return {"subscriber_ids": ids}


@router.put("/{group_id}/subscribers")
def set_group_subscribers(group_id: int, body: GroupSubscribersUpdate, db: Session = Depends(get_db)):
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    db.query(SubscriberGroup).filter(SubscriberGroup.group_id == group_id).delete()
    for sid in body.subscriber_ids:
        db.add(SubscriberGroup(subscriber_id=sid, group_id=group_id))
    db.commit()
    for sid in body.subscriber_ids:
        trigger_automations_for_group_joined(db, sid, group_id)
    return {"subscriber_ids": body.subscriber_ids}


@router.post("/{group_id}/subscribers", status_code=200)
def add_subscribers_to_group(group_id: int, body: GroupSubscribersUpdate, db: Session = Depends(get_db)):
    """Add subscribers to the group in bulk. Existing members are skipped. New members trigger group_joined automations."""
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    existing_ids = {
        row[0]
        for row in db.query(SubscriberGroup.subscriber_id).filter(SubscriberGroup.group_id == group_id).all()
    }
    to_add = [sid for sid in body.subscriber_ids if sid not in existing_ids]
    for sid in to_add:
        db.add(SubscriberGroup(subscriber_id=sid, group_id=group_id))
    db.commit()
    for sid in to_add:
        trigger_automations_for_group_joined(db, sid, group_id)
    all_ids = list(existing_ids) + to_add
    return {
        "subscriber_ids": all_ids,
        "added_count": len(to_add),
        "already_in_group_count": len(body.subscriber_ids) - len(to_add),
    }


@router.post("/{group_id}/subscribers/{subscriber_id}")
def add_subscriber_to_group(group_id: int, subscriber_id: int, db: Session = Depends(get_db)):
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    existing = db.query(SubscriberGroup).filter(
        SubscriberGroup.group_id == group_id,
        SubscriberGroup.subscriber_id == subscriber_id,
    ).first()
    if existing:
        return {"message": "Subscriber already in group"}
    db.add(SubscriberGroup(subscriber_id=subscriber_id, group_id=group_id))
    db.commit()
    trigger_automations_for_group_joined(db, subscriber_id, group_id)
    return {"message": "Subscriber added to group"}


@router.delete("/{group_id}/subscribers/{subscriber_id}", status_code=204)
def remove_subscriber_from_group(group_id: int, subscriber_id: int, db: Session = Depends(get_db)):
    db.query(SubscriberGroup).filter(
        SubscriberGroup.group_id == group_id,
        SubscriberGroup.subscriber_id == subscriber_id,
    ).delete()
    db.commit()
    trigger_automations_for_group_left(db, subscriber_id, group_id)
    return None
