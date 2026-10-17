"""
test_session_store.py
=====================
Unit tests for store/session_store.py.

The store uses a module-level dict (_history_store).  To keep tests
order-independent, a pytest fixture clears that dict before every test by
directly patching the module attribute.

No network, no file I/O, no external dependencies.
"""
import pytest
import store.session_store as ss


# ---------------------------------------------------------------------------
# Fixture: reset the in-memory store before each test
# ---------------------------------------------------------------------------

@pytest.fixture(autouse=True)
def clear_store():
    """
    Clear the module-level _history_store before (and after) every test.
    'autouse=True' means this runs automatically for every test in this file.
    """
    ss._history_store.clear()
    yield
    ss._history_store.clear()


# ---------------------------------------------------------------------------
# 1. New session returns empty history
# ---------------------------------------------------------------------------

class TestEmptyHistory:
    def test_unknown_session_returns_empty_list(self):
        result = ss.get_history("nonexistent_session")
        assert result == []

    def test_return_type_is_list(self):
        result = ss.get_history("brand_new_session")
        assert isinstance(result, list)

    def test_different_unknown_sessions_both_empty(self):
        assert ss.get_history("session_a") == []
        assert ss.get_history("session_b") == []


# ---------------------------------------------------------------------------
# 2. Appending a turn stores role and content correctly
# ---------------------------------------------------------------------------

class TestAppendTurn:
    def test_appended_turn_is_retrievable(self):
        ss.append_turn("s1", "user", "Hello")
        history = ss.get_history("s1")
        assert len(history) == 1

    def test_appended_turn_has_correct_role(self):
        ss.append_turn("s1", "user", "Hello")
        turn = ss.get_history("s1")[0]
        assert turn["role"] == "user"

    def test_appended_turn_has_correct_content(self):
        ss.append_turn("s1", "user", "Hello")
        turn = ss.get_history("s1")[0]
        assert turn["content"] == "Hello"

    def test_assistant_turn_stored_correctly(self):
        ss.append_turn("s1", "assistant", "I am here with you")
        turn = ss.get_history("s1")[0]
        assert turn["role"] == "assistant"
        assert turn["content"] == "I am here with you"

    def test_multiple_turns_appended_in_order(self):
        ss.append_turn("s1", "user", "First message")
        ss.append_turn("s1", "assistant", "First reply")
        ss.append_turn("s1", "user", "Second message")
        history = ss.get_history("s1")
        assert len(history) == 3
        assert history[0]["content"] == "First message"
        assert history[1]["content"] == "First reply"
        assert history[2]["content"] == "Second message"

    def test_turn_has_timestamp_key(self):
        ss.append_turn("s1", "user", "Hello")
        turn = ss.get_history("s1")[0]
        assert "timestamp" in turn
        assert turn["timestamp"]  # must be non-empty string

    def test_timestamp_is_iso_format(self):
        """Timestamp should be parseable as an ISO 8601 string."""
        from datetime import datetime
        ss.append_turn("s1", "user", "Hello")
        ts = ss.get_history("s1")[0]["timestamp"]
        # Will raise ValueError if not valid ISO format
        datetime.fromisoformat(ts)


# ---------------------------------------------------------------------------
# 3. Distress metadata is preserved
# ---------------------------------------------------------------------------

class TestDistressMetadata:
    def test_distress_stored_when_provided(self):
        distress = {"level": "high", "matched_keywords": ["scared"], "reason": "test"}
        ss.append_turn("s1", "user", "I am scared", distress=distress)
        turn = ss.get_history("s1")[0]
        assert "distress" in turn

    def test_distress_level_preserved(self):
        distress = {"level": "high", "matched_keywords": ["scared"], "reason": "test"}
        ss.append_turn("s1", "user", "I am scared", distress=distress)
        turn = ss.get_history("s1")[0]
        assert turn["distress"]["level"] == "high"

    def test_distress_matched_keywords_preserved(self):
        distress = {"level": "low", "matched_keywords": ["sad"], "reason": "test"}
        ss.append_turn("s1", "user", "I feel sad", distress=distress)
        turn = ss.get_history("s1")[0]
        assert turn["distress"]["matched_keywords"] == ["sad"]

    def test_no_distress_key_when_not_provided(self):
        """Turn without distress argument must not have a 'distress' key."""
        ss.append_turn("s1", "user", "Good morning")
        turn = ss.get_history("s1")[0]
        assert "distress" not in turn

    def test_distress_none_not_stored(self):
        """Passing distress=None explicitly must not add the distress key."""
        ss.append_turn("s1", "user", "Good morning", distress=None)
        turn = ss.get_history("s1")[0]
        assert "distress" not in turn


# ---------------------------------------------------------------------------
# 4. Different session IDs remain isolated
# ---------------------------------------------------------------------------

class TestSessionIsolation:
    def test_turns_do_not_bleed_across_sessions(self):
        ss.append_turn("session_alpha", "user", "Message for alpha")
        ss.append_turn("session_beta", "user", "Message for beta")

        alpha_history = ss.get_history("session_alpha")
        beta_history = ss.get_history("session_beta")

        assert len(alpha_history) == 1
        assert len(beta_history) == 1
        assert alpha_history[0]["content"] == "Message for alpha"
        assert beta_history[0]["content"] == "Message for beta"

    def test_clearing_one_session_does_not_affect_another(self):
        ss.append_turn("session_x", "user", "Keep this")
        ss.append_turn("session_y", "user", "Temporary")

        # Manually remove session_y
        del ss._history_store["session_y"]

        assert ss.get_history("session_x")[0]["content"] == "Keep this"
        assert ss.get_history("session_y") == []

    def test_same_content_in_different_sessions_stored_independently(self):
        ss.append_turn("s1", "user", "Hello")
        ss.append_turn("s2", "user", "Hello")

        # Each session holds its own copy
        assert len(ss.get_history("s1")) == 1
        assert len(ss.get_history("s2")) == 1

    def test_empty_session_after_store_clear(self):
        """After the fixture clears the store, any previously used ID is unknown."""
        # This test relies on autouse fixture having cleared state before this test.
        assert ss.get_history("s1") == []
        assert ss.get_history("session_alpha") == []
