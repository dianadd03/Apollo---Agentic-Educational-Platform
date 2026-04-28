import os
import json
from pprint import pprint
from typing import List, Optional, Literal
from pydantic import BaseModel, Field
from langchain_ollama import ChatOllama
from langchain.agents import create_agent
import numpy as np

from websearch import WebAgent
from langchain_google_genai import ChatGoogleGenerativeAI

TOPIC = "Algorithms"
MODEL = "gpt-oss:120b-cloud"

webAgent = WebAgent()


def get_web_results(topic: str, max_results_each: int = 5):
    """Get web results for a given topic: sites, videos, articles, books."""
    return webAgent.web_search_agent(topic, max_results_each)


def extract_web_site(link: str) -> str:
    """Extract the text from the given link"""
    return webAgent.web_extract_agent(link)


def level_from_scores(ease_of_understanding_score: int) -> Literal["beginner", "intermediate", "advanced", "expert"]:
    """Determine the level based on the ease_of_understanding score."""

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

You will receive a searched topic, and web results for that topic. You will then evaluate each result by assigning two integer scores from 0 to 100, and an overall level (beginner, intermediate, advanced, expert) based on the scores.

1. material_quality_score
- Measures how good the material is overall for the searched topic.
- Includes relevance, usefulness for learning, credibility, and title/source fit.
- Takes into account the format of the result (website, youtube, article, book) and how well it matches the user's learning intent.

2. ease_of_understanding_score
- Measures how easy the material is likely to understand for a typical learner.
- Infer this mainly from the title, type, and apparent educational format.
- Take into account whether there are prerequisites needed to understand the material, and whether it looks like beginner-friendly teaching material or advanced/specialized material.

Rules:
- Return integer scores only, 0 to 100.
- Be strict and realistic.
- Do not cluster all scores unless justified.
- A material can be relevant but difficult.
- A material can be easy but low quality.
- Judge mostly from topic, format, title, and URL.
- Use input search score only as a weak signal.
- Keep short_reason under 20 words.


USE INTERNAL REASONING FOR THE SCORES

Output format:
Return ONLY valid JSON.
No markdown.
No explanations outside JSON.

The JSON structure must be:

{
  "topic": "<topic>",
  "reviews": [
      {
      "format": "<format>",
      "title": "<title>",
      "url": "<url>",
      "material_quality_score": <integer 0-100>,
      "ease_of_understanding_score": <integer 0-100>,
      "level" : {"beginner", "intermediate", "advanced", "expert"}
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
            tools=[get_web_results, extract_web_site],
            system_prompt=self.system_prompt
        )

    def review(self, topic: str, advanced: bool = False):
        if advanced:
            web_results = get_web_results(topic, max_results_each=10)
        else:
            web_results = get_web_results(topic, max_results_each=5)

        result = self.agent.invoke(
            {"messages": [{"role": "user", "content": topic + " with web search results: " + json.dumps(web_results)}]}
        )

        jsonText = result["messages"][-1].content

        return json.loads(jsonText)["reviews"]