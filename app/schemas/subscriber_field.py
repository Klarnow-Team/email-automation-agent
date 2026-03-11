from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class SubscriberFieldCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    field_type: str = Field(default="text", pattern="^(text|number|date)$")


class SubscriberFieldUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    field_type: Optional[str] = Field(None, pattern="^(text|number|date)$")


class SubscriberFieldResponse(BaseModel):
    id: int
    key: str
    title: str
    field_type: str
    created_at: datetime
    subscriber_count: Optional[int] = None  # filled when listing

    class Config:
        from_attributes = True
