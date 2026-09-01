from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timezone, timedelta

from database import get_db
from models import User, Word, WordCard, EnglishWord, EnglishWordCard, JapaneseWord, JapaneseWordCard
from auth_utils import get_current_user

router = APIRouter(prefix="/stats", tags=["stats"])

HSK_LEVELS = [3, 4, 5, 6]
EN_LEVELS  = ["A1", "A2", "B1", "B2", "C1"]
JA_LEVELS  = ["N5", "N4", "N3", "N2", "N1"]


def calc_streak(last_reviews: list[datetime]) -> int:
    if not last_reviews:
        return 0
    today = datetime.now(timezone.utc).date()
    dates = sorted({r.date() for r in last_reviews if r}, reverse=True)
    streak = 0
    expected = today
    for d in dates:
        if d == expected or d == expected - timedelta(days=1) and streak == 0:
            streak += 1
            expected = d - timedelta(days=1)
        elif d < expected:
            break
    return streak


@router.get("/overview")
def get_overview(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    # ── 중국어 ──
    zh_cards = db.query(WordCard).filter(WordCard.user_id == user.id).all()
    zh_today = sum(1 for c in zh_cards if c.last_review and c.last_review >= today_start)
    zh_streak = calc_streak([c.last_review for c in zh_cards if c.last_review])

    zh_levels = []
    for lvl in HSK_LEVELS:
        words = db.query(Word).filter(Word.hsk_level == lvl).all()
        wids = {w.id for w in words}
        cards = [c for c in zh_cards if c.word_id in wids]
        reviewed = len({c.word_id for c in cards if c.reps > 0})
        mastered = sum(1 for c in cards if c.state == 2)  # Review state
        zh_levels.append({
            "level": f"HSK {lvl}",
            "total": len(words),
            "reviewed": reviewed,
            "mastered": mastered,
        })

    # ── 영어 ──
    en_cards = db.query(EnglishWordCard).filter(EnglishWordCard.user_id == user.id).all()
    en_today = sum(1 for c in en_cards if c.last_review and c.last_review >= today_start)
    en_streak = calc_streak([c.last_review for c in en_cards if c.last_review])

    en_levels = []
    for lvl in EN_LEVELS:
        words = db.query(EnglishWord).filter(EnglishWord.level == lvl).all()
        wids = {w.id for w in words}
        cards = [c for c in en_cards if c.word_id in wids]
        reviewed = len({c.word_id for c in cards if c.reps > 0})
        mastered = sum(1 for c in cards if c.state == 2)
        en_levels.append({
            "level": lvl,
            "total": len(words),
            "reviewed": reviewed,
            "mastered": mastered,
        })

    # ── 일본어 ──
    ja_cards = db.query(JapaneseWordCard).filter(JapaneseWordCard.user_id == user.id).all()
    ja_today = sum(1 for c in ja_cards if c.last_review and c.last_review >= today_start)
    ja_streak = calc_streak([c.last_review for c in ja_cards if c.last_review])

    ja_levels = []
    for lvl in JA_LEVELS:
        words = db.query(JapaneseWord).filter(JapaneseWord.jlpt_level == lvl).all()
        wids = {w.id for w in words}
        cards = [c for c in ja_cards if c.word_id in wids]
        reviewed = len({c.word_id for c in cards if c.reps > 0})
        mastered = sum(1 for c in cards if c.state == 2)
        ja_levels.append({
            "level": lvl,
            "total": len(words),
            "reviewed": reviewed,
            "mastered": mastered,
        })

    return {
        "zh_streak": zh_streak,
        "en_streak": en_streak,
        "ja_streak": ja_streak,
        "zh_today": zh_today,
        "en_today": en_today,
        "ja_today": ja_today,
        "zh_levels": zh_levels,
        "en_levels": en_levels,
        "ja_levels": ja_levels,
    }


@router.get("/history")
def get_history(days: int = 90, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """최근 N일 일별 복습 단어 수 반환 (히트맵용)"""
    now = datetime.now(timezone.utc)
    start = (now - timedelta(days=days - 1)).replace(hour=0, minute=0, second=0, microsecond=0)

    counts: dict[str, int] = {}
    for CardModel in [WordCard, EnglishWordCard, JapaneseWordCard]:
        rows = db.query(CardModel.last_review).filter(
            CardModel.user_id == user.id,
            CardModel.last_review.isnot(None),
            CardModel.last_review >= start,
        ).all()
        for (dt,) in rows:
            if dt:
                d = dt.astimezone(timezone.utc).date().isoformat()
                counts[d] = counts.get(d, 0) + 1

    result = []
    for i in range(days):
        d = (start + timedelta(days=i)).date().isoformat()
        result.append({"date": d, "count": counts.get(d, 0)})
    return result
