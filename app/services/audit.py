"""Audit logging for booking and system actions."""
from typing import Any, Optional

from fastapi import Request
from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog


def audit_log(
    db: Session,
    action: str,
    resource_type: str,
    resource_id: Optional[str] = None,
    details: Optional[dict[str, Any]] = None,
    actor_id: Optional[int] = None,
    request: Optional[Request] = None,
) -> AuditLog:
    entry = AuditLog(
        action=action,
        resource_type=resource_type,
        resource_id=str(resource_id) if resource_id is not None else None,
        details=details,
        actor_id=actor_id,
        ip=request.client.host if request and request.client else None,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry
