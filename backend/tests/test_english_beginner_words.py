import re
from pathlib import Path

from sqlalchemy import create_engine, text

from english_beginner_words import BEGINNER_WORDS, MARKER, apply_english_beginner_words


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
                level TEXT, example_en TEXT, example_ko TEXT
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
