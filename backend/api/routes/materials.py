from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status

from backend.agents.extractor_agent import (
    EmptyExtractedTextError,
    ExtractedMaterialMetadata,
    ExtractorAgent,
    InvalidLLMJSONError,
    InvalidMetadataError,
    UnreadableLinkError,
    UnreadablePDFError,
    UnsupportedMaterialTypeError,
)
from backend.db.models import MaterialType, TopicLevel, User
from backend.dependencies import get_current_user, get_extractor_agent, get_material_service
from backend.schemas.materials import (
    MaterialActivationRequest,
    MaterialCreateRequest,
    MaterialResponse,
    MaterialUpdateRequest,
    MaterialUploadRequest,
    MaterialVerificationRequest,
)
from backend.services.material_service import MaterialService

router = APIRouter(prefix="/api/materials", tags=["materials"])


def _split_csv(value: str | None) -> list[str]:
    if not value:
        return []
    return [item.strip() for item in value.split(",") if item.strip()]


@router.get("/managed", response_model=list[MaterialResponse])
def list_managed_materials(
    current_user: User = Depends(get_current_user),
    service: MaterialService = Depends(get_material_service),
) -> list[MaterialResponse]:
    try:
        return service.list_managed_materials(current_user)
    except PermissionError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc


@router.post("", response_model=MaterialResponse, status_code=status.HTTP_201_CREATED)
def create_material(
    payload: MaterialCreateRequest,
    current_user: User = Depends(get_current_user),
    service: MaterialService = Depends(get_material_service),
) -> MaterialResponse:
    try:
        return service.create_material(current_user, payload)
    except PermissionError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post("/upload", response_model=MaterialResponse, status_code=status.HTTP_201_CREATED)
def upload_material(
    canonical_name: str = Form(...),
    material_type: MaterialType = Form(...),
    difficulty: TopicLevel = Form(...),
    summary: str | None = Form(default=None),
    quality_score: float = Form(default=0.5),
    ease_score: float = Form(default=0.5),
    trust_score: float = Form(default=0.5),
    tags: str | None = Form(default=None),
    topic_titles: str | None = Form(default=None),
    is_published: bool = Form(default=True),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    service: MaterialService = Depends(get_material_service),
) -> MaterialResponse:
    try:
        payload = MaterialUploadRequest(
            canonical_name=canonical_name,
            material_type=material_type,
            difficulty=difficulty,
            summary=summary,
            quality_score=quality_score,
            ease_score=ease_score,
            trust_score=trust_score,
            tags=_split_csv(tags),
            topic_titles=_split_csv(topic_titles),
            is_published=is_published,
        )
        return service.upload_material(current_user, payload, file)
    except PermissionError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post("/extract-metadata", response_model=ExtractedMaterialMetadata)
def extract_material_metadata(
    file: UploadFile | None = File(default=None),
    link: str | None = Form(default=None),
    current_user: User = Depends(get_current_user),
    extractor_agent: ExtractorAgent = Depends(get_extractor_agent),
) -> ExtractedMaterialMetadata:
    if current_user.role.value not in {"professor", "admin"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only professor or admin accounts can extract material metadata.",
        )

    try:
        return extractor_agent.extract_metadata(upload=file, link=link)
    except UnsupportedMaterialTypeError as exc:
        raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail=str(exc)) from exc
    except UnreadableLinkError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except UnreadablePDFError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except EmptyExtractedTextError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    except (InvalidLLMJSONError, InvalidMetadataError) as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc


@router.put("/{material_id}", response_model=MaterialResponse)
def update_material(
    material_id: str,
    payload: MaterialUpdateRequest,
    current_user: User = Depends(get_current_user),
    service: MaterialService = Depends(get_material_service),
) -> MaterialResponse:
    try:
        return service.update_material(material_id, current_user, payload)
    except PermissionError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except ValueError as exc:
        status_code = status.HTTP_404_NOT_FOUND if "not found" in str(exc).lower() else status.HTTP_400_BAD_REQUEST
        raise HTTPException(status_code=status_code, detail=str(exc)) from exc


@router.delete("/{material_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_material(
    material_id: str,
    current_user: User = Depends(get_current_user),
    service: MaterialService = Depends(get_material_service),
) -> None:
    try:
        service.delete_material(material_id, current_user)
    except PermissionError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.patch("/{material_id}/verify", response_model=MaterialResponse)
def verify_material(
    material_id: str,
    payload: MaterialVerificationRequest,
    current_user: User = Depends(get_current_user),
    service: MaterialService = Depends(get_material_service),
) -> MaterialResponse:
    try:
        return service.set_material_verification(material_id, current_user, payload)
    except PermissionError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.patch("/{material_id}/active", response_model=MaterialResponse)
def set_material_active(
    material_id: str,
    payload: MaterialActivationRequest,
    current_user: User = Depends(get_current_user),
    service: MaterialService = Depends(get_material_service),
) -> MaterialResponse:
    try:
        return service.set_material_active(material_id, current_user, payload)
    except PermissionError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

