"""
Admin Sentence Utilities for Pronunex.

Provides helper functions for sentence management:
- Auto-generate phoneme sequences using G2P
- Auto-detect difficulty level
- Extract target phonemes
- Validate and sanitize sentence text
"""

import re
import logging
from typing import List, Optional

logger = logging.getLogger(__name__)


def sanitize_sentence_text(text: str) -> str:
    """
    Sanitize sentence text to prevent XSS and injection.
    
    - Strips leading/trailing whitespace
    - Removes HTML tags
    - Removes script-like content
    - Limits length to 500 characters
    - Normalizes whitespace
    
    Returns:
        Sanitized text string
    
    Raises:
        ValueError: If text is empty after sanitization
    """
    if not text or not isinstance(text, str):
        raise ValueError("Sentence text is required and must be a string")
    
    # Strip whitespace
    text = text.strip()
    
    # Remove HTML tags
    text = re.sub(r'<[^>]+>', '', text)
    
    # Remove potential script injections
    text = re.sub(r'(?i)(javascript|on\w+)\s*[:=]', '', text)
    
    # Remove non-printable characters except standard whitespace
    text = re.sub(r'[^\x20-\x7E\s]', '', text)
    
    # Normalize whitespace
    text = re.sub(r'\s+', ' ', text).strip()
    
    # Length limit
    if len(text) > 500:
        text = text[:500]
    
    if len(text) < 2:
        raise ValueError("Sentence text must be at least 2 characters")
    
    return text


def generate_phoneme_sequence(text: str) -> List[str]:
    """
    Generate ARPAbet phoneme sequence for a sentence using G2P.
    
    Args:
        text: Input sentence text
    
    Returns:
        List of ARPAbet phonemes, e.g., ['DH', 'AH0', 'K', 'AE1', 'T']
    """
    try:
        from nlp_core.phoneme_extractor import text_to_phonemes
        return text_to_phonemes(text)
    except ImportError:
        logger.warning("G2P module not available, returning empty phoneme sequence")
        return []
    except Exception as e:
        logger.error(f"Phoneme generation failed for '{text[:50]}': {e}")
        return []


def extract_target_phonemes(phoneme_sequence: List[str], max_targets: int = 5) -> List[str]:
    """
    Extract unique target phonemes from a phoneme sequence.
    
    Strips stress markers and returns the most common unique phonemes
    that are good practice targets (consonants and complex sounds).
    
    Args:
        phoneme_sequence: Full ARPAbet sequence
        max_targets: Maximum number of target phonemes to return
    
    Returns:
        List of unique target phonemes
    """
    if not phoneme_sequence:
        return []
    
    # Priority phonemes that are commonly difficult
    priority_phonemes = {'TH', 'DH', 'R', 'L', 'S', 'Z', 'SH', 'ZH', 'CH', 'JH', 'NG', 'V', 'W'}
    
    # Strip stress markers
    stripped = [''.join(c for c in p if not c.isdigit()) for p in phoneme_sequence]
    
    # Find unique phonemes, prioritizing difficult ones
    seen = set()
    targets = []
    
    # First pass: priority phonemes
    for p in stripped:
        if p in priority_phonemes and p not in seen:
            targets.append(p)
            seen.add(p)
    
    # Second pass: remaining unique phonemes
    for p in stripped:
        if p not in seen and len(targets) < max_targets:
            targets.append(p)
            seen.add(p)
    
    return targets[:max_targets]


def auto_detect_difficulty(text: str) -> str:
    """
    Heuristically detect difficulty level based on sentence characteristics.
    
    Criteria:
    - Beginner: <= 5 words, common words
    - Intermediate: 6-12 words, moderate complexity
    - Advanced: 13+ words, complex vocabulary
    
    Args:
        text: Sentence text
    
    Returns:
        'beginner', 'intermediate', or 'advanced'
    """
    words = text.split()
    word_count = len(words)
    avg_word_length = sum(len(w) for w in words) / max(word_count, 1)
    
    # Count syllables (rough heuristic)
    syllable_count = sum(_count_syllables(w) for w in words)
    
    # Complex word ratio (words with 3+ syllables)
    complex_words = sum(1 for w in words if _count_syllables(w) >= 3)
    complex_ratio = complex_words / max(word_count, 1)
    
    if word_count <= 5 and avg_word_length <= 5 and complex_ratio < 0.1:
        return 'beginner'
    elif word_count <= 12 and complex_ratio < 0.3:
        return 'intermediate'
    else:
        return 'advanced'


def _count_syllables(word: str) -> int:
    """Rough syllable count using vowel groups."""
    word = word.lower().strip('.,!?;:')
    vowels = 'aeiouy'
    count = 0
    prev_vowel = False
    
    for char in word:
        is_vowel = char in vowels
        if is_vowel and not prev_vowel:
            count += 1
        prev_vowel = is_vowel
    
    # Handle silent 'e'
    if word.endswith('e') and count > 1:
        count -= 1
    
    return max(count, 1)


def validate_difficulty_level(level: str) -> str:
    """
    Validate and normalize difficulty level.
    
    Returns:
        Valid difficulty level string
    
    Raises:
        ValueError: If level is not valid
    """
    valid_levels = {'beginner', 'intermediate', 'advanced'}
    level = str(level).lower().strip()
    
    if level not in valid_levels:
        raise ValueError(f"Invalid difficulty level: {level}. Must be one of: {valid_levels}")
    
    return level


def validate_target_phonemes(phonemes: list) -> List[str]:
    """
    Validate and sanitize target phonemes list.
    
    Args:
        phonemes: List of phoneme strings
    
    Returns:
        Sanitized list of phoneme strings
    
    Raises:
        ValueError: If phonemes format is invalid
    """
    if not isinstance(phonemes, list):
        raise ValueError("Target phonemes must be a list")
    
    if len(phonemes) > 20:
        raise ValueError("Maximum 20 target phonemes allowed")
    
    sanitized = []
    for p in phonemes:
        if not isinstance(p, str):
            continue
        # Only allow alphanumeric phoneme symbols (ARPAbet)
        clean = re.sub(r'[^A-Za-z0-9]', '', p.strip().upper())
        if clean and len(clean) <= 5:
            sanitized.append(clean)
    
    return sanitized
