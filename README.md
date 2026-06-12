# 🚀 Apollo — Agentic Educational Platform

> An AI-powered learning platform that generates personalized study paths, curated resources, practice problems, and structured code review — all from a single search.

[![Demo](https://img.shields.io/badge/▶_Watch_Demo-YouTube-red?style=for-the-badge&logo=youtube)](https://youtu.be/XZNTgxGA2jU)
![Stack](https://img.shields.io/badge/Stack-React_+_FastAPI_+_PostgreSQL-blue?style=for-the-badge)
![AI](https://img.shields.io/badge/AI-LangChain_+_Gemini_+_Tavily-purple?style=for-the-badge)

---

## 📽️ Demo

[![Apollo Demo](https://img.youtube.com/vi/XZNTgxGA2jU/maxresdefault.jpg)](https://youtu.be/XZNTgxGA2jU)

---

## What is Apollo?

A student types **"Dynamic Programming"** into the search bar. Apollo's agentic AI orchestrator kicks in and returns:

- 📚 **A curated learning path** — scored resources ranked by quality and accessibility
- 🧩 **Practice problems** — pulled from Codeforces, LeetCode, and AtCoder
- 🛠️ **Foundational tasks** — hands-on exercises like "Implement BFS from scratch"
- 🤖 **AI Code Review** — paste your solution and get structured feedback across four dimensions: Bugs · Edge Cases · Optimizations · Style

Professors and admins can upload, verify, and manage materials. Every search result is persisted with full provenance in the database.

---

## Features by Role

| Role | Capabilities |
|---|---|
| **Student** | Search topics, view ranked learning paths, solve problems, get AI code review, rate materials |
| **Professor** | Upload PDFs and links, verify materials |
| **Admin** | Full material management, publish/unpublish, view feedback |

---

## Architecture

### Agentic Search Pipeline

The core of Apollo is a two-agent system that runs on every topic search:

```
Student search query
        │
        ▼
  MaterialSearchService
  ┌─────────────────────────────────────────┐
  │  1. RAG retrieval from internal pgvector │
  │     → cosine similarity over embeddings  │
  │     → source-type trust boost applied    │
  │                                          │
  │  2. If internal results < MIN_THRESHOLD  │
  │     → fall back to ReviewAgent (web)     │
  └─────────────────────────────────────────┘
        │
        ▼
   ReviewAgent (LangChain orchestrator)
        │
        ▼
   WebAgent (Tavily)
   Runs 4 parallel search strategies:
   ├── websites   → general CS resources
   ├── youtube    → tutorials & lectures
   ├── articles   → papers & surveys
   └── books      → archive.org textbooks
        │
        ▼
   LLM Scoring (per result, 0–100 each)
   ├── material_quality_score
   │   (relevance, credibility, format fit)
   └── ease_of_understanding_score
       (accessibility, conceptual density)
        │
        ▼
   Results ranked + persisted with provenance
   (TopicSearchResult + TopicSearchResultItem)
        │
        ▼
   Code Editor → AI Code Review
   (Bugs / Edge Cases / Optimizations / Style)
```

### Source Trust Hierarchy

Materials are ranked using a composite score that combines LLM scoring with a **source-type trust boost**:

| Source Type | Boost |
|---|---|
| `admin_managed` | +0.08 |
| `professor_managed` | +0.07 |
| `trusted_source` | +0.06 |
| `agent_selected` | +0.04 |
| `community_internet` | +0.02 |
| `general_internet` | +0.00 |

### Vector Search

Internal materials are chunked and embedded into **pgvector** with an **HNSW index** for approximate nearest-neighbor lookup. The retrieval agent computes cosine similarity at query time, with a minimum score threshold of `0.55` and a minimum result count of `3` before the system falls back to live web search.

---

## AI Agents

Apollo is built around a pipeline of five specialized agents, each with a distinct role and design pattern.

---

### 1. `ReviewAgent` — LangChain Tool-Calling Orchestrator

The central reasoning agent. Built with LangChain's `create_agent`, it receives raw Tavily search results and uses **tool-calling** to selectively fetch full page content via `extract_web_site` before scoring.

**How it works:**
- Invoked with the topic + raw search results as a user message
- Decides autonomously which URLs warrant deep extraction (content length, quality signals)
- Returns structured JSON with `material_quality_score` and `ease_of_understanding_score` (0–100 each) per result
- Post-processes results: filters scores below 20, deduplicates by URL (keeps highest-scoring), and derives a `level` enum from the ease score
- Applies a **title-signal override** — if the title contains keywords like `"BEGINNER"`, `"DEEP DIVE"`, `"ARXIV"`, the level is corrected regardless of the numeric score

```
temperature=0.1  →  near-deterministic scoring
tool use         →  selective content extraction only when needed
JSON-only output →  no freeform reasoning leaks into the response
```

---

### 2. `WebAgent` — Multi-Strategy Tavily Search

Wraps the Tavily API with four independent search strategies, run per query:

| Strategy | Query pattern | Domain filter |
|---|---|---|
| `website` | `{topic} programming OR computer science` | none |
| `youtube` | `{topic} tutorial OR lecture computer science` | youtube.com |
| `article` | `{topic} research paper OR survey` | none |
| `book` | `{topic} book OR textbook computer science` | archive.org |

Each strategy runs at `search_depth="advanced"`. Extraction uses a two-pass approach: standard depth first, then advanced if the first returns no content. This ensures coverage across video, text, and academic sources in a single agent call.

---

### 3. `RagRetrievalAgent` — Hybrid Semantic Retrieval

Handles the internal database path before falling back to live web search.

- Queries **pgvector** with an HNSW index using cosine similarity
- Uses **level-aware query suffixes** to bias retrieval per difficulty tier:

```python
"beginner":      "beginner friendly basics tutorial introduction no prerequisites"
"intermediate":  "intermediate practical guide examples"
"advanced":      "advanced course deep dive"
"expert":        "expert research paper"
```

- Requires a minimum of `MIN_PER_LEVEL = 7` results per level and `MIN_INTERNAL_TOTAL = 20` total before the system skips web search entirely
- Applies `SOURCE_TYPE_BONUS` on top of the similarity score so admin-managed materials surface above community sources at equivalent semantic distance

---

### 4. `CodeReviewAgent` — Static Analysis Reviewer

A zero-temperature LLM reviewer modelling a senior software engineer. Performs **static analysis only** (no code execution) against a structured prompt that enforces a strict review contract.

**Output contract — four required sections, always present:**

| Section | What goes here |
|---|---|
| `Critical issues (must-fix)` | Syntax errors, wrong function signature, solving the wrong task, forbidden built-ins, crashes |
| `Important improvements (should-fix)` | Edge cases, constraint handling, complexity issues |
| `Nice-to-haves` | Style, naming, formatting |
| `Suggested tests (with expected results)` | ≥5 concrete test cases with expected outputs |

The `enforce_review_contract` post-processor runs after every LLM response:
- Parses sections with regex, handles legacy heading formats
- **Orphan feedback classifier** — any bullets not under a valid heading are re-classified into the correct section by keyword matching (`"bug"`, `"error"` → Critical; `"assert"`, `"expected"` → Tests; style tokens → Nice-to-haves)
- **Optional improvement splitter** — bullets containing style/readability tokens are automatically moved from `should-fix` to `Nice-to-haves`
- **Fallback review** — if the LLM returns an empty or generic response, a structured fallback with five concrete test case templates is injected

```
temperature=0.0  →  fully deterministic output per input
format contract  →  post-processor guarantees all four sections exist
line references  →  numbered code is injected so the LLM can cite "Line 12:"
```

---

### 5. `FoundationalTaskAgent` — Structured Task Generator

Generates up to 5 hands-on programming tasks per topic using **JSON-mode LLM invocation** (`format="json"`, `temperature=0.0`). Each task includes a title, a clear problem statement with input/output specification and constraints, and two worked examples. The JSON schema is enforced via a strict system prompt rather than tool-calling schemas, keeping the implementation lightweight.

---

## Tech Stack

### Frontend
- **React 18** + TypeScript + **Vite 5**
- **Tailwind CSS** + **shadcn/ui** + Lucide icons
- React Router 6

### Backend
- **FastAPI** + Uvicorn (Python 3.11+)
- **PostgreSQL** + **pgvector** — semantic search with HNSW indexing
- **SQLAlchemy 2** (mapped columns, async-ready) + **Pydantic 2**
- **LangChain** + Google Gemini / Ollama (swappable LLM backend)
- **Tavily** — multi-strategy web search agent with advanced extraction

---

## Data Model

Key entities and their notable fields:

```
User            → id (UUID), email, role (student|professor|admin), is_active
Topic           → id, name, level (beginner→expert), user_topic M2M
Material        → canonical_name, link, file_path, type, difficulty,
                  trust_level, quality_score, ease_score,
                  source_type, verified_by, is_published, is_active
MaterialChunk   → material_id, chunk_text, embedding (Vector)  ← pgvector
MaterialFeedback → user_id, material_id, rating (1–5), usefulness enum
TopicSearchResult     → audit header per search (user, topic, timestamp)
TopicSearchResultItem → individual ranked result with scores & provenance
```

Enums used throughout: `UserRole`, `MaterialType`, `MaterialSourceType`, `TrustLevel`, `TopicLevel`, `FeedbackUsefulness`, `ProblemSource`.

---

## API Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/register` | Register |
| GET/POST | `/api/topics` | Topic CRUD |
| POST | `/api/materials` | Upload material |
| POST | `/api/search-materials` | **Agentic search** — ranked results with full audit trail |

---

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL with the `pgvector` extension

### 1. Clone & configure

```bash
git clone https://github.com/your-org/Apollo---Agentic-Educational-Platform.git
cd Apollo---Agentic-Educational-Platform
```

Create `backend/.env`:

```env
APOLLO_DATABASE_URL=postgresql://user:pass@localhost:5434/apollo
APOLLO_TAVILY_API_KEY=tvly-...
APOLLO_SEARCH_PROVIDER=auto          # auto | tavily | duckduckgo
APOLLO_FRONTEND_ORIGIN=http://localhost:5173
APOLLO_REVIEW_AGENT_DIR=agents
```

### 2. Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn backend.main:app --reload --port 8000
```

### 3. Frontend

```bash
npm install
npm run dev
# → http://localhost:5173
```

---

## Running Tests

The test suite is fully offline — no PostgreSQL, Docker, Tavily, or internet access required. All external dependencies (LLM agents, DB sessions, auth) are replaced with fakes and dependency overrides.

### Backend

```bash
PYTHONPATH=. .venv/bin/python -m pytest backend/tests
```

### Frontend

```bash
npm run test:frontend
```

---

## Project Structure

```
Apollo---Agentic-Educational-Platform/
├── backend/
│   ├── agents/
│   │   ├── review_agent.py          # LangChain orchestrator — scoring & ranking
│   │   ├── web_agent.py             # Tavily multi-strategy search + extraction
│   │   └── rag_retrieval_agent.py   # pgvector semantic retrieval
│   ├── api/                         # FastAPI route handlers
│   ├── db/
│   │   └── models.py                # SQLAlchemy 2 mapped models
│   ├── services/
│   │   └── material_search_service.py  # Search orchestration + DB persistence
│   ├── schemas/                     # Pydantic 2 request/response models
│   └── main.py                      # FastAPI app entry point
└── src/
    ├── pages/
    │   ├── LibraryPage.tsx          # Dashboard with topics
    │   ├── TopicPage.tsx            # Search results + learning path
    │   ├── CodingReviewPage.tsx     # Code editor + AI review
    │   └── ManagedMaterialsPage.tsx # Admin panel
    ├── context/AuthContext.tsx
    └── services/api.ts
```

---


