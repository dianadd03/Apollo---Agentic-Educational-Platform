import hashlib
import secrets
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from backend.schemas.auth import AuthResponse, LoginRequest, RegisterRequest, UserResponse
from backend.services.storage_service import JsonStore


class AuthService:
    def __init__(self, store: JsonStore) -> None:
        self._store = store

    def register(self, payload: RegisterRequest) -> AuthResponse:
        data = self._store.read()
        normalized_email = payload.email.lower()
        if any(user["email"].lower() == normalized_email for user in data["users"]):
            raise ValueError("An account with this email already exists.")

        user = {
            "id": str(uuid4()),
            "name": payload.name,
            "email": normalized_email,
            "password_hash": self._hash_password(payload.password),
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        token = secrets.token_urlsafe(32)

        def updater(current: dict[str, Any]) -> dict[str, Any]:
            current["users"].append(user)
            current["sessions"][token] = {
                "user_id": user["id"],
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
            return current

        self._store.update(updater)
        return AuthResponse(token=token, user=self._to_user_response(user))

    def login(self, payload: LoginRequest) -> AuthResponse:
        data = self._store.read()
        normalized_email = payload.email.lower()
        user = next((item for item in data["users"] if item["email"].lower() == normalized_email), None)
        if not user or user["password_hash"] != self._hash_password(payload.password):
            raise ValueError("Invalid email or password.")

        token = secrets.token_urlsafe(32)

        def updater(current: dict[str, Any]) -> dict[str, Any]:
            current["sessions"][token] = {
                "user_id": user["id"],
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
            return current

        self._store.update(updater)
        return AuthResponse(token=token, user=self._to_user_response(user))

    def get_user_by_token(self, token: str) -> dict[str, Any] | None:
        data = self._store.read()
        session = data["sessions"].get(token)
        if not session:
            return None
        return next((item for item in data["users"] if item["id"] == session["user_id"]), None)

    def to_user_response(self, user: dict[str, Any]) -> UserResponse:
        return self._to_user_response(user)

    def _to_user_response(self, user: dict[str, Any]) -> UserResponse:
        return UserResponse(
            id=user["id"],
            name=user["name"],
            email=user["email"],
            created_at=datetime.fromisoformat(user["created_at"]),
        )

    def _hash_password(self, password: str) -> str:
        return hashlib.sha256(password.encode("utf-8")).hexdigest()
