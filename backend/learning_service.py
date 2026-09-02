from datetime import date, datetime, timedelta, timezone

from sqlalchemy.orm import Session

from models import LearningActivity, LearningProgress, MistakeItem, UserSettings


SUBJECTS = {
    "zh": ("중국어 HSK 4급", "/words?hsk=4"),
    "ja": ("일본어 히라가나", "/words?course=kana"),
    "en": ("영어 표현", "/english-phrases"),
    "sqld": ("SQLD", "/sqld"),
    "network": ("네트워크관리사", "/network"),
}


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
    return limit


def priority_subject(settings: UserSettings) -> str:
    today = date.today()
    candidates = []
    for subject, raw in (("sqld", settings.sqld_exam_date), ("network", settings.network_exam_date)):
        if raw:
            try:
                remaining = (date.fromisoformat(raw) - today).days
                if remaining >= 0:
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

    def add(subject: str, title: str, task_minutes: int, href: str, unit_id: str | None = None):
        progress = None
        if unit_id:
            progress = db.query(LearningProgress).filter(
                LearningProgress.user_id == user_id,
                LearningProgress.subject == subject,
                LearningProgress.unit_id == unit_id,
            ).first()
        tasks.append({
            "id": f"{subject}:{unit_id or 'review'}",
            "subject": subject,
            "title": title,
            "minutes": task_minutes,
            "href": href,
            "unit_id": unit_id,
            "completed": bool(progress and progress.completed),
        })

    if budget == 5:
        add("zh", "HSK 4급 어제 단어 빠른 복습", 5, "/words?hsk=4")
    elif budget == 15:
        label, href = SUBJECTS[primary]
        add(primary, f"{label} {primary_unit}단계", 15, course_href(primary, href, primary_unit), str(primary_unit))
    elif budget == 30:
        add("zh", "HSK 4급 복습", 10, "/words?hsk=4")
        label, href = SUBJECTS[primary]
        add(primary, f"{label} {primary_unit}단계", 20, course_href(primary, href, primary_unit), str(primary_unit))
    else:
        add("zh", "HSK 4급 복습", 15, "/words?hsk=4")
        label, href = SUBJECTS[primary]
        add(primary, f"{label} {primary_unit}단계", 25, course_href(primary, href, primary_unit), str(primary_unit))
        secondary = "network" if primary == "sqld" else "sqld"
        secondary_unit = next_unit(db, user_id, secondary)
        secondary_label, secondary_href = SUBJECTS[secondary]
        add(secondary, f"{secondary_label} {secondary_unit}단계", 20, f"{secondary_href}?step={secondary_unit}", str(secondary_unit))

    last = db.query(LearningActivity).filter(LearningActivity.user_id == user_id).order_by(LearningActivity.created_at.desc()).first()
    inactive_days = 0
    if last and last.created_at:
        stamp = last.created_at if last.created_at.tzinfo else last.created_at.replace(tzinfo=timezone.utc)
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
        study_dates.add(row.created_at.date().isoformat())
    return {
        "days": len(study_dates),
        "activities": len(rows),
        "minutes": sum(row.duration_minutes or 0 for row in rows),
        "by_subject": by_subject,
        "unresolved_mistakes": db.query(MistakeItem).filter(MistakeItem.user_id == user_id, MistakeItem.resolved_at == None).count(),
    }
