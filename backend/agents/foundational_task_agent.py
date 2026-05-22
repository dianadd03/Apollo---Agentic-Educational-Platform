import os
import json
from pprint import pprint
from langchain_ollama import ChatOllama

TOPIC = "Algorithms"
MODEL = "gpt-oss:120b-cloud"


PROMPT = """
You are a Foundational Task Agent for an educational platform.

You will receive a topic and create a list of foundational tasks that a learner should complete to master the topic.

A maximum of 5 foundational tasks should be created, and each task should be a clear and concise description of a problem that a learner can solve to build their understanding of the topic.

Each task should have:
- A short, descriptive title.
- A clear problem statement written for a beginner-to-intermediate student.
- The required function behavior, input shape, output shape, and important constraints inside the task text.
- No storytelling, no vague wording, and no hidden requirements.
- Two simple examples of inputs and expected outputs.
- The problem should be solvable by one function call.
- Prefer foundational, readable tasks over clever or advanced variants.

Output a JSON object with the following format:
{
  "topic": "<topic>",
  "foundational_tasks": [
      {
        "title": "<task title>",
        "task": "<task description>",
        "examples": [
            {
            "input": "<example input>",
            "output": "<example output>"
            }
        ]
      }
   ]
}
"""

class FoundationalTaskAgent:
    def __init__(self):
        self.llm = ChatOllama(
            model=MODEL,
            temperature=0.0,
            format="json",
            metadata={"ls_model_name": "gpt-oss-120b-local"}  
        )
        self.system_prompt = PROMPT

    def generate_foundational_tasks(self, topic: str):
        response = self.llm.invoke([
            ("system", self.system_prompt),
            ("user", "Create foundational tasks for the topic: " + topic)
        ])

        jsonText = response.content
        
        return json.loads(jsonText)
    
    
# fta = FoundationalTaskAgent()

# pprint(fta.generate_foundational_tasks(TOPIC))
