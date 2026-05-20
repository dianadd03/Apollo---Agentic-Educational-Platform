from functools import lru_cache
import sys
from pathlib import Path
from typing import Any

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from backend.agents.extractor_agent import ExtractorAgent
from backend.agents.problem_aggregator import ProblemAggregatorAgent
from backend.agents.problem_providers import AtCoderProvider, CodeforcesProvider
from backend.agents.rag_retrieval_agent import RagRetrievalAgent
from backend.config import get_settings
from backend.db.session import SessionLocal
from backend.services.auth_service import AuthService
from backend.services.material_search_service import MaterialSearchService
from backend.services.material_service import MaterialService
from backend.services.problem_service import ProblemService
from backend.services.review_search_adapter import ReviewSearchAdapter
from backend.services.topic_service import TopicService


def get_db():
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_auth_service(db: Session = Depends(get_db)) -> AuthService:
    return AuthService(db=db)


def get_topic_service(db: Session = Depends(get_db)) -> TopicService:
    return TopicService(db=db)


@lru_cache(maxsize=1)
def get_review_agent() -> Any:
    agents_dir = Path(__file__).resolve().parent / "agents"
    agents_dir_text = str(agents_dir)
    if agents_dir_text not in sys.path:
        sys.path.insert(0, agents_dir_text)

    from backend.agents.review_agent import ReviewAgent

    return ReviewAgent()


def get_material_service(db: Session = Depends(get_db)) -> MaterialService:
    return MaterialService(db=db)


def get_material_search_service(db: Session = Depends(get_db)) -> MaterialSearchService:
    settings = get_settings()
    review_search = ReviewSearchAdapter(
        review_agent=get_review_agent(),
        advanced_search=settings.review_advanced_search,
    )
    rag_agent = RagRetrievalAgent(db=db, review_search=review_search)
    return MaterialSearchService(
        db=db,
        review_search=review_search,
        default_max_results=settings.max_results,
        rag_retrieval_agent=rag_agent,
    )


@lru_cache(maxsize=1)
def get_extractor_agent() -> ExtractorAgent:
    return ExtractorAgent()


@lru_cache(maxsize=1)
def get_foundational_task_agent():
    from backend.agents.foundational_task_agent import FoundationalTaskAgent

    return FoundationalTaskAgent()


@lru_cache(maxsize=1)
def get_problem_aggregator() -> ProblemAggregatorAgent:
    settings = get_settings()
    providers = [CodeforcesProvider(), AtCoderProvider()]
    return ProblemAggregatorAgent(
        providers=providers,
        cache_ttl_hours=settings.problems_cache_ttl_hours,
        max_per_source=settings.problems_max_per_source,
        general_threshold=settings.problems_general_threshold,
        general_generator=None,
    )


def get_problem_service(db: Session = Depends(get_db)) -> ProblemService:
    settings = get_settings()
    return ProblemService(
        db=db,
        agent=get_problem_aggregator(),
        cache_ttl_hours=settings.problems_cache_ttl_hours,
        default_max_results=settings.problems_default_max_results,
    )



def get_current_user(
    authorization: str | None = Header(default=None),
    auth_service: AuthService = Depends(get_auth_service),
):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required.")

    token = authorization.removeprefix("Bearer ").strip()
    user = auth_service.get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired session.")
    return user
