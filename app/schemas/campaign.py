from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel


class CampaignCreate(BaseModel):
    name: str
    subject: str
    html_body: str


class CampaignResponse(BaseModel):
    id: int
    name: str
    subject: str
    html_body: str
    status: str
    sent_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class CampaignSendRequest(BaseModel):
    recipient_ids: Optional[List[int]] = None  # None or empty = all active subscribers
