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


ACTIVITY_EVENTS = [
    {
        "event_id": "EVT-001",
        "timestamp": "2042-06-18T16:58:00Z",
        "session_id": "SESSION-A12",
        "event_type": "LOGIN",
        "details": {"user": "field_operator"},
    },
    {
        "event_id": "EVT-002",
        "timestamp": "2042-06-18T16:59:00Z",
        "session_id": "SESSION-A12",
        "event_type": "PROCESS_START",
        "details": {"process": "explorer.exe", "pid": "4012"},
    },
    {
        "event_id": "EVT-003",
        "timestamp": "2042-06-18T17:01:00Z",
        "session_id": "SESSION-A12",
        "event_type": "FILE_OPEN",
        "details": {"path": r"C:\Users\field_operator\Documents\shift_roster.xlsx"},
    },
    {
        "event_id": "EVT-004",
        "timestamp": "2042-06-18T17:03:00Z",
        "session_id": "SESSION-A12",
        "event_type": "NETWORK_CONNECTION",
        "details": {"destination": "203.0.113.10:443"},
    },
    {
        "event_id": "EVT-005",
        "timestamp": "2042-06-18T17:06:00Z",
        "session_id": "SESSION-A12",
        "event_type": "LOGOUT",
        "details": {"user": "field_operator"},
    },
    {
        "event_id": "EVT-006",
        "timestamp": "2042-06-18T17:08:00Z",
        "session_id": "SESSION-B07",
        "event_type": "LOGIN",
        "details": {"user": "archive_service"},
    },
    {
        "event_id": "EVT-007",
        "timestamp": "2042-06-18T17:10:00Z",
        "session_id": "SESSION-B07",
        "event_type": "PROCESS_START",
        "details": {"process": "archive_manager.exe", "pid": "4812"},
    },
    {
        "event_id": "EVT-008",
        "timestamp": "2042-06-18T17:12:00Z",
        "session_id": "SESSION-B07",
        "event_type": "FILE_OPEN",
        "details": {"path": r"C:\Operations\Archive\weekly_backup.zip"},
    },
    {
        "event_id": "EVT-009",
        "timestamp": "2042-06-18T17:14:00Z",
        "session_id": "SESSION-B07",
        "event_type": "ARCHIVE_CREATE",
        "details": {"path": r"C:\Operations\Archive\backup_2042_06_18.zip"},
    },
    {
        "event_id": "EVT-010",
        "timestamp": "2042-06-18T17:16:00Z",
        "session_id": "SESSION-B07",
        "event_type": "LOGOUT",
        "details": {"user": "archive_service"},
    },
    {
        "event_id": "EVT-011",
        "timestamp": "2042-06-18T17:18:00Z",
        "session_id": "SESSION-C31",
        "event_type": "LOGIN",
        "details": {"user": "field_operator"},
    },
    {
        "event_id": "EVT-012",
        "timestamp": "2042-06-18T17:20:00Z",
        "session_id": "SESSION-C31",
        "event_type": "PROCESS_START",
        "details": {"process": "secure_chat.exe", "pid": "5128"},
    },
    {
        "event_id": "EVT-013",
        "timestamp": "2042-06-18T17:23:00Z",
        "session_id": "SESSION-C31",
        "event_type": "FILE_OPEN",
        "details": {"path": r"C:\Users\field_operator\Documents\contact_list.txt"},
    },
    {
        "event_id": "EVT-014",
        "timestamp": "2042-06-18T17:25:00Z",
        "session_id": "SESSION-C31",
        "event_type": "NETWORK_CONNECTION",
        "details": {"destination": "203.0.113.77:443"},
    },
    {
        "event_id": "EVT-015",
        "timestamp": "2042-06-18T17:29:00Z",
        "session_id": "SESSION-C31",
        "event_type": "LOGOUT",
        "details": {"user": "field_operator"},
    },
    {
        "event_id": "EVT-016",
        "timestamp": "2042-06-18T17:37:00Z",
        "session_id": "SESSION-NF9",
        "event_type": "LOGIN",
        "details": {"user": "field_operator"},
    },
    {
        "event_id": "EVT-017",
        "timestamp": "2042-06-18T17:40:00Z",
        "session_id": "SESSION-NF9",
        "event_type": "PROCESS_START",
        "details": {"process": "powershell.exe", "pid": "5440"},
    },
    {
        "event_id": "EVT-018",
        "timestamp": "2042-06-18T17:42:00Z",
        "session_id": "SESSION-NF9",
        "event_type": "FILE_OPEN",
        "details": {"path": r"C:\Operations\Archive\nightfall_plan.json"},
    },
    {
        "event_id": "EVT-019",
        "timestamp": "2042-06-18T17:51:00Z",
        "session_id": "SESSION-NF9",
        "event_type": "FILE_OPEN",
        "details": {"path": r"C:\Users\field_operator\Documents\nightfall_notes.txt"},
    },
    {
        "event_id": "EVT-020",
        "timestamp": "2042-06-18T17:54:00Z",
        "session_id": "SESSION-NF9",
        "event_type": "ARCHIVE_CREATE",
        "details": {"path": r"C:\Operations\Archive\nightfall_payload.zip"},
    },
    {
        "event_id": "EVT-021",
        "timestamp": "2042-06-18T17:58:00Z",
        "session_id": "SESSION-NF9",
        "event_type": "NETWORK_CONNECTION",
        "details": {"destination": "198.51.100.42:8443"},
    },
    {
        "event_id": "EVT-022",
        "timestamp": "2042-06-18T18:02:00Z",
        "session_id": "SESSION-NF9",
        "event_type": "LOGOUT",
        "details": {"user": "field_operator"},
    },
    {
        "event_id": "EVT-023",
        "timestamp": "2042-06-18T18:08:00Z",
        "session_id": "SESSION-D44",
        "event_type": "LOGIN",
        "details": {"user": "maintenance"},
    },
    {
        "event_id": "EVT-024",
        "timestamp": "2042-06-18T18:10:00Z",
        "session_id": "SESSION-D44",
        "event_type": "PROCESS_START",
        "details": {"process": "powershell.exe", "pid": "6102"},
    },
    {
        "event_id": "EVT-025",
        "timestamp": "2042-06-18T18:12:00Z",
        "session_id": "SESSION-D44",
        "event_type": "FILE_OPEN",
        "details": {"path": r"C:\Operations\Archive\health_check.log"},
    },
    {
        "event_id": "EVT-026",
        "timestamp": "2042-06-18T18:14:00Z",
        "session_id": "SESSION-D44",
        "event_type": "NETWORK_CONNECTION",
        "details": {"destination": "198.51.100.42:443"},
    },
    {
        "event_id": "EVT-027",
        "timestamp": "2042-06-18T18:17:00Z",
        "session_id": "SESSION-D44",
        "event_type": "LOGOUT",
        "details": {"user": "maintenance"},
    },
    {
        "event_id": "EVT-028",
        "timestamp": "2042-06-18T18:20:00Z",
        "session_id": "SESSION-E18",
        "event_type": "LOGIN",
        "details": {"user": "archive_service"},
    },
    {
        "event_id": "EVT-029",
        "timestamp": "2042-06-18T18:22:00Z",
        "session_id": "SESSION-E18",
        "event_type": "PROCESS_START",
        "details": {"process": "archive_manager.exe", "pid": "7021"},
    },
    {
        "event_id": "EVT-030",
        "timestamp": "2042-06-18T18:25:00Z",
        "session_id": "SESSION-E18",
        "event_type": "ARCHIVE_CREATE",
        "details": {"path": r"C:\Operations\Archive\monthly_logs.zip"},
    },
    {
        "event_id": "EVT-031",
        "timestamp": "2042-06-18T18:27:00Z",
        "session_id": "SESSION-E18",
        "event_type": "NETWORK_CONNECTION",
        "details": {"destination": "203.0.113.15:8443"},
    },
    {
        "event_id": "EVT-032",
        "timestamp": "2042-06-18T18:30:00Z",
        "session_id": "SESSION-E18",
        "event_type": "LOGOUT",
        "details": {"user": "archive_service"},
    },
]


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
