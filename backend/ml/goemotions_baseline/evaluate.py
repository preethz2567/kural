"""Evaluate a saved GoEmotions bundle on dev or test."""

import argparse
import json
from pathlib import Path

from baseline import (
    DEFAULT_ARTIFACT_DIR,
    DEFAULT_DATA_DIR,
    evaluate_predictions,
    load_bundle,
    load_split,
    write_metrics,
)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--split", choices=("dev", "test"), required=True)
    parser.add_argument("--data-dir", type=Path, default=DEFAULT_DATA_DIR)
    parser.add_argument("--artifact-dir", type=Path, default=DEFAULT_ARTIFACT_DIR)
    args = parser.parse_args()

    bundle = load_bundle(args.artifact_dir / "goemotions_logreg.joblib")
    texts, targets, emotions = load_split(
        args.data_dir / f"{args.split}.tsv.txt"
    )
    if emotions != bundle["emotions"]:
        raise ValueError("Dataset emotion labels do not match the saved model.")
    metrics = evaluate_predictions(
        targets, bundle["model"].predict_proba(texts), emotions, bundle["threshold"]
    )
    write_metrics(metrics, args.artifact_dir / f"{args.split}_metrics.json")
    print(json.dumps(metrics, indent=2))


if __name__ == "__main__":
    main()
