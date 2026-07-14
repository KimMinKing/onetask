from sqlalchemy import inspect, text


def ensure_runtime_migrations(engine) -> None:
    inspector = inspect(engine)
    if not inspector.has_table("user_settings"):
        return

    columns = {column["name"] for column in inspector.get_columns("user_settings")}
    dialect = engine.dialect.name

    statements: list[str] = []
    if "obsidian_enabled" not in columns:
        if dialect == "postgresql":
            statements.append("ALTER TABLE user_settings ADD COLUMN obsidian_enabled BOOLEAN NOT NULL DEFAULT FALSE")
        else:
            statements.append("ALTER TABLE user_settings ADD COLUMN obsidian_enabled BOOLEAN NOT NULL DEFAULT 0")
    if "obsidian_vault_path" not in columns:
        statements.append("ALTER TABLE user_settings ADD COLUMN obsidian_vault_path VARCHAR")
    if "ui_language" not in columns:
        statements.append("ALTER TABLE user_settings ADD COLUMN ui_language VARCHAR(5) NOT NULL DEFAULT 'ko'")

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
