import hashlib
from collections import OrderedDict
from collections.abc import Sequence
from dataclasses import dataclass
from datetime import datetime

from app.summary.base import NoteForSummary


@dataclass(frozen=True)
class CachedSummary:
    narrative: str
    generated_at: datetime


def cache_key(provider_name: str, notes: Sequence[NoteForSummary]) -> str:
    digest = hashlib.sha256()
    digest.update(provider_name.encode())
    for note in notes:
        digest.update(b"\x00")
        digest.update(str(note.id).encode())
        digest.update(b"\x00")
        digest.update(note.recorded_at.isoformat().encode())
        digest.update(b"\x00")
        digest.update(note.body.encode())
    return digest.hexdigest()


class SummaryCache:
    """In-process, bounded LRU."""

    def __init__(self, max_size: int = 256) -> None:
        self._max_size = max_size
        self._items: OrderedDict[str, CachedSummary] = OrderedDict()

    def get(self, key: str) -> CachedSummary | None:
        value = self._items.get(key)
        if value is not None:
            self._items.move_to_end(key)
        return value

    def put(self, key: str, value: CachedSummary) -> None:
        self._items[key] = value
        self._items.move_to_end(key)
        while len(self._items) > self._max_size:
            self._items.popitem(last=False)

    def __len__(self) -> int:
        return len(self._items)
