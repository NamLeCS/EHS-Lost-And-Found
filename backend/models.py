from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import Column, Integer, String, Float, ForeignKey, Text

class Base(DeclarativeBase):
    """
    Base class required by SQLAlchemy.
    All database tables inherit from this.
    """
    pass


class User(Base):
    """
    Stores users for authentication.
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    email = Column(String, unique=True, index=True)
    password_hash = Column(String)
    role = Column(String, default="student")  # student or admin
    token = Column(String, unique=True, nullable=True)


class MissingReport(Base):
    """
    Stores items reported as missing.
    """
    __tablename__ = "missing_reports"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    category = Column(String)
    brand = Column(String, default="")
    colors = Column(String, default="")
    description = Column(Text, default="")
    location = Column(String, default="")
    time = Column(String, default="")
    status = Column(String, default="ACTIVE")


class FoundItem(Base):
    """
    Stores items reported as found.
    """
    __tablename__ = "found_items"

    id = Column(Integer, primary_key=True)
    category = Column(String)
    brand = Column(String, default="")
    colors = Column(String, default="")
    description = Column(Text, default="")
    location = Column(String, default="")
    time = Column(String, default="")
    status = Column(String, default="UNCLAIMED")


class Match(Base):
    """
    Stores potential matches between missing and found items.
    """
    __tablename__ = "matches"

    id = Column(Integer, primary_key=True)
    missing_report_id = Column(Integer, ForeignKey("missing_reports.id"))
    found_item_id = Column(Integer, ForeignKey("found_items.id"))
    score = Column(Float, default=0.0)
    status = Column(String, default="SUGGESTED")


class Claim(Base):
    """
    Stores user claims on a matched item.
    """
    __tablename__ = "claims"

    id = Column(Integer, primary_key=True)
    match_id = Column(Integer, ForeignKey("matches.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    answers_json = Column(Text, default="{}")
    status = Column(String, default="PENDING")