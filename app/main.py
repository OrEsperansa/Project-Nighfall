from __future__ import annotations

import base64
import hashlib
import hmac
import json
from datetime import UTC, datetime
from uuid import uuid4

from fastapi import Depends, FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from starlette.exceptions import HTTPException as StarletteHTTPException

from .config import Settings, load_settings
from .data import (
    EVIDENCE_FILE_CONTENTS,
    TARGET_FILES,
    get_computer,
    list_computers as build_computer_list,
)
from .models import (
    ComputerDetail,
    ComputerSummary,
    EvidenceDownloadResponse,
    EvidencePackageRequest,
    EvidencePackageResponse,
    FileSearchRequest,
    FileSearchResponse,
    LoginRequest,
    LoginResponse,
)
from .security import create_access_token, verify_access_token
from .package_store import PackageStore


bearer = HTTPBearer(auto_error=False)


def api_error(status_code: int, error: str, message: str) -> HTTPException:
    return HTTPException(status_code=status_code, detail={"error": error, "message": message})


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or load_settings()
    package_store = PackageStore()

    app = FastAPI(
        title="NightFall Training API",
        summary="A fictional computer-intelligence API for Python requests training.",
        description=(
            "This API simulates a time-critical intelligence exercise. It does not "
            "connect to or control real computers. All operations are synchronous."
        ),
        version="1.0.0",
        root_path=settings.root_path,
        openapi_tags=[
            {"name": "Authentication", "description": "Obtain an access token."},
            {"name": "Computers", "description": "Discover and inspect simulated computers."},
            {"name": "Evidence", "description": "Search and collect simulated evidence."},
            {"name": "Operations", "description": "Container and Kubernetes health checks."},
        ],
    )
    app.state.settings = settings
    app.state.package_store = package_store

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(_: Request, exc: StarletteHTTPException) -> JSONResponse:
        if isinstance(exc.detail, dict) and "error" in exc.detail:
            content = exc.detail
        else:
            content = {"error": "REQUEST_FAILED", "message": str(exc.detail)}
        headers = getattr(exc, "headers", None)
        return JSONResponse(status_code=exc.status_code, content=content, headers=headers)

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        _: Request, exc: RequestValidationError
    ) -> JSONResponse:
        messages = []
        for error in exc.errors():
            location = ".".join(str(item) for item in error["loc"] if item != "body")
            messages.append(f"{location}: {error['msg']}" if location else error["msg"])
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={"error": "VALIDATION_ERROR", "message": "; ".join(messages)},
        )

    def require_auth(
        credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    ) -> dict:
        if credentials is None or credentials.scheme.lower() != "bearer":
            raise api_error(
                status.HTTP_401_UNAUTHORIZED,
                "INVALID_TOKEN",
                "A valid access token is required.",
            )
        return verify_access_token(credentials.credentials, settings)

    def require_computer(computer_id: str) -> tuple[dict, dict]:
        result = get_computer(
            computer_id,
            seed=settings.dataset_seed,
            interval_seconds=settings.computer_generation_interval_seconds,
            generated_count=settings.generated_computer_count,
        )
        if result is None:
            raise api_error(
                status.HTTP_404_NOT_FOUND,
                "COMPUTER_NOT_FOUND",
                "The requested computer does not exist.",
            )
        return result

    @app.get("/healthz", tags=["Operations"], include_in_schema=False)
    def healthz() -> dict:
        return {"status": "ok", "student_id": settings.student_id}

    @app.post(
        "/auth/login",
        response_model=LoginResponse,
        tags=["Authentication"],
        summary="Authenticate as the SIGIT operator",
    )
    def login(body: LoginRequest) -> LoginResponse:
        valid_username = hmac.compare_digest(body.username, settings.username)
        valid_password = hmac.compare_digest(body.password, settings.password)
        if not valid_username or not valid_password:
            raise api_error(
                status.HTTP_401_UNAUTHORIZED,
                "INVALID_CREDENTIALS",
                "The username or password is incorrect.",
            )
        return LoginResponse(
            access_token=create_access_token(settings),
            expires_in=settings.token_ttl_seconds,
        )

    @app.get(
        "/computers",
        response_model=list[ComputerSummary],
        tags=["Computers"],
        summary="List general information about all computers",
    )
    def list_computers(_: dict = Depends(require_auth)) -> list[dict]:
        return build_computer_list(
            seed=settings.dataset_seed,
            interval_seconds=settings.computer_generation_interval_seconds,
            generated_count=settings.generated_computer_count,
        )

    @app.get(
        "/computers/{computer_id}",
        response_model=ComputerDetail,
        tags=["Computers"],
        summary="Inspect one computer in detail",
    )
    def inspect_computer(computer_id: str, _: dict = Depends(require_auth)) -> dict:
        computer, details = require_computer(computer_id)
        return {**computer, **details}

    @app.post(
        "/computers/{computer_id}/file-searches",
        response_model=FileSearchResponse,
        tags=["Evidence"],
        summary="Search one computer and return the results immediately",
    )
    def search_files(
        computer_id: str,
        body: FileSearchRequest,
        _: dict = Depends(require_auth),
    ) -> FileSearchResponse:
        computer, details = require_computer(computer_id)
        if not computer["online"] or not details["remote_operations_available"]:
            raise api_error(
                status.HTTP_409_CONFLICT,
                "COMPUTER_UNAVAILABLE",
                "The computer is not available for remote operations.",
            )
        allowed_locations = set(details["recent_directories"])
        unknown_locations = [item for item in body.locations if item not in allowed_locations]
        if unknown_locations:
            raise api_error(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                "INVALID_SEARCH_LOCATION",
                "Search locations must come from the detailed computer response.",
            )

        matches: list[dict] = []
        if computer_id == "PC-104" and body.query.strip().upper() == "NIGHTFALL":
            selected_locations = tuple(f"{location}\\" for location in body.locations)
            matches = [
                item
                for item in TARGET_FILES
                if item["path"].startswith(selected_locations)
            ]

        return FileSearchResponse(
            computer_id=computer_id,
            query=body.query,
            files_scanned=184 if computer_id == "PC-104" else 76,
            matches=matches,
        )

    @app.post(
        "/computers/{computer_id}/evidence-packages",
        response_model=EvidencePackageResponse,
        status_code=status.HTTP_201_CREATED,
        tags=["Evidence"],
        summary="Create a ready-to-download evidence package",
    )
    def create_evidence_package(
        computer_id: str,
        body: EvidencePackageRequest,
        _: dict = Depends(require_auth),
    ) -> EvidencePackageResponse:
        computer, details = require_computer(computer_id)
        if not computer["online"] or "EVIDENCE_PACKAGE_CREATION" not in details["remote_operations"]:
            raise api_error(
                status.HTTP_409_CONFLICT,
                "PACKAGE_CREATION_UNAVAILABLE",
                "Evidence packages cannot be created on this computer.",
            )
        if body.package_name != "NIGHTFALL_EVIDENCE":
            raise api_error(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                "INVALID_PACKAGE_NAME",
                "The package name is not valid for this investigation.",
            )

        high_relevance = {
            item["file_id"]: item for item in TARGET_FILES if item["relevance"] == "HIGH"
        }
        invalid_ids = [file_id for file_id in body.file_ids if file_id not in high_relevance]
        if invalid_ids:
            raise api_error(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                "INVALID_FILE_SELECTION",
                "Evidence packages may contain only HIGH relevance search results.",
            )

        evidence = {
            "case": "NIGHTFALL",
            "operation_location": "SECTOR-12",
            "planned_time": "2042-06-18T21:30:00Z",
            "files": [EVIDENCE_FILE_CONTENTS[file_id] for file_id in body.file_ids],
            "status": "EVIDENCE_RECOVERED",
        }
        evidence_bytes = json.dumps(
            evidence, ensure_ascii=False, indent=2, sort_keys=True
        ).encode("utf-8")
        encoded_data = base64.b64encode(evidence_bytes).decode("ascii")
        checksum = hashlib.sha256(evidence_bytes).hexdigest()
        package_id = f"PKG-{uuid4().hex[:12].upper()}"
        total_size = sum(high_relevance[file_id]["size_bytes"] for file_id in body.file_ids)
        package_store.insert(
            {
                "package_id": package_id,
                "computer_id": computer_id,
                "package_name": body.package_name,
                "file_ids": list(body.file_ids),
                "total_size_bytes": total_size,
                "checksum": checksum,
                "encoded_data": encoded_data,
                "created_at": datetime.now(UTC).isoformat(),
            }
        )
        return EvidencePackageResponse(
            package_id=package_id,
            computer_id=computer_id,
            package_name=body.package_name,
            file_count=len(body.file_ids),
            total_size_bytes=total_size,
        )

    @app.get(
        "/computers/{computer_id}/evidence-packages/{package_id}/download",
        response_model=EvidenceDownloadResponse,
        tags=["Evidence"],
        summary="Download an evidence package with its SHA-256 checksum",
    )
    def download_evidence_package(
        computer_id: str,
        package_id: str,
        _: dict = Depends(require_auth),
    ) -> EvidenceDownloadResponse:
        require_computer(computer_id)
        package = package_store.get(package_id, computer_id)
        if package is None:
            raise api_error(
                status.HTTP_404_NOT_FOUND,
                "PACKAGE_NOT_FOUND",
                "The requested evidence package does not exist for this computer.",
            )
        return EvidenceDownloadResponse(
            package_id=package["package_id"],
            computer_id=package["computer_id"],
            package_name=package["package_name"],
            checksum=package["checksum"],
            data=package["encoded_data"],
        )

    return app


app = create_app()
