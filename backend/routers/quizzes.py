from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import random

from database import get_db
from models import Word, EnglishWord, JapaneseWord, WordCard, EnglishWordCard, JapaneseWordCard, QuizAttempt, User
from auth_utils import get_current_user

router = APIRouter(prefix="/quizzes", tags=["quizzes"])


class QuizRequest(BaseModel):
    word_id: int
    word_lang: str
    quiz_type: str  # 'sentence', 'example', 'pronunciation'


class QuizAnswer(BaseModel):
    word_id: int
    word_lang: str
    quiz_type: str
    answer: str  # User's answer
    correct: bool


class QuizResponse(BaseModel):
    question: str
    options: List[str]
    correct_answer: str
    word_id: int
    word_lang: str
    quiz_type: str


def _get_sentence_completion_quiz(db: Session, word_lang: str) -> Optional[QuizResponse]:
    """문장 완성 퀴즈 생성"""
    if word_lang == "zh":
        # 중국어: 예문에서 단어를 빈칸으로 만들기
        words_with_examples = db.query(Word).filter(
            Word.example_zh.isnot(None),
            Word.example_zh != ""
        ).all()

        if not words_with_examples:
            return None

        word = random.choice(words_with_examples)
        # 단어를 찾아 빈칸으로 대체
        example = word.example_zh or ""
        if word.chinese not in example:
            return None

        blank = example.replace(word.chinese, "___")
        # 오답 옵션 생성
        other_words = [w for w in words_with_examples if w.id != word.id]
        options = [word.chinese]
        for ow in random.sample(other_words, min(3, len(other_words))):
            options.append(ow.chinese)
        random.shuffle(options)

        return QuizResponse(
            question=blank,
            options=options,
            correct_answer=word.chinese,
            word_id=word.id,
            word_lang="zh",
            quiz_type="sentence"
        )

    elif word_lang == "en":
        # 영어: 예문에서 단어를 빈칸으로 만들기
        words_with_examples = db.query(EnglishWord).filter(
            EnglishWord.example_en.isnot(None),
            EnglishWord.example_en != ""
        ).all()

        if not words_with_examples:
            return None

        word = random.choice(words_with_examples)
        example = word.example_en or ""
        if word.word.lower() not in example.lower():
            return None

        # 대소문자 구분 없이 치환
        blank = example.replace(word.word, "___")
        other_words = [w for w in words_with_examples if w.id != word.id]
        options = [word.word]
        for ow in random.sample(other_words, min(3, len(other_words))):
            options.append(ow.word)
        random.shuffle(options)

        return QuizResponse(
            question=blank,
            options=options,
            correct_answer=word.word,
            word_id=word.id,
            word_lang="en",
            quiz_type="sentence"
        )

    elif word_lang == "ja":
        # 일본어: 예문에서 단어를 빈칸으로 만들기
        words_with_examples = db.query(JapaneseWord).filter(
            JapaneseWord.example_jp.isnot(None),
            JapaneseWord.example_jp != ""
        ).all()

        if not words_with_examples:
            return None

        word = random.choice(words_with_examples)
        example = word.example_jp or ""
        if word.expression not in example:
            return None

        blank = example.replace(word.expression, "___")
        other_words = [w for w in words_with_examples if w.id != word.id]
        options = [word.expression]
        for ow in random.sample(other_words, min(3, len(other_words))):
            options.append(ow.expression)
        random.shuffle(options)

        return QuizResponse(
            question=blank,
            options=options,
            correct_answer=word.expression,
            word_id=word.id,
            word_lang="ja",
            quiz_type="sentence"
        )

    return None


def _get_example_quiz(db: Session, word_lang: str) -> Optional[QuizResponse]:
    """예문 퀴즈: 단어와 올바른 예문 매칭"""
    if word_lang == "zh":
        words_with_examples = db.query(Word).filter(
            Word.example_zh.isnot(None),
            Word.example_zh != ""
        ).limit(10).all()

        if len(words_with_examples) < 2:
            return None

        word = random.choice(words_with_examples)
        # 올바른 예문과 오답 예문 준비
        correct_example = word.example_zh or ""
        other_words = [w for w in words_with_examples if w.id != word.id]

        wrong_examples = []
        for ow in random.sample(other_words, min(3, len(other_words))):
            if ow.example_zh:
                wrong_examples.append(ow.example_zh)

        if len(wrong_examples) < 3:
            return None

        options = [correct_example] + wrong_examples[:3]
        random.shuffle(options)

        return QuizResponse(
            question=f"'{word.chinese}'의 올바른 예문을 선택하세요.",
            options=options,
            correct_answer=correct_example,
            word_id=word.id,
            word_lang="zh",
            quiz_type="example"
        )

    elif word_lang == "en":
        words_with_examples = db.query(EnglishWord).filter(
            EnglishWord.example_en.isnot(None),
            EnglishWord.example_en != ""
        ).limit(10).all()

        if len(words_with_examples) < 2:
            return None

        word = random.choice(words_with_examples)
        correct_example = word.example_en or ""
        other_words = [w for w in words_with_examples if w.id != word.id]

        wrong_examples = []
        for ow in random.sample(other_words, min(3, len(other_words))):
            if ow.example_en:
                wrong_examples.append(ow.example_en)

        if len(wrong_examples) < 3:
            return None

        options = [correct_example] + wrong_examples[:3]
        random.shuffle(options)

        return QuizResponse(
            question=f"'{word.word}'의 올바른 예문을 선택하세요.",
            options=options,
            correct_answer=correct_example,
            word_id=word.id,
            word_lang="en",
            quiz_type="example"
        )

    elif word_lang == "ja":
        words_with_examples = db.query(JapaneseWord).filter(
            JapaneseWord.example_jp.isnot(None),
            JapaneseWord.example_jp != ""
        ).limit(10).all()

        if len(words_with_examples) < 2:
            return None

        word = random.choice(words_with_examples)
        correct_example = word.example_jp or ""
        other_words = [w for w in words_with_examples if w.id != word.id]

        wrong_examples = []
        for ow in random.sample(other_words, min(3, len(other_words))):
            if ow.example_jp:
                wrong_examples.append(ow.example_jp)

        if len(wrong_examples) < 3:
            return None

        options = [correct_example] + wrong_examples[:3]
        random.shuffle(options)

        return QuizResponse(
            question=f"'{word.expression}'의 올바른 예문을 선택하세요.",
            options=options,
            correct_answer=correct_example,
            word_id=word.id,
            word_lang="ja",
            quiz_type="example"
        )

    return None


@router.get("/sentence-completion")
def get_sentence_completion(
    word_lang: str = "zh",
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """문장 완성 퀴즈 가져오기"""
    if word_lang not in ["zh", "en", "ja"]:
        raise HTTPException(status_code=400, detail="word_lang must be 'zh', 'en', or 'ja'")

    quiz = _get_sentence_completion_quiz(db, word_lang)
    if not quiz:
        raise HTTPException(status_code=404, detail="No quiz available")

    return quiz


@router.get("/example-quiz")
def get_example_quiz(
    word_lang: str = "zh",
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """예문 퀴즈 가져오기"""
    if word_lang not in ["zh", "en", "ja"]:
        raise HTTPException(status_code=400, detail="word_lang must be 'zh', 'en', or 'ja'")

    quiz = _get_example_quiz(db, word_lang)
    if not quiz:
        raise HTTPException(status_code=404, detail="No quiz available")

    return quiz


@router.get("/pronunciation/check")
def check_pronunciation(
    word_lang: str = "zh",
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """발음 평가 퀴즈 (현재는 mock)"""
    if word_lang not in ["zh", "en", "ja"]:
        raise HTTPException(status_code=400, detail="word_lang must be 'zh', 'en', or 'ja'")

    # 랜덤 단어 선택
    if word_lang == "zh":
        word = db.query(Word).order_by(func.random()).first()
        if not word:
            raise HTTPException(status_code=404, detail="No word available")
        target_word = word.chinese
        word_id = word.id
    elif word_lang == "en":
        word = db.query(EnglishWord).order_by(func.random()).first()
        if not word:
            raise HTTPException(status_code=404, detail="No word available")
        target_word = word.word
        word_id = word.id
    else:
        word = db.query(JapaneseWord).order_by(func.random()).first()
        if not word:
            raise HTTPException(status_code=404, detail="No word available")
        target_word = word.expression
        word_id = word.id

    return {
        "word_id": word_id,
        "word_lang": word_lang,
        "target_word": target_word,
        "instruction": f"'{target_word}'를 발음해주세요.",
        "quiz_type": "pronunciation"
    }


@router.post("/answer")
def submit_quiz_answer(
    data: QuizAnswer,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """퀴즈 답안 제출"""
    # 퀴즈 시도 기록
    attempt = QuizAttempt(
        user_id=user.id,
        word_id=data.word_id,
        word_lang=data.word_lang,
        quiz_type=data.quiz_type,
        correct=data.correct,
        created_at=datetime.now(timezone.utc)
    )
    db.add(attempt)
    db.commit()

    return {
        "correct": data.correct,
        "word_id": data.word_id,
        "quiz_type": data.quiz_type
    }


@router.get("/history")
def get_quiz_history(
    quiz_type: Optional[str] = None,
    limit: int = 20,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """퀴즈 이력 조회"""
    query = db.query(QuizAttempt).filter(QuizAttempt.user_id == user.id)

    if quiz_type:
        query = query.filter(QuizAttempt.quiz_type == quiz_type)

    attempts = query.order_by(QuizAttempt.created_at.desc()).limit(limit).all()

    total = db.query(QuizAttempt).filter(QuizAttempt.user_id == user.id).count()
    correct = db.query(QuizAttempt).filter(QuizAttempt.user_id == user.id, QuizAttempt.correct == True).count()

    return {
        "attempts": [
            {
                "word_id": a.word_id,
                "word_lang": a.word_lang,
                "quiz_type": a.quiz_type,
                "correct": a.correct,
                "created_at": a.created_at.isoformat(),
            }
            for a in attempts
        ],
        "total": total,
        "correct": correct,
        "accuracy": round(correct / total * 100, 1) if total > 0 else 0,
    }
