"""Custom field definitions for subscribers (MailerLite-style). Subscriber.custom_fields JSONB keys can match these."""
from sqlalchemy import Column, DateTime, Integer, String
from sqlalchemy.sql import func

from app.database import Base


class SubscriberFieldDefinition(Base):
    __tablename__ = "subscriber_field_definitions"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(64), unique=True, nullable=False, index=True)  # slug used in custom_fields JSON
    title = Column(String(255), nullable=False)  # display name
    field_type = Column(String(16), nullable=False, server_default="text")  # text | number | date
    created_at = Column(DateTime(timezone=True), server_default=func.now())
