import random
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone

from fsrs import Scheduler, Card, Rating, State

from database import get_db
from models import EnglishWord, EnglishWordCard, User
from auth_utils import get_current_user
from review_policy import DEFAULT_NEW_LIMIT, DEFAULT_REVIEW_LIMIT, apply_minimum_spacing, build_review_session, sort_review_queue
from translation_utils import translate_ko_to_zh

router = APIRouter(prefix="/english-words", tags=["english-words"])
scheduler = Scheduler()


class ReviewRequest(BaseModel):
    knew: bool


def _card_from_db(wc: EnglishWordCard) -> Card:
    c = Card()
    if wc.reps == 0 or wc.state == 0:
        return c
    c.state = State(wc.state)
    c.step = wc.step or 0
    c.stability = wc.stability or 0.0
    c.difficulty = wc.difficulty or 0.0
    c.due = wc.due
    c.last_review = wc.last_review
    return c


def _sync_card_to_db(wc: EnglishWordCard, c: Card, lapses_delta: int = 0):
    wc.state = c.state.value
    wc.step = c.step
    wc.stability = c.stability
    wc.difficulty = c.difficulty
    wc.due = c.due
    wc.last_review = c.last_review
    wc.reps += 1
    wc.lapses += lapses_delta


def _word_with_card(word: EnglishWord, wc: Optional[EnglishWordCard]) -> dict:
    now = datetime.now(timezone.utc)
    due = wc.due if wc else now
    if due.tzinfo is None:
        due = due.replace(tzinfo=timezone.utc)
    return {
        "id": word.id,
        "word": word.word,
        "meaning": word.meaning,
        "meaning_zh": word.meaning_zh,
        "level": word.level,
        "example_en": word.example_en,
        "example_ko": word.example_ko,
        "example_zh": word.example_zh,
        "state": wc.state if wc else 0,
        "reps": wc.reps if wc else 0,
        "lapses": wc.lapses if wc else 0,
        "due": due,
        "is_due": due <= now,
        "is_favorite": wc.is_favorite if wc else False,
    }


@router.get("/")
def get_words(level: Optional[str] = None, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    q = db.query(EnglishWord)
    if level:
        q = q.filter(EnglishWord.level == level)
    words = q.order_by(EnglishWord.id).all()
    word_ids = {w.id for w in words}
    cards = {wc.word_id: wc for wc in db.query(EnglishWordCard).filter(EnglishWordCard.user_id == user.id, EnglishWordCard.word_id.in_(word_ids)).all()}
    return [_word_with_card(w, cards.get(w.id)) for w in words]


@router.get("/due")
def get_due_words(
    level: Optional[str] = None,
    new_count: int = DEFAULT_NEW_LIMIT,
    review_limit: int = DEFAULT_REVIEW_LIMIT,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    now = datetime.now(timezone.utc)
    q = db.query(EnglishWord)
    if level:
        q = q.filter(EnglishWord.level == level)
    words = q.all()
    word_ids = {w.id for w in words}
    cards = {wc.word_id: wc for wc in db.query(EnglishWordCard).filter(EnglishWordCard.user_id == user.id, EnglishWordCard.word_id.in_(word_ids)).all()}

    review_words = []
    new_words = []
    for w in words:
        wc = cards.get(w.id)
        if wc is None or wc.reps == 0:
            new_words.append(_word_with_card(w, wc))
        elif wc.due <= now:
            review_words.append(_word_with_card(w, wc))

    review_words.sort(key=lambda x: x["due"])
    random.shuffle(new_words)
    return build_review_session(review_words, new_words, new_count, review_limit)


@router.get("/stats")
def get_stats(level: Optional[str] = None, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    q = db.query(EnglishWord)
    if level:
        q = q.filter(EnglishWord.level == level)
    words = q.all()
    word_ids = {w.id for w in words}
    cards = db.query(EnglishWordCard).filter(EnglishWordCard.user_id == user.id, EnglishWordCard.word_id.in_(word_ids)).all()
    reviewed_ids = {wc.word_id for wc in cards}
    total = len(words)
    reviewed = len(reviewed_ids)
    due = sum(1 for c in cards if c.due <= now) + (total - reviewed)
    today = sum(1 for c in cards if c.last_review and c.last_review >= today_start)
    return {"total": total, "reviewed": reviewed, "new": total - reviewed, "due": due, "today": today}


@router.get("/today")
def get_today_words(level: Optional[str] = None, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    q = db.query(EnglishWord)
    if level:
        q = q.filter(EnglishWord.level == level)
    words = q.all()
    word_id_map = {w.id: w for w in words}
    cards = [
        wc for wc in db.query(EnglishWordCard).filter(EnglishWordCard.user_id == user.id, EnglishWordCard.word_id.in_(word_id_map.keys())).all()
        if wc.last_review and wc.last_review >= today_start
    ]
    return [_word_with_card(word_id_map[wc.word_id], wc) for wc in cards]


@router.get("/daily")
def get_daily_words(
    new_count: int = DEFAULT_NEW_LIMIT,
    review_limit: int = DEFAULT_REVIEW_LIMIT,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """오늘의 영어: 전 레벨 복습 due 카드 + 신규 N개 랜덤"""
    now = datetime.now(timezone.utc)
    all_words = {w.id: w for w in db.query(EnglishWord).all()}
    all_cards = {wc.word_id: wc for wc in db.query(EnglishWordCard).filter(EnglishWordCard.user_id == user.id).all()}

    review_words = []
    new_words = []

    for word in all_words.values():
        wc = all_cards.get(word.id)
        if wc and wc.reps > 0:
            if wc.due <= now:
                review_words.append(_word_with_card(word, wc))
        else:
            new_words.append(_word_with_card(word, wc))

    random.shuffle(new_words)
    return build_review_session(review_words, new_words, new_count, review_limit)


@router.post("/{word_id}/favorite")
def toggle_favorite(word_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    word = db.query(EnglishWord).filter(EnglishWord.id == word_id).first()
    if not word:
        raise HTTPException(status_code=404, detail="Word not found")
    wc = db.query(EnglishWordCard).filter(EnglishWordCard.user_id == user.id, EnglishWordCard.word_id == word_id).first()
    if wc is None:
        wc = EnglishWordCard(user_id=user.id, word_id=word_id)
        db.add(wc)
    wc.is_favorite = not wc.is_favorite
    db.commit()
    return {"word_id": word_id, "is_favorite": wc.is_favorite}


@router.post("/{word_id}/translate-zh")
def translate_word_to_zh(word_id: int, db: Session = Depends(get_db)):
    word = db.query(EnglishWord).filter(EnglishWord.id == word_id).first()
    if not word:
        raise HTTPException(status_code=404, detail="Word not found")

    if not word.meaning_zh:
        word.meaning_zh = translate_ko_to_zh(word.meaning)
    if word.example_ko and not word.example_zh:
        word.example_zh = translate_ko_to_zh(word.example_ko)

    db.commit()
    db.refresh(word)
    return {"word_id": word.id, "meaning_zh": word.meaning_zh, "example_zh": word.example_zh}


@router.post("/tools/translate-missing-zh")
def translate_missing_to_zh(level: Optional[str] = None, limit: int = 500, db: Session = Depends(get_db)):
    q = db.query(EnglishWord).filter(
        (EnglishWord.meaning_zh == None) | ((EnglishWord.example_ko != None) & (EnglishWord.example_zh == None))
    )
    if level:
        q = q.filter(EnglishWord.level == level)
    words = q.order_by(EnglishWord.id).limit(max(1, min(limit, 2000))).all()

    updated = 0
    for word in words:
        changed = False
        if not word.meaning_zh:
            word.meaning_zh = translate_ko_to_zh(word.meaning)
            changed = changed or bool(word.meaning_zh)
        if word.example_ko and not word.example_zh:
            word.example_zh = translate_ko_to_zh(word.example_ko)
            changed = changed or bool(word.example_zh)
        if changed:
            updated += 1

    db.commit()
    return {"updated": updated, "checked": len(words)}


@router.get("/favorites")
def get_favorites(level: Optional[str] = None, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    favorite_cards = db.query(EnglishWordCard).filter(EnglishWordCard.user_id == user.id, EnglishWordCard.is_favorite == True).all()
    cards = {wc.word_id: wc for wc in favorite_cards}
    q = db.query(EnglishWord).filter(EnglishWord.id.in_(cards.keys()))
    if level:
        q = q.filter(EnglishWord.level == level)
    words = q.order_by(EnglishWord.id).all()
    return [_word_with_card(w, cards.get(w.id)) for w in words]


@router.post("/{word_id}/review")
def review_word(word_id: int, body: ReviewRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    word = db.query(EnglishWord).filter(EnglishWord.id == word_id).first()
    if not word:
        raise HTTPException(status_code=404, detail="Word not found")

    wc = db.query(EnglishWordCard).filter(EnglishWordCard.user_id == user.id, EnglishWordCard.word_id == word_id).first()
    if wc is None:
        wc = EnglishWordCard(user_id=user.id, word_id=word_id)
        db.add(wc)
        db.flush()

    rating = Rating.Good if body.knew else Rating.Again
    card = _card_from_db(wc)
    updated_card, _ = scheduler.review_card(card, rating)

    lapses_delta = 1 if not body.knew else 0
    _sync_card_to_db(wc, updated_card, lapses_delta)
    apply_minimum_spacing(wc, body.knew)
    db.commit()

    return {
        "word_id": word_id,
        "knew": body.knew,
        "next_due": wc.due,
        "state": wc.state,
        "reps": wc.reps,
    }
