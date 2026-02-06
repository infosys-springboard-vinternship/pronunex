"""
Edit Distance (Levenshtein) Module for Pronunex.

Provides edit distance calculations for word and phoneme comparisons.
Ported from ai-pronunciation-trainer project with enhancements.
"""

import numpy as np
from typing import List, Tuple, Optional


def edit_distance(seq1: str, seq2: str) -> int:
    """
    Calculate Levenshtein edit distance between two sequences.
    
    Args:
        seq1: First sequence (string or list)
        seq2: Second sequence (string or list)
    
    Returns:
        int: Minimum number of edits (insertions, deletions, substitutions)
    """
    size_x = len(seq1) + 1
    size_y = len(seq2) + 1
    
    matrix = np.zeros((size_x, size_y), dtype=int)
    
    # Initialize first row and column
    for x in range(size_x):
        matrix[x, 0] = x
    for y in range(size_y):
        matrix[0, y] = y
    
    # Fill the matrix
    for x in range(1, size_x):
        for y in range(1, size_y):
            if seq1[x - 1] == seq2[y - 1]:
                matrix[x, y] = min(
                    matrix[x - 1, y] + 1,      # Deletion
                    matrix[x - 1, y - 1],      # Match (no cost)
                    matrix[x, y - 1] + 1       # Insertion
                )
            else:
                matrix[x, y] = min(
                    matrix[x - 1, y] + 1,      # Deletion
                    matrix[x - 1, y - 1] + 1,  # Substitution
                    matrix[x, y - 1] + 1       # Insertion
                )
    
    return int(matrix[size_x - 1, size_y - 1])


def edit_distance_normalized(seq1: str, seq2: str) -> float:
    """
    Calculate normalized edit distance (0.0 to 1.0).
    
    Returns:
        float: 0.0 = identical, 1.0 = completely different
    """
    if len(seq1) == 0 and len(seq2) == 0:
        return 0.0
    
    distance = edit_distance(seq1, seq2)
    max_len = max(len(seq1), len(seq2))
    
    return distance / max_len


def edit_distance_similarity(seq1: str, seq2: str) -> float:
    """
    Calculate similarity score based on edit distance (0.0 to 1.0).
    
    Returns:
        float: 1.0 = identical, 0.0 = completely different
    """
    return 1.0 - edit_distance_normalized(seq1, seq2)


def get_edit_operations(seq1: str, seq2: str) -> List[dict]:
    """
    Get list of edit operations to transform seq1 into seq2.
    
    Returns:
        List of operations: [{'type': 'match|insert|delete|substitute', 
                              'position': int, 'char1': str, 'char2': str}]
    """
    size_x = len(seq1) + 1
    size_y = len(seq2) + 1
    
    # Build the DP matrix
    matrix = np.zeros((size_x, size_y), dtype=int)
    for x in range(size_x):
        matrix[x, 0] = x
    for y in range(size_y):
        matrix[0, y] = y
    
    for x in range(1, size_x):
        for y in range(1, size_y):
            if seq1[x - 1] == seq2[y - 1]:
                matrix[x, y] = matrix[x - 1, y - 1]
            else:
                matrix[x, y] = min(
                    matrix[x - 1, y] + 1,
                    matrix[x - 1, y - 1] + 1,
                    matrix[x, y - 1] + 1
                )
    
    # Backtrack to find operations
    operations = []
    x, y = len(seq1), len(seq2)
    
    while x > 0 or y > 0:
        if x > 0 and y > 0 and seq1[x - 1] == seq2[y - 1]:
            operations.append({
                'type': 'match',
                'position': x - 1,
                'char1': seq1[x - 1],
                'char2': seq2[y - 1]
            })
            x -= 1
            y -= 1
        elif x > 0 and y > 0 and matrix[x, y] == matrix[x - 1, y - 1] + 1:
            operations.append({
                'type': 'substitute',
                'position': x - 1,
                'char1': seq1[x - 1],
                'char2': seq2[y - 1]
            })
            x -= 1
            y -= 1
        elif x > 0 and matrix[x, y] == matrix[x - 1, y] + 1:
            operations.append({
                'type': 'delete',
                'position': x - 1,
                'char1': seq1[x - 1],
                'char2': None
            })
            x -= 1
        else:
            operations.append({
                'type': 'insert',
                'position': x,
                'char1': None,
                'char2': seq2[y - 1]
            })
            y -= 1
    
    operations.reverse()
    return operations


def calculate_word_accuracy(expected: str, actual: str) -> float:
    """
    Calculate word-level accuracy using edit distance.
    
    This is the fallback scoring method when embedding comparison fails.
    
    Args:
        expected: Expected word/sentence
        actual: Actual transcribed word/sentence
    
    Returns:
        float: Accuracy percentage (0-100)
    """
    if not expected:
        return 0.0 if actual else 100.0
    
    expected_clean = expected.lower().strip()
    actual_clean = actual.lower().strip()
    
    distance = edit_distance(expected_clean, actual_clean)
    max_len = max(len(expected_clean), len(actual_clean))
    
    if max_len == 0:
        return 100.0
    
    accuracy = (1 - distance / max_len) * 100
    return max(0.0, accuracy)


def calculate_phoneme_accuracy(expected_phonemes: List[str], actual_phonemes: List[str]) -> Tuple[float, dict]:
    """
    Calculate phoneme-level accuracy using edit distance.
    
    Args:
        expected_phonemes: List of expected ARPAbet phonemes
        actual_phonemes: List of actual phonemes from ASR
    
    Returns:
        Tuple of (accuracy %, breakdown dict)
    """
    if not expected_phonemes:
        return 0.0, {'substitutions': 0, 'deletions': 0, 'insertions': 0}
    
    # Join phonemes with separator for comparison
    expected_str = ' '.join(expected_phonemes)
    actual_str = ' '.join(actual_phonemes)
    
    operations = get_edit_operations(expected_str, actual_str)
    
    substitutions = sum(1 for op in operations if op['type'] == 'substitute')
    deletions = sum(1 for op in operations if op['type'] == 'delete')
    insertions = sum(1 for op in operations if op['type'] == 'insert')
    
    total_errors = substitutions + deletions + insertions
    total_expected = len(expected_phonemes)
    
    accuracy = max(0.0, (1 - total_errors / total_expected) * 100) if total_expected > 0 else 0.0
    
    return accuracy, {
        'substitutions': substitutions,
        'deletions': deletions,
        'insertions': insertions,
        'total_errors': total_errors,
        'total_expected': total_expected
    }
