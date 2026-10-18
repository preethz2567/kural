# GoEmotions logistic-regression baseline

This standalone English-only prototype predicts the original 28 GoEmotions labels. It is an experimental general-emotion baseline, not a clinically validated dementia-distress detector. It does not map labels to Kural's `none` / `low` / `medium` / `high` categories and does not alter the Kural chat integration.

## Dataset

Place the no-header GoEmotions files under `data/goemotions/`. The loader uses the files as named here:

- `train.tsv.txt`
- `dev.tsv.txt`
- `test.tsv.txt`
- `emotions.txt`

Each TSV row must contain text, comma-separated integer emotion IDs, and an example ID, separated by tabs. IDs index the lines in `emotions.txt`.

## Train and evaluate

From this directory, with Python 3.10+:

```sh
python -m pip install -r requirements.txt
python train.py
```

Training uses `train.tsv.txt`, selects one global score threshold on `dev.tsv.txt`, reports dev metrics, and reports test metrics using that frozen threshold. Artifacts are saved in `artifacts/`. To omit test evaluation:

```sh
python train.py --skip-test
```

Re-evaluate a saved bundle:

```sh
python evaluate.py --split dev
python evaluate.py --split test
```

Predict labels for a single message:

```sh
python predict.py "I feel grateful for my friends."
```

The logistic regression outputs used for thresholding are not claimed to be calibrated probabilities. This prototype must not be used as a clinical decision system or caregiver alert.

## IBM LinuxONE

LinuxONE is typically IBM Z (`s390x`), but the target OS, Python version, package availability, and host were not available during development. Run on the target first:

```sh
uname -m
python3 --version
```

If `uname -m` reports `s390x`, create a Python 3.10+ virtual environment and install the declared dependencies there. Installation may require OS-provided compiler and BLAS/LAPACK development packages if compatible binary wheels are unavailable. Do not assume installation or model portability until checked on the actual target.

For a self-contained target-side training run, transfer this directory's source files (`baseline.py`, `train.py`, `evaluate.py`, `predict.py`, `requirements.txt`) and the four dataset files, then run:

```sh
python3 -m venv .venv
. .venv/bin/activate
python -m pip install -r requirements.txt
python train.py
python predict.py "I feel grateful for my friends."
```

Joblib model files are Python/scikit-learn-version-sensitive. Training natively on LinuxONE is the recommended first route; cross-platform model transfer has not been verified.
