from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import date, datetime, time, timedelta
import calendar
import re
from dateutil.rrule import rrulestr
from sqlalchemy import or_

from database import get_db
from models import CalendarEvent
from auth_utils import get_current_user

router = APIRouter(prefix="/calendar-events", tags=["calendar-events"])
RRULE_PATTERN = re.compile(r"FREQ=(DAILY|WEEKLY|MONTHLY|YEARLY)(;BYDAY=(MO|TU|WE|TH|FR|SA|SU)(,(MO|TU|WE|TH|FR|SA|SU))*)?")


def _validate_event_date(value: str) -> str:
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
        raise ValueError("event_date must be YYYY-MM-DD")
    date.fromisoformat(value)
    return value


def _validate_rrule(value: str | None) -> str | None:
    if value is not None and not RRULE_PATTERN.fullmatch(value):
        raise ValueError("Unsupported recurrence rule")
    return value


class EventCreate(BaseModel):
    title: str = Field(min_length=1, max_length=300)
    event_date: str   # "YYYY-MM-DD"
    event_time: Optional[str] = Field(default=None, pattern=r"^([01][0-9]|2[0-3]):[0-5][0-9]$")
    rrule: Optional[str] = None
    recurring_until: Optional[datetime] = None
    color: Optional[str] = Field(default=None, pattern=r"^#[0-9A-Fa-f]{6}$")

    @field_validator("event_date")
    @classmethod
    def valid_date(cls, value: str) -> str:
        return _validate_event_date(value)

    @field_validator("rrule")
    @classmethod
    def valid_rrule(cls, value: str | None) -> str | None:
        return _validate_rrule(value)


class EventUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=300)
    event_date: Optional[str] = None
    event_time: Optional[str] = Field(default=None, pattern=r"^([01][0-9]|2[0-3]):[0-5][0-9]$")
    rrule: Optional[str] = None
    recurring_until: Optional[datetime] = None
    color: Optional[str] = Field(default=None, pattern=r"^#[0-9A-Fa-f]{6}$")

    @field_validator("event_date")
    @classmethod
    def valid_date(cls, value: str | None) -> str | None:
        return _validate_event_date(value) if value is not None else None

    @field_validator("rrule")
    @classmethod
    def valid_rrule(cls, value: str | None) -> str | None:
        return _validate_rrule(value)


@router.get("/")
def get_events(year: int, month: int, db: Session = Depends(get_db), user = Depends(get_current_user)):
    if year < 1 or year > 9999 or month < 1 or month > 12:
        raise HTTPException(status_code=400, detail="Invalid calendar month")
    prefix = f"{year}-{month:02d}"
    first = date(year, month, 1)
    last = date(year, month, calendar.monthrange(year, month)[1])
    source_events = (
        db.query(CalendarEvent)
        .filter(CalendarEvent.user_id == user.id,
                or_(CalendarEvent.event_date.startswith(prefix),
                    (CalendarEvent.rrule != None) & (CalendarEvent.event_date <= last.isoformat())))
        .order_by(CalendarEvent.event_date, CalendarEvent.event_time)
        .all()
    )
    occurrences = []
    for event in source_events:
        item = {column.name: getattr(event, column.name) for column in CalendarEvent.__table__.columns}
        if not event.rrule or not RRULE_PATTERN.fullmatch(event.rrule):
            if event.event_date.startswith(prefix):
                occurrences.append(item)
            continue
        try:
            start_date = date.fromisoformat(event.event_date)
            start_time = time.fromisoformat(event.event_time or "00:00")
            rule = rrulestr(event.rrule, dtstart=datetime.combine(start_date, start_time))
            month_start = datetime.combine(first, time.min)
            month_end = datetime.combine(last, time.max)
            seen = set()
            if first <= start_date <= last:
                seen.add(start_date)
                occurrences.append(item)
            for occurrence in rule.xafter(month_start, count=32, inc=True):
                if occurrence > month_end:
                    break
                occurrence_date = occurrence.date()
                if occurrence_date < start_date or occurrence_date in seen:
                    continue
                if event.recurring_until and occurrence_date > event.recurring_until.date():
                    break
                seen.add(occurrence_date)
                occurrences.append({**item, "event_date": occurrence_date.isoformat()})
        except (ValueError, TypeError):
            if event.event_date.startswith(prefix):
                occurrences.append(item)
    return sorted(occurrences, key=lambda event: (event["event_date"], event["event_time"] or ""))


@router.post("/")
def create_event(body: EventCreate, db: Session = Depends(get_db), user = Depends(get_current_user)):
    event = CalendarEvent(**body.model_dump(), user_id=user.id)
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


@router.patch("/{event_id}")
def update_event(event_id: int, body: EventUpdate, db: Session = Depends(get_db), user = Depends(get_current_user)):
    event = db.query(CalendarEvent).filter(CalendarEvent.id == event_id, CalendarEvent.user_id == user.id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    if body.title is not None:
        event.title = body.title
    if body.event_date is not None:
        event.event_date = body.event_date
    if body.event_time is not None:
        event.event_time = body.event_time
    if "rrule" in body.model_fields_set:
        event.rrule = body.rrule
    if body.recurring_until is not None:
        event.recurring_until = body.recurring_until
    if body.color is not None:
        event.color = body.color
    db.commit()
    db.refresh(event)
    return event


@router.post("/{event_id}/move")
def move_event(event_id: int, new_date: str, db: Session = Depends(get_db), user = Depends(get_current_user)):
    """이벤트 날짜 변경 (드래그앤드롭용)"""
    event = db.query(CalendarEvent).filter(CalendarEvent.id == event_id, CalendarEvent.user_id == user.id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    try:
        event.event_date = _validate_event_date(new_date)
    except ValueError:
        raise HTTPException(status_code=400, detail="new_date must be YYYY-MM-DD")
    db.commit()
    db.refresh(event)
    return event


@router.delete("/{event_id}")
def delete_event(event_id: int, db: Session = Depends(get_db), user = Depends(get_current_user)):
    event = db.query(CalendarEvent).filter(CalendarEvent.id == event_id, CalendarEvent.user_id == user.id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    db.delete(event)
    db.commit()
    return {"ok": True}
