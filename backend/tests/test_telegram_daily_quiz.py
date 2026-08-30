import random
import unittest
from datetime import datetime, timedelta, timezone

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from models import Base, Word, WordCard
from telegram_daily_quiz import build_daily_quizzes, previous_day_bounds_utc


class TelegramDailyQuizTests(unittest.TestCase):
    def setUp(self):
        engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(engine)
        self.db = sessionmaker(bind=engine)()

    def tearDown(self):
        self.db.close()

    def test_previous_day_uses_korean_calendar_boundary(self):
        now = datetime(2026, 8, 30, 1, 0, tzinfo=timezone.utc)  # 10:00 KST
        start, end = previous_day_bounds_utc(now)
        self.assertEqual(start, datetime(2026, 8, 28, 15, 0, tzinfo=timezone.utc))
        self.assertEqual(end, datetime(2026, 8, 29, 15, 0, tzinfo=timezone.utc))

    def test_builds_quiz_with_correct_answer_and_distractors(self):
        now = datetime.now(timezone.utc)
        start, end = previous_day_bounds_utc(now)
        meanings = ["여행", "회의", "약속", "출근", "운동"]
        words = []
        for index, meaning in enumerate(meanings):
            word = Word(chinese=f"词{index}", pinyin=f"ci{index}", meaning=meaning, hsk_level=4)
            self.db.add(word)
            words.append(word)
        self.db.flush()
        self.db.add(WordCard(
            word_id=words[0].id,
            last_review=start + (end - start) / 2,
            reps=2,
            lapses=3,
            due=now + timedelta(days=1),
        ))
        self.db.commit()

        quizzes = build_daily_quizzes(self.db, limit=2, rng=random.Random(7))
        self.assertEqual(len(quizzes), 1)
        quiz = quizzes[0]
        self.assertEqual(quiz.options[quiz.correct_option_id], "여행")
        self.assertGreaterEqual(len(quiz.options), 2)
        self.assertIn("词0", quiz.question)


if __name__ == "__main__":
    unittest.main()
