from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class Group(Base):
    __tablename__ = "groups"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    subscriber_assocs = relationship(
        "SubscriberGroup", back_populates="group", cascade="all, delete-orphan"
    )


class SubscriberGroup(Base):
    __tablename__ = "subscriber_groups"

    id = Column(Integer, primary_key=True, index=True)
    subscriber_id = Column(Integer, ForeignKey("subscribers.id", ondelete="CASCADE"), nullable=False)
    group_id = Column(Integer, ForeignKey("groups.id", ondelete="CASCADE"), nullable=False)

    group = relationship("Group", back_populates="subscriber_assocs")
    subscriber = relationship("Subscriber", back_populates="group_assocs")
