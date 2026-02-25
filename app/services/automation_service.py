from datetime import datetime, timedelta, timezone
from typing import List

from sqlalchemy.orm import Session

from app.models.automation import Automation, AutomationRun, AutomationStep, PendingAutomationDelay
from app.models.subscriber import Subscriber
from app.models.group import SubscriberGroup
from app.models.tag import SubscriberTag
from app.services.resend_service import send_email
from app.services.event_bus import emit as event_emit
from app.services.activity_service import log_activity


def _execute_steps_from(
    db: Session,
    run: AutomationRun,
    steps: List[AutomationStep],
    from_index: int,
) -> None:
    """
    Execute steps from from_index onward. On email step: send and continue.
    On delay step: create PendingAutomationDelay, set run.status = "waiting", and return.
    On completion: set run.status = "completed", run.completed_at = now.
    """
    subscriber = run.subscriber
    if not subscriber:
        run.status = "failed"
        run.error_message = "Subscriber not found"
        run.completed_at = datetime.now(timezone.utc)
        db.commit()
        return

    for idx in range(from_index, len(steps)):
        step = steps[idx]
        run.current_step = idx
        db.commit()

        if run.paused:
            return

        if step.step_type == "email" and step.payload:
            subject = step.payload.get("subject", "")
            html = step.payload.get("html", "")
            try:
                send_email(to=subscriber.email, subject=subject, html=html)
            except Exception as e:
                run.status = "failed"
                run.error_message = str(e)[:500]
                run.completed_at = datetime.now(timezone.utc)
                db.commit()
                return
        elif step.step_type == "delay" and step.payload:
            delay_minutes = step.payload.get("delay_minutes") or 0
            execute_after = datetime.now(timezone.utc) + timedelta(minutes=delay_minutes)
            pending = PendingAutomationDelay(
                run_id=run.id,
                step_index=idx,
                execute_after=execute_after,
            )
            db.add(pending)
            run.status = "waiting"
            db.commit()
            return

        elif step.step_type == "update_field" and step.payload:
            key = step.payload.get("key")
            value = step.payload.get("value")
            if key is not None:
                cf = dict(subscriber.custom_fields or {})
                cf[str(key)] = value if value is None else str(value)
                subscriber.custom_fields = cf
                db.commit()

        elif step.step_type == "add_to_group" and step.payload:
            group_id = step.payload.get("group_id")
            if group_id is not None:
                existing = (
                    db.query(SubscriberGroup)
                    .filter(SubscriberGroup.subscriber_id == subscriber.id, SubscriberGroup.group_id == group_id)
                    .first()
                )
                if not existing:
                    db.add(SubscriberGroup(subscriber_id=subscriber.id, group_id=group_id))
                    db.commit()

        elif step.step_type == "remove_from_group" and step.payload:
            group_id = step.payload.get("group_id")
            if group_id is not None:
                db.query(SubscriberGroup).filter(
                    SubscriberGroup.subscriber_id == subscriber.id,
                    SubscriberGroup.group_id == group_id,
                ).delete()
                db.commit()

        elif step.step_type == "add_tag" and step.payload:
            tag_id = step.payload.get("tag_id")
            if tag_id is not None:
                existing = (
                    db.query(SubscriberTag)
                    .filter(SubscriberTag.subscriber_id == subscriber.id, SubscriberTag.tag_id == tag_id)
                    .first()
                )
                if not existing:
                    db.add(SubscriberTag(subscriber_id=subscriber.id, tag_id=tag_id))
                    db.commit()

        elif step.step_type == "remove_tag" and step.payload:
            tag_id = step.payload.get("tag_id")
            if tag_id is not None:
                db.query(SubscriberTag).filter(
                    SubscriberTag.subscriber_id == subscriber.id,
                    SubscriberTag.tag_id == tag_id,
                ).delete()
                db.commit()

        elif step.step_type == "trigger_automation" and step.payload:
            other_automation_id = step.payload.get("automation_id")
            if other_automation_id is not None:
                other = db.query(Automation).filter(Automation.id == other_automation_id, Automation.is_active == 1).first()
                if other and other.id != run.automation_id:
                    run_automation_for_subscriber(db, other, subscriber)

    run.current_step = len(steps)
    run.status = "completed"
    run.completed_at = datetime.now(timezone.utc)
    db.commit()
    event_emit(db, "automation.completed", {"automation_id": run.automation_id, "run_id": run.id, "subscriber_id": run.subscriber_id})


def run_automation_for_subscriber(db: Session, automation: Automation, subscriber: Subscriber) -> AutomationRun | None:
    """
    Start an automation run for a subscriber: create AutomationRun and execute steps in order.
    Email steps send via Resend; delay steps enqueue a PendingAutomationDelay and set status to "waiting".
    Call process_due_automation_delays (e.g. via cron) to resume after delays.
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
    event_emit(db, "automation.entered", {"automation_id": automation.id, "run_id": run.id, "subscriber_id": subscriber.id})
    log_activity(db, "automation.entered", "automation", automation.id, {"run_id": run.id, "subscriber_id": subscriber.id})

    _execute_steps_from(db, run, steps, 0)
    db.refresh(run)
    return run


def process_due_automation_delays(db: Session, max_processed: int = 100) -> int:
    """
    Process pending delays where execute_after <= now. Resumes each run from the step after the delay.
    Returns the number of delays processed. Idempotent per run (each run processed at most once per call).
    """
    now = datetime.now(timezone.utc)
    pending_list = (
        db.query(PendingAutomationDelay)
        .filter(PendingAutomationDelay.execute_after <= now)
        .order_by(PendingAutomationDelay.execute_after)
        .limit(max_processed)
        .all()
    )
    processed = 0
    for pending in pending_list:
        run = db.query(AutomationRun).filter(AutomationRun.id == pending.run_id).first()
        if not run or run.status not in ("waiting", "running"):
            db.delete(pending)
            db.commit()
            processed += 1
            continue
        automation = run.automation
        if not automation:
            db.delete(pending)
            db.commit()
            processed += 1
            continue
        steps = sorted(automation.steps, key=lambda s: s.order)
        run.status = "running"
        db.delete(pending)
        db.commit()
        _execute_steps_from(db, run, steps, pending.step_index + 1)
        processed += 1
    return processed


def trigger_automations_for_new_subscriber(db: Session, subscriber: Subscriber) -> None:
    """Find all active automations with trigger_type=subscriber_added and run them for this subscriber."""
    automations = (
        db.query(Automation)
        .filter(Automation.trigger_type == "subscriber_added", Automation.is_active == 1)
        .all()
    )
    for auto in automations:
        run_automation_for_subscriber(db, auto, subscriber)


def trigger_automations_for_group_joined(db: Session, subscriber_id: int, group_id: int) -> None:
    """Trigger automations with trigger_type=group_joined and matching group_id in trigger_payload (optional)."""
    subscriber = db.query(Subscriber).filter(Subscriber.id == subscriber_id).first()
    if not subscriber:
        return
    automations = (
        db.query(Automation)
        .filter(Automation.trigger_type == "group_joined", Automation.is_active == 1)
        .all()
    )
    for auto in automations:
        run_automation_for_subscriber(db, auto, subscriber)


def trigger_automations_for_group_left(db: Session, subscriber_id: int, group_id: int) -> None:
    """Trigger automations with trigger_type=group_left."""
    subscriber = db.query(Subscriber).filter(Subscriber.id == subscriber_id).first()
    if not subscriber:
        return
    automations = (
        db.query(Automation)
        .filter(Automation.trigger_type == "group_left", Automation.is_active == 1)
        .all()
    )
    for auto in automations:
        run_automation_for_subscriber(db, auto, subscriber)


def trigger_automations_for_field_updated(db: Session, subscriber: Subscriber) -> None:
    """Trigger automations with trigger_type=field_updated (e.g. after custom_fields change)."""
    automations = (
        db.query(Automation)
        .filter(Automation.trigger_type == "field_updated", Automation.is_active == 1)
        .all()
    )
    for auto in automations:
        run_automation_for_subscriber(db, auto, subscriber)
