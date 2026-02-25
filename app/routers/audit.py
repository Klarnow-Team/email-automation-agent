"""Audit log API (read-only)."""
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.audit_log import AuditLog

router = APIRouter()


@router.get("")
def list_audit_logs(
    skip: int = 0,
    limit: int = 50,
    resource_type: Optional[str] = None,
    action: Optional[str] = None,
    db: Session = Depends(get_db),
):
    q = db.query(AuditLog).order_by(AuditLog.created_at.desc())
    if resource_type:
        q = q.filter(AuditLog.resource_type == resource_type)
    if action:
        q = q.filter(AuditLog.action == action)
    rows = q.offset(skip).limit(limit).all()
    return [
        {
            "id": r.id,
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "action": r.action,
            "resource_type": r.resource_type,
            "resource_id": r.resource_id,
            "details": r.details,
            "actor_id": r.actor_id,
            "ip": r.ip,
        }
        for r in rows
    ]
