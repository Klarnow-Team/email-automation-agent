from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.segment import Segment
from app.schemas.segment import SegmentCreate, SegmentResponse, SegmentUpdate
from app.services.segment_service import evaluate_segment

router = APIRouter()


@router.get("", response_model=List[SegmentResponse])
def list_segments(db: Session = Depends(get_db)):
    return db.query(Segment).all()


@router.post("", response_model=SegmentResponse, status_code=201)
def create_segment(body: SegmentCreate, db: Session = Depends(get_db)):
    seg = Segment(name=body.name, rules=body.rules)
    db.add(seg)
    db.commit()
    db.refresh(seg)
    return seg


@router.get("/{segment_id}", response_model=SegmentResponse)
def get_segment(segment_id: int, db: Session = Depends(get_db)):
    seg = db.query(Segment).filter(Segment.id == segment_id).first()
    if not seg:
        raise HTTPException(status_code=404, detail="Segment not found")
    return seg


@router.patch("/{segment_id}", response_model=SegmentResponse)
def update_segment(segment_id: int, body: SegmentUpdate, db: Session = Depends(get_db)):
    seg = db.query(Segment).filter(Segment.id == segment_id).first()
    if not seg:
        raise HTTPException(status_code=404, detail="Segment not found")
    if body.name is not None:
        seg.name = body.name
    if body.rules is not None:
        seg.rules = body.rules
    db.commit()
    db.refresh(seg)
    return seg


@router.delete("/{segment_id}", status_code=204)
def delete_segment(segment_id: int, db: Session = Depends(get_db)):
    seg = db.query(Segment).filter(Segment.id == segment_id).first()
    if not seg:
        raise HTTPException(status_code=404, detail="Segment not found")
    db.delete(seg)
    db.commit()
    return None


@router.get("/{segment_id}/subscriber-ids")
def get_segment_subscriber_ids(segment_id: int, db: Session = Depends(get_db)):
    """Return subscriber ids matching this segment's rules (real-time evaluation)."""
    seg = db.query(Segment).filter(Segment.id == segment_id).first()
    if not seg:
        raise HTTPException(status_code=404, detail="Segment not found")
    ids = evaluate_segment(db, seg.rules)
    return {"subscriber_ids": ids, "count": len(ids)}
