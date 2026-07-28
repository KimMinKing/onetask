from __future__ import annotations

from dataclasses import dataclass
from html import escape
from typing import Iterable
from zoneinfo import ZoneInfo

import requests

from models import Task


API_BASE = "https://api.telegram.org/bot{token}/{method}"
KST = ZoneInfo("Asia/Seoul")


class TelegramError(RuntimeError):
    pass


@dataclass(frozen=True)
class TelegramConnection:
    bot_username: str
    chat_id: str | None


def _request(token: str, method: str, payload: dict | None = None) -> dict:
    try:
        if payload is None:
            response = requests.get(API_BASE.format(token=token, method=method), timeout=12)
        else:
            response = requests.post(API_BASE.format(token=token, method=method), json=payload, timeout=12)
    except requests.RequestException as exc:
        raise TelegramError(f"Telegram request failed: {exc}") from exc

    try:
        data = response.json()
    except ValueError as exc:
        raise TelegramError("Telegram returned a non-JSON response") from exc

    if not response.ok or not data.get("ok"):
        description = data.get("description") or response.text[:300]
        raise TelegramError(f"Telegram API error: {description}")
    return data


def inspect_connection(token: str) -> TelegramConnection:
    token = token.strip()
    if not token:
        raise TelegramError("Telegram bot token is empty")

    me = _request(token, "getMe")["result"]
    updates = _request(token, "getUpdates").get("result", [])
    chat_id = None
    for update in reversed(updates):
        message = update.get("message") or update.get("edited_message") or update.get("channel_post")
        chat = message.get("chat") if message else None
        if chat and chat.get("id") is not None:
            chat_id = str(chat["id"])
            break

    return TelegramConnection(bot_username=me.get("username") or me.get("first_name") or "bot", chat_id=chat_id)


def send_message(token: str, chat_id: str, text: str) -> None:
    _request(token, "sendMessage", {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": "HTML",
        "disable_web_page_preview": True,
    })


def format_due_tasks_message(tasks: Iterable[Task]) -> str:
    lines = [
        "<b>🔔 onetask 할 일 알림</b>",
        "",
        "지금 처리할 시간이 된 할 일이 있어요.",
        "",
    ]
    for task in tasks:
        due = task.due_at
        time_text = "⏰"
        if due:
            time_text = f"⏰ {due.astimezone(KST).strftime('%H:%M')}"
        lines.append(f"{time_text}  <b>{escape(task.title)}</b>")
    lines.append("")
    lines.append("하나씩 정리해볼까요?")
    return "\n".join(lines)
