from typing import Dict, List, Optional

from pydantic import BaseModel


class BookingProfileResponse(BaseModel):
    id: int
    username: str
    profile_photo_url: Optional[str] = None
    bio: Optional[str] = None
    timezone: str
    timezone_auto_detect: bool
    social_links: Optional[Dict[str, str]] = None
    custom_branding_enabled: bool
    hidden_event_type_ids: Optional[List[int]] = None
    custom_url_slug: Optional[str] = None
    custom_domain: Optional[str] = None
    seo_title: Optional[str] = None
    seo_description: Optional[str] = None
    seo_image_url: Optional[str] = None
    language: str
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    embed_primary_color: Optional[str] = None
    embed_layout: str = "full"
    embed_type: str = "inline"

    class Config:
        from_attributes = True


class BookingProfileUpdate(BaseModel):
    username: Optional[str] = None
    profile_photo_url: Optional[str] = None
    bio: Optional[str] = None
    timezone: Optional[str] = None
    timezone_auto_detect: Optional[bool] = None
    social_links: Optional[Dict[str, str]] = None
    custom_branding_enabled: Optional[bool] = None
    hidden_event_type_ids: Optional[List[int]] = None
    custom_url_slug: Optional[str] = None
    custom_domain: Optional[str] = None
    seo_title: Optional[str] = None
    seo_description: Optional[str] = None
    seo_image_url: Optional[str] = None
    language: Optional[str] = None
    embed_primary_color: Optional[str] = None
    embed_layout: Optional[str] = None
    embed_type: Optional[str] = None
