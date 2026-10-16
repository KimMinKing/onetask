import os
import sys
import unittest
from pathlib import Path

os.environ.setdefault("SECRET_KEY", "test-secret-key-that-is-at-least-32-characters")
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from pydantic import ValidationError
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from models import Base, CalendarEvent, User
from routers.calendar_events import EventCreate, get_events


class CalendarRecurrenceTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(self.engine)
        self.db = sessionmaker(bind=self.engine)()
        self.first = User(username="first", hashed_password="unused", is_master=True)
        self.second = User(username="second", hashed_password="unused", is_master=False)
        self.db.add_all([self.first, self.second])
        self.db.flush()
        self.db.add_all([
            CalendarEvent(user_id=self.first.id, title="Daily", event_date="2026-09-28", event_time="09:00", rrule="FREQ=DAILY"),
            CalendarEvent(user_id=self.second.id, title="Private", event_date="2026-10-03"),
        ])
        self.db.commit()

    def tearDown(self):
        self.db.close()
        self.engine.dispose()

    def test_repeated_events_expand_in_later_month_without_crossing_users(self):
        events = get_events(2026, 10, self.db, self.first)
        self.assertEqual(len(events), 31)
        self.assertEqual(events[0]["event_date"], "2026-10-01")
        self.assertEqual(events[-1]["event_date"], "2026-10-31")
        self.assertTrue(all(event["title"] == "Daily" for event in events))
        self.assertEqual(len(get_events(2026, 10, self.db, self.second)), 1)

    def test_invalid_calendar_input_is_rejected(self):
        with self.assertRaises(ValidationError):
            EventCreate(title="Bad", event_date="2026-02-30")
        with self.assertRaises(ValidationError):
            EventCreate(title="Bad", event_date="2026-W40-1")
        with self.assertRaises(ValidationError):
            EventCreate(title="Bad", event_date="2026-10-01", rrule="FREQ=SECONDLY")


if __name__ == "__main__":
    unittest.main()
