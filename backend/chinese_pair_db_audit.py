"""Read-only audit of stored Chinese example/pinyin pairs against tracked catalogs.

Run inside the backend container after rebuilding it:
    python chinese_pair_db_audit.py

HSK3/4/5 have 2,200 exact pairs. HSK1/2/6 currently lack example pinyin
in the tracked source, so this audit reports their field coverage separately.
"""

import argparse
import json
from collections import Counter
from dataclasses import dataclass
from types import SimpleNamespace

from sqlalchemy import text

from word_pair_migration import CATALOG, HSK35_CATALOG, HSK35_EXAMPLES
from chinese_word_view import word_content


@dataclass
class PairAudit:
    counts: dict[int, Counter]
    mismatches: list[tuple[int, int, str, tuple[str, ...]]]


def audit_database(engine) -> PairAudit:
    hsk4 = json.loads(CATALOG.read_text(encoding="utf-8"))
    for row in hsk4:
        row["hsk_level"] = 4
    catalog = hsk4 + json.loads(HSK35_CATALOG.read_text(encoding="utf-8"))
    expected_by_id = {row["id"]: row for row in catalog}
    manual_translation_ids = {item[1] for item in HSK35_EXAMPLES}
    if len(expected_by_id) != 2200:
        raise ValueError("Expected 2,200 unique HSK3/4/5 catalog IDs")
    with engine.connect() as connection:
        rows = connection.execute(text("""
            SELECT id, hsk_level, chinese, pinyin, example_zh, example_ko, example_pinyin
            FROM words WHERE hsk_level BETWEEN 1 AND 6
        """)).mappings().all()
    by_id = {row["id"]: row for row in rows}
    counts = {level: Counter() for level in range(1, 7)}
    mismatches = []
    for row in rows:
        level = row["hsk_level"]
        count = counts[level]
        count["words"] += 1
        if row["example_zh"]:
            count["examples"] += 1
        if row["example_pinyin"]:
            count["pinyin"] += 1
        expected = expected_by_id.get(row["id"])
        if level not in (3, 4, 5):
            continue
        if expected is None:
            mismatches.append((level, row["id"], row["chinese"], ("extra_id",)))
            continue
        identity = ("hsk_level", "chinese", "pinyin")
        content = ("example_zh", "example_pinyin")
        if level == 4 or row["id"] in manual_translation_ids:
            content += ("example_ko",)
        fields = tuple(field for field in identity + content
                       if row[field] != expected[field])
        if fields:
            mismatches.append((level, row["id"], row["chinese"], fields))
    for word_id, expected in expected_by_id.items():
        if word_id not in by_id:
            mismatches.append((expected.get("hsk_level", 4), word_id, expected["chinese"], ("missing_id",)))
    return PairAudit(counts, sorted(mismatches))


def main() -> int:
    from database import engine

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--word", help="also show DB and card API text for this Chinese word")
    args = parser.parse_args()
    result = audit_database(engine)
    for level, count in result.counts.items():
        print(f"HSK{level}: DB {count['words']} words, {count['examples']} examples, "
              f"{count['pinyin']} example pinyin fields")
    print("HSK1/2/6: missing or unreviewed pinyin fields are coverage gaps, not verified matches")
    fields = Counter(field for _level, _id, _word, mismatched in result.mismatches for field in mismatched)
    print(f"HSK3/4/5 catalog mismatches: {len(result.mismatches)} / 2200")
    if fields:
        print("By field:", ", ".join(f"{field} {count}" for field, count in fields.items()))
    for mismatch in result.mismatches[:20]:
        print("  ", mismatch)
    if args.word:
        with engine.connect() as connection:
            rows = connection.execute(text("""
                SELECT id, hsk_level, chinese, pinyin, meaning,
                       example_zh, example_ko, example_pinyin
                FROM words WHERE chinese=:word ORDER BY hsk_level, id
            """), {"word": args.word}).mappings().all()
        for row in rows:
            card, stale = word_content(SimpleNamespace(**row))
            print(f"{row['id']} HSK{row['hsk_level']} {row['chinese']} (DB drift: {stale})")
            print(f"  DB: {row['example_zh']} / {row['example_pinyin']}")
            print(f"  Card API: {card['example_zh']} / {card['example_pinyin']}")
        if not rows:
            print(f"No word found: {args.word}")
    return 1 if result.mismatches else 0


if __name__ == "__main__":
    raise SystemExit(main())
