from __future__ import annotations

import base64
import hashlib
import json
from datetime import UTC, datetime, timedelta
from pathlib import Path

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.config import Settings
from app.data import generated_computers, generation_bucket, get_computer, list_computers
from app.main import create_app
from app.models import EvidencePackageRequest, FileSearchRequest
from app.security import create_access_token, verify_access_token


@pytest.fixture()
def client(tmp_path: Path):
    settings = Settings(
        student_id="student-test",
        username="sigitattacker",
        password="LamaLoKapara",
        token_secret="test-secret",
        token_ttl_seconds=3600,
        dataset_seed="shared-classroom-seed",
        computer_generation_interval_seconds=600,
        generated_computer_count=6,
        root_path="",
    )
    with TestClient(create_app(settings)) as test_client:
        yield test_client


@pytest.fixture()
def authorized_client(client: TestClient) -> TestClient:
    response = client.post(
        "/auth/login",
        json={"username": "sigitattacker", "password": "LamaLoKapara"},
    )
    assert response.status_code == 200
    client.headers["Authorization"] = f"Bearer {response.json()['access_token']}"
    return client


def test_login_rejects_invalid_credentials(client: TestClient):
    response = client.post(
        "/auth/login",
        json={"username": "sigitattacker", "password": "wrong"},
    )
    assert response.status_code == 401
    assert response.json()["error"] == "INVALID_CREDENTIALS"


def test_protected_endpoint_requires_token(client: TestClient):
    response = client.get("/computers")
    assert response.status_code == 401
    assert response.json()["error"] == "INVALID_TOKEN"


def test_list_and_detail_have_distinct_data(authorized_client: TestClient):
    computers = authorized_client.get("/computers")
    assert computers.status_code == 200
    target = next(item for item in computers.json() if "CASE-NIGHTFALL" in item["tags"])
    assert "recent_directories" not in target

    detail = authorized_client.get(f"/computers/{target['id']}")
    assert detail.status_code == 200
    assert detail.json()["recent_directories"]
    assert "NIGHTFALL_KEYWORD_DETECTED" in detail.json()["suspicious_indicators"]


def test_search_is_synchronous_and_uses_detail_locations(authorized_client: TestClient):
    detail = authorized_client.get("/computers/PC-104").json()
    response = authorized_client.post(
        "/computers/PC-104/file-searches",
        json={"query": "NIGHTFALL", "locations": detail["recent_directories"]},
    )
    assert response.status_code == 200
    body = response.json()
    assert "search_id" not in body
    assert {item["relevance"] for item in body["matches"]} == {"HIGH", "LOW"}


def test_search_rejects_an_invented_location(authorized_client: TestClient):
    response = authorized_client.post(
        "/computers/PC-104/file-searches",
        json={"query": "NIGHTFALL", "locations": [r"C:\Invented"]},
    )
    assert response.status_code == 422
    assert response.json()["error"] == "INVALID_SEARCH_LOCATION"


def test_complete_evidence_flow(authorized_client: TestClient):
    detail = authorized_client.get("/computers/PC-104").json()
    search = authorized_client.post(
        "/computers/PC-104/file-searches",
        json={"query": "NIGHTFALL", "locations": detail["recent_directories"]},
    ).json()
    high_ids = [item["file_id"] for item in search["matches"] if item["relevance"] == "HIGH"]

    package_response = authorized_client.post(
        "/computers/PC-104/evidence-packages",
        json={"package_name": "NIGHTFALL_EVIDENCE", "file_ids": high_ids},
    )
    assert package_response.status_code == 201
    package = package_response.json()
    assert package["status"] == "READY"
    assert package["file_count"] == len(high_ids)

    download_response = authorized_client.get(
        f"/computers/PC-104/evidence-packages/{package['package_id']}/download"
    )
    assert download_response.status_code == 200
    download = download_response.json()
    decoded = base64.b64decode(download["data"])
    assert hashlib.sha256(decoded).hexdigest() == download["checksum"]
    evidence = json.loads(decoded.decode("utf-8"))
    assert evidence["case"] == "NIGHTFALL"
    assert evidence["status"] == "EVIDENCE_RECOVERED"


def test_package_rejects_low_relevance_file(authorized_client: TestClient):
    response = authorized_client.post(
        "/computers/PC-104/evidence-packages",
        json={"package_name": "NIGHTFALL_EVIDENCE", "file_ids": ["FILE-413"]},
    )
    assert response.status_code == 422
    assert response.json()["error"] == "INVALID_FILE_SELECTION"


def test_package_is_not_visible_under_another_computer(authorized_client: TestClient):
    package = authorized_client.post(
        "/computers/PC-104/evidence-packages",
        json={"package_name": "NIGHTFALL_EVIDENCE", "file_ids": ["FILE-781"]},
    ).json()
    response = authorized_client.get(
        f"/computers/PC-208/evidence-packages/{package['package_id']}/download"
    )
    assert response.status_code == 404


def test_openapi_exposes_only_the_synchronous_exercise_flow(client: TestClient):
    paths = set(client.get("/openapi.json").json()["paths"])
    assert paths == {
        "/auth/login",
        "/computers",
        "/computers/{computer_id}",
        "/computers/{computer_id}/file-searches",
        "/computers/{computer_id}/evidence-packages",
        "/computers/{computer_id}/evidence-packages/{package_id}/download",
    }
    assert not any("reset" in path or "status" in path for path in paths)


def test_seeded_computers_are_unified_and_change_with_time():
    start = datetime(2026, 7, 13, 12, 0, tzinfo=UTC)
    arguments = {
        "seed": "same-seed-for-every-student",
        "interval_seconds": 600,
        "generated_count": 6,
    }
    first_pod = list_computers(**arguments, now=start)
    second_pod = list_computers(**arguments, now=start)
    later = list_computers(**arguments, now=start + timedelta(minutes=10))

    assert first_pod == second_pod
    assert first_pod[:4] == later[:4]
    assert first_pod[5:] != later[5:]
    assert len(first_pod) == len(later) == 10


def test_package_state_is_cleared_when_the_application_restarts(tmp_path: Path):
    settings = Settings(
        student_id="restart-test",
        username="sigitattacker",
        password="LamaLoKapara",
        token_secret="restart-secret",
        token_ttl_seconds=3600,
        dataset_seed="shared-classroom-seed",
        computer_generation_interval_seconds=600,
        generated_computer_count=6,
        root_path="",
    )

    with TestClient(create_app(settings)) as first_client:
        login = first_client.post(
            "/auth/login",
            json={"username": "sigitattacker", "password": "LamaLoKapara"},
        ).json()
        first_client.headers["Authorization"] = f"Bearer {login['access_token']}"
        package = first_client.post(
            "/computers/PC-104/evidence-packages",
            json={"package_name": "NIGHTFALL_EVIDENCE", "file_ids": ["FILE-781"]},
        ).json()

    with TestClient(create_app(settings)) as restarted_client:
        login = restarted_client.post(
            "/auth/login",
            json={"username": "sigitattacker", "password": "LamaLoKapara"},
        ).json()
        restarted_client.headers["Authorization"] = f"Bearer {login['access_token']}"
        response = restarted_client.get(
            f"/computers/PC-104/evidence-packages/{package['package_id']}/download"
        )
        assert response.status_code == 404


def test_open_shift_route_prefix_serves_swagger_and_api():
    prefix = "/students/student-1-secretroute"
    settings = Settings(
        student_id="student-1",
        username="sigitattacker",
        password="LamaLoKapara",
        token_secret="route-secret",
        token_ttl_seconds=3600,
        dataset_seed="shared-classroom-seed",
        computer_generation_interval_seconds=600,
        generated_computer_count=6,
        root_path=prefix,
    )
    with TestClient(create_app(settings)) as routed_client:
        assert routed_client.get(f"{prefix}/docs").status_code == 200
        assert routed_client.get(f"{prefix}/openapi.json").status_code == 200
        assert routed_client.get(f"{prefix}/healthz").status_code == 200


def test_unknown_route_and_computer_return_clear_errors(authorized_client: TestClient):
    unknown_route = authorized_client.get("/not-an-api-route")
    assert unknown_route.status_code == 404
    assert unknown_route.json()["error"] == "REQUEST_FAILED"

    unknown_computer = authorized_client.get("/computers/PC-DOES-NOT-EXIST")
    assert unknown_computer.status_code == 404
    assert unknown_computer.json()["error"] == "COMPUTER_NOT_FOUND"


def test_offline_computer_rejects_search(authorized_client: TestClient):
    response = authorized_client.post(
        "/computers/PC-315/file-searches",
        json={"query": "NIGHTFALL", "locations": ["C:\\Anything"]},
    )
    assert response.status_code == 409
    assert response.json()["error"] == "COMPUTER_UNAVAILABLE"


def test_non_target_computer_cannot_create_package(authorized_client: TestClient):
    response = authorized_client.post(
        "/computers/PC-208/evidence-packages",
        json={"package_name": "NIGHTFALL_EVIDENCE", "file_ids": ["FILE-781"]},
    )
    assert response.status_code == 409
    assert response.json()["error"] == "PACKAGE_CREATION_UNAVAILABLE"


def test_package_name_must_match_investigation(authorized_client: TestClient):
    response = authorized_client.post(
        "/computers/PC-104/evidence-packages",
        json={"package_name": "WRONG_CASE", "file_ids": ["FILE-781"]},
    )
    assert response.status_code == 422
    assert response.json()["error"] == "INVALID_PACKAGE_NAME"


@pytest.mark.parametrize(
    ("path", "body"),
    [
        (
            "/computers/PC-104/file-searches",
            {"query": "NIGHTFALL", "locations": ["same", "same"]},
        ),
        (
            "/computers/PC-104/evidence-packages",
            {"package_name": "NIGHTFALL_EVIDENCE", "file_ids": ["FILE-781", "FILE-781"]},
        ),
    ],
)
def test_duplicate_request_values_return_validation_error(
    authorized_client: TestClient, path: str, body: dict
):
    response = authorized_client.post(path, json=body)
    assert response.status_code == 422
    assert response.json()["error"] == "VALIDATION_ERROR"


def test_model_validators_reject_duplicate_values_directly():
    with pytest.raises(ValidationError):
        FileSearchRequest(query="NIGHTFALL", locations=["same", "same"])
    with pytest.raises(ValidationError):
        EvidencePackageRequest(
            package_name="NIGHTFALL_EVIDENCE",
            file_ids=["FILE-781", "FILE-781"],
        )


def test_generated_computer_validation_and_dynamic_lookup():
    now = datetime(2026, 7, 13, 12, 0, tzinfo=UTC)
    with pytest.raises(ValueError, match="interval"):
        generation_bucket(now, 0)
    with pytest.raises(ValueError, match="count"):
        generated_computers(seed="seed", interval_seconds=600, count=-1, now=now)

    generated = generated_computers(seed="seed", interval_seconds=600, count=2, now=now)
    dynamic_id = generated[0][0]["id"]
    found = get_computer(
        dynamic_id,
        seed="seed",
        interval_seconds=600,
        generated_count=2,
        now=now,
    )
    assert found == generated[0]
    assert list_computers(
        seed="seed", interval_seconds=600, generated_count=0, now=now
    )[:4]


def test_token_rejects_tampering_expiry_and_wrong_identity(monkeypatch: pytest.MonkeyPatch):
    settings = Settings(
        student_id="student-security",
        username="sigitattacker",
        password="LamaLoKapara",
        token_secret="security-secret",
        token_ttl_seconds=3600,
        dataset_seed="seed",
        computer_generation_interval_seconds=600,
        generated_computer_count=2,
        root_path="",
    )
    token = create_access_token(settings)
    assert verify_access_token(token, settings)["student_id"] == "student-security"

    tampered = f"{token[:-1]}{'A' if token[-1] != 'A' else 'B'}"
    with pytest.raises(HTTPException):
        verify_access_token(tampered, settings)
    with pytest.raises(HTTPException):
        verify_access_token("not-a-token", settings)

    wrong_user = Settings(**{**settings.__dict__, "username": "different-user"})
    with pytest.raises(HTTPException):
        verify_access_token(token, wrong_user)
    wrong_student = Settings(**{**settings.__dict__, "student_id": "different-student"})
    with pytest.raises(HTTPException):
        verify_access_token(token, wrong_student)

    monkeypatch.setattr("app.security.time.time", lambda: 9_999_999_999)
    with pytest.raises(HTTPException):
        verify_access_token(token, settings)
