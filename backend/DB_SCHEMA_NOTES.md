# Database Schema Notes

## Existing backend/database stack

The backend currently uses:

- FastAPI for API routing
- Pydantic for request/response schemas
- a lightweight JSON file store via `backend/services/storage_service.py`

There was no existing PostgreSQL, ORM, or migration framework in the project.

## What was added

- PostgreSQL + pgvector configuration in `backend/config.py`
- SQLAlchemy database base/session in `backend/db/`
- normalized ORM models for users, topics, materials, tags, chunks, feedback, and progress
- SQL-first migrations in `backend/migrations/`
- sample seed SQL and example queries

## Adoption assumption

The JSON-backed runtime services remain in place for now.  
This database layer is designed so the project can migrate incrementally:

1. provision PostgreSQL + pgvector
2. run the SQL migration
3. move runtime services from `JsonStore` to SQLAlchemy/Postgres as needed
