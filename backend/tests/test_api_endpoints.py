"""
test_api_endpoints.py
=====================
FastAPI endpoint tests using TestClient (no running server required).

Design decisions
----------------
1. Mock-mode guarantee
   routers/chat.py sets `client = anthropic.AsyncAnthropic(...) if api_key else None`
   at *module import time*, so patching os.environ after import is too late.
   Instead, each test forces mock mode by patching `routers.chat.client` to None
   via an autouse fixture.  This is safe: it only mutates the module-level name
   for the duration of each test and never touches production files.

2. Session isolation
   store/session_store._history_store is a module-level dict that persists across
   requests within a process.  The autouse fixture clears it before and after
   every test so tests cannot bleed into each other.

3. Unique session IDs
   Every test that posts to /chat uses a uuid4-derived session ID so that even
   without fixture cleanup there would be no cross-test contamination.

4. Repetition escalation contract
   chat.py appends the user turn to history *before* calling score_distress, so
   sending the same message N times via the API produces a history with N copies.
   The repetition test therefore sends 3 real requests and inspects the 3rd.

5. Patient fixture
   Tests rely on the existing synthetic fixture backend/data/patient_001.json.
   No real patient data is used or created.
"""
import uuid
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

# ---------------------------------------------------------------------------
# Path bootstrap (conftest.py already inserts backend/ but import order can
# vary; guard here too so this file is self-contained for direct invocation)
# ---------------------------------------------------------------------------
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

# Import app and the modules whose state we need to control
from main import app
import routers.chat as chat_module
import store.session_store as ss

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(autouse=True)
def _test_isolation(monkeypatch):
    """
    Runs before and after every test in this file (autouse=True).

    1. Forces mock mode by setting routers.chat.client to None.
       This is the only reliable way to disable the Anthropic client because
       the module-level `client` variable is assigned at import time.

    2. Clears the in-memory session history store so tests cannot influence
       each other's repetition counts or history.
    """
    # Force mock mode — patch the already-imported module attribute
    monkeypatch.setattr(chat_module, "client", None)

    # Clear session history
    ss._history_store.clear()
    yield
    ss._history_store.clear()


@pytest.fixture()
def client():
    """FastAPI TestClient. Does NOT start an HTTP server."""
    return TestClient(app)


def _session_id() -> str:
    """Generate a unique session ID for each test."""
    return f"test_{uuid.uuid4().hex}"


# ---------------------------------------------------------------------------
# 1. GET /ping
# ---------------------------------------------------------------------------

class TestPing:
    def test_returns_200(self, client):
        res = client.get("/ping")
        assert res.status_code == 200

    def test_body_is_status_ok(self, client):
        res = client.get("/ping")
        assert res.json() == {"status": "ok"}


# ---------------------------------------------------------------------------
# 2. GET /patient/patient_001 — known fixture
# ---------------------------------------------------------------------------

class TestGetPatientKnown:
    def test_returns_200(self, client):
        res = client.get("/patient/patient_001")
        assert res.status_code == 200

    def test_body_has_patient_id(self, client):
        res = client.get("/patient/patient_001")
        assert res.json()["patient_id"] == "patient_001"

    def test_body_has_name(self, client):
        res = client.get("/patient/patient_001")
        assert "name" in res.json()

    def test_body_has_stage(self, client):
        res = client.get("/patient/patient_001")
        data = res.json()
        assert "stage" in data
        assert data["stage"] in ("early", "mid", "late")


# ---------------------------------------------------------------------------
# 3. GET /patient/<nonexistent> — 404
# ---------------------------------------------------------------------------

class TestGetPatientNotFound:
    def test_returns_404(self, client):
        res = client.get("/patient/nonexistent_patient")
        assert res.status_code == 404

    def test_detail_field_present(self, client):
        res = client.get("/patient/nonexistent_patient")
        assert "detail" in res.json()


# ---------------------------------------------------------------------------
# 4. Normal greeting — HTTP 200, response string, distress level "none"
# ---------------------------------------------------------------------------

class TestNormalGreeting:
    def test_returns_200(self, client):
        res = client.post(
            "/chat/patient_001",
            json={"session_id": _session_id(), "message": "Good morning, lovely day today"},
        )
        assert res.status_code == 200

    def test_response_field_is_string(self, client):
        res = client.post(
            "/chat/patient_001",
            json={"session_id": _session_id(), "message": "Good morning, lovely day today"},
        )
        assert isinstance(res.json()["response"], str)
        assert len(res.json()["response"]) > 0

    def test_distress_level_is_none(self, client):
        res = client.post(
            "/chat/patient_001",
            json={"session_id": _session_id(), "message": "Good morning, lovely day today"},
        )
        assert res.json()["distress"]["level"] == "none"

    def test_response_contains_mock_label(self, client):
        """Without an API key the response must be labelled as mock."""
        res = client.post(
            "/chat/patient_001",
            json={"session_id": _session_id(), "message": "Good morning, lovely day today"},
        )
        assert "[Mock Companion]" in res.json()["response"]


# ---------------------------------------------------------------------------
# 5. High-distress keyword — level "high", escalated True
# ---------------------------------------------------------------------------

class TestHighDistress:
    def test_returns_200(self, client):
        res = client.post(
            "/chat/patient_001",
            json={"session_id": _session_id(), "message": "I am scared"},
        )
        assert res.status_code == 200

    def test_distress_level_is_high(self, client):
        res = client.post(
            "/chat/patient_001",
            json={"session_id": _session_id(), "message": "I am scared"},
        )
        assert res.json()["distress"]["level"] == "high"

    def test_escalated_is_true(self, client):
        res = client.post(
            "/chat/patient_001",
            json={"session_id": _session_id(), "message": "I am scared"},
        )
        assert res.json()["distress"]["escalated"] is True

    def test_response_is_calming(self, client):
        """High-distress mock response must contain reassuring language."""
        res = client.post(
            "/chat/patient_001",
            json={"session_id": _session_id(), "message": "I am scared"},
        )
        reply = res.json()["response"].lower()
        assert any(word in reply for word in ("safe", "breath", "here", "calm"))


# ---------------------------------------------------------------------------
# 6. Medium-distress keyword — level "medium", escalated False
# ---------------------------------------------------------------------------

class TestMediumDistress:
    def test_returns_200(self, client):
        res = client.post(
            "/chat/patient_001",
            json={"session_id": _session_id(), "message": "I don't understand"},
        )
        assert res.status_code == 200

    def test_distress_level_is_medium(self, client):
        res = client.post(
            "/chat/patient_001",
            json={"session_id": _session_id(), "message": "I don't understand"},
        )
        assert res.json()["distress"]["level"] == "medium"

    def test_escalated_is_false(self, client):
        res = client.post(
            "/chat/patient_001",
            json={"session_id": _session_id(), "message": "I don't understand"},
        )
        assert res.json()["distress"]["escalated"] is False


# ---------------------------------------------------------------------------
# 7. Repetition escalation across requests
#
# chat.py appends the user turn *before* scoring, so after 3 POST requests
# with the same neutral message in the same session, the 3rd call sees a
# history with 3 copies of the message and escalates one tier (none -> low).
# ---------------------------------------------------------------------------

class TestRepetitionEscalationViaApi:
    def _send(self, client, session_id: str, message: str):
        return client.post(
            "/chat/patient_001",
            json={"session_id": session_id, "message": message},
        )

    def test_first_send_is_none(self, client):
        sid = _session_id()
        res = self._send(client, sid, "Is it time for tea?")
        assert res.status_code == 200
        assert res.json()["distress"]["level"] == "none"

    def test_second_send_is_still_none(self, client):
        sid = _session_id()
        self._send(client, sid, "Is it time for tea?")
        res = self._send(client, sid, "Is it time for tea?")
        assert res.json()["distress"]["level"] == "none"

    def test_third_send_escalates_to_low(self, client):
        """
        3rd identical message in the same session must escalate from none -> low.
        After the 3rd POST, _history_store[session_id] contains the user message
        3 times (chat.py appends before scoring), triggering repetition escalation.
        """
        sid = _session_id()
        self._send(client, sid, "Is it time for tea?")
        self._send(client, sid, "Is it time for tea?")
        res = self._send(client, sid, "Is it time for tea?")
        assert res.status_code == 200
        distress = res.json()["distress"]
        assert distress["level"] == "low", (
            f"Expected 'low' on 3rd repeat, got {distress['level']!r}. "
            f"Reason: {distress.get('reason')}"
        )

    def test_different_session_not_affected(self, client):
        """Repetitions in session A must not inflate counts in session B."""
        sid_a = _session_id()
        sid_b = _session_id()
        # Send 3 times in session A
        for _ in range(3):
            self._send(client, sid_a, "Is it time for tea?")
        # First send in fresh session B — must stay at none
        res = self._send(client, sid_b, "Is it time for tea?")
        assert res.json()["distress"]["level"] == "none"


# ---------------------------------------------------------------------------
# 8. Chat to nonexistent patient — 404
# ---------------------------------------------------------------------------

class TestChatPatientNotFound:
    def test_returns_404(self, client):
        res = client.post(
            "/chat/nonexistent_patient",
            json={"session_id": _session_id(), "message": "Hello"},
        )
        assert res.status_code == 404

    def test_detail_present(self, client):
        res = client.post(
            "/chat/nonexistent_patient",
            json={"session_id": _session_id(), "message": "Hello"},
        )
        assert "detail" in res.json()


# ---------------------------------------------------------------------------
# 9. Response schema validation
# ---------------------------------------------------------------------------

class TestChatResponseSchema:
    def _post(self, client, message="Good morning"):
        return client.post(
            "/chat/patient_001",
            json={"session_id": _session_id(), "message": message},
        )

    def test_response_key_present(self, client):
        data = self._post(client).json()
        assert "response" in data

    def test_response_value_is_non_empty_string(self, client):
        data = self._post(client).json()
        assert isinstance(data["response"], str)
        assert data["response"].strip() != ""

    def test_distress_key_present(self, client):
        data = self._post(client).json()
        assert "distress" in data

    def test_distress_has_level(self, client):
        data = self._post(client).json()
        assert "level" in data["distress"]

    def test_distress_level_is_valid_value(self, client):
        data = self._post(client).json()
        assert data["distress"]["level"] in ("none", "low", "medium", "high")

    def test_distress_has_matched_keywords(self, client):
        data = self._post(client).json()
        assert "matched_keywords" in data["distress"]
        assert isinstance(data["distress"]["matched_keywords"], list)

    def test_distress_has_reason(self, client):
        data = self._post(client).json()
        assert "reason" in data["distress"]
        assert isinstance(data["distress"]["reason"], str)

    def test_distress_has_escalated(self, client):
        data = self._post(client).json()
        assert "escalated" in data["distress"]
        assert isinstance(data["distress"]["escalated"], bool)


# ---------------------------------------------------------------------------
# 10. Missing required fields — 422 Unprocessable Entity
# ---------------------------------------------------------------------------

class TestMissingRequiredFields:
    def test_missing_message_field_returns_422(self, client):
        """ChatRequest requires both session_id and message."""
        res = client.post(
            "/chat/patient_001",
            json={"session_id": _session_id()},   # message missing
        )
        assert res.status_code == 422

    def test_missing_session_id_returns_422(self, client):
        res = client.post(
            "/chat/patient_001",
            json={"message": "Hello"},            # session_id missing
        )
        assert res.status_code == 422

    def test_empty_body_returns_422(self, client):
        res = client.post(
            "/chat/patient_001",
            json={},
        )
        assert res.status_code == 422

    def test_422_body_has_detail(self, client):
        res = client.post("/chat/patient_001", json={})
        assert "detail" in res.json()

    def test_wrong_content_type_returns_422(self, client):
        """Sending plain text instead of JSON must be rejected."""
        res = client.post(
            "/chat/patient_001",
            content="just a plain string",
            headers={"Content-Type": "text/plain"},
        )
        assert res.status_code == 422


# ---------------------------------------------------------------------------
# 16. Patient Directory & Mutations
# ---------------------------------------------------------------------------

class TestPatientEndpoints:
    def test_list_patients_returns_200_and_list(self, client):
        res = client.get("/patient")
        assert res.status_code == 200
        data = res.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        ids = [p["patient_id"] for p in data]
        assert "patient_001" in ids

    def test_update_patient_mismatched_id_returns_400(self, client):
        res = client.put(
            "/patient/patient_001",
            json={
                "patient_id": "different_id",
                "name": "Different Name",
            },
        )
        assert res.status_code == 400
        assert "detail" in res.json()

    def test_update_patient_success(self, client, monkeypatch, tmp_path):
        import store.patient_store as ps
        monkeypatch.setattr(ps, "DATA_DIR", str(tmp_path))

        patient_payload = {
            "patient_id": "test_person_99",
            "name": "Test Person",
            "preferred_name": "Tester",
            "stage": "early",
            "preferences": {"likes": ["Quiet walks", "Tea"], "dislikes": []},
        }

        # Create
        res_create = client.post("/patient", json=patient_payload)
        assert res_create.status_code == 201

        # Update
        patient_payload["preferred_name"] = "Tester Updated"
        res_update = client.put("/patient/test_person_99", json=patient_payload)
        assert res_update.status_code == 200
        assert res_update.json()["preferred_name"] == "Tester Updated"

        # Verify persisted via get
        res_get = client.get("/patient/test_person_99")
        assert res_get.status_code == 200
        assert res_get.json()["preferred_name"] == "Tester Updated"
