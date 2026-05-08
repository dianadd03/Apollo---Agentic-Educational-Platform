from tavily import TavilyClient
from pprint import pprint

api_key = "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"
client = TavilyClient(api_key)

def web_search_agent(topic: str, max_results_each = 10):
    searches = [
        {"kind": "website", "query": topic, "domains": []},
        {"kind": "youtube", "query": f"{topic} tutorial OR lecture", "domains": ["youtube.com"]},
        {"kind": "article", "query": f"{topic} research paper OR survey OR article", "domains": []},
        {"kind": "book", "query": f"{topic} book OR textbook", "domains": ["archive.org"]},
    ]

    context = []

    for s in searches:
        response = client.search(
            query=s["query"],
            topic="general",
            search_depth="advanced",
            include_answer=False,
            include_domains=s["domains"],
            max_results=max_results_each
        )

        for item in response.get("results", []):
            context.append({
                "kind": s["kind"],
                "title": item.get("title"),
                "url": item.get("url"),
                "score": item.get("score")
            })

    return context