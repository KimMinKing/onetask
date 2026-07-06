from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime, timezone

from database import get_db
from models import Word, WordCard, EnglishWord, EnglishWordCard, JapaneseWord, JapaneseWordCard

router = APIRouter(prefix="/search", tags=["search"])


def _zh_word_with_card(word: Word, wc: Optional[WordCard]) -> dict:
    now = datetime.now(timezone.utc)
    due = wc.due if wc else now
    return {
        "id": word.id,
        "chinese": word.chinese,
        "pinyin": word.pinyin,
        "meaning": word.meaning,
        "example_zh": word.example_zh,
        "example_ko": word.example_ko,
        "hsk_level": word.hsk_level,
        "lang": "zh",
        "state": wc.state if wc else 0,
        "reps": wc.reps if wc else 0,
        "lapses": wc.lapses if wc else 0,
        "due": due,
        "is_due": due <= now,
        "is_favorite": word.is_favorite,
    }


def _en_word_with_card(word: EnglishWord, wc: Optional[EnglishWordCard]) -> dict:
    now = datetime.now(timezone.utc)
    due = wc.due if wc else now
    return {
        "id": word.id,
        "word": word.word,
        "meaning": word.meaning,
        "level": word.level,
        "example_en": word.example_en,
        "example_ko": word.example_ko,
        "lang": "en",
        "state": wc.state if wc else 0,
        "reps": wc.reps if wc else 0,
        "lapses": wc.lapses if wc else 0,
        "due": due,
        "is_due": due <= now,
        "is_favorite": word.is_favorite,
    }


def _ja_word_with_card(word: JapaneseWord, wc: Optional[JapaneseWordCard]) -> dict:
    now = datetime.now(timezone.utc)
    due = wc.due if wc else now
    return {
        "id": word.id,
        "expression": word.expression,
        "reading": word.reading,
        "meaning": word.meaning,
        "jlpt_level": word.jlpt_level,
        "example_jp": word.example_jp,
        "example_ko": word.example_ko,
        "lang": "ja",
        "state": wc.state if wc else 0,
        "reps": wc.reps if wc else 0,
        "lapses": wc.lapses if wc else 0,
        "due": due,
        "is_due": due <= now,
        "is_favorite": word.is_favorite,
    }


@router.get("/")
def global_search(
    q: Optional[str] = None,
    lang: Optional[str] = None,
    level: Optional[str] = None,
    favorites_only: bool = False,
    due_only: bool = False,
    state: Optional[int] = None,
    reps_min: Optional[int] = None,
    reps_max: Optional[int] = None,
    lapses_min: Optional[int] = None,
    lapses_max: Optional[int] = None,
    db: Session = Depends(get_db),
):
    """전역 검색 - 모든 언어의 단어를 검색하고 필터링"""
    now = datetime.now(timezone.utc)
    results = {"tasks": [], "chinese": [], "english": [], "japanese": []}

    # 중국어 검색
    if lang is None or lang == "zh":
        zh_query = db.query(Word)
        if q:
            zh_query = zh_query.filter(
                Word.chinese.ilike(f"%{q}%") |
                Word.pinyin.ilike(f"%{q}%") |
                Word.meaning.ilike(f"%{q}%") |
                Word.example_zh.ilike(f"%{q}%") |
                Word.example_ko.ilike(f"%{q}%")
            )
        if level:
            zh_query = zh_query.filter(Word.hsk_level == int(level))
        if favorites_only:
            zh_query = zh_query.filter(Word.is_favorite == True)
        zh_words = zh_query.all()
        zh_word_ids = {w.id for w in zh_words}
        zh_cards = {wc.word_id: wc for wc in db.query(WordCard).filter(WordCard.word_id.in_(zh_word_ids)).all()}
        for w in zh_words:
            wc = zh_cards.get(w.id)
            if due_only and (wc is None or wc.due > now):
                continue
            if state is not None and (wc is None or wc.state != state):
                continue
            if reps_min is not None and (wc is None or wc.reps < reps_min):
                continue
            if reps_max is not None and (wc is not None and wc.reps > reps_max):
                continue
            if lapses_min is not None and (wc is None or wc.lapses < lapses_min):
                continue
            if lapses_max is not None and (wc is not None and wc.lapses > lapses_max):
                continue
            results["chinese"].append(_zh_word_with_card(w, wc))

    # 영어 검색
    if lang is None or lang == "en":
        en_query = db.query(EnglishWord)
        if q:
            en_query = en_query.filter(
                EnglishWord.word.ilike(f"%{q}%") |
                EnglishWord.meaning.ilike(f"%{q}%") |
                EnglishWord.example_en.ilike(f"%{q}%") |
                EnglishWord.example_ko.ilike(f"%{q}%")
            )
        if level:
            en_query = en_query.filter(EnglishWord.level == level)
        if favorites_only:
            en_query = en_query.filter(EnglishWord.is_favorite == True)
        en_words = en_query.all()
        en_word_ids = {w.id for w in en_words}
        en_cards = {wc.word_id: wc for wc in db.query(EnglishWordCard).filter(EnglishWordCard.word_id.in_(en_word_ids)).all()}
        for w in en_words:
            wc = en_cards.get(w.id)
            if due_only and (wc is None or wc.due > now):
                continue
            if state is not None and (wc is None or wc.state != state):
                continue
            if reps_min is not None and (wc is None or wc.reps < reps_min):
                continue
            if reps_max is not None and (wc is not None and wc.reps > reps_max):
                continue
            if lapses_min is not None and (wc is None or wc.lapses < lapses_min):
                continue
            if lapses_max is not None and (wc is not None and wc.lapses > lapses_max):
                continue
            results["english"].append(_en_word_with_card(w, wc))

    # 일본어 검색
    if lang is None or lang == "ja":
        ja_query = db.query(JapaneseWord)
        if q:
            ja_query = ja_query.filter(
                JapaneseWord.expression.ilike(f"%{q}%") |
                JapaneseWord.reading.ilike(f"%{q}%") |
                JapaneseWord.meaning.ilike(f"%{q}%") |
                JapaneseWord.example_jp.ilike(f"%{q}%") |
                JapaneseWord.example_ko.ilike(f"%{q}%")
            )
        if level:
            ja_query = ja_query.filter(JapaneseWord.jlpt_level == level)
        if favorites_only:
            ja_query = ja_query.filter(JapaneseWord.is_favorite == True)
        ja_words = ja_query.all()
        ja_word_ids = {w.id for w in ja_words}
        ja_cards = {wc.word_id: wc for wc in db.query(JapaneseWordCard).filter(JapaneseWordCard.word_id.in_(ja_word_ids)).all()}
        for w in ja_words:
            wc = ja_cards.get(w.id)
            if due_only and (wc is None or wc.due > now):
                continue
            if state is not None and (wc is None or wc.state != state):
                continue
            if reps_min is not None and (wc is None or wc.reps < reps_min):
                continue
            if reps_max is not None and (wc is not None and wc.reps > reps_max):
                continue
            if lapses_min is not None and (wc is None or wc.lapses < lapses_min):
                continue
            if lapses_max is not None and (wc is not None and wc.lapses > lapses_max):
                continue
            results["japanese"].append(_ja_word_with_card(w, wc))

    return results
