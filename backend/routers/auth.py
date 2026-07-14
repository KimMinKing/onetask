from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from database import get_db
from models import User, UserSettings
from auth_utils import verify_password, hash_password, create_access_token, get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    username: str
    password: str


class SignupRequest(BaseModel):
    username: str
    password: str
    ui_language: str | None = None


def _user_response(token: str, user: User) -> dict:
    return {
        "access_token": token,
        "token_type": "bearer",
        "is_master": user.is_master,
        "username": user.username,
    }


@router.get("/status")
def auth_status(db: Session = Depends(get_db)):
    """가입된 계정이 있는지 확인 (회원가입 가능 여부 판단용)"""
    has_users = db.query(User).count() > 0
    return {"has_users": has_users}


@router.post("/signup")
def signup(body: SignupRequest, db: Session = Depends(get_db)):
    user_count = db.query(User).count()
    if user_count > 0:
        raise HTTPException(status_code=403, detail="이미 계정이 존재합니다. 마스터 계정에 문의하세요.")
    if len(body.username.strip()) < 2:
        raise HTTPException(status_code=400, detail="아이디는 2자 이상이어야 합니다")
    if len(body.password) < 6:
        raise HTTPException(status_code=400, detail="비밀번호는 6자 이상이어야 합니다")
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
    return _user_response(token, user)


@router.post("/login")
def login(body: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == body.username).first()
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="아이디 또는 비밀번호가 잘못됐습니다")
    token = create_access_token(user.id, user.is_master)
    return _user_response(token, user)


@router.get("/me")
def me(user: User = Depends(get_current_user)):
    return {"id": user.id, "username": user.username, "is_master": user.is_master}
