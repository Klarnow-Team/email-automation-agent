from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr


class SubscriberCreate(BaseModel):
    email: EmailStr
    name: Optional[str] = None


class SubscriberUpdate(BaseModel):
    name: Optional[str] = None
    status: Optional[str] = None  # active | unsubscribed


class SubscriberResponse(BaseModel):
    id: int
    email: str
    name: Optional[str] = None
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class SubscriberImportItem(BaseModel):
    email: EmailStr
    name: Optional[str] = None
