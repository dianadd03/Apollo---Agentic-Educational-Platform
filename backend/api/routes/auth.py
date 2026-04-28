from fastapi import APIRouter, Depends, HTTPException, status

from backend.db.models import User
from backend.dependencies import get_auth_service, get_current_user
from backend.schemas.auth import AuthResponse, LoginRequest, RegisterRequest, UserResponse
from backend.services.auth_service import AuthService

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, auth_service: AuthService = Depends(get_auth_service)) -> AuthResponse:
    try:
        return auth_service.register(payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest, auth_service: AuthService = Depends(get_auth_service)) -> AuthResponse:
    try:
        return auth_service.login(payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc


@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user), auth_service: AuthService = Depends(get_auth_service)) -> UserResponse:
    return auth_service.to_user_response(current_user)
