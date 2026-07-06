from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone

from database import get_db
from models import Task, Urgency, Status
from rrule_utils import get_next_occurrence, simplify_rrule, create_daily_rrule, create_weekly_rrule, create_monthly_rrule
from auth_utils import get_current_user

router = APIRouter(prefix="/tasks", tags=["tasks"])


class TaskCreate(BaseModel):
    title: str
    category: Optional[str] = None
    urgency: Urgency = Urgency.normal
    due_at: Optional[datetime] = None
    rrule: Optional[str] = None
    recurring_until: Optional[datetime] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    category: Optional[str] = None
    urgency: Optional[Urgency] = None
    status: Optional[Status] = None
    order: Optional[int] = None
    due_at: Optional[datetime] = None
    rrule: Optional[str] = None
    recurring_until: Optional[datetime] = None


class TaskReorder(BaseModel):
    ids: list[int]


@router.get("/history")
def get_task_history(year: int, month: int, db: Session = Depends(get_db)):
    import calendar as cal
    first_day = datetime(year, month, 1, tzinfo=timezone.utc)
    last_day = datetime(year, month, cal.monthrange(year, month)[1], 23, 59, 59, tzinfo=timezone.utc)
    return (
        db.query(Task)
        .filter(Task.status == Status.done, Task.done_at >= first_day, Task.done_at <= last_day)
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
    return task


@router.patch("/{task_id}")
def update_task(task_id: int, body: TaskUpdate, db: Session = Depends(get_db), user = Depends(get_current_user)):
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == user.id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    data = body.model_dump(exclude_unset=True)

    # 반복 작업 완료 처리
    if data.get("status") == Status.done and task.status != Status.done:
        data["done_at"] = datetime.now(timezone.utc)

        # 반복 작업이면 다음 날짜 생성
        if task.rrule:
            next_date = get_next_occurrence(task.rrule)
            if next_date and (not task.recurring_until or next_date <= task.recurring_until):
                # 현재 작업은 done으로 유지하고, 새 작업 생성
                new_task = Task(
                    title=task.title,
                    category=task.category,
                    urgency=task.urgency,
                    rrule=task.rrule,
                    recurring_until=task.recurring_until,
                    due_at=next_date,
                    status=Status.todo,
                    order=db.query(func.max(Task.order)).scalar() or 0 + 1,
                )
                db.add(new_task)
    elif data.get("status") == Status.todo:
        data["done_at"] = None

    for k, v in data.items():
        setattr(task, k, v)

    db.commit()
    db.refresh(task)
    return task


@router.delete("/{task_id}")
def delete_task(task_id: int, db: Session = Depends(get_db), user = Depends(get_current_user)):
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == user.id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    db.delete(task)
    db.commit()
    return {"ok": True}


@router.get("/scheduled")
def get_scheduled_tasks(year: int, month: int, db: Session = Depends(get_db)):
    import calendar as cal
    first_day = datetime(year, month, 1, tzinfo=timezone.utc)
    last_day = datetime(year, month, cal.monthrange(year, month)[1], 23, 59, 59, tzinfo=timezone.utc)
    return (
        db.query(Task)
        .filter(Task.due_at >= first_day, Task.due_at <= last_day)
        .order_by(Task.due_at)
        .all()
    )


@router.post("/reorder")
def reorder_tasks(body: TaskReorder, db: Session = Depends(get_db), user = Depends(get_current_user)):
    for i, task_id in enumerate(body.ids):
        db.query(Task).filter(Task.id == task_id, Task.user_id == user.id).update({"order": i})
    db.commit()
    return {"ok": True}
