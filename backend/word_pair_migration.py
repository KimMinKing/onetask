"""Apply the reviewed HSK4 sentence pairs once, without changing word identities."""

import json
import logging
from pathlib import Path

from sqlalchemy import inspect, text


CATALOG = Path(__file__).resolve().parent / "data" / "hsk4_word_pairs.json"
# V2 re-applies the reviewed catalog once even when a server recorded V1;
# a V1 marker alone does not prove the current rows still match the catalog.
MARKER = "hsk4_word_pairs_v2"
logger = logging.getLogger(__name__)

# These ten legacy HSK3/5 examples used a synonym or sub-word instead of the
# vocabulary item itself. Each replacement names the taught word explicitly.
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
]


def apply_hsk4_word_pairs(engine) -> int:
    inspector = inspect(engine)
    if not inspector.has_table("words") or not inspector.has_table("migration_markers"):
        return 0
    pairs = json.loads(CATALOG.read_text(encoding="utf-8"))
    with engine.begin() as connection:
        if connection.execute(text("SELECT 1 FROM migration_markers WHERE name=:name"), {"name": MARKER}).first():
            return 0
        rows = connection.execute(text(
            "SELECT id, chinese, pinyin, hsk_level FROM words WHERE hsk_level=4"
        )).mappings().all()
        by_id = {row["id"]: row for row in rows}
        # A partially imported database is not ready for this one-time migration.
        mismatched = [pair["id"] for pair in pairs if
            (row := by_id.get(pair["id"])) is None
            or row["chinese"] != pair["chinese"]
            or row["pinyin"] != pair["pinyin"]
        ]
        if mismatched:
            if rows:
                logger.warning("HSK4 word-pair migration skipped: %s unmatched IDs (first: %s)",
                               len(mismatched), mismatched[:10])
            return 0
        connection.execute(text("""
            UPDATE words
            SET meaning=:meaning, example_zh=:example_zh,
                example_ko=:example_ko, example_pinyin=:example_pinyin
            WHERE id=:id AND hsk_level=4 AND chinese=:chinese AND pinyin=:pinyin
        """), pairs)
        connection.execute(text("INSERT INTO migration_markers (name) VALUES (:name)"), {"name": MARKER})
    return len(pairs)


def apply_hsk35_examples(engine) -> int:
    inspector = inspect(engine)
    if not inspector.has_table("words") or not inspector.has_table("migration_markers"):
        return 0
    marker = "hsk35_target_examples_v1"
    pairs = [dict(hsk_level=level, id=word_id, chinese=chinese, pinyin=pinyin,
                  example_zh=example_zh, example_ko=example_ko, example_pinyin=example_pinyin)
             for level, word_id, chinese, pinyin, example_zh, example_ko, example_pinyin in HSK35_EXAMPLES]
    with engine.begin() as connection:
        if connection.execute(text("SELECT 1 FROM migration_markers WHERE name=:name"), {"name": marker}).first():
            return 0
        rows = connection.execute(text(
            "SELECT id, chinese, pinyin, hsk_level FROM words WHERE hsk_level IN (3, 5)"
        )).mappings().all()
        by_id = {row["id"]: row for row in rows}
        mismatched = [pair["id"] for pair in pairs
                      if (row := by_id.get(pair["id"])) is None or
                      any(row[key] != pair[key] for key in ("chinese", "pinyin", "hsk_level"))]
        if mismatched:
            if rows:
                logger.warning("HSK3/5 example migration skipped: unmatched IDs %s", mismatched)
            return 0
        connection.execute(text("""
            UPDATE words SET example_zh=:example_zh, example_ko=:example_ko,
                example_pinyin=:example_pinyin
            WHERE id=:id AND hsk_level=:hsk_level AND chinese=:chinese AND pinyin=:pinyin
        """), pairs)
        connection.execute(text("INSERT INTO migration_markers (name) VALUES (:name)"), {"name": marker})
    return len(pairs)
