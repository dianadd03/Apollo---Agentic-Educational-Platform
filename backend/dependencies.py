from functools import lru_cache
from pathlib import Path

from fastapi import Depends, Header, HTTPException, status

from backend.services.auth_service import AuthService
from backend.services.storage_service import JsonStore
from backend.services.topic_service import TopicService


@lru_cache(maxsize=1)
def get_store() -> JsonStore:
    return JsonStore(Path(__file__).resolve().parent / "data" / "store.json")


@lru_cache(maxsize=1)
def get_auth_service() -> AuthService:
    return AuthService(store=get_store())


@lru_cache(maxsize=1)
def get_topic_service() -> TopicService:
    return TopicService(store=get_store())


def get_current_user(
    authorization: str | None = Header(default=None),
    auth_service: AuthService = Depends(get_auth_service),
) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required.")

    token = authorization.removeprefix("Bearer ").strip()
    user = auth_service.get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired session.")
    return user
