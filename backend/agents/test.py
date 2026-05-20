import os
import json
from pprint import pprint
from typing import List, Optional, Literal
from pydantic import BaseModel, Field
from langchain_ollama import ChatOllama
from langchain.agents import create_agent
import numpy as np


from pprint import pprint;
from review_agent import ReviewAgent
import json

ReviewAgent = ReviewAgent()

pprint(ReviewAgent.review("Machine Learning", advanced=False))