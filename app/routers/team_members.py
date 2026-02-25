from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.booking import TeamMember, VacationBlock
from app.schemas.booking import TeamMemberCreate, TeamMemberResponse, VacationBlockCreate, VacationBlockResponse

router = APIRouter()


@router.get("", response_model=List[TeamMemberResponse])
def list_team_members(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(TeamMember).order_by(TeamMember.id).offset(skip).limit(limit).all()


@router.post("", response_model=TeamMemberResponse, status_code=201)
def create_team_member(body: TeamMemberCreate, db: Session = Depends(get_db)):
    member = TeamMember(name=body.name)
    db.add(member)
    db.commit()
    db.refresh(member)
    return member


@router.get("/{member_id}", response_model=TeamMemberResponse)
def get_team_member(member_id: int, db: Session = Depends(get_db)):
    m = db.query(TeamMember).filter(TeamMember.id == member_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Team member not found")
    return m


@router.delete("/{member_id}", status_code=204)
def delete_team_member(member_id: int, db: Session = Depends(get_db)):
    m = db.query(TeamMember).filter(TeamMember.id == member_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Team member not found")
    db.delete(m)
    db.commit()
    return None


# --- Vacation blocks (per team member) ---

@router.get("/{member_id}/vacation-blocks", response_model=List[VacationBlockResponse])
def list_team_member_vacation_blocks(member_id: int, db: Session = Depends(get_db)):
    m = db.query(TeamMember).filter(TeamMember.id == member_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Team member not found")
    return db.query(VacationBlock).filter(VacationBlock.team_member_id == member_id).order_by(VacationBlock.start_date).all()


@router.post("/{member_id}/vacation-blocks", response_model=VacationBlockResponse, status_code=201)
def create_team_member_vacation_block(member_id: int, body: VacationBlockCreate, db: Session = Depends(get_db)):
    m = db.query(TeamMember).filter(TeamMember.id == member_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Team member not found")
    if body.end_date < body.start_date:
        raise HTTPException(status_code=400, detail="end_date must be >= start_date")
    vb = VacationBlock(team_member_id=member_id, start_date=body.start_date, end_date=body.end_date, reason=body.reason)
    db.add(vb)
    db.commit()
    db.refresh(vb)
    return vb


@router.delete("/{member_id}/vacation-blocks/{block_id}", status_code=204)
def delete_team_member_vacation_block(member_id: int, block_id: int, db: Session = Depends(get_db)):
    vb = db.query(VacationBlock).filter(
        VacationBlock.id == block_id,
        VacationBlock.team_member_id == member_id,
    ).first()
    if not vb:
        raise HTTPException(status_code=404, detail="Vacation block not found")
    db.delete(vb)
    db.commit()
    return None
