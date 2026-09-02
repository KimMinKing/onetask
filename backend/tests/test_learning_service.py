from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from datetime import date, timedelta

from database import Base
from learning_service import build_today_plan, next_unit, weekly_report
from models import LearningActivity, LearningProgress, User, UserSettings
from routers.learning import ActivityCreate, ProgressUpdate, create_activity, update_progress


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

    assert plan["tasks"][0]["completed"] is True
    assert "101단계" not in plan["tasks"][0]["title"]
