"""
Phone Error Rate (PER) Scorer for Pronunex.

Implements mentor's scoring strategy:
- Start from base score (100)
- Apply penalties for incorrect/missing phonemes
- Calculate PER = (Substitutions + Deletions + Insertions) / Total Reference Phonemes
"""

import logging
from typing import List, Dict, Optional
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)


# Penalty Configuration (adjustable)
PENALTIES = {
    'substitution': 5,      # Wrong phoneme pronounced
    'deletion': 10,         # Phoneme completely missing
    'insertion': 3,         # Extra phoneme added
    'weak_phoneme': 2,      # Phoneme pronounced but weak
}

# Similarity Thresholds
THRESHOLDS = {
    'correct': 0.85,        # >= 0.85 = correct phoneme
    'weak': 0.60,           # 0.60 - 0.85 = weak phoneme
    # < 0.60 = incorrect (substitution)
}


@dataclass
class PhonemeError:
    """Represents a single phoneme-level error."""
    word: str
    position: int
    expected_phoneme: str
    actual_phoneme: Optional[str]
    error_type: str  # 'substitution', 'deletion', 'insertion', 'weak'
    similarity: float
    message: str


@dataclass
class PERResult:
    """Result of PER scoring."""
    per_score: float           # 0.0 to 1.0 (0 = perfect, 1 = all errors)
    adjusted_score: int        # 100 - penalties (0 to 100)
    total_phonemes: int
    correct_count: int
    substitutions: int
    deletions: int
    insertions: int
    weak_count: int
    errors: List[PhonemeError] = field(default_factory=list)
    summary: str = ""


def calculate_per(
    reference_phonemes: List[str],
    user_phonemes: List[str],
    similarity_scores: List[float]
) -> PERResult:
    """
    Calculate Phone Error Rate and adjusted score.
    
    PER = (S + D + I) / N
    Where:
        S = Substitutions
        D = Deletions  
        I = Insertions
        N = Total reference phonemes
    
    Args:
        reference_phonemes: Expected phoneme sequence
        user_phonemes: User's phoneme sequence (from alignment)
        similarity_scores: Cosine similarity for each phoneme pair
    
    Returns:
        PERResult with detailed error breakdown
    """
    total_ref = len(reference_phonemes)
    total_user = len(user_phonemes)
    
    if total_ref == 0:
        return PERResult(
            per_score=0.0,
            adjusted_score=100,
            total_phonemes=0,
            correct_count=0,
            substitutions=0,
            deletions=0,
            insertions=0,
            weak_count=0,
            summary="No phonemes to evaluate."
        )
    
    # Counts
    correct = 0
    substitutions = 0
    deletions = 0
    insertions = 0
    weak = 0
    errors = []
    
    # Process each reference phoneme
    for i, ref_phoneme in enumerate(reference_phonemes):
        if i >= len(similarity_scores):
            # User didn't produce this phoneme - DELETION
            deletions += 1
            errors.append(PhonemeError(
                word="",
                position=i,
                expected_phoneme=ref_phoneme,
                actual_phoneme=None,
                error_type='deletion',
                similarity=0.0,
                message=f"Missing phoneme /{ref_phoneme}/ at position {i+1}."
            ))
            continue
        
        sim = similarity_scores[i]
        user_phoneme = user_phonemes[i] if i < total_user else None
        
        if sim >= THRESHOLDS['correct']:
            # CORRECT
            correct += 1
        elif sim >= THRESHOLDS['weak']:
            # WEAK (needs improvement but not wrong)
            weak += 1
            errors.append(PhonemeError(
                word="",
                position=i,
                expected_phoneme=ref_phoneme,
                actual_phoneme=user_phoneme,
                error_type='weak',
                similarity=sim,
                message=f"Phoneme /{ref_phoneme}/ needs improvement (score: {sim:.0%})."
            ))
        else:
            # SUBSTITUTION (wrong phoneme)
            substitutions += 1
            errors.append(PhonemeError(
                word="",
                position=i,
                expected_phoneme=ref_phoneme,
                actual_phoneme=user_phoneme,
                error_type='substitution',
                similarity=sim,
                message=f"You said /{user_phoneme}/ instead of /{ref_phoneme}/."
            ))
    
    # Check for insertions (extra phonemes at end)
    if total_user > total_ref:
        insertions = total_user - total_ref
        for i in range(total_ref, total_user):
            errors.append(PhonemeError(
                word="",
                position=i,
                expected_phoneme=None,
                actual_phoneme=user_phonemes[i],
                error_type='insertion',
                similarity=0.0,
                message=f"Extra phoneme /{user_phonemes[i]}/ at position {i+1}."
            ))
    
    # Calculate PER
    per = (substitutions + deletions + insertions) / total_ref
    
    # Calculate adjusted score (100 - penalties)
    penalty_total = (
        substitutions * PENALTIES['substitution'] +
        deletions * PENALTIES['deletion'] +
        insertions * PENALTIES['insertion'] +
        weak * PENALTIES['weak_phoneme']
    )
    adjusted_score = max(0, 100 - penalty_total)
    
    # Generate summary
    if per == 0 and weak == 0:
        summary = "Excellent! All phonemes pronounced correctly."
    elif per == 0:
        summary = f"Good pronunciation! {weak} phoneme(s) need minor improvement."
    elif per < 0.15:
        summary = f"Good attempt! {substitutions + deletions} phoneme error(s) detected."
    elif per < 0.30:
        summary = f"Partial match. Please focus on the highlighted phonemes."
    else:
        summary = f"Needs practice. {substitutions + deletions + insertions} phoneme errors found."
    
    return PERResult(
        per_score=round(per, 3),
        adjusted_score=adjusted_score,
        total_phonemes=total_ref,
        correct_count=correct,
        substitutions=substitutions,
        deletions=deletions,
        insertions=insertions,
        weak_count=weak,
        errors=errors,
        summary=summary
    )


def calculate_word_per(
    word: str,
    expected_phonemes: List[str],
    user_phonemes: List[str],
    similarity_scores: List[float]
) -> PERResult:
    """
    Calculate PER for a single word.
    
    This is called for each word after alignment.
    """
    result = calculate_per(expected_phonemes, user_phonemes, similarity_scores)
    
    # Update error messages with word context
    for error in result.errors:
        error.word = word
        if error.error_type == 'substitution':
            error.message = f"In '{word}': {error.message}"
        elif error.error_type == 'deletion':
            error.message = f"In '{word}': You missed the /{error.expected_phoneme}/ sound."
        elif error.error_type == 'weak':
            error.message = f"In '{word}': The /{error.expected_phoneme}/ sound was unclear."
    
    return result


def classify_phoneme_similarity(
    similarity: float,
    expected: str,
    actual: Optional[str] = None
) -> Dict:
    """
    Classify a single phoneme based on similarity score.
    
    Returns classification with error type if applicable.
    """
    if similarity >= THRESHOLDS['correct']:
        return {
            'classification': 'correct',
            'needs_feedback': False,
            'error_type': None,
            'penalty': 0
        }
    elif similarity >= THRESHOLDS['weak']:
        return {
            'classification': 'weak',
            'needs_feedback': True,
            'error_type': 'weak',
            'penalty': PENALTIES['weak_phoneme']
        }
    else:
        return {
            'classification': 'incorrect',
            'needs_feedback': True,
            'error_type': 'substitution',
            'penalty': PENALTIES['substitution']
        }


def generate_per_feedback(per_result: PERResult, sentence_text: str) -> List[str]:
    """
    Generate user-friendly feedback from PER results.
    
    Returns list of specific corrections.
    """
    feedback = []
    
    # Prioritize by error type
    deletions = [e for e in per_result.errors if e.error_type == 'deletion']
    substitutions = [e for e in per_result.errors if e.error_type == 'substitution']
    weak = [e for e in per_result.errors if e.error_type == 'weak']
    
    # Report deletions first (most important)
    for error in deletions[:3]:  # Limit to 3
        feedback.append(error.message)
    
    # Report substitutions
    for error in substitutions[:3]:
        feedback.append(error.message)
    
    # Report weak phonemes if space
    if len(feedback) < 5:
        for error in weak[:2]:
            feedback.append(error.message)
    
    return feedback
