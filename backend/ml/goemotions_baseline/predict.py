"""Predict original GoEmotions labels for one supplied English message."""

import argparse
import json
from pathlib import Path

from baseline import DEFAULT_ARTIFACT_DIR, load_bundle, predict_emotions


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("text", help="One English message to classify.")
    parser.add_argument("--model", type=Path, default=DEFAULT_ARTIFACT_DIR / "goemotions_logreg.joblib")
    args = parser.parse_args()

    labels = predict_emotions(args.text, load_bundle(args.model))
    print(
        json.dumps(
            {
                "emotions": labels,
                "label_space": "GoEmotions original emotion labels",
                "threshold": "Validation-selected; score threshold, not probability calibration",
                "kural_distress_mapping": None,
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
