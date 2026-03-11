from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models.automation import Automation, AutomationRun, AutomationStep, PendingAutomationDelay, AutomationVersion
from app.models.subscriber import Subscriber
from app.schemas.automation import (
    AutomationCreate,
    AutomationUpdate,
    AutomationResponse,
    AutomationStepResponse,
    AutomationTriggerRequest,
    AutomationRollbackRequest,
)
from app.services.automation_service import run_automation_for_subscriber

router = APIRouter()


def _snapshot_automation_version(db: Session, automation: Automation) -> None:
    """Create a version snapshot before applying changes."""
    next_num = (
        db.query(func.max(AutomationVersion.version_number))
        .filter(AutomationVersion.automation_id == automation.id)
        .scalar() or 0
    ) + 1
    steps_snapshot = [
        {"order": s.order, "step_type": s.step_type, "payload": s.payload}
        for s in sorted(automation.steps, key=lambda x: x.order)
    ]
    v = AutomationVersion(
        automation_id=automation.id,
        version_number=next_num,
        name=automation.name,
        trigger_type=automation.trigger_type,
        steps=steps_snapshot,
    )
    db.add(v)


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
        trigger_config=getattr(automation, "trigger_config", None) or {},
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
        trigger_config=body.trigger_config if body.trigger_config is not None else {},
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
    # Create version snapshot before changing name, trigger_type, or steps
    if body.name is not None or body.trigger_type is not None or body.steps is not None:
        _snapshot_automation_version(db, automation)
        db.flush()
    if body.name is not None:
        automation.name = body.name
    if body.trigger_type is not None:
        automation.trigger_type = body.trigger_type
    if body.trigger_config is not None:
        automation.trigger_config = body.trigger_config
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
    # Delete children explicitly to avoid FK constraint issues (works with any DB)
    run_ids = [r.id for r in db.query(AutomationRun).filter(AutomationRun.automation_id == automation_id).all()]
    if run_ids:
        db.query(PendingAutomationDelay).filter(PendingAutomationDelay.run_id.in_(run_ids)).delete(
            synchronize_session=False
        )
    db.query(AutomationRun).filter(AutomationRun.automation_id == automation_id).delete(synchronize_session=False)
    db.query(AutomationStep).filter(AutomationStep.automation_id == automation_id).delete(synchronize_session=False)
    db.delete(automation)
    db.commit()
    return None


@router.get("/{automation_id}/runs")
def list_automation_runs(
    automation_id: int,
    skip: int = 0,
    limit: int = 50,
    status: Optional[str] = Query(None, description="Filter by status: running, waiting, completed, failed"),
    db: Session = Depends(get_db),
):
    """List automation runs for a given automation. Returns subscriber info, current step, status."""
    automation = db.query(Automation).filter(Automation.id == automation_id).first()
    if not automation:
        raise HTTPException(status_code=404, detail="Automation not found")
    q = db.query(AutomationRun).filter(AutomationRun.automation_id == automation_id)
    if status:
        q = q.filter(AutomationRun.status == status)
    total = q.count()
    runs = q.order_by(AutomationRun.started_at.desc()).offset(skip).limit(limit).all()
    out = []
    for r in runs:
        sub = db.query(Subscriber).filter(Subscriber.id == r.subscriber_id).first()
        out.append({
            "id": r.id,
            "automation_id": r.automation_id,
            "subscriber_id": r.subscriber_id,
            "subscriber_email": sub.email if sub else None,
            "subscriber_name": sub.name if sub else None,
            "current_step": r.current_step,
            "status": r.status,
            "started_at": r.started_at.isoformat() if r.started_at else None,
            "completed_at": r.completed_at.isoformat() if r.completed_at else None,
            "error_message": r.error_message,
        })
    return {"runs": out, "total": total}


@router.get("/{automation_id}/versions")
def list_automation_versions(automation_id: int, db: Session = Depends(get_db)):
    """List version history for an automation. Newest first."""
    automation = db.query(Automation).filter(Automation.id == automation_id).first()
    if not automation:
        raise HTTPException(status_code=404, detail="Automation not found")
    rows = (
        db.query(AutomationVersion)
        .filter(AutomationVersion.automation_id == automation_id)
        .order_by(AutomationVersion.version_number.desc())
        .all()
    )
    return [
        {
            "id": r.id,
            "automation_id": r.automation_id,
            "version_number": r.version_number,
            "name": r.name,
            "trigger_type": r.trigger_type,
            "steps": r.steps or [],
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in rows
    ]


@router.post("/{automation_id}/rollback")
def rollback_automation(
    automation_id: int,
    body: AutomationRollbackRequest,
    db: Session = Depends(get_db),
):
    """Restore automation to a previous version (name, trigger_type, steps)."""
    automation = db.query(Automation).filter(Automation.id == automation_id).first()
    if not automation:
        raise HTTPException(status_code=404, detail="Automation not found")
    version = (
        db.query(AutomationVersion)
        .filter(
            AutomationVersion.id == body.version_id,
            AutomationVersion.automation_id == automation_id,
        )
        .first()
    )
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")
    # Apply version state
    automation.name = version.name
    automation.trigger_type = version.trigger_type
    for old in automation.steps:
        db.delete(old)
    for s in version.steps or []:
        step = AutomationStep(
            automation_id=automation.id,
            order=s.get("order", 0),
            step_type=s.get("step_type", "email"),
            payload=s.get("payload"),
        )
        db.add(step)
    db.commit()
    db.refresh(automation)
    return _automation_to_response(automation)


@router.get("/{automation_id}/stats")
def get_automation_stats(automation_id: int, db: Session = Depends(get_db)):
    """Return run counts by status: running, waiting, completed, failed."""
    automation = db.query(Automation).filter(Automation.id == automation_id).first()
    if not automation:
        raise HTTPException(status_code=404, detail="Automation not found")
    rows = (
        db.query(AutomationRun.status, func.count(AutomationRun.id))
        .filter(AutomationRun.automation_id == automation_id)
        .group_by(AutomationRun.status)
        .all()
    )
    counts = {"running": 0, "waiting": 0, "completed": 0, "failed": 0}
    for status, cnt in rows:
        if status in counts:
            counts[status] = cnt
    return counts


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
