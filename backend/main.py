from fastapi import FastAPI, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr

from .db import init_db, get_db
from .models import MissingReport, FoundItem, Match, Claim
from .auth import register_user, login_user, get_current_user, require_admin
from .matching import on_missing_report_created, on_found_item_created

app = FastAPI(title="EHS Lost & Found Backend")


@app.on_event("startup")
def startup():
    """
    Runs once when server starts.
    Initializes database tables.
    """
    init_db()


# ---------- Schemas ----------
class RegisterIn(BaseModel):
    email: EmailStr
    password: str
    role: str = "student"
    admin_code: str | None = None


class LoginIn(BaseModel):
    email: EmailStr
    password: str
    admin_code: str | None = None


class MissingIn(BaseModel):
    category: str
    brand: str = ""
    colors: str = ""
    description: str = ""
    location: str = ""
    time: str = ""


class FoundIn(MissingIn):
    pass


class ClaimIn(BaseModel):
    match_id: int
    answers_json: str = "{}"


# ---------- AUTH ----------
@app.post("/register")
def register(payload: RegisterIn, db: Session = Depends(get_db)):
    """
    Creates new user.
    Public users can only self-register as students.
    """
    user = register_user(db, payload.email, payload.password, payload.role, payload.admin_code)
    return {"id": user.id, "email": user.email, "role": user.role}


@app.post("/login")
def login(payload: LoginIn, db: Session = Depends(get_db)):
    """
    Logs user in and returns auth token.
    Admin login requires authorization via backend configuration.
    """
    token = login_user(db, payload.email, payload.password, payload.admin_code)
    return {"token": token}


# ---------- REQUIRED ENDPOINTS ----------
@app.post("/missing-reports")
def create_missing(payload: MissingIn, db: Session = Depends(get_db),
                   user=Depends(get_current_user)):
    """
    Creates missing report and triggers matching engine.
    """
    report = MissingReport(user_id=user.id, **payload.model_dump())
    db.add(report)
    db.commit()
    db.refresh(report)

    # Event trigger
    on_missing_report_created(db, report.id)

    return {"report_id": report.id}


@app.post("/found-items")
def create_found(payload: FoundIn, db: Session = Depends(get_db)):
    """
    Creates found item and triggers matching engine.
    """
    item = FoundItem(**payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)

    on_found_item_created(db, item.id)

    return {"found_item_id": item.id}


@app.get("/matches/{report_id}")
def get_matches(report_id: int, db: Session = Depends(get_db),
                user=Depends(get_current_user)):
    """
    Returns matches for a given missing report.
    Only the report owner or an admin can access them.
    """
    report = db.get(MissingReport, report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Missing report not found")
    if user.role != "admin" and report.user_id != user.id:
        raise HTTPException(status_code=403, detail="Not allowed to view these matches")

    matches = db.query(Match).filter(
        Match.missing_report_id == report_id
    ).order_by(Match.score.desc()).all()

    return [
        {"id": m.id, "found_item_id": m.found_item_id, "score": m.score, "status": m.status}
        for m in matches
    ]


@app.post("/claims")
def create_claim(payload: ClaimIn, db: Session = Depends(get_db),
                 user=Depends(get_current_user)):
    """
    Creates a claim for a matched item.
    """
    match = db.get(Match, payload.match_id)
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    report = db.get(MissingReport, match.missing_report_id)
    if not report or report.user_id != user.id:
        raise HTTPException(status_code=403, detail="You can only claim your own matched reports")

    existing_claim = db.query(Claim).filter(Claim.match_id == payload.match_id, Claim.user_id == user.id).first()
    if existing_claim:
        raise HTTPException(status_code=400, detail="Claim already exists for this match")

    claim = Claim(
        match_id=payload.match_id,
        user_id=user.id,
        answers_json=payload.answers_json
    )

    db.add(claim)
    db.commit()
    db.refresh(claim)

    return {"claim_id": claim.id, "status": claim.status}


@app.patch("/claims/{claim_id}")
def update_claim(
    claim_id: int,
    status: str = Query(..., pattern="^(APPROVED|DENIED|PENDING)$"),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    """
    Admin updates claim status (APPROVED or DENIED).
    """
    require_admin(user)

    claim = db.get(Claim, claim_id)
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")

    claim.status = status

    match = db.get(Match, claim.match_id)
    if status == "APPROVED" and match:
        match.status = "CLAIMED"
        found_item = db.get(FoundItem, match.found_item_id)
        missing_report = db.get(MissingReport, match.missing_report_id)
        if found_item:
            found_item.status = "CLAIMED"
        if missing_report:
            missing_report.status = "RESOLVED"

    db.commit()

    return {"claim_id": claim.id, "status": claim.status}


@app.get("/health")
def healthcheck():
    return {"ok": True}
