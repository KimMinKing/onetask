from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, time, timedelta, timezone
import random
from zoneinfo import ZoneInfo

from sqlalchemy import func
from sqlalchemy.orm import Session

from models import EnglishWord, EnglishWordCard, JapaneseWord, JapaneseWordCard, Word, WordCard


KST = ZoneInfo("Asia/Seoul")


@dataclass(frozen=True)
class QuizQuestion:
    question: str
    options: list[str]
    correct_option_id: int
    explanation: str


@dataclass(frozen=True)
class Candidate:
    language: str
    prompt: str
    answer: str
    example: str | None
    lapses: int


def previous_day_bounds_utc(now: datetime | None = None) -> tuple[datetime, datetime]:
    current = now or datetime.now(timezone.utc)
    local_date = current.astimezone(KST).date()
    yesterday = local_date - timedelta(days=1)
    start = datetime.combine(yesterday, time.min, tzinfo=KST).astimezone(timezone.utc)
    end = datetime.combine(local_date, time.min, tzinfo=KST).astimezone(timezone.utc)
    return start, end


def _load_candidates(db: Session, user_id: int, start: datetime, end: datetime) -> list[Candidate]:
    candidates: list[Candidate] = []
    zh_rows = db.query(WordCard, Word).join(Word, Word.id == WordCard.word_id).filter(
        WordCard.user_id == user_id, WordCard.last_review >= start, WordCard.last_review < end
    ).all()
    for card, word in zh_rows:
        candidates.append(Candidate("중국어", f"{word.chinese} ({word.pinyin})", word.meaning, word.example_zh, card.lapses))

    en_rows = db.query(EnglishWordCard, EnglishWord).join(
        EnglishWord, EnglishWord.id == EnglishWordCard.word_id
    ).filter(EnglishWordCard.user_id == user_id, EnglishWordCard.last_review >= start, EnglishWordCard.last_review < end).all()
    for card, word in en_rows:
        candidates.append(Candidate("영어", word.word, word.meaning, word.example_en, card.lapses))

    ja_rows = db.query(JapaneseWordCard, JapaneseWord).join(
        JapaneseWord, JapaneseWord.id == JapaneseWordCard.word_id
    ).filter(JapaneseWordCard.user_id == user_id, JapaneseWordCard.last_review >= start, JapaneseWordCard.last_review < end).all()
    for card, word in ja_rows:
        reading = f" ({word.reading})" if word.reading != word.expression else ""
        candidates.append(Candidate("일본어", f"{word.expression}{reading}", word.meaning, word.example_jp, card.lapses))
    return candidates


def _meaning_pool(db: Session, language: str, answer: str) -> list[str]:
    model = {"중국어": Word, "영어": EnglishWord, "일본어": JapaneseWord}[language]
    rows = db.query(model.meaning).filter(model.meaning != answer).order_by(func.random()).limit(30).all()
    return list(dict.fromkeys(value for (value,) in rows if value and value != answer))


def build_daily_quizzes(db: Session, user_id: int, limit: int = 2, rng: random.Random | None = None) -> list[QuizQuestion]:
    rng = rng or random.Random()
    start, end = previous_day_bounds_utc()
    candidates = _load_candidates(db, user_id, start, end)
    if not candidates:
        return []

    # Frequent mistakes stay near the front while random noise avoids identical daily ordering.
    candidates.sort(key=lambda item: (item.lapses, rng.random()), reverse=True)
    selected = candidates[: min(limit, len(candidates))]
    quizzes: list[QuizQuestion] = []
    for candidate in selected:
        distractors = _meaning_pool(db, candidate.language, candidate.answer)
        rng.shuffle(distractors)
        options = [candidate.answer, *distractors[:3]]
        if len(options) < 2:
            continue
        rng.shuffle(options)
        explanation = f"정답: {candidate.answer}"
        if candidate.example:
            explanation += f" · 예문: {candidate.example}"
        quizzes.append(QuizQuestion(
            question=f"[{candidate.language}] ‘{candidate.prompt}’의 뜻은?",
            options=options,
            correct_option_id=options.index(candidate.answer),
            explanation=explanation,
        ))
    return quizzes
