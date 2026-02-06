"""
Mistake Detector Module for Pronunex.

Pinpoints exactly WHERE user made pronunciation errors:
- Word-level: "You said 'sell' instead of 'sells'"
- Phoneme-level: "The 'TH' sound needs work"
- Character-level: "Missing 's' at the end"
- Letter-level: Shows exactly which letters were wrong (NEW)

Uses LLM for generating dynamic, personalized pronunciation tips.
"""

import logging
from typing import List, Dict, Optional
from dataclasses import dataclass, asdict

# Import letter highlighting for character-level feedback
from .letter_highlighter import generate_highlighted_sentence, describe_letter_errors

logger = logging.getLogger(__name__)


@dataclass
class Mistake:
    """Represents a single pronunciation mistake."""
    type: str  # 'missing_word', 'wrong_word', 'missing_sound', 'wrong_sound', 'weak_phoneme'
    position: int  # Index in sentence
    expected: str  # What should have been said
    actual: str  # What user actually said
    severity: str  # 'minor', 'moderate', 'major'
    suggestion: str  # Help text for user
    phoneme: Optional[str] = None  # For phoneme-level errors
    word: Optional[str] = None  # Associated word
    
    def to_dict(self) -> dict:
        return asdict(self)


class MistakeDetector:
    """
    Detects and explains pronunciation mistakes.
    
    Combines ASR word diff + phoneme scores to give comprehensive feedback.
    Uses LLM for generating personalized pronunciation tips.
    """
    
    def __init__(self, weak_threshold: float = 0.7):
        self.weak_threshold = weak_threshold
        self._llm_service = None
    
    def _get_llm_service(self):
        """Lazy load LLM service."""
        if self._llm_service is None:
            from services.llm_service import LLMService
            self._llm_service = LLMService()
        return self._llm_service
    
    def detect_mistakes(
        self,
        asr_result: Dict,  # From asr_validator
        phoneme_scores: List[Dict],  # From scorer
        expected_text: str,
        word_validation: Optional[Dict] = None  # From word_validator
    ) -> Dict:
        """
        Combine word validation + phoneme scores to pinpoint all mistakes.
        
        Implements mentor's guidance:
        1. Word-level validation first (missing/extra words)
        2. Phoneme-level comparison per word
        3. Explicit error classification (substitution/deletion/insertion)
        4. PER-based scoring
        
        Args:
            asr_result: Result from asr_validator.validate_speech()
            phoneme_scores: List of phoneme score dicts from scorer
            expected_text: The expected sentence text
            word_validation: Optional result from word_validator
        
        Returns:
            Comprehensive mistake report with PER scoring
        """
        from .per_scorer import calculate_per, classify_phoneme_similarity, generate_per_feedback
        
        mistakes = []
        
        # 1. Word-level mistakes from validation
        word_mistakes = self._detect_word_mistakes(asr_result)
        mistakes.extend(word_mistakes)
        
        # 2. Phoneme-level mistakes with ERROR CLASSIFICATION
        phoneme_mistakes, error_counts = self._detect_phoneme_mistakes_classified(phoneme_scores)
        mistakes.extend(phoneme_mistakes)
        
        # 3. Calculate PER score
        phonemes = [ps['phoneme'] for ps in phoneme_scores] if phoneme_scores else []
        similarities = [ps['score'] for ps in phoneme_scores] if phoneme_scores else []
        
        per_result = calculate_per(phonemes, phonemes, similarities)
        
        # 4. Generate letter-level highlighting
        letter_highlighting = self._generate_letter_highlighting(asr_result)
        
        # 5. Generate user-friendly feedback
        feedback = self._generate_feedback(mistakes, expected_text, phoneme_scores)
        
        # 6. Generate specific error messages
        specific_errors = self._generate_specific_errors(
            word_mistakes, 
            phoneme_mistakes,
            error_counts,
            expected_text
        )
        
        # 7. BLEND letter_accuracy into final adjusted_score
        # This ensures word-level errors affect the displayed score
        letter_accuracy = letter_highlighting.get('letter_accuracy', 100.0) if letter_highlighting else 100.0
        per_adjusted = per_result.adjusted_score
        
        # Weighted blend: 40% PER (phoneme), 60% letter accuracy (word-level)
        # This prevents 100% score when letter analysis shows errors
        final_adjusted_score = int(0.4 * per_adjusted + 0.6 * letter_accuracy)
        
        # If there are word mistakes, apply additional penalty
        if len(word_mistakes) > 0:
            word_penalty = len(word_mistakes) * 5  # 5 points per word mistake
            final_adjusted_score = max(0, final_adjusted_score - word_penalty)
        
        return {
            'has_mistakes': len(mistakes) > 0,
            'mistakes': [m.to_dict() for m in mistakes],
            'mistake_count': len(mistakes),
            'word_errors': len(word_mistakes),
            'phoneme_errors': len(phoneme_mistakes),
            
            # NEW: Explicit error classification
            'error_classification': {
                'substitutions': error_counts.get('substitution', 0),
                'deletions': error_counts.get('deletion', 0),
                'insertions': error_counts.get('insertion', 0),
                'weak_phonemes': error_counts.get('weak', 0)
            },
            
            # UPDATED: Use blended score
            'per_score': per_result.per_score,
            'adjusted_score': final_adjusted_score,  # Now blended with letter_accuracy
            'per_adjusted_score': per_adjusted,      # Original PER-only score (for debugging)
            'letter_accuracy': letter_accuracy,      # For transparency
            'per_summary': per_result.summary,
            
            # NEW: Specific user-facing errors
            'specific_errors': specific_errors,
            
            'feedback': feedback,
            'letter_highlighting': letter_highlighting,
            'summary': self._generate_summary(mistakes)
        }
    
    def _detect_word_mistakes(self, asr_result: Dict) -> List[Mistake]:
        """Extract word-level mistakes from ASR comparison."""
        mistakes = []
        
        for diff in asr_result.get('word_diff', []):
            if diff['type'] == 'missing':
                mistakes.append(Mistake(
                    type='missing_word',
                    position=diff['position'],
                    expected=diff['word'],
                    actual='(not spoken)',
                    severity='major',
                    suggestion=f"You skipped the word '{diff['word']}'. Try saying the complete sentence.",
                    word=diff['word']
                ))
            
            elif diff['type'] == 'wrong':
                issue = diff.get('issue', 'mispronounced')
                user_said = diff.get('user_said', '')
                expected_word = diff['word']
                
                # Determine severity and generate specific suggestion
                if 'missing_ending' in issue:
                    missing = issue.replace('missing_ending_', '')
                    mistakes.append(Mistake(
                        type='missing_sound',
                        position=diff['position'],
                        expected=expected_word,
                        actual=user_said,
                        severity='moderate',
                        suggestion=f"You said '{user_said}' but it should be '{expected_word}'. Don't forget the '{missing}' at the end!",
                        word=expected_word
                    ))
                
                elif 'missing_beginning' in issue:
                    missing = issue.replace('missing_beginning_', '')
                    mistakes.append(Mistake(
                        type='missing_sound',
                        position=diff['position'],
                        expected=expected_word,
                        actual=user_said,
                        severity='moderate',
                        suggestion=f"You said '{user_said}' but it should be '{expected_word}'. Start with '{missing}'.",
                        word=expected_word
                    ))
                
                elif 'substituted' in issue:
                    # e.g., "substituted_th_with_d"
                    parts = issue.replace('substituted_', '').split('_with_')
                    if len(parts) == 2:
                        expected_sound, user_sound = parts
                        mistakes.append(Mistake(
                            type='wrong_sound',
                            position=diff['position'],
                            expected=expected_word,
                            actual=user_said,
                            severity='minor',
                            suggestion=f"In '{expected_word}', you used '{user_sound}' instead of '{expected_sound}'.",
                            word=expected_word
                        ))
                    else:
                        mistakes.append(Mistake(
                            type='wrong_word',
                            position=diff['position'],
                            expected=expected_word,
                            actual=user_said,
                            severity='moderate',
                            suggestion=f"'{user_said}' should be '{expected_word}'.",
                            word=expected_word
                        ))
                
                elif issue == 'th_substitution':
                    mistakes.append(Mistake(
                        type='wrong_sound',
                        position=diff['position'],
                        expected=expected_word,
                        actual=user_said,
                        severity='moderate',
                        suggestion=f"In '{expected_word}', the 'TH' sound was pronounced as 'D' or 'T'. Put your tongue between your teeth.",
                        word=expected_word,
                        phoneme='TH'
                    ))
                
                else:
                    mistakes.append(Mistake(
                        type='wrong_word',
                        position=diff['position'],
                        expected=expected_word,
                        actual=user_said,
                        severity='major',
                        suggestion=f"You said '{user_said}' instead of '{expected_word}'. Practice this word.",
                        word=expected_word
                    ))
            
            elif diff['type'] == 'extra':
                mistakes.append(Mistake(
                    type='extra_word',
                    position=diff['position'],
                    expected='(nothing)',
                    actual=diff.get('user_said', ''),
                    severity='minor',
                    suggestion=f"You added an extra word '{diff.get('user_said', '')}'. Try to match the exact sentence.",
                    word=diff.get('user_said', '')
                ))
        
        return mistakes
    
    def _detect_phoneme_mistakes(self, phoneme_scores: List[Dict]) -> List[Mistake]:
        """Extract phoneme-level mistakes from scores."""
        mistakes = []
        
        # Handle unscorable or invalid results
        if not phoneme_scores or isinstance(phoneme_scores, dict):
            return mistakes
        
        for idx, ps in enumerate(phoneme_scores):
            if ps.get('is_weak', False) and ps['score'] < self.weak_threshold:
                # Determine severity based on score
                score = ps['score']
                if score < 0.4:
                    severity = 'major'
                elif score < 0.6:
                    severity = 'moderate'
                else:
                    severity = 'minor'
                
                phoneme = ps['phoneme']
                word = ps.get('word', '')
                
                mistakes.append(Mistake(
                    type='weak_phoneme',
                    position=idx,
                    expected=phoneme,
                    actual=f"(score: {score:.2f})",
                    severity=severity,
                    suggestion='',  # Will be filled by AI
                    phoneme=phoneme,
                    word=word
                ))
        
        return mistakes
    
    def _detect_phoneme_mistakes_classified(
        self, 
        phoneme_scores: List[Dict]
    ) -> tuple:
        """
        Detect phoneme mistakes with EXPLICIT error classification.
        
        Implements mentor's guidance:
        - >= 0.85: Correct
        - 0.60 - 0.85: Weak (needs improvement)
        - < 0.60: Incorrect (substitution)
        
        Returns:
            Tuple of (mistakes list, error_counts dict)
        """
        from .per_scorer import THRESHOLDS
        
        mistakes = []
        error_counts = {
            'substitution': 0,
            'deletion': 0,
            'insertion': 0,
            'weak': 0
        }
        
        if not phoneme_scores or isinstance(phoneme_scores, dict):
            return mistakes, error_counts
        
        for idx, ps in enumerate(phoneme_scores):
            score = ps.get('score', 0)
            phoneme = ps['phoneme']
            word = ps.get('word', '')
            
            # Classify based on thresholds
            if score >= THRESHOLDS['correct']:
                # CORRECT - no mistake
                continue
            
            elif score >= THRESHOLDS['weak']:
                # WEAK - needs improvement but not wrong
                error_counts['weak'] += 1
                mistakes.append(Mistake(
                    type='weak_phoneme',
                    position=idx,
                    expected=phoneme,
                    actual=f"(weak: {score:.0%})",
                    severity='minor',
                    suggestion=f"The '{phoneme}' sound in '{word}' needs to be clearer.",
                    phoneme=phoneme,
                    word=word
                ))
            
            else:
                # SUBSTITUTION - wrong phoneme
                error_counts['substitution'] += 1
                
                # Determine severity based on how wrong
                if score < 0.3:
                    severity = 'major'
                elif score < 0.5:
                    severity = 'moderate'
                else:
                    severity = 'minor'
                
                mistakes.append(Mistake(
                    type='substitution',
                    position=idx,
                    expected=phoneme,
                    actual=f"(wrong: {score:.0%})",
                    severity=severity,
                    suggestion=f"In '{word}': The '{phoneme}' sound was incorrect.",
                    phoneme=phoneme,
                    word=word
                ))
        
        return mistakes, error_counts
    
    def _generate_specific_errors(
        self,
        word_mistakes: List[Mistake],
        phoneme_mistakes: List[Mistake],
        error_counts: Dict,
        expected_text: str
    ) -> List[str]:
        """
        Generate specific, user-facing error messages.
        
        Format: "You missed 'X' phonemes" or "You said 'X' instead of 'Y'"
        """
        errors = []
        
        # Word-level errors first (most important)
        missing_words = [m for m in word_mistakes if m.type == 'missing_word']
        if missing_words:
            words = [m.word for m in missing_words]
            if len(words) == 1:
                errors.append(f"You missed the word '{words[0]}'.")
            else:
                errors.append(f"You missed {len(words)} words: {', '.join(words)}.")
        
        wrong_words = [m for m in word_mistakes if m.type in ['wrong_word', 'missing_sound']]
        for m in wrong_words[:3]:  # Limit to 3
            errors.append(m.suggestion)
        
        # Phoneme-level errors
        substitutions = error_counts.get('substitution', 0)
        if substitutions > 0:
            if substitutions == 1:
                # Get the specific phoneme
                sub_mistake = next((m for m in phoneme_mistakes if m.type == 'substitution'), None)
                if sub_mistake:
                    errors.append(f"You mispronounced the '{sub_mistake.phoneme}' sound in '{sub_mistake.word}'.")
            else:
                errors.append(f"You mispronounced {substitutions} phonemes.")
        
        weak_count = error_counts.get('weak', 0)
        if weak_count > 0 and len(errors) < 5:
            if weak_count == 1:
                weak_mistake = next((m for m in phoneme_mistakes if m.type == 'weak_phoneme'), None)
                if weak_mistake:
                    errors.append(f"The '{weak_mistake.phoneme}' sound needs to be clearer.")
            else:
                errors.append(f"{weak_count} phonemes need to be clearer.")
        
        return errors
    
    def _generate_letter_highlighting(self, asr_result: Dict) -> Dict:
        """
        Generate letter-level highlighting showing which letters were correct/incorrect.
        
        Uses DTW word alignment from asr_result if available, otherwise falls back
        to basic word comparison.
        
        Args:
            asr_result: Result from asr_validator containing word comparisons
        
        Returns:
            Dict with letter highlighting data for each word
        """
        expected = asr_result.get('expected', '')
        transcribed = asr_result.get('transcribed', '')
        
        if not expected or not transcribed:
            return {
                'words': [],
                'total_letters': 0,
                'correct_letters': 0,
                'letter_accuracy': 0.0,
                'errors_string': ''
            }
        
        expected_words = expected.lower().split()
        
        # Try to use DTW comparison results if available
        dtw_comparison = asr_result.get('dtw_comparison', [])
        
        if dtw_comparison:
            # Build actual words from DTW mapping
            actual_words = []
            for comp in dtw_comparison:
                if comp.get('status') != 'extra':
                    actual_words.append(comp.get('actual', '-'))
        else:
            # Fallback: use transcribed words directly
            actual_words = transcribed.lower().split()
        
        # Generate highlighting using the letter_highlighter module
        try:
            highlighting = generate_highlighted_sentence(expected_words, actual_words)
            
            # Add per-word error descriptions
            for i, word_data in enumerate(highlighting.get('words', [])):
                expected_word = word_data.get('word', '')
                actual_word = word_data.get('actual', '')
                if not word_data.get('is_perfect', True):
                    word_data['error_descriptions'] = describe_letter_errors(
                        expected_word, actual_word
                    )
            
            return highlighting
            
        except Exception as e:
            logger.warning(f"Letter highlighting failed: {e}")
            return {
                'words': [],
                'total_letters': len(expected.replace(' ', '')),
                'correct_letters': 0,
                'letter_accuracy': 0.0,
                'errors_string': '',
                'error': str(e)
            }
    
    def _generate_feedback(
        self, 
        mistakes: List[Mistake], 
        expected_text: str,
        phoneme_scores: List[Dict]
    ) -> Dict:
        """
        Generate user-friendly feedback with AI-powered tips.
        """
        if not mistakes:
            return {
                'status': 'excellent',
                'message': 'Great job! You pronounced everything correctly!',
                'tips': []
            }
        
        # Group by severity
        major = [m for m in mistakes if m.severity == 'major']
        moderate = [m for m in mistakes if m.severity == 'moderate']
        minor = [m for m in mistakes if m.severity == 'minor']
        
        # Determine overall status
        if major:
            status = 'needs_work'
            message = f"Found {len(major)} significant issue(s). Let's work on them!"
        elif moderate:
            status = 'good'
            message = f"Good attempt! Just {len(moderate)} thing(s) to improve."
        else:
            status = 'almost_perfect'
            message = f"Almost perfect! Just {len(minor)} minor detail(s)."
        
        # Generate tips
        tips = []
        
        # Get weak phonemes that need AI tips
        weak_phonemes = [m for m in mistakes if m.type == 'weak_phoneme']
        
        # Generate AI tips for phonemes
        if weak_phonemes:
            ai_tips = self._generate_ai_tips(weak_phonemes, expected_text)
            # Update mistake suggestions with AI tips
            for mistake, tip in zip(weak_phonemes, ai_tips):
                mistake.suggestion = tip
        
        # Collect all tips (top 5)
        all_mistakes = major + moderate + minor
        for m in all_mistakes[:5]:
            tips.append({
                'type': m.type,
                'expected': m.expected,
                'actual': m.actual,
                'word': m.word,
                'phoneme': m.phoneme,
                'severity': m.severity,
                'suggestion': m.suggestion
            })
        
        return {
            'status': status,
            'message': message,
            'tips': tips
        }
    
    def _generate_ai_tips(self, weak_phonemes: List[Mistake], sentence: str) -> List[str]:
        """
        Generate pronunciation tips using LLM.
        
        Uses AI to create personalized, context-aware tips for each weak phoneme.
        """
        if not weak_phonemes:
            return []
        
        try:
            llm = self._get_llm_service()
            
            # Build prompt for AI
            phoneme_list = []
            for m in weak_phonemes:
                phoneme_list.append({
                    'phoneme': m.phoneme,
                    'word': m.word or 'unknown',
                    'score': float(m.actual.replace('(score: ', '').replace(')', '')) if 'score' in m.actual else 0.5
                })
            
            prompt = f"""You are a speech therapy assistant. Generate concise pronunciation tips for these weak phonemes.

Sentence: "{sentence}"

Weak phonemes that need improvement:
{phoneme_list}

For each phoneme, provide ONE short, actionable tip (max 100 characters) that helps the user physically produce the sound correctly.

Focus on:
- Tongue position
- Lip shape
- Airflow
- Common mistakes to avoid

Return a JSON array of tips in the same order as the input phonemes.
Example: ["Put tongue between teeth for TH", "Round lips for SH sound"]

Return ONLY the JSON array, no other text."""

            result = llm.generate(
                prompt=prompt,
                max_tokens=500,
                temperature=0.3,
                response_format="json"
            )
            
            if result.get('success') and result.get('content'):
                import json
                content = result['content']
                # Handle both string JSON and pre-parsed list
                if isinstance(content, str):
                    tips = json.loads(content)
                else:
                    tips = content  # Already parsed by LLM service
                if isinstance(tips, list) and len(tips) == len(weak_phonemes):
                    return tips
            
            # Fallback to basic tips
            return [self._get_fallback_tip(m.phoneme) for m in weak_phonemes]
            
        except Exception as e:
            logger.warning(f"AI tip generation failed: {e}")
            return [self._get_fallback_tip(m.phoneme) for m in weak_phonemes]
    
    def _get_fallback_tip(self, phoneme: str) -> str:
        """Get basic fallback tip if AI fails."""
        # Strip stress markers
        base = ''.join(c for c in phoneme if not c.isdigit())
        
        basic_tips = {
            'TH': "Put your tongue between your teeth and blow air.",
            'DH': "Put tongue between teeth, add voice for 'TH' in 'the'.",
            'R': "Curl your tongue back slightly.",
            'L': "Touch tongue tip to the roof of your mouth.",
            'SH': "Round your lips and push air through.",
            'CH': "Start with tongue at roof, release with 'SH'.",
            'S': "Keep tongue behind teeth for a clear 'S'.",
            'Z': "Add voice to the 'S' sound.",
            'NG': "Sound comes from back of throat.",
            'W': "Round your lips like saying 'oo'.",
            'Y': "Touch tongue to roof, slide to the next sound.",
            'V': "Touch upper teeth to lower lip, add voice.",
            'F': "Touch upper teeth to lower lip, blow air.",
        }
        
        return basic_tips.get(base, f"Practice the '{phoneme}' sound more carefully.")
    
    def _generate_summary(self, mistakes: List[Mistake]) -> str:
        """Generate one-line summary of all mistakes."""
        if not mistakes:
            return "Perfect pronunciation!"
        
        word_errors = len([m for m in mistakes if 'word' in m.type])
        sound_errors = len([m for m in mistakes if 'sound' in m.type or 'phoneme' in m.type])
        
        parts = []
        if word_errors:
            parts.append(f"{word_errors} word(s)")
        if sound_errors:
            parts.append(f"{sound_errors} sound(s)")
        
        return f"Work on: {', '.join(parts)}" if parts else "Minor improvements needed"


# Singleton
_mistake_detector = None


def get_mistake_detector() -> MistakeDetector:
    """Get singleton mistake detector instance."""
    global _mistake_detector
    if _mistake_detector is None:
        _mistake_detector = MistakeDetector()
    return _mistake_detector


def detect_mistakes(asr_result: Dict, phoneme_scores: List[Dict], expected_text: str) -> Dict:
    """Convenience function for detecting mistakes."""
    return get_mistake_detector().detect_mistakes(asr_result, phoneme_scores, expected_text)
