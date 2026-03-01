"""
ASR Validator Module for Pronunex.

Gatekeeper that verifies user's speech matches expected text BEFORE scoring.
Prevents the "Yes Man" bug where wrong speech gets valid scores.

Uses Groq Whisper API (whisper-large-v3-turbo) for fast, accurate transcription.
Enhanced with DTW word matching and Levenshtein distance fallback.
"""

import os
import logging
from typing import List, Dict, Tuple, Union
from difflib import SequenceMatcher

# Import new NLP modules
from .word_matcher import compare_word_sequences, get_word_match_summary, get_mapped_words
from .edit_distance import edit_distance_similarity, calculate_word_accuracy

logger = logging.getLogger(__name__)

# Singleton Groq client
_groq_client = None
_word_locations = []


def _get_groq_client():
    """Get or create singleton Groq client for Whisper API."""
    global _groq_client

    if _groq_client is None:
        from groq import Groq
        from django.conf import settings

        api_key = settings.GROQ_API_KEY
        if not api_key:
            raise RuntimeError("GROQ_API_KEY is not set in settings / .env")

        _groq_client = Groq(api_key=api_key)
        logger.info("Groq Whisper client initialized (whisper-large-v3-turbo)")

    return _groq_client


def _is_hallucination(text: str) -> bool:
    """
    Detect if Whisper output is a hallucination (garbage output).

    Common hallucination patterns:
    - Repeated characters: "éééééé", "####", "سيبالسيبال"
    - Non-English characters when English was forced
    - Very long single "words" with no spaces
    """
    if not text or len(text) < 3:
        return False

    # Check for high ratio of non-ASCII characters (hallucination indicator)
    non_ascii = sum(1 for c in text if ord(c) > 127)
    if non_ascii / len(text) > 0.3:
        return True

    # Check for repeated character patterns (3+ same char in a row)
    import re
    if re.search(r'(.)\1{5,}', text):  # Same char repeated 6+ times
        return True

    # Check for repeated short patterns (like "سيبال" repeated)
    words = text.split()
    if len(words) > 3:
        # If same word appears more than 50% of the time, it's hallucination
        from collections import Counter
        word_counts = Counter(words)
        most_common_count = word_counts.most_common(1)[0][1]
        if most_common_count / len(words) > 0.5:
            return True

    # Check for extremely long words (no spaces in long text)
    if len(text) > 50 and ' ' not in text:
        return True

    return False


def transcribe_audio(audio_path: str) -> str:
    """
    Transcribe audio file to text using Groq Whisper API.

    Sends the audio file to Groq's whisper-large-v3-turbo model for
    fast, accurate transcription with word-level timestamps.

    Args:
        audio_path: Path to audio file

    Returns:
        Transcribed text (lowercase, cleaned)
    """
    global _word_locations

    client = _get_groq_client()

    try:
        filename = os.path.basename(audio_path)

        with open(audio_path, "rb") as audio_file:
            result = client.audio.transcriptions.create(
                file=(filename, audio_file.read()),
                model="whisper-large-v3-turbo",
                temperature=0,
                response_format="verbose_json",
                timestamp_granularities=["word"],
                language="en",
            )

        transcription = result.text or ""

        # HALLUCINATION DETECTION
        if _is_hallucination(transcription):
            logger.warning(f"Whisper hallucination detected: '{transcription[:50]}...'")
            return ""

        # Extract word-level timestamps from Groq response
        # Groq returns: result.words = [{ "word": "...", "start": 0.0, "end": 0.5 }, ...]
        _word_locations = []
        groq_words = getattr(result, "words", None) or []
        for w in groq_words:
            word_text = w.get("word", "") if isinstance(w, dict) else getattr(w, "word", "")
            start = w.get("start", 0) if isinstance(w, dict) else getattr(w, "start", 0)
            end = w.get("end", start + 0.5) if isinstance(w, dict) else getattr(w, "end", start + 0.5)

            if word_text:
                _word_locations.append({
                    "word": word_text.strip(),
                    "start_ts": start * 16000,   # Convert seconds → samples (16kHz)
                    "end_ts": end * 16000,
                })

        logger.info(f"Groq Whisper transcription: '{transcription}' with {len(_word_locations)} word locations")
        return transcription.lower().strip()

    except Exception as e:
        logger.error(f"Groq Whisper transcription failed: {str(e)}")
        return ""


def get_word_locations() -> List[Dict]:
    """Get word locations from the last transcription."""
    global _word_locations
    return _word_locations


def get_word_diff(transcribed_words: List[str], expected_words: List[str]) -> List[Dict]:
    """
    Get word-level differences for mistake detection.
    
    Example:
        Expected:    ["she", "sells", "books"]
        Transcribed: ["she", "sell", "book"]
        
        Returns differences showing missing 's' in sells and books.
    
    Args:
        transcribed_words: Words from ASR
        expected_words: Expected words from sentence
    
    Returns:
        List of word diff dicts with type, position, and details
    """
    results = []
    
    matcher = SequenceMatcher(None, transcribed_words, expected_words)
    
    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag == 'equal':
            # Words match exactly
            for idx, word in enumerate(expected_words[j1:j2]):
                results.append({
                    'word': word,
                    'type': 'correct',
                    'position': j1 + idx
                })
        
        elif tag == 'replace':
            # Words differ
            for idx in range(max(i2 - i1, j2 - j1)):
                user_word = transcribed_words[i1 + idx] if i1 + idx < i2 else None
                expected_word = expected_words[j1 + idx] if j1 + idx < j2 else None
                
                if expected_word:
                    issue = _detect_word_issue(user_word, expected_word)
                    results.append({
                        'word': expected_word,
                        'type': 'wrong',
                        'position': j1 + idx,
                        'user_said': user_word or '(nothing)',
                        'suggestion': expected_word,
                        'issue': issue
                    })
        
        elif tag == 'delete':
            # User said extra words
            for idx, word in enumerate(transcribed_words[i1:i2]):
                results.append({
                    'word': word,
                    'type': 'extra',
                    'position': i1 + idx,
                    'user_said': word
                })
        
        elif tag == 'insert':
            # User missed words
            for idx, word in enumerate(expected_words[j1:j2]):
                results.append({
                    'word': word,
                    'type': 'missing',
                    'position': j1 + idx,
                    'suggestion': f"You missed saying '{word}'"
                })
    
    return sorted(results, key=lambda x: x['position'])


def _detect_word_issue(user_word: str, expected_word: str) -> str:
    """
    Detect specific issue between user's word and expected word.
    
    Examples:
        - "sell" vs "sells" → "missing_ending_s"
        - "ook" vs "book" → "missing_beginning_b"
        - "dat" vs "that" → "substituted_th_with_d"
    """
    if not user_word:
        return 'word_skipped'
    
    user_word = user_word.lower()
    expected_word = expected_word.lower()
    
    # Check for missing ending letters
    if expected_word.startswith(user_word) and len(expected_word) > len(user_word):
        missing = expected_word[len(user_word):]
        return f"missing_ending_{missing}"
    
    # Check for missing beginning letters
    if expected_word.endswith(user_word) and len(expected_word) > len(user_word):
        missing = expected_word[:-len(user_word)]
        return f"missing_beginning_{missing}"
    
    # Check for single character substitutions
    if len(user_word) == len(expected_word):
        diffs = [
            (i, u, e) 
            for i, (u, e) in enumerate(zip(user_word, expected_word)) 
            if u != e
        ]
        if len(diffs) == 1:
            pos, user_char, expected_char = diffs[0]
            return f"substituted_{expected_char}_with_{user_char}"
    
    # Check for TH → D/T substitution (common)
    if 'th' in expected_word and ('d' in user_word or 't' in user_word):
        return 'th_substitution'
    
    # General mispronunciation
    return 'mispronounced'


def validate_speech(
    audio_path: str,
    expected_text: str,
    similarity_threshold: float = 0.6
) -> Dict:
    """
    Validate user's speech against expected text.
    
    This is the GATEKEEPER function that prevents wrong speech from being scored.
    
    Args:
        audio_path: Path to cleaned audio file
        expected_text: Expected sentence text
        similarity_threshold: Minimum similarity to proceed (default 0.6)
    
    Returns:
        {
            'status': 'match' | 'partial' | 'mismatch',
            'transcribed': str,
            'expected': str,
            'similarity': float,
            'word_diff': List[dict],
            'missing_words': List[dict],
            'extra_words': List[dict],
            'wrong_words': List[dict],
            'can_proceed': bool
        }
    """
    # Get ASR transcription
    transcribed = transcribe_audio(audio_path)
    
    if not transcribed:
        logger.warning("ASR returned empty transcription")
        return {
            'status': 'error',
            'transcribed': '',
            'expected': expected_text,
            'similarity': 0.0,
            'word_diff': [],
            'missing_words': [],
            'extra_words': [],
            'wrong_words': [],
            'can_proceed': False,
            'message': 'Could not transcribe audio. Please speak more clearly.'
        }
    
    # Normalize for comparison
    trans_normalized = transcribed.lower().strip()
    expected_normalized = expected_text.lower().strip()
    
    # Calculate overall similarity using both methods
    sequence_similarity = SequenceMatcher(
        None,
        trans_normalized,
        expected_normalized
    ).ratio()
    
    # Also calculate Levenshtein-based similarity (fallback metric)
    levenshtein_similarity = edit_distance_similarity(trans_normalized, expected_normalized)
    
    # Use the higher similarity score for gating decisions
    similarity = max(sequence_similarity, levenshtein_similarity)
    
    # Get word-level diff
    trans_words = trans_normalized.split()
    expected_words = expected_normalized.split()
    
    # Use DTW word matching for better alignment
    dtw_comparison = compare_word_sequences(expected_words, trans_words)
    dtw_summary = get_word_match_summary(dtw_comparison)
    
    # Also keep the original word diff for compatibility
    word_diff = get_word_diff(trans_words, expected_words)
    
    # Categorize differences
    missing_words = [w for w in word_diff if w['type'] == 'missing']
    extra_words = [w for w in word_diff if w['type'] == 'extra']
    wrong_words = [w for w in word_diff if w['type'] == 'wrong']
    
    # Determine status
    if similarity >= 0.9:
        status = 'match'
        can_proceed = True
    elif similarity >= similarity_threshold:
        status = 'partial'
        can_proceed = True  # Allow scoring but show mistakes
    else:
        status = 'mismatch'
        can_proceed = False  # Reject - too different
    
    result = {
        'status': status,
        'transcribed': transcribed,
        'expected': expected_text,
        'similarity': round(similarity, 3),
        'sequence_similarity': round(sequence_similarity, 3),
        'levenshtein_similarity': round(levenshtein_similarity, 3),
        'word_diff': word_diff,
        'dtw_comparison': dtw_comparison,
        'dtw_summary': dtw_summary,
        'missing_words': missing_words,
        'extra_words': extra_words,
        'wrong_words': wrong_words,
        'can_proceed': can_proceed,
        # Word timestamps from Whisper (for word-level alignment)
        'word_locations': get_word_locations()
    }
    
    # Add helpful message
    if status == 'mismatch':
        result['message'] = f"It sounds like you said something different. Please try saying: '{expected_text}'"
    elif status == 'partial':
        error_count = len(missing_words) + len(wrong_words)
        result['message'] = f"Good attempt! Found {error_count} word(s) to improve."
    else:
        result['message'] = "Great! You said the sentence correctly."
    
    logger.info(f"ASR validation: status={status}, similarity={similarity:.2f}, dtw_accuracy={dtw_summary['accuracy']:.1f}%")
    
    return result


# Convenience alias
def validate(audio_path: str, expected_text: str, threshold: float = 0.6) -> Dict:
    """Alias for validate_speech."""
    return validate_speech(audio_path, expected_text, threshold)
