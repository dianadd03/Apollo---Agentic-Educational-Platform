import json
from pathlib import Path
from threading import Lock
from typing import Any


class JsonStore:
    def __init__(self, path: Path) -> None:
        self._path = path
        self._lock = Lock()
        self._path.parent.mkdir(parents=True, exist_ok=True)
        if not self._path.exists():
            self.write({"users": [], "topics": [], "sessions": {}})

    def read(self) -> dict[str, Any]:
        with self._lock:
            with self._path.open("r", encoding="utf-8") as file:
                return json.load(file)

    def write(self, payload: dict[str, Any]) -> None:
        with self._lock:
            with self._path.open("w", encoding="utf-8") as file:
                json.dump(payload, file, indent=2, default=str)

    def update(self, updater) -> dict[str, Any]:
        with self._lock:
            with self._path.open("r", encoding="utf-8") as file:
                payload = json.load(file)
            updated = updater(payload)
            with self._path.open("w", encoding="utf-8") as file:
                json.dump(updated, file, indent=2, default=str)
            return updated
