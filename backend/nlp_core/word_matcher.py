"""
Word Matcher Module for Pronunex.

DTW-based word alignment for matching transcribed words to expected words.
Ported from ai-pronunciation-trainer project with enhancements.
"""

import logging
import numpy as np
from typing import List, Tuple, Optional
from string import punctuation

from .edit_distance import edit_distance

logger = logging.getLogger(__name__)

# DTW configuration
OFFSET_BLANK = 1  # Extra row for unmatched words
TIME_THRESHOLD_MAPPING = 5.0  # Max time for DTW solver


def get_word_distance_matrix(words_estimated: List[str], words_real: List[str]) -> np.ndarray:
    """
    Build distance matrix between estimated and real words using edit distance.
    
    Args:
        words_estimated: Words from ASR transcription
        words_real: Expected words from reference text
    
    Returns:
        np.ndarray: Distance matrix of shape (len(estimated)+1, len(real))
    """
    num_estimated = len(words_estimated)
    num_real = len(words_real)
    
    # Matrix with extra row for "no match" option
    matrix = np.zeros((num_estimated + OFFSET_BLANK, num_real))
    
    # Fill with edit distances
    for i, est_word in enumerate(words_estimated):
        for j, real_word in enumerate(words_real):
            matrix[i, j] = edit_distance(
                est_word.lower().strip(),
                real_word.lower().strip()
            )
    
    # Last row: cost of not matching (length of real word)
    for j, real_word in enumerate(words_real):
        matrix[num_estimated, j] = len(real_word)
    
    return matrix


def align_words_dtw(words_estimated: List[str], words_real: List[str]) -> np.ndarray:
    """
    Align words using Dynamic Time Warping.
    
    Args:
        words_estimated: Words from ASR transcription
        words_real: Expected words from reference text
    
    Returns:
        np.ndarray: Mapping indices (estimated index for each real word)
    """
    try:
        from dtwalign import dtw_from_distance_matrix
    except ImportError:
        logger.warning("dtwalign not installed, using fallback alignment")
        return _fallback_alignment(words_estimated, words_real)
    
    if not words_estimated or not words_real:
        return np.array([])
    
    # Build distance matrix
    distance_matrix = get_word_distance_matrix(words_estimated, words_real)
    
    try:
        # DTW alignment (transpose for dtwalign format)
        alignment = dtw_from_distance_matrix(distance_matrix.T)
        mapped_indices = alignment.get_warping_path()[:len(words_estimated)]
        return mapped_indices
    except Exception as e:
        logger.warning(f"DTW alignment failed: {e}, using fallback")
        return _fallback_alignment(words_estimated, words_real)


def _fallback_alignment(words_estimated: List[str], words_real: List[str]) -> np.ndarray:
    """Greedy alignment fallback when DTW fails."""
    num_real = len(words_real)
    num_estimated = len(words_estimated)
    
    # Simple greedy: assign each real word to best matching estimated word
    mapped_indices = []
    used_estimated = set()
    
    for j, real_word in enumerate(words_real):
        best_idx = -1
        best_dist = float('inf')
        
        for i, est_word in enumerate(words_estimated):
            if i in used_estimated:
                continue
            dist = edit_distance(est_word.lower(), real_word.lower())
            if dist < best_dist:
                best_dist = dist
                best_idx = i
        
        if best_idx >= 0 and best_dist < len(real_word):
            mapped_indices.append(best_idx)
            used_estimated.add(best_idx)
        else:
            mapped_indices.append(-1)  # No match
    
    return np.array(mapped_indices)


def get_mapped_words(
    words_estimated: List[str],
    words_real: List[str]
) -> Tuple[List[str], List[int]]:
    """
    Get best word mapping using DTW alignment.
    
    Args:
        words_estimated: Words from ASR transcription
        words_real: Expected words from reference text
    
    Returns:
        Tuple of (mapped_words, mapped_indices)
        - mapped_words: What user said for each expected word ('-' if missing)
        - mapped_indices: Index into words_estimated (-1 if not found)
    """
    if not words_real:
        return [], []
    
    if not words_estimated:
        return ['-'] * len(words_real), [-1] * len(words_real)
    
    # Get DTW alignment
    mapped_indices = align_words_dtw(words_estimated, words_real)
    
    # Build result
    mapped_words = []
    mapped_word_indices = []
    WORD_NOT_FOUND = '-'
    
    for word_idx in range(len(words_real)):
        # Find which estimated words map to this real word
        positions = np.where(mapped_indices == word_idx)[0].astype(int)
        
        if len(positions) == 0:
            mapped_words.append(WORD_NOT_FOUND)
            mapped_word_indices.append(-1)
            continue
        
        if len(positions) == 1:
            idx = positions[0]
            if idx < len(words_estimated):
                mapped_words.append(words_estimated[idx])
                mapped_word_indices.append(int(idx))
            else:
                mapped_words.append(WORD_NOT_FOUND)
                mapped_word_indices.append(-1)
            continue
        
        # Multiple matches - pick best one
        best_word = WORD_NOT_FOUND
        best_idx = -1
        best_dist = float('inf')
        
        for idx in positions:
            if idx >= len(words_estimated):
                continue
            dist = edit_distance(
                words_estimated[idx].lower(),
                words_real[word_idx].lower()
            )
            if dist < best_dist:
                best_dist = dist
                best_word = words_estimated[idx]
                best_idx = int(idx)
        
        mapped_words.append(best_word)
        mapped_word_indices.append(best_idx)
    
    return mapped_words, mapped_word_indices


def compare_word_sequences(
    expected_words: List[str],
    actual_words: List[str]
) -> List[dict]:
    """
    Compare expected vs actual word sequences with DTW alignment.
    
    Returns detailed comparison for each expected word.
    
    Args:
        expected_words: List of expected words
        actual_words: List of ASR transcribed words
    
    Returns:
        List of comparison dicts with match status and details
    """
    mapped_words, mapped_indices = get_mapped_words(actual_words, expected_words)
    
    results = []
    for i, expected in enumerate(expected_words):
        actual = mapped_words[i] if i < len(mapped_words) else '-'
        idx = mapped_indices[i] if i < len(mapped_indices) else -1
        
        if actual == '-':
            status = 'missing'
            similarity = 0.0
        elif expected.lower().strip() == actual.lower().strip():
            status = 'correct'
            similarity = 1.0
        else:
            distance = edit_distance(expected.lower(), actual.lower())
            max_len = max(len(expected), len(actual))
            similarity = 1.0 - (distance / max_len) if max_len > 0 else 0.0
            status = 'partial' if similarity > 0.5 else 'wrong'
        
        results.append({
            'position': i,
            'expected': expected,
            'actual': actual,
            'actual_index': idx,
            'status': status,
            'similarity': round(similarity, 3),
            'is_match': status == 'correct',
            'is_missing': status == 'missing',
            'is_wrong': status in ['wrong', 'partial']
        })
    
    # Check for extra words (insertions)
    used_indices = set(idx for idx in mapped_indices if idx >= 0)
    for i, word in enumerate(actual_words):
        if i not in used_indices:
            results.append({
                'position': -1,
                'expected': '',
                'actual': word,
                'actual_index': i,
                'status': 'extra',
                'similarity': 0.0,
                'is_match': False,
                'is_missing': False,
                'is_wrong': True,
                'is_extra': True
            })
    
    return results


def get_word_match_summary(comparison_results: List[dict]) -> dict:
    """
    Generate summary statistics from word comparison.
    
    Args:
        comparison_results: Results from compare_word_sequences
    
    Returns:
        Summary dict with counts and accuracy
    """
    total = len([r for r in comparison_results if r.get('status') != 'extra'])
    correct = sum(1 for r in comparison_results if r.get('status') == 'correct')
    partial = sum(1 for r in comparison_results if r.get('status') == 'partial')
    wrong = sum(1 for r in comparison_results if r.get('status') == 'wrong')
    missing = sum(1 for r in comparison_results if r.get('status') == 'missing')
    extra = sum(1 for r in comparison_results if r.get('status') == 'extra')
    
    accuracy = (correct / total * 100) if total > 0 else 0.0
    
    return {
        'total_expected': total,
        'correct': correct,
        'partial': partial,
        'wrong': wrong,
        'missing': missing,
        'extra': extra,
        'accuracy': round(accuracy, 1),
        'is_perfect': correct == total and extra == 0
    }
