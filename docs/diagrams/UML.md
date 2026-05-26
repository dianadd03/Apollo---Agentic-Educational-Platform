# Apollo — UML Diagrams

All diagrams below are written in [Mermaid](https://mermaid.js.org/) and render
automatically on GitHub. To preview locally, paste the fenced block into the
[Mermaid Live Editor](https://mermaid.live).

The three views describe Apollo from three angles:

1. **Class diagram** — persistent domain model (SQLAlchemy entities in `backend/db/models.py`).
2. **Component diagram** — runtime architecture across frontend, backend, agents and external services.
3. **Sequence diagram** — end-to-end flow of the hybrid RAG material search, the
   core feature described in `RAPORT.md`.

---

## 1. Class diagram — domain model

Reflects the ORM entities and their relationships. Enum-typed columns are shown
as short attribute annotations.

```mermaid
classDiagram
    direction LR

    class User {
        +UUID id
        +string email
        +string full_name
        +UserRole role
        +bool is_active
        +datetime created_at
    }

    class AppSession {
        +UUID id
        +string token
        +UUID user_id
        +datetime expires_at
    }

    class TeacherAdminProfile {
        +UUID id
        +UUID user_id
        +string staff_role
        +string department
    }

    class Topic {
        +UUID id
        +string slug
        +string title
        +string description
    }

    class UserTopic {
        +UUID id
        +UUID user_id
        +UUID topic_id
        +TopicLevel level
        +string notes
    }

    class UserTopicCodingTask {
        +UUID id
        +UUID user_topic_id
        +string title
        +text task
        +json examples
        +int sequence_order
    }

    class UserTopicProgress {
        +UUID id
        +UUID user_topic_id
        +int completion_percent
        +string current_stage
    }

    class Material {
        +UUID id
        +UUID topic_id
        +string canonical_name
        +string link
        +string file_path
        +MaterialType material_type
        +TopicLevel difficulty
        +MaterialSourceType source_type
        +TrustLevel trust_level
        +float trust_score
        +float quality_score
        +float ease_score
        +string summary
        +bool is_published
        +bool is_active
        +bool is_verified
        +json metadata_json
    }

    class MaterialTopicLink {
        +UUID id
        +UUID material_id
        +UUID topic_id
    }

    class MaterialTag {
        +UUID id
        +UUID material_id
        +string category
        +float relevance
    }

    class MaterialChunk {
        +UUID id
        +UUID material_id
        +int chunk_index
        +text chunk_text
        +vector embedding
    }

    class MaterialFeedback {
        +UUID id
        +UUID material_id
        +UUID user_id
        +int rating
        +FeedbackUsefulness usefulness
        +bool would_recommend
    }

    class MaterialLike {
        +UUID id
        +UUID material_id
        +UUID user_id
    }

    class TopicSearchResult {
        +UUID id
        +UUID topic_id
        +UUID user_id
        +string query_text
        +string coverage_source
        +int result_count
    }

    class TopicSearchResultItem {
        +UUID id
        +UUID search_result_id
        +UUID material_id
        +int rank_position
        +float score_at_return_time
        +string source_of_result
    }

    class Problem {
        +UUID id
        +ProblemSource source
        +string external_id
        +string title
        +string url
        +int normalized_difficulty
        +TopicLevel difficulty_label
        +json tags
        +bool is_generated
    }

    class ProblemTopicLink {
        +UUID id
        +UUID problem_id
        +UUID topic_id
        +float match_score
    }

    User "1" --> "*" AppSession : sessions
    User "1" --> "0..1" TeacherAdminProfile : staff_profile
    User "1" --> "*" UserTopic : topics
    User "1" --> "*" MaterialLike : likes
    User "1" --> "*" TopicSearchResult : saved_searches

    Topic "1" --> "*" UserTopic : learners
    Topic "1" --> "*" MaterialTopicLink : material_links
    Topic "1" --> "*" TopicSearchResult : search_results

    UserTopic "1" --> "0..1" UserTopicProgress : progress
    UserTopic "1" --> "*" UserTopicCodingTask : coding_tasks

    Material "1" --> "*" MaterialTopicLink : topic_links
    Material "1" --> "*" MaterialTag : tags
    Material "1" --> "*" MaterialChunk : chunks
    Material "1" --> "*" MaterialFeedback : feedback_entries
    Material "1" --> "*" MaterialLike : likes
    Material "1" --> "*" TopicSearchResultItem : search_result_items

    TopicSearchResult "1" --> "*" TopicSearchResultItem : items
    Problem "1" --> "*" ProblemTopicLink : topic_links
    ProblemTopicLink "*" --> "1" Topic : topic_id
```

---

## 2. Component diagram — runtime architecture

Shows how the React frontend talks to the FastAPI backend, how the backend
delegates to services and AI agents, and which external systems the agents call.

```mermaid
flowchart TB
    subgraph Client["Browser (React + Vite)"]
        UI["UI pages<br/>(Topics, Materials, CodingReview)"]
        APIClient["src/services/api client"]
    end

    subgraph Backend["FastAPI backend"]
        direction TB
        Routes["api/routes<br/>auth | topics | materials<br/>search | problems | code_review"]
        Services["services<br/>auth | material | material_search<br/>topic | problem | storage<br/>review_search_adapter"]
        Agents["agents<br/>rag_retrieval | web | extractor<br/>review | code_review<br/>foundational_task | learning_module<br/>problem_aggregator"]
        Tools["tools<br/>websearch"]
        Schemas["schemas (pydantic)"]
        Deps["dependencies / config"]
    end

    subgraph Data["Data layer"]
        DB[("PostgreSQL<br/>+ pgvector")]
        Uploads[("/uploads<br/>static files")]
    end

    subgraph External["External / LLM"]
        Ollama["Ollama<br/>(local & cloud models)"]
        Tavily["Tavily search<br/>(primary web search)"]
        Codeforces["Codeforces / LeetCode<br/>problem providers"]
    end

    UI --> APIClient
    APIClient -->|HTTP / JSON| Routes
    Routes --> Schemas
    Routes --> Services
    Routes --> Deps
    Services --> Agents
    Services --> DB
    Agents --> Tools
    Agents --> DB
    Tools --> Tavily
    Agents --> Ollama
    Agents --> Codeforces
    Routes --> Uploads
```

---

## 3. Sequence diagram — hybrid RAG material search

Captures the "search materials for a topic" path as actually implemented in
`backend/agents/rag_retrieval_agent.py` and `backend/services/material_search_service.py`.
The retrieval is keyword-based (SQL `ILIKE` on `Material.canonical_name`, `summary`
and `MaterialTag.category`) plus a heuristic level calibration; the
`MaterialChunk.embedding` HNSW index exists in the schema but is not queried by
the current RAG agent. Web fallback runs through `ReviewSearchAdapter`, which
internally uses `WebAgent` and the LLM-based `ReviewAgent` to score and
calibrate external candidates.

```mermaid
sequenceDiagram
    autonumber
    actor Student
    participant FE as React UI
    participant API as FastAPI /api/search
    participant SVC as MaterialSearchService
    participant RAG as RagRetrievalAgent
    participant DB as PostgreSQL
    participant ADP as ReviewSearchAdapter
    participant WEB as WebAgent
    participant REV as ReviewAgent (LLM)
    participant SRC as Tavily / DuckDuckGo

    Student->>FE: open topic, request materials
    FE->>API: GET /api/search?topic=...
    API->>SVC: search_materials(topic, current_user)
    SVC->>RAG: search(topic, max_results)

    RAG->>DB: SELECT Material WHERE name/summary/tag ILIKE '%topic%'
    DB-->>RAG: keyword-matched materials
    Note over RAG: relevance + quality + trust scoring<br/>level calibration via keyword heuristics<br/>(EASY_SIGNALS / ADVANCED_SIGNALS / EXPERT_SIGNALS)

    alt internal count ≥ MIN_INTERNAL_TOTAL (20) AND each level ≥ MIN_PER_LEVEL (7)
        RAG-->>SVC: internal candidates only
    else gaps in coverage or internal failure
        RAG->>ADP: search_topic(topic, max_results)
        ADP->>REV: review(topic, advanced)
        Note over REV: ReviewAgent internally queries<br/>web search providers and uses<br/>LLM to score / format results
        REV->>WEB: web search via tools
        WEB->>SRC: provider call
        SRC-->>WEB: raw URLs + snippets
        WEB-->>REV: candidates
        REV-->>ADP: scored review dicts
        ADP-->>RAG: SearchMaterialsResponse (web)
        Note over RAG: dedupe + rank + balance levels
        RAG-->>SVC: merged internal + web candidates
    end

    SVC->>DB: persist TopicSearchResult + items (with rank, score, source)
    SVC-->>API: SearchMaterialsResponse
    API-->>FE: ranked materials with coverage_source
    FE-->>Student: render list, badges by source_type
```
