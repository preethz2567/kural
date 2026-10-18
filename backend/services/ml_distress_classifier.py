"""Interface for an ML-based distress classifier; no model is configured yet."""

import math
from dataclasses import dataclass
from typing import Literal


DistressLevel = Literal["none", "low", "medium", "high"]
_ALLOWED_LEVELS = {"none", "low", "medium", "high"}


@dataclass(frozen=True)
class Prediction:
    level: DistressLevel
    confidence: float

    def __post_init__(self) -> None:
        if self.level not in _ALLOWED_LEVELS:
            raise ValueError(f"Unsupported distress level: {self.level!r}")
        if (
            isinstance(self.confidence, bool)
            or not isinstance(self.confidence, (int, float))
            or not math.isfinite(self.confidence)
            or not 0.0 <= self.confidence <= 1.0
        ):
            raise ValueError("Confidence must be a finite number between 0.0 and 1.0")
        object.__setattr__(self, "confidence", float(self.confidence))


class ModelInferenceUnavailable(RuntimeError):
    """Raised when classification is requested before a model is available."""


def classify_message(message: str) -> Prediction:
    """Classify a message once model inference is implemented and configured.

    This interface intentionally does not fall back to the rule-based detector
    or fabricate a prediction. Every input currently raises explicitly.
    """
    raise ModelInferenceUnavailable(
        "No trained distress model is configured; inference is unavailable."
    )
