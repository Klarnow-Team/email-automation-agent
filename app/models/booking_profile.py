"""In-house booking profile and booking page settings. Single row per app."""
from sqlalchemy import Boolean, Column, DateTime, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func

from app.database import Base


class BookingProfile(Base):
    """
    Booking profile for the internal booking page (slug, bio, timezone, etc.).
    Single row: one profile per installation.
    """
    __tablename__ = "booking_profiles"

    id = Column(Integer, primary_key=True, index=True)
    # Profile slug used in booking page URL (e.g. /book/username)
    username = Column(String(100), nullable=False, unique=True, index=True)
    profile_photo_url = Column(String(500), nullable=True)
    bio = Column(Text, nullable=True)
    timezone = Column(String(64), default="UTC", nullable=False)
    timezone_auto_detect = Column(Boolean, default=True, nullable=False)
    social_links = Column(JSONB, nullable=True)  # {"twitter": "...", "linkedin": "...", ...}
    custom_branding_enabled = Column(Boolean, default=False, nullable=False)  # Pro tier
    # Booking page controls
    hidden_event_type_ids = Column(JSONB, nullable=True)  # [1, 2] = hide those event types
    custom_url_slug = Column(String(100), nullable=True)  # override for booking URL
    custom_domain = Column(String(255), nullable=True)
    seo_title = Column(String(255), nullable=True)
    seo_description = Column(Text, nullable=True)
    seo_image_url = Column(String(500), nullable=True)
    language = Column(String(10), default="en", nullable=False)
    embed_primary_color = Column(String(20), nullable=True)
    embed_layout = Column(String(20), default="full", nullable=False)
    embed_type = Column(String(20), default="inline", nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now())
