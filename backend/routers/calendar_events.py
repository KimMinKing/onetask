from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone

from database import get_db
from models import CalendarEvent
from auth_utils import get_current_user

router = APIRouter(prefix="/calendar-events", tags=["calendar-events"])


class EventCreate(BaseModel):
    title: str
    event_date: str   # "YYYY-MM-DD"
    event_time: Optional[str] = None  # "HH:MM"
    rrule: Optional[str] = None
    recurring_until: Optional[datetime] = None
    color: Optional[str] = None  # "#RRGGBB"


class EventUpdate(BaseModel):
    title: Optional[str] = None
    event_date: Optional[str] = None
    event_time: Optional[str] = None
    rrule: Optional[str] = None
    recurring_until: Optional[datetime] = None
    color: Optional[str] = None


@router.get("/")
def get_events(year: int, month: int, db: Session = Depends(get_db), user = Depends(get_current_user)):
    prefix = f"{year}-{month:02d}"
    return (
        db.query(CalendarEvent)
        .filter(CalendarEvent.user_id == user.id, CalendarEvent.event_date.startswith(prefix))
        .order_by(CalendarEvent.event_date, CalendarEvent.event_time)
        .all()
    )


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
    if body.rrule is not None:
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
    event.event_date = new_date
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
