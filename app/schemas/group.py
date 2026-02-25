from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel


class GroupCreate(BaseModel):
    name: str


class GroupUpdate(BaseModel):
    name: Optional[str] = None


class GroupResponse(BaseModel):
    id: int
    name: str
    created_at: datetime
    subscriber_count: Optional[int] = None

    class Config:
        from_attributes = True


class GroupSubscribersUpdate(BaseModel):
    subscriber_ids: List[int]
