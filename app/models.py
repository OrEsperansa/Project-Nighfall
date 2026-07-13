from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, field_validator


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: Literal["Bearer"] = "Bearer"
    expires_in: int


class ComputerSummary(BaseModel):
    id: str
    hostname: str
    operating_system: str
    online: bool
    activity_status: str
    risk_level: int
    tags: list[str]


class ProcessInfo(BaseModel):
    name: str
    pid: int


class ComputerDetail(ComputerSummary):
    logged_in_user: str | None
    ip_address: str
    remote_operations_available: bool
    running_processes: list[ProcessInfo]
    recent_directories: list[str]
    suspicious_indicators: list[str]
    remote_operations: list[str]


class FileSearchRequest(BaseModel):
    query: str = Field(min_length=1, max_length=100)
    locations: list[str] = Field(min_length=1, max_length=10)

    @field_validator("locations")
    @classmethod
    def locations_must_be_unique(cls, value: list[str]) -> list[str]:
        if len(value) != len(set(value)):
            raise ValueError("locations must not contain duplicates")
        return value


class FileMatch(BaseModel):
    file_id: str
    name: str
    path: str
    size_bytes: int
    modified_at: str
    relevance: Literal["HIGH", "LOW"]


class FileSearchResponse(BaseModel):
    computer_id: str
    query: str
    files_scanned: int
    matches: list[FileMatch]


class EvidencePackageRequest(BaseModel):
    package_name: str = Field(min_length=1, max_length=100)
    file_ids: list[str] = Field(min_length=1, max_length=20)

    @field_validator("file_ids")
    @classmethod
    def file_ids_must_be_unique(cls, value: list[str]) -> list[str]:
        if len(value) != len(set(value)):
            raise ValueError("file_ids must not contain duplicates")
        return value


class EvidencePackageResponse(BaseModel):
    package_id: str
    computer_id: str
    package_name: str
    status: Literal["READY"] = "READY"
    file_count: int
    total_size_bytes: int


class EvidenceDownloadResponse(BaseModel):
    package_id: str
    computer_id: str
    package_name: str
    encoding: Literal["base64"] = "base64"
    checksum_algorithm: Literal["sha256"] = "sha256"
    checksum: str
    data: str


class ErrorResponse(BaseModel):
    error: str
    message: str
