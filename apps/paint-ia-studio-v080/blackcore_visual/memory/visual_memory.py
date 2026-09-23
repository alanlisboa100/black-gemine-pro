from __future__ import annotations

import json
import os
import threading
import time
try:
    import fcntl  # POSIX/Termux inter-process lock
except ImportError:  # pragma: no cover
    fcntl = None
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional


class VisualMemory:
    """Shared lightweight memory for the visual agents.

    This is intentionally *not* self-modifying code or neural training. Agents share
    structured observations and outcomes through an append-only JSONL log. The photo
    editor can derive small bounded biases from historically successful edits, which
    makes future decisions adaptive while remaining inspectable and reversible.
    """

    def __init__(self, root: str | Path | None = None) -> None:
        default_root = Path(__file__).resolve().parent
        configured = os.environ.get("BLACKCORE_MEMORY_DIR")
        self.root = Path(root or configured or default_root)
        self.root.mkdir(parents=True, exist_ok=True)
        self.events_path = self.root / "visual_events.jsonl"
        self.generations_path = self.root / "generations.jsonl"  # backwards-compatible
        self._lock = threading.Lock()

    def _append(self, path: Path, event: Dict[str, Any]) -> None:
        payload = dict(event)
        payload.setdefault("timestamp", int(time.time()))
        with self._lock:
            with path.open("a", encoding="utf-8") as fh:
                if fcntl is not None:
                    fcntl.flock(fh.fileno(), fcntl.LOCK_EX)
                try:
                    fh.write(json.dumps(payload, ensure_ascii=False) + "\n")
                    fh.flush()
                finally:
                    if fcntl is not None:
                        fcntl.flock(fh.fileno(), fcntl.LOCK_UN)

    def record_event(self, event_type: str, data: Dict[str, Any]) -> Dict[str, Any]:
        event_id = f"{int(time.time() * 1000)}-{os.getpid()}"
        event = {"event_id": event_id, "type": event_type, **data}
        self._append(self.events_path, event)
        return event

    def record_generation(self, record: Dict[str, Any]) -> None:
        self._append(self.generations_path, record)
        self.record_event("generation", record)

    def recent(self, event_type: str | None = None, limit: int = 50) -> List[Dict[str, Any]]:
        if not self.events_path.exists():
            return []
        try:
            lines = self.events_path.read_text(encoding="utf-8").splitlines()
        except OSError:
            return []
        out: List[Dict[str, Any]] = []
        for line in reversed(lines):
            if not line.strip():
                continue
            try:
                item = json.loads(line)
            except json.JSONDecodeError:
                continue
            if event_type is None or item.get("type") == event_type:
                out.append(item)
                if len(out) >= limit:
                    break
        return out

    @staticmethod
    def _weighted_average(items: Iterable[tuple[float, float]], default: float) -> float:
        total_w = 0.0
        total = 0.0
        for value, weight in items:
            if weight <= 0:
                continue
            total += float(value) * weight
            total_w += weight
        return total / total_w if total_w else default

    def photo_policy(self, limit: int = 40) -> Dict[str, float]:
        """Return small, bounded adaptive biases from successful previous edits."""
        events = self.recent("photo_edit", limit=limit)
        feedback_events = self.recent("feedback", limit=limit * 3)
        feedback_by_target: Dict[str, int] = {}
        for f in feedback_events:
            target = str(f.get("target_event_id") or "")
            if target and target not in feedback_by_target:
                feedback_by_target[target] = int(f.get("rating") or 0)

        successful = []
        for e in events:
            delta = float(e.get("quality_delta") or 0.0)
            feedback = float(feedback_by_target.get(str(e.get("event_id") or ""), 0))
            if feedback < 0:
                continue
            weight = max(0.0, delta) + max(0.0, feedback) * 5.0
            if weight <= 0:
                continue
            successful.append((e.get("plan") or {}, min(weight, 20.0)))

        def avg(key: str, default: float) -> float:
            return self._weighted_average(
                ((float(plan.get(key, default)), weight) for plan, weight in successful),
                default,
            )

        # Biases are deliberately conservative so memory cannot drift aggressively.
        return {
            "exposure_bias": max(-0.12, min(0.12, avg("exposure_ev", 0.0) * 0.12)),
            "contrast_bias": max(-0.08, min(0.08, (avg("contrast_factor", 1.0) - 1.0) * 0.25)),
            "saturation_bias": max(-0.06, min(0.06, (avg("saturation_factor", 1.0) - 1.0) * 0.20)),
            "sharpen_bias": max(-8.0, min(12.0, (avg("sharpen_percent", 60.0) - 60.0) * 0.10)),
            "sample_count": float(len(successful)),
        }

    def status(self) -> Dict[str, Any]:
        all_events = self.recent(limit=500)
        photo = [e for e in all_events if e.get("type") == "photo_edit"]
        gen = [e for e in all_events if e.get("type") == "generation"]
        positive = [e for e in photo if float(e.get("quality_delta") or 0) > 0]
        return {
            "events": len(all_events),
            "photo_edits": len(photo),
            "generations": len(gen),
            "successful_photo_edits": len(positive),
            "photo_policy": self.photo_policy(),
        }

    def feedback(self, event_id: str, rating: int) -> Dict[str, Any]:
        rating = 1 if rating > 0 else -1 if rating < 0 else 0
        event = self.record_event("feedback", {"target_event_id": str(event_id), "rating": rating})
        return event
