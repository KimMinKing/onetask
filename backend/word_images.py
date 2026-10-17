"""Resolve vocabulary images only when their recorded word identity still matches."""

import hashlib
import json
from pathlib import Path


IMAGE_ROOT = Path(__file__).resolve().parent / "test_output"
_manifest_path = Path(__file__).resolve().parent / "word_image_manifest.json"
LEGACY_IMAGES: dict[str, list[str | int]] = json.loads(_manifest_path.read_text(encoding="utf-8"))


def image_fingerprint(level: int, chinese: str, pinyin: str, meaning: str, example_zh: str | None) -> str:
    identity = "\0".join((str(level), chinese, pinyin, meaning, example_zh or ""))
    return hashlib.sha256(identity.encode("utf-8")).hexdigest()[:20]


def image_path_for(level: int, word_id: int, chinese: str, pinyin: str, meaning: str, example_zh: str | None) -> str:
    fingerprint = image_fingerprint(level, chinese, pinyin, meaning, example_zh)
    return f"test_output/hsk{level}/word_{word_id}_{fingerprint}.webp"


def verified_image(word, image_root: Path = IMAGE_ROOT) -> tuple[str | None, str | None]:
    """Return a path and cache version; ambiguous legacy images are intentionally hidden."""
    level = word.hsk_level
    if level not in (3, 4, 5, 6):
        return None, None
    fingerprint = image_fingerprint(level, word.chinese, word.pinyin, word.meaning, word.example_zh)
    current_path = image_path_for(level, word.id, word.chinese, word.pinyin, word.meaning, word.example_zh)
    if word.image_path == current_path:
        relative = f"hsk{level}/word_{word.id}_{fingerprint}.webp"
    else:
        legacy = LEGACY_IMAGES.get(str(word.id))
        if not legacy or legacy[0] != fingerprint or legacy[2] != level:
            return None, None
        relative = f"hsk{level}/word_{legacy[1]}.webp"
    image = image_root / relative
    try:
        stat = image.stat()
    except OSError:
        return None, None
    return f"test_output/{relative}", f"{stat.st_mtime_ns:x}-{stat.st_size:x}"
