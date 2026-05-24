# Apollo — Agentic Educational Platform

Educational platform where students and professors **search for a technical topic** (e.g. "Dynamic Programming", "Graphs", "Backtracking") through a **search bar**, and an **agentic AI Orchestrator** generates:

1. **Clean learning path** (validated materials)
2. **Practice problems** (Codeforces, LeetCode, AtCoder)
3. **Foundational tasks** (e.g. "Implement BFS")
4. **Code editor + structured AI code review** (Bugs / Edge Cases / Optimizations / Styling)

---

## Technology stack

### Frontend (`/src/`)
- **React** 18.3 + TypeScript + **Vite** 5.4
- **React Router** 6.30, **Tailwind CSS** 3.4, **shadcn/ui** (Lucide icons)
- Token storage in `localStorage` (`apollo-library-token`)

### Backend (`/backend/`)
- **Python** + **FastAPI** + **Uvicorn**
- **PostgreSQL** + **pgvector** (semantic embeddings, HNSW index)
- **SQLAlchemy** 2.0 + **Pydantic** 2.8
- **LangChain** (langchain-community, google-genai, ollama)
- **Tavily** (web search)

---

## What the platform does

1. **Students** → create *Topics* and search for materials through AI; they receive scored results (quality + ease of understanding)
2. **Professors/Admins** → upload materials (PDFs, links), verify, publish/unpublish
3. **Agent search** → `ReviewAgent` uses `WebAgent` for Tavily (web, YouTube, archive.org, papers) and scores materials from 0–100 for quality and accessibility → everything is persisted in the DB with provenance

---

## Key DB models

- `User` (student/professor/admin), `Topic`, `UserTopic` (M2M)
- `Material` (canonical_name, link, file_path, type, difficulty, **trust_level**, **quality_score**, **ease_score**, verified_by, is_published, is_active)
- `MaterialChunk` with **vector embeddings**
- `MaterialFeedback` (rating 1–5, usefulness)
- `TopicSearchResult` + `TopicSearchResultItem` (audit trail for searches)

---

## Main endpoints

- `/api/auth` — login, register, me
- `/api/topics` — CRUD
- `/api/materials` — upload, verify, activate
- `/api/search-materials` — **central endpoint**, returns ranked results

---

## Frontend pages (`/src/pages/`)

`LoginPage`, `RegisterPage`, `LibraryPage` (dashboard with topics), `TopicPage` (topic details), `CodingReviewPage`, `ManagedMaterialsPage` (admin), `MaterialUploadPage`

---

## Configuration

Expected `.env` in the backend:

```
APOLLO_DATABASE_URL=postgresql://... (port 5434)
APOLLO_TAVILY_API_KEY=tvly-...
APOLLO_SEARCH_PROVIDER=auto|tavily|duckduckgo
APOLLO_FRONTEND_ORIGIN=http://localhost:5173
APOLLO_REVIEW_AGENT_DIR=agents
```

Vite proxy: `/api` → `http://127.0.0.1:8000`, `/uploads` → static.

---

## Observed issues in the code

- Keys for external services must be set in `.env` (`APOLLO_TAVILY_API_KEY`, optional `LANGSMITH_API_KEY`)
- `ReviewAgent` is loaded dynamically with shims over LangChain — fragile; if the local LLM is not available, it falls back to heuristic scoring
- Functional MVP: auth, agentic search, topic management, vector search, multi-role workflow

---

## Key files

- `backend/main.py` — FastAPI entry
- `backend/agents/review_agent.py` + `backend/agents/web_agent.py` — agentic core for web search and scoring
- `backend/services/material_search_service.py` — search orchestration + persistence
- `backend/db/models.py` — DB schema
- `src/app/App.tsx` — routing
- `src/services/api.ts` — API client
- `src/context/AuthContext.tsx` — auth flow

---

# Roadmap — the 13 Epics 

| # | Epic | Status |
|---|------|--------|
| 1 | **Auth, roles, topic search bar** | Implemented (login, register, student/professor/admin roles, TopicPage) |
| 2 | **Material retrieval (internal DB + web fallback)** | Implemented (internal pgvector + Tavilyfallback) |
| 3 | **Validation & quality assurance** (relevance, retry when validation fails) | Partial — `ReviewAgent` exists but is stubbed/optional |
| 4 | **Ranking & learning path** (sorting by difficulty, sortable table, explanations) | Partial — scoring exists, but table UI + "why recommended" are missing |
| 5 | **Problem set aggregator** (Codeforces/LeetCode/AtCoder + general problems) | Implemented |
| 6 | **Foundational task generation** ("Implement BFS" etc.) | Implemented |
| 7 | **Code editor workspace** (paste code, language selection, submit) | Implemented |
| 8 | **AI Code Review Engine** (Bugs, Edge Cases, Optimizations, Styling) | Implemented |
| 9 | **Review UX & code mapping** (highlight on hover, stale feedback) | Partial |
| 10 | **Agent orchestration & reliability** (retry, structured output) | Partial — `ReviewAgent` + backend services, but without complete bounded retry |
| 11 | **Trust, explainability, guardrails** (provenance, confidence) | Partial — `TopicSearchResult` has an audit trail, trust_level on materials |
| 12 | **Admin controls** (verify materials, feedback) | Implemented (`ManagedMaterialsPage`, `MaterialFeedback`) |
| 13 | **Observability & scalable data model** | Data model OK, telemetry/tracing missing |

---

## What is already done vs what still needs work

**Already done:** role-based authentication, agentic Tavily, internal retrieval with pgvector, material validation, problem aggregation, foundational tasks, code review, user feedback, admin verification.

**Still needs refinement:**
- Structured orchestrator with retry policies per stage and typed schemas
- Larger problem dataset
- Feedback from students to materials

---

## Delivery order (recommended in the doc)

1. Auth + profile — **DONE**
2. Search bar + topic orchestration — **DONE**
3. Internal retrieval + web fallback — **DONE**
4. **Validation + ranking** — *this is where we are now*
5. Results table
6. Problem aggregation
7. Foundational tasks
8. Code editor + review
9. Review interactions
10. Admin, trust, scale

---

## How to run the project

### Backend
```bash
cd backend
pip install -r requirements.txt
# set the variables in .env (see the Configuration section)
uvicorn backend.main:app --reload --port 8000
```

### Frontend
```bash
npm install
npm run dev
# open http://localhost:5173
```

---

## Testing

### Backend unit tests

The backend test suite uses `pytest`, FastAPI `TestClient`, dependency overrides, and fake agents/services. Tests are designed to run without PostgreSQL, Docker, Tavily, OpenAI, Ollama, or internet access.

```bash
# from the repository root
.venv/bin/python -m pip install -r backend/requirements.txt
PYTHONPATH=. .venv/bin/python -m pytest backend/tests
```

Focused examples:

```bash
PYTHONPATH=. .venv/bin/python -m pytest backend/tests/test_review_search_adapter.py
PYTHONPATH=. .venv/bin/python -m pytest backend/tests/test_code_review_contract.py
PYTHONPATH=. .venv/bin/python -m pytest backend/tests/test_search_routes.py
```

What is mocked:

- LLM-backed code review and foundational task agents
- ReviewAgent/web-search responses
- FastAPI authenticated users via dependency overrides
- Material search services for route tests
- Database sessions and query results where service tests do not need a real database

### Frontend tests

This branch includes a zero-dependency frontend utility test using Node's built-in test runner:

```bash
npm run test:frontend
```

For React component tests, there is currently no installed component test runner in this branch (`vitest`, Jest, React Testing Library, and jsdom are not present). Add the minimal frontend component test stack before writing `.test.tsx` component tests:

```bash
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```
