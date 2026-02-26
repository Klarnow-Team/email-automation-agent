from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel


class WebhookSubscriptionCreate(BaseModel):
    url: str
    event_types: Optional[List[str]] = None
    secret: Optional[str] = None


class WebhookSubscriptionUpdate(BaseModel):
    url: Optional[str] = None
    event_types: Optional[List[str]] = None
    enabled: Optional[bool] = None
    secret: Optional[str] = None


class WebhookSubscriptionResponse(BaseModel):
    id: int
    url: str
    event_types: Optional[List[str]] = None
    enabled: bool
    created_at: datetime

    class Config:
        from_attributes = True
