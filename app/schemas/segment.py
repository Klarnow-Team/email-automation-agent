from datetime import datetime
from typing import Any, List, Optional

from pydantic import BaseModel


class SegmentCreate(BaseModel):
    name: str
    rules: Optional[List[Any]] = None


class SegmentUpdate(BaseModel):
    name: Optional[str] = None
    rules: Optional[List[Any]] = None


class SegmentResponse(BaseModel):
    id: int
    name: str
    rules: Optional[List[Any]] = None
    created_at: datetime

    class Config:
        from_attributes = True
