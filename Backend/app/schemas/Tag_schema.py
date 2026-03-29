import re
from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

HEX_COLOR_PATTERN = re.compile(r"^#[0-9A-Fa-f]{6}$")


class TagSummaryResponse(BaseModel):
    tag_id: UUID
    name: str
    color: Optional[str] = None


class TagResponse(TagSummaryResponse):
    description: Optional[str] = None
    created_at: Optional[datetime] = None


class CreateTagRequest(BaseModel):
    name: str = Field(min_length=1, max_length=50)
    color: Optional[str] = Field(default=None, max_length=7)
    description: Optional[str] = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("Tag name cannot be blank")
        return normalized

    @field_validator("color")
    @classmethod
    def validate_color(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None

        normalized = value.strip().upper()
        if not normalized:
            return None

        if not HEX_COLOR_PATTERN.fullmatch(normalized):
            raise ValueError("Color must be in #RRGGBB format")

        return normalized

    @field_validator("description")
    @classmethod
    def normalize_description(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None

        normalized = value.strip()
        return normalized if normalized else None


class UpdateTagRequest(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=50)
    color: Optional[str] = Field(default=None, max_length=7)
    description: Optional[str] = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None

        normalized = value.strip()
        if not normalized:
            raise ValueError("Tag name cannot be blank")
        return normalized

    @field_validator("color")
    @classmethod
    def validate_color(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None

        normalized = value.strip().upper()
        if not normalized:
            return None

        if not HEX_COLOR_PATTERN.fullmatch(normalized):
            raise ValueError("Color must be in #RRGGBB format")

        return normalized

    @field_validator("description")
    @classmethod
    def normalize_description(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None

        normalized = value.strip()
        return normalized if normalized else None
