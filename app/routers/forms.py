from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.form import Form, FormSubmission
from app.models.subscriber import Subscriber, SubscriberStatus
from app.models.group import SubscriberGroup
from app.schemas.form import FormCreate, FormUpdate, FormResponse, FormSubmitPublic
from app.services.automation_service import run_automation_for_subscriber, trigger_automations_for_new_subscriber
from app.services.activity_service import log_activity
from app.models.tracking import SubscriberActivity

router = APIRouter()


@router.get("", response_model=List[FormResponse])
def list_forms(db: Session = Depends(get_db)):
    forms = db.query(Form).all()
    if not forms:
        return []
    ids = [f.id for f in forms]
    counts = dict(
        db.query(FormSubmission.form_id, func.count(FormSubmission.id))
        .filter(FormSubmission.form_id.in_(ids))
        .group_by(FormSubmission.form_id)
        .all()
    )
    return [
        FormResponse(
            id=f.id,
            name=f.name,
            form_type=f.form_type,
            fields=f.fields,
            success_message=f.success_message,
            redirect_url=f.redirect_url,
            add_to_group_id=f.add_to_group_id,
            trigger_automation_id=f.trigger_automation_id,
            created_at=f.created_at,
            submission_count=counts.get(f.id, 0),
        )
        for f in forms
    ]


@router.post("", response_model=FormResponse, status_code=201)
def create_form(body: FormCreate, db: Session = Depends(get_db)):
    form = Form(
        name=body.name,
        form_type=body.form_type or "embed",
        fields=body.fields or [],
        success_message=body.success_message,
        redirect_url=body.redirect_url,
        add_to_group_id=body.add_to_group_id,
        trigger_automation_id=body.trigger_automation_id,
    )
    db.add(form)
    db.commit()
    db.refresh(form)
    return FormResponse(
        id=form.id,
        name=form.name,
        form_type=form.form_type,
        fields=form.fields,
        success_message=form.success_message,
        redirect_url=form.redirect_url,
        add_to_group_id=form.add_to_group_id,
        trigger_automation_id=form.trigger_automation_id,
        created_at=form.created_at,
        submission_count=0,
    )


@router.get("/{form_id}", response_model=FormResponse)
def get_form(form_id: int, db: Session = Depends(get_db)):
    form = db.query(Form).filter(Form.id == form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
    count = db.query(func.count(FormSubmission.id)).filter(FormSubmission.form_id == form_id).scalar() or 0
    return FormResponse(
        id=form.id,
        name=form.name,
        form_type=form.form_type,
        fields=form.fields,
        success_message=form.success_message,
        redirect_url=form.redirect_url,
        add_to_group_id=form.add_to_group_id,
        trigger_automation_id=form.trigger_automation_id,
        created_at=form.created_at,
        submission_count=count,
    )


@router.patch("/{form_id}", response_model=FormResponse)
def update_form(form_id: int, body: FormUpdate, db: Session = Depends(get_db)):
    form = db.query(Form).filter(Form.id == form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
    if body.name is not None:
        form.name = body.name
    if body.form_type is not None:
        form.form_type = body.form_type
    if body.fields is not None:
        form.fields = body.fields
    if body.success_message is not None:
        form.success_message = body.success_message
    if body.redirect_url is not None:
        form.redirect_url = body.redirect_url
    if body.add_to_group_id is not None:
        form.add_to_group_id = body.add_to_group_id
    if body.trigger_automation_id is not None:
        form.trigger_automation_id = body.trigger_automation_id
    db.commit()
    db.refresh(form)
    count = db.query(func.count(FormSubmission.id)).filter(FormSubmission.form_id == form_id).scalar() or 0
    return FormResponse(
        id=form.id,
        name=form.name,
        form_type=form.form_type,
        fields=form.fields,
        success_message=form.success_message,
        redirect_url=form.redirect_url,
        add_to_group_id=form.add_to_group_id,
        trigger_automation_id=form.trigger_automation_id,
        created_at=form.created_at,
        submission_count=count,
    )


@router.delete("/{form_id}", status_code=204)
def delete_form(form_id: int, db: Session = Depends(get_db)):
    form = db.query(Form).filter(Form.id == form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
    db.delete(form)
    db.commit()
    return None


def _get_or_create_subscriber(db: Session, email: str, name: str | None, custom_fields: dict | None) -> tuple:
    """Return (subscriber, created: bool)."""
    email = (email or "").strip().lower()
    if not email:
        raise ValueError("email is required")
    subscriber = db.query(Subscriber).filter(Subscriber.email == email).first()
    if subscriber:
        if name is not None:
            subscriber.name = name
        if custom_fields:
            cf = dict(subscriber.custom_fields or {})
            cf.update(custom_fields)
            subscriber.custom_fields = cf
        db.commit()
        db.refresh(subscriber)
        return subscriber, False
    subscriber = Subscriber(
        email=email,
        name=name,
        status=SubscriberStatus.active,
        custom_fields=custom_fields or {},
    )
    db.add(subscriber)
    db.commit()
    db.refresh(subscriber)
    return subscriber, True


@router.post("/{form_id}/submit")
def submit_form_public(form_id: int, body: FormSubmitPublic, db: Session = Depends(get_db)):
    """Public endpoint: submit form data. Creates or updates subscriber, adds to group, triggers automation."""
    form = db.query(Form).filter(Form.id == form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
    data = dict(body.data or {})
    if body.email:
        data["email"] = body.email
    if body.name is not None:
        data["name"] = body.name
    if body.custom_fields:
        data.setdefault("custom_fields", {}).update(body.custom_fields)
    email = data.get("email") or (body.email if body.email else None)
    if not email:
        raise HTTPException(status_code=400, detail="email is required")
    name = data.get("name") or body.name
    custom_fields = data.get("custom_fields")
    if not custom_fields and body.custom_fields:
        custom_fields = body.custom_fields
    if not custom_fields:
        custom_fields = {k: v for k, v in data.items() if k not in ("email", "name") and v is not None}
    try:
        subscriber, created = _get_or_create_subscriber(db, email, name, custom_fields)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    payload = {k: v for k, v in data.items() if v is not None}
    submission = FormSubmission(form_id=form_id, subscriber_id=subscriber.id, payload=payload)
    db.add(submission)
    db.commit()
    log_activity(db, "form.submitted", "form", form_id, {"submission_id": submission.id, "subscriber_id": subscriber.id})
    db.add(SubscriberActivity(subscriber_id=subscriber.id, event_type="form.submitted", payload={"form_id": form_id, "submission_id": submission.id}))
    db.commit()
    if form.add_to_group_id:
        existing = (
            db.query(SubscriberGroup)
            .filter(SubscriberGroup.subscriber_id == subscriber.id, SubscriberGroup.group_id == form.add_to_group_id)
            .first()
        )
        if not existing:
            db.add(SubscriberGroup(subscriber_id=subscriber.id, group_id=form.add_to_group_id))
            db.commit()
    if form.trigger_automation_id:
        from app.models.automation import Automation
        auto = db.query(Automation).filter(Automation.id == form.trigger_automation_id, Automation.is_active == 1).first()
        if auto:
            run_automation_for_subscriber(db, auto, subscriber)
    elif created:
        trigger_automations_for_new_subscriber(db, subscriber)
    return {
        "success": True,
        "message": form.success_message or "Thank you for subscribing.",
        "redirect_url": form.redirect_url,
        "subscriber_id": subscriber.id,
    }
