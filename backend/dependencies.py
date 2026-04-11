from functools import lru_cache

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from backend.agents.search_agent import SearchAgent
from backend.config import get_settings
from backend.db.session import SessionLocal
from backend.services.auth_service import AuthService
from backend.services.material_search_service import MaterialSearchService
from backend.services.material_service import MaterialService
from backend.services.topic_service import TopicService
from backend.tools.web_search import WebSearchTool


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
def get_search_agent() -> SearchAgent:
    settings = get_settings()
    tool = WebSearchTool(settings)
    return SearchAgent(tool)


def get_material_service(db: Session = Depends(get_db)) -> MaterialService:
    return MaterialService(db=db)


def get_material_search_service(db: Session = Depends(get_db)) -> MaterialSearchService:
    settings = get_settings()
    return MaterialSearchService(db=db, search_agent=get_search_agent(), default_max_results=settings.max_results)


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
