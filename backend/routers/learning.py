from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from auth_utils import get_current_user
from database import get_db
from learning_service import build_today_plan, weekly_report
from models import LearningActivity, LearningProgress, MistakeItem, User

router = APIRouter(prefix="/learning", tags=["learning"])


class ProgressUpdate(BaseModel):
    completed: bool = True
    score: Optional[int] = Field(default=None, ge=0, le=100)
    last_position: Optional[int] = Field(default=None, ge=0)
    duration_minutes: int = Field(default=0, ge=0, le=600)
    title: Optional[str] = Field(default=None, max_length=300)


class ActivityCreate(BaseModel):
    subject: str = Field(min_length=1, max_length=30)
    activity_type: str = Field(min_length=1, max_length=30)
    unit_id: Optional[str] = Field(default=None, max_length=100)
    title: Optional[str] = Field(default=None, max_length=300)
    duration_minutes: int = Field(default=0, ge=0, le=600)
    correct_count: Optional[int] = Field(default=None, ge=0)
    total_count: Optional[int] = Field(default=None, ge=0)
    note: Optional[str] = Field(default=None, max_length=1000)


class MistakeCreate(BaseModel):
    subject: str = Field(min_length=1, max_length=30)
    item_key: str = Field(min_length=1, max_length=120)
    question: str = Field(min_length=1, max_length=1000)
    correct_answer: str = Field(min_length=1, max_length=1000)
    user_answer: Optional[str] = Field(default=None, max_length=1000)
    explanation: Optional[str] = Field(default=None, max_length=2000)


class LocalMigration(BaseModel):
    sqld: dict[str, bool] = Field(default_factory=dict)
    network: dict[str, bool] = Field(default_factory=dict)


@router.get("/today")
def today(minutes: Optional[int] = Query(default=None), db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if minutes is not None and minutes not in {5, 15, 30, 60}:
        raise HTTPException(status_code=400, detail="minutes must be 5, 15, 30, or 60")
    return build_today_plan(db, user.id, minutes)


@router.get("/progress")
def progress(subject: Optional[str] = None, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    query = db.query(LearningProgress).filter(LearningProgress.user_id == user.id)
    if subject:
        query = query.filter(LearningProgress.subject == subject)
    return query.order_by(LearningProgress.updated_at.desc()).all()


@router.put("/progress/{subject}/{unit_id}")
def update_progress(subject: str, unit_id: str, data: ProgressUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    row = db.query(LearningProgress).filter(
        LearningProgress.user_id == user.id,
        LearningProgress.subject == subject,
        LearningProgress.unit_id == unit_id,
    ).first()
    if not row:
        row = LearningProgress(user_id=user.id, subject=subject, unit_id=unit_id)
        db.add(row)
    row.completed = data.completed
    row.score = data.score
    row.last_position = data.last_position
    row.attempts = (row.attempts or 0) + 1
    row.completed_at = datetime.now(timezone.utc) if data.completed else None
    if data.completed:
        db.add(LearningActivity(user_id=user.id, subject=subject, activity_type="lesson", unit_id=unit_id, title=data.title, duration_minutes=data.duration_minutes, correct_count=1, total_count=1))
    db.commit()
    db.refresh(row)
    return row


@router.post("/activities")
def create_activity(data: ActivityCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if data.correct_count is not None and data.total_count is not None and data.correct_count > data.total_count:
        raise HTTPException(status_code=400, detail="correct_count cannot exceed total_count")
    row = LearningActivity(user_id=user.id, **data.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.get("/mistakes")
def mistakes(subject: Optional[str] = None, include_resolved: bool = False, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    query = db.query(MistakeItem).filter(MistakeItem.user_id == user.id)
    if subject:
        query = query.filter(MistakeItem.subject == subject)
    if not include_resolved:
        query = query.filter(MistakeItem.resolved_at == None)
    return query.order_by(MistakeItem.last_mistake_at.desc()).all()


@router.post("/mistakes")
def add_mistake(data: MistakeCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    row = db.query(MistakeItem).filter(MistakeItem.user_id == user.id, MistakeItem.subject == data.subject, MistakeItem.item_key == data.item_key).first()
    if row:
        for key, value in data.model_dump().items():
            setattr(row, key, value)
        row.mistake_count += 1
        row.last_mistake_at = datetime.now(timezone.utc)
        row.resolved_at = None
    else:
        row = MistakeItem(user_id=user.id, **data.model_dump())
        db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.post("/mistakes/{mistake_id}/resolve")
def resolve_mistake(mistake_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    row = db.query(MistakeItem).filter(MistakeItem.id == mistake_id, MistakeItem.user_id == user.id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Mistake not found")
    row.resolved_at = datetime.now(timezone.utc)
    db.commit()
    return {"ok": True}


@router.get("/weekly-report")
def report(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return weekly_report(db, user.id)


@router.post("/migrate-local")
def migrate_local(data: LocalMigration, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    imported = 0
    for subject, values in (("sqld", data.sqld), ("network", data.network)):
        for unit_id, completed in values.items():
            if not completed or not unit_id.isdigit():
                continue
            row = db.query(LearningProgress).filter(LearningProgress.user_id == user.id, LearningProgress.subject == subject, LearningProgress.unit_id == unit_id).first()
            if not row:
                db.add(LearningProgress(user_id=user.id, subject=subject, unit_id=unit_id, completed=True, completed_at=datetime.now(timezone.utc)))
                imported += 1
    db.commit()
    return {"imported": imported}
