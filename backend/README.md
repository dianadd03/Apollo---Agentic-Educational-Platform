# Apollo Search Backend

This backend adds the LangChain-based candidate-material retrieval layer used by the existing Apollo frontend search bar.

## Run

```bash
pip install -r backend/requirements.txt
uvicorn backend.main:app --reload
```

## Endpoint

`POST /api/search-materials`

Request:

```json
{
  "topic": "Dynamic Programming"
}
```

Response:

```json
{
  "topic": "Dynamic Programming",
  "query_used": "Dynamic Programming educational resources tutorial documentation lecture notes videos books site:edu OR site:org OR site:com",
  "results": [
    {
      "title": "Top-Down and Bottom-Up DP Patterns",
      "url": "https://www.geeksforgeeks.org/dynamic-programming/",
      "type": "tutorial",
      "source": "geeksforgeeks.org",
      "snippet": "Dynamic Programming is a method for solving complex problems...",
      "reason_for_inclusion": "Retrieved candidate resource for Dynamic Programming from geeksforgeeks.org with tutorial-style coverage and topic-aligned snippet.",
      "confidence": 0.8
    }
  ],
  "search_metadata": {
    "timestamp": "2026-03-26T12:00:00Z",
    "total_results": 1,
    "notes": "Candidate results only. Final validation will be performed by a separate review agent."
  }
}
```

The `results` payload is already shaped so it can be forwarded later to a review agent without losing provenance, type, snippet, or retrieval rationale.
