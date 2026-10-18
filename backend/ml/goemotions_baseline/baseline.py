"""Independent multi-label GoEmotions baseline; not a Kural distress model."""

import csv
import json
from pathlib import Path
from typing import Any

import joblib
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    f1_score,
    multilabel_confusion_matrix,
    precision_score,
    recall_score,
)
from sklearn.multiclass import OneVsRestClassifier
from sklearn.pipeline import Pipeline


BASE_DIR = Path(__file__).resolve().parent
DEFAULT_DATA_DIR = BASE_DIR / "data" / "goemotions"
DEFAULT_ARTIFACT_DIR = BASE_DIR / "artifacts"
MODEL_FILENAME = "goemotions_logreg.joblib"
EMOTION_FILENAME = "emotions.txt"
DEFAULT_THRESHOLD = 0.5


def load_split(
    split_path: Path, emotions_path: Path = DEFAULT_DATA_DIR / EMOTION_FILENAME
) -> tuple[list[str], np.ndarray, list[str]]:
    """Read a no-header GoEmotions TSV split and return text and multi-hot labels."""
    emotions = [
        line.strip()
        for line in emotions_path.read_text(encoding="utf-8").splitlines()
        if line.strip()
    ]
    if not emotions or len(set(emotions)) != len(emotions):
        raise ValueError(f"Emotion list must be nonempty and unique: {emotions_path}")

    texts: list[str] = []
    targets: list[list[int]] = []
    with split_path.open("r", encoding="utf-8", newline="") as tsv_file:
        reader = csv.reader(tsv_file, delimiter="\t")
        for line_number, row in enumerate(reader, start=1):
            if len(row) != 3:
                raise ValueError(
                    f"{split_path}:{line_number}: expected 3 TSV columns, got {len(row)}"
                )
            text, raw_labels, _example_id = row
            if not text.strip() or not raw_labels.strip():
                raise ValueError(f"{split_path}:{line_number}: empty text or label field")

            vector = [0] * len(emotions)
            for raw_id in raw_labels.split(","):
                raw_id = raw_id.strip()
                if not raw_id.isdigit():
                    raise ValueError(
                        f"{split_path}:{line_number}: invalid emotion ID {raw_id!r}"
                    )
                emotion_id = int(raw_id)
                if not 0 <= emotion_id < len(emotions):
                    raise ValueError(
                        f"{split_path}:{line_number}: emotion ID {emotion_id} "
                        f"outside 0..{len(emotions) - 1}"
                    )
                if vector[emotion_id]:
                    raise ValueError(
                        f"{split_path}:{line_number}: duplicate emotion ID {emotion_id}"
                    )
                vector[emotion_id] = 1
            texts.append(text)
            targets.append(vector)

    if not texts:
        raise ValueError(f"No examples found in {split_path}")
    return texts, np.asarray(targets, dtype=np.uint8), emotions


def build_model() -> Pipeline:
    """Build a sparse TF-IDF, one-vs-rest logistic-regression baseline."""
    return Pipeline(
        [
            (
                "tfidf",
                TfidfVectorizer(
                    ngram_range=(1, 2),
                    min_df=2,
                    max_features=100_000,
                    sublinear_tf=True,
                    strip_accents="unicode",
                ),
            ),
            (
                "classifier",
                OneVsRestClassifier(
                    LogisticRegression(
                        C=4.0,
                        max_iter=300,
                        solver="liblinear",
                    )
                ),
            ),
        ]
    )


def choose_threshold(
    model: Pipeline, texts: list[str], targets: np.ndarray
) -> tuple[float, float]:
    """Select a single global threshold by validation macro-F1."""
    probabilities = model.predict_proba(texts)
    candidates = np.arange(0.10, 0.91, 0.05)
    scored = []
    for threshold in candidates:
        predictions = probabilities >= threshold
        macro_f1 = f1_score(targets, predictions, average="macro", zero_division=0)
        scored.append((float(macro_f1), -abs(float(threshold) - DEFAULT_THRESHOLD), float(threshold)))
    best_f1, _tie_break, best_threshold = max(scored)
    return best_threshold, best_f1


def evaluate_predictions(
    targets: np.ndarray,
    probabilities: np.ndarray,
    emotions: list[str],
    threshold: float,
) -> dict[str, Any]:
    """Calculate aggregate and per-emotion metrics without treating scores as calibrated."""
    predictions = probabilities >= threshold
    per_class = {}
    for index, emotion in enumerate(emotions):
        per_class[emotion] = {
            "precision": float(
                precision_score(targets[:, index], predictions[:, index], zero_division=0)
            ),
            "recall": float(
                recall_score(targets[:, index], predictions[:, index], zero_division=0)
            ),
            "f1": float(f1_score(targets[:, index], predictions[:, index], zero_division=0)),
        }
    return {
        "threshold": threshold,
        "threshold_is_calibrated_probability": False,
        "macro_precision": float(
            precision_score(targets, predictions, average="macro", zero_division=0)
        ),
        "macro_recall": float(
            recall_score(targets, predictions, average="macro", zero_division=0)
        ),
        "macro_f1": float(f1_score(targets, predictions, average="macro", zero_division=0)),
        "micro_precision": float(
            precision_score(targets, predictions, average="micro", zero_division=0)
        ),
        "micro_recall": float(
            recall_score(targets, predictions, average="micro", zero_division=0)
        ),
        "micro_f1": float(f1_score(targets, predictions, average="micro", zero_division=0)),
        "subset_accuracy": float(np.all(targets == predictions, axis=1).mean()),
        "per_class": per_class,
        "per_class_confusion_matrices": {
            emotion: matrix.tolist()
            for emotion, matrix in zip(
                emotions, multilabel_confusion_matrix(targets, predictions)
            )
        },
    }


def save_bundle(
    model: Pipeline, emotions: list[str], threshold: float, artifact_dir: Path
) -> Path:
    artifact_dir.mkdir(parents=True, exist_ok=True)
    model_path = artifact_dir / MODEL_FILENAME
    joblib.dump(
        {
            "model": model,
            "emotions": emotions,
            "threshold": threshold,
            "format_version": 1,
        },
        model_path,
        compress=3,
    )
    return model_path


def load_bundle(model_path: Path | None = None) -> dict[str, Any]:
    """Load a locally trained bundle; never downloads or falls back to another model."""
    selected_path = model_path or DEFAULT_ARTIFACT_DIR / MODEL_FILENAME
    if not selected_path.is_file():
        raise FileNotFoundError(
            f"No trained GoEmotions model found at {selected_path}. Run train.py first."
        )
    bundle = joblib.load(selected_path)
    if bundle.get("format_version") != 1:
        raise ValueError(f"Unsupported model bundle format: {selected_path}")
    return bundle


def predict_emotions(
    text: str, bundle: dict[str, Any] | None = None
) -> list[str]:
    """Return original GoEmotions labels; these are not Kural distress levels."""
    if not isinstance(text, str) or not text.strip():
        raise ValueError("text must be a nonempty string")
    active_bundle = bundle or load_bundle()
    probabilities = active_bundle["model"].predict_proba([text])[0]
    return [
        emotion
        for emotion, score in zip(active_bundle["emotions"], probabilities)
        if score >= active_bundle["threshold"]
    ]


def write_metrics(metrics: dict[str, Any], output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(metrics, indent=2) + "\n", encoding="utf-8")
