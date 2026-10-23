"""Read-only audit of the English learning catalog after migration."""

import json
from sqlalchemy import inspect, text

from english_beginner_words import A2_EXAMPLES, A2_WORDS, BEGINNER_WORDS, REVIEWED_WORDS


def audit_english_words(engine) -> dict:
    if not inspect(engine).has_table("english_words"):
        return {"error": "english_words table is missing"}
    with engine.connect() as connection:
        rows = connection.execute(text(
            "SELECT word, meaning, example_en, example_ko FROM english_words"
        )).all()
    by_word = {word.lower(): (meaning, example_en, example_ko) for word, meaning, example_en, example_ko in rows}
    expected = {
        **BEGINNER_WORDS,
        **{word: (meaning, *(A2_EXAMPLES.get(word) or (None, None))) for word, meaning in A2_WORDS.items()},
    }
    missing = sorted(REVIEWED_WORDS - by_word.keys())
    mismatched = sorted(word for word in REVIEWED_WORDS & by_word.keys() if by_word[word] != expected[word])
    unreviewed = sorted(by_word.keys() - REVIEWED_WORDS)
    return {
        "database_words": len(rows),
        "reviewed_catalog": len(REVIEWED_WORDS),
        "reviewed_in_database": len(REVIEWED_WORDS) - len(missing),
        "missing_reviewed": missing[:20],
        "missing_reviewed_count": len(missing),
        "content_mismatch": mismatched[:20],
        "content_mismatch_count": len(mismatched),
        "excluded_unreviewed_count": len(unreviewed),
        "excluded_unreviewed_examples": unreviewed[:10],
    }


if __name__ == "__main__":
    from database import engine

    result = audit_english_words(engine)
    print(json.dumps(result, ensure_ascii=False, indent=2))
    if result.get("error") or result.get("content_mismatch_count") or result.get("missing_reviewed_count"):
        raise SystemExit(1)
