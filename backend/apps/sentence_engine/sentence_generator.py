"""
Sentence Generator for Pronunex.

Generates practice sentences targeting specific weak phonemes.
Uses hybrid approach:
1. Rule-based: Select target phonemes from user weaknesses
2. LLM: Generate natural sentence containing those phonemes
3. Validation: Verify phonemes exist using G2P
"""

import logging
from typing import List
from services.llm_service import get_llm_service
from apps.llm_engine.prompt_templates import build_sentence_prompt
from apps.llm_engine.validators import validate_sentence_response

logger = logging.getLogger(__name__)


def generate_practice_sentence(
    weak_phonemes: List[str],
    difficulty: str = 'edge',
    max_retries: int = 3
) -> dict:
    """
    Generate a practice sentence containing target phonemes.
    
    Hybrid approach:
    1. Select target phonemes from user's weak sounds
    2. Ask LLM to generate natural sentence
    3. Validate with G2P that phonemes are present
    4. Retry if validation fails
    
    Args:
        weak_phonemes: List of ARPAbet phonemes user struggles with
        difficulty: core, edge, or elite
        max_retries: Max LLM calls before using fallback
    
    Returns:
        dict: {sentence, target_words, target_phonemes, source}
    """
    if not weak_phonemes:
        return get_fallback_sentence(difficulty)
    
    # Select top phonemes to target (max 3 for coherent sentence)
    target_phonemes = weak_phonemes[:3]
    
    for attempt in range(max_retries):
        try:
            # Build prompt
            prompt = build_sentence_prompt(target_phonemes, difficulty)
            
            # Call LLM
            llm = get_llm_service()
            result = llm.generate(
                prompt=prompt,
                max_tokens=256,
                temperature=0.8,  # Higher for creativity
                response_format="json"
            )
            
            if not result.get('success'):
                logger.warning(f"LLM generation failed, attempt {attempt + 1}")
                continue
            
            # Validate response
            validated = validate_sentence_response(
                result.get('content', {}),
                target_phonemes
            )
            
            if validated['valid']:
                logger.info(f"Generated sentence on attempt {attempt + 1}")
                return {
                    'sentence': validated['sentence'],
                    'target_words': validated['target_words'],
                    'target_phonemes': target_phonemes,
                    'source': 'llm_generated',
                    'difficulty': difficulty,
                    'validation': validated.get('phoneme_verification'),
                }
            else:
                logger.warning(
                    f"Validation failed: {validated['validation_errors']}"
                )
                
        except Exception as e:
            logger.error(f"Sentence generation error: {str(e)}")
    
    # Fallback to pre-built sentences
    logger.warning("Using fallback sentence after max retries")
    return get_fallback_sentence(difficulty, target_phonemes)


def get_fallback_sentence(difficulty: str, target_phonemes: List[str] = None) -> dict:
    """
    Get a pre-built fallback sentence for specific phonemes.
    
    Used when LLM generation fails.
    """
    fallback_sentences = {
        'TH': {
            'core': "The three brothers think together.",
            'edge': "They thought thoroughly about the theme.",
            'elite': "The theoretical methodology was thoroughly analyzed.",
        },
        'R': {
            'core': "The red robin ran really fast.",
            'edge': "Richard's favorite restaurant serves rice.",
            'elite': "The researcher reported remarkable results.",
        },
        'S': {
            'core': "Sally sees six small snakes.",
            'edge': "The sister whispered softly to herself.",
            'elite': "The scientist stressed systematic solutions.",
        },
        'L': {
            'core': "Lucy loves little yellow lemons.",
            'edge': "The little girl laughed loudly.",
            'elite': "The linguist analyzed lateral articulation.",
        },
        'SH': {
            'core': "She sells fresh fish.",
            'edge': "Shelly should share her shoes.",
            'elite': "The ship's shadow shimmered on the shore.",
        },
    }
    
    # Default sentences by difficulty
    default_sentences = {
        'core': "The quick brown fox jumps.",
        'edge': "She sells seashells by the seashore.",
        'elite': "Peter Piper picked a peck of pickled peppers.",
    }
    
    if target_phonemes:
        # Try to find a matching sentence
        for phoneme in target_phonemes:
            clean_phoneme = ''.join(c for c in phoneme if not c.isdigit())
            if clean_phoneme in fallback_sentences:
                sentence = fallback_sentences[clean_phoneme].get(
                    difficulty, 
                    fallback_sentences[clean_phoneme]['edge']
                )
                return {
                    'sentence': sentence,
                    'target_words': [],
                    'target_phonemes': [clean_phoneme],
                    'source': 'fallback',
                    'difficulty': difficulty,
                }
    
    return {
        'sentence': default_sentences.get(difficulty, default_sentences['edge']),
        'target_words': [],
        'target_phonemes': [],
        'source': 'fallback',
        'difficulty': difficulty,
    }


def batch_generate_sentences(
    weak_phonemes: List[str],
    count: int = 5,
    difficulty: str = 'edge'
) -> List[dict]:
    """
    Generate multiple practice sentences for a user.
    
    Args:
        weak_phonemes: User's weak phonemes
        count: Number of sentences to generate
        difficulty: Difficulty level
    
    Returns:
        List of sentence dicts
    """
    sentences = []
    used_phonemes = set()
    
    # Rotate through weak phonemes
    for i in range(count):
        # Select different phonemes for variety
        available = [p for p in weak_phonemes if p not in used_phonemes]
        if not available:
            used_phonemes.clear()
            available = weak_phonemes
        
        target = available[:2] if len(available) >= 2 else available
        
        sentence = generate_practice_sentence(target, difficulty, max_retries=2)
        sentences.append(sentence)
        
        # Track used phonemes
        for p in sentence.get('target_phonemes', []):
            used_phonemes.add(p)
    
    return sentences
