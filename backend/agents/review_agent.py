import os
import json
from pprint import pprint
from typing import List, Optional, Literal
from pydantic import BaseModel, Field
from langchain_ollama import ChatOllama
from langchain.agents import create_agent
import numpy as np

from web_agent import WebAgent
MODEL = "gpt-oss:120b-cloud"

webAgent = WebAgent()

def extract_web_site(link: str) -> str:
    """Extract information from the given link"""
    return webAgent.web_extract_agent(link)


def level_from_score(ease_of_understanding_score: int) -> Literal["beginner", "intermediate", "advanced", "expert"]:
    if ease_of_understanding_score >= 85:
        return "beginner"
    elif ease_of_understanding_score >= 55:
        return "intermediate"
    elif ease_of_understanding_score >= 35:
        return "advanced"
    else:
        return "expert"


# {
#   "topic": "<topic>",
#   "reviews": [
#       {
#       "format": "<format>",
#       "title": "<title>",
#       "url": "<url>",
#       "material_quality_score": <integer 0-100>,
#       "ease_of_understanding_score": <integer 0-100>,
#       "level" : {"beginner", "intermediate", "advanced", "expert"}
#       }
#   ]
# }

PROMPT = """
You are a Review Agent for an educational platform.

You will receive:
- a searched topic
- a list of web results for that topic

Your task is to evaluate each result and assign two integer scores from 0 to 100.

Scoring dimensions

1. material_quality_score
- Rates how strong the material is overall for the requested topic.
- Considers topical relevance, educational usefulness, source credibility, and consistency between the title/source and the likely content.
- Also considers whether the material format is a good fit for the user’s likely learning intent.

2. ease_of_understanding_score
- Rates how accessible the material is for a typical learner.
- Inferred mainly from the title, material type, presentation style, and likely difficulty level.
- Considers prerequisite knowledge, conceptual density, and whether the material appears to explain concepts clearly and progressively.

Rules
- Return integer scores only, from 0 to 100.
- Be strict and realistic.
- Do not cluster scores unless clearly justified by the inputs.
- A result can be high quality but difficult.
- A result can be easy to understand but low quality.
- Use only the provided tools for extraction.
- Judge primarily from the provided topic, format, title, URL, and any provided snippet or metadata.
- If a result seems weak, unclear, or suspiciously low-quality, use extraction to reassess it before assigning final scores.
- Treat the input search score only as a weak signal.
- Do not include duplicate links in the final reviews.
- If duplicate links appear, keep only the one with the highest material_quality_score.
- Do not output reasoning or explanations outside the JSON.

Output format
Return only valid JSON.

The JSON structure must be:

{
  "topic": "<topic>",
  "reviews": [
    {
      "format": "<format>",
      "title": "<title>",
      "url": "<url>",
      "material_quality_score": <integer 0-100>,
      "ease_of_understanding_score": <integer 0-100>
    }
  ]
}
"""


class ReviewAgent:
    def __init__(self):
        llm = llm = ChatOllama(
            model=MODEL,
            temperature=0.1,
            metadata={"ls_model_name": "gpt-oss-120b-local"}
        )
        self.system_prompt = PROMPT
        self.agent = create_agent(
            model=llm,
            tools=[extract_web_site],
            system_prompt=self.system_prompt
        )

    def review(self, topic: str, advanced: bool = False):
        if advanced:
            web_results = webAgent.web_search_agent(topic, max_results_each=5)
        else:
            web_results = webAgent.web_search_agent(topic, max_results_each=3)

        result = self.agent.invoke(
            {"messages": [{"role": "user", "content": "TOPIC: " + topic + " with web search results: " + json.dumps(web_results)}]}
        )

        jsonText = result["messages"][-1].content

        reviews = json.loads(jsonText)["reviews"]
        reviews = [r for r in reviews if r["material_quality_score"] >= 20]
        for r in reviews:
            r["level"] = level_from_score(r["ease_of_understanding_score"])
        return reviews
        