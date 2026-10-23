import re
from pathlib import Path

from sqlalchemy import create_engine, text

from english_beginner_words import (
    A2_EXAMPLES, A2_WORDS, BEGINNER_WORDS, MARKER, REVIEWED_WORDS, REVIEW_MARKER,
    apply_english_beginner_words, apply_english_reviewed_words,
)
from english_word_audit import audit_english_words


def test_beginner_meanings_are_contextual_and_migration_is_idempotent():
    assert len(BEGINNER_WORDS) == 46
    legacy_sql = (Path(__file__).resolve().parents[2] / "fix_english_production.sql").read_text(encoding="utf-8")
    legacy_a1 = set(re.findall(r"WHERE word='([^']+)' AND level='A1'", legacy_sql))
    assert set(BEGINNER_WORDS) == legacy_a1
    assert "소개" not in BEGINNER_WORDS["about"][0]
    assert "대해" in BEGINNER_WORDS["about"][0]
    assert "약" in BEGINNER_WORDS["about"][0]
    assert all(all(value for value in entry) for entry in BEGINNER_WORDS.values())

    engine = create_engine("sqlite://")
    with engine.begin() as connection:
        connection.execute(text("""
            CREATE TABLE english_words (
                id INTEGER PRIMARY KEY, word TEXT UNIQUE, meaning TEXT,
                level TEXT, example_en TEXT, example_ko TEXT,
                meaning_zh TEXT, example_zh TEXT
            )
        """))
        connection.execute(text("CREATE TABLE migration_markers (name TEXT PRIMARY KEY)"))
        connection.execute(text("""
            INSERT INTO english_words (word, meaning, level, example_en, example_ko)
            VALUES (:word, 'wrong', 'A1', 'old', 'old')
        """), [{"word": word} for word in BEGINNER_WORDS])

    assert apply_english_beginner_words(engine) == 46
    assert apply_english_beginner_words(engine) == 0
    with engine.connect() as connection:
        about = connection.execute(text("""
            SELECT meaning, example_en, example_ko FROM english_words WHERE word='about'
        """)).one()
        assert tuple(about) == BEGINNER_WORDS["about"]
        assert connection.execute(text("SELECT name FROM migration_markers")).scalar_one() == MARKER
        assert connection.execute(text(
            "SELECT count(*) FROM english_words WHERE meaning='wrong' OR example_en='old'"
        )).scalar_one() == 0


def test_beginner_migration_waits_for_words_table():
    engine = create_engine("sqlite://")
    assert apply_english_beginner_words(engine) == 0
    assert apply_english_reviewed_words(engine) == 0


def test_a1_a2_review_covers_every_legacy_beginner_and_repairs_drift():
    sql = (Path(__file__).resolve().parents[2] / "fix_english_production.sql").read_text(encoding="utf-8")
    legacy_rows = re.findall(r"WHERE word='([^']+)' AND level='([A-C][12])'", sql)
    assert len(legacy_rows) == 15_868
    assert len(legacy_rows) - len(REVIEWED_WORDS) == 15_100
    assert len(BEGINNER_WORDS) == 46
    assert len(A2_WORDS) == 722
    assert len(REVIEWED_WORDS) == 768
    assert set(A2_WORDS) == set(re.findall(r"WHERE word='([^']+)' AND level='A2'", sql))
    assert all(meaning.strip() and "\t" not in meaning for meaning in A2_WORDS.values())
    assert A2_WORDS["bank"] == "은행; 강둑"
    assert A2_WORDS["waiting"].startswith("기다리는 중")
    assert set(A2_EXAMPLES) <= set(A2_WORDS)
    assert all(word in sentence.lower() and translation for word, (sentence, translation) in A2_EXAMPLES.items())

    engine = create_engine("sqlite://")
    with engine.begin() as connection:
        connection.execute(text("""
            CREATE TABLE english_words (
                id INTEGER PRIMARY KEY, word TEXT UNIQUE, meaning TEXT,
                level TEXT, example_en TEXT, example_ko TEXT,
                meaning_zh TEXT, example_zh TEXT
            )
        """))
        connection.execute(text("CREATE TABLE migration_markers (name TEXT PRIMARY KEY)"))
        connection.execute(text("INSERT INTO migration_markers VALUES (:name)"), {"name": MARKER})
        connection.execute(text("""
            INSERT INTO english_words (word, meaning, level, example_en, example_ko, meaning_zh, example_zh)
            VALUES (:word, 'wrong', :level, 'mismatched sentence', 'mismatched translation', 'stale', 'stale')
        """), [{"word": word, "level": "A1" if word in BEGINNER_WORDS else "A2"}
               for word in REVIEWED_WORDS])
    assert apply_english_reviewed_words(engine) == 768
    assert apply_english_reviewed_words(engine) == 0
    audit = audit_english_words(engine)
    assert audit["database_words"] == 768
    assert audit["content_mismatch_count"] == 0
    assert audit["excluded_unreviewed_count"] == 0
    with engine.connect() as connection:
        way = connection.execute(text(
            "SELECT meaning, example_en, example_ko FROM english_words WHERE word='way'"
        )).one()
        bank = connection.execute(text(
            "SELECT meaning, example_en, example_ko FROM english_words WHERE word='bank'"
        )).one()
        assert tuple(way) == BEGINNER_WORDS["way"]
        assert tuple(bank) == ("은행; 강둑", *A2_EXAMPLES["bank"])
        assert connection.execute(text(
            "SELECT count(*) FROM english_words WHERE meaning_zh IS NOT NULL OR example_zh IS NOT NULL"
        )).scalar_one() == 0
        assert connection.execute(text(
            "SELECT count(*) FROM migration_markers WHERE name=:name"
        ), {"name": REVIEW_MARKER}).scalar_one() == 1
    with engine.begin() as connection:
        connection.execute(text("UPDATE english_words SET meaning='웨이팅' WHERE word='way'"))
    assert audit_english_words(engine)["content_mismatch"] == ["way"]
    assert apply_english_reviewed_words(engine) == 1
