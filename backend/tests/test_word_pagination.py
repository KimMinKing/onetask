import os
import sys
import unittest
from pathlib import Path

os.environ.setdefault("SECRET_KEY", "test-secret-key-that-is-at-least-32-characters")
os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from auth_utils import get_current_user
from database import get_db
from models import Base, EnglishWord, JapaneseWord, User, Word
from routers import english_words, japanese_words, search, words
from english_beginner_words import REVIEWED_WORDS


class WordPaginationTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        Base.metadata.create_all(self.engine)
        self.db = sessionmaker(bind=self.engine)()
        self.user = User(username="reader", hashed_password="unused", is_master=False)
        self.db.add(self.user)
        reviewed = sorted(REVIEWED_WORDS)[:205]
        for index in range(205):
            meaning = "needle" if index == 204 else f"meaning-{index:03d}"
            self.db.add_all([
                Word(chinese=f"汉{index:03d}", pinyin=f"han{index:03d}", meaning=meaning),
                EnglishWord(word=reviewed[index], meaning=meaning, level="A1" if index == 0 else "A2"),
                JapaneseWord(expression=f"語{index:03d}", reading=f"ご{index:03d}", meaning=meaning),
            ])
        self.db.add(EnglishWord(word="unreviewed", meaning="웨이팅", level="B1", example_en="Wrong example"))
        self.db.commit()
        app = FastAPI()
        for router in (words.router, english_words.router, japanese_words.router, search.router):
            app.include_router(router)
        app.dependency_overrides[get_db] = lambda: self.db
        app.dependency_overrides[get_current_user] = lambda: self.user
        self.client = TestClient(app)

    def tearDown(self):
        self.db.close()
        self.engine.dispose()

    def test_each_dictionary_pages_and_searches_the_entire_table(self):
        for path in ("/words/", "/english-words/", "/japanese-words/list"):
            with self.subTest(path=path):
                first = self.client.get(path)
                self.assertEqual(first.status_code, 200, first.text)
                self.assertEqual(len(first.json()), 100)
                last = self.client.get(path, params={"offset": 200})
                self.assertEqual(len(last.json()), 5)
                search = self.client.get(path, params={"q": "needle"})
                self.assertEqual(len(search.json()), 1)
                self.assertEqual(search.json()[0]["meaning"], "needle")
                self.assertEqual(self.client.get(path, params={"limit": 201}).status_code, 422)

    def test_unreviewed_english_does_not_enter_learning_or_search(self):
        self.assertEqual(self.client.get("/english-words/", params={"q": "unreviewed"}).json(), [])
        self.assertEqual(self.client.get("/search/", params={"q": "unreviewed", "lang": "en"}).json()["english"], [])
        for route in ("/english-words/due", "/english-words/daily"):
            words = self.client.get(route, params={"new_count": 205}).json()
            self.assertNotIn("unreviewed", [word["word"] for word in words])

    def test_daily_english_starts_with_a1_before_new_a2_words(self):
        daily = self.client.get("/english-words/daily", params={"new_count": 1}).json()
        self.assertEqual(len(daily), 1)
        self.assertEqual(daily[0]["level"], "A1")


if __name__ == "__main__":
    unittest.main()
