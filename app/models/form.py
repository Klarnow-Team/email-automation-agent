from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class Form(Base):
    __tablename__ = "forms"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    form_type = Column(String(32), default="embed", nullable=False)  # embed | popup | slide_in | landing
    fields = Column(JSONB, nullable=False, server_default="[]")  # [{"key": "email", "type": "email", "label": "...", "required": true}, ...]
    success_message = Column(Text, nullable=True)
    redirect_url = Column(String(500), nullable=True)
    add_to_group_id = Column(Integer, ForeignKey("groups.id", ondelete="SET NULL"), nullable=True)
    trigger_automation_id = Column(Integer, ForeignKey("automations.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    submissions = relationship("FormSubmission", back_populates="form", cascade="all, delete-orphan")


class FormSubmission(Base):
    __tablename__ = "form_submissions"

    id = Column(Integer, primary_key=True, index=True)
    form_id = Column(Integer, ForeignKey("forms.id", ondelete="CASCADE"), nullable=False)
    subscriber_id = Column(Integer, ForeignKey("subscribers.id", ondelete="SET NULL"), nullable=True)
    payload = Column(JSONB, nullable=False, server_default="{}")  # submitted field values
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    form = relationship("Form", back_populates="submissions")
    subscriber = relationship("Subscriber", back_populates="form_submissions")
