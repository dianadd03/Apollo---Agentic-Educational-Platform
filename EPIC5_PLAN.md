# Epic 5 — Problem Set Aggregator (IMPLEMENTAT)

Aggregator de probleme de practică (Codeforces / AtCoder, cu hook pregătit pentru LeetCode + LLM general problems) cu normalizare dificultate.

**Status: ~85% gata. 25/25 teste trec. ✅**

---

## Decizii arhitecturale (aplicate)

| Decizie | Aplicat |
|---|---|
| Cum aducem problemele? | API public Codeforces + JSON kenkoooo pentru AtCoder. LeetCode amânat (GraphQL fragil). |
| Cum stocăm problemele? | Tabel `problems` cu `last_fetched_at` + `problem_topic_links`. Cache 24h via `is_cache_fresh`. |
| Mapare topic → probleme | Tag-based prin `topic_to_tags()` + dict static `TOPIC_TO_TAGS`. Pentru AtCoder fallback la match pe titlu. |
| General problems (Story 5.4) | Hook în aggregator (`general_generator` param). Funcția LLM efectivă rămâne pentru iterația 2. |
| Normalizare dificultate | Scale 1–10 + label `TopicLevel` (beginner ≤3, intermediate 4–6, advanced 7+). |

---

## Pasul 1 — Model DB ✅

**Implementat:**
- `backend/migrations/003_problems.sql` — DDL pentru `problem_source` enum, tabel `problems`, tabel `problem_topic_links`
- `backend/db/models.py` — adăugate:
  - enum `ProblemSource` (codeforces / leetcode / atcoder / generated)
  - clasa `Problem` cu coloane: `id`, `source`, `external_id`, `title`, `url`, `raw_difficulty`, `normalized_difficulty` (1–10), `difficulty_label`, `success_rate`, `tags` (JSON), `is_generated`, `generated_objective`, `last_fetched_at`, `created_at`, `updated_at`
  - clasa `ProblemTopicLink` cu `match_score` (0–1)
  - constrângeri unice: `(source, external_id)` și `(problem_id, topic_id)`
  - check constraints + indecși pe `source`, `difficulty_label`, `normalized_difficulty`, `last_fetched_at`

---

## Pasul 2a — Difficulty normalizer + Codeforces provider ✅

**Implementat:**
- `backend/agents/problem_providers/__init__.py` — exporturi pentru toate componentele
- `backend/agents/problem_providers/base.py` — `ProblemDTO` (dataclass) + `ProblemProvider` (Protocol)
- `backend/agents/problem_providers/difficulty_normalizer.py` — funcții pure:
  - `difficulty_to_label(score)` — 1–10 → TopicLevel
  - `normalize_codeforces(rating)` — rating CF (800..3500) → (1–10, TopicLevel)
  - `normalize_leetcode(level)` — Easy/Medium/Hard → (2/5/8, label)
  - `normalize_atcoder(contest_type, problem_letter)` — ABC/ARC/AGC + slot → (1–10, label)
- `backend/agents/problem_providers/topic_tag_mapping.py` — dict `TOPIC_TO_TAGS` cu ~25 topicuri (DP, graphs, trees, backtracking, greedy, BS, sorting, strings, math, geometry, DS, two pointers, sliding window, hash, recursion, bitmasks, divide&conquer, linked list, stack, queue, heap, trie, segment tree, fenwick, union find, DFS, BFS) + funcția `topic_to_tags()` cu fallback
- `backend/agents/problem_providers/codeforces_provider.py` — `CodeforcesProvider` care interoghează `https://codeforces.com/api/problemset.problems?tags=...` (gratuit, fără auth)
- `backend/requirements.txt` — adăugat `httpx>=0.27.0,<1.0.0`

---

## Pasul 2b — AtCoder provider ✅ (LeetCode amânat)

**Implementat:**
- `backend/agents/problem_providers/atcoder_provider.py` — `AtCoderProvider`:
  - sursă: JSON public `kenkoooo.com/atcoder/resources/problems.json` + `problem-models.json`
  - cache in-memory (lazy load la prima cerere)
  - matching: fără tag system nativ, deci match pe cuvinte-cheie din titlu
  - dificultate: din contest type + slot, suprascris de `model.difficulty` rated când există

**Amânat (iterația 2):**
- LeetCode provider (GraphQL non-oficial, fragil — necesită User-Agent și posibil cookies)

---

## Pasul 3 — ProblemAggregatorAgent ✅

**Implementat:** `backend/agents/problem_aggregator.py`
- `AggregatedProblems` dataclass cu `problems`, `tags_used`, `source_breakdown`, `from_cache`
- `ProblemAggregatorAgent.aggregate_for_topic()`:
  1. `topic_to_tags()` → return `[]` dacă niciun tag
  2. Fetch paralel din toți providerii cu `asyncio.gather` + `_fetch_safe` (catch exceptions)
  3. Dedup pe `(source, external_id)` și URL
  4. Ranking prin `_rank()` — distanță față de target level + penalizare AI-generated
  5. Trigger `general_generator` dacă count < threshold (Story 5.4)
- `is_cache_fresh()` static helper pentru verificare cache TTL

---

## Pasul 4-5 — ProblemService + endpoint + schemas ✅

**Implementat:**
- `backend/schemas/problems.py`:
  - `ProblemResponse` — id, source, external_id, title, url, raw_difficulty, normalized_difficulty (1–10), difficulty_label, success_rate (0–1), tags, is_generated, generated_objective, topic_match (0–1), last_fetched_at
  - `ProblemListMetadata` — topic, tags_used, source_breakdown, generated_count, cached, fetched_at
  - `ProblemListResponse` — problems + metadata
- `backend/services/problem_service.py` — `ProblemService`:
  - `get_problems_for_topic()` cu cache check, persistare, filtre, limit
  - `_get_or_create_topic()` (slug-based), `_load_cached_for_topic()`, `_cache_is_fresh()`
  - `_persist_problems()` — upsert + creare `ProblemTopicLink`
  - `_apply_filters()` — pe platforms și difficulty
- `backend/api/routes/problems.py` — endpoint `GET /api/problems/topic-by-name` cu query params: `topic`, `platforms[]`, `difficulty`, `max_results`, `force_refresh`
- `backend/main.py` — `app.include_router(problems_router)`
- `backend/dependencies.py` — `get_problem_aggregator()` (lru_cached) + `get_problem_service()` cu DI
- `backend/config.py` — 4 setări noi: `problems_cache_ttl_hours`, `problems_max_per_source`, `problems_general_threshold`, `problems_default_max_results`

---

## Pasul 7 — Frontend wiring ✅

**Implementat:**
- `src/types/models.ts` — tipuri noi:
  - `ProblemSource` (lowercase: codeforces / leetcode / atcoder / generated)
  - `AggregatedProblem` (1:1 cu `ProblemResponse` din backend)
  - `ProblemListMetadata`, `ProblemListResponse`
  - tipul vechi `Problem` (mock) păstrat — folosit doar de `mockData.ts` și vechiul `ProblemTable.tsx`
- `src/services/api.ts` — `api.getProblemsForTopic(topic, options)` cu query string builder pentru `platforms`, `difficulty`, `maxResults`, `forceRefresh`
- `src/components/problems/ProblemsSection.tsx` 🆕 — componentă nouă stilizată dark theme:
  - filtre platform (all / codeforces / leetcode / atcoder / generated) + difficulty (all / beginner / intermediate / advanced)
  - tabel cu: Title (cu badge AI Generated dacă e cazul + tags + objective), Source, Difficulty (badge), Score 1–10, Success Rate, Topic Match, Open
  - stări: loading, error, empty
  - badges meta: `Cached`, `{n} AI-generated`, lista `tags_used`
- `src/pages/TopicPage.tsx` — integrare:
  - `useEffect` separat pentru fetch problems când topic-ul e încărcat
  - state: `problems`, `problemsMeta`, `problemsLoading`, `problemsError`
  - `<ProblemsSection>` randat sub `<TopicDetails>`
  - difficulty filter trimis automat = `topic.level`

---

## Pasul 9 — Tests ✅

**Implementat:**
- `backend/tests/test_difficulty_normalizer.py` — 18 teste:
  - `TestDifficultyToLabel` (3 teste): beginner / intermediate / advanced ranges
  - `TestNormalizeCodeforces` (5): None, low, mid, high, extreme rating
  - `TestNormalizeLeetcode` (5): Easy / Medium / Hard / unknown / None
  - `TestNormalizeAtcoder` (5): ABC-A, ABC-E, ARC-F, AGC, unknown
- `backend/tests/test_problem_aggregator.py` — 7 teste:
  - `test_aggregate_combines_providers_and_dedups`
  - `test_aggregate_handles_provider_failure_gracefully`
  - `test_aggregate_returns_empty_when_no_tags_known`
  - `test_aggregate_dedups_by_url`
  - `test_ranking_prefers_target_level`
  - `test_general_generator_triggered_below_threshold`
  - `test_cache_freshness_helper`

**Rezultat:** 25/25 passing în 0.68s.

**Bug fix descoperit prin tests:** `topic_to_tags("")` returna prima intrare din dict (din cauza `"" in known_key`). Reparat — acum returnează `[]` la string gol.

---

## Stories acoperite din MDS

- **Story 5.1** — Fetch problem links from searched topic ✅
- **Story 5.2** — Rank by difficulty / success rate ✅ (success_rate inclus când e disponibil)
- **Story 5.3** — Filter by platform ✅ (UI + query param)
- **Story 5.4** — General problems generated by agent ⏳ (hook gata, generator efectiv = iterația 2)

---

## Fișiere create / modificate (rezumat)

**Backend (18):**
- 🆕 `backend/migrations/003_problems.sql`
- ✏️ `backend/db/models.py`
- 🆕 `backend/agents/problem_providers/__init__.py`
- 🆕 `backend/agents/problem_providers/base.py`
- 🆕 `backend/agents/problem_providers/difficulty_normalizer.py`
- 🆕 `backend/agents/problem_providers/topic_tag_mapping.py`
- 🆕 `backend/agents/problem_providers/codeforces_provider.py`
- 🆕 `backend/agents/problem_providers/atcoder_provider.py`
- 🆕 `backend/agents/problem_aggregator.py`
- 🆕 `backend/services/problem_service.py`
- 🆕 `backend/schemas/problems.py`
- 🆕 `backend/api/routes/problems.py`
- ✏️ `backend/dependencies.py`
- ✏️ `backend/main.py`
- ✏️ `backend/config.py`
- ✏️ `backend/requirements.txt`
- 🆕 `backend/tests/test_difficulty_normalizer.py`
- 🆕 `backend/tests/test_problem_aggregator.py`

**Frontend (4):**
- ✏️ `src/types/models.ts`
- ✏️ `src/services/api.ts`
- 🆕 `src/components/problems/ProblemsSection.tsx`
- ✏️ `src/pages/TopicPage.tsx`

---

## Ce a rămas de făcut

Vezi `CE_MAI_TREBUIE_FACUT.md` în rădăcina proiectului.
