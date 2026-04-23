from dotenv import load_dotenv
load_dotenv() 
from types import SimpleNamespace

from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr, Field
# py -3.12 -m uvicorn backend.main:app --reload --port 8000
from .db import init_db, get_db
from .models import MissingReport, FoundItem, Match, Claim
from .auth import register_user, login_user, get_current_user, require_admin
from .matching import on_missing_report_created, on_found_item_created, score_match

app = FastAPI(title="EHS Lost & Found Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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
    category: str = ""
    brand: str = ""
    colors: str = ""
    description: str = ""
    location: str = ""
    time: str = ""


class FoundIn(MissingIn):
    pass


class ItemSearchIn(BaseModel):
    category: str = ""
    brand: str = ""
    colors: str = ""
    description: str = ""
    location: str = ""
    time: str = ""
    limit: int = Field(default=5, ge=1, le=25)


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
    Logs user in and returns auth token plus user profile (id, email, role).
    """
    token, user = login_user(db, payload.email, payload.password)
    return {
        "token": token,
        "user": {"id": user.id, "email": user.email, "role": user.role},
    }


# ---------- STUDENT + ADMIN ----------
@app.post("/missing-reports")
def create_missing(
    payload: MissingIn,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    """
    Students can report items they lost.
    Admins can also create missing reports.
    After saving, the backend automatically generates matches.
    """
    report = MissingReport(user_id=user.id, **payload.model_dump())
    db.add(report)
    db.commit()
    db.refresh(report)

    on_missing_report_created(db, report.id)

    return {"report_id": report.id, "status": report.status}

@app.post("/found-items")
def create_found_item(
    payload: FoundIn,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    """
    Admins use this to log items found on campus.
    Once saved, it automatically triggers the matching engine.
    """
    require_admin(user)

    item = FoundItem(**payload.model_dump(), status="UNCLAIMED")
    db.add(item)
    db.commit()
    db.refresh(item)

    on_found_item_created(db, item.id)

    return {"item_id": item.id, "status": item.status}

@app.get("/found-items")
def list_found_items(
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """
    Returns all found items in the system.
    """
    items = db.query(FoundItem).order_by(FoundItem.id.desc()).all()
    return items

@app.get("/missing-reports")
def get_all_reports(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    reports = (
        db.query(MissingReport)

        .order_by(MissingReport.id.desc())
        .all()
    )
    
    return [
        {
            "id": r.id,
            "user_id": r.user_id,
            "category": r.category,
            "brand": r.brand,
            "colors": r.colors,
            "description": r.description,
            "location": r.location,
            "time": r.time,
            "status": r.status,
        }
        for r in reports
    ]


@app.post("/search-found-items")
def search_found_items(
    payload: ItemSearchIn,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    """
    Students describe what they lost and receive the most similar found items.
    This does not create a missing report; it is only a quick search endpoint.
    """
    del user  

    search_report = SimpleNamespace(
        category=payload.category,
        brand=payload.brand,
        colors=payload.colors,
        description=payload.description,
        location=payload.location,
        time=payload.time,
    )

    found_items = (
        db.query(FoundItem)
        .filter(FoundItem.status == "UNCLAIMED")
        .order_by(FoundItem.id.desc())
        .all()
    )

    ranked = []
    for item in found_items:
        score = score_match(search_report, item)
        if score > 0:
            ranked.append(
                {
                    "id": item.id,
                    "category": item.category,
                    "brand": item.brand,
                    "colors": item.colors,
                    "description": item.description,
                    "location": item.location,
                    "time": item.time,
                    "status": item.status,
                    "similarity_score": score,
                    "collection_note": f"Go to {item.location or 'the lost and found desk'} to collect this item.",
                }
            )

    ranked.sort(key=lambda item: item["similarity_score"], reverse=True)
    return ranked[: payload.limit]


@app.get("/matches/{report_id}")
def get_matches(
    report_id: int, 
    db: Session = Depends(get_db)
):
    """
    Returns matches for a given missing report.
    Publicly accessible - no ownership check.
    """
    report = db.get(MissingReport, report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Missing report not found")

  

    matches = (
        db.query(Match)
        .filter(Match.missing_report_id == report_id)
        .order_by(Match.score.desc())
        .all()
    )

    results = []
    for match in matches:
        found_item = db.get(FoundItem, match.found_item_id)
        results.append(
            {
                "id": match.id,
                "found_item_id": match.found_item_id,
                "score": match.score,
                "status": match.status,
                "found_item": None
                if not found_item
                else {
                    "category": found_item.category,
                    "brand": found_item.brand,
                    "colors": found_item.colors,
                    "description": found_item.description,
                    "location": found_item.location,
                    "time": found_item.time,
                    "item_status": found_item.status,
                    "collection_note": f"Go to {found_item.location or 'the lost and found desk'} to collect this item.",
                },
            }
        )

    return results


@app.post("/claims")
def create_claim(
    payload: ClaimIn,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    """
    Creates a claim for a matched item.
    """
    match = db.get(Match, payload.match_id)
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    report = db.get(MissingReport, match.missing_report_id)
    if not report or report.user_id != user.id:
        raise HTTPException(status_code=403, detail="You can only claim your own matched reports")

    existing_claim = (
        db.query(Claim)
        .filter(Claim.match_id == payload.match_id, Claim.user_id == user.id)
        .first()
    )
    if existing_claim:
        raise HTTPException(status_code=400, detail="Claim already exists for this match")

    claim = Claim(
        match_id=payload.match_id,
        user_id=user.id,
        answers_json=payload.answers_json,
    )

    db.add(claim)
    db.commit()
    db.refresh(claim)

    return {"claim_id": claim.id, "status": claim.status}


@app.get("/claims")
def list_my_claims(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """
    Returns all claims submitted by the logged-in user (newest first).
    """
    rows = (
        db.query(Claim, Match)
        .join(Match, Claim.match_id == Match.id)
        .filter(Claim.user_id == user.id)
        .order_by(Claim.id.desc())
        .all()
    )
    return [
        {
            "claim_id": claim.id,
            "match_id": claim.match_id,
            "report_id": match_row.missing_report_id,
            "status": claim.status,
        }
        for claim, match_row in rows
    ]


@app.patch("/claims/{claim_id}")
def update_claim(
    claim_id: int,
    status: str = Query(..., pattern="^(APPROVED|DENIED|PENDING)$"),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    """
    Admin updates claim status.
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

@app.get("/claims/admin")
def get_all_claims_for_admin(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """
    Returns all claims for admin review.
    """
    require_admin(user)
    

    claims = db.query(Claim).order_by(Claim.id.desc()).all()
    
    results = []
    for c in claims:
        match = db.get(Match, c.match_id)
        results.append({
            "claim_id": c.id,
            "match_id": c.match_id,
            "report_id": match.missing_report_id if match else 0,
            "user_id": c.user_id,
            "status": c.status,
            "createdAt": c.created_at.isoformat() if hasattr(c, 'created_at') else "2024-01-01T00:00:00Z"
        })
    return results