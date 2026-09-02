from datetime import datetime, timezone
from html import escape
import os

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger
from sqlalchemy import text

scheduler = BackgroundScheduler(timezone="Asia/Seoul")


def _acquire_job_lock(db, lock_id: int) -> bool:
    if db.bind.dialect.name != "postgresql":
        return True
    return bool(db.execute(text("SELECT pg_try_advisory_lock(:lock_id)"), {"lock_id": lock_id}).scalar())


def _release_job_lock(db, lock_id: int) -> None:
    if db.bind.dialect.name == "postgresql":
        db.execute(text("SELECT pg_advisory_unlock(:lock_id)"), {"lock_id": lock_id})


def job_morning_reminder():
    from database import SessionLocal
    from learning_service import build_today_plan
    from models import PushSubscription
    from push_utils import send_push_to_user
    db = SessionLocal()
    lock_id = 71001
    try:
        if not _acquire_job_lock(db, lock_id):
            return
        for user_id, in db.query(PushSubscription.user_id).distinct().all():
            plan = build_today_plan(db, user_id)
            first = plan["tasks"][0]["title"] if plan["tasks"] else "오늘 학습"
            send_push_to_user(db, user_id, title=f"오늘의 {plan['total_minutes']}분", body=f"{first}부터 가볍게 시작해요.", url="/")
    finally:
        _release_job_lock(db, lock_id)
        db.close()


def job_evening_reminder():
    from database import SessionLocal
    from learning_service import build_today_plan
    from models import PushSubscription
    from push_utils import send_push_to_user
    db = SessionLocal()
    lock_id = 71002
    try:
        if not _acquire_job_lock(db, lock_id):
            return
        for user_id, in db.query(PushSubscription.user_id).distinct().all():
            remaining = [task for task in build_today_plan(db, user_id)["tasks"] if not task["completed"]]
            if remaining:
                send_push_to_user(db, user_id, title="오늘 학습 이어하기", body=f"{remaining[0]['title']} 하나만 마치고 쉬어요.", url=remaining[0]["href"])
    finally:
        _release_job_lock(db, lock_id)
        db.close()


def job_telegram_task_reminders():
    from database import SessionLocal
    from models import Status, Task, UserSettings
    from telegram_utils import TelegramError, format_due_tasks_message, send_message
    from secret_utils import decrypt_secret
    db = SessionLocal()
    lock_id = 71003
    try:
        if not _acquire_job_lock(db, lock_id):
            return
        now = datetime.now(timezone.utc)
        rows = db.query(UserSettings).filter(UserSettings.telegram_enabled == True, UserSettings.telegram_bot_token != None, UserSettings.telegram_chat_id != None).all()
        for settings in rows:
            token = decrypt_secret(settings.telegram_bot_token)
            if not token:
                continue
            tasks = db.query(Task).filter(Task.user_id == settings.user_id, Task.status == Status.todo, Task.due_at != None, Task.due_at <= now, Task.telegram_notified_at == None).order_by(Task.due_at, Task.order).limit(10).all()
            if not tasks:
                continue
            try:
                send_message(token, settings.telegram_chat_id, format_due_tasks_message(tasks))
            except TelegramError as exc:
                print(f"[scheduler] telegram task reminder failed for user {settings.user_id}: {exc}")
                continue
            for task in tasks:
                task.telegram_notified_at = now
            db.commit()
    finally:
        _release_job_lock(db, lock_id)
        db.close()


def job_telegram_daily_quiz():
    from database import SessionLocal
    from learning_service import build_today_plan
    from models import TelegramQuizDelivery, UserSettings
    from telegram_daily_quiz import KST, build_daily_quizzes
    from telegram_utils import TelegramError, send_message, send_quiz_poll
    from secret_utils import decrypt_secret
    db = SessionLocal()
    lock_id = 71004
    try:
        if not _acquire_job_lock(db, lock_id):
            return
        now_kst = datetime.now(timezone.utc).astimezone(KST)
        key = now_kst.date().isoformat()
        base_url = os.getenv("APP_BASE_URL", "https://onetask.tradediary.site").rstrip("/")
        rows = db.query(UserSettings).filter(UserSettings.telegram_enabled == True, UserSettings.telegram_bot_token != None, UserSettings.telegram_chat_id != None, UserSettings.notification_enabled == True, UserSettings.notification_hour == now_kst.hour).all()
        for settings in rows:
            token = decrypt_secret(settings.telegram_bot_token)
            if not token:
                continue
            if db.query(TelegramQuizDelivery).filter(TelegramQuizDelivery.user_id == settings.user_id, TelegramQuizDelivery.quiz_date == key).first():
                continue
            plan = build_today_plan(db, settings.user_id, settings.study_minutes)
            lines = "\n".join(f"• {escape(task['title'])} ({task['minutes']}분)" for task in plan["tasks"])
            quizzes = build_daily_quizzes(db, settings.user_id, limit=2)
            try:
                send_message(token, settings.telegram_chat_id, f"<b>☀️ 오늘의 {plan['total_minutes']}분 학습</b>\n\n{lines}\n\n<a href=\"{base_url}/\">지금 이어서 학습하기 →</a>")
                if quizzes:
                    send_message(token, settings.telegram_chat_id, f"<b>🧠 어제 배운 단어 복습</b>\n\n{len(quizzes)}문제만 가볍게 풀어보세요.")
                    for quiz in quizzes:
                        send_quiz_poll(token, settings.telegram_chat_id, quiz.question, quiz.options, quiz.correct_option_id, quiz.explanation)
            except TelegramError as exc:
                print(f"[scheduler] telegram daily briefing failed for user {settings.user_id}: {exc}")
                continue
            db.add(TelegramQuizDelivery(user_id=settings.user_id, quiz_date=key))
            db.commit()
    finally:
        _release_job_lock(db, lock_id)
        db.close()


def job_telegram_weekly_report():
    from database import SessionLocal
    from learning_service import weekly_report
    from models import TelegramWeeklyDelivery, UserSettings
    from telegram_utils import TelegramError, send_message
    from secret_utils import decrypt_secret
    db = SessionLocal()
    lock_id = 71005
    try:
        if not _acquire_job_lock(db, lock_id):
            return
        now = datetime.now(scheduler.timezone)
        key = now.date().isoformat()
        base_url = os.getenv("APP_BASE_URL", "https://onetask.tradediary.site").rstrip("/")
        rows = db.query(UserSettings).filter(UserSettings.telegram_enabled == True, UserSettings.telegram_bot_token != None, UserSettings.telegram_chat_id != None).all()
        for settings in rows:
            token = decrypt_secret(settings.telegram_bot_token)
            if not token:
                continue
            if db.query(TelegramWeeklyDelivery).filter(TelegramWeeklyDelivery.user_id == settings.user_id, TelegramWeeklyDelivery.report_week == key).first():
                continue
            report = weekly_report(db, settings.user_id)
            try:
                send_message(token, settings.telegram_chat_id, f"<b>📊 이번 주 학습</b>\n\n학습 {report['days']}일 · {report['minutes']}분 · 활동 {report['activities']}회\n남은 오답 {report['unresolved_mistakes']}개\n\n<a href=\"{base_url}/weekly-report\">자세히 보기 →</a>")
            except TelegramError as exc:
                print(f"[scheduler] telegram weekly report failed for user {settings.user_id}: {exc}")
                continue
            db.add(TelegramWeeklyDelivery(user_id=settings.user_id, report_week=key))
            db.commit()
    finally:
        _release_job_lock(db, lock_id)
        db.close()


def start_scheduler():
    if os.getenv("ENABLE_SCHEDULER", "true").lower() not in {"1", "true", "yes"}:
        print("[scheduler] disabled")
        return
    scheduler.add_job(job_morning_reminder, CronTrigger(hour=9, minute=0), id="morning_reminder", replace_existing=True)
    scheduler.add_job(job_evening_reminder, CronTrigger(hour=20, minute=0), id="evening_reminder", replace_existing=True)
    scheduler.add_job(job_telegram_task_reminders, IntervalTrigger(minutes=1), id="telegram_task_reminders", replace_existing=True)
    scheduler.add_job(job_telegram_daily_quiz, IntervalTrigger(minutes=5), id="telegram_daily_quiz", replace_existing=True)
    scheduler.add_job(job_telegram_weekly_report, CronTrigger(day_of_week="sun", hour=20, minute=0), id="telegram_weekly_report", replace_existing=True)
    scheduler.start()
    print("[scheduler] started")
