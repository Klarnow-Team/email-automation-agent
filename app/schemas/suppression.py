from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel


class SuppressionCreate(BaseModel):
    type: str  # "email" | "domain"
    value: str  # full email or domain (e.g. "bounce@example.com" or "example.com")


class SuppressionResponse(BaseModel):
    id: int
    type: str
    value: str
    created_at: datetime

    class Config:
        from_attributes = True
