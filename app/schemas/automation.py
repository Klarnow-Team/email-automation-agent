from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel


class AutomationStepCreate(BaseModel):
    order: int
    step_type: str  # email | delay
    payload: Optional[Dict[str, Any]] = None


class AutomationStepResponse(BaseModel):
    id: int
    automation_id: int
    order: int
    step_type: str
    payload: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True


class AutomationCreate(BaseModel):
    name: str
    trigger_type: str  # e.g. subscriber_added
    is_active: bool = True
    steps: List[AutomationStepCreate] = []


class AutomationUpdate(BaseModel):
    name: Optional[str] = None
    is_active: Optional[bool] = None
    steps: Optional[List[AutomationStepCreate]] = None


class AutomationResponse(BaseModel):
    id: int
    name: str
    trigger_type: str
    is_active: bool
    created_at: datetime
    steps: List[AutomationStepResponse] = []

    class Config:
        from_attributes = True


class AutomationTriggerRequest(BaseModel):
    subscriber_id: int
