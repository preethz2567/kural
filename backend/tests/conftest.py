r"""
conftest.py — shared pytest fixtures for backend/tests.

Adds the `backend/` directory to sys.path so that `services.*` and `store.*`
imports resolve correctly when pytest is invoked from the repository root:

    .\.venv\Scripts\python.exe -m pytest backend/tests -v
"""
import sys
from pathlib import Path

# Insert backend/ at the front of sys.path once, before any test module is imported.
BACKEND_DIR = Path(__file__).resolve().parent.parent  # …/kural/backend
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))
