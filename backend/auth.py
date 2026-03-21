import hashlib
import secrets
from fastapi import Header, HTTPException, Depends
from sqlalchemy.orm import Session
from .models import User
from .db import get_db


def hash_pw(password: str) -> str:
    """
    Hashes a password using SHA256.
    This prevents storing plain-text passwords.
    """
    return hashlib.sha256(password.encode()).hexdigest()


VALID_ROLES = {"student", "admin"}


def register_user(db: Session, email: str, password: str, role: str = "student"):
    """
    Creates a new user.

    1. Checks if email already exists
    2. Hashes password
    3. Saves user to database
    """
    role = (role or "student").lower()
    if role not in VALID_ROLES:
        raise HTTPException(status_code=400, detail="Invalid role")

    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        email=email,
        password_hash=hash_pw(password),
        role=role
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return user


def login_user(db: Session, email: str, password: str) -> tuple[str, User]:
    """
    Logs a user in.

    1. Finds user by email
    2. Verifies password hash
    3. Generates authentication token
    4. Stores token in database
    """
    user = db.query(User).filter(User.email == email).first()

    if not user or user.password_hash != hash_pw(password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = secrets.token_urlsafe(24)
    user.token = token

    db.commit()
    db.refresh(user)

    return token, user


def get_current_user(
    authorization: str = Header(default=None),
    db: Session = Depends(get_db),
):
    """
    Extracts and verifies Bearer token from request header.

    Header format:
    Authorization: Bearer <token>

    Returns the logged-in user.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")

    token = authorization.split(" ", 1)[1]

    user = db.query(User).filter(User.token == token).first()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")

    return user


def require_admin(user: User):
    """
    Ensures only admin users can perform certain actions.
    """
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")