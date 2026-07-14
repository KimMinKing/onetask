from datetime import datetime
from pathlib import Path
from typing import Iterable
from zoneinfo import ZoneInfo

from sqlalchemy.orm import Session

from models import Status, Task, UserSettings

KST = ZoneInfo("Asia/Seoul")
START_MARKER = "<!-- onetask:start -->"
END_MARKER = "<!-- onetask:end -->"


def task_note_date(task: Task) -> str:
    source = task.due_at or task.created_at
    if source.tzinfo is None:
      source = source.replace(tzinfo=KST)
    return source.astimezone(KST).date().isoformat()


def sync_dates_for_user(db: Session, user_id: int, dates: Iterable[str]) -> None:
    settings = db.query(UserSettings).filter(UserSettings.user_id == user_id).first()
    if not settings or not settings.obsidian_enabled or not settings.obsidian_vault_path:
        return

    vault = Path(settings.obsidian_vault_path).expanduser().resolve()
    if not vault.exists() or not vault.is_dir():
        return

    for date in sorted(set(dates)):
        if not date:
            continue
        try:
            _write_daily_note(db, user_id, vault, date)
        except OSError:
            continue


def sync_all_tasks_for_user(db: Session, user_id: int) -> int:
    tasks = db.query(Task).filter(Task.user_id == user_id).all()
    dates = {task_note_date(task) for task in tasks}
    sync_dates_for_user(db, user_id, dates)
    return len(dates)


def _write_daily_note(db: Session, user_id: int, vault: Path, date: str) -> None:
    target = (vault / f"{date}.md").resolve()
    if not target.is_relative_to(vault):
        return

    tasks = [
        task
        for task in db.query(Task).filter(Task.user_id == user_id).order_by(Task.order, Task.created_at).all()
        if task_note_date(task) == date
    ]

    existing = target.read_text(encoding="utf-8") if target.exists() else f"# {date}\n"
    section = _render_section(date, tasks)
    updated = _replace_managed_section(existing, section)
    target.write_text(updated, encoding="utf-8")


def _render_section(date: str, tasks: list[Task]) -> str:
    lines = [
        START_MARKER,
        "## 할 일 목록",
        "",
    ]

    if tasks:
        for task in tasks:
            checked = "x" if task.status == Status.done else " "
            metadata = []
            if task.category:
                metadata.append(f"#{task.category}")
            if task.urgency:
                metadata.append(f"urgency:{task.urgency.value}")
            if task.due_at:
                due = task.due_at
                if due.tzinfo is None:
                    due = due.replace(tzinfo=KST)
                metadata.append(due.astimezone(KST).strftime("%H:%M"))
            meta = f" {' '.join(metadata)}" if metadata else ""
            lines.append(f"- [{checked}] {task.title}{meta} <!-- onetask-task:{task.id} -->")
    else:
        lines.append("_할 일이 없습니다._")

    lines.extend([
        "",
        f"_synced from onetask: {datetime.now(KST).strftime('%Y-%m-%d %H:%M')}_",
        END_MARKER,
        "",
    ])
    return "\n".join(lines)


def _replace_managed_section(content: str, section: str) -> str:
    start = content.find(START_MARKER)
    end = content.find(END_MARKER)

    if start != -1 and end != -1 and end > start:
        after_end = end + len(END_MARKER)
        return f"{content[:start].rstrip()}\n\n{section}{content[after_end:].lstrip()}"

    return f"{content.rstrip()}\n\n{section}"
