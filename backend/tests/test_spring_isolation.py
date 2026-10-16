import os
import sys
import unittest
from datetime import datetime, timezone
from pathlib import Path

os.environ.setdefault("SECRET_KEY", "test-secret-key-that-is-at-least-32-characters")
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from migrations_runtime import ensure_runtime_migrations
from models import Base, SpringTopic, SpringTopicCard, SpringTopicUserCard, User, Word, WordCard
from routers.spring_topics import ReviewRequest, get_favorites, get_stats, review_topic, toggle_favorite


class SpringIsolationTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(self.engine)
        self.db = sessionmaker(bind=self.engine)()
        self.master = User(username="master", hashed_password="unused", is_master=True)
        self.other = User(username="other", hashed_password="unused", is_master=False)
        self.topic = SpringTopic(title="DI", category="ioc_di", description="DI", difficulty="basic", is_favorite=True)
        self.db.add_all([self.master, self.other, self.topic])
        self.db.flush()
        self.db.add(SpringTopicCard(topic_id=self.topic.id, state=2, reps=3, due=datetime.now(timezone.utc)))
        self.db.commit()

    def tearDown(self):
        self.db.close()
        self.engine.dispose()

    def test_legacy_progress_moves_only_to_master_once(self):
        ensure_runtime_migrations(self.engine)
        self.db.expire_all()
        cards = self.db.query(SpringTopicUserCard).all()
        self.assertEqual(len(cards), 1)
        self.assertEqual(cards[0].user_id, self.master.id)
        self.assertEqual(cards[0].reps, 3)
        self.assertTrue(cards[0].is_favorite)
        self.assertEqual(get_favorites(db=self.db, user=self.other), [])

        cards[0].is_favorite = False
        self.db.commit()
        ensure_runtime_migrations(self.engine)
        self.db.refresh(cards[0])
        self.assertFalse(cards[0].is_favorite)

    def test_reviews_and_favorites_do_not_cross_accounts(self):
        ensure_runtime_migrations(self.engine)
        review_topic(self.topic.id, ReviewRequest(knew=True), self.db, self.other)
        toggle_favorite(self.topic.id, self.db, self.other)

        master_card = self.db.query(SpringTopicUserCard).filter_by(user_id=self.master.id).one()
        other_card = self.db.query(SpringTopicUserCard).filter_by(user_id=self.other.id).one()
        self.assertEqual(master_card.reps, 3)
        self.assertEqual(other_card.reps, 1)
        self.assertTrue(other_card.is_favorite)
        self.assertEqual(get_stats(db=self.db, user=self.master)["reviewed"], 1)
        self.assertEqual(get_stats(db=self.db, user=self.other)["reviewed"], 1)

    def test_shared_word_favorite_import_runs_once_for_master_only(self):
        word = Word(chinese="你好", pinyin="ni hao", meaning="hello", is_favorite=True)
        self.db.add(word)
        self.db.flush()
        self.db.add(WordCard(user_id=self.other.id, word_id=word.id, is_favorite=False))
        self.db.commit()

        ensure_runtime_migrations(self.engine)
        self.db.expire_all()
        master_card = self.db.query(WordCard).filter_by(user_id=self.master.id).one()
        other_card = self.db.query(WordCard).filter_by(user_id=self.other.id).one()
        self.assertTrue(master_card.is_favorite)
        self.assertFalse(other_card.is_favorite)

        master_card.is_favorite = False
        self.db.commit()
        ensure_runtime_migrations(self.engine)
        self.db.refresh(master_card)
        self.assertFalse(master_card.is_favorite)


if __name__ == "__main__":
    unittest.main()
