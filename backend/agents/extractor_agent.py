from __future__ import annotations

import json
from enum import Enum
from typing import Any

from fastapi import UploadFile
from pydantic import BaseModel, Field, ValidationError, field_validator


MODEL = "gpt-oss:120b-cloud"
MAX_EXTRACTED_TEXT_CHARS = 24000


class ExtractorError(ValueError):
    pass


class UnsupportedMaterialTypeError(ExtractorError):
    pass


class UnreadablePDFError(ExtractorError):
    pass


class EmptyExtractedTextError(ExtractorError):
    pass


class InvalidLLMJSONError(ExtractorError):
    pass


class InvalidMetadataError(ExtractorError):
    pass


class ExtractedDifficulty(str, Enum):
    beginner = "beginner"
    intermediate = "intermediate"
    advanced = "advanced"
    expert = "expert"


class ExtractedMaterialMetadata(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    topics: list[str] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)
    difficulty: ExtractedDifficulty
    material_quality_score: int = Field(..., ge=0, le=100)
    ease_of_understanding_score: int = Field(..., ge=0, le=100)
    trust_score: int = Field(..., ge=0, le=100)
    summary: str = Field(..., min_length=1)
    short_reason: str = Field(..., min_length=1, max_length=500)

    @field_validator("title", "summary", "short_reason")
    @classmethod
    def strip_text(cls, value: str) -> str:
        return value.strip()

    @field_validator("topics", "tags")
    @classmethod
    def normalize_string_lists(cls, value: list[str]) -> list[str]:
        normalized: list[str] = []
        seen: set[str] = set()
        for item in value:
            cleaned = str(item).strip()
            key = cleaned.lower()
            if cleaned and key not in seen:
                normalized.append(cleaned)
                seen.add(key)
        return normalized

PROMPT = """
You are an Extractor Agent for Apollo, an educational platform.

You receive the text content of a professor-uploaded educational material.
Your job is to extract metadata that helps Apollo organize, rank, and recommend this material.

Extract:
1. title
2. topics
3. tags
4. difficulty: beginner, intermediate, advanced, or expert
5. material_quality_score: integer 0 to 100
6. ease_of_understanding_score: integer 0 to 100
7. trust_score: integer 0 to 100
8. summary
9. short_reason

Important:
- format and level are dropdown fields in the frontend, so you must return only one of the allowed values.
- format must be one of: website, youtube, article, book, documentation, tutorial, course, slides, pdf, other.
- level must be one of: beginner, intermediate, advanced, expert.

Scoring rules:
- material_quality_score measures educational quality, structure, completeness, examples, correctness, and usefulness.
- ease_of_understanding_score measures how easy the material is for a student to understand.
- ease_of_understanding_score must also consider the material format and density. Books, textbooks, research papers, academic courses, and long theoretical PDFs should usually receive a lower ease score than tutorials, slides, guides, or step-by-step lessons, even if they have high quality and trust.
- A book can have a high material_quality_score and trust_score, but still a medium or low ease_of_understanding_score because it may be dense, long, formal, or require prerequisites.
- level should usually be inferred from ease_of_understanding_score and prerequisite complexity.
- trust_score measures credibility. Since professor-uploaded materials are usually trusted, start medium-high, but adjust based on citations, references, author/institution info, academic structure, and content completeness.
- Be strict and realistic.
- Do not give everything 90+.
- If the material is short, unclear, incomplete, or unsupported, lower the scores.
- format and level should be inferred from the material itself and are allowed to overwrite existing dropdown values.
- Do not preserve previous values if the material clearly belongs to another category or level.
- Long books, textbooks, research-heavy PDFs, or theoretical academic materials should receive low ease_of_understanding scores even if they are high quality.
- A 300-500+ page technical textbook should usually have an ease_of_understanding_score around 20-50 unless it is explicitly beginner-friendly.
- Tutorials, visual guides, slides, and step-by-step educational content should usually have significantly higher ease scores.
- High quality does NOT mean easy to understand.
- High trust does NOT mean easy to understand.

Output rules:
- Return ONLY valid JSON.
- No markdown.
- No explanation outside JSON.
- Scores must be integers.
- Topics and tags must be arrays of strings.

Required JSON format:

{
  "title": "<title>",
  "topics": ["topic1", "topic2"],
  "tags": ["tag1", "tag2"],
  "difficulty": "beginner",
  "material_quality_score": 80,
  "ease_of_understanding_score": 75,
  "trust_score": 85,
  "summary": "<summary>",
  "short_reason": "<reason>"
}
"""


class ExtractorAgent:
    def __init__(self) -> None:
        from langchain_ollama import ChatOllama

        self.llm = ChatOllama(
            model=MODEL,
            temperature=0.1,
            metadata={"ls_model_name": "gpt-oss-120b-local"},
        )
        self.system_prompt = PROMPT

    def extract_metadata(self, upload: UploadFile) -> ExtractedMaterialMetadata:
        text = self.extract_text(upload)
        response = self.llm.invoke(
            [
                ("system", self.system_prompt),
                (
                    "user",
                    "Extract Apollo metadata from this uploaded material text. "
                    "Return only the required strict JSON.\n\n"
                    f"{text[:MAX_EXTRACTED_TEXT_CHARS]}",
                ),
            ]
        )
        json_text = self._message_content(response)
        return self._validate_llm_json(json_text)

    def extract_text(self, upload: UploadFile) -> str:
        filename = (upload.filename or "").lower()
        if filename.endswith(".pdf") or upload.content_type == "application/pdf":
            text = self._extract_pdf_text(upload)
        elif filename.endswith((".txt", ".md")) or upload.content_type in {"text/plain", "text/markdown"}:
            text = self._extract_plain_text(upload)
        else:
            raise UnsupportedMaterialTypeError("Unsupported file type. Upload a PDF, TXT, or Markdown file.")

        text = self._clean_text(text)
        if not text:
            raise EmptyExtractedTextError("No readable text could be extracted from this file.")
        return text

    def _extract_pdf_text(self, upload: UploadFile) -> str:
        try:
            from pypdf import PdfReader
        except ImportError as exc:
            raise UnreadablePDFError("PDF extraction requires the pypdf package.") from exc

        try:
            upload.file.seek(0)
            reader = PdfReader(upload.file)
            return "\n".join(page.extract_text() or "" for page in reader.pages)
        except Exception as exc:
            raise UnreadablePDFError("The uploaded PDF could not be read.") from exc
        finally:
            upload.file.seek(0)

    def _extract_plain_text(self, upload: UploadFile) -> str:
        upload.file.seek(0)
        raw = upload.file.read()
        upload.file.seek(0)
        if isinstance(raw, str):
            return raw
        return raw.decode("utf-8", errors="ignore")

    def _clean_text(self, text: str) -> str:
        lines = [line.strip() for line in text.splitlines()]
        return "\n".join(line for line in lines if line)

    def _message_content(self, response: Any) -> str:
        try:
            return str(response.content)
        except AttributeError as exc:
            raise InvalidLLMJSONError("Extractor agent returned an invalid response.") from exc

    def _validate_llm_json(self, json_text: str) -> ExtractedMaterialMetadata:
        try:
            payload = json.loads(json_text)
        except json.JSONDecodeError as exc:
            raise InvalidLLMJSONError("Extractor agent did not return valid JSON.") from exc

        try:
            return ExtractedMaterialMetadata.model_validate(payload)
        except ValidationError as exc:
            raise InvalidMetadataError("Extractor agent JSON failed metadata validation.") from exc
