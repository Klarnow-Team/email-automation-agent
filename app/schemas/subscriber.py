from datetime import datetime
from typing import Dict, List, Optional

from pydantic import BaseModel, EmailStr


class SubscriberCreate(BaseModel):
    email: EmailStr
    name: Optional[str] = None
    phone: Optional[str] = None
    custom_fields: Optional[Dict[str, str]] = None


class SubscriberUpdate(BaseModel):
    name: Optional[str] = None
    status: Optional[str] = None  # active | unsubscribed
    phone: Optional[str] = None
    custom_fields: Optional[Dict[str, str]] = None


class SubscriberResponse(BaseModel):
    id: int
    email: str
    name: Optional[str] = None
    phone: Optional[str] = None
    status: str
    custom_fields: Optional[Dict[str, str]] = None
    created_at: datetime
    group_ids: Optional[List[int]] = None
    tag_ids: Optional[List[int]] = None

    class Config:
        from_attributes = True


class SubscriberImportItem(BaseModel):
    email: EmailStr
    name: Optional[str] = None
    phone: Optional[str] = None
    custom_fields: Optional[Dict[str, str]] = None


class SubscriberBulkUpdate(BaseModel):
    subscriber_ids: List[int]
    name: Optional[str] = None
    status: Optional[str] = None
    phone: Optional[str] = None
    custom_fields: Optional[Dict[str, str]] = None


class SubscriberActivityItem(BaseModel):
    id: int
    event_type: str
    payload: Optional[Dict] = None
    created_at: Optional[str] = None


class SubscriberCampaignReceived(BaseModel):
    campaign_id: int
    campaign_name: str
    sent_at: Optional[str] = None
    variant: Optional[str] = None


class SubscriberAutomationRun(BaseModel):
    run_id: int
    automation_id: int
    automation_name: str
    status: str
    started_at: Optional[str] = None
    completed_at: Optional[str] = None


class SubscriberProfileResponse(BaseModel):
    subscriber: SubscriberResponse
    activity: List[SubscriberActivityItem]
    campaigns_received: List[SubscriberCampaignReceived]
    automation_runs: List[SubscriberAutomationRun]
    opens_count: int = 0
    clicks_count: int = 0
