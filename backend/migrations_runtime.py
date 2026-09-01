from sqlalchemy import inspect, text


def ensure_runtime_migrations(engine) -> None:
    inspector = inspect(engine)
    if not inspector.has_table("user_settings"):
        return

    columns = {column["name"] for column in inspector.get_columns("user_settings")}
    dialect = engine.dialect.name

    statements: list[str] = []

    # Learning progress used to be shared by every account. Preserve existing
    # progress under the first/master account, then enforce per-user cards.
    card_tables = (
        ("word_cards", "words"),
        ("english_word_cards", "english_words"),
        ("japanese_word_cards", "japanese_words"),
    )
    for card_table, word_table in card_tables:
        if not inspector.has_table(card_table):
            continue
        card_columns = {column["name"] for column in inspector.get_columns(card_table)}
        if "user_id" not in card_columns:
            statements.append(f"ALTER TABLE {card_table} ADD COLUMN user_id INTEGER")
        if "is_favorite" not in card_columns:
            default = "FALSE" if dialect == "postgresql" else "0"
            statements.append(
                f"ALTER TABLE {card_table} ADD COLUMN is_favorite BOOLEAN NOT NULL DEFAULT {default}"
            )
        statements.append(f"""
            UPDATE {card_table}
            SET user_id = (
                SELECT id FROM users ORDER BY is_master DESC, id ASC LIMIT 1
            )
            WHERE user_id IS NULL
        """)
        if inspector.has_table(word_table) and "is_favorite" in {
            column["name"] for column in inspector.get_columns(word_table)
        }:
            statements.append(f"""
                UPDATE {card_table}
                SET is_favorite = {"TRUE" if dialect == "postgresql" else "1"}
                WHERE word_id IN (SELECT id FROM {word_table} WHERE is_favorite = {"TRUE" if dialect == "postgresql" else "1"})
            """)
            statements.append(f"""
                INSERT INTO {card_table}
                    (user_id, word_id, state, step, stability, difficulty, due, reps, lapses, is_favorite)
                SELECT
                    (SELECT id FROM users ORDER BY is_master DESC, id ASC LIMIT 1),
                    source.id, 0, 0, 0.0, 0.0, CURRENT_TIMESTAMP, 0, 0,
                    {"TRUE" if dialect == "postgresql" else "1"}
                FROM {word_table} AS source
                WHERE source.is_favorite = {"TRUE" if dialect == "postgresql" else "1"}
                  AND EXISTS (SELECT 1 FROM users)
                  AND NOT EXISTS (
                      SELECT 1 FROM {card_table} AS card WHERE card.word_id = source.id
                  )
            """)

        if dialect == "postgresql":
            statements.append(f"ALTER TABLE {card_table} ALTER COLUMN user_id SET NOT NULL")
            has_user_fk = any(
                foreign_key.get("constrained_columns") == ["user_id"]
                and foreign_key.get("referred_table") == "users"
                for foreign_key in inspector.get_foreign_keys(card_table)
            )
            if not has_user_fk:
                statements.append(
                    f"ALTER TABLE {card_table} ADD CONSTRAINT fk_{card_table}_user_id "
                    "FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE"
                )
            unique_constraints = inspector.get_unique_constraints(card_table)
            has_composite = any(
                set(constraint.get("column_names") or []) == {"user_id", "word_id"}
                for constraint in unique_constraints
            )
            for constraint in unique_constraints:
                if constraint.get("column_names") == ["word_id"] and constraint.get("name"):
                    statements.append(f'ALTER TABLE {card_table} DROP CONSTRAINT "{constraint["name"]}"')
            if not has_composite:
                statements.append(
                    f"ALTER TABLE {card_table} ADD CONSTRAINT uq_{card_table}_user_word UNIQUE (user_id, word_id)"
                )
    if "obsidian_enabled" not in columns:
        if dialect == "postgresql":
            statements.append("ALTER TABLE user_settings ADD COLUMN obsidian_enabled BOOLEAN NOT NULL DEFAULT FALSE")
        else:
            statements.append("ALTER TABLE user_settings ADD COLUMN obsidian_enabled BOOLEAN NOT NULL DEFAULT 0")
    if "obsidian_vault_path" not in columns:
        statements.append("ALTER TABLE user_settings ADD COLUMN obsidian_vault_path VARCHAR")
    if "ui_language" not in columns:
        statements.append("ALTER TABLE user_settings ADD COLUMN ui_language VARCHAR(5) NOT NULL DEFAULT 'ko'")
    if "telegram_enabled" not in columns:
        if dialect == "postgresql":
            statements.append("ALTER TABLE user_settings ADD COLUMN telegram_enabled BOOLEAN NOT NULL DEFAULT FALSE")
        else:
            statements.append("ALTER TABLE user_settings ADD COLUMN telegram_enabled BOOLEAN NOT NULL DEFAULT 0")
    if "telegram_bot_token" not in columns:
        statements.append("ALTER TABLE user_settings ADD COLUMN telegram_bot_token VARCHAR")
    if "telegram_chat_id" not in columns:
        statements.append("ALTER TABLE user_settings ADD COLUMN telegram_chat_id VARCHAR(100)")

    if inspector.has_table("tasks"):
        task_columns = {column["name"] for column in inspector.get_columns("tasks")}
        if "telegram_notified_at" not in task_columns:
            statements.append("ALTER TABLE tasks ADD COLUMN telegram_notified_at TIMESTAMP WITH TIME ZONE" if dialect == "postgresql" else "ALTER TABLE tasks ADD COLUMN telegram_notified_at DATETIME")

    if inspector.has_table("english_words"):
        english_columns = {column["name"] for column in inspector.get_columns("english_words")}
        if "meaning_zh" not in english_columns:
            statements.append("ALTER TABLE english_words ADD COLUMN meaning_zh VARCHAR(500)")
        if "example_zh" not in english_columns:
            statements.append("ALTER TABLE english_words ADD COLUMN example_zh VARCHAR")

    if inspector.has_table("japanese_words"):
        japanese_columns = {column["name"] for column in inspector.get_columns("japanese_words")}
        if "meaning_zh" not in japanese_columns:
            statements.append("ALTER TABLE japanese_words ADD COLUMN meaning_zh VARCHAR(500)")
        if "example_zh" not in japanese_columns:
            statements.append("ALTER TABLE japanese_words ADD COLUMN example_zh VARCHAR")

    if inspector.has_table("calendar_events"):
        calendar_columns = {column["name"] for column in inspector.get_columns("calendar_events")}
        if "user_id" not in calendar_columns:
            statements.append("ALTER TABLE calendar_events ADD COLUMN user_id INTEGER")
            if dialect == "postgresql":
                statements.append("""
                    UPDATE calendar_events
                    SET user_id = (
                        SELECT id FROM users
                        ORDER BY is_master DESC, id ASC
                        LIMIT 1
                    )
                    WHERE user_id IS NULL
                """)
            else:
                statements.append("""
                    UPDATE calendar_events
                    SET user_id = (
                        SELECT id FROM users
                        ORDER BY is_master DESC, id ASC
                        LIMIT 1
                    )
                    WHERE user_id IS NULL
                """)

    if not statements:
        return

    with engine.begin() as conn:
        for statement in statements:
            conn.execute(text(statement))
