from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger
from datetime import datetime, timezone

scheduler = BackgroundScheduler(timezone="Asia/Seoul")


def job_morning_reminder():
    """매일 오전 9시: 오늘의 복습 알림"""
    from database import SessionLocal
    from models import WordCard, EnglishWordCard, JapaneseWordCard
    from push_utils import send_push_to_all

    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        zh = db.query(WordCard).filter(WordCard.due <= now).count()
        en = db.query(EnglishWordCard).filter(EnglishWordCard.due <= now).count()
        ja = db.query(JapaneseWordCard).filter(JapaneseWordCard.due <= now).count()
        total = zh + en + ja

        if total == 0:
            body = "오늘 복습할 단어가 없어요. 잠깐 둘러보고 가세요!"
        else:
            parts = []
            if zh: parts.append(f"중국어 {zh}개")
            if en: parts.append(f"영어 {en}개")
            if ja: parts.append(f"일본어 {ja}개")
            body = " · ".join(parts) + " 복습 준비됐어요"

        send_push_to_all(db, title="오늘의 단어", body=body, url="/words")
    finally:
        db.close()


def job_evening_reminder():
    """매일 오후 8시: 저녁 복습 알림"""
    from database import SessionLocal
    from models import WordCard, EnglishWordCard, JapaneseWordCard
    from push_utils import send_push_to_all

    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        total = (
            db.query(WordCard).filter(WordCard.due <= now).count() +
            db.query(EnglishWordCard).filter(EnglishWordCard.due <= now).count() +
            db.query(JapaneseWordCard).filter(JapaneseWordCard.due <= now).count()
        )
        if total > 0:
            send_push_to_all(db, title="저녁 복습", body=f"아직 {total}개 남아있어요. 가볍게 해봐요!", url="/words")
    finally:
        db.close()


def job_telegram_task_reminders():
    from database import SessionLocal
    from models import Status, Task, UserSettings
    from telegram_utils import TelegramError, format_due_tasks_message, send_message

    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        settings_rows = db.query(UserSettings).filter(
            UserSettings.telegram_enabled == True,
            UserSettings.telegram_bot_token != None,
            UserSettings.telegram_chat_id != None,
        ).all()

        for settings in settings_rows:
            tasks = (
                db.query(Task)
                .filter(
                    Task.user_id == settings.user_id,
                    Task.status == Status.todo,
                    Task.due_at != None,
                    Task.due_at <= now,
                    Task.telegram_notified_at == None,
                )
                .order_by(Task.due_at, Task.order)
                .limit(10)
                .all()
            )
            if not tasks:
                continue

            try:
                send_message(
                    settings.telegram_bot_token,
                    settings.telegram_chat_id,
                    format_due_tasks_message(tasks),
                )
            except TelegramError as exc:
                print(f"[scheduler] telegram task reminder failed for user {settings.user_id}: {exc}")
                continue

            for task in tasks:
                task.telegram_notified_at = now
            db.commit()
    finally:
        db.close()


def job_telegram_daily_quiz():
    """At each user's notification hour, send two quizzes from the previous KST day."""
    from database import SessionLocal
    from models import TelegramQuizDelivery, UserSettings
    from telegram_daily_quiz import KST, build_daily_quizzes
    from telegram_utils import TelegramError, send_message, send_quiz_poll

    db = SessionLocal()
    try:
        now_utc = datetime.now(timezone.utc)
        now_kst = now_utc.astimezone(KST)
        quiz_date = now_kst.date().isoformat()
        settings_rows = db.query(UserSettings).filter(
            UserSettings.telegram_enabled == True,
            UserSettings.telegram_bot_token != None,
            UserSettings.telegram_chat_id != None,
            UserSettings.notification_enabled == True,
            UserSettings.notification_hour == now_kst.hour,
        ).all()

        # Word-card tables are currently shared, so build the same previous-day pool once.
        quizzes = build_daily_quizzes(db, limit=2)
        for settings in settings_rows:
            delivered = db.query(TelegramQuizDelivery).filter(
                TelegramQuizDelivery.user_id == settings.user_id,
                TelegramQuizDelivery.quiz_date == quiz_date,
            ).first()
            if delivered:
                continue

            try:
                if quizzes:
                    send_message(
                        settings.telegram_bot_token,
                        settings.telegram_chat_id,
                        f"<b>🧠 어제 배운 단어 복습</b>\n\n{len(quizzes)}문제만 가볍게 풀어보세요.",
                    )
                    for quiz in quizzes:
                        send_quiz_poll(
                            settings.telegram_bot_token,
                            settings.telegram_chat_id,
                            quiz.question,
                            quiz.options,
                            quiz.correct_option_id,
                            quiz.explanation,
                        )
                else:
                    send_message(
                        settings.telegram_bot_token,
                        settings.telegram_chat_id,
                        "<b>🧠 어제 배운 단어 복습</b>\n\n어제 학습한 단어가 없어서 오늘은 쉬어가요.",
                    )
            except TelegramError as exc:
                print(f"[scheduler] telegram daily quiz failed for user {settings.user_id}: {exc}")
                continue

            db.add(TelegramQuizDelivery(user_id=settings.user_id, quiz_date=quiz_date))
            db.commit()
    finally:
        db.close()


def start_scheduler():
    scheduler.add_job(job_morning_reminder, CronTrigger(hour=9, minute=0))
    scheduler.add_job(job_evening_reminder, CronTrigger(hour=20, minute=0))
    scheduler.add_job(job_telegram_task_reminders, IntervalTrigger(minutes=1), id="telegram_task_reminders", replace_existing=True)
    scheduler.add_job(job_telegram_daily_quiz, IntervalTrigger(minutes=5), id="telegram_daily_quiz", replace_existing=True)
    scheduler.start()
    print("[scheduler] started - daily review reminders at 09:00 and 20:00 KST")
