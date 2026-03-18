from datetime import datetime
from typing import Any, List, Optional

from pydantic import BaseModel


class FormFieldSchema(BaseModel):
    key: str
    type: str = "text"  # text | email | number | select
    label: Optional[str] = None
    required: bool = False
    options: Optional[List[str]] = None


class FormCreate(BaseModel):
    name: str
    form_type: Optional[str] = "embed"
    fields: Optional[List[Any]] = None
    success_message: Optional[str] = None
    redirect_url: Optional[str] = None
    add_to_group_id: Optional[int] = None
    trigger_automation_id: Optional[int] = None


class FormUpdate(BaseModel):
    name: Optional[str] = None
    form_type: Optional[str] = None
    fields: Optional[List[Any]] = None
    success_message: Optional[str] = None
    redirect_url: Optional[str] = None
    add_to_group_id: Optional[int] = None
    trigger_automation_id: Optional[int] = None


class FormResponse(BaseModel):
    id: int
    name: str
    form_type: str
    fields: Optional[List[Any]] = None
    success_message: Optional[str] = None
    redirect_url: Optional[str] = None
    add_to_group_id: Optional[int] = None
    trigger_automation_id: Optional[int] = None
    created_at: datetime
    submission_count: Optional[int] = None

    class Config:
        from_attributes = True


class FormSubmissionResponse(BaseModel):
    """One form submission for list endpoint."""
    id: int
    form_id: int
    subscriber_id: Optional[int] = None
    email: Optional[str] = None
    name: Optional[str] = None
    payload: dict
    created_at: datetime

    class Config:
        from_attributes = True


class FormPublicResponse(BaseModel):
    """Form config for public embed (no sensitive data)."""
    id: int
    name: str
    form_type: str
    fields: Optional[List[Any]] = None
    success_message: Optional[str] = None
    redirect_url: Optional[str] = None


class FormSubmitPublic(BaseModel):
    """Payload for public form submission. Must include at least email; other keys match form fields."""
    email: str
    name: Optional[str] = None
    custom_fields: Optional[dict] = None
    # Or pass raw key-value pairs that map to form field keys
    data: Optional[dict] = None
