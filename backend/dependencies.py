from functools import lru_cache
from pathlib import Path

from fastapi import Cookie, Depends, Header, HTTPException, status

from backend.config import get_settings
from backend.services.auth_service import AuthService
from backend.services.storage_service import JsonStore
from backend.services.topic_service import TopicService


@lru_cache(maxsize=1)
def get_store() -> JsonStore:
    return JsonStore(Path(__file__).resolve().parent / "data" / "store.json")


@lru_cache(maxsize=1)
def get_auth_service() -> AuthService:
    settings = get_settings()
    return AuthService(store=get_store(), session_ttl_hours=settings.session_ttl_hours)


@lru_cache(maxsize=1)
def get_topic_service() -> TopicService:
    return TopicService(store=get_store())


def get_current_user(
    authorization: str | None = Header(default=None),
    session_token: str | None = Cookie(default=None, alias=get_settings().session_cookie_name),
    auth_service: AuthService = Depends(get_auth_service),
) -> dict:
    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization.removeprefix("Bearer ").strip()
    elif session_token:
        token = session_token

    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required.")

    user = auth_service.get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired session.")
    return user


def get_current_token(
    authorization: str | None = Header(default=None),
    session_token: str | None = Cookie(default=None, alias=get_settings().session_cookie_name),
) -> str:
    if authorization and authorization.startswith("Bearer "):
        return authorization.removeprefix("Bearer ").strip()
    if session_token:
        return session_token
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required.")
