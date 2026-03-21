"""
Delete all missing reports and dependent rows (matches, claims).

Run from the repository root (same cwd you use for uvicorn) so the SQLite
path matches backend/db.py:

    python -m backend.clear_reports
"""
from sqlalchemy.orm import Session

from .db import SessionLocal
from .models import Claim, Match, MissingReport


def clear_all(session: Session) -> tuple[int, int, int]:
    n_claims = session.query(Claim).delete()
    n_matches = session.query(Match).delete()
    n_reports = session.query(MissingReport).delete()
    session.commit()
    return n_claims, n_matches, n_reports


def main() -> None:
    db = SessionLocal()
    try:
        c, m, r = clear_all(db)
        print(f"Deleted claims={c}, matches={m}, missing_reports={r}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
