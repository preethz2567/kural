"""
test_distress_detector.py
=========================
Unit tests for services/distress_detector.py :: score_distress().

All tests are pure-function: no network, no file I/O, no patient PII.
Tests are order-independent and use only synthetic input.

Key design notes
----------------
* score_distress(message, session_history) receives the history list that
  *already contains* the current user turn (the caller in chat.py appends
  the turn before scoring).  Repetition tests therefore include the message
  being scored inside the history list they pass.
* Keyword matching uses \\b word-boundaries and lowercases both message and
  keyword, so case and substring checks are meaningful.
"""
import pytest
from services.distress_detector import score_distress


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _user_turn(content: str) -> dict:
    """Minimal history turn dict with role='user'."""
    return {"role": "user", "content": content}


def _assistant_turn(content: str) -> dict:
    """Minimal history turn dict with role='assistant'."""
    return {"role": "assistant", "content": content}


def _score(message: str, history=None) -> dict:
    """Call score_distress with an empty history by default."""
    return score_distress(message, history if history is not None else [])


# ---------------------------------------------------------------------------
# 1. High-severity keyword
# ---------------------------------------------------------------------------

class TestHighKeyword:
    def test_scared_is_high(self):
        result = _score("I am scared")
        assert result["level"] == "high"

    def test_matched_keywords_contains_scared(self):
        result = _score("I am scared")
        assert "scared" in result["matched_keywords"]

    def test_help_me_is_high(self):
        result = _score("Please help me right now")
        assert result["level"] == "high"

    def test_i_want_to_go_home_is_high(self):
        result = _score("I want to go home now")
        assert result["level"] == "high"

    def test_feel_like_dying_is_high(self):
        result = _score("i feel like dying")
        assert result["level"] == "high"
        assert "feel like dying" in result["matched_keywords"] or "dying" in result["matched_keywords"]
        assert "Urgent safety" in result.get("reaction_note", "")

    def test_reason_mentions_high_severity(self):
        result = _score("I am scared")
        assert "high-severity" in result["reason"].lower()


# ---------------------------------------------------------------------------
# 2. Medium-severity keyword (single -> medium)
# ---------------------------------------------------------------------------

class TestMediumKeyword:
    def test_confused_is_medium(self):
        result = _score("I am confused")
        assert result["level"] == "medium"

    def test_all_alone_is_medium(self):
        result = _score("I am all alone here")
        assert result["level"] == "medium"

    def test_nobody_visits_is_medium(self):
        result = _score("Nobody visits me")
        assert result["level"] == "medium"

    def test_single_medium_not_escalated(self):
        """Single medium keyword must NOT be escalated to high."""
        result = _score("I don't understand this")
        assert result["level"] == "medium"


# ---------------------------------------------------------------------------
# 3. Two medium keywords -> high
# ---------------------------------------------------------------------------

class TestTwoMediumEscalatesToHigh:
    def test_confused_and_all_alone(self):
        result = _score("I am confused and all alone")
        assert result["level"] == "high"

    def test_reason_mentions_escalated_to_high(self):
        result = _score("I am confused and all alone")
        assert "escalated to high" in result["reason"].lower()

    def test_nobody_visits_and_confused(self):
        result = _score("Nobody visits me and I am confused")
        assert result["level"] == "high"


# ---------------------------------------------------------------------------
# 4. Low-severity keyword
# ---------------------------------------------------------------------------

class TestLowKeyword:
    def test_sad_is_low(self):
        result = _score("I feel sad today")
        assert result["level"] == "low"

    def test_tired_is_low(self):
        result = _score("I am so tired")
        assert result["level"] == "low"

    def test_miss_him_is_low(self):
        result = _score("I miss him so much")
        assert result["level"] == "low"

    def test_miss_her_is_low(self):
        result = _score("I miss her every day")
        assert result["level"] == "low"


# ---------------------------------------------------------------------------
# 5. No keywords -> none
# ---------------------------------------------------------------------------

class TestNoKeywords:
    def test_greeting_is_none(self):
        result = _score("Good morning, how are you?")
        assert result["level"] == "none"

    def test_positive_message_is_none(self):
        result = _score("I love the camellias in bloom")
        assert result["level"] == "none"

    def test_none_has_empty_matched_keywords(self):
        result = _score("Good morning, how are you?")
        assert result["matched_keywords"] == []


# ---------------------------------------------------------------------------
# 6. Word-boundary check: substrings must NOT match
# ---------------------------------------------------------------------------

class TestWordBoundary:
    def test_saddle_does_not_trigger_sad(self):
        """'saddle' contains 'sad' but must not match the low-tier keyword."""
        result = _score("I rode the saddle today")
        assert result["level"] == "none"
        assert "sad" not in result["matched_keywords"]

    def test_tiredless_does_not_trigger_tired(self):
        """Synthetic word starting with 'tired' must not match."""
        result = _score("She was tiredless in her work")
        assert result["level"] == "none"

    def test_scared_in_sentence_still_matches(self):
        """The word 'scared' surrounded by spaces must still match."""
        result = _score("She looked really scared yesterday")
        assert result["level"] == "high"


# ---------------------------------------------------------------------------
# 7. Case-insensitive detection
# ---------------------------------------------------------------------------

class TestCaseInsensitive:
    def test_uppercase_scared(self):
        result = _score("I AM SCARED")
        assert result["level"] == "high"

    def test_mixed_case_confused(self):
        result = _score("I Am Confused")
        assert result["level"] == "medium"

    def test_titlecase_sad(self):
        result = _score("I Feel Sad")
        assert result["level"] == "low"


# ---------------------------------------------------------------------------
# 8. Empty message -> none (no crash)
# ---------------------------------------------------------------------------

class TestEmptyMessage:
    def test_empty_string_is_none(self):
        result = _score("")
        assert result["level"] == "none"

    def test_empty_string_has_no_keywords(self):
        result = _score("")
        assert result["matched_keywords"] == []

    def test_empty_string_does_not_raise(self):
        """score_distress must not raise for an empty string."""
        try:
            _score("")
        except Exception as exc:
            pytest.fail(f"score_distress raised an exception on empty string: {exc}")


# ---------------------------------------------------------------------------
# 9. Repetition escalation: 3 identical messages -> one-level escalation
#
# The caller (chat.py) appends the current user turn to the session history
# BEFORE calling score_distress, so the current message is already counted
# inside the history list.  We replicate that contract here.
# ---------------------------------------------------------------------------

class TestRepetitionEscalation:
    def test_neutral_message_3x_escalates_to_low(self):
        msg = "Is it time for tea?"
        # 3 copies in history = repetition_count of 3
        history = [_user_turn(msg), _user_turn(msg), _user_turn(msg)]
        result = score_distress(msg, history)
        assert result["level"] == "low", (
            f"Expected 'low' after 3 repetitions of a neutral message, got {result['level']!r}"
        )

    def test_low_keyword_3x_escalates_to_medium(self):
        msg = "I feel sad"
        history = [_user_turn(msg), _user_turn(msg), _user_turn(msg)]
        result = score_distress(msg, history)
        assert result["level"] == "medium", (
            f"Expected 'medium' after 3 repetitions of a low-keyword message, got {result['level']!r}"
        )

    def test_reason_mentions_repetition(self):
        msg = "Is it time for tea?"
        history = [_user_turn(msg)] * 3
        result = score_distress(msg, history)
        assert "repeated" in result["reason"].lower()

    def test_two_repeats_does_not_escalate(self):
        """Repetition count must be >=3 to trigger escalation; 2 is not enough."""
        msg = "Is it time for tea?"
        history = [_user_turn(msg), _user_turn(msg)]
        result = score_distress(msg, history)
        assert result["level"] == "none"

    def test_assistant_turns_not_counted_in_repetition(self):
        """Repetition detection must only count user turns, not assistant turns."""
        msg = "Is it time for tea?"
        history = [_assistant_turn(msg), _assistant_turn(msg), _assistant_turn(msg)]
        result = score_distress(msg, history)
        assert result["level"] == "none"

    def test_different_messages_not_counted_as_repetition(self):
        """Different user messages must not inflate the repetition count for msg."""
        msg = "Is it time for tea?"
        history = [
            _user_turn("Good morning"),
            _user_turn("How are you"),
            _user_turn(msg),  # only 1 occurrence of msg in history
        ]
        result = score_distress(msg, history)
        assert result["level"] == "none"


# ---------------------------------------------------------------------------
# 10. Repeated high-distress message remains high (ceiling)
# ---------------------------------------------------------------------------

class TestHighDistressCeiling:
    def test_high_keyword_repeated_3x_stays_high(self):
        """High is the ceiling -- repetition escalation must not lower or change it."""
        msg = "I am scared"
        history = [_user_turn(msg), _user_turn(msg), _user_turn(msg)]
        result = score_distress(msg, history)
        assert result["level"] == "high"

    def test_high_keyword_matched_keyword_still_present(self):
        """Even when level stays 'high', the keyword must still appear in matched_keywords."""
        msg = "I am scared"
        history = [_user_turn(msg)] * 3
        result = score_distress(msg, history)
        assert "scared" in result["matched_keywords"]
