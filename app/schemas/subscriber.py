from datetime import datetime
from typing import Dict, List, Optional

from pydantic import BaseModel, EmailStr


class SubscriberCreate(BaseModel):
    email: EmailStr
    name: Optional[str] = None
    custom_fields: Optional[Dict[str, str]] = None


class SubscriberUpdate(BaseModel):
    name: Optional[str] = None
    status: Optional[str] = None  # active | unsubscribed
    custom_fields: Optional[Dict[str, str]] = None


class SubscriberResponse(BaseModel):
    id: int
    email: str
    name: Optional[str] = None
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
    custom_fields: Optional[Dict[str, str]] = None


class SubscriberBulkUpdate(BaseModel):
    subscriber_ids: List[int]
    name: Optional[str] = None
    status: Optional[str] = None
    custom_fields: Optional[Dict[str, str]] = None
