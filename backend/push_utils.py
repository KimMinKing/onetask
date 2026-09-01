import json
import os
from pywebpush import webpush, WebPushException

VAPID_PUBLIC_KEY = os.getenv("VAPID_PUBLIC_KEY", "")
VAPID_PRIVATE_KEY_PATH = os.getenv("VAPID_PRIVATE_KEY_PATH", "vapid_private.pem")
VAPID_MAILTO = os.getenv("VAPID_MAILTO", "mailto:admin@onetask.local")


def send_push(sub, title: str, body: str, url: str = "/words") -> bool:
    payload = json.dumps({"title": title, "body": body, "url": url})
    try:
        webpush(
            subscription_info={
                "endpoint": sub.endpoint,
                "keys": {"p256dh": sub.p256dh, "auth": sub.auth},
            },
            data=payload,
            vapid_private_key=VAPID_PRIVATE_KEY_PATH,
            vapid_claims={"sub": VAPID_MAILTO},
        )
        return True
    except WebPushException as e:
        print(f"[push] 전송 실패 {sub.endpoint[:40]}...: {e}")
        return False


def send_push_to_all(db, title: str, body: str, url: str = "/"):
    from models import PushSubscription
    subs = db.query(PushSubscription).all()
    ok = sum(1 for s in subs if send_push(s, title, body, url))
    print(f"[push] {ok}/{len(subs)} 전송 성공")


def send_push_to_user(db, user_id: int, title: str, body: str, url: str = "/"):
    from models import PushSubscription
    subs = db.query(PushSubscription).filter(PushSubscription.user_id == user_id).all()
    ok = sum(1 for sub in subs if send_push(sub, title, body, url))
    print(f"[push] user {user_id}: {ok}/{len(subs)} delivered")
