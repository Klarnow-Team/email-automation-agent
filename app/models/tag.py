from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class Tag(Base):
    __tablename__ = "tags"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    subscriber_assocs = relationship(
        "SubscriberTag", back_populates="tag", cascade="all, delete-orphan"
    )


class SubscriberTag(Base):
    __tablename__ = "subscriber_tags"

    id = Column(Integer, primary_key=True, index=True)
    subscriber_id = Column(Integer, ForeignKey("subscribers.id", ondelete="CASCADE"), nullable=False)
    tag_id = Column(Integer, ForeignKey("tags.id", ondelete="CASCADE"), nullable=False)

    tag = relationship("Tag", back_populates="subscriber_assocs")
    subscriber = relationship("Subscriber", back_populates="tag_assocs")
