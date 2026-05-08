# Apollo — Agentic Educational Platform

Platformă educațională unde studenții și profesorii **caută un topic tehnic** (ex: "Dynamic Programming", "Graphs", "Backtracking") printr-o **search bar**, iar un **AI Orchestrator agentic** generează:

1. **Path de învățare curat** (materiale validate)
2. **Probleme de practică** (Codeforces, LeetCode, AtCoder)
3. **Task-uri fundamentale** (ex: "Implement BFS")
4. **Code editor + AI code review** structurat (Bugs / Edge Cases / Optimizations / Styling)

---

## Stack tehnologic

### Frontend (`/src/`)
- **React** 18.3 + TypeScript + **Vite** 5.4
- **React Router** 6.30, **Tailwind CSS** 3.4, **shadcn/ui** (Lucide icons)
- Stocare token în `localStorage` (`apollo-library-token`)

### Backend (`/backend/`)
- **Python** + **FastAPI** + **Uvicorn**
- **PostgreSQL** + **pgvector** (embeddings semantice, index HNSW)
- **SQLAlchemy** 2.0 + **Pydantic** 2.8
- **LangChain** (langchain-community, google-genai, ollama)
- **Tavily** (web search) + **DuckDuckGo** (fallback)

---

## Ce face platforma

1. **Studenți** → creează *Topics* (cu nivel: beginner/intermediate/advanced) și caută materiale prin AI; primesc rezultate scorate (calitate + ușurință de înțelegere)
2. **Profesori/Admini** → upload materiale (PDF, link-uri), verificare, publish/unpublish
3. **Agent search** → `SearchAgent` interoghează Tavily (web, YouTube, archive.org, papers) → `ReviewAgent` (LLM local opțional, Ollama/Gemini) scorează materialele 0–100 pe calitate și accesibilitate → totul persistat în DB cu proveniență

---

## Modele DB cheie

- `User` (student/professor/admin), `Topic`, `UserTopic` (M2M)
- `Material` (canonical_name, link, file_path, type, difficulty, **trust_level**, **quality_score**, **ease_score**, verified_by, is_published, is_active)
- `MaterialChunk` cu **vector embeddings**
- `MaterialFeedback` (rating 1–5, usefulness)
- `TopicSearchResult` + `TopicSearchResultItem` (audit trail al căutărilor)

---

## Endpoint-uri principale

- `/api/auth` — login, register, me
- `/api/topics` — CRUD
- `/api/materials` — upload, verify, activate
- `/api/search-materials` — **endpoint-ul central**, returnează rezultate ranked

---

## Pagini frontend (`/src/pages/`)

`LoginPage`, `RegisterPage`, `LibraryPage` (dashboard cu topics), `TopicPage` (detalii + auto-search), `ManagedMaterialsPage` (admin), `MaterialUploadPage`

---

## Configurare

`.env` așteptat în backend:

```
APOLLO_DATABASE_URL=postgresql://... (port 5434)
APOLLO_TAVILY_API_KEY=tvly-...
APOLLO_SEARCH_PROVIDER=auto|tavily|duckduckgo
APOLLO_FRONTEND_ORIGIN=http://localhost:5173
APOLLO_REVIEW_AGENT_DIR=agents
```

Vite proxy: `/api` → `http://127.0.0.1:8000`, `/uploads` → static.

---

## Probleme observate în cod

- **Cheia API Tavily este hardcoded** în `backend/agents/search_agent.py:20` — ar trebui mutată în `.env` (`APOLLO_TAVILY_API_KEY`)
- `ReviewAgent` este încărcat dinamic cu shims peste LangChain — fragil; dacă LLM-ul local nu e disponibil, se cade pe scoring euristic
- MVP funcțional: auth, search agentic, topic management, vector search, multi-role workflow

---

## Fișiere cheie

- `backend/main.py` — entry FastAPI
- `backend/agents/search_agent.py` + `review_agent.py` — nucleul agentic
- `backend/services/material_search_service.py` — orchestrare căutare + persistare
- `backend/db/models.py` — schema DB
- `src/app/App.tsx` — routing
- `src/services/api.ts` — client API
- `src/context/AuthContext.tsx` — flux auth

---

# Roadmap — cele 13 Epics (din MDS)

| # | Epic | Status |
|---|------|--------|
| 1 | **Auth, roluri, search bar topic** | Implementat (login, register, roluri student/professor/admin, TopicPage) |
| 2 | **Retrieval materiale (DB intern + fallback web)** | Implementat (pgvector intern + Tavily/DuckDuckGo fallback) |
| 3 | **Validare & quality assurance** (relevanță, retry când validarea eșuează) | Parțial — `ReviewAgent` există dar e stubbed/opțional |
| 4 | **Ranking & learning path** (sortare după dificultate, tabel sortabil, explicații) | Parțial — scoring există, dar UI tabelar + "why recommended" lipsesc |
| 5 | **Problem set aggregator** (Codeforces/LeetCode/AtCoder + general problems) | Lipsește complet |
| 6 | **Foundational task generation** ("Implement BFS" etc.) | Lipsește complet |
| 7 | **Code editor workspace** (paste cod, language selection, submit) | Lipsește complet |
| 8 | **AI Code Review Engine** (Bugs, Edge Cases, Optimizations, Styling) | Lipsește complet |
| 9 | **Review UX & code mapping** (highlight la hover, stale feedback) | Lipsește complet |
| 10 | **Agent orchestration & reliability** (retry, structured output) | Parțial — `SearchAgent` + `ReviewAgent`, dar fără retry bounded |
| 11 | **Trust, explainability, guardrails** (provenance, confidence) | Parțial — `TopicSearchResult` are audit trail, trust_level pe materiale |
| 12 | **Admin controls** (verify materiale, feedback) | Implementat (`ManagedMaterialsPage`, `MaterialFeedback`) |
| 13 | **Observability & data model scalabil** | Data model OK, telemetrie/tracing lipsește |

---

## MVP recomandat (din document)

- [x] auth + role setup
- [x] search bar
- [x] internal search + web fallback
- [ ] validation agent (parțial)
- [ ] difficulty ranking (parțial)
- [ ] sortable materials table
- [ ] problem links aggregator
- [ ] foundational task generation
- [ ] code editor
- [ ] categorized AI code review

---

## Ce ai deja vs ce mai trebuie făcut

**Ai gata (~40% din scope):** autentificare cu roluri, search agentic Tavily + DuckDuckGo, retrieval intern cu pgvector, validare materiale (manual + ReviewAgent stubbed), feedback users, admin verify.

**Lipsesc piesele mari:**
- **Epic 5** — Aggregator probleme (Codeforces/LeetCode/AtCoder) cu normalizare dificultate
- **Epic 6** — Generator de task-uri fundamentale (LLM)
- **Epic 7+8** — Code editor (Monaco?) + review AI cu 4 categorii (Bugs / Edge Cases / Optimizations / Styling)
- **Epic 9** — Mapare suggestion ↔ regiune cod (line ranges/AST anchors), stale state după edit
- **Epic 4** — Tabel sortabil + "Why recommended" explanation
- **Epic 10** — Orchestrator structurat cu retry policies pe stage și schemas tipizate

---

## Ordinea livrării (recomandată în doc)

1. Auth + profile — **DONE**
2. Search bar + topic orchestration — **DONE**
3. Internal retrieval + web fallback — **DONE**
4. **Validation + ranking** — *aici suntem acum*
5. Results table
6. Problem aggregation
7. Foundational tasks
8. Code editor + review
9. Review interactions
10. Admin, trust, scale

---

## Cum rulezi proiectul

### Backend
```bash
cd backend
pip install -r requirements.txt
# setează variabilele în .env (vezi secțiunea Configurare)
uvicorn main:app --reload --port 8000
```

### Frontend
```bash
npm install
npm run dev
# deschide http://localhost:5173
```
