"""Map a free-form topic title into canonical platform tags.

Static mapping for the MVP. Extensible later via topic.metadata_json or LLM.
"""

from __future__ import annotations

import re

TOPIC_TO_TAGS: dict[str, list[str]] = {
    "dynamic programming": ["dp", "dynamic-programming"],
    "dp": ["dp", "dynamic-programming"],
    "graphs": ["graphs", "graph", "dfs and similar", "shortest paths"],
    "graph": ["graphs", "graph", "dfs and similar"],
    "trees": ["trees", "tree", "dfs and similar"],
    "backtracking": ["brute force", "backtracking", "dfs and similar"],
    "greedy": ["greedy"],
    "binary search": ["binary search"],
    "sorting": ["sortings", "sorting"],
    "strings": ["strings", "string"],
    "math": ["math", "number theory"],
    "number theory": ["number theory", "math"],
    "geometry": ["geometry"],
    "data structures": ["data structures"],
    "two pointers": ["two pointers"],
    "sliding window": ["two pointers", "sliding-window"],
    "hash": ["hashing", "hash-table"],
    "hash table": ["hashing", "hash-table"],
    "recursion": ["dfs and similar", "recursion"],
    "bit manipulation": ["bitmasks", "bit-manipulation"],
    "bitmasks": ["bitmasks", "bit-manipulation"],
    "divide and conquer": ["divide and conquer"],
    "linked list": ["data structures", "linked-list"],
    "stack": ["data structures", "stack"],
    "queue": ["data structures", "queue"],
    "heap": ["data structures", "heap-priority-queue"],
    "priority queue": ["data structures", "heap-priority-queue"],
    "trie": ["string suffix structures", "trie"],
    "segment tree": ["data structures"],
    "fenwick tree": ["data structures"],
    "union find": ["dsu"],
    "disjoint set": ["dsu"],
    "dfs": ["dfs and similar"],
    "bfs": ["dfs and similar", "shortest paths"],
}


def _normalize_key(text: str) -> str:
    cleaned = re.sub(r"[^a-z0-9 ]+", "", text.lower())
    return re.sub(r"\s+", " ", cleaned).strip()


def topic_to_tags(topic: str) -> list[str]:
    """Return canonical tags for a topic. Falls back to the lowercased topic itself."""
    key = _normalize_key(topic)
    if not key:
        return []
    if key in TOPIC_TO_TAGS:
        return list(TOPIC_TO_TAGS[key])
    for known_key, tags in TOPIC_TO_TAGS.items():
        if known_key in key or key in known_key:
            return list(tags)
    return [key]
