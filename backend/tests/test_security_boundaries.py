import os
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

os.environ.setdefault("SECRET_KEY", "test-secret-key-that-is-at-least-32-characters")
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from auth_utils import get_current_user
from database import get_db
from models import Base, PushSubscription, User, Word
from routers import auth, english_words, image_test, japanese_words, words
from routers.push import SubscribeRequest, subscribe


class SecurityBoundaryTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        Base.metadata.create_all(self.engine)
        self.db = sessionmaker(bind=self.engine)()

    def tearDown(self):
        self.db.close()
        self.engine.dispose()

    def test_first_account_requires_server_bootstrap_token(self):
        app = FastAPI()
        app.include_router(auth.router)
        app.dependency_overrides[get_db] = lambda: self.db
        client = TestClient(app)
        body = {"username": "master", "password": "strong-password-123"}
        with patch.dict(os.environ, {"BOOTSTRAP_TOKEN": "bootstrap-token-that-is-long-enough-123"}):
            self.assertEqual(client.post("/auth/signup", json=body).status_code, 403)
            response = client.post("/auth/signup", json=body, headers={"X-Bootstrap-Token": "bootstrap-token-that-is-long-enough-123"})
        self.assertEqual(response.status_code, 200, response.text)
        self.assertTrue(self.db.query(User).one().is_master)

    def test_login_limit_persists_in_database(self):
        app = FastAPI()
        app.include_router(auth.router)
        app.dependency_overrides[get_db] = lambda: self.db
        client = TestClient(app)
        for _ in range(5):
            self.assertEqual(client.post("/auth/login", json={"username": "missing", "password": "wrong"}).status_code, 401)
        self.assertEqual(client.post("/auth/login", json={"username": "missing", "password": "wrong"}).status_code, 429)

    def test_regular_account_cannot_change_shared_dictionary_or_generate_images(self):
        user = User(username="other", hashed_password="unused", is_master=False)
        word = Word(chinese="你好", pinyin="nihao", meaning="hello")
        self.db.add_all([user, word])
        self.db.commit()
        app = FastAPI()
        for router in (words.router, english_words.router, japanese_words.router, image_test.router):
            app.include_router(router, dependencies=[Depends(get_current_user)])
        app.dependency_overrides[get_db] = lambda: self.db
        app.dependency_overrides[get_current_user] = lambda: user
        client = TestClient(app)
        self.assertEqual(client.delete(f"/words/{word.id}").status_code, 403)
        self.assertEqual(client.post("/english-words/tools/translate-missing-zh").status_code, 403)
        self.assertEqual(client.post("/japanese-words/tools/translate-missing-zh").status_code, 403)
        self.assertEqual(client.post("/image-test/generate", json={"model_key": "flux-schnell"}).status_code, 403)
        self.assertIsNotNone(self.db.get(Word, word.id))

    def test_push_endpoint_moves_to_new_account_on_resubscribe(self):
        first = User(username="first", hashed_password="unused", is_master=True)
        second = User(username="second", hashed_password="unused", is_master=False)
        self.db.add_all([first, second])
        self.db.commit()
        request = SubscribeRequest(endpoint="https://push.example/sub", p256dh="key", auth="auth")
        subscribe(request, self.db, first)
        subscribe(request, self.db, second)
        subscriptions = self.db.query(PushSubscription).all()
        self.assertEqual(len(subscriptions), 1)
        self.assertEqual(subscriptions[0].user_id, second.id)


if __name__ == "__main__":
    unittest.main()
