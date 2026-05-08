from __future__ import annotations

import json
import re
from io import BytesIO
from enum import Enum
from html import unescape
from urllib.error import URLError
from urllib.parse import urlparse
from urllib.request import Request, urlopen
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


class UnreadableLinkError(ExtractorError):
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


class ExtractedMaterialType(str, Enum):
    article = "article"
    video = "video"
    book = "book"
    documentation = "documentation"
    tutorial = "tutorial"
    pdf = "pdf"
    course = "course"
    other = "other"


class ExtractedMaterialMetadata(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    material_type: ExtractedMaterialType
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

    @field_validator("material_type", mode="before")
    @classmethod
    def normalize_material_type(cls, value: Any) -> Any:
        aliases = {
            "youtube": "video",
            "website": "documentation",
            "site": "documentation",
            "slides": "documentation",
            "slide": "documentation",
            "paper": "article",
            "textbook": "book",
        }
        if isinstance(value, str):
            return aliases.get(value.strip().lower(), value)
        return value

PROMPT = """
You are an Extractor Agent for Apollo, an educational platform.

You receive the text content, URL signals, or file content of a professor-uploaded educational material.
Your job is to extract metadata that helps Apollo organize, rank, and recommend this material.

Extract:
1. title
2. material_type: article, video, book, documentation, tutorial, pdf, course, or other
3. topics
4. tags
5. difficulty: beginner, intermediate, advanced, or expert
6. material_quality_score: integer 0 to 100
7. ease_of_understanding_score: integer 0 to 100
8. trust_score: integer 0 to 100
9. summary
10. short_reason

Important:
- format and level are dropdown fields in the frontend, so you must return only one of the allowed values.
- material_type must be one of: article, video, book, documentation, tutorial, pdf, course, other.
- level must be one of: beginner, intermediate, advanced, expert.
- Classify YouTube, Vimeo, lecture recordings, and video pages as video.
- Classify textbook/catalog/archive/book pages as book when they describe a book rather than an article.
- Classify official API docs, reference docs, and manuals as documentation.
- Classify step-by-step guides as tutorial.
- Classify structured MOOC/university course pages as course.

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
  "material_type": "article",
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

    def extract_metadata(self, upload: UploadFile | None = None, link: str | None = None) -> ExtractedMaterialMetadata:
        if upload is None and not link:
            raise UnsupportedMaterialTypeError("Upload a file or provide a link to extract metadata.")

        text = self.extract_text(upload) if upload is not None else self.extract_link_text(link or "")
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

    def extract_link_text(self, link: str) -> str:
        parsed = urlparse(link.strip())
        if parsed.scheme not in {"http", "https"} or not parsed.netloc:
            raise UnsupportedMaterialTypeError("Provide a valid http or https link.")

        try:
            request = Request(
                link,
                headers={
                    "User-Agent": "Mozilla/5.0 (compatible; ApolloExtractor/1.0)",
                    "Accept": "text/html,application/pdf,text/plain,*/*",
                },
            )
            with urlopen(request, timeout=15) as response:
                content_type = response.headers.get("content-type", "").lower()
                raw = response.read(5_000_000)
        except (OSError, URLError) as exc:
            raise UnreadableLinkError("The provided link could not be fetched.") from exc

        if "application/pdf" in content_type or parsed.path.lower().endswith(".pdf"):
            text = self._extract_pdf_bytes(raw)
        else:
            decoded = raw.decode("utf-8", errors="ignore")
            text = self._extract_html_text(decoded)

        text = self._clean_text(
            "\n".join(
                [
                    f"URL: {link}",
                    f"URL host: {parsed.netloc}",
                    f"Content type: {content_type or 'unknown'}",
                    text,
                ]
            )
        )
        if not text:
            raise EmptyExtractedTextError("No readable text could be extracted from this link.")
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

    def _extract_pdf_bytes(self, raw: bytes) -> str:
        try:
            from pypdf import PdfReader
        except ImportError as exc:
            raise UnreadablePDFError("PDF extraction requires the pypdf package.") from exc

        try:
            reader = PdfReader(BytesIO(raw))
            return "\n".join(page.extract_text() or "" for page in reader.pages)
        except Exception as exc:
            raise UnreadablePDFError("The linked PDF could not be read.") from exc

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

    def _extract_html_text(self, html: str) -> str:
        html = re.sub(r"(?is)<(script|style|noscript).*?>.*?</\1>", " ", html)
        title_match = re.search(r"(?is)<title[^>]*>(.*?)</title>", html)
        title = unescape(re.sub(r"\s+", " ", title_match.group(1)).strip()) if title_match else ""
        meta_values = re.findall(
            r'(?is)<meta[^>]+(?:name|property)=["\'](?:description|og:title|og:description|twitter:title|twitter:description)["\'][^>]+content=["\']([^"\']+)["\']',
            html,
        )
        body = re.sub(r"(?is)<[^>]+>", " ", html)
        body = unescape(re.sub(r"\s+", " ", body))
        return "\n".join([title, *meta_values, body[:20000]])

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
