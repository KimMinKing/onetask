from functools import lru_cache
import requests


class GoogleTranslator:
    """Small compatibility wrapper for the removed deep-translator dependency."""

    def __init__(self, source: str, target: str):
        self.source = source
        self.target = target

    def translate(self, text: str) -> str | None:
        return translate_text(text, self.source, self.target)


@lru_cache(maxsize=4096)
def translate_text(text: str | None, source: str, target: str) -> str | None:
    if not text:
        return None
    try:
        response = requests.get(
            "https://translate.googleapis.com/translate_a/single",
            params={"client": "gtx", "sl": source, "tl": target, "dt": "t", "q": text},
            timeout=8,
        )
        response.raise_for_status()
        payload = response.json()
        translated = "".join(part[0] for part in payload[0] if part and part[0])
        return translated or None
    except (requests.RequestException, ValueError, TypeError, IndexError):
        return None


@lru_cache(maxsize=4096)
def translate_ko_to_zh(text: str | None) -> str | None:
    return translate_text(text, "ko", "zh-CN")
