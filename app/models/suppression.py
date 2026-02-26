import enum
from sqlalchemy import Column, DateTime, Enum, Integer, String
from sqlalchemy.sql import func

from app.database import Base


class SuppressionType(str, enum.Enum):
    email = "email"
    domain = "domain"


class SuppressionEntry(Base):
    __tablename__ = "suppression_list"

    id = Column(Integer, primary_key=True, index=True)
    type = Column(Enum(SuppressionType), nullable=False)
    value = Column(String(255), nullable=False)  # email or domain (e.g. @example.com -> example.com)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
