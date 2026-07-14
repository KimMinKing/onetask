from functools import lru_cache


@lru_cache(maxsize=4096)
def translate_ko_to_zh(text: str | None) -> str | None:
    if not text:
        return None

    try:
        from deep_translator import GoogleTranslator

        return GoogleTranslator(source="ko", target="zh-CN").translate(text)
    except Exception:
        return None
