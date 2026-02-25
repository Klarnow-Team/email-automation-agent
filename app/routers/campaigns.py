import uuid
from pathlib import Path
from typing import List

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.campaign import Campaign, CampaignRecipient, CampaignStatus
from app.models.tracking import TrackingEvent
from app.schemas.campaign import CampaignCreate, CampaignUpdate, CampaignResponse, CampaignSendRequest
from app.services.campaign_service import send_campaign

router = APIRouter()

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"}


@router.post("/upload-image")
def upload_campaign_image(request: Request, file: UploadFile = File(...)):
    """Upload an image for use in a campaign. Returns a public URL."""
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid type. Allowed: {', '.join(ALLOWED_IMAGE_TYPES)}",
        )
    ext = Path(file.filename or "image").suffix.lower() or ".jpg"
    if ext not in (".jpg", ".jpeg", ".png", ".gif", ".webp"):
        ext = ".jpg"
    name = f"{uuid.uuid4().hex}{ext}"
    uploads_dir = Path(__file__).resolve().parent.parent.parent / "uploads"
    uploads_dir.mkdir(exist_ok=True)
    path = uploads_dir / name
    contents = file.file.read()
    if len(contents) > 10 * 1024 * 1024:  # 10 MB
        raise HTTPException(status_code=400, detail="File too large (max 10 MB)")
    path.write_bytes(contents)
    base = str(request.base_url).rstrip("/")
    url = f"{base}/uploads/{name}"
    return {"url": url}


@router.get("", response_model=List[CampaignResponse])
def list_campaigns(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    campaigns = db.query(Campaign).order_by(Campaign.created_at.desc()).offset(skip).limit(limit).all()
    if not campaigns:
        return []
    ids = [c.id for c in campaigns]
    sent_map = dict(
        db.query(CampaignRecipient.campaign_id, func.count(CampaignRecipient.id))
        .filter(CampaignRecipient.campaign_id.in_(ids), CampaignRecipient.sent_at.isnot(None))
        .group_by(CampaignRecipient.campaign_id)
        .all()
    )
    open_map = dict(
        db.query(TrackingEvent.campaign_id, func.count(TrackingEvent.id))
        .filter(TrackingEvent.campaign_id.in_(ids), TrackingEvent.event_type == "open")
        .group_by(TrackingEvent.campaign_id)
        .all()
    )
    click_map = dict(
        db.query(TrackingEvent.campaign_id, func.count(TrackingEvent.id))
        .filter(TrackingEvent.campaign_id.in_(ids), TrackingEvent.event_type == "click")
        .group_by(TrackingEvent.campaign_id)
        .all()
    )
    result = []
    for c in campaigns:
        data = CampaignResponse.model_validate(c).model_dump()
        data["sent_count"] = sent_map.get(c.id, 0)
        data["opens"] = open_map.get(c.id, 0)
        data["clicks"] = click_map.get(c.id, 0)
        result.append(CampaignResponse(**data))
    return result


@router.post("", response_model=CampaignResponse, status_code=201)
def create_campaign(body: CampaignCreate, db: Session = Depends(get_db)):
    campaign = Campaign(
        name=body.name,
        subject=body.subject,
        html_body=body.html_body,
        plain_body=body.plain_body,
        scheduled_at=body.scheduled_at,
        ab_subject_b=body.ab_subject_b,
        ab_html_body_b=body.ab_html_body_b,
        ab_split_percent=body.ab_split_percent or 0,
        status=CampaignStatus.draft,
    )
    db.add(campaign)
    db.commit()
    db.refresh(campaign)
    return campaign


@router.patch("/{campaign_id}", response_model=CampaignResponse)
def update_campaign(campaign_id: int, body: CampaignUpdate, db: Session = Depends(get_db)):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    if body.name is not None:
        campaign.name = body.name
    if body.subject is not None:
        campaign.subject = body.subject
    if body.html_body is not None:
        campaign.html_body = body.html_body
    if body.plain_body is not None:
        campaign.plain_body = body.plain_body
    if body.scheduled_at is not None:
        campaign.scheduled_at = body.scheduled_at
    if body.ab_subject_b is not None:
        campaign.ab_subject_b = body.ab_subject_b
    if body.ab_html_body_b is not None:
        campaign.ab_html_body_b = body.ab_html_body_b
    if body.ab_split_percent is not None:
        campaign.ab_split_percent = body.ab_split_percent
    if body.ab_winner is not None:
        campaign.ab_winner = body.ab_winner
    db.commit()
    db.refresh(campaign)
    data = CampaignResponse.model_validate(campaign).model_dump()
    data["sent_count"] = (
        db.query(func.count(CampaignRecipient.id))
        .filter(CampaignRecipient.campaign_id == campaign_id, CampaignRecipient.sent_at.isnot(None))
        .scalar() or 0
    )
    data["opens"] = (
        db.query(func.count(TrackingEvent.id))
        .filter(TrackingEvent.campaign_id == campaign_id, TrackingEvent.event_type == "open")
        .scalar() or 0
    )
    data["clicks"] = (
        db.query(func.count(TrackingEvent.id))
        .filter(TrackingEvent.campaign_id == campaign_id, TrackingEvent.event_type == "click")
        .scalar() or 0
    )
    return CampaignResponse(**data)


@router.get("/{campaign_id}", response_model=CampaignResponse)
def get_campaign(campaign_id: int, db: Session = Depends(get_db)):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    data = CampaignResponse.model_validate(campaign).model_dump()
    data["sent_count"] = (
        db.query(func.count(CampaignRecipient.id))
        .filter(CampaignRecipient.campaign_id == campaign_id, CampaignRecipient.sent_at.isnot(None))
        .scalar()
        or 0
    )
    data["opens"] = (
        db.query(func.count(TrackingEvent.id))
        .filter(TrackingEvent.campaign_id == campaign_id, TrackingEvent.event_type == "open")
        .scalar()
        or 0
    )
    data["clicks"] = (
        db.query(func.count(TrackingEvent.id))
        .filter(TrackingEvent.campaign_id == campaign_id, TrackingEvent.event_type == "click")
        .scalar()
        or 0
    )
    return CampaignResponse(**data)


@router.post("/{campaign_id}/duplicate", response_model=CampaignResponse, status_code=201)
def duplicate_campaign(campaign_id: int, db: Session = Depends(get_db)):
    """Duplicate a campaign as a new draft."""
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    new_campaign = Campaign(
        name=f"{campaign.name} (copy)",
        subject=campaign.subject,
        html_body=campaign.html_body,
        plain_body=getattr(campaign, "plain_body", None),
        scheduled_at=None,
        ab_subject_b=getattr(campaign, "ab_subject_b", None),
        ab_html_body_b=getattr(campaign, "ab_html_body_b", None),
        ab_split_percent=getattr(campaign, "ab_split_percent", 0) or 0,
        status=CampaignStatus.draft,
    )
    db.add(new_campaign)
    db.commit()
    db.refresh(new_campaign)
    return new_campaign


@router.delete("/{campaign_id}", status_code=204)
def delete_campaign(campaign_id: int, db: Session = Depends(get_db)):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    db.delete(campaign)
    db.commit()
    return None


@router.post("/{campaign_id}/send")
def send_campaign_endpoint(
    campaign_id: int,
    body: CampaignSendRequest,
    db: Session = Depends(get_db),
):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    recipient_ids = body.recipient_ids if body.recipient_ids else None
    sent, err = send_campaign(db, campaign, recipient_ids)
    if err:
        raise HTTPException(status_code=400, detail=err)
    return {"sent": sent, "message": f"Campaign sent to {sent} subscribers"}


@router.get("/{campaign_id}/non-opener-subscriber-ids")
def get_non_opener_subscriber_ids(campaign_id: int, db: Session = Depends(get_db)):
    """Return subscriber IDs who received this campaign but have not opened it. Use to re-send or create a follow-up campaign."""
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    recipient_ids = [
        r[0]
        for r in db.query(CampaignRecipient.subscriber_id)
        .filter(CampaignRecipient.campaign_id == campaign_id, CampaignRecipient.sent_at.isnot(None))
        .all()
    ]
    if not recipient_ids:
        return {"subscriber_ids": [], "count": 0}
    openers = set(
        r[0]
        for r in db.query(TrackingEvent.subscriber_id)
        .filter(
            TrackingEvent.campaign_id == campaign_id,
            TrackingEvent.event_type == "open",
            TrackingEvent.subscriber_id.isnot(None),
        )
        .distinct()
        .all()
    )
    non_openers = [i for i in recipient_ids if i not in openers]
    return {"subscriber_ids": non_openers, "count": len(non_openers)}
