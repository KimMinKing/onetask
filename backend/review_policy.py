from datetime import datetime, timedelta, timezone
from typing import Any


DEFAULT_NEW_LIMIT = 15
DEFAULT_REVIEW_LIMIT = 80
MAX_SESSION_SIZE = 100


def clamp_session_limits(new_count: int, review_limit: int) -> tuple[int, int]:
    new_count = max(0, min(new_count, 50))
    review_limit = max(0, min(review_limit, MAX_SESSION_SIZE))
    return new_count, review_limit


def sort_review_queue(items: list[dict]) -> list[dict]:
    return sorted(
        items,
        key=lambda item: (
            item["due"],
            -int(item.get("lapses") or 0),
            int(item.get("reps") or 0),
        ),
    )


def build_review_session(
    review_words: list[dict],
    new_words: list[dict],
    new_count: int,
    review_limit: int,
) -> list[dict]:
    new_count, review_limit = clamp_session_limits(new_count, review_limit)
    return sort_review_queue(review_words)[:review_limit] + new_words[:new_count]


def apply_minimum_spacing(card_row: Any, knew: bool, now: datetime | None = None) -> None:
    now = now or datetime.now(timezone.utc)
    due = card_row.due
    if due and due.tzinfo is None:
        due = due.replace(tzinfo=timezone.utc)

    if knew:
        min_due = now + (timedelta(days=1) if card_row.reps <= 1 else timedelta(days=3))
    else:
        min_due = now + timedelta(minutes=30)

    if due is None or due < min_due:
        card_row.due = min_due
