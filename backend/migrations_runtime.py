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

    if not statements:
        return

    with engine.begin() as conn:
        for statement in statements:
            conn.execute(text(statement))
