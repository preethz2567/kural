import math

import pytest

from services.ml_distress_classifier import (
    ModelInferenceUnavailable,
    Prediction,
    classify_message,
)


@pytest.mark.parametrize("level", ["none", "low", "medium", "high"])
def test_prediction_accepts_each_allowed_level(level):
    prediction = Prediction(level=level, confidence=0.5)

    assert prediction.level == level
    assert prediction.confidence == 0.5


@pytest.mark.parametrize("confidence", [0.0, 1.0])
def test_prediction_accepts_confidence_bounds(confidence):
    assert Prediction(level="none", confidence=confidence).confidence == confidence


@pytest.mark.parametrize("confidence", [-0.01, 1.01, math.nan, math.inf, -math.inf, True])
def test_prediction_rejects_invalid_confidence(confidence):
    with pytest.raises(ValueError, match="Confidence"):
        Prediction(level="low", confidence=confidence)


def test_prediction_rejects_unsupported_level():
    with pytest.raises(ValueError, match="Unsupported distress level"):
        Prediction(level="urgent", confidence=0.5)


@pytest.mark.parametrize("message", ["", "Good morning, I hope you are well."])
def test_classifier_explicitly_reports_unavailable_inference(message):
    with pytest.raises(ModelInferenceUnavailable, match="inference is unavailable"):
        classify_message(message)
