from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from database import get_db
from models import User, UserSettings
from auth_utils import get_current_user
from obsidian_sync import sync_all_tasks_for_user
from telegram_utils import TelegramError, inspect_connection, send_message
from secret_utils import decrypt_secret, encrypt_secret

router = APIRouter(prefix="/settings", tags=["settings"])


class SettingsResponse(BaseModel):
    daily_goal_words: int
    daily_goal_tasks: int
    notification_hour: int
    notification_enabled: bool
    theme: str
    language_priority: str
    ui_language: str
    obsidian_enabled: bool
    obsidian_vault_path: Optional[str] = None
    telegram_enabled: bool
    telegram_bot_token_configured: bool
    telegram_chat_id: Optional[str] = None
    study_minutes: int
    focus_subject: str
    sqld_exam_date: Optional[str] = None
    network_exam_date: Optional[str] = None


class SettingsUpdate(BaseModel):
    daily_goal_words: Optional[int] = None
    daily_goal_tasks: Optional[int] = None
    notification_hour: Optional[int] = None
    notification_enabled: Optional[bool] = None
    theme: Optional[str] = None
    language_priority: Optional[str] = None
    ui_language: Optional[str] = None
    obsidian_enabled: Optional[bool] = None
    obsidian_vault_path: Optional[str] = None
    telegram_enabled: Optional[bool] = None
    telegram_bot_token: Optional[str] = None
    telegram_chat_id: Optional[str] = None
    study_minutes: Optional[int] = None
    focus_subject: Optional[str] = None
    sqld_exam_date: Optional[str] = None
    network_exam_date: Optional[str] = None


class ObsidianSyncResponse(BaseModel):
    ok: bool
    synced_dates: int


class TelegramTestResponse(BaseModel):
    ok: bool
    bot_username: Optional[str] = None
    chat_id: Optional[str] = None
    message: str


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
    elif settings.telegram_bot_token and not settings.telegram_bot_token.startswith("enc:v1:"):
        settings.telegram_bot_token = encrypt_secret(settings.telegram_bot_token)
        db.commit()
        db.refresh(settings)
    return SettingsResponse(
        daily_goal_words=settings.daily_goal_words,
        daily_goal_tasks=settings.daily_goal_tasks,
        notification_hour=settings.notification_hour,
        notification_enabled=settings.notification_enabled,
        theme=settings.theme,
        language_priority=settings.language_priority,
        ui_language=settings.ui_language,
        obsidian_enabled=settings.obsidian_enabled,
        obsidian_vault_path=settings.obsidian_vault_path,
        telegram_enabled=settings.telegram_enabled,
        telegram_bot_token_configured=bool(decrypt_secret(settings.telegram_bot_token)),
        telegram_chat_id=settings.telegram_chat_id,
        study_minutes=settings.study_minutes,
        focus_subject=settings.focus_subject,
        sqld_exam_date=settings.sqld_exam_date,
        network_exam_date=settings.network_exam_date,
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

    if data.ui_language is not None:
        if data.ui_language not in ["ko", "zh"]:
            raise HTTPException(status_code=400, detail="ui_language must be 'ko' or 'zh'")
        settings.ui_language = data.ui_language

    if ({"obsidian_enabled", "obsidian_vault_path"} & data.model_fields_set) and not user.is_master:
        raise HTTPException(status_code=403, detail="Only the master account can configure Obsidian sync")

    if data.obsidian_vault_path is not None:
        path = data.obsidian_vault_path.strip()
        if path:
            vault = Path(path).expanduser().resolve()
            if not vault.exists() or not vault.is_dir():
                raise HTTPException(status_code=400, detail="Obsidian vault path must be an existing directory")
            settings.obsidian_vault_path = str(vault)
        else:
            settings.obsidian_vault_path = None
            settings.obsidian_enabled = False

    if data.obsidian_enabled is not None:
        if data.obsidian_enabled and not settings.obsidian_vault_path:
            raise HTTPException(status_code=400, detail="Set obsidian_vault_path before enabling Obsidian sync")
        settings.obsidian_enabled = data.obsidian_enabled

    if data.telegram_bot_token is not None:
        token = data.telegram_bot_token.strip()
        settings.telegram_bot_token = encrypt_secret(token) if token else None
        if not token:
            settings.telegram_enabled = False
            settings.telegram_chat_id = None

    if data.telegram_chat_id is not None:
        chat_id = data.telegram_chat_id.strip()
        settings.telegram_chat_id = chat_id or None

    if data.telegram_enabled is not None:
        if data.telegram_enabled and (not decrypt_secret(settings.telegram_bot_token) or not settings.telegram_chat_id):
            raise HTTPException(status_code=400, detail="Connect Telegram before enabling Telegram alerts")
        settings.telegram_enabled = data.telegram_enabled

    if data.study_minutes is not None:
        if data.study_minutes not in {5, 15, 30, 60}:
            raise HTTPException(status_code=400, detail="study_minutes must be 5, 15, 30, or 60")
        settings.study_minutes = data.study_minutes

    if data.focus_subject is not None:
        if data.focus_subject not in {"zh", "ja", "en", "sqld", "network"}:
            raise HTTPException(status_code=400, detail="Unsupported focus_subject")
        settings.focus_subject = data.focus_subject

    for field in ("sqld_exam_date", "network_exam_date"):
        value = getattr(data, field)
        if field in data.model_fields_set:
            if value:
                try:
                    from datetime import date
                    date.fromisoformat(value)
                except ValueError:
                    raise HTTPException(status_code=400, detail=f"{field} must be YYYY-MM-DD")
            setattr(settings, field, value or None)

    db.commit()
    db.refresh(settings)

    if settings.obsidian_enabled:
        sync_all_tasks_for_user(db, user.id)

    return SettingsResponse(
        daily_goal_words=settings.daily_goal_words,
        daily_goal_tasks=settings.daily_goal_tasks,
        notification_hour=settings.notification_hour,
        notification_enabled=settings.notification_enabled,
        theme=settings.theme,
        language_priority=settings.language_priority,
        ui_language=settings.ui_language,
        obsidian_enabled=settings.obsidian_enabled,
        obsidian_vault_path=settings.obsidian_vault_path,
        telegram_enabled=settings.telegram_enabled,
        telegram_bot_token_configured=bool(decrypt_secret(settings.telegram_bot_token)),
        telegram_chat_id=settings.telegram_chat_id,
        study_minutes=settings.study_minutes,
        focus_subject=settings.focus_subject,
        sqld_exam_date=settings.sqld_exam_date,
        network_exam_date=settings.network_exam_date,
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
        ui_language=settings.ui_language,
        obsidian_enabled=settings.obsidian_enabled,
        obsidian_vault_path=settings.obsidian_vault_path,
        telegram_enabled=settings.telegram_enabled,
        telegram_bot_token_configured=bool(decrypt_secret(settings.telegram_bot_token)),
        telegram_chat_id=settings.telegram_chat_id,
        study_minutes=settings.study_minutes,
        focus_subject=settings.focus_subject,
        sqld_exam_date=settings.sqld_exam_date,
        network_exam_date=settings.network_exam_date,
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
        ui_language=settings.ui_language,
        obsidian_enabled=settings.obsidian_enabled,
        obsidian_vault_path=settings.obsidian_vault_path,
        telegram_enabled=settings.telegram_enabled,
        telegram_bot_token_configured=bool(decrypt_secret(settings.telegram_bot_token)),
        telegram_chat_id=settings.telegram_chat_id,
        study_minutes=settings.study_minutes,
        focus_subject=settings.focus_subject,
        sqld_exam_date=settings.sqld_exam_date,
        network_exam_date=settings.network_exam_date,
    )


@router.post("/obsidian/sync", response_model=ObsidianSyncResponse)
def sync_obsidian(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if not user.is_master:
        raise HTTPException(status_code=403, detail="Only the master account can sync Obsidian")
    settings = db.query(UserSettings).filter(UserSettings.user_id == user.id).first()
    if not settings or not settings.obsidian_enabled or not settings.obsidian_vault_path:
        raise HTTPException(status_code=400, detail="Obsidian sync is not enabled")

    synced_dates = sync_all_tasks_for_user(db, user.id)
    return ObsidianSyncResponse(ok=True, synced_dates=synced_dates)


@router.post("/telegram/test", response_model=TelegramTestResponse)
def test_telegram(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    settings = db.query(UserSettings).filter(UserSettings.user_id == user.id).first()
    token = decrypt_secret(settings.telegram_bot_token) if settings else None
    if not settings or not token:
        raise HTTPException(status_code=400, detail="Telegram bot token is not set")

    try:
        connection = inspect_connection(token)
        if connection.chat_id and not settings.telegram_chat_id:
            settings.telegram_chat_id = connection.chat_id
            db.commit()
            db.refresh(settings)

        chat_id = settings.telegram_chat_id or connection.chat_id
        if not chat_id:
            return TelegramTestResponse(
                ok=False,
                bot_username=connection.bot_username,
                chat_id=None,
                message="Bot token is valid. Send any message to this bot in Telegram, then test again.",
            )

        send_message(token, chat_id, "onetask 텔레그램 연결 테스트입니다.")
        return TelegramTestResponse(
            ok=True,
            bot_username=connection.bot_username,
            chat_id=chat_id,
            message="Telegram is connected and a test message was sent.",
        )
    except TelegramError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
