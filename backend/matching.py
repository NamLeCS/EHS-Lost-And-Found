from __future__ import annotations

from difflib import SequenceMatcher
from sqlalchemy.orm import Session

from .models import MissingReport, FoundItem, Match


MATCH_THRESHOLD = 0.35


def _normalize(value: str | None) -> str:
    return (value or "").strip().lower()


def _token_set(value: str | None) -> set[str]:
    text = _normalize(value)
    if not text:
        return set()
    return {token for token in text.replace(',', ' ').split() if token}


def _text_similarity(a: str | None, b: str | None) -> float:
    a_norm = _normalize(a)
    b_norm = _normalize(b)
    if not a_norm or not b_norm:
        return 0.0
    if a_norm == b_norm:
        return 1.0

    a_tokens = _token_set(a_norm)
    b_tokens = _token_set(b_norm)
    jaccard = 0.0
    if a_tokens and b_tokens:
        jaccard = len(a_tokens & b_tokens) / len(a_tokens | b_tokens)

    ratio = SequenceMatcher(None, a_norm, b_norm).ratio()
    return max(jaccard, ratio)


def score_match(report: MissingReport, item: FoundItem) -> float:
    """
    Computes a heuristic match score between a missing report and a found item.
    Returns a value between 0.0 and 1.0.
    """
    weights = {
        "category": 0.30,
        "brand": 0.18,
        "colors": 0.16,
        "description": 0.14,
        "location": 0.12,
        "time": 0.10,
    }

    weighted_score = sum(
        weights[field] * _text_similarity(getattr(report, field), getattr(item, field))
        for field in weights
    )
    return round(weighted_score, 4)


def _upsert_match(db: Session, report: MissingReport, item: FoundItem, score: float) -> None:
    existing = db.query(Match).filter(
        Match.missing_report_id == report.id,
        Match.found_item_id == item.id,
    ).first()

    if score < MATCH_THRESHOLD:
        if existing:
            db.delete(existing)
        return

    if existing:
        existing.score = score
        existing.status = "SUGGESTED"
    else:
        db.add(Match(
            missing_report_id=report.id,
            found_item_id=item.id,
            score=score,
            status="SUGGESTED",
        ))


def on_missing_report_created(db: Session, report_id: int) -> None:
    """
    Creates or updates matches for a newly created missing report.
    """
    report = db.get(MissingReport, report_id)
    if not report:
        return

    found_items = db.query(FoundItem).filter(FoundItem.status == "UNCLAIMED").all()
    for item in found_items:
        _upsert_match(db, report, item, score_match(report, item))

    db.commit()


def on_found_item_created(db: Session, item_id: int) -> None:
    """
    Creates or updates matches for a newly created found item.
    """
    item = db.get(FoundItem, item_id)
    if not item:
        return

    reports = db.query(MissingReport).filter(MissingReport.status == "ACTIVE").all()
    for report in reports:
        _upsert_match(db, report, item, score_match(report, item))

    db.commit()