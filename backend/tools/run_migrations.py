"""Apply all SQL migrations against APOLLO_DATABASE_URL.

Usage:
    python -m backend.tools.run_migrations

Reads .sql files from backend/migrations/ in alphabetical order and runs them
through SQLAlchemy. Idempotent because each migration uses IF NOT EXISTS.
"""

from __future__ import annotations

import sys
from pathlib import Path

from sqlalchemy import create_engine, text

from backend.config import get_settings


def main() -> int:
    settings = get_settings()
    engine = create_engine(settings.database_url)

    migrations_dir = Path(__file__).resolve().parent.parent / "migrations"
    files = sorted(p for p in migrations_dir.glob("*.sql") if p.name[:3].isdigit())

    if not files:
        print("No migration files found in", migrations_dir)
        return 1

    print(f"Connecting to: {settings.database_url}")
    with engine.begin() as conn:
        # Ensure pgvector extension is available before running anything that uses Vector type.
        try:
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS pgcrypto"))
        except Exception as exc:
            print(f"Warning: could not ensure extensions: {exc}")

        for path in files:
            print(f"Running {path.name}...")
            sql = path.read_text(encoding="utf-8")
            conn.execute(text(sql))
            print(f"  OK")

    print("All migrations applied.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
