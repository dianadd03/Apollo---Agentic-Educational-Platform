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
