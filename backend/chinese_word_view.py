"""Resolve a Chinese card's text from the checked word/example catalogs.

The database is still repaired on startup, but a stale or later-imported row
must not leak an old, shifted sentence to the card API in the meantime.
"""

import json
from functools import lru_cache

from word_pair_migration import (CATALOG, HSK35_CATALOG, HSK35_EXAMPLES,
                                 HSK126_CATALOG, HSK126_REVIEWED_EXAMPLE_IDS,
                                 HSK126_REVIEWED_MEANING_IDS)
from chinese_pronunciation_overrides import WORD_SOURCE_PINYIN


MANUAL_HSK35_IDS = {item[1] for item in HSK35_EXAMPLES}


@lru_cache(maxsize=1)
def _catalogs() -> dict[tuple[int, int], dict]:
    hsk4 = json.loads(CATALOG.read_text(encoding="utf-8"))
    hsk35 = json.loads(HSK35_CATALOG.read_text(encoding="utf-8"))
    hsk126 = json.loads(HSK126_CATALOG.read_text(encoding="utf-8"))
    return {(4, row["id"]): row for row in hsk4} | {
        (row["hsk_level"], row["id"]): row for row in hsk35
    } | {
        (row["hsk_level"], row["id"]): row for row in hsk126
    }


def word_content(word) -> tuple[dict[str, str | None], bool]:
    """Return display text and whether it differs from the current DB row."""
    current = {
        "meaning": word.meaning,
        "example_zh": word.example_zh,
        "example_ko": word.example_ko,
        "example_pinyin": word.example_pinyin,
    }
    pair = _catalogs().get((word.hsk_level, word.id))
    if pair is None:
        return current, False
    if word.chinese != pair["chinese"] or word.pinyin not in (
        pair["pinyin"], pair.get("source_pinyin"), WORD_SOURCE_PINYIN.get(word.id)
    ):
        # The ID now belongs to another word. Do not display its old example.
        hidden = {**current, "example_zh": None, "example_ko": None,
                  "example_pinyin": None}
        return hidden, hidden != current
    if word.hsk_level == 4:
        resolved = {field: pair[field] for field in current}
    elif word.hsk_level in (1, 2, 6):
        resolved = {
            **current,
            "meaning": pair["meaning"] if word.id in HSK126_REVIEWED_MEANING_IDS else word.meaning,
            "example_zh": pair["example_zh"],
            "example_pinyin": pair["example_pinyin"],
            "example_ko": pair["example_ko"] if
            word.example_zh != pair["example_zh"] or word.id in HSK126_REVIEWED_EXAMPLE_IDS
            else word.example_ko,
        }
    else:
        resolved = {
            **current,
            "example_zh": pair["example_zh"],
            "example_pinyin": pair["example_pinyin"],
            "example_ko": pair["example_ko"] if
            word.example_zh != pair["example_zh"] or word.id in MANUAL_HSK35_IDS
            else word.example_ko,
        }
    return resolved, resolved != current


def canonical_pinyin(word) -> str:
    """Display the reviewed word reading while a legacy DB row is being repaired."""
    pair = _catalogs().get((word.hsk_level, word.id))
    if pair and word.chinese == pair["chinese"] and word.pinyin in (
        pair["pinyin"], pair.get("source_pinyin"), WORD_SOURCE_PINYIN.get(word.id)
    ):
        return pair["pinyin"]
    return word.pinyin
