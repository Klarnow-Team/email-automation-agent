from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.suppression import SuppressionEntry, SuppressionType
from app.schemas.suppression import SuppressionCreate, SuppressionResponse

router = APIRouter()


def _normalize_value(typ: str, value: str) -> str:
    value = (value or "").strip().lower()
    if typ == "domain":
        if value.startswith("@"):
            value = value[1:]
        return value
    return value


@router.get("", response_model=List[SuppressionResponse])
def list_suppressions(db: Session = Depends(get_db)):
    return db.query(SuppressionEntry).order_by(SuppressionEntry.created_at.desc()).all()


@router.post("", response_model=SuppressionResponse, status_code=201)
def add_suppression(body: SuppressionCreate, db: Session = Depends(get_db)):
    if body.type not in ("email", "domain"):
        raise HTTPException(status_code=400, detail="type must be 'email' or 'domain'")
    value = _normalize_value(body.type, body.value)
    if not value:
        raise HTTPException(status_code=400, detail="value is required")
    existing = (
        db.query(SuppressionEntry)
        .filter(SuppressionEntry.type == SuppressionType(body.type), SuppressionEntry.value == value)
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="Already suppressed")
    entry = SuppressionEntry(type=SuppressionType(body.type), value=value)
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


@router.delete("/{entry_id}", status_code=204)
def remove_suppression(entry_id: int, db: Session = Depends(get_db)):
    entry = db.query(SuppressionEntry).filter(SuppressionEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Suppression entry not found")
    db.delete(entry)
    db.commit()
    return None
