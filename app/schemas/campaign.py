from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel


class CampaignCreate(BaseModel):
    name: str
    subject: str
    html_body: str
    plain_body: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    ab_subject_b: Optional[str] = None
    ab_html_body_b: Optional[str] = None
    ab_split_percent: Optional[int] = 0


class CampaignResponse(BaseModel):
    id: int
    name: str
    subject: str
    html_body: str
    plain_body: Optional[str] = None
    status: str
    sent_at: Optional[datetime] = None
    scheduled_at: Optional[datetime] = None
    ab_subject_b: Optional[str] = None
    ab_html_body_b: Optional[str] = None
    ab_split_percent: Optional[int] = None
    ab_winner: Optional[str] = None
    created_at: datetime
    sent_count: Optional[int] = None
    opens: Optional[int] = None
    clicks: Optional[int] = None

    class Config:
        from_attributes = True


class CampaignUpdate(BaseModel):
    name: Optional[str] = None
    subject: Optional[str] = None
    html_body: Optional[str] = None
    plain_body: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    ab_subject_b: Optional[str] = None
    ab_html_body_b: Optional[str] = None
    ab_split_percent: Optional[int] = None
    ab_winner: Optional[str] = None


class CampaignSendRequest(BaseModel):
    recipient_ids: Optional[List[int]] = None  # None or empty = all active subscribers
