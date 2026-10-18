"""Train and evaluate the independent GoEmotions baseline."""

import argparse
import json
from pathlib import Path

from baseline import (
    DEFAULT_ARTIFACT_DIR,
    DEFAULT_DATA_DIR,
    MODEL_FILENAME,
    build_model,
    choose_threshold,
    evaluate_predictions,
    load_split,
    save_bundle,
    write_metrics,
)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data-dir", type=Path, default=DEFAULT_DATA_DIR)
    parser.add_argument("--artifact-dir", type=Path, default=DEFAULT_ARTIFACT_DIR)
    parser.add_argument("--skip-test", action="store_true")
    args = parser.parse_args()

    train_texts, train_targets, emotions = load_split(args.data_dir / "train.tsv.txt")
    dev_texts, dev_targets, dev_emotions = load_split(args.data_dir / "dev.tsv.txt")
    if emotions != dev_emotions:
        raise ValueError("Training and validation emotion lists do not match.")

    model = build_model()
    print(f"Training on {len(train_texts)} examples and {len(emotions)} labels.", flush=True)
    model.fit(train_texts, train_targets)

    threshold, validation_macro_f1 = choose_threshold(model, dev_texts, dev_targets)
    print(
        f"Validation threshold selected on dev: {threshold:.2f}; "
        f"dev macro-F1={validation_macro_f1:.4f}",
        flush=True,
    )
    model_path = save_bundle(model, emotions, threshold, args.artifact_dir)
    print(f"Saved model: {model_path}", flush=True)

    dev_probabilities = model.predict_proba(dev_texts)
    dev_metrics = evaluate_predictions(
        dev_targets, dev_probabilities, emotions, threshold
    )
    write_metrics(dev_metrics, args.artifact_dir / "dev_metrics.json")
    print("Dev metrics:", json.dumps(dev_metrics, indent=2), flush=True)

    if not args.skip_test:
        test_texts, test_targets, test_emotions = load_split(
            args.data_dir / "test.tsv.txt"
        )
        if emotions != test_emotions:
            raise ValueError("Training and test emotion lists do not match.")
        test_metrics = evaluate_predictions(
            test_targets, model.predict_proba(test_texts), emotions, threshold
        )
        write_metrics(test_metrics, args.artifact_dir / "test_metrics.json")
        print("Test metrics:", json.dumps(test_metrics, indent=2), flush=True)

    print(
        "This is an experimental general-emotion baseline. GoEmotions labels "
        "are not Kural distress levels, and logistic scores are not claimed "
        "to be calibrated probabilities."
    )


if __name__ == "__main__":
    main()
