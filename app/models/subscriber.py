import enum
from sqlalchemy import Column, DateTime, Enum, Integer, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class SubscriberStatus(str, enum.Enum):
    active = "active"
    unsubscribed = "unsubscribed"
    bounced = "bounced"
    suppressed = "suppressed"


class Subscriber(Base):
    __tablename__ = "subscribers"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=True)
    status = Column(Enum(SubscriberStatus), default=SubscriberStatus.active, nullable=False)
    custom_fields = Column(JSONB, nullable=False, server_default="{}")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    consent_ip = Column(String(45), nullable=True)
    consented_at = Column(DateTime(timezone=True), nullable=True)
    source_form_id = Column(Integer, nullable=True)

    campaign_recipients = relationship(
        "CampaignRecipient", back_populates="subscriber", cascade="all, delete-orphan"
    )
    automation_runs = relationship(
        "AutomationRun", back_populates="subscriber", cascade="all, delete-orphan"
    )
    group_assocs = relationship(
        "SubscriberGroup", back_populates="subscriber", cascade="all, delete-orphan"
    )
    tag_assocs = relationship(
        "SubscriberTag", back_populates="subscriber", cascade="all, delete-orphan"
    )
    form_submissions = relationship(
        "FormSubmission", back_populates="subscriber"
    )
