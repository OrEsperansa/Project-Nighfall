from __future__ import annotations

import argparse
import base64
import hashlib
import hmac
import json
import os
import sys
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import requests


class NightFallError(RuntimeError):
    """An expected mission failure with a student-readable explanation."""


@dataclass(frozen=True)
class MissionResult:
    computer_id: str
    hostname: str
    relevant_files: int
    package_id: str
    checksum: str
    output_path: Path


class NightFallClient:
    def __init__(
        self,
        base_url: str,
        *,
        username: str,
        password: str,
        timeout: float = 10.0,
        ca_bundle: str | None = None,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.username = username
        self.password = password
        self.timeout = timeout
        self.session = requests.Session()
        self.session.headers.update({"Accept": "application/json"})
        self.verify: bool | str = ca_bundle if ca_bundle else True

    def close(self) -> None:
        self.session.close()

    def __enter__(self) -> NightFallClient:
        return self

    def __exit__(self, *_: object) -> None:
        self.close()

    def _url(self, path: str) -> str:
        return f"{self.base_url}/{path.lstrip('/')}"

    def _request(self, method: str, path: str, **kwargs: Any) -> Any:
        try:
            response = self.session.request(
                method,
                self._url(path),
                timeout=self.timeout,
                verify=self.verify,
                **kwargs,
            )
        except requests.RequestException as exc:
            raise NightFallError(f"Network request failed: {exc}") from exc

        if not response.ok:
            try:
                error = response.json()
            except ValueError:
                error = {}
            message = error.get("message", response.reason)
            code = error.get("error", "HTTP_ERROR")
            raise NightFallError(f"{response.status_code} {code}: {message}")

        try:
            return response.json()
        except ValueError as exc:
            raise NightFallError("The API returned a response that is not valid JSON.") from exc

    def authenticate(self) -> None:
        response = self._request(
            "POST",
            "auth/login",
            json={"username": self.username, "password": self.password},
        )
        token = response.get("access_token")
        if not isinstance(token, str) or not token:
            raise NightFallError("Authentication succeeded without returning an access token.")
        self.session.headers["Authorization"] = f"Bearer {token}"

    def find_target(self) -> dict[str, Any]:
        computers = self._request("GET", "computers")
        if not isinstance(computers, list):
            raise NightFallError("The computer list has an unexpected structure.")

        candidates = [
            computer
            for computer in computers
            if computer.get("online") is True
            and str(computer.get("operating_system", "")).lower().startswith("windows")
            and computer.get("activity_status") == "SUSPICIOUS"
            and isinstance(computer.get("risk_level"), int)
            and computer["risk_level"] >= 80
            and "CASE-NIGHTFALL" in computer.get("tags", [])
        ]
        if len(candidates) != 1:
            raise NightFallError(
                f"Expected exactly one NightFall target, but found {len(candidates)}."
            )
        return candidates[0]

    def inspect_target(self, computer_id: str) -> dict[str, Any]:
        detail = self._request("GET", f"computers/{computer_id}")
        if detail.get("online") is not True:
            raise NightFallError("The selected computer is no longer online.")
        if detail.get("remote_operations_available") is not True:
            raise NightFallError("Remote operations are not available on the selected computer.")
        locations = detail.get("recent_directories")
        if not isinstance(locations, list) or not locations:
            raise NightFallError("The selected computer did not provide search locations.")
        if "NIGHTFALL_KEYWORD_DETECTED" not in detail.get("suspicious_indicators", []):
            raise NightFallError("The selected computer has no NightFall indicator.")
        return detail

    def search_relevant_files(self, computer_id: str, locations: list[str]) -> list[dict]:
        result = self._request(
            "POST",
            f"computers/{computer_id}/file-searches",
            json={"query": "NIGHTFALL", "locations": locations},
        )
        matches = result.get("matches")
        if not isinstance(matches, list):
            raise NightFallError("The file-search response has no matches list.")
        relevant = [item for item in matches if item.get("relevance") == "HIGH"]
        if not relevant:
            raise NightFallError("No HIGH relevance NightFall files were found.")
        if any(not item.get("file_id") for item in relevant):
            raise NightFallError("A relevant search result is missing its file ID.")
        return relevant

    def create_package(self, computer_id: str, file_ids: list[str]) -> dict[str, Any]:
        package = self._request(
            "POST",
            f"computers/{computer_id}/evidence-packages",
            json={"package_name": "NIGHTFALL_EVIDENCE", "file_ids": file_ids},
        )
        if package.get("status") != "READY":
            raise NightFallError("The evidence package was not returned in READY state.")
        if package.get("file_count") != len(file_ids):
            raise NightFallError("The package does not contain every selected file.")
        if not package.get("package_id"):
            raise NightFallError("The package response is missing package_id.")
        return package

    def download_and_verify(
        self,
        computer_id: str,
        package_id: str,
    ) -> tuple[dict[str, Any], str]:
        download = self._request(
            "GET",
            f"computers/{computer_id}/evidence-packages/{package_id}/download",
        )
        if download.get("encoding") != "base64":
            raise NightFallError("The evidence uses an unsupported encoding.")
        if download.get("checksum_algorithm") != "sha256":
            raise NightFallError("The evidence uses an unsupported checksum algorithm.")

        try:
            evidence_bytes = base64.b64decode(download["data"], validate=True)
        except (KeyError, TypeError, ValueError) as exc:
            raise NightFallError("The evidence does not contain valid Base64 data.") from exc

        expected_checksum = download.get("checksum")
        calculated_checksum = hashlib.sha256(evidence_bytes).hexdigest()
        if not isinstance(expected_checksum, str) or not hmac.compare_digest(
            calculated_checksum, expected_checksum
        ):
            raise NightFallError("Evidence integrity verification failed.")

        try:
            evidence = json.loads(evidence_bytes.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError) as exc:
            raise NightFallError("The verified evidence is not valid UTF-8 JSON.") from exc
        if evidence.get("case") != "NIGHTFALL":
            raise NightFallError("The downloaded evidence belongs to another case.")
        if evidence.get("status") != "EVIDENCE_RECOVERED":
            raise NightFallError("The NightFall evidence is not marked as recovered.")
        return evidence, calculated_checksum


def save_json_atomically(data: dict[str, Any], output_path: Path) -> None:
    output_path = output_path.resolve()
    output_path.parent.mkdir(parents=True, exist_ok=True)
    temporary_path: Path | None = None
    try:
        with tempfile.NamedTemporaryFile(
            mode="w",
            encoding="utf-8",
            dir=output_path.parent,
            prefix=f".{output_path.name}.",
            suffix=".tmp",
            delete=False,
        ) as temporary_file:
            json.dump(data, temporary_file, ensure_ascii=False, indent=2, sort_keys=True)
            temporary_file.write("\n")
            temporary_path = Path(temporary_file.name)
        os.replace(temporary_path, output_path)
    except OSError as exc:
        if temporary_path is not None:
            temporary_path.unlink(missing_ok=True)
        raise NightFallError(f"Could not save the evidence file: {exc}") from exc


def run_mission(client: NightFallClient, output_path: Path) -> MissionResult:
    print("[1/6] Authenticating with SIGIT...")
    client.authenticate()

    print("[2/6] Discovering the NightFall target...")
    target = client.find_target()
    computer_id = target["id"]
    hostname = target["hostname"]
    print(f"      Target identified: {hostname}")

    print("[3/6] Inspecting the target computer...")
    detail = client.inspect_target(computer_id)
    locations = detail["recent_directories"]
    print(f"      Search locations discovered: {len(locations)}")

    print("[4/6] Searching for high-relevance NightFall files...")
    relevant_files = client.search_relevant_files(computer_id, locations)
    file_ids = [item["file_id"] for item in relevant_files]
    for item in relevant_files:
        print(f"      Evidence candidate: {item['name']}")

    print("[5/6] Creating the evidence package...")
    package = client.create_package(computer_id, file_ids)
    package_id = package["package_id"]
    print(f"      Package ready: {package_id}")

    print("[6/6] Downloading and verifying the evidence...")
    evidence, checksum = client.download_and_verify(computer_id, package_id)
    save_json_atomically(evidence, output_path)

    return MissionResult(
        computer_id=computer_id,
        hostname=hostname,
        relevant_files=len(relevant_files),
        package_id=package_id,
        checksum=checksum,
        output_path=output_path.resolve(),
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Complete the NightFall API exercise.")
    parser.add_argument(
        "--base-url",
        default=os.getenv("NIGHTFALL_BASE_URL", "http://127.0.0.1:8000"),
        help="API URL, including the OpenShift student route path when applicable.",
    )
    parser.add_argument(
        "--username",
        default=os.getenv("NIGHTFALL_USERNAME", "sigitattacker"),
    )
    parser.add_argument(
        "--password",
        default=os.getenv("NIGHTFALL_PASSWORD", "LamaLoKapara"),
    )
    parser.add_argument("--timeout", type=float, default=10.0)
    parser.add_argument("--ca-bundle", default=os.getenv("REQUESTS_CA_BUNDLE"))
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("nightfall_evidence.json"),
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if args.timeout <= 0:
        print("Mission failed: timeout must be positive.", file=sys.stderr)
        return 2
    try:
        with NightFallClient(
            args.base_url,
            username=args.username,
            password=args.password,
            timeout=args.timeout,
            ca_bundle=args.ca_bundle,
        ) as client:
            result = run_mission(client, args.output)
    except NightFallError as exc:
        print(f"Mission failed: {exc}", file=sys.stderr)
        return 1

    print("\nNIGHTFALL MISSION COMPLETED")
    print(f"Target: {result.hostname} ({result.computer_id})")
    print(f"Relevant files recovered: {result.relevant_files}")
    print(f"Package: {result.package_id}")
    print(f"SHA-256: {result.checksum}")
    print(f"Evidence saved to: {result.output_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
