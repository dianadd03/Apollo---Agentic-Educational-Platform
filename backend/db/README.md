# Database Layer

This project currently uses FastAPI + Pydantic with a JSON store for active runtime flows.  
This folder adds the PostgreSQL + pgvector database layer for the long-term educational data model.

## Current project fit

- Existing runtime persistence: `backend/data/store.json`
- New relational layer: SQL-first PostgreSQL schema with matching SQLAlchemy models
- Migration style chosen for this repo: plain SQL files under `backend/migrations/`

This keeps the database layer easy to review and easy to adopt incrementally without forcing an Alembic setup immediately.

## Main entities

- `users`: learners and accounts
- `teacher_admin_profiles`: teacher/admin extension table for staff-specific metadata
- `topics`: canonical topic catalog
- `user_topics`: per-user topic library entries with level chosen per topic
- `user_topic_progress`: optional progress tracking per saved topic
- `materials`: curated/internal/external learning materials
- `material_tags`: normalized `<category, relevance>` tag pairs
- `material_chunks`: RAG chunk storage with embeddings for pgvector retrieval
- `material_feedback`: ratings, saves, usefulness, recommendation, comments

## Why tags are normalized

Tags are stored in `material_tags` instead of a string array so the backend can:

- query by tag category
- sort by relevance
- join tags with ratings and trust filters
- extend later with taxonomies and moderation

## RAG notes

- `material_chunks.embedding` uses pgvector `vector(<dimensions>)`
- HNSW index is included for cosine-distance search
- `chunk_index` is unique per material to preserve order and deterministic chunk replacement

## Migration order

1. Run `backend/migrations/001_initial_postgres_pgvector.sql`
2. Optionally run `backend/migrations/seed/001_sample_seed.sql`

## Assumptions

- A user may also have a staff profile if they are a teacher or admin
- A topic is canonical and reusable across multiple users
- `user_topics` is the many-to-many join that stores per-user level and notes
- Materials can exist without a linked topic yet, because ingestion may precede categorization
- Internal curated and external internet materials share one table, differentiated by `source_type`, `trust_level`, and `trust_score`
