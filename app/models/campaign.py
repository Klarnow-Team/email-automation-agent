import enum
from sqlalchemy import Column, DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class CampaignStatus(str, enum.Enum):
    draft = "draft"
    sending = "sending"
    sent = "sent"


class Campaign(Base):
    __tablename__ = "campaigns"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    subject = Column(String(500), nullable=False)
    html_body = Column(Text, nullable=False)
    plain_body = Column(Text, nullable=True)  # optional plain-text version
    status = Column(Enum(CampaignStatus), default=CampaignStatus.draft, nullable=False)
    sent_at = Column(DateTime(timezone=True), nullable=True)
    scheduled_at = Column(DateTime(timezone=True), nullable=True)
    ab_subject_b = Column(String(500), nullable=True)
    ab_html_body_b = Column(Text, nullable=True)
    ab_split_percent = Column(Integer, default=0, nullable=False)  # 0 = no A/B; 50 = 50/50
    ab_winner = Column(String(1), nullable=True)  # 'a' | 'b' | null
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    recipients = relationship("CampaignRecipient", back_populates="campaign")


class CampaignRecipient(Base):
    __tablename__ = "campaign_recipients"

    id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(Integer, ForeignKey("campaigns.id", ondelete="CASCADE"), nullable=False)
    subscriber_id = Column(Integer, ForeignKey("subscribers.id", ondelete="CASCADE"), nullable=False)
    sent_at = Column(DateTime(timezone=True), nullable=True)
    variant = Column(String(1), nullable=True)  # 'a' | 'b' for A/B tests

    campaign = relationship("Campaign", back_populates="recipients")
    subscriber = relationship("Subscriber", back_populates="campaign_recipients")
