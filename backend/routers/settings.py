from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from database import get_db
from models import User, UserSettings
from auth_utils import get_current_user

router = APIRouter(prefix="/settings", tags=["settings"])


class SettingsResponse(BaseModel):
    daily_goal_words: int
    daily_goal_tasks: int
    notification_hour: int
    notification_enabled: bool
    theme: str
    language_priority: str


class SettingsUpdate(BaseModel):
    daily_goal_words: Optional[int] = None
    daily_goal_tasks: Optional[int] = None
    notification_hour: Optional[int] = None
    notification_enabled: Optional[bool] = None
    theme: Optional[str] = None
    language_priority: Optional[str] = None


class NotificationUpdate(BaseModel):
    notification_hour: int
    notification_enabled: bool


class GoalsUpdate(BaseModel):
    daily_goal_words: int
    daily_goal_tasks: int


@router.get("/", response_model=SettingsResponse)
def get_settings(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    settings = db.query(UserSettings).filter(UserSettings.user_id == user.id).first()
    if not settings:
        # Create default settings for new user
        settings = UserSettings(user_id=user.id)
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return SettingsResponse(
        daily_goal_words=settings.daily_goal_words,
        daily_goal_tasks=settings.daily_goal_tasks,
        notification_hour=settings.notification_hour,
        notification_enabled=settings.notification_enabled,
        theme=settings.theme,
        language_priority=settings.language_priority,
    )


@router.put("/", response_model=SettingsResponse)
def update_settings(
    data: SettingsUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    settings = db.query(UserSettings).filter(UserSettings.user_id == user.id).first()
    if not settings:
        settings = UserSettings(user_id=user.id)
        db.add(settings)

    if data.daily_goal_words is not None:
        if data.daily_goal_words < 1 or data.daily_goal_words > 100:
            raise HTTPException(status_code=400, detail="daily_goal_words must be between 1 and 100")
        settings.daily_goal_words = data.daily_goal_words

    if data.daily_goal_tasks is not None:
        if data.daily_goal_tasks < 1 or data.daily_goal_tasks > 20:
            raise HTTPException(status_code=400, detail="daily_goal_tasks must be between 1 and 20")
        settings.daily_goal_tasks = data.daily_goal_tasks

    if data.notification_hour is not None:
        if data.notification_hour < 0 or data.notification_hour > 23:
            raise HTTPException(status_code=400, detail="notification_hour must be between 0 and 23")
        settings.notification_hour = data.notification_hour

    if data.notification_enabled is not None:
        settings.notification_enabled = data.notification_enabled

    if data.theme is not None:
        if data.theme not in ["dark", "light", "auto"]:
            raise HTTPException(status_code=400, detail="theme must be 'dark', 'light', or 'auto'")
        settings.theme = data.theme

    if data.language_priority is not None:
        valid_langs = {"zh", "en", "ja"}
        langs = [l.strip() for l in data.language_priority.split(",")]
        if not all(l in valid_langs for l in langs) or len(langs) != 3:
            raise HTTPException(status_code=400, detail="language_priority must be comma-separated zh,en,ja")
        settings.language_priority = data.language_priority

    db.commit()
    db.refresh(settings)

    return SettingsResponse(
        daily_goal_words=settings.daily_goal_words,
        daily_goal_tasks=settings.daily_goal_tasks,
        notification_hour=settings.notification_hour,
        notification_enabled=settings.notification_enabled,
        theme=settings.theme,
        language_priority=settings.language_priority,
    )


@router.put("/notifications", response_model=SettingsResponse)
def update_notifications(
    data: NotificationUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    settings = db.query(UserSettings).filter(UserSettings.user_id == user.id).first()
    if not settings:
        settings = UserSettings(user_id=user.id)
        db.add(settings)

    if data.notification_hour < 0 or data.notification_hour > 23:
        raise HTTPException(status_code=400, detail="notification_hour must be between 0 and 23")

    settings.notification_hour = data.notification_hour
    settings.notification_enabled = data.notification_enabled

    db.commit()
    db.refresh(settings)

    return SettingsResponse(
        daily_goal_words=settings.daily_goal_words,
        daily_goal_tasks=settings.daily_goal_tasks,
        notification_hour=settings.notification_hour,
        notification_enabled=settings.notification_enabled,
        theme=settings.theme,
        language_priority=settings.language_priority,
    )


@router.put("/goals", response_model=SettingsResponse)
def update_goals(
    data: GoalsUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    settings = db.query(UserSettings).filter(UserSettings.user_id == user.id).first()
    if not settings:
        settings = UserSettings(user_id=user.id)
        db.add(settings)

    if data.daily_goal_words < 1 or data.daily_goal_words > 100:
        raise HTTPException(status_code=400, detail="daily_goal_words must be between 1 and 100")
    if data.daily_goal_tasks < 1 or data.daily_goal_tasks > 20:
        raise HTTPException(status_code=400, detail="daily_goal_tasks must be between 1 and 20")

    settings.daily_goal_words = data.daily_goal_words
    settings.daily_goal_tasks = data.daily_goal_tasks

    db.commit()
    db.refresh(settings)

    return SettingsResponse(
        daily_goal_words=settings.daily_goal_words,
        daily_goal_tasks=settings.daily_goal_tasks,
        notification_hour=settings.notification_hour,
        notification_enabled=settings.notification_enabled,
        theme=settings.theme,
        language_priority=settings.language_priority,
    )
