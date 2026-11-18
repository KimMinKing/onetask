"""Build exact HSK3/5 word/example/pinyin pairs from the tracked SQL dump.

Reviewed replacements supersede examples where the taught word was absent or
used with another reading. Run from the repository root:
python backend/build_hsk35_pair_catalog.py
"""

import json
from pathlib import Path

from word_pair_migration import HSK35_EXAMPLES, HSK35_PINYIN_CORRECTIONS
from chinese_pronunciation_overrides import WORD_PINYIN_CORRECTIONS, correct_pinyin, correct_target_reading


ROOT = Path(__file__).resolve().parent.parent
OUTPUT = Path(__file__).resolve().parent / "data/hsk35_word_pairs.json"


def build_catalog() -> list[dict]:
    lines = (ROOT / "onetask_dump.sql").read_text(encoding="utf-8").splitlines()
    start = next(i for i, line in enumerate(lines) if line.startswith("COPY public.words (")) + 1
    pairs = {}
    for line in lines[start:]:
        if line == r"\.":
            break
        fields = line.split("\t")
        if fields[8] not in ("3", "5"):
            continue
        pairs[int(fields[0])] = {
            "id": int(fields[0]), "hsk_level": int(fields[8]),
            "chinese": fields[1], "pinyin": fields[2],
            "example_zh": fields[4], "example_ko": fields[5],
            "example_pinyin": fields[9],
        }
    if len(pairs) != 1599:
        raise ValueError(f"Expected 1599 HSK3/5 rows; got {len(pairs)}")
    for level, word_id, chinese, pinyin, example_zh, example_ko, example_pinyin in HSK35_EXAMPLES:
        row = pairs[word_id]
        if (row["hsk_level"], row["chinese"], row["pinyin"]) != (level, chinese, pinyin):
            raise ValueError(f"Identity changed: {word_id} {chinese}")
        row.update(example_zh=example_zh, example_ko=example_ko,
                   example_pinyin=example_pinyin)
    for word_id, (example_zh, example_pinyin) in HSK35_PINYIN_CORRECTIONS.items():
        row = pairs[word_id]
        if row["example_zh"] != example_zh:
            raise ValueError(f"Pinyin correction sentence changed: {word_id}")
        row["example_pinyin"] = example_pinyin
    for row in pairs.values():
        lexical = WORD_PINYIN_CORRECTIONS.get(row["id"])
        if lexical:
            if row["chinese"] != lexical[0]:
                raise ValueError(f"Word-pinyin correction identity changed: {row['id']}")
            row["pinyin"] = lexical[1]
        row["example_pinyin"] = correct_pinyin(row["id"], row["example_zh"], row["example_pinyin"])
        row["example_pinyin"] = correct_target_reading(row["id"], row["example_zh"],
                                                       row["example_pinyin"], row["chinese"], row["pinyin"])
    if any(row["chinese"] not in row["example_zh"] for row in pairs.values()):
        raise ValueError("An HSK3/5 example does not include the taught word")
    return [pairs[word_id] for word_id in sorted(pairs)]


if __name__ == "__main__":
    OUTPUT.write_text(json.dumps(build_catalog(), ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"wrote 1599 HSK3/5 word/example/pinyin pairs to {OUTPUT}")
