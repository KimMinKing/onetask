"""Read-only report of vocabulary images that cannot be verified against the word data."""

import os
from collections import Counter

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from models import Word
from word_images import verified_image


def main():
    load_dotenv()
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        raise SystemExit("DATABASE_URL is required")
    engine = create_engine(database_url)
    counts = Counter()
    examples = []
    with Session(engine) as db:
        for word in db.query(Word).filter(Word.hsk_level.in_((3, 4, 5, 6))).yield_per(500):
            valid = verified_image(word)[0] is not None
            counts[(word.hsk_level, "verified" if valid else "hidden")] += 1
            if not valid and len(examples) < 20:
                examples.append((word.id, word.hsk_level, word.chinese))
    for level in (3, 4, 5, 6):
        print(f"HSK{level}: verified={counts[level, 'verified']} hidden={counts[level, 'hidden']}")
    print("First hidden entries:", examples)


if __name__ == "__main__":
    main()
