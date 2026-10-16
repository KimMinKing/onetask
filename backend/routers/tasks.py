from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone

from database import get_db
from models import Task, Urgency, Status
from rrule_utils import get_next_occurrence, simplify_rrule, create_daily_rrule, create_weekly_rrule, create_monthly_rrule
from auth_utils import get_current_user
from obsidian_sync import sync_dates_for_user, task_note_date

router = APIRouter(prefix="/tasks", tags=["tasks"])
RRULE_PATTERN = r"^FREQ=(DAILY|WEEKLY|MONTHLY|YEARLY)(;BYDAY=(MO|TU|WE|TH|FR|SA|SU)(,(MO|TU|WE|TH|FR|SA|SU))*)?$"


class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=300)
    category: Optional[str] = Field(default=None, max_length=100)
    urgency: Urgency = Urgency.normal
    due_at: Optional[datetime] = None
    rrule: Optional[str] = Field(default=None, max_length=100, pattern=RRULE_PATTERN)
    recurring_until: Optional[datetime] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=300)
    category: Optional[str] = Field(default=None, max_length=100)
    urgency: Optional[Urgency] = None
    status: Optional[Status] = None
    order: Optional[int] = None
    due_at: Optional[datetime] = None
    rrule: Optional[str] = Field(default=None, max_length=100, pattern=RRULE_PATTERN)
    recurring_until: Optional[datetime] = None


class TaskReorder(BaseModel):
    ids: list[int] = Field(max_length=1000)


@router.get("/history")
def get_task_history(year: int = Query(ge=1, le=9999), month: int = Query(ge=1, le=12), db: Session = Depends(get_db), user = Depends(get_current_user)):
    import calendar as cal
    first_day = datetime(year, month, 1, tzinfo=timezone.utc)
    last_day = datetime(year, month, cal.monthrange(year, month)[1], 23, 59, 59, tzinfo=timezone.utc)
    return (
        db.query(Task)
        .filter(Task.user_id == user.id, Task.status == Status.done, Task.done_at >= first_day, Task.done_at <= last_day)
        .order_by(Task.done_at)
        .all()
    )


@router.get("/")
def get_tasks(status: Optional[str] = None, db: Session = Depends(get_db), user = Depends(get_current_user)):
    q = db.query(Task).filter(Task.user_id == user.id)
    if status:
        q = q.filter(Task.status == status)
    return q.order_by(Task.order, Task.created_at).all()


@router.post("/")
def create_task(body: TaskCreate, db: Session = Depends(get_db), user = Depends(get_current_user)):
    max_order = db.query(func.max(Task.order)).filter(Task.user_id == user.id).scalar() or 0
    task = Task(**body.model_dump(), user_id=user.id, order=max_order + 1)
    db.add(task)
    db.commit()
    db.refresh(task)
    sync_dates_for_user(db, user.id, [task_note_date(task)])
    return task


@router.patch("/{task_id}")
def update_task(task_id: int, body: TaskUpdate, db: Session = Depends(get_db), user = Depends(get_current_user)):
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == user.id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    affected_dates = {task_note_date(task)}
    data = body.model_dump(exclude_unset=True)
    if "due_at" in data or data.get("status") == Status.todo:
        data["telegram_notified_at"] = None

    # 반복 작업 완료 처리
    if data.get("status") == Status.done and task.status != Status.done:
        data["done_at"] = datetime.now(timezone.utc)

        # 반복 작업이면 다음 날짜 생성
        if task.rrule:
            start_date = task.due_at
            if start_date and start_date.tzinfo is None:
                start_date = start_date.replace(tzinfo=timezone.utc)
            reference = max(datetime.now(timezone.utc), start_date) if start_date else None
            next_date = get_next_occurrence(task.rrule, from_date=reference, start_date=start_date)
            recurring_until = task.recurring_until
            if recurring_until and recurring_until.tzinfo is None:
                recurring_until = recurring_until.replace(tzinfo=timezone.utc)
            if next_date and (not recurring_until or next_date <= recurring_until):
                # 현재 작업은 done으로 유지하고, 새 작업 생성
                new_task = Task(
                    user_id=user.id,
                    title=task.title,
                    category=task.category,
                    urgency=task.urgency,
                    rrule=task.rrule,
                    recurring_until=task.recurring_until,
                    due_at=next_date,
                    status=Status.todo,
                    order=(db.query(func.max(Task.order)).filter(Task.user_id == user.id).scalar() or 0) + 1,
                )
                db.add(new_task)
    elif data.get("status") == Status.todo:
        data["done_at"] = None

    for k, v in data.items():
        setattr(task, k, v)

    db.commit()
    db.refresh(task)
    affected_dates.add(task_note_date(task))
    if task.rrule and data.get("status") == Status.done:
        db.flush()
        newest = (
            db.query(Task)
            .filter(Task.user_id == user.id, Task.title == task.title, Task.status == Status.todo)
            .order_by(Task.created_at.desc())
            .first()
        )
        if newest:
            affected_dates.add(task_note_date(newest))
    sync_dates_for_user(db, user.id, affected_dates)
    return task


@router.delete("/{task_id}")
def delete_task(task_id: int, db: Session = Depends(get_db), user = Depends(get_current_user)):
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == user.id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    affected_date = task_note_date(task)
    db.delete(task)
    db.commit()
    sync_dates_for_user(db, user.id, [affected_date])
    return {"ok": True}


@router.get("/scheduled")
def get_scheduled_tasks(year: int = Query(ge=1, le=9999), month: int = Query(ge=1, le=12), db: Session = Depends(get_db), user = Depends(get_current_user)):
    import calendar as cal
    first_day = datetime(year, month, 1, tzinfo=timezone.utc)
    last_day = datetime(year, month, cal.monthrange(year, month)[1], 23, 59, 59, tzinfo=timezone.utc)
    return (
        db.query(Task)
        .filter(Task.user_id == user.id, Task.due_at >= first_day, Task.due_at <= last_day)
        .order_by(Task.due_at)
        .all()
    )


@router.post("/reorder")
def reorder_tasks(body: TaskReorder, db: Session = Depends(get_db), user = Depends(get_current_user)):
    for i, task_id in enumerate(body.ids):
        db.query(Task).filter(Task.id == task_id, Task.user_id == user.id).update({"order": i})
    db.commit()
    tasks = db.query(Task).filter(Task.id.in_(body.ids), Task.user_id == user.id).all()
    sync_dates_for_user(db, user.id, [task_note_date(task) for task in tasks])
    return {"ok": True}
