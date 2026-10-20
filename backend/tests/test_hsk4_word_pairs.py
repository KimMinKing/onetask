import json
from pathlib import Path

from sqlalchemy import create_engine, text

from word_pair_migration import CATALOG, HSK35_EXAMPLES, apply_hsk4_word_pairs, apply_hsk35_examples
from hsk4_pair_audit import audit_hsk4_pairs


def test_hsk4_catalog_and_idempotent_migration():
    pairs = json.loads(Path(CATALOG).read_text(encoding="utf-8"))
    assert len(pairs) == 601
    assert len({pair["id"] for pair in pairs}) == len(pairs)
    assert all(pair["chinese"] in pair["example_zh"] for pair in pairs)
    assert all(pair["meaning"] and pair["example_ko"] and pair["example_pinyin"] for pair in pairs)
    lihai = next(pair for pair in pairs if pair["chinese"] == "厉害")
    assert lihai["meaning"] == "대단하다, 굉장하다"
    assert "说得太厉害了" in lihai["example_zh"]
    assert "shuō de tài lì hai le" in lihai["example_pinyin"]

    engine = create_engine("sqlite://")
    with engine.begin() as connection:
        connection.execute(text("""
            CREATE TABLE words (
                id INTEGER PRIMARY KEY, chinese TEXT NOT NULL, pinyin TEXT NOT NULL,
                hsk_level INTEGER, meaning TEXT, example_zh TEXT,
                example_ko TEXT, example_pinyin TEXT
            )
        """))
        connection.execute(text("CREATE TABLE migration_markers (name TEXT PRIMARY KEY)"))
        connection.execute(text("INSERT INTO migration_markers (name) VALUES ('hsk4_word_pairs_v1')"))
        connection.execute(text("""
            INSERT INTO words (id, chinese, pinyin, hsk_level, meaning)
            VALUES (:id, :chinese, :pinyin, 4, 'wrong')
        """), pairs)
    before = audit_hsk4_pairs(engine)
    assert not before.marker_present
    assert len(before.content_mismatches) == 601
    assert apply_hsk4_word_pairs(engine) == 601
    assert apply_hsk4_word_pairs(engine) == 0
    after = audit_hsk4_pairs(engine)
    assert after.marker_present
    assert not after.missing_ids and not after.identity_mismatches and not after.content_mismatches
    with engine.connect() as connection:
        actual = connection.execute(text(
            "SELECT meaning, example_zh, example_ko, example_pinyin FROM words WHERE id=:id"
        ), {"id": lihai["id"]}).one()
    assert tuple(actual) == tuple(lihai[key] for key in (
        "meaning", "example_zh", "example_ko", "example_pinyin"
    ))
    with engine.begin() as connection:
        connection.execute(text("UPDATE words SET example_pinyin = 'wrong' WHERE id = :id"), {"id": lihai["id"]})
    drift = audit_hsk4_pairs(engine)
    assert drift.marker_present
    assert drift.content_mismatches == [(lihai["id"], "厉害", ("example_pinyin",))]


def test_hsk35_replacements_name_the_taught_word_and_apply_once():
    assert len(HSK35_EXAMPLES) == 10
    assert all(word in example for _, _, word, _, example, _, _ in HSK35_EXAMPLES)
    engine = create_engine("sqlite://")
    with engine.begin() as connection:
        connection.execute(text("""
            CREATE TABLE words (
                id INTEGER PRIMARY KEY, chinese TEXT NOT NULL, pinyin TEXT NOT NULL,
                hsk_level INTEGER, example_zh TEXT, example_ko TEXT, example_pinyin TEXT
            )
        """))
        connection.execute(text("CREATE TABLE migration_markers (name TEXT PRIMARY KEY)"))
        connection.execute(text("""
            INSERT INTO words (hsk_level, id, chinese, pinyin, example_zh)
            VALUES (:hsk_level, :id, :chinese, :pinyin, 'old')
        """), [dict(hsk_level=level, id=word_id, chinese=word, pinyin=pinyin)
               for level, word_id, word, pinyin, _, _, _ in HSK35_EXAMPLES])
    assert apply_hsk35_examples(engine) == 10
    assert apply_hsk35_examples(engine) == 0
    with engine.connect() as connection:
        example = connection.execute(text("SELECT example_zh FROM words WHERE id=22")).scalar_one()
    assert "帮忙" in example
