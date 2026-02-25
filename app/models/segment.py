from sqlalchemy import Column, DateTime, Integer, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func

from app.database import Base


class Segment(Base):
    __tablename__ = "segments"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    rules = Column(JSONB, nullable=True)  # list of {field, op, value} or {and/or, conditions}
    created_at = Column(DateTime(timezone=True), server_default=func.now())
