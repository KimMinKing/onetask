"""Run database setup before starting the API process."""

from sqlalchemy import text

from database import Base, engine
import models  # noqa: F401 - registers metadata before create_all
from migrations_runtime import ensure_runtime_migrations
from word_pair_migration import apply_hsk4_word_pairs, apply_hsk35_examples


def migrate() -> None:
    if engine.dialect.name != "postgresql":
        Base.metadata.create_all(bind=engine)
        ensure_runtime_migrations(engine)
        apply_hsk4_word_pairs(engine)
        apply_hsk35_examples(engine)
        return

    # A session-level lock covers both create_all and the legacy DDL. Keeping
    # this connection open serializes simultaneous container starts.
    with engine.connect() as lock_connection:
        lock_connection.execute(text("SELECT pg_advisory_lock(71005)"))
        lock_connection.commit()
        try:
            Base.metadata.create_all(bind=engine)
            ensure_runtime_migrations(engine)
            apply_hsk4_word_pairs(engine)
            apply_hsk35_examples(engine)
        finally:
            lock_connection.execute(text("SELECT pg_advisory_unlock(71005)"))
            lock_connection.commit()


if __name__ == "__main__":
    migrate()
    print("database migration complete")
