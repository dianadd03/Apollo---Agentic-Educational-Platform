import hashlib
import secrets
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.db.models import AppSession, TeacherAdminProfile, User, UserRole
from backend.schemas.auth import AuthResponse, LoginRequest, RegisterRequest, UserResponse


class AuthService:
    def __init__(self, db: Session) -> None:
        self._db = db

    def register(self, payload: RegisterRequest) -> AuthResponse:
        normalized_email = payload.email.lower()
        existing = self._db.scalar(select(User).where(User.email == normalized_email))
        if existing:
            raise ValueError("An account with this email already exists.")

        user = User(
            email=normalized_email,
            full_name=payload.name,
            password_hash=self._hash_password(payload.password),
            role=payload.role,
        )
        self._db.add(user)
        self._db.flush()

        if payload.role in {UserRole.professor, UserRole.admin}:
            self._db.add(
                TeacherAdminProfile(
                    user_id=user.id,
                    staff_role=payload.role.value,
                )
            )

        session = AppSession(token=secrets.token_urlsafe(32), user=user)
        self._db.add(session)
        self._db.commit()
        self._db.refresh(user)
        self._db.refresh(session)
        return AuthResponse(token=session.token, user=self._to_user_response(user))

    def login(self, payload: LoginRequest) -> AuthResponse:
        normalized_email = payload.email.lower()
        user = self._db.scalar(select(User).where(User.email == normalized_email))
        if not user or user.password_hash != self._hash_password(payload.password):
            raise ValueError("Invalid email or password.")

        session = AppSession(token=secrets.token_urlsafe(32), user_id=user.id)
        self._db.add(session)
        self._db.commit()
        self._db.refresh(session)
        return AuthResponse(token=session.token, user=self._to_user_response(user))

    def get_user_by_token(self, token: str) -> User | None:
        stmt = select(User).join(AppSession, AppSession.user_id == User.id).where(AppSession.token == token)
        return self._db.scalar(stmt)

    def to_user_response(self, user: User) -> UserResponse:
        return self._to_user_response(user)

    def _to_user_response(self, user: User) -> UserResponse:
        return UserResponse(
            id=str(user.id),
            name=user.full_name,
            email=user.email,
            role=user.role,
            created_at=user.created_at if isinstance(user.created_at, datetime) else datetime.now(timezone.utc),
        )

    def _hash_password(self, password: str) -> str:
        return hashlib.sha256(password.encode("utf-8")).hexdigest()
