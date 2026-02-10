from datetime import datetime, timezone
from typing import List

from sqlalchemy.orm import Session

from app.models.automation import Automation, AutomationRun, AutomationStep
from app.models.subscriber import Subscriber
from app.services.resend_service import send_email


def run_automation_for_subscriber(db: Session, automation: Automation, subscriber: Subscriber) -> AutomationRun | None:
    """
    Start an automation run for a subscriber: create AutomationRun and execute steps in order.
    Email steps send via Resend; delay steps are skipped in sync execution (MVP: no background worker).
    Returns the AutomationRun or None.
    """
    steps: List[AutomationStep] = sorted(automation.steps, key=lambda s: s.order)
    if not steps:
        return None

    run = AutomationRun(
        automation_id=automation.id,
        subscriber_id=subscriber.id,
        current_step=0,
        status="running",
    )
    db.add(run)
    db.commit()
    db.refresh(run)

    for idx, step in enumerate(steps):
        run.current_step = idx
        db.commit()
        if step.step_type == "email" and step.payload:
            subject = step.payload.get("subject", "")
            html = step.payload.get("html", "")
            send_email(to=subscriber.email, subject=subject, html=html)
        elif step.step_type == "delay":
            # MVP: skip delay (would require background job/cron)
            pass

    run.current_step = len(steps)
    run.status = "completed"
    db.commit()
    return run


def trigger_automations_for_new_subscriber(db: Session, subscriber: Subscriber) -> None:
    """Find all active automations with trigger_type=subscriber_added and run them for this subscriber."""
    automations = (
        db.query(Automation)
        .filter(Automation.trigger_type == "subscriber_added", Automation.is_active == 1)
        .all()
    )
    for auto in automations:
        run_automation_for_subscriber(db, auto, subscriber)
