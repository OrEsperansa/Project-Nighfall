from __future__ import annotations

import hashlib
from datetime import UTC, datetime


BASE_COMPUTERS = [
    {
        "id": "PC-104",
        "hostname": "OPS-WIN-07",
        "operating_system": "Windows 11",
        "online": True,
        "activity_status": "SUSPICIOUS",
        "risk_level": 92,
        "tags": ["CASE-NIGHTFALL"],
    },
    {
        "id": "PC-208",
        "hostname": "OFFICE-LNX-02",
        "operating_system": "Ubuntu 24.04",
        "online": True,
        "activity_status": "NORMAL",
        "risk_level": 18,
        "tags": [],
    },
    {
        "id": "PC-315",
        "hostname": "FIN-WIN-03",
        "operating_system": "Windows 11",
        "online": False,
        "activity_status": "UNKNOWN",
        "risk_level": 67,
        "tags": ["FINANCE"],
    },
    {
        "id": "PC-422",
        "hostname": "COMMS-WIN-12",
        "operating_system": "Windows 10",
        "online": True,
        "activity_status": "SUSPICIOUS",
        "risk_level": 81,
        "tags": ["CASE-EMBER"],
    },
]

BASE_COMPUTER_DETAILS = {
    "PC-104": {
        "logged_in_user": "field_operator",
        "ip_address": "10.40.8.27",
        "remote_operations_available": True,
        "running_processes": [
            {"name": "archive_manager.exe", "pid": 4812},
            {"name": "secure_chat.exe", "pid": 5128},
            {"name": "powershell.exe", "pid": 5440},
        ],
        "recent_directories": [
            r"C:\Users\field_operator\Documents",
            r"C:\Operations\Archive",
        ],
        "suspicious_indicators": [
            "NIGHTFALL_KEYWORD_DETECTED",
            "RECENT_ARCHIVE_ACTIVITY",
        ],
        "remote_operations": ["FILE_SEARCH", "EVIDENCE_PACKAGE_CREATION"],
    },
    "PC-208": {
        "logged_in_user": "office_service",
        "ip_address": "10.40.3.18",
        "remote_operations_available": True,
        "running_processes": [
            {"name": "sshd", "pid": 818},
            {"name": "python3", "pid": 1442},
        ],
        "recent_directories": ["/srv/reports", "/home/office_service"],
        "suspicious_indicators": [],
        "remote_operations": ["FILE_SEARCH"],
    },
    "PC-315": {
        "logged_in_user": None,
        "ip_address": "10.40.6.33",
        "remote_operations_available": False,
        "running_processes": [],
        "recent_directories": [],
        "suspicious_indicators": ["HOST_OFFLINE"],
        "remote_operations": [],
    },
    "PC-422": {
        "logged_in_user": "comms_admin",
        "ip_address": "10.40.9.51",
        "remote_operations_available": True,
        "running_processes": [
            {"name": "message_router.exe", "pid": 2276},
            {"name": "browser.exe", "pid": 3104},
        ],
        "recent_directories": [r"C:\Comms\Logs", r"C:\Users\comms_admin\Desktop"],
        "suspicious_indicators": ["ENCRYPTED_MESSAGE_TRAFFIC"],
        "remote_operations": ["FILE_SEARCH"],
    },
}

TARGET_FILES = [
    {
        "file_id": "FILE-781",
        "name": "nightfall_plan.json",
        "path": r"C:\Operations\Archive\nightfall_plan.json",
        "size_bytes": 1842,
        "modified_at": "2042-06-18T17:42:00Z",
        "relevance": "HIGH",
    },
    {
        "file_id": "FILE-992",
        "name": "nightfall_notes.txt",
        "path": r"C:\Users\field_operator\Documents\nightfall_notes.txt",
        "size_bytes": 731,
        "modified_at": "2042-06-18T17:51:00Z",
        "relevance": "HIGH",
    },
    {
        "file_id": "FILE-413",
        "name": "nightfall_old_schedule.txt",
        "path": r"C:\Users\field_operator\Documents\nightfall_old_schedule.txt",
        "size_bytes": 504,
        "modified_at": "2042-05-02T09:10:00Z",
        "relevance": "LOW",
    },
]

EVIDENCE_FILE_CONTENTS = {
    "FILE-781": {
        "name": "nightfall_plan.json",
        "content": {
            "operation_location": "SECTOR-12",
            "planned_time": "2042-06-18T21:30:00Z",
            "objective": "DISRUPT_EMERGENCY_POWER",
            "status": "ACTIVE",
        },
    },
    "FILE-992": {
        "name": "nightfall_notes.txt",
        "content": "Final coordination confirmed. Emergency grid access window unchanged.",
    },
    "FILE-413": {
        "name": "nightfall_old_schedule.txt",
        "content": "ARCHIVED: superseded planning notes.",
    },
}


GENERATED_HOST_PREFIXES = ["OPS", "LOG", "FIELD", "ARCHIVE", "COMMS", "OFFICE"]
GENERATED_OS = ["Windows 11", "Windows 10", "Ubuntu 24.04", "Debian 13"]
GENERATED_ACTIVITIES = ["NORMAL", "NORMAL", "REVIEW", "SUSPICIOUS"]
GENERATED_TAGS = [[], ["LOGISTICS"], ["ARCHIVE"], ["CASE-EMBER"], ["FINANCE"]]


def _number(digest: bytes, start: int, length: int = 2) -> int:
    return int.from_bytes(digest[start : start + length], "big")


def _generated_computer(seed: str, bucket: int) -> tuple[dict, dict]:
    digest = hashlib.sha256(f"{seed}:{bucket}".encode("utf-8")).digest()
    numeric_id = 500 + _number(digest, 0) % 8999
    computer_id = f"PC-D{bucket:X}-{digest[0]:02X}"
    prefix = GENERATED_HOST_PREFIXES[digest[2] % len(GENERATED_HOST_PREFIXES)]
    operating_system = GENERATED_OS[digest[3] % len(GENERATED_OS)]
    online = digest[4] % 5 != 0
    activity = GENERATED_ACTIVITIES[digest[5] % len(GENERATED_ACTIVITIES)]
    risk = 10 + digest[6] % 76
    tags = GENERATED_TAGS[digest[7] % len(GENERATED_TAGS)]
    hostname = f"{prefix}-{numeric_id % 100:02d}"
    user = f"user_{digest[8] % 50:02d}" if online else None
    windows = operating_system.startswith("Windows")
    root = f"C:\\Users\\{user}" if windows and user else "/home/offline"
    recent_directories = (
        [f"{root}\\Documents", "C:\\Shared\\Archive"]
        if windows and online
        else ([f"/home/{user}/documents", "/srv/archive"] if online else [])
    )
    computer = {
        "id": computer_id,
        "hostname": hostname,
        "operating_system": operating_system,
        "online": online,
        "activity_status": activity,
        "risk_level": risk,
        "tags": list(tags),
    }
    details = {
        "logged_in_user": user,
        "ip_address": f"10.40.{digest[9] % 20 + 1}.{digest[10] % 240 + 10}",
        "remote_operations_available": online,
        "running_processes": (
            [{"name": "system_service.exe" if windows else "systemd", "pid": 800 + digest[11]}]
            if online
            else []
        ),
        "recent_directories": recent_directories,
        "suspicious_indicators": (
            ["UNUSUAL_ACTIVITY_REQUIRES_REVIEW"] if activity == "SUSPICIOUS" else []
        ),
        "remote_operations": ["FILE_SEARCH"] if online else [],
    }
    return computer, details


def generation_bucket(now: datetime, interval_seconds: int) -> int:
    if interval_seconds < 1:
        raise ValueError("computer generation interval must be positive")
    return int(now.timestamp()) // interval_seconds


def generated_computers(
    *,
    seed: str,
    interval_seconds: int,
    count: int,
    now: datetime | None = None,
) -> list[tuple[dict, dict]]:
    if count < 0:
        raise ValueError("generated computer count must not be negative")
    current_bucket = generation_bucket(now or datetime.now(UTC), interval_seconds)
    first_bucket = current_bucket - max(count - 1, 0)
    return [_generated_computer(seed, bucket) for bucket in range(first_bucket, current_bucket + 1)][
        :count
    ]


def list_computers(
    *,
    seed: str,
    interval_seconds: int,
    generated_count: int,
    now: datetime | None = None,
) -> list[dict]:
    dynamic = generated_computers(
        seed=seed,
        interval_seconds=interval_seconds,
        count=generated_count,
        now=now,
    )
    return [*BASE_COMPUTERS, *(computer for computer, _ in dynamic)]


def get_computer(
    computer_id: str,
    *,
    seed: str,
    interval_seconds: int,
    generated_count: int,
    now: datetime | None = None,
) -> tuple[dict, dict] | None:
    base = next((item for item in BASE_COMPUTERS if item["id"] == computer_id), None)
    if base is not None:
        return base, BASE_COMPUTER_DETAILS[computer_id]
    dynamic = generated_computers(
        seed=seed,
        interval_seconds=interval_seconds,
        count=generated_count,
        now=now,
    )
    return next(
        ((computer, details) for computer, details in dynamic if computer["id"] == computer_id),
        None,
    )
