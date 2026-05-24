from tavily import TavilyClient


class WebAgent:
    api_key = "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"

    def __init__(self):
        self.client = TavilyClient(self.api_key)

    def web_extract_agent(self, link: str) -> str:
        try:
            extract = self.client.extract(link)

            results = extract.get("results", [])

            if not results:
                extract = self.client.extract(link, extract_depth="advanced")
                results = extract.get("results", [])

            if not results:
                print(f"[WebAgent] No extract results for link: {link}")
                return ""

            raw_content = results[0].get("raw_content")

            if not raw_content:
                print(f"[WebAgent] Empty raw_content for link: {link}")
                return ""

            return raw_content

        except Exception as e:
            print(f"[WebAgent] Extract failed for {link}: {e}")
            return ""

    def web_search_agent(self, topic: str, max_results_each=10):
        searches = [
            {"kind": "website", "query": f"{topic} programming OR computer science", "domains": [], "limit": max_results_each},
            {"kind": "youtube", "query": f"{topic} tutorial OR lecture computer science", "domains": ["youtube.com"], "limit": max(1, max_results_each // 3)},
            {"kind": "article", "query": f"{topic} research paper OR survey OR article computer science", "domains": [], "limit": max_results_each},
            {"kind": "book", "query": f"{topic} book OR textbook computer science", "domains": ["archive.org"], "limit": max_results_each},
        ]

        context = []

        for search in searches:
            response = self.client.search(
                query=search["query"],
                topic="general",
                search_depth="advanced",
                include_answer=False,
                include_domains=search["domains"],
                max_results=search.get("limit", max_results_each),
            )

            for item in response.get("results", []):
                context.append(
                    {
                        "kind": search["kind"],
                        "title": item.get("title"),
                        "url": item.get("url"),
                        "score": item.get("score"),
                    }
                )

        return context

