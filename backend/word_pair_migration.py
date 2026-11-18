"""Reconcile tracked Chinese examples and reviewed lexical readings by word ID."""

import json
import logging
from pathlib import Path

from sqlalchemy import inspect, text
from chinese_pronunciation_overrides import WORD_PINYIN_CORRECTIONS, WORD_SOURCE_PINYIN


CATALOG = Path(__file__).resolve().parent / "data" / "hsk4_word_pairs.json"
HSK35_CATALOG = Path(__file__).resolve().parent / "data" / "hsk35_word_pairs.json"
HSK126_CATALOG = Path(__file__).resolve().parent / "data" / "hsk126_word_pairs.json"
HSK126_REVIEWED_MEANING_IDS = {2710, 3900}
HSK126_REVIEWED_EXAMPLE_IDS = {
    2523, 2575, 2710, 2812, 2846, 3239, 3247, 3382, 3435,
    3892, 3900, 4175, 4284, 4741, 4773, 4861, 4868, 4944,
}
# A marker records that a migration ran, not that later SQL or imports left the
# content intact. Compare rows on every startup and repair only actual drift.
MARKER = "hsk4_word_pairs_v2"
logger = logging.getLogger(__name__)

# Reviewed HSK3/5 replacement examples name the taught word explicitly and
# use the same pronunciation as its vocabulary entry.
HSK35_EXAMPLES = [
    (3, 22, "帮忙", "bāng máng", "你能帮忙搬一下桌子吗？", "책상 옮기는 것 좀 도와줄 수 있어?", "nǐ néng bāng máng bān yí xià zhuō zi ma？"),
    (3, 151, "口", "kǒu", "他一开口，大家就笑了。", "그가 입을 열자 모두 웃었어.", "tā yì kāi kǒu，dà jiā jiù xiào le。"),
    (3, 180, "年级", "nián jí", "他是三年级的学生。", "그는 3학년 학생이야.", "tā shì sān nián jí de xué shēng。"),
    (5, 1085, "打交道", "dǎ jiāo dào", "我常和不同国家的人打交道。", "나는 자주 다른 나라 사람들과 교류해.", "wǒ cháng hé bù tóng guó jiā de rén dǎ jiāo dào。"),
    (5, 1276, "管子", "guǎn zi", "这根管子漏水了。", "이 관에서 물이 새고 있어.", "zhè gēn guǎn zi lòu shuǐ le。"),
    (5, 1364, "系领带", "jì lǐng dài", "他出门前系领带。", "그는 외출 전에 넥타이를 매.", "tā chū mén qián jì lǐng dài。"),
    (5, 1378, "驾驶", "jià shǐ", "她会驾驶汽车。", "그녀는 자동차를 운전할 수 있어.", "tā huì jià shǐ qì chē。"),
    (5, 1545, "录音", "lù yīn", "请给这段话录音。", "이 말을 녹음해 주세요.", "qǐng gěi zhè duàn huà lù yīn。"),
    (5, 1657, "汽油", "qì yóu", "这辆车需要汽油。", "이 차에는 휘발유가 필요해.", "zhè liàng chē xū yào qì yóu。"),
    (5, 1733, "删除", "shān chú", "请删除这条旧消息。", "이 오래된 메시지를 삭제해 주세요.", "qǐng shān chú zhè tiáo jiù xiāo xī。"),
    (5, 1701, "嚷", "rǎng", "他生气了，对着电话大声嚷，把旁边的人都吓了一跳。", "그가 화가 나서 전화에 대고 소리를 질러서 옆에 있던 사람들을 모두 깜짝 놀라게 했어.", "tā shēng qì le ， duì zhe diàn huà dà shēng rǎng ， bǎ páng biān de rén dōu xià le yī tiào 。"),
]

# Exact sentence and corrected transcription. These words were present in the
# old examples, but their sentence pinyin taught a different reading.
HSK35_PINYIN_CORRECTIONS = {
    60: ("他慢慢地走进了教室。", "tā màn màn de zǒu jìn le jiào shì。"),
    268: ("你先等一会儿，我马上好。", "nǐ xiān děng yí huìr，wǒ mǎ shàng hǎo。"),
    972: ("孩子发高烧，把父母急得不得了。", "hái zi fā gāo shāo，bǎ fù mǔ jí de bù dé liǎo。"),
    1222: ("他每天干活儿很卖力，老板非常欣赏他。", "tā měi tiān gàn huór hěn mài lì，lǎo bǎn fēi cháng xīn shǎng tā。"),
}


def apply_hsk4_word_pairs(engine) -> int:
    inspector = inspect(engine)
    if not inspector.has_table("words") or not inspector.has_table("migration_markers"):
        return 0
    pairs = json.loads(CATALOG.read_text(encoding="utf-8"))
    with engine.begin() as connection:
        marker_present = connection.execute(text(
            "SELECT 1 FROM migration_markers WHERE name=:name"
        ), {"name": MARKER}).first() is not None
        rows = connection.execute(text(
            "SELECT id, chinese, pinyin, hsk_level, meaning, example_zh, example_ko, example_pinyin "
            "FROM words WHERE hsk_level=4"
        )).mappings().all()
        by_id = {row["id"]: dict(row) for row in rows}
        # A partially imported database is not ready for this one-time migration.
        mismatched = [pair["id"] for pair in pairs if
            (row := by_id.get(pair["id"])) is None
            or row["chinese"] != pair["chinese"]
            or row["pinyin"] not in (pair["pinyin"], WORD_SOURCE_PINYIN.get(pair["id"]))
        ]
        if mismatched:
            if rows:
                logger.warning("HSK4 word-pair migration skipped: %s unmatched IDs (first: %s)",
                               len(mismatched), mismatched[:10])
            return 0
        lexical_changes = [pair for pair in pairs if by_id[pair["id"]]["pinyin"] != pair["pinyin"]]
        for pair in lexical_changes:
            old_pinyin = by_id[pair["id"]]["pinyin"]
            connection.execute(text("""
                UPDATE words SET pinyin=:pinyin
                WHERE id=:id AND hsk_level=4 AND chinese=:chinese AND pinyin=:old_pinyin
            """), {**pair, "old_pinyin": old_pinyin})
            by_id[pair["id"]]["pinyin"] = pair["pinyin"]
        changed = [pair for pair in pairs if any(
            by_id[pair["id"]][field] != pair[field]
            for field in ("meaning", "example_zh", "example_ko", "example_pinyin")
        )]
        if changed:
            connection.execute(text("""
                UPDATE words
                SET meaning=:meaning, example_zh=:example_zh,
                    example_ko=:example_ko, example_pinyin=:example_pinyin
                WHERE id=:id AND hsk_level=4 AND chinese=:chinese AND pinyin=:pinyin
            """), changed)
            logger.warning("Reconciled %s HSK4 word/example/pinyin rows", len(changed))
        if not marker_present:
            connection.execute(text("INSERT INTO migration_markers (name) VALUES (:name)"), {"name": MARKER})
    return len({pair["id"] for pair in changed + lexical_changes})


def apply_hsk35_examples(engine) -> int:
    inspector = inspect(engine)
    if not inspector.has_table("words") or not inspector.has_table("migration_markers"):
        return 0
    marker = "hsk35_target_examples_v1"
    pairs = json.loads(HSK35_CATALOG.read_text(encoding="utf-8"))
    with engine.begin() as connection:
        marker_present = connection.execute(text(
            "SELECT 1 FROM migration_markers WHERE name=:name"
        ), {"name": marker}).first() is not None
        rows = connection.execute(text(
            "SELECT id, chinese, pinyin, hsk_level, example_zh, example_ko, example_pinyin "
            "FROM words WHERE hsk_level IN (3, 5)"
        )).mappings().all()
        by_id = {row["id"]: dict(row) for row in rows}
        mismatched = [pair["id"] for pair in pairs
                      if (row := by_id.get(pair["id"])) is None or
                      row["chinese"] != pair["chinese"] or row["hsk_level"] != pair["hsk_level"] or
                      row["pinyin"] not in (pair["pinyin"], WORD_SOURCE_PINYIN.get(pair["id"]))]
        if mismatched:
            if rows:
                logger.warning("HSK3/5 example migration skipped: %s unmatched IDs (first: %s)",
                               len(mismatched), mismatched[:10])
            return 0
        lexical_changes = [pair for pair in pairs if by_id[pair["id"]]["pinyin"] != pair["pinyin"]]
        for pair in lexical_changes:
            old_pinyin = by_id[pair["id"]]["pinyin"]
            connection.execute(text("""
                UPDATE words SET pinyin=:pinyin
                WHERE id=:id AND hsk_level=:hsk_level AND chinese=:chinese AND pinyin=:old_pinyin
            """), {**pair, "old_pinyin": old_pinyin})
            by_id[pair["id"]]["pinyin"] = pair["pinyin"]
        sentence_changes = [pair for pair in pairs if
                            by_id[pair["id"]]["example_zh"] != pair["example_zh"]]
        pinyin_changes = [pair for pair in pairs if
                          by_id[pair["id"]]["example_zh"] == pair["example_zh"]
                          and by_id[pair["id"]]["example_pinyin"] != pair["example_pinyin"]]
        manual_ids = {item[1] for item in HSK35_EXAMPLES}
        translation_changes = [pair for pair in pairs if
                               pair["id"] in manual_ids
                               and by_id[pair["id"]]["example_zh"] == pair["example_zh"]
                               and by_id[pair["id"]]["example_ko"] != pair["example_ko"]]
        if sentence_changes:
            connection.execute(text("""
                UPDATE words SET example_zh=:example_zh, example_ko=:example_ko,
                    example_pinyin=:example_pinyin
                WHERE id=:id AND hsk_level=:hsk_level AND chinese=:chinese AND pinyin=:pinyin
            """), sentence_changes)
        if pinyin_changes:
            connection.execute(text("""
                UPDATE words SET example_pinyin=:example_pinyin
                WHERE id=:id AND hsk_level=:hsk_level AND chinese=:chinese AND pinyin=:pinyin
            """), pinyin_changes)
        if translation_changes:
            connection.execute(text("""
                UPDATE words SET example_ko=:example_ko
                WHERE id=:id AND hsk_level=:hsk_level AND chinese=:chinese AND pinyin=:pinyin
            """), translation_changes)
        changed_count = len({pair["id"] for pair in
                             sentence_changes + pinyin_changes + translation_changes + lexical_changes})
        if changed_count:
            logger.warning("Reconciled %s HSK3/5 example/pinyin rows", changed_count)
        if not marker_present:
            connection.execute(text("INSERT INTO migration_markers (name) VALUES (:name)"), {"name": marker})
    return changed_count


def apply_hsk126_word_pairs(engine) -> int:
    """Repair reviewed HSK1/2/6 text and all 2,797 missing transcriptions."""
    inspector = inspect(engine)
    if not inspector.has_table("words") or not inspector.has_table("migration_markers"):
        return 0
    pairs = json.loads(HSK126_CATALOG.read_text(encoding="utf-8"))
    if len(pairs) != 2797 or len({pair["id"] for pair in pairs}) != 2797:
        raise ValueError("HSK1/2/6 catalog must contain 2,797 unique IDs")
    with engine.begin() as connection:
        rows = connection.execute(text("""
            SELECT id, hsk_level, chinese, pinyin, meaning, example_zh,
                   example_ko, example_pinyin
            FROM words WHERE hsk_level IN (1, 2, 6)
        """)).mappings().all()
        by_id = {row["id"]: row for row in rows}
        mismatched = [pair["id"] for pair in pairs if
                      (row := by_id.get(pair["id"])) is None or
                      row["hsk_level"] != pair["hsk_level"] or
                      row["chinese"] != pair["chinese"] or
                      row["pinyin"] not in (pair["pinyin"], pair.get("source_pinyin"))]
        if mismatched:
            if rows:
                logger.warning("HSK1/2/6 migration skipped: %s unmatched IDs (first: %s)",
                               len(mismatched), mismatched[:10])
            return 0
        changed = 0
        for pair in pairs:
            row = by_id[pair["id"]]
            updates = {}
            if row["pinyin"] != pair["pinyin"]:
                updates["pinyin"] = pair["pinyin"]
            if row["example_pinyin"] != pair["example_pinyin"]:
                updates["example_pinyin"] = pair["example_pinyin"]
            if row["example_zh"] != pair["example_zh"]:
                updates["example_zh"] = pair["example_zh"]
                updates["example_ko"] = pair["example_ko"]
            elif (pair["id"] in HSK126_REVIEWED_EXAMPLE_IDS and
                  row["example_ko"] != pair["example_ko"]):
                updates["example_ko"] = pair["example_ko"]
            if pair["id"] in HSK126_REVIEWED_MEANING_IDS and row["meaning"] != pair["meaning"]:
                updates["meaning"] = pair["meaning"]
            if updates:
                assignments = ", ".join(f"{field}=:{field}" for field in updates)
                connection.execute(text(
                    f"UPDATE words SET {assignments} WHERE id=:id AND hsk_level=:hsk_level "
                    "AND chinese=:chinese AND pinyin=:old_pinyin"
                ), {**updates, "id": pair["id"], "hsk_level": pair["hsk_level"],
                    "chinese": pair["chinese"], "old_pinyin": row["pinyin"]})
                changed += 1
        marker = "hsk126_word_pairs_v1"
        if connection.execute(text("SELECT 1 FROM migration_markers WHERE name=:name"),
                              {"name": marker}).first() is None:
            connection.execute(text("INSERT INTO migration_markers (name) VALUES (:name)"),
                               {"name": marker})
    if changed:
        logger.warning("Reconciled %s HSK1/2/6 word/example/pinyin rows", changed)
    return changed
