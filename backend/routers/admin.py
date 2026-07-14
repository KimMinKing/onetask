from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import text

from database import get_db
from models import User, UserSettings
from auth_utils import get_master_user, hash_password

router = APIRouter(prefix="/admin", tags=["admin"])


class CreateUserRequest(BaseModel):
    username: str
    password: str
    ui_language: str = "ko"


@router.get("/overview")
def admin_overview(db: Session = Depends(get_db), _: User = Depends(get_master_user)):
    """마스터 전용: 시스템 전체 현황"""
    with db.connection() as conn:
        # 단어 현황
        zh_counts = {
            row[0]: row[1]
            for row in conn.execute(text(
                "SELECT hsk_level, COUNT(*) FROM words GROUP BY hsk_level ORDER BY hsk_level"
            ))
        }
        en_counts = {
            row[0]: row[1]
            for row in conn.execute(text(
                "SELECT level, COUNT(*) FROM english_words GROUP BY level ORDER BY level"
            ))
        }
        ja_counts = {
            row[0]: row[1]
            for row in conn.execute(text(
                "SELECT jlpt_level, COUNT(*) FROM japanese_words GROUP BY jlpt_level ORDER BY jlpt_level"
            ))
        }

        # 플래시카드 현황
        zh_cards = conn.execute(text("SELECT COUNT(*) FROM word_cards WHERE reps > 0")).scalar()
        en_cards = conn.execute(text("SELECT COUNT(*) FROM english_word_cards WHERE reps > 0")).scalar()
        ja_cards = conn.execute(text("SELECT COUNT(*) FROM japanese_word_cards WHERE reps > 0")).scalar()

        # 할일/완료 현황
        task_todo = conn.execute(text("SELECT COUNT(*) FROM tasks WHERE status='todo'")).scalar()
        task_done = conn.execute(text("SELECT COUNT(*) FROM tasks WHERE status='done'")).scalar()

        # 캘린더
        cal_count = conn.execute(text("SELECT COUNT(*) FROM calendar_events")).scalar()

        users = [
            {"id": r[0], "username": r[1], "is_master": r[2], "ui_language": r[3] or "ko"}
            for r in conn.execute(text("""
                SELECT users.id, users.username, users.is_master, user_settings.ui_language
                FROM users
                LEFT JOIN user_settings ON user_settings.user_id = users.id
                ORDER BY users.id
            """))
        ]

    return {
        "words": {
            "zh": {"total": sum(zh_counts.values()), "by_level": zh_counts, "reviewed": zh_cards},
            "en": {"total": sum(en_counts.values()), "by_level": en_counts, "reviewed": en_cards},
            "ja": {"total": sum(ja_counts.values()), "by_level": ja_counts, "reviewed": ja_cards},
        },
        "tasks": {"todo": task_todo, "done": task_done},
        "calendar": {"total": cal_count},
        "users": users,
    }


@router.post("/users")
def create_user(
    body: CreateUserRequest,
    db: Session = Depends(get_db),
    _: User = Depends(get_master_user),
):
    username = body.username.strip()
    if len(username) < 2:
        raise HTTPException(status_code=400, detail="아이디는 2자 이상이어야 합니다")
    if len(body.password) < 4:
        raise HTTPException(status_code=400, detail="비밀번호는 4자 이상이어야 합니다")
    if db.query(User).filter(User.username == username).first():
        raise HTTPException(status_code=409, detail="이미 존재하는 아이디입니다")

    ui_language = body.ui_language if body.ui_language in ["ko", "zh"] else "ko"
    user = User(
        username=username,
        hashed_password=hash_password(body.password),
        is_master=False,
    )
    db.add(user)
    db.flush()
    db.add(UserSettings(user_id=user.id, ui_language=ui_language))
    db.commit()
    db.refresh(user)

    return {
        "id": user.id,
        "username": user.username,
        "is_master": user.is_master,
        "ui_language": ui_language,
    }
