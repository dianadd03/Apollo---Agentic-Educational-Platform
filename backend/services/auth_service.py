import base64
import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import uuid4

from backend.schemas.auth import AuthResponse, LoginRequest, RegisterRequest, UserResponse
from backend.services.storage_service import JsonStore


class AuthService:
    def __init__(self, store: JsonStore, session_ttl_hours: int) -> None:
        self._store = store
        self._session_ttl = timedelta(hours=session_ttl_hours)

    def register(self, payload: RegisterRequest) -> tuple[AuthResponse, str]:
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
        token, session = self._build_session(user["id"])

        def updater(current: dict[str, Any]) -> dict[str, Any]:
            current["users"].append(user)
            current["sessions"][token] = session
            return current

        self._store.update(updater)
        return AuthResponse(user=self._to_user_response(user)), token

    def login(self, payload: LoginRequest) -> tuple[AuthResponse, str]:
        data = self._store.read()
        normalized_email = payload.email.lower()
        user = next((item for item in data["users"] if item["email"].lower() == normalized_email), None)
        if not user or not self._verify_password(payload.password, user["password_hash"]):
            raise ValueError("Invalid email or password.")

        token, session = self._build_session(user["id"])
        upgraded_hash = None
        if self._needs_password_upgrade(user["password_hash"]):
            upgraded_hash = self._hash_password(payload.password)

        def updater(current: dict[str, Any]) -> dict[str, Any]:
            current["sessions"][token] = session
            if upgraded_hash is not None:
                stored_user = next((item for item in current["users"] if item["id"] == user["id"]), None)
                if stored_user is not None:
                    stored_user["password_hash"] = upgraded_hash
            return current

        self._store.update(updater)
        return AuthResponse(user=self._to_user_response(user)), token

    def get_user_by_token(self, token: str) -> dict[str, Any] | None:
        data = self._store.read()
        session = data["sessions"].get(token)
        if not session:
            return None
        expires_at = datetime.fromisoformat(session["expires_at"])
        if expires_at <= datetime.now(timezone.utc):
            self.revoke_session(token)
            return None
        return next((item for item in data["users"] if item["id"] == session["user_id"]), None)

    def revoke_session(self, token: str) -> None:
        def updater(current: dict[str, Any]) -> dict[str, Any]:
            current["sessions"].pop(token, None)
            return current

        self._store.update(updater)

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
        iterations = 600_000
        salt = secrets.token_bytes(16)
        digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations)
        encoded_salt = base64.b64encode(salt).decode("ascii")
        encoded_digest = base64.b64encode(digest).decode("ascii")
        return f"pbkdf2_sha256${iterations}${encoded_salt}${encoded_digest}"

    def _verify_password(self, password: str, stored_hash: str) -> bool:
        if stored_hash.startswith("pbkdf2_sha256$"):
            _, iterations, encoded_salt, encoded_digest = stored_hash.split("$", 3)
            salt = base64.b64decode(encoded_salt.encode("ascii"))
            expected = base64.b64decode(encoded_digest.encode("ascii"))
            digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, int(iterations))
            return hmac.compare_digest(digest, expected)
        legacy_digest = hashlib.sha256(password.encode("utf-8")).hexdigest()
        return hmac.compare_digest(legacy_digest, stored_hash)

    def _needs_password_upgrade(self, stored_hash: str) -> bool:
        return not stored_hash.startswith("pbkdf2_sha256$")

    def _build_session(self, user_id: str) -> tuple[str, dict[str, str]]:
        created_at = datetime.now(timezone.utc)
        expires_at = created_at + self._session_ttl
        token = secrets.token_urlsafe(32)
        session = {
            "user_id": user_id,
            "created_at": created_at.isoformat(),
            "expires_at": expires_at.isoformat(),
        }
        return token, session
