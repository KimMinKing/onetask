from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import get_db
from models import PushSubscription, User, WordCard, EnglishWordCard, JapaneseWordCard
from auth_utils import get_current_user
from push_utils import send_push
from datetime import datetime, timezone

router = APIRouter(prefix="/push", tags=["push"])


class SubscribeRequest(BaseModel):
    endpoint: str
    p256dh: str
    auth: str


class PushTestRequest(BaseModel):
    title: str = "onetask 테스트"
    body: str = "푸시 알림이 정상 작동합니다!"


@router.post("/subscribe")
def subscribe(req: SubscribeRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    existing = db.query(PushSubscription).filter_by(endpoint=req.endpoint).first()
    if existing:
        existing.p256dh = req.p256dh
        existing.auth = req.auth
    else:
        sub = PushSubscription(user_id=user.id, endpoint=req.endpoint, p256dh=req.p256dh, auth=req.auth)
        db.add(sub)
    db.commit()
    return {"ok": True}


@router.delete("/unsubscribe")
def unsubscribe(endpoint: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    db.query(PushSubscription).filter_by(endpoint=endpoint, user_id=user.id).delete()
    db.commit()
    return {"ok": True}


@router.post("/test")
def test_push(req: PushTestRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    subs = db.query(PushSubscription).filter_by(user_id=user.id).all()
    if not subs:
        raise HTTPException(status_code=404, detail="구독된 디바이스가 없습니다")
    for sub in subs:
        send_push(sub, title=req.title, body=req.body)
    return {"sent": len(subs)}


@router.get("/due-count")
def due_count(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    now = datetime.now(timezone.utc)
    zh = db.query(WordCard).filter(WordCard.user_id == user.id, WordCard.due <= now).count()
    en = db.query(EnglishWordCard).filter(EnglishWordCard.user_id == user.id, EnglishWordCard.due <= now).count()
    ja = db.query(JapaneseWordCard).filter(JapaneseWordCard.user_id == user.id, JapaneseWordCard.due <= now).count()
    return {"zh": zh, "en": en, "ja": ja, "total": zh + en + ja}
