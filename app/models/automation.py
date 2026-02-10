from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import JSONB

from app.database import Base


class Automation(Base):
    __tablename__ = "automations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    trigger_type = Column(String(64), nullable=False)  # e.g. subscriber_added
    is_active = Column(Integer, default=1, nullable=False)  # 1 = active, 0 = inactive
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    steps = relationship("AutomationStep", back_populates="automation", order_by="AutomationStep.order")
    runs = relationship("AutomationRun", back_populates="automation")


class AutomationStep(Base):
    __tablename__ = "automation_steps"

    id = Column(Integer, primary_key=True, index=True)
    automation_id = Column(Integer, ForeignKey("automations.id", ondelete="CASCADE"), nullable=False)
    order = Column(Integer, nullable=False)  # 0-based
    step_type = Column(String(32), nullable=False)  # email | delay
    payload = Column(JSONB, nullable=True)  # { "subject", "html" } or { "delay_minutes": 60 }

    automation = relationship("Automation", back_populates="steps")


class AutomationRun(Base):
    __tablename__ = "automation_runs"

    id = Column(Integer, primary_key=True, index=True)
    automation_id = Column(Integer, ForeignKey("automations.id", ondelete="CASCADE"), nullable=False)
    subscriber_id = Column(Integer, ForeignKey("subscribers.id", ondelete="CASCADE"), nullable=False)
    current_step = Column(Integer, default=0, nullable=False)  # index into steps
    status = Column(String(32), default="running", nullable=False)  # running | completed | failed
    started_at = Column(DateTime(timezone=True), server_default=func.now())

    automation = relationship("Automation", back_populates="runs")
    subscriber = relationship("Subscriber", back_populates="automation_runs")
