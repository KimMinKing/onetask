"""Check every Chinese example/pinyin pair in the tracked source data.

Run from the repository root after installing pypinyin locally:
    python backend/audit_chinese_source_pairs.py

The HSK4 catalog and ten reviewed HSK3/5 replacements are applied in memory.
This checks source material, not a remote production database.
"""

import json
import re
import unicodedata
from collections import Counter
from pathlib import Path

from pypinyin import Style, lazy_pinyin

from word_pair_migration import HSK35_EXAMPLES


ROOT = Path(__file__).resolve().parent.parent
DUMP = ROOT / "onetask_dump.sql"
HSK4_CATALOG = Path(__file__).resolve().parent / "data/hsk4_word_pairs.json"
# Polyphonic 系 is jì when tying a necktie; pypinyin chooses xì here.
REVIEWED_READINGS = {1364: ("他出门前系领带。", "tā chū mén qián jì lǐng dài。")}
# The library does not apply 一 tone sandhi or all neutral tones in context.
REVIEWED_TONE_DIFFERENCES = {22, 151, 584, 1364}


def source_rows() -> list[dict]:
    lines = DUMP.read_text(encoding="utf-8").splitlines()
    start = next(i for i, line in enumerate(lines) if line.startswith("COPY public.words (")) + 1
    rows = []
    for line in lines[start:]:
        if line == r"\.":
            break
        fields = line.split("\t")
        if fields[8] == r"\N":
            continue
        rows.append({
            "id": int(fields[0]), "chinese": fields[1], "pinyin": fields[2],
            "hsk_level": int(fields[8]),
            "example_zh": None if fields[4] == r"\N" else fields[4],
            "example_pinyin": None if fields[9] == r"\N" else fields[9],
        })
    return rows


def syllables(value: str) -> list[str]:
    plain = "".join(char for char in unicodedata.normalize("NFD", value.lower().replace("u:", "ü"))
                    if not unicodedata.combining(char))
    return re.findall(r"[a-zü]+", plain)


def audit() -> tuple[dict[int, Counter], list[str]]:
    rows = source_rows()
    by_id = {row["id"]: row for row in rows}
    problems = []
    catalog = json.loads(HSK4_CATALOG.read_text(encoding="utf-8"))
    if len(catalog) != 601:
        problems.append(f"HSK4 catalog count is {len(catalog)}, expected 601")
    for pair in catalog:
        row = by_id.get(pair["id"])
        if not row or any(row[key] != pair[key] for key in ("chinese", "pinyin")) or row["hsk_level"] != 4:
            problems.append(f"HSK4 identity mismatch: {pair['id']} {pair['chinese']}")
            continue
        row.update(example_zh=pair["example_zh"], example_pinyin=pair["example_pinyin"])
    for level, word_id, chinese, pinyin, example_zh, _ko, example_pinyin in HSK35_EXAMPLES:
        row = by_id.get(word_id)
        if not row or any(row[key] != expected for key, expected in (
            ("hsk_level", level), ("chinese", chinese), ("pinyin", pinyin)
        )):
            problems.append(f"HSK3/5 identity mismatch: {word_id} {chinese}")
            continue
        row.update(example_zh=example_zh, example_pinyin=example_pinyin)

    counts: dict[int, Counter] = {level: Counter() for level in range(1, 7)}
    for row in rows:
        level = row["hsk_level"]
        count = counts[level]
        count["words"] += 1
        zh, pinyin = row["example_zh"], row["example_pinyin"]
        if not zh:
            count["no_example"] += 1
            if pinyin:
                problems.append(f"HSK{level} {row['id']} has pinyin without example")
            continue
        count["examples"] += 1
        if row["chinese"] not in zh:
            count["target_absent"] += 1
        if not pinyin:
            count["no_pinyin"] += 1
            continue
        count["pairs"] += 1
        expected = syllables(" ".join(lazy_pinyin(zh, style=Style.TONE, errors="default")))
        actual = syllables(pinyin)
        if expected != actual and REVIEWED_READINGS.get(row["id"]) != (zh, pinyin):
            problems.append(f"HSK{level} {row['id']} {row['chinese']}: {zh} / {pinyin}")
            count["syllable_mismatch"] += 1
        else:
            count["syllable_match"] += 1
            # The sole reviewed tone exception is 厉害: 得 is the neutral
            # complement, 厉害 may have a neutral second syllable, and 一样
            # has tone sandhi. pypinyin does not infer all three in context.
            library_tones = re.findall(r"[^\W\d_]+", " ".join(lazy_pinyin(zh, style=Style.TONE)).lower())
            source_tones = re.findall(r"[^\W\d_]+", pinyin.lower())
            if library_tones != source_tones:
                count["tone_differences"] += 1
                if row["id"] not in REVIEWED_TONE_DIFFERENCES:
                    problems.append(f"HSK{level} {row['id']} unexpected tone difference: {zh} / {pinyin}")
    return counts, problems


def main() -> int:
    counts, problems = audit()
    for level, count in counts.items():
        print(f"HSK{level}: {count['words']} words, {count['examples']} examples, "
              f"{count['pairs']} pinyin pairs, {count['syllable_mismatch']} mismatches, "
              f"{count['no_pinyin']} examples without pinyin, {count['target_absent']} targets absent")
    for problem in problems:
        print("ERROR:", problem)
    return 1 if problems else 0


if __name__ == "__main__":
    raise SystemExit(main())
