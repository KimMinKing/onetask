import csv
from functools import lru_cache
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/english-phrases", tags=["english-phrases"])

DATA_PATH = Path(__file__).resolve().parent.parent / "data" / "english_phrase_curriculum.csv"


@lru_cache(maxsize=1)
def _load_rows() -> list[dict]:
    if not DATA_PATH.exists():
        raise FileNotFoundError(f"Missing phrase curriculum: {DATA_PATH}")

    with DATA_PATH.open("r", encoding="utf-8-sig", newline="") as f:
        rows = list(csv.DictReader(f))

    for row in rows:
        row["id"] = int(row["id"])
        row["level"] = int(row["level"])
        row["pattern_no"] = int(row["pattern_no"])
        row["variation_no"] = int(row["variation_no"])
    return rows


def _rows() -> list[dict]:
    try:
        return _load_rows()
    except FileNotFoundError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/levels")
def get_levels():
    rows = _rows()
    levels: dict[int, dict] = {}
    for row in rows:
        level = row["level"]
        item = levels.setdefault(
            level,
            {
                "level": level,
                "cefr": row["cefr"],
                "level_title": row["level_title"],
                "count": 0,
                "functions": set(),
            },
        )
        item["count"] += 1
        item["functions"].add(row["function"])

    result = []
    for item in sorted(levels.values(), key=lambda x: x["level"]):
        result.append({**item, "functions": sorted(item["functions"])})
    return result


@router.get("/")
def list_phrases(
    level: Optional[int] = None,
    q: Optional[str] = None,
    function: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
):
    if level is not None and not 1 <= level <= 10:
        raise HTTPException(status_code=422, detail="level must be between 1 and 10")
    if not 1 <= limit <= 500:
        raise HTTPException(status_code=422, detail="limit must be between 1 and 500")
    if offset < 0:
        raise HTTPException(status_code=422, detail="offset must be greater than or equal to 0")

    rows = _rows()
    filtered = rows

    if level is not None:
        filtered = [row for row in filtered if row["level"] == level]
    if function:
        filtered = [row for row in filtered if row["function"] == function]
    if q:
        needle = q.casefold()
        searchable_fields = (
            "expression",
            "meaning_ko",
            "example_en",
            "example_ko",
            "dialogue_en",
            "dialogue_ko",
            "situation_ko",
            "note_ko",
            "memory_chunk",
            "tags",
        )
        filtered = [
            row for row in filtered
            if any(needle in str(row.get(field, "")).casefold() for field in searchable_fields)
        ]

    return {
        "total": len(filtered),
        "limit": limit,
        "offset": offset,
        "items": filtered[offset:offset + limit],
    }


@router.get("/{phrase_id}")
def get_phrase(phrase_id: int):
    for row in _rows():
        if row["id"] == phrase_id:
            return row
    raise HTTPException(status_code=404, detail="Phrase not found")
