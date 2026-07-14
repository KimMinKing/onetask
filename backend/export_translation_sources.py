import argparse
import json
from pathlib import Path

from database import SessionLocal
from models import EnglishWord, JapaneseWord


EXPORT_DIR = Path(__file__).resolve().parent.parent / "translation_exports"
DEFAULT_DUMP_PATH = Path(__file__).resolve().parent.parent / "onetask_dump.sql"


def _clean(value: str | None) -> str:
    return (value or "").replace("\r\n", " ").replace("\n", " ").strip()


def _unescape_pg_copy(value: str) -> str:
    if value == r"\N":
        return ""
    return (
        value
        .replace(r"\t", "\t")
        .replace(r"\n", "\n")
        .replace(r"\r", "\r")
        .replace(r"\\", "\\")
    )


def _load_english_from_db() -> list[dict]:
    db = SessionLocal()
    try:
        words = db.query(EnglishWord).order_by(EnglishWord.level, EnglishWord.id).all()
    finally:
        db.close()

    return [
        {
            "id": word.id,
            "level": word.level,
            "word": _clean(word.word),
            "example_en": _clean(word.example_en),
            "meaning_ko": _clean(word.meaning),
            "example_ko": _clean(word.example_ko),
            "meaning_zh": "",
            "example_zh": "",
        }
        for word in words
    ]


def _load_english_from_dump(path: Path) -> list[dict]:
    rows: list[dict] = []
    in_copy = False
    columns: list[str] = []

    with path.open("r", encoding="utf-8") as handle:
        for line in handle:
            stripped = line.rstrip("\n")
            if not in_copy:
                if stripped.startswith("COPY public.english_words "):
                    in_copy = True
                    column_text = stripped.split("(", 1)[1].split(")", 1)[0]
                    columns = [column.strip() for column in column_text.split(",")]
                continue

            if stripped == r"\.":
                break

            values = [_unescape_pg_copy(value) for value in stripped.split("\t")]
            row = dict(zip(columns, values))
            rows.append({
                "id": int(row["id"]),
                "level": row.get("level") or None,
                "word": _clean(row.get("word")),
                "example_en": _clean(row.get("example_en")),
                "meaning_ko": _clean(row.get("meaning")),
                "example_ko": _clean(row.get("example_ko")),
                "meaning_zh": "",
                "example_zh": "",
            })

    return sorted(rows, key=lambda item: ((item["level"] or ""), item["id"]))


def export_english(source: str, dump_path: Path) -> tuple[Path, Path, int]:
    words = _load_english_from_dump(dump_path) if source == "dump" else _load_english_from_db()

    EXPORT_DIR.mkdir(parents=True, exist_ok=True)
    md_path = EXPORT_DIR / "english_words_for_zh_translation.md"
    jsonl_path = EXPORT_DIR / "english_words_for_zh_translation.jsonl"

    with md_path.open("w", encoding="utf-8", newline="\n") as md, jsonl_path.open("w", encoding="utf-8", newline="\n") as jsonl:
        md.write("# English Words For Chinese Translation\n\n")
        md.write("Translate `meaning_ko` and `example_ko` into natural Simplified Chinese.\n")
        md.write("Keep `id`, `word`, `level`, and `example_en` unchanged.\n")
        md.write("Return JSONL with: id, meaning_zh, example_zh.\n\n")
        md.write("## Source\n\n")

        for record in words:
            jsonl.write(json.dumps(record, ensure_ascii=False) + "\n")
            md.write(
                f"- id: {record['id']} | level: {record['level'] or ''} | "
                f"[{record['word']} , {record['example_en']}]\n"
            )
            md.write(f"  - meaning_ko: {record['meaning_ko']}\n")
            if record["example_ko"]:
                md.write(f"  - example_ko: {record['example_ko']}\n")

    return md_path, jsonl_path, len(words)


def export_japanese() -> tuple[Path, Path, int]:
    db = SessionLocal()
    try:
        words = db.query(JapaneseWord).order_by(JapaneseWord.jlpt_level, JapaneseWord.id).all()
    finally:
        db.close()

    EXPORT_DIR.mkdir(parents=True, exist_ok=True)
    md_path = EXPORT_DIR / "japanese_words_for_zh_translation.md"
    jsonl_path = EXPORT_DIR / "japanese_words_for_zh_translation.jsonl"

    with md_path.open("w", encoding="utf-8", newline="\n") as md, jsonl_path.open("w", encoding="utf-8", newline="\n") as jsonl:
        md.write("# Japanese Words For Chinese Translation\n\n")
        md.write("Translate `meaning_ko` and `example_ko` into natural Simplified Chinese.\n")
        md.write("Keep `id`, `expression`, `reading`, `jlpt_level`, and `example_jp` unchanged.\n")
        md.write("Return JSONL with: id, meaning_zh, example_zh.\n\n")
        md.write("## Source\n\n")

        for word in words:
            record = {
                "id": word.id,
                "jlpt_level": word.jlpt_level,
                "expression": _clean(word.expression),
                "reading": _clean(word.reading),
                "example_jp": _clean(word.example_jp),
                "meaning_ko": _clean(word.meaning),
                "example_ko": _clean(word.example_ko),
                "meaning_zh": "",
                "example_zh": "",
            }
            jsonl.write(json.dumps(record, ensure_ascii=False) + "\n")
            md.write(
                f"- id: {record['id']} | level: {record['jlpt_level'] or ''} | "
                f"[{record['expression']} / {record['reading']} , {record['example_jp']}]\n"
            )
            md.write(f"  - meaning_ko: {record['meaning_ko']}\n")
            if record["example_ko"]:
                md.write(f"  - example_ko: {record['example_ko']}\n")

    return md_path, jsonl_path, len(words)


def main() -> None:
    parser = argparse.ArgumentParser(description="Export word sources for external Chinese translation.")
    parser.add_argument("--lang", choices=["en", "ja", "all"], default="en")
    parser.add_argument("--source", choices=["db", "dump"], default="db")
    parser.add_argument("--dump-path", type=Path, default=DEFAULT_DUMP_PATH)
    args = parser.parse_args()

    results: list[tuple[Path, Path, int]] = []
    if args.lang in ["en", "all"]:
        results.append(export_english(args.source, args.dump_path))
    if args.lang in ["ja", "all"]:
        results.append(export_japanese())

    for md_path, jsonl_path, count in results:
        print(f"exported {count} rows")
        print(md_path)
        print(jsonl_path)


if __name__ == "__main__":
    main()
