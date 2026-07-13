from __future__ import annotations

from threading import Lock


class PackageStore:
    """Pod-local package state. Restarting the pod intentionally clears it."""

    def __init__(self) -> None:
        self._packages: dict[tuple[str, str], dict] = {}
        self._lock = Lock()

    def insert(self, package: dict) -> None:
        key = (package["computer_id"], package["package_id"])
        with self._lock:
            self._packages[key] = package

    def get(self, package_id: str, computer_id: str) -> dict | None:
        with self._lock:
            package = self._packages.get((computer_id, package_id))
            return dict(package) if package is not None else None
