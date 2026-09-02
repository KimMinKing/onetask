from datetime import date, datetime, timedelta, timezone

from sqlalchemy import func
from sqlalchemy.orm import Session
from zoneinfo import ZoneInfo

from models import EnglishWordCard, JapaneseWordCard, LearningActivity, LearningProgress, MistakeItem, UserSettings, WordCard


SUBJECTS = {
    "zh": ("중국어 HSK 4급", "/words?hsk=4"),
    "ja": ("일본어 히라가나", "/words?course=kana"),
    "en": ("영어 표현", "/english-phrases"),
    "sqld": ("SQLD", "/sqld"),
    "network": ("네트워크관리사", "/network"),
}
LANGUAGE_CARDS = {"zh": WordCard, "en": EnglishWordCard, "ja": JapaneseWordCard}
KST = ZoneInfo("Asia/Seoul")


def _day_start_utc(days_ago: int = 0) -> datetime:
    local_date = datetime.now(KST).date() - timedelta(days=days_ago)
    return datetime.combine(local_date, datetime.min.time(), tzinfo=KST).astimezone(timezone.utc)


def get_or_create_settings(db: Session, user_id: int) -> UserSettings:
    settings = db.query(UserSettings).filter(UserSettings.user_id == user_id).first()
    if not settings:
        settings = UserSettings(user_id=user_id)
        db.add(settings)
        db.flush()
    return settings


def next_unit(db: Session, user_id: int, subject: str) -> int:
    rows = db.query(LearningProgress).filter(
        LearningProgress.user_id == user_id,
        LearningProgress.subject == subject,
        LearningProgress.completed == True,
    ).all()
    completed = {int(row.unit_id) for row in rows if row.unit_id.isdigit()}
    limit = 100 if subject in {"sqld", "network"} else 9999
    for unit in range(1, limit + 1):
        if unit not in completed:
            return unit
    return limit + 1


def priority_subject(settings: UserSettings) -> str:
    today = datetime.now(KST).date()
    candidates = []
    for subject, raw in (("sqld", settings.sqld_exam_date), ("network", settings.network_exam_date)):
        if raw:
            try:
                remaining = (date.fromisoformat(raw) - today).days
                if 0 <= remaining <= 120:
                    candidates.append((remaining, subject))
            except ValueError:
                pass
    if candidates:
        return min(candidates)[1]
    return settings.focus_subject if settings.focus_subject in SUBJECTS else "sqld"


def build_today_plan(db: Session, user_id: int, minutes: int | None = None) -> dict:
    settings = get_or_create_settings(db, user_id)
    budget = minutes or settings.study_minutes or 15
    budget = min((5, 15, 30, 60), key=lambda value: abs(value - budget))
    primary = priority_subject(settings)
    primary_unit = next_unit(db, user_id, primary)
    tasks = []

    def course_href(subject: str, href: str, unit: int) -> str:
        return f"{href}?step={unit}" if subject in {"sqld", "network"} else href

    def add(subject: str, title: str, task_minutes: int, href: str, unit_id: str | None = None, completed_override: bool = False):
        progress = None
        if unit_id:
            progress = db.query(LearningProgress).filter(
                LearningProgress.user_id == user_id,
                LearningProgress.subject == subject,
                LearningProgress.unit_id == unit_id,
            ).first()
        reviewed_today = False
        if subject in LANGUAGE_CARDS:
            model = LANGUAGE_CARDS[subject]
            reviewed_today = db.query(model).filter(model.user_id == user_id, model.last_review >= _day_start_utc()).first() is not None
        tasks.append({
            "id": f"{subject}:{unit_id or 'review'}",
            "subject": subject,
            "title": title,
            "minutes": task_minutes,
            "href": href,
            "unit_id": unit_id,
            "completed": completed_override or reviewed_today or bool(progress and progress.completed),
        })

    def add_course(subject: str, task_minutes: int, unit: int):
        label, href = SUBJECTS[subject]
        if subject in {"sqld", "network"} and unit > 100:
            add(subject, f"{label} 100단계 완료 · 오답 복습", task_minutes, f"/mistakes?subject={subject}", completed_override=True)
        else:
            add(subject, f"{label} {unit}단계", task_minutes, course_href(subject, href, unit), str(unit))

    if budget == 5:
        add("zh", "HSK 4급 어제 단어 빠른 복습", 5, "/words?hsk=4")
    elif budget == 15:
        add_course(primary, 15, primary_unit)
    elif budget == 30:
        add("zh", "HSK 4급 복습", 10, "/words?hsk=4")
        add_course(primary, 20, primary_unit)
    else:
        add("zh", "HSK 4급 복습", 15, "/words?hsk=4")
        add_course(primary, 25, primary_unit)
        secondary = "network" if primary == "sqld" else "sqld"
        secondary_unit = next_unit(db, user_id, secondary)
        add_course(secondary, 20, secondary_unit)

    last = db.query(LearningActivity).filter(LearningActivity.user_id == user_id).order_by(LearningActivity.created_at.desc()).first()
    latest_stamp = last.created_at if last else None
    for model in LANGUAGE_CARDS.values():
        stamp = db.query(func.max(model.last_review)).filter(model.user_id == user_id).scalar()
        if stamp and (not latest_stamp or stamp.replace(tzinfo=stamp.tzinfo or timezone.utc) > latest_stamp.replace(tzinfo=latest_stamp.tzinfo or timezone.utc)):
            latest_stamp = stamp
    inactive_days = 0
    if latest_stamp:
        stamp = latest_stamp if latest_stamp.tzinfo else latest_stamp.replace(tzinfo=timezone.utc)
        inactive_days = max(0, (datetime.now(timezone.utc).date() - stamp.date()).days)
    recovery = "오늘 5분만 다시 시작해도 충분해요." if inactive_days >= 3 else None
    unresolved = db.query(MistakeItem).filter(MistakeItem.user_id == user_id, MistakeItem.resolved_at == None).count()
    return {
        "minutes": budget,
        "primary_subject": primary,
        "tasks": tasks,
        "total_minutes": sum(task["minutes"] for task in tasks),
        "recovery_message": recovery,
        "unresolved_mistakes": unresolved,
    }


def weekly_report(db: Session, user_id: int) -> dict:
    since = datetime.now(timezone.utc) - timedelta(days=7)
    rows = db.query(LearningActivity).filter(
        LearningActivity.user_id == user_id,
        LearningActivity.created_at >= since,
    ).all()
    by_subject: dict[str, dict] = {}
    study_dates = set()
    for row in rows:
        item = by_subject.setdefault(row.subject, {"activities": 0, "minutes": 0, "correct": 0, "total": 0})
        item["activities"] += 1
        item["minutes"] += row.duration_minutes or 0
        item["correct"] += row.correct_count or 0
        item["total"] += row.total_count or 0
        stamp = row.created_at if row.created_at.tzinfo else row.created_at.replace(tzinfo=timezone.utc)
        study_dates.add(stamp.astimezone(KST).date().isoformat())
    language_reviews = 0
    for subject, model in LANGUAGE_CARDS.items():
        cards = db.query(model).filter(model.user_id == user_id, model.last_review >= since).all()
        if not cards:
            continue
        language_reviews += len(cards)
        item = by_subject.setdefault(subject, {"activities": 0, "minutes": 0, "correct": 0, "total": 0})
        item["activities"] += len(cards)
        item["minutes"] += len(cards)
        item["total"] += len(cards)
        for card in cards:
            stamp = card.last_review if card.last_review.tzinfo else card.last_review.replace(tzinfo=timezone.utc)
            study_dates.add(stamp.astimezone(KST).date().isoformat())
    return {
        "days": len(study_dates),
        "activities": len(rows) + language_reviews,
        "minutes": sum(row.duration_minutes or 0 for row in rows) + language_reviews,
        "by_subject": by_subject,
        "unresolved_mistakes": db.query(MistakeItem).filter(MistakeItem.user_id == user_id, MistakeItem.resolved_at == None).count(),
    }
