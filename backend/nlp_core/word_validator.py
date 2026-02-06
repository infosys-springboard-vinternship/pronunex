"""
Word Validator Module for Pronunex.

Validates word-level alignment between user speech and reference text.
Implements mentor's guidance: Word validation BEFORE phoneme scoring.

Key Logic:
- If user word count < reference → words missing
- If user word count > reference → extra words added  
- If counts match → proceed to phoneme-level comparison
"""

import logging
from typing import List, Tuple, Dict, Optional
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class WordValidationResult:
    """Result of word-level validation."""
    is_valid: bool
    total_expected: int
    total_spoken: int
    missing_words: List[str]
    extra_words: List[str]
    word_alignment: List[Dict]  # Maps user words to reference words
    message: str


def validate_word_count(
    user_words: List[str],
    reference_words: List[str]
) -> WordValidationResult:
    """
    Validate that user spoke the correct number of words.
    
    This is the FIRST check before any phoneme analysis.
    
    Args:
        user_words: Words transcribed from user audio
        reference_words: Words from reference sentence
    
    Returns:
        WordValidationResult with missing/extra words info
    """
    user_count = len(user_words)
    ref_count = len(reference_words)
    
    # Normalize for comparison
    user_lower = [w.lower().strip() for w in user_words]
    ref_lower = [w.lower().strip() for w in reference_words]
    
    if user_count == ref_count:
        # Counts match - check if words are aligned
        alignment = align_words_positional(user_lower, ref_lower)
        return WordValidationResult(
            is_valid=True,
            total_expected=ref_count,
            total_spoken=user_count,
            missing_words=[],
            extra_words=[],
            word_alignment=alignment,
            message="Word count matches. Proceeding to phoneme analysis."
        )
    
    elif user_count < ref_count:
        # Words are missing
        missing = find_missing_words(user_lower, ref_lower)
        alignment = align_words_dtw(user_lower, ref_lower)
        
        missing_str = "', '".join(missing)
        if len(missing) == 1:
            message = f"You missed the word '{missing[0]}'."
        else:
            message = f"You missed {len(missing)} words: '{missing_str}'."
        
        return WordValidationResult(
            is_valid=False,
            total_expected=ref_count,
            total_spoken=user_count,
            missing_words=missing,
            extra_words=[],
            word_alignment=alignment,
            message=message
        )
    
    else:
        # Extra words added
        extra = find_extra_words(user_lower, ref_lower)
        alignment = align_words_dtw(user_lower, ref_lower)
        
        extra_str = "', '".join(extra)
        if len(extra) == 1:
            message = f"You added an extra word '{extra[0]}'. Please say only the sentence shown."
        else:
            message = f"You added {len(extra)} extra words: '{extra_str}'."
        
        return WordValidationResult(
            is_valid=False,
            total_expected=ref_count,
            total_spoken=user_count,
            missing_words=[],
            extra_words=extra,
            word_alignment=alignment,
            message=message
        )


def align_words_positional(
    user_words: List[str],
    reference_words: List[str]
) -> List[Dict]:
    """
    Align words by position when counts match.
    
    Args:
        user_words: User spoken words (normalized)
        reference_words: Reference words (normalized)
    
    Returns:
        List of alignment dicts with word pairs and match status
    """
    alignment = []
    
    for i, (user_word, ref_word) in enumerate(zip(user_words, reference_words)):
        is_match = user_word == ref_word
        
        alignment.append({
            'position': i,
            'reference': ref_word,
            'user': user_word,
            'is_match': is_match,
            'is_substitution': not is_match
        })
    
    return alignment


def align_words_dtw(
    user_words: List[str],
    reference_words: List[str]
) -> List[Dict]:
    """
    Align words using DTW when word counts differ.
    
    Uses edit distance to find optimal word alignment.
    """
    from .edit_distance import edit_distance
    
    alignment = []
    used_user_indices = set()
    
    # For each reference word, find best matching user word
    for ref_idx, ref_word in enumerate(reference_words):
        best_match_idx = -1
        best_distance = float('inf')
        
        for user_idx, user_word in enumerate(user_words):
            if user_idx in used_user_indices:
                continue
            
            dist = edit_distance(user_word, ref_word)
            if dist < best_distance:
                best_distance = dist
                best_match_idx = user_idx
        
        # Accept match if distance is reasonable (< half word length)
        if best_match_idx >= 0 and best_distance <= len(ref_word) // 2 + 1:
            used_user_indices.add(best_match_idx)
            alignment.append({
                'position': ref_idx,
                'reference': ref_word,
                'user': user_words[best_match_idx],
                'user_position': best_match_idx,
                'is_match': ref_word == user_words[best_match_idx],
                'is_substitution': ref_word != user_words[best_match_idx],
                'edit_distance': best_distance
            })
        else:
            # No match found - word is missing
            alignment.append({
                'position': ref_idx,
                'reference': ref_word,
                'user': None,
                'user_position': -1,
                'is_match': False,
                'is_missing': True,
                'edit_distance': len(ref_word)
            })
    
    return alignment


def find_missing_words(
    user_words: List[str],
    reference_words: List[str]
) -> List[str]:
    """
    Find which reference words are missing from user speech.
    
    Uses sequence matching to identify gaps.
    """
    from difflib import SequenceMatcher
    
    missing = []
    matcher = SequenceMatcher(None, user_words, reference_words)
    
    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag == 'delete':
            # Words in reference but not in user
            missing.extend(reference_words[j1:j2])
        elif tag == 'replace':
            # Check if any reference words have no close match
            for ref_word in reference_words[j1:j2]:
                found_similar = False
                for user_word in user_words[i1:i2]:
                    # Consider similar if edit distance < half length
                    from .edit_distance import edit_distance
                    if edit_distance(user_word, ref_word) <= len(ref_word) // 2:
                        found_similar = True
                        break
                if not found_similar:
                    missing.append(ref_word)
    
    # Also check simple set difference as fallback
    if not missing:
        user_set = set(user_words)
        for ref_word in reference_words:
            if ref_word not in user_set:
                # Check for close matches
                has_close = any(
                    abs(len(u) - len(ref_word)) <= 2 and 
                    u[:2] == ref_word[:2]  # Same prefix
                    for u in user_words
                )
                if not has_close:
                    missing.append(ref_word)
    
    return missing


def find_extra_words(
    user_words: List[str],
    reference_words: List[str]
) -> List[str]:
    """
    Find extra words user spoke that aren't in reference.
    """
    extra = []
    ref_set = set(reference_words)
    
    for user_word in user_words:
        if user_word not in ref_set:
            # Check if it's a close match to any reference word
            from .edit_distance import edit_distance
            is_close = any(
                edit_distance(user_word, ref) <= len(ref) // 2
                for ref in reference_words
            )
            if not is_close:
                extra.append(user_word)
    
    return extra


def get_word_phoneme_map(
    sentence_text: str,
    phoneme_sequence: List[str]
) -> Dict[str, List[str]]:
    """
    Map each word to its phonemes using G2P.
    
    This is the ground truth reference for phoneme comparison.
    
    Args:
        sentence_text: Full sentence text
        phoneme_sequence: Full phoneme sequence from DB
    
    Returns:
        Dict mapping each word to its phonemes
    """
    try:
        from g2p_en import G2p
        g2p = G2p()
    except ImportError:
        logger.warning("g2p_en not available, using stored sequence")
        # Fallback: distribute phonemes evenly across words
        words = sentence_text.split()
        phonemes_per_word = len(phoneme_sequence) // len(words) if words else 0
        return {
            word: phoneme_sequence[i*phonemes_per_word:(i+1)*phonemes_per_word]
            for i, word in enumerate(words)
        }
    
    word_phonemes = {}
    words = sentence_text.split()
    
    for word in words:
        # Get phonemes for this word
        phonemes = g2p(word)
        # Filter out non-phoneme symbols
        clean_phonemes = [
            p.upper() for p in phonemes 
            if p.strip() and not p.isspace() and p not in [' ', "'", '-']
        ]
        word_phonemes[word.lower()] = clean_phonemes
    
    return word_phonemes
