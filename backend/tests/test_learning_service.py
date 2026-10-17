from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from datetime import date, datetime, timedelta, timezone
import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from database import Base
from learning_service import build_today_plan, next_unit, weekly_report
from models import EnglishWord, EnglishWordCard, LearningActivity, LearningProgress, User, UserSettings
from routers.learning import ActivityCreate, LocalMigration, ProgressUpdate, create_activity, migrate_local, update_progress


def session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine)()


def test_plan_uses_exam_priority_and_completed_unit():
    db = session()
    user = User(username="learner", hashed_password="x")
    db.add(user)
    db.flush()
    db.add(UserSettings(user_id=user.id, study_minutes=30, focus_subject="network", sqld_exam_date=(date.today() + timedelta(days=7)).isoformat()))
    db.add(LearningProgress(user_id=user.id, subject="sqld", unit_id="1", completed=True))
    db.commit()

    plan = build_today_plan(db, user.id)

    assert plan["minutes"] == 30
    assert plan["primary_subject"] == "sqld"
    assert any(task["unit_id"] == "2" for task in plan["tasks"])
    assert sum(task["minutes"] for task in plan["tasks"]) == 30


@pytest.mark.parametrize("minutes,expected", [
    (5, {"zh": 2, "en": 3}),
    (15, {"zh": 3, "en": 4, "sqld": 8}),
    (30, {"zh": 7, "en": 8, "sqld": 15}),
    (60, {"zh": 10, "en": 10, "sqld": 25, "network": 15}),
])
def test_daily_plan_includes_chinese_and_english_within_budget(minutes, expected):
    db = session()
    user = User(username=f"daily_{minutes}", hashed_password="x")
    db.add(user)
    db.commit()

    plan = build_today_plan(db, user.id, minutes)

    assert {task["subject"]: task["minutes"] for task in plan["tasks"]} == expected
    assert plan["total_minutes"] == minutes
    english = next(task for task in plan["tasks"] if task["subject"] == "en")
    assert english["href"] == "/words?en=B1"
    assert english["unit_id"] is None


def test_english_focus_merges_task_and_review_marks_it_complete():
    db = session()
    user = User(username="english_focus", hashed_password="x")
    db.add(user)
    db.flush()
    db.add(UserSettings(user_id=user.id, study_minutes=15, focus_subject="en"))
    other_level = EnglishWord(word="first", meaning="첫 번째", level="A1")
    word = EnglishWord(word="example", meaning="예시", level="B1")
    db.add_all([other_level, word])
    db.flush()
    db.add(EnglishWordCard(user_id=user.id, word_id=other_level.id, last_review=datetime.now(timezone.utc)))
    db.commit()

    before = build_today_plan(db, user.id)
    assert before["tasks"][1]["completed"] is False

    db.add(EnglishWordCard(user_id=user.id, word_id=word.id, last_review=datetime.now(timezone.utc)))
    db.commit()
    plan = build_today_plan(db, user.id)

    assert [(task["subject"], task["minutes"]) for task in plan["tasks"]] == [("zh", 3), ("en", 12)]
    assert plan["tasks"][1]["completed"] is True
    assert plan["tasks"][1]["unit_id"] is None


def test_progress_and_report_are_isolated_by_user():
    db = session()
    first = User(username="first", hashed_password="x")
    second = User(username="second", hashed_password="x")
    db.add_all([first, second])
    db.flush()
    db.add_all([
        LearningProgress(user_id=first.id, subject="network", unit_id="1", completed=True),
        LearningActivity(user_id=first.id, subject="network", activity_type="lesson", duration_minutes=15),
    ])
    db.commit()

    assert next_unit(db, first.id, "network") == 2
    assert next_unit(db, second.id, "network") == 1
    assert weekly_report(db, first.id)["minutes"] == 15
    assert weekly_report(db, second.id)["activities"] == 0


def test_completion_and_client_activity_are_idempotent():
    db = session()
    user = User(username="idempotent", hashed_password="x")
    db.add(user)
    db.commit()
    db.refresh(user)

    update_progress("sqld", "1", ProgressUpdate(completed=True, duration_minutes=15), db, user)
    update_progress("sqld", "1", ProgressUpdate(completed=True, duration_minutes=15), db, user)
    payload = ActivityCreate(client_event_id="same-event", subject="languages", activity_type="listen", duration_minutes=10)
    create_activity(payload, db, user)
    create_activity(payload, db, user)

    assert db.query(LearningActivity).filter(LearningActivity.user_id == user.id).count() == 2


def test_completed_course_has_no_phantom_101st_lesson():
    db = session()
    user = User(username="graduate", hashed_password="x")
    db.add(user)
    db.flush()
    db.add(UserSettings(user_id=user.id, study_minutes=15, focus_subject="sqld"))
    db.add_all([LearningProgress(user_id=user.id, subject="sqld", unit_id=str(unit), completed=True) for unit in range(1, 101)])
    db.commit()

    plan = build_today_plan(db, user.id)

    sqld_task = next(task for task in plan["tasks"] if task["subject"] == "sqld")
    assert sqld_task["completed"] is True
    assert "101단계" not in sqld_task["title"]


def test_cpp_focus_and_extended_network_steps_have_valid_deep_links():
    db = session()
    user = User(username="systems_learner", hashed_password="x")
    db.add(user)
    db.flush()
    settings = UserSettings(user_id=user.id, study_minutes=15, focus_subject="cpp")
    db.add(settings)
    db.add_all([LearningProgress(user_id=user.id, subject="network", unit_id=str(unit), completed=True)
                for unit in range(1, 101)])
    db.commit()

    cpp_task = next(task for task in build_today_plan(db, user.id)["tasks"] if task["subject"] == "cpp")
    assert cpp_task["href"] == "/cpp?step=1"
    assert next_unit(db, user.id, "network") == 101

    settings.focus_subject = "network"
    db.commit()
    network_task = next(task for task in build_today_plan(db, user.id)["tasks"] if task["subject"] == "network")
    assert network_task["href"] == "/network?step=101"


def test_course_progress_rejects_out_of_range_and_noncanonical_units():
    db = session()
    user = User(username="bounded_units", hashed_password="x")
    db.add(user)
    db.commit()
    db.refresh(user)

    update_progress("cpp", "26", ProgressUpdate(completed=True), db, user)
    update_progress("network", "120", ProgressUpdate(completed=True), db, user)
    for subject, unit_id in (("cpp", "27"), ("network", "121"), ("sqld", "101"),
                             ("cpp", "00"), ("cpp", "٢"), ("cpp", "9" * 500)):
        with pytest.raises(HTTPException) as error:
            update_progress(subject, unit_id, ProgressUpdate(completed=True), db, user)
        assert error.value.status_code == 400
    assert db.query(LearningProgress).filter_by(user_id=user.id).count() == 2


def test_local_progress_migration_skips_invalid_units_and_limits_payload():
    db = session()
    user = User(username="migration_units", hashed_password="x")
    db.add(user)
    db.commit()
    db.refresh(user)

    result = migrate_local(LocalMigration(sqld={"100": True, "101": True, "01": True},
                                          network={"101": True, "121": True, "9" * 500: True}), db, user)
    assert result["imported"] == 2
    assert {(row.subject, row.unit_id) for row in db.query(LearningProgress).all()} == {
        ("sqld", "100"), ("network", "101")}
    with pytest.raises(ValidationError):
        LocalMigration(network={str(unit): True for unit in range(1, 122)})
