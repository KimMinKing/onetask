import sys
import os
import unittest
from datetime import datetime, timezone
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

os.environ.setdefault("SECRET_KEY", "test-secret-key-that-is-at-least-32-characters")
os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from rrule_utils import generate_rrule, get_next_occurrence, parse_rrule
from models import Base, Status, Task, User
from routers.tasks import TaskCreate, TaskUpdate, create_task, update_task


class RecurrenceTests(unittest.TestCase):
    def test_picker_rule_uses_aware_start_date(self):
        start = datetime(2026, 9, 28, 9, 0, tzinfo=timezone.utc)
        reference = datetime(2026, 9, 30, 10, 0, tzinfo=timezone.utc)
        self.assertEqual(
            get_next_occurrence("FREQ=DAILY", from_date=reference, start_date=start),
            datetime(2026, 10, 1, 9, 0, tzinfo=timezone.utc),
        )

    def test_generated_rule_round_trips(self):
        start = datetime(2026, 9, 28, 9, 0, tzinfo=timezone.utc)
        rule = generate_rrule("daily", start, count=3)
        self.assertEqual(len(parse_rrule(rule, after=start)), 2)
        self.assertEqual(get_next_occurrence(rule, from_date=start), datetime(2026, 9, 29, 9, 0, tzinfo=timezone.utc))

    def test_recurring_task_survives_database_reload_and_completion(self):
        engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        Base.metadata.create_all(engine)
        db = sessionmaker(bind=engine)()
        try:
            user = User(username="master", hashed_password="unused", is_master=True)
            db.add(user)
            db.commit()
            task = create_task(TaskCreate(title="repeat", due_at=datetime(2026, 9, 28, 9, tzinfo=timezone.utc), rrule="FREQ=DAILY"), db, user)
            db.expunge_all()
            stored = db.get(Task, task.id)
            self.assertEqual(stored.rrule, "FREQ=DAILY")
            update_task(task.id, TaskUpdate(status=Status.done), db, user)
            pending = db.query(Task).filter(Task.status == Status.todo).one()
            self.assertEqual(pending.rrule, "FREQ=DAILY")
            self.assertGreater(pending.due_at, stored.due_at)
        finally:
            db.close()
            engine.dispose()


if __name__ == "__main__":
    unittest.main()
