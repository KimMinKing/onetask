import os
import sys
import unittest
from pathlib import Path

os.environ.setdefault("SECRET_KEY", "test-secret-key-that-is-at-least-32-characters")
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from models import Base, EnglishWord, EnglishWordCard, User, Word, WordCard
from routers.english_words import ReviewRequest, review_word
from routers.words import get_favorites, toggle_favorite


class LearningIsolationTests(unittest.TestCase):
    def setUp(self):
        engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(engine)
        self.db = sessionmaker(bind=engine)()
        self.first = User(username="first", hashed_password="unused", is_master=True)
        self.second = User(username="second", hashed_password="unused", is_master=False)
        self.db.add_all([self.first, self.second])
        self.db.flush()

    def tearDown(self):
        self.db.close()

    def test_review_progress_is_separate_for_each_user(self):
        word = EnglishWord(word="isolation", meaning="격리", level="B1")
        self.db.add(word)
        self.db.commit()

        review_word(word.id, ReviewRequest(knew=True), self.db, self.first)
        review_word(word.id, ReviewRequest(knew=False), self.db, self.second)

        cards = self.db.query(EnglishWordCard).order_by(EnglishWordCard.user_id).all()
        self.assertEqual(len(cards), 2)
        self.assertEqual(cards[0].user_id, self.first.id)
        self.assertEqual(cards[0].lapses, 0)
        self.assertEqual(cards[1].user_id, self.second.id)
        self.assertEqual(cards[1].lapses, 1)

    def test_favorites_are_separate_for_each_user(self):
        word = Word(chinese="学习", pinyin="xuexi", meaning="공부하다", hsk_level=4)
        self.db.add(word)
        self.db.commit()

        toggle_favorite(word.id, self.db, self.first)

        first_favorites = get_favorites(db=self.db, user=self.first)
        second_favorites = get_favorites(db=self.db, user=self.second)
        self.assertEqual([item["id"] for item in first_favorites], [word.id])
        self.assertEqual(second_favorites, [])
        self.assertEqual(self.db.query(WordCard).count(), 1)


if __name__ == "__main__":
    unittest.main()
