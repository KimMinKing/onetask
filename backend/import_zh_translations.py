import argparse
import json
from pathlib import Path

from database import SessionLocal
from models import EnglishWord, JapaneseWord


def _read_jsonl(path: Path) -> list[dict]:
    rows: list[dict] = []
    with path.open("r", encoding="utf-8") as handle:
        for line_no, line in enumerate(handle, start=1):
            stripped = line.strip()
            if not stripped:
                continue
            try:
                rows.append(json.loads(stripped))
            except json.JSONDecodeError as exc:
                raise ValueError(f"Invalid JSONL at {path}:{line_no}: {exc}") from exc
    return rows


def _clean(value: object) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def import_english(path: Path, dry_run: bool) -> int:
    rows = _read_jsonl(path)
    db = SessionLocal()
    updated = 0
    try:
        for row in rows:
            word_id = int(row["id"])
            word = db.query(EnglishWord).filter(EnglishWord.id == word_id).first()
            if not word:
                continue

            meaning_zh = _clean(row.get("meaning_zh"))
            example_zh = _clean(row.get("example_zh"))
            example_en = _clean(row.get("example_en"))
            example_ko = _clean(row.get("example_ko"))
            if example_en is not None:
                word.example_en = example_en
            if example_ko is not None:
                word.example_ko = example_ko
            if meaning_zh is not None:
                word.meaning_zh = meaning_zh
            if example_zh is not None:
                word.example_zh = example_zh
            if example_en is not None or example_ko is not None or meaning_zh is not None or example_zh is not None:
                updated += 1

        if dry_run:
            db.rollback()
        else:
            db.commit()
    finally:
        db.close()
    return updated


def import_japanese(path: Path, dry_run: bool) -> int:
    rows = _read_jsonl(path)
    db = SessionLocal()
    updated = 0
    try:
        for row in rows:
            word_id = int(row["id"])
            word = db.query(JapaneseWord).filter(JapaneseWord.id == word_id).first()
            if not word:
                continue

            meaning_zh = _clean(row.get("meaning_zh"))
            example_zh = _clean(row.get("example_zh"))
            if meaning_zh is not None:
                word.meaning_zh = meaning_zh
            if example_zh is not None:
                word.example_zh = example_zh
            if meaning_zh is not None or example_zh is not None:
                updated += 1

        if dry_run:
            db.rollback()
        else:
            db.commit()
    finally:
        db.close()
    return updated


def main() -> None:
    parser = argparse.ArgumentParser(description="Import reviewed Chinese word translations from JSONL.")
    parser.add_argument("path", type=Path)
    parser.add_argument("--lang", choices=["en", "ja"], required=True)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    if args.lang == "en":
        updated = import_english(args.path, args.dry_run)
    else:
        updated = import_japanese(args.path, args.dry_run)

    mode = "would update" if args.dry_run else "updated"
    print(f"{mode} {updated} rows")


if __name__ == "__main__":
    main()
