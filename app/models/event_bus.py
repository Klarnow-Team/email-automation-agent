from sqlalchemy import Boolean, Column, DateTime, Integer, String
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.sql import func

from app.database import Base


class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    event_type = Column(String(64), nullable=False, index=True)
    payload = Column(JSONB, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class WebhookSubscription(Base):
    __tablename__ = "webhook_subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    url = Column(String(2048), nullable=False)
    event_types = Column(ARRAY(String(64)), nullable=True)  # None = all events
    enabled = Column(Boolean, default=True, nullable=False)
    secret = Column(String(255), nullable=True)  # optional: HMAC signing key
    created_at = Column(DateTime(timezone=True), server_default=func.now())
