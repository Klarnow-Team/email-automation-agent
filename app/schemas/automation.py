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
    trigger_type: str  # e.g. subscriber_added, form_submitted
    trigger_config: Optional[Dict[str, Any]] = None  # e.g. {"form_id": 1} for form_submitted
    is_active: bool = True
    steps: List[AutomationStepCreate] = []


class AutomationUpdate(BaseModel):
    name: Optional[str] = None
    trigger_type: Optional[str] = None
    trigger_config: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None
    steps: Optional[List[AutomationStepCreate]] = None


class AutomationResponse(BaseModel):
    id: int
    name: str
    trigger_type: str
    trigger_config: Optional[Dict[str, Any]] = None
    is_active: bool
    created_at: datetime
    steps: List[AutomationStepResponse] = []

    class Config:
        from_attributes = True


class AutomationTriggerRequest(BaseModel):
    subscriber_id: int


class AutomationRollbackRequest(BaseModel):
    version_id: int
