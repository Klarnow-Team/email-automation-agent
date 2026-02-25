from typing import Any

from sqlalchemy.orm import Session

from app.models.activity import ActivityLog


def log_activity(
    db: Session,
    action: str,
    entity_type: str | None = None,
    entity_id: int | None = None,
    payload: dict[str, Any] | None = None,
) -> ActivityLog:
    entry = ActivityLog(
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        payload=payload or {},
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry
