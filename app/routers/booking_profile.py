"""Booking profile: in-house booking page profile and page settings. Single resource."""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.booking_profile import BookingProfile
from app.schemas.booking_profile import BookingProfileResponse, BookingProfileUpdate

router = APIRouter()


def _profile_to_response(p: BookingProfile) -> BookingProfileResponse:
    return BookingProfileResponse(
        id=p.id,
        username=p.username,
        profile_photo_url=p.profile_photo_url,
        bio=p.bio,
        timezone=p.timezone or "UTC",
        timezone_auto_detect=p.timezone_auto_detect if p.timezone_auto_detect is not None else True,
        social_links=p.social_links,
        custom_branding_enabled=p.custom_branding_enabled if p.custom_branding_enabled is not None else False,
        hidden_event_type_ids=p.hidden_event_type_ids,
        custom_url_slug=p.custom_url_slug,
        custom_domain=p.custom_domain,
        seo_title=p.seo_title,
        seo_description=p.seo_description,
        seo_image_url=p.seo_image_url,
        language=p.language or "en",
        created_at=p.created_at.isoformat() if p.created_at else None,
        updated_at=p.updated_at.isoformat() if p.updated_at else None,
        embed_primary_color=getattr(p, "embed_primary_color", None),
        embed_layout=getattr(p, "embed_layout", "full") or "full",
        embed_type=getattr(p, "embed_type", "inline") or "inline",
    )


@router.get("", response_model=BookingProfileResponse)
def get_booking_profile(db: Session = Depends(get_db)):
    """Get the single booking profile (in-house booking page)."""
    profile = db.query(BookingProfile).first()
    if not profile:
        raise HTTPException(status_code=404, detail="No profile yet. Save the form to create one.")
    return _profile_to_response(profile)


@router.patch("", response_model=BookingProfileResponse)
def update_booking_profile(body: BookingProfileUpdate, db: Session = Depends(get_db)):
    """Update booking profile. Creates default row if none exists."""
    profile = db.query(BookingProfile).first()
    if not profile:
        profile = BookingProfile(
            username="me",
            timezone="UTC",
            timezone_auto_detect=True,
            custom_branding_enabled=False,
            language="en",
        )
        db.add(profile)
        db.flush()
    if body.username is not None:
        existing = db.query(BookingProfile).filter(
            BookingProfile.username == body.username,
            BookingProfile.id != profile.id,
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Username already taken")
        profile.username = body.username
    if body.profile_photo_url is not None:
        profile.profile_photo_url = body.profile_photo_url
    if body.bio is not None:
        profile.bio = body.bio
    if body.timezone is not None:
        profile.timezone = body.timezone
    if body.timezone_auto_detect is not None:
        profile.timezone_auto_detect = body.timezone_auto_detect
    if body.social_links is not None:
        profile.social_links = body.social_links
    if body.custom_branding_enabled is not None:
        profile.custom_branding_enabled = body.custom_branding_enabled
    if body.hidden_event_type_ids is not None:
        profile.hidden_event_type_ids = body.hidden_event_type_ids
    if body.custom_url_slug is not None:
        profile.custom_url_slug = body.custom_url_slug
    if body.custom_domain is not None:
        profile.custom_domain = body.custom_domain
    if body.seo_title is not None:
        profile.seo_title = body.seo_title
    if body.seo_description is not None:
        profile.seo_description = body.seo_description
    if body.seo_image_url is not None:
        profile.seo_image_url = body.seo_image_url
    if body.language is not None:
        profile.language = body.language
    if body.embed_primary_color is not None:
        profile.embed_primary_color = body.embed_primary_color
    if body.embed_layout is not None:
        profile.embed_layout = body.embed_layout
    if body.embed_type is not None:
        profile.embed_type = body.embed_type
    profile.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(profile)
    return _profile_to_response(profile)
