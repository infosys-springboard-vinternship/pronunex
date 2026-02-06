"""
Letter Highlighter Module for Pronunex.

Provides letter-level error visualization showing exactly which letters
in a word were pronounced correctly or incorrectly.
Ported from ai-pronunciation-trainer project with enhancements.
"""

import logging
from typing import List, Dict, Tuple, Optional
from string import punctuation
from dataclasses import dataclass

from .edit_distance import edit_distance, get_edit_operations

logger = logging.getLogger(__name__)


@dataclass
class LetterStatus:
    """Status of a single letter in a word."""
    letter: str
    is_correct: bool
    error_type: Optional[str] = None  # 'substitution', 'deletion', None
    expected: Optional[str] = None
    actual: Optional[str] = None


def highlight_letter_errors(
    expected_word: str,
    actual_word: str,
    case_sensitive: bool = False
) -> List[LetterStatus]:
    """
    Determine which letters in a word were pronounced correctly.
    
    Uses edit distance operations to align letters and identify errors.
    
    Args:
        expected_word: The expected word
        actual_word: What the user actually said
        case_sensitive: Whether to treat case as errors
    
    Returns:
        List of LetterStatus for each letter in expected word
    """
    if not expected_word:
        return []
    
    if actual_word == '-' or not actual_word:
        # Word was completely missing
        return [
            LetterStatus(
                letter=char,
                is_correct=False,
                error_type='deletion',
                expected=char,
                actual=None
            )
            for char in expected_word
        ]
    
    # Normalize for comparison
    exp = expected_word if case_sensitive else expected_word.lower()
    act = actual_word if case_sensitive else actual_word.lower()
    
    # Get edit operations
    operations = get_edit_operations(exp, act)
    
    # Build letter status from operations
    result = []
    exp_idx = 0
    
    for op in operations:
        if op['type'] == 'match':
            result.append(LetterStatus(
                letter=expected_word[exp_idx],
                is_correct=True,
                expected=expected_word[exp_idx],
                actual=op['char2']
            ))
            exp_idx += 1
        
        elif op['type'] == 'substitute':
            result.append(LetterStatus(
                letter=expected_word[exp_idx],
                is_correct=False,
                error_type='substitution',
                expected=expected_word[exp_idx],
                actual=op['char2']
            ))
            exp_idx += 1
        
        elif op['type'] == 'delete':
            result.append(LetterStatus(
                letter=expected_word[exp_idx],
                is_correct=False,
                error_type='deletion',
                expected=expected_word[exp_idx],
                actual=None
            ))
            exp_idx += 1
        
        # 'insert' operations don't consume expected characters
    
    # Handle any remaining expected characters
    while exp_idx < len(expected_word):
        result.append(LetterStatus(
            letter=expected_word[exp_idx],
            is_correct=False,
            error_type='deletion',
            expected=expected_word[exp_idx],
            actual=None
        ))
        exp_idx += 1
    
    return result


def get_letter_correctness_array(
    expected_word: str,
    actual_word: str
) -> List[int]:
    """
    Get simple array of 1s and 0s for letter correctness.
    
    Args:
        expected_word: Expected word
        actual_word: Actual word spoken
    
    Returns:
        List[int]: 1 for correct, 0 for incorrect, for each letter
    """
    statuses = highlight_letter_errors(expected_word, actual_word)
    return [1 if s.is_correct else 0 for s in statuses]


def format_letter_errors_string(
    expected_word: str,
    actual_word: str
) -> str:
    """
    Format letter correctness as string of 1s and 0s.
    
    Compatible with external project's format.
    
    Args:
        expected_word: Expected word
        actual_word: Actual word spoken
    
    Returns:
        str: e.g., "11101" for a 5-letter word with 1 error
    """
    arr = get_letter_correctness_array(expected_word, actual_word)
    return ''.join(str(x) for x in arr)


def highlight_sentence_letters(
    expected_words: List[str],
    actual_words: List[str]
) -> str:
    """
    Get letter correctness for entire sentence as space-separated string.
    
    Args:
        expected_words: List of expected words
        actual_words: List of actual words (matched to expected)
    
    Returns:
        str: e.g., "111 1101 11111" for 3 words
    """
    if len(actual_words) < len(expected_words):
        actual_words = actual_words + ['-'] * (len(expected_words) - len(actual_words))
    
    word_results = []
    for exp, act in zip(expected_words, actual_words):
        # Skip punctuation-only words
        clean_exp = ''.join(c for c in exp if c not in punctuation)
        if not clean_exp:
            continue
        word_results.append(format_letter_errors_string(exp, act))
    
    return ' '.join(word_results)


def generate_highlighted_word(
    expected_word: str,
    actual_word: str,
    correct_class: str = 'correct',
    incorrect_class: str = 'incorrect'
) -> Dict:
    """
    Generate word with letter-level highlighting data.
    
    Args:
        expected_word: Expected word
        actual_word: Actual spoken word
        correct_class: CSS class for correct letters
        incorrect_class: CSS class for incorrect letters
    
    Returns:
        Dict with word info and letter highlighting
    """
    statuses = highlight_letter_errors(expected_word, actual_word)
    
    letters = []
    for status in statuses:
        letters.append({
            'letter': status.letter,
            'is_correct': status.is_correct,
            'class': correct_class if status.is_correct else incorrect_class,
            'error_type': status.error_type,
            'expected': status.expected,
            'actual': status.actual
        })
    
    correct_count = sum(1 for s in statuses if s.is_correct)
    total = len(statuses)
    
    return {
        'word': expected_word,
        'actual': actual_word,
        'letters': letters,
        'correct_count': correct_count,
        'total_letters': total,
        'accuracy': (correct_count / total * 100) if total > 0 else 0.0,
        'is_perfect': correct_count == total and total > 0
    }


def generate_highlighted_sentence(
    expected_words: List[str],
    actual_words: List[str]
) -> Dict:
    """
    Generate sentence with word and letter-level highlighting.
    
    Args:
        expected_words: List of expected words
        actual_words: List of actual spoken words (aligned to expected)
    
    Returns:
        Dict with sentence info and per-word highlighting
    """
    if len(actual_words) < len(expected_words):
        actual_words = actual_words + ['-'] * (len(expected_words) - len(actual_words))
    
    words = []
    total_correct = 0
    total_letters = 0
    
    for exp, act in zip(expected_words, actual_words):
        word_highlight = generate_highlighted_word(exp, act)
        words.append(word_highlight)
        total_correct += word_highlight['correct_count']
        total_letters += word_highlight['total_letters']
    
    return {
        'words': words,
        'total_correct_letters': total_correct,
        'total_letters': total_letters,
        'letter_accuracy': (total_correct / total_letters * 100) if total_letters > 0 else 0.0,
        'word_count': len(expected_words),
        'perfect_words': sum(1 for w in words if w['is_perfect']),
        'letter_errors_string': highlight_sentence_letters(expected_words, actual_words)
    }


def get_error_positions(expected_word: str, actual_word: str) -> List[int]:
    """
    Get positions (0-indexed) of incorrect letters.
    
    Args:
        expected_word: Expected word
        actual_word: Actual spoken word
    
    Returns:
        List of positions where letters are incorrect
    """
    statuses = highlight_letter_errors(expected_word, actual_word)
    return [i for i, s in enumerate(statuses) if not s.is_correct]


def describe_letter_errors(expected_word: str, actual_word: str) -> List[str]:
    """
    Generate human-readable descriptions of letter errors.
    
    Args:
        expected_word: Expected word
        actual_word: Actual spoken word
    
    Returns:
        List of error descriptions
    """
    statuses = highlight_letter_errors(expected_word, actual_word)
    descriptions = []
    
    for i, status in enumerate(statuses):
        if not status.is_correct:
            pos = i + 1  # 1-indexed for user
            if status.error_type == 'deletion':
                descriptions.append(f"Missing '{status.letter}' at position {pos}")
            elif status.error_type == 'substitution':
                descriptions.append(
                    f"Position {pos}: said '{status.actual}' instead of '{status.letter}'"
                )
    
    return descriptions
