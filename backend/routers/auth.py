from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from sqlalchemy import text
from datetime import datetime, timedelta, timezone
from threading import Lock

from database import get_db
from models import User, UserSettings
from auth_utils import ACCESS_TOKEN_EXPIRE_DAYS, verify_password, hash_password, create_access_token, get_current_user
import os

router = APIRouter(prefix="/auth", tags=["auth"])
_failed_logins: dict[str, list[datetime]] = {}
_login_lock = Lock()
_LOGIN_WINDOW = timedelta(minutes=15)
_MAX_FAILURES = 5


def _check_login_limit(username: str) -> None:
    now = datetime.now(timezone.utc)
    with _login_lock:
        recent = [stamp for stamp in _failed_logins.get(username, []) if now - stamp < _LOGIN_WINDOW]
        _failed_logins[username] = recent
        if len(recent) >= _MAX_FAILURES:
            raise HTTPException(status_code=429, detail="로그인 시도가 너무 많습니다. 15분 후 다시 시도하세요.")


def _record_login_failure(username: str) -> None:
    with _login_lock:
        _failed_logins.setdefault(username, []).append(datetime.now(timezone.utc))


def _clear_login_failures(username: str) -> None:
    with _login_lock:
        _failed_logins.pop(username, None)


class LoginRequest(BaseModel):
    username: str = Field(min_length=1, max_length=50)
    password: str = Field(min_length=1, max_length=128)


class SignupRequest(BaseModel):
    username: str = Field(min_length=2, max_length=50)
    password: str = Field(min_length=10, max_length=72)
    ui_language: str | None = None


def _user_response(user: User) -> dict:
    return {
        "token_type": "bearer",
        "is_master": user.is_master,
        "username": user.username,
    }


def _set_auth_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        "onetask_token",
        token,
        max_age=ACCESS_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        httponly=True,
        secure=os.getenv("COOKIE_SECURE", "true").lower() in {"1", "true", "yes"},
        samesite="lax",
        path="/",
    )


@router.get("/status")
def auth_status(db: Session = Depends(get_db)):
    """가입된 계정이 있는지 확인 (회원가입 가능 여부 판단용)"""
    has_users = db.query(User).count() > 0
    return {"has_users": has_users}


@router.post("/signup")
def signup(body: SignupRequest, response: Response, db: Session = Depends(get_db)):
    if db.bind.dialect.name == "postgresql":
        db.execute(text("LOCK TABLE users IN EXCLUSIVE MODE"))
    user_count = db.query(User).count()
    if user_count > 0:
        raise HTTPException(status_code=403, detail="이미 계정이 존재합니다. 마스터 계정에 문의하세요.")
    if len(body.username.strip()) < 2:
        raise HTTPException(status_code=400, detail="아이디는 2자 이상이어야 합니다")
    if len(body.password) < 10:
        raise HTTPException(status_code=400, detail="비밀번호는 10자 이상이어야 합니다")
    if len(body.password.encode("utf-8")) > 72:
        raise HTTPException(status_code=400, detail="비밀번호는 UTF-8 기준 72바이트 이하여야 합니다")
    user = User(
        username=body.username.strip(),
        hashed_password=hash_password(body.password),
        is_master=True,  # 첫 번째 계정은 항상 마스터
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    ui_language = body.ui_language if body.ui_language in ["ko", "zh"] else "ko"
    db.add(UserSettings(user_id=user.id, ui_language=ui_language))
    db.commit()
    token = create_access_token(user.id, user.is_master)
    _set_auth_cookie(response, token)
    return _user_response(user)


@router.post("/login")
def login(body: LoginRequest, response: Response, db: Session = Depends(get_db)):
    username = body.username.strip()
    _check_login_limit(username.casefold())
    user = db.query(User).filter(User.username == username).first()
    if not user or not verify_password(body.password, user.hashed_password):
        _record_login_failure(username.casefold())
        raise HTTPException(status_code=401, detail="아이디 또는 비밀번호가 잘못됐습니다")
    _clear_login_failures(username.casefold())
    token = create_access_token(user.id, user.is_master)
    _set_auth_cookie(response, token)
    return _user_response(user)


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie("onetask_token", path="/", httponly=True, samesite="lax")
    return {"ok": True}


@router.get("/me")
def me(user: User = Depends(get_current_user)):
    return {"id": user.id, "username": user.username, "is_master": user.is_master}
