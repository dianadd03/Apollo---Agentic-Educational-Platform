# Ce mai trebuie făcut

Ghid pas cu pas pentru a porni Epic 5 local + ce ar fi de făcut în iterația 2.

---

## Pași necesari ca să meargă codul

### 1. Aplicare migrare DB

PostgreSQL trebuie să ruleze (pe portul configurat în `APOLLO_DATABASE_URL`, default 5434).

```bash
psql apollo < backend/migrations/003_problems.sql
```

Dacă folosești alt utilizator/host:
```bash
psql -h localhost -p 5434 -U postgres -d apollo -f backend/migrations/003_problems.sql
```

Migrarea creează:
- enum `problem_source`
- tabelul `problems`
- tabelul `problem_topic_links`
- indecșii aferenți

### 2. Instalare dependințe backend

Am adăugat `httpx` în `backend/requirements.txt` (necesar pentru providers).

```bash
pip install -r backend/requirements.txt
```

### 3. Pornire servere

**Backend** (FastAPI):
```bash
uvicorn backend.main:app --reload --port 8000
```

**Frontend** (Vite):
```bash
npm run dev
```

Frontend va rula pe `http://localhost:5173`.

### 4. Test E2E manual

1. Login / register pe platformă
2. Creează (sau deschide) un topic — recomandat: **"Dynamic Programming"**, **"Graphs"**, sau **"Backtracking"** (sunt în `TOPIC_TO_TAGS`)
3. Sub secțiunea de materiale ar trebui să vezi noua secțiune **"Practice problems"**
4. Verificare:
   - Probleme de la Codeforces (link-uri către `codeforces.com/problemset/...`)
   - Probleme de la AtCoder (link-uri către `atcoder.jp/contests/...`)
   - Filtre: platform + difficulty
   - Coloană "Score" (1–10) și "Match" (% topic match)

**Tip:** prima cerere e mai lentă (fetch live de la 2 surse). A doua cerere pe același topic în <24h vine din cache (vezi badge `Cached`).

---

## Iterația 2 — Ce mai poți adăuga

### A. LLM general problems generator (Story 5.4)

Hook-ul există deja în `ProblemAggregatorAgent` (parametrul `general_generator`). Trebuie doar să scrii funcția și s-o pasezi.

**Pași:**

1. Creează `backend/agents/general_problem_generator.py` cu:
   ```python
   from backend.agents.problem_providers.base import ProblemDTO
   from backend.db.models import ProblemSource, TopicLevel

   async def generate_general_problems(
       topic: str, level: TopicLevel, count: int
   ) -> list[ProblemDTO]:
       # 1. construiește prompt LLM (ex: Ollama/Gemini, vezi review_agent.py ca referință)
       # 2. parse output JSON
       # 3. return list[ProblemDTO] cu source=generated, is_generated=True
       ...
   ```

2. Modifică `backend/dependencies.py:get_problem_aggregator()`:
   ```python
   from backend.agents.general_problem_generator import generate_general_problems

   @lru_cache(maxsize=1)
   def get_problem_aggregator() -> ProblemAggregatorAgent:
       settings = get_settings()
       providers = [CodeforcesProvider(), AtCoderProvider()]
       return ProblemAggregatorAgent(
           providers=providers,
           cache_ttl_hours=settings.problems_cache_ttl_hours,
           max_per_source=settings.problems_max_per_source,
           general_threshold=settings.problems_general_threshold,
           general_generator=generate_general_problems,  # <-- aici
       )
   ```

3. Mecanismul de threshold + ranking penalizează deja problemele generate (apar după cele reale).

### B. LeetCode provider

GraphQL la `https://leetcode.com/graphql`, query `problemsetQuestionList`.

**Pași:**

1. Creează `backend/agents/problem_providers/leetcode_provider.py` cu o clasă `LeetCodeProvider` (folosește `CodeforcesProvider` ca referință).
2. Atenție:
   - GraphQL non-oficial → poate fi blocat
   - Necesită header `User-Agent` (ex: `Mozilla/5.0`)
   - Posibil să fie nevoie de cookie `csrftoken` și `LEETCODE_SESSION` la rate-limit greu
3. Înregistrează-l în `backend/dependencies.py`:
   ```python
   providers = [CodeforcesProvider(), AtCoderProvider(), LeetCodeProvider()]
   ```
4. Adaugă tag-uri specifice LeetCode în `topic_tag_mapping.py` (LC folosește `dynamic-programming`, `hash-table` etc.).

### C. Îmbunătățiri opționale

- **Topic → tags via LLM** (în loc de dict static): mai bună acoperire pentru topicuri rare.
- **Warm cache** pentru topic-urile cele mai populare (cron sau task la deploy).
- **Success rate de la Codeforces**: API-ul expune `solvedCount` în `problemStatistics` — dacă găsești și `attemptCount`, poți calcula real success rate.
- **Endpoint `/api/problems/topic/{topic_id}`** (UUID-based) ca alternativă la `topic-by-name`.
- **Dark-mode rework** pentru vechiul `ProblemTable.tsx` din `src/components/problems/` (sau ștergere — e folosit doar de mock data).
- **Tests pentru `ProblemService`** (cu un DB SQLite în memorie sau cu mock-uri pentru SQLAlchemy session).
- **Tests pentru endpoint** cu `TestClient` din FastAPI.

---

## Cum verifici că totul merge

```bash
# Tests backend (deja trec 25/25)
python -m pytest backend/tests/test_difficulty_normalizer.py backend/tests/test_problem_aggregator.py -v

# Type check frontend
npm run build

# Health check backend
curl http://localhost:8000/health

# Test endpoint manual (după login, ai nevoie de token)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:8000/api/problems/topic-by-name?topic=Dynamic%20Programming&max_results=10"
```

---

## Probleme cunoscute / lucruri de știut

- **Codeforces API** poate avea downtime ocazional (5xx) — `_fetch_safe` din aggregator returnează `[]` în acest caz și logează warning.
- **AtCoder JSON** e cache-uit in-memory (per-instanță provider). La restart se reia download-ul (~ câțiva MB).
- **Cache 24h** se aplică per topic. Folosește `force_refresh=true` în query string ca să bypassezi cache.
- **`lru_cache`** pe `get_problem_aggregator` înseamnă că providerii sunt singleton — dacă schimbi config, restart la backend.
