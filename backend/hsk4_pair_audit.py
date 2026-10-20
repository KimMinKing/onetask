"""Read-only comparison of all HSK 4 database rows with the reviewed catalog.

Run inside the current backend container: python hsk4_pair_audit.py
"""

import json
from collections import Counter
from dataclasses import dataclass

from sqlalchemy import inspect, text

from word_pair_migration import CATALOG, MARKER


CONTENT_FIELDS = ("meaning", "example_zh", "example_ko", "example_pinyin")


@dataclass
class AuditResult:
    catalog_count: int
    database_count: int
    marker_present: bool
    missing_ids: list[int]
    extra_ids: list[int]
    identity_mismatches: list[tuple[int, str, str]]
    content_mismatches: list[tuple[int, str, tuple[str, ...]]]
    field_counts: Counter


def audit_hsk4_pairs(engine) -> AuditResult:
    inspector = inspect(engine)
    if not inspector.has_table("words") or not inspector.has_table("migration_markers"):
        raise RuntimeError("words 또는 migration_markers 테이블이 없습니다")

    pairs = json.loads(CATALOG.read_text(encoding="utf-8"))
    with engine.connect() as connection:
        rows = connection.execute(text("""
            SELECT id, chinese, pinyin, meaning, example_zh, example_ko, example_pinyin
            FROM words WHERE hsk_level = 4
        """)).mappings().all()
        marker_present = connection.execute(text(
            "SELECT 1 FROM migration_markers WHERE name = :name"
        ), {"name": MARKER}).first() is not None

    by_id = {row["id"]: row for row in rows}
    catalog_ids = {pair["id"] for pair in pairs}
    missing_ids = sorted(catalog_ids - by_id.keys())
    extra_ids = sorted(by_id.keys() - catalog_ids)
    identity_mismatches = []
    content_mismatches = []
    field_counts = Counter()
    for pair in pairs:
        row = by_id.get(pair["id"])
        if row is None:
            continue
        if row["chinese"] != pair["chinese"] or row["pinyin"] != pair["pinyin"]:
            identity_mismatches.append((pair["id"], pair["chinese"], row["chinese"]))
            continue
        fields = tuple(field for field in CONTENT_FIELDS if row[field] != pair[field])
        if fields:
            content_mismatches.append((pair["id"], pair["chinese"], fields))
            field_counts.update(fields)

    return AuditResult(len(pairs), len(rows), marker_present, missing_ids, extra_ids,
                       identity_mismatches, content_mismatches, field_counts)


def main() -> int:
    from database import engine

    result = audit_hsk4_pairs(engine)
    print(f"HSK4 교정 목록 {result.catalog_count}개 / DB {result.database_count}개")
    print(f"마이그레이션 기록: {'있음' if result.marker_present else '없음'}")
    print(f"누락 ID {len(result.missing_ids)}개 / 추가 ID {len(result.extra_ids)}개 / "
          f"단어 식별 불일치 {len(result.identity_mismatches)}개 / "
          f"뜻·예문·병음 불일치 {len(result.content_mismatches)}개")
    if result.field_counts:
        print("불일치 필드:", ", ".join(f"{field} {result.field_counts[field]}개"
                                  for field in CONTENT_FIELDS if result.field_counts[field]))
    for label, sample in (
        ("누락 ID", result.missing_ids[:10]),
        ("추가 ID", result.extra_ids[:10]),
        ("식별 불일치 (ID, 목록 단어, DB 단어)", result.identity_mismatches[:10]),
        ("내용 불일치 (ID, 단어, 필드)", result.content_mismatches[:10]),
    ):
        if sample:
            print(f"{label} 앞 10개: {sample}")
    if not result.marker_present or result.missing_ids or result.extra_ids or result.identity_mismatches or result.content_mismatches:
        return 1
    print("HSK4 전체 601개가 교정 목록과 일치합니다.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
