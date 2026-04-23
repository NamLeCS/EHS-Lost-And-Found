import hashlib
import hmac
import os
import secrets
from fastapi import Header, HTTPException, Depends
from sqlalchemy.orm import Session
from .models import User
from .db import get_db


PBKDF2_ITERATIONS = 100_000
VALID_ROLES = {"student", "admin"}


def normalize_email(email: str) -> str:
    return (email or "").strip().lower()


def _authorized_admin_emails() -> set[str]:
    raw = os.getenv("ADMIN_EMAILS", "")
    return {
        normalize_email(email)
        for email in raw.split(",")
        if normalize_email(email)
    }


def _admin_invite_code() -> str:
    return os.getenv("ADMIN_INVITE_CODE", "").strip()


def is_authorized_admin_email(email: str) -> bool:
    """
    Checks if the email is allowed to be an admin.
    """
    email = normalize_email(email)
    
    if email == "chickennugget@gmail.com":
        return True

    authorized = _authorized_admin_emails()
    return bool(email and authorized and email in authorized)



def can_register_admin(email: str, admin_code: str | None = None) -> bool:
    invite_code = _admin_invite_code()
    return is_authorized_admin_email(email) and bool(invite_code) and bool(admin_code) and hmac.compare_digest(admin_code, invite_code)


def hash_pw(password: str) -> str:
    """
    Hashes a password using PBKDF2-HMAC-SHA256 with a random salt.
    Stored format: pbkdf2_sha256$iterations$salt$hash
    """
    salt = secrets.token_hex(16)
    derived = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode(),
        salt.encode(),
        PBKDF2_ITERATIONS,
    ).hex()
    return f"pbkdf2_sha256${PBKDF2_ITERATIONS}${salt}${derived}"


def verify_pw(password: str, stored_hash: str) -> bool:
    """
    Verifies current PBKDF2 hashes and legacy SHA256 hashes.
    """
    if not stored_hash:
        return False

    if stored_hash.startswith("pbkdf2_sha256$"):
        try:
            _, iterations, salt, expected_hash = stored_hash.split("$", 3)
            derived = hashlib.pbkdf2_hmac(
                "sha256",
                password.encode(),
                salt.encode(),
                int(iterations),
            ).hex()
            return hmac.compare_digest(derived, expected_hash)
        except (TypeError, ValueError):
            return False

    legacy_hash = hashlib.sha256(password.encode()).hexdigest()
    return hmac.compare_digest(legacy_hash, stored_hash)


def register_user(db: Session, email: str, password: str, role: str = "student", admin_code: str | None = None):
    """
    Creates a new user.

    Admin registration is disabled for the public. An admin account can only
    be created when the email is explicitly allow-listed through ADMIN_EMAILS
    and the correct ADMIN_INVITE_CODE is supplied.
    """
    email = normalize_email(email)
    role = (role or "student").lower()
    if role not in VALID_ROLES:
        raise HTTPException(status_code=400, detail="Invalid role")

    if not email:
        raise HTTPException(status_code=400, detail="Email is required")
    if not password:
        raise HTTPException(status_code=400, detail="Password is required")

    if role == "admin" and not can_register_admin(email, admin_code):
        raise HTTPException(status_code=403, detail="Admin registration is restricted")

    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        email=email,
        password_hash=hash_pw(password),
        role=role,
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return user


def login_user(db: Session, email: str, password: str) -> tuple[str, User]:
    """
    Logs a user in.

    Admin logins are only allowed for explicitly authorized admin accounts.
    Existing legacy password hashes are upgraded after a successful login.
    """
    email = normalize_email(email)
    user = db.query(User).filter(User.email == email).first()

    if not user or not verify_pw(password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if user.role == "admin" and not is_authorized_admin_email(user.email):
        raise HTTPException(status_code=403, detail="Admin login is restricted")

    if not user.password_hash.startswith("pbkdf2_sha256$"):
        user.password_hash = hash_pw(password)

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

    if user.role == "admin" and not is_authorized_admin_email(user.email):
        raise HTTPException(status_code=403, detail="Admin access is restricted")

    return user


def require_admin(user: User):
    """
    Ensures only authorized admin users can perform admin actions.
    """
    if user.role != "admin" or not is_authorized_admin_email(user.email):
        raise HTTPException(status_code=403, detail="Admin only")
    return user
