import os
from unittest.mock import patch

os.environ.setdefault("SECRET_KEY", "test-secret-key-that-is-at-least-32-characters")

from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from auth_utils import get_current_user
from database import get_db
from models import Base
from routers import auth, learning, settings


def test_cpp_course_over_authenticated_http_routes():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    database = sessionmaker(bind=engine)()
    app = FastAPI()
    app.include_router(auth.router)
    app.include_router(learning.router, dependencies=[Depends(get_current_user)])
    app.include_router(settings.router, dependencies=[Depends(get_current_user)])
    app.dependency_overrides[get_db] = lambda: database

    try:
        with patch.dict(os.environ, {"BOOTSTRAP_TOKEN": "test-bootstrap-token-at-least-32-characters", "COOKIE_SECURE": "false"}):
            with TestClient(app) as client:
                signup = client.post("/auth/signup", json={"username": "cpp_smoke", "password": "test-password-123"},
                                     headers={"X-Bootstrap-Token": "test-bootstrap-token-at-least-32-characters"})
                assert signup.status_code == 200, signup.text
                assert client.get("/auth/me").json()["username"] == "cpp_smoke"

                settings_response = client.put("/settings/", json={"focus_subject": "cpp", "study_minutes": 15})
                assert settings_response.status_code == 200, settings_response.text
                assert settings_response.json()["focus_subject"] == "cpp"
                plan = client.get("/learning/today").json()
                assert plan["tasks"][0]["href"] == "/cpp?step=1"

                completed = client.put("/learning/progress/cpp/1", json={"completed": True, "score": 100,
                                                                             "duration_minutes": 15, "title": "빌드와 실행"})
                assert completed.status_code == 200, completed.text
                assert completed.json()["completed"] is True
                assert client.get("/learning/today").json()["tasks"][0]["href"] == "/cpp?step=2"
                assert any(row["unit_id"] == "1" for row in client.get("/learning/progress?subject=cpp").json())

                invalid = client.put("/learning/progress/cpp/27", json={"completed": True})
                assert invalid.status_code == 400
                mistake = client.post("/learning/mistakes", json={"subject": "cpp", "item_key": "lesson-1",
                                                                   "question": "test?", "correct_answer": "A", "user_answer": "B"})
                assert mistake.status_code == 200, mistake.text
                assert len(client.get("/learning/mistakes?subject=cpp").json()) == 1
    finally:
        database.close()
        engine.dispose()
