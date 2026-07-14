import random
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone

from fsrs import Scheduler, Card, Rating, State

from database import get_db
from models import JapaneseWord, JapaneseWordCard
from translation_utils import translate_ko_to_zh

router = APIRouter(prefix="/japanese-words", tags=["japanese-words"])
scheduler = Scheduler()


class ReviewRequest(BaseModel):
    knew: bool


def _card_from_db(wc: JapaneseWordCard) -> Card:
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


def _sync_card_to_db(wc: JapaneseWordCard, c: Card, lapses_delta: int = 0):
    wc.state = c.state.value
    wc.step = c.step
    wc.stability = c.stability
    wc.difficulty = c.difficulty
    wc.due = c.due
    wc.last_review = c.last_review
    wc.reps += 1
    wc.lapses += lapses_delta


def _word_with_card(word: JapaneseWord, wc: Optional[JapaneseWordCard]) -> dict:
    now = datetime.now(timezone.utc)
    due = wc.due if wc else now
    return {
        "id": word.id,
        "expression": word.expression,
        "reading": word.reading,
        "meaning": word.meaning,
        "meaning_zh": word.meaning_zh,
        "jlpt_level": word.jlpt_level,
        "example_jp": word.example_jp,
        "example_ko": word.example_ko,
        "example_zh": word.example_zh,
        "state": wc.state if wc else 0,
        "reps": wc.reps if wc else 0,
        "lapses": wc.lapses if wc else 0,
        "due": due,
        "is_due": due <= now,
        "is_favorite": word.is_favorite,
    }


@router.get("/daily")
def get_daily_words(new_count: int = 15, db: Session = Depends(get_db)):
    """오늘의 일본어: 전 레벨 복습 due + 신규 N개 (N5→N4 우선순위)"""
    now = datetime.now(timezone.utc)
    all_words = {w.id: w for w in db.query(JapaneseWord).all()}
    all_cards = {wc.word_id: wc for wc in db.query(JapaneseWordCard).all()}

    review_words = []
    new_words = []

    for word in all_words.values():
        wc = all_cards.get(word.id)
        if wc and wc.reps > 0:
            if wc.due <= now:
                review_words.append(_word_with_card(word, wc))
        else:
            new_words.append(_word_with_card(word, wc))

    review_words.sort(key=lambda x: x["due"])
    # N5, N4 먼저 (쉬운 것 우선)
    level_order = {"N5": 0, "N4": 1, "N3": 2, "N2": 3, "N1": 4}
    new_words.sort(key=lambda x: level_order.get(x["jlpt_level"] or "N1", 5))
    random.shuffle(new_words[:50])  # 같은 레벨 내에서는 랜덤
    return review_words + new_words[:new_count]


@router.get("/due")
def get_due_words(jlpt_level: Optional[str] = None, db: Session = Depends(get_db)):
    now = datetime.now(timezone.utc)
    q = db.query(JapaneseWord)
    if jlpt_level:
        q = q.filter(JapaneseWord.jlpt_level == jlpt_level)
    words = q.all()
    word_ids = {w.id for w in words}
    cards = {wc.word_id: wc for wc in db.query(JapaneseWordCard).filter(
        JapaneseWordCard.word_id.in_(word_ids)).all()}

    review_words, new_words = [], []
    for w in words:
        wc = cards.get(w.id)
        if wc is None or wc.reps == 0:
            new_words.append(_word_with_card(w, wc))
        elif wc.due <= now:
            review_words.append(_word_with_card(w, wc))

    review_words.sort(key=lambda x: x["due"])
    random.shuffle(new_words)
    return review_words + new_words


@router.get("/stats")
def get_stats(jlpt_level: Optional[str] = None, db: Session = Depends(get_db)):
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    q = db.query(JapaneseWord)
    if jlpt_level:
        q = q.filter(JapaneseWord.jlpt_level == jlpt_level)
    words = q.all()
    word_ids = {w.id for w in words}
    cards = db.query(JapaneseWordCard).filter(JapaneseWordCard.word_id.in_(word_ids)).all()
    reviewed_ids = {wc.word_id for wc in cards}
    total = len(words)
    reviewed = len(reviewed_ids)
    due = sum(1 for c in cards if c.due <= now) + (total - reviewed)
    today = sum(1 for c in cards if c.last_review and c.last_review >= today_start)
    return {"total": total, "reviewed": reviewed, "new": total - reviewed, "due": due, "today": today}


@router.get("/today")
def get_today_words(jlpt_level: Optional[str] = None, db: Session = Depends(get_db)):
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    q = db.query(JapaneseWord)
    if jlpt_level:
        q = q.filter(JapaneseWord.jlpt_level == jlpt_level)
    words = q.all()
    word_id_map = {w.id: w for w in words}
    cards = [wc for wc in db.query(JapaneseWordCard).filter(
        JapaneseWordCard.word_id.in_(word_id_map.keys())).all()
        if wc.last_review and wc.last_review >= today_start]
    return [_word_with_card(word_id_map[wc.word_id], wc) for wc in cards]


@router.get("/favorites")
def get_favorites(jlpt_level: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(JapaneseWord).filter(JapaneseWord.is_favorite == True)
    if jlpt_level:
        q = q.filter(JapaneseWord.jlpt_level == jlpt_level)
    words = q.order_by(JapaneseWord.id).all()
    word_ids = {w.id for w in words}
    cards = {wc.word_id: wc for wc in db.query(JapaneseWordCard).filter(
        JapaneseWordCard.word_id.in_(word_ids)).all()}
    return [_word_with_card(w, cards.get(w.id)) for w in words]


@router.get("/list")
def get_words(jlpt_level: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(JapaneseWord)
    if jlpt_level:
        q = q.filter(JapaneseWord.jlpt_level == jlpt_level)
    words = q.order_by(JapaneseWord.id).all()
    word_ids = {w.id for w in words}
    cards = {wc.word_id: wc for wc in db.query(JapaneseWordCard).filter(
        JapaneseWordCard.word_id.in_(word_ids)).all()}
    return [_word_with_card(w, cards.get(w.id)) for w in words]


@router.post("/{word_id}/review")
def review_word(word_id: int, body: ReviewRequest, db: Session = Depends(get_db)):
    word = db.query(JapaneseWord).filter(JapaneseWord.id == word_id).first()
    if not word:
        raise HTTPException(status_code=404, detail="Word not found")

    wc = db.query(JapaneseWordCard).filter(JapaneseWordCard.word_id == word_id).first()
    if wc is None:
        wc = JapaneseWordCard(word_id=word_id)
        db.add(wc)
        db.flush()

    rating = Rating.Good if body.knew else Rating.Again
    card = _card_from_db(wc)
    updated_card, _ = scheduler.review_card(card, rating)

    lapses_delta = 1 if not body.knew else 0
    _sync_card_to_db(wc, updated_card, lapses_delta)
    db.commit()

    return {"word_id": word_id, "knew": body.knew, "next_due": wc.due, "state": wc.state, "reps": wc.reps}


@router.post("/{word_id}/favorite")
def toggle_favorite(word_id: int, db: Session = Depends(get_db)):
    word = db.query(JapaneseWord).filter(JapaneseWord.id == word_id).first()
    if not word:
        raise HTTPException(status_code=404, detail="Word not found")
    word.is_favorite = not word.is_favorite
    db.commit()
    return {"word_id": word_id, "is_favorite": word.is_favorite}


@router.post("/{word_id}/translate-zh")
def translate_word_to_zh(word_id: int, db: Session = Depends(get_db)):
    word = db.query(JapaneseWord).filter(JapaneseWord.id == word_id).first()
    if not word:
        raise HTTPException(status_code=404, detail="Word not found")

    if not word.meaning_zh:
        word.meaning_zh = translate_ko_to_zh(word.meaning)
    if word.example_ko and not word.example_zh:
        word.example_zh = translate_ko_to_zh(word.example_ko)

    db.commit()
    db.refresh(word)
    return {"word_id": word.id, "meaning_zh": word.meaning_zh, "example_zh": word.example_zh}
