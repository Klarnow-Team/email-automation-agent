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


class FormSubmitPublic(BaseModel):
    """Payload for public form submission. Must include at least email; other keys match form fields."""
    email: str
    name: Optional[str] = None
    custom_fields: Optional[dict] = None
    # Or pass raw key-value pairs that map to form field keys
    data: Optional[dict] = None
