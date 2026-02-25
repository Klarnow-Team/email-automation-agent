from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.automation import Automation, AutomationStep
from app.models.subscriber import Subscriber
from app.schemas.automation import (
    AutomationCreate,
    AutomationUpdate,
    AutomationResponse,
    AutomationStepResponse,
    AutomationTriggerRequest,
)
from app.services.automation_service import run_automation_for_subscriber

router = APIRouter()


def _automation_to_response(automation: Automation) -> AutomationResponse:
    steps = [
        AutomationStepResponse(
            id=s.id,
            automation_id=s.automation_id,
            order=s.order,
            step_type=s.step_type,
            payload=s.payload,
        )
        for s in sorted(automation.steps, key=lambda x: x.order)
    ]
    return AutomationResponse(
        id=automation.id,
        name=automation.name,
        trigger_type=automation.trigger_type,
        is_active=bool(automation.is_active),
        created_at=automation.created_at,
        steps=steps,
    )


@router.get("", response_model=List[AutomationResponse])
def list_automations(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    automations = db.query(Automation).offset(skip).limit(limit).all()
    return [_automation_to_response(a) for a in automations]


@router.post("", response_model=AutomationResponse, status_code=201)
def create_automation(body: AutomationCreate, db: Session = Depends(get_db)):
    automation = Automation(
        name=body.name,
        trigger_type=body.trigger_type,
        is_active=1 if body.is_active else 0,
    )
    db.add(automation)
    db.commit()
    db.refresh(automation)
    for s in body.steps:
        step = AutomationStep(
            automation_id=automation.id,
            order=s.order,
            step_type=s.step_type,
            payload=s.payload,
        )
        db.add(step)
    db.commit()
    db.refresh(automation)
    return _automation_to_response(automation)


@router.get("/{automation_id}", response_model=AutomationResponse)
def get_automation(automation_id: int, db: Session = Depends(get_db)):
    automation = db.query(Automation).filter(Automation.id == automation_id).first()
    if not automation:
        raise HTTPException(status_code=404, detail="Automation not found")
    return _automation_to_response(automation)


@router.post("/{automation_id}/resume", response_model=AutomationResponse)
def resume_automation(automation_id: int, db: Session = Depends(get_db)):
    """Set automation to active (resume)."""
    automation = db.query(Automation).filter(Automation.id == automation_id).first()
    if not automation:
        raise HTTPException(status_code=404, detail="Automation not found")
    automation.is_active = 1
    db.commit()
    db.refresh(automation)
    return _automation_to_response(automation)


@router.patch("/{automation_id}", response_model=AutomationResponse)
def update_automation(automation_id: int, body: AutomationUpdate, db: Session = Depends(get_db)):
    automation = db.query(Automation).filter(Automation.id == automation_id).first()
    if not automation:
        raise HTTPException(status_code=404, detail="Automation not found")
    if body.name is not None:
        automation.name = body.name
    if body.is_active is not None:
        automation.is_active = 1 if body.is_active else 0
    if body.steps is not None:
        for old in automation.steps:
            db.delete(old)
        for s in body.steps:
            step = AutomationStep(
                automation_id=automation.id,
                order=s.order,
                step_type=s.step_type,
                payload=s.payload,
            )
            db.add(step)
    db.commit()
    db.refresh(automation)
    return _automation_to_response(automation)


@router.delete("/{automation_id}", status_code=204)
def delete_automation(automation_id: int, db: Session = Depends(get_db)):
    automation = db.query(Automation).filter(Automation.id == automation_id).first()
    if not automation:
        raise HTTPException(status_code=404, detail="Automation not found")
    db.delete(automation)
    db.commit()
    return None


@router.post("/{automation_id}/trigger")
def trigger_automation(
    automation_id: int,
    body: AutomationTriggerRequest,
    db: Session = Depends(get_db),
):
    automation = db.query(Automation).filter(Automation.id == automation_id).first()
    if not automation:
        raise HTTPException(status_code=404, detail="Automation not found")
    subscriber = db.query(Subscriber).filter(Subscriber.id == body.subscriber_id).first()
    if not subscriber:
        raise HTTPException(status_code=404, detail="Subscriber not found")
    run = run_automation_for_subscriber(db, automation, subscriber)
    if not run:
        raise HTTPException(status_code=400, detail="Automation has no steps")
    return {"run_id": run.id, "status": run.status}
