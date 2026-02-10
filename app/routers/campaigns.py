from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.campaign import Campaign, CampaignStatus
from app.schemas.campaign import CampaignCreate, CampaignResponse, CampaignSendRequest
from app.services.campaign_service import send_campaign

router = APIRouter()


@router.get("", response_model=List[CampaignResponse])
def list_campaigns(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    campaigns = db.query(Campaign).order_by(Campaign.created_at.desc()).offset(skip).limit(limit).all()
    return campaigns


@router.post("", response_model=CampaignResponse, status_code=201)
def create_campaign(body: CampaignCreate, db: Session = Depends(get_db)):
    campaign = Campaign(
        name=body.name,
        subject=body.subject,
        html_body=body.html_body,
        status=CampaignStatus.draft,
    )
    db.add(campaign)
    db.commit()
    db.refresh(campaign)
    return campaign


@router.get("/{campaign_id}", response_model=CampaignResponse)
def get_campaign(campaign_id: int, db: Session = Depends(get_db)):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return campaign


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
