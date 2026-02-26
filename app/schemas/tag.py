from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel


class TagCreate(BaseModel):
    name: str


class TagUpdate(BaseModel):
    name: Optional[str] = None


class TagResponse(BaseModel):
    id: int
    name: str
    created_at: datetime
    subscriber_count: Optional[int] = None

    class Config:
        from_attributes = True


class TagSubscribersUpdate(BaseModel):
    subscriber_ids: List[int]
