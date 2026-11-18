"""Check every Chinese example/pinyin pair in the tracked source data.

Run from the repository root after installing pypinyin locally:
    python backend/audit_chinese_source_pairs.py

The HSK1-6 catalogs are applied in memory.
This checks source material, not a remote production database.
"""

import json
import re
import unicodedata
from collections import Counter
from pathlib import Path

from pypinyin import Style, lazy_pinyin

from chinese_pronunciation_overrides import (REVIEWED_IDS, WORD_SOURCE_PINYIN,
                                             correct_pinyin, correct_target_reading)
from word_pair_migration import HSK35_CATALOG, HSK126_CATALOG
from build_hsk126_pair_catalog import build_catalog as build_hsk126_catalog


ROOT = Path(__file__).resolve().parent.parent
DUMP = ROOT / "onetask_dump.sql"
HSK4_CATALOG = Path(__file__).resolve().parent / "data/hsk4_word_pairs.json"
# Exact reviewed exceptions to generic character pronunciation. This includes
# neutral particles, tone sandhi, erhua, and polyphonic words in context.
REVIEWED_SENTENCES = {
    22: ("你能帮忙搬一下桌子吗？", "nǐ néng bāng máng bān yí xià zhuō zi ma？"),
    60: ("他慢慢地走进了教室。", "tā màn màn de zǒu jìn le jiào shì。"),
    151: ("他一开口，大家就笑了。", "tā yì kāi kǒu，dà jiā jiù xiào le。"),
    268: ("你先等一会儿，我马上好。", "nǐ xiān děng yí huìr，wǒ mǎ shàng hǎo。"),
    381: ("肚子疼得厉害，得去看大夫。", "dù zi téng de lì hai，děi qù kàn dài fu。"),
    584: ("他中文说得太厉害了，跟母语者一样流利。", "tā zhōng wén shuō de tài lì hai le，gēn mǔ yǔ zhě yí yàng liú lì。"),
    972: ("孩子发高烧，把父母急得不得了。", "hái zi fā gāo shāo，bǎ fù mǔ jí de bù dé liǎo。"),
    1222: ("他每天干活儿很卖力，老板非常欣赏他。", "tā měi tiān gàn huór hěn mài lì，lǎo bǎn fēi cháng xīn shǎng tā。"),
    1364: ("他出门前系领带。", "tā chū mén qián jì lǐng dài。"),
}


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


def aligned_syllables(sentence: str, pinyin: str, *, tones: bool = False) -> list[str] | None:
    """Align pinyin with Hanzi and embedded Latin words; split merged erhua."""
    units = re.findall(r"[\u4e00-\u9fff]|[A-Za-z]+", sentence)
    tokens = re.findall(r"[^\W\d_]+", pinyin.lower()) if tones else syllables(pinyin)
    aligned = []
    i = j = 0
    while i < len(units) and j < len(tokens):
        token = tokens[j]
        if i + 1 < len(units) and units[i + 1] == "儿" and token.endswith("r") and token not in ("er", "r"):
            aligned.extend((token[:-1], "r"))
            i += 2
        else:
            aligned.append(token)
            i += 1
        j += 1
    return aligned if i == len(units) and j == len(tokens) else None


def audit() -> tuple[dict[int, Counter], list[str]]:
    rows = source_rows()
    by_id = {row["id"]: row for row in rows}
    problems = []
    catalog = json.loads(HSK4_CATALOG.read_text(encoding="utf-8"))
    if len(catalog) != 601:
        problems.append(f"HSK4 catalog count is {len(catalog)}, expected 601")
    for pair in catalog:
        row = by_id.get(pair["id"])
        if not row or row["chinese"] != pair["chinese"] or row["hsk_level"] != 4 or row["pinyin"] != WORD_SOURCE_PINYIN.get(pair["id"], pair["pinyin"]):
            problems.append(f"HSK4 identity mismatch: {pair['id']} {pair['chinese']}")
            continue
        row.update(pinyin=pair["pinyin"], example_zh=pair["example_zh"], example_pinyin=pair["example_pinyin"])
    for pair in json.loads(HSK35_CATALOG.read_text(encoding="utf-8")):
        row = by_id.get(pair["id"])
        if not row or any(row[key] != expected for key, expected in (
            ("hsk_level", pair["hsk_level"]), ("chinese", pair["chinese"]),
            ("pinyin", WORD_SOURCE_PINYIN.get(pair["id"], pair["pinyin"]))
        )):
            problems.append(f"HSK3/5 identity mismatch: {pair['id']} {pair['chinese']}")
            continue
        row.update(pinyin=pair["pinyin"], example_zh=pair["example_zh"], example_pinyin=pair["example_pinyin"])
    hsk126 = json.loads(HSK126_CATALOG.read_text(encoding="utf-8"))
    if len(hsk126) != 2797 or len({pair["id"] for pair in hsk126}) != 2797:
        problems.append("HSK1/2/6 catalog must contain 2,797 unique IDs")
    if hsk126 != build_hsk126_catalog():
        problems.append("HSK1/2/6 catalog differs from source and reviewed pronunciation rules")
    for pair in hsk126:
        row = by_id.get(pair["id"])
        if not row or any(row[key] != expected for key, expected in (
            ("hsk_level", pair["hsk_level"]), ("chinese", pair["chinese"]),
            ("pinyin", pair.get("source_pinyin", pair["pinyin"]))
        )):
            problems.append(f"HSK1/2/6 identity mismatch: {pair['id']} {pair['chinese']}")
            continue
        row.update(pinyin=pair["pinyin"], example_zh=pair["example_zh"],
                   example_pinyin=pair["example_pinyin"])

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
            problems.append(f"HSK{level} {row['id']} target absent: {row['chinese']} / {zh}")
        if not pinyin:
            count["no_pinyin"] += 1
            continue
        count["pairs"] += 1
        if level in (1, 2, 6):
            # These new catalog rows are generated with additional reviewed
            # particle, erhua and tone-sandhi rules in the HSK126 builder.
            library_pinyin = pinyin
        else:
            library_pinyin = " ".join(lazy_pinyin(zh, style=Style.TONE, errors="default"))
            library_pinyin = correct_pinyin(row["id"], zh, library_pinyin)
            library_pinyin = correct_target_reading(row["id"], zh, library_pinyin,
                                                    row["chinese"], row["pinyin"])
        if row["id"] in REVIEWED_IDS:
            count["context_readings_checked"] += 1
        expected = syllables(library_pinyin)
        actual = syllables(pinyin)
        reviewed = REVIEWED_SENTENCES.get(row["id"]) == (zh, pinyin)
        if reviewed:
            count["reviewed_variant"] += 1
        if expected != actual and not reviewed:
            problems.append(f"HSK{level} {row['id']} {row['chinese']}: {zh} / {pinyin}")
            count["syllable_mismatch"] += 1
        else:
            count["syllable_match"] += 1
            library_tones = re.findall(r"[^\W\d_]+", library_pinyin.lower())
            source_tones = re.findall(r"[^\W\d_]+", pinyin.lower())
            if library_tones != source_tones:
                count["tone_differences"] += 1
                if not reviewed:
                    problems.append(f"HSK{level} {row['id']} unexpected tone difference: {zh} / {pinyin}")
        aligned = aligned_syllables(zh, pinyin)
        if aligned is None:
            problems.append(f"HSK{level} {row['id']} character/syllable count differs: {zh} / {pinyin}")
            count["alignment_mismatch"] += 1
            continue
        target = row["chinese"]
        want = "".join(syllables(row["pinyin"])).replace("v", "u")
        starts = [match.start() for match in re.finditer(re.escape(target), zh)]
        readings = []
        for start in starts:
            unit_start = len(re.findall(r"[\u4e00-\u9fff]|[A-Za-z]+", zh[:start]))
            unit_length = len(re.findall(r"[\u4e00-\u9fff]|[A-Za-z]+", target))
            readings.append("".join(aligned[unit_start:unit_start + unit_length]).replace("v", "u").replace("er", "r"))
        if want.replace("er", "r") not in readings:
            problems.append(f"HSK{level} {row['id']} target reading differs: {target} {row['pinyin']} / {readings}")
            count["target_reading_mismatch"] += 1
        if level in (1, 2, 6):
            tone_aligned = aligned_syllables(zh, pinyin, tones=True)
            if tone_aligned is None:
                problems.append(f"HSK{level} {row['id']} tone alignment differs")
                continue
            want_tones = "".join(re.findall(r"[^\W\d_]+", row["pinyin"].lower()))
            want_tones = want_tones.replace("v", "ü").replace("er", "r")
            variants = []
            for start in starts:
                unit_start = len(re.findall(r"[\u4e00-\u9fff]|[A-Za-z]+", zh[:start]))
                candidate = tone_aligned[unit_start:unit_start + len(target)].copy()
                for i, char in enumerate(target):
                    if char == "一" and candidate[i] in ("yī", "yí", "yì"):
                        candidate[i] = "yī"
                    elif char == "不" and candidate[i] in ("bù", "bú"):
                        candidate[i] = "bù"
                variants.append("".join(candidate).replace("v", "ü").replace("er", "r"))
            normalized_want = want_tones
            if target.startswith("一"):
                normalized_want = re.sub(r"^y[īíì]", "yī", normalized_want)
            if target.startswith("不"):
                normalized_want = re.sub(r"^b[ùú]", "bù", normalized_want)
            if normalized_want not in variants:
                problems.append(f"HSK{level} {row['id']} target tones differ: {target} {row['pinyin']} / {variants}")
                count["target_tone_mismatch"] += 1
        if level in (3, 4, 5) and row["id"] not in {266, 268, 273, 275, 967, 969, 2029, 2031}:
            tone_aligned = aligned_syllables(zh, pinyin, tones=True)
            if tone_aligned is None:
                problems.append(f"HSK{level} {row['id']} tone alignment differs")
                continue
            want_tones = "".join(re.findall(r"[^\W\d_]+", row["pinyin"].lower()))
            want_tones = want_tones.replace("er", "r").replace("v", "ü")
            tone_readings = []
            for start in starts:
                unit_start = len(re.findall(r"[\u4e00-\u9fff]|[A-Za-z]+", zh[:start]))
                unit_length = len(re.findall(r"[\u4e00-\u9fff]|[A-Za-z]+", target))
                tone_readings.append("".join(tone_aligned[unit_start:unit_start + unit_length]).replace("v", "ü"))
            if want_tones not in tone_readings:
                problems.append(f"HSK{level} {row['id']} target tones differ: {target} {row['pinyin']} / {tone_readings}")
                count["target_tone_mismatch"] += 1
    return counts, problems


def main() -> int:
    counts, problems = audit()
    for level, count in counts.items():
        print(f"HSK{level}: {count['words']} words, {count['examples']} examples, "
              f"{count['pairs']} pinyin pairs, {count['syllable_mismatch']} sentence mismatches, "
              f"{count['target_reading_mismatch']} target-reading mismatches, "
              f"{count['target_tone_mismatch']} target-tone mismatches, "
              f"{count['alignment_mismatch']} alignment mismatches, "
              f"{count['no_pinyin']} examples without pinyin, {count['target_absent']} targets absent")
    for problem in problems:
        print("ERROR:", problem)
    return 1 if problems else 0


if __name__ == "__main__":
    raise SystemExit(main())
