import enum
from sqlalchemy import Column, DateTime, Enum, Integer, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class SubscriberStatus(str, enum.Enum):
    active = "active"
    unsubscribed = "unsubscribed"


class Subscriber(Base):
    __tablename__ = "subscribers"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=True)
    status = Column(Enum(SubscriberStatus), default=SubscriberStatus.active, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    campaign_recipients = relationship("CampaignRecipient", back_populates="subscriber")
    automation_runs = relationship("AutomationRun", back_populates="subscriber")
