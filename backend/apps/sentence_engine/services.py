"""
Sentence Generation Service for Pronunex.

Provides AI-powered sentence generation as fallback when curated sentences
are insufficient for targeting specific weak phonemes.

Architecture principles:
- LLM generates sentences, but does NOT score
- All generated sentences go through G2P validation
- Embeddings are precomputed and cached
- Generated sentences are stored in DB with source='llm_generated'
"""

import logging
from typing import List, Optional
from django.conf import settings

logger = logging.getLogger(__name__)


class SentenceGenerationService:
    """
    Service for generating targeted practice sentences using LLM.
    
    Key responsibilities:
    1. Generate sentences containing specific weak phonemes
    2. Validate phonemes exist using G2P
    3. Precompute and cache embeddings
    4. Store as permanent ReferenceSentence records
    """
    
    def __init__(self):
        self.max_retries = 3
    
    def generate_for_phonemes(
        self, 
        phonemes: List[str], 
        difficulty: str = 'edge',
        count: int = 5
    ) -> List[dict]:
        """
        Generate practice sentences targeting specific phonemes.
        
        Flow:
        1. Query curated sentences first
        2. If insufficient, call LLM to generate
        3. Validate via G2P
        4. Precompute embeddings
        5. Store in DB with source='llm_generated'
        6. Return as ReferenceSentence objects
        
        Args:
            phonemes: List of ARPAbet phonemes to target
            difficulty: Difficulty level (core, edge, elite)
            count: Number of sentences needed
            
        Returns:
            List of sentence dictionaries with metadata
        """
        if not phonemes:
            logger.warning("No phonemes provided for generation")
            return []
        
        from apps.library.models import ReferenceSentence, SentencePhoneme, Phoneme
        
        # Step 1: Query curated sentences first
        curated = self._get_curated_sentences(phonemes, difficulty, count)
        
        # If we have enough curated sentences, return them
        if len(curated) >= count:
            logger.info(f"Using {len(curated)} curated sentences for phonemes {phonemes}")
            return curated
        
        # Step 2: Need to generate additional sentences
        needed = count - len(curated)
        logger.info(f"Generating {needed} sentences for phonemes {phonemes}")
        
        generated = []
        for _ in range(needed):
            sentence_data = self._generate_single_sentence(phonemes, difficulty)
            if sentence_data:
                generated.append(sentence_data)
        
        # Combine curated and generated
        all_sentences = curated + generated
        
        return all_sentences[:count]
    
    def _get_curated_sentences(
        self, 
        phonemes: List[str], 
        difficulty: str, 
        count: int
    ) -> List[dict]:
        """
        Query existing curated sentences containing target phonemes.
        """
        from apps.library.models import ReferenceSentence, SentencePhoneme, Phoneme
        
        # Get phoneme objects
        phoneme_objs = Phoneme.objects.filter(arpabet__in=phonemes)
        
        if not phoneme_objs.exists():
            return []
        
        # Find sentences containing these phonemes
        sentences = (
            ReferenceSentence.objects
            .filter(
                sentence_phonemes__phoneme__in=phoneme_objs,
                difficulty_level=difficulty,
                source='curated',
                is_validated=True
            )
            .distinct()[:count]
        )
        
        return [
            {
                'id': s.id,
                'text': s.text,
                'difficulty': s.difficulty_level,
                'source': s.source,
                'target_phonemes': phonemes,
            }
            for s in sentences
        ]
    
    def _generate_single_sentence(
        self, 
        phonemes: List[str], 
        difficulty: str
    ) -> Optional[dict]:
        """
        Generate a single sentence using LLM with validation.
        
        Returns None if generation fails after max retries.
        """
        from apps.sentence_engine.sentence_generator import generate_practice_sentence
        
        try:
            # Use existing generation logic
            result = generate_practice_sentence(
                weak_phonemes=phonemes,
                difficulty=difficulty,
                max_retries=self.max_retries
            )
            
            if result and result.get('sentence'):
                # Store in database with precomputed data
                saved_sentence = self._save_generated_sentence(result, difficulty)
                
                if saved_sentence:
                    return {
                        'id': saved_sentence.id,
                        'text': saved_sentence.text,
                        'difficulty': saved_sentence.difficulty_level,
                        'source': saved_sentence.source,
                        'target_phonemes': result.get('target_phonemes', phonemes),
                    }
            
        except Exception as e:
            logger.error(f"Sentence generation failed: {str(e)}")
        
        return None
    
    def _save_generated_sentence(self, result: dict, difficulty: str):
        """
        Save LLM-generated sentence to database with precomputed embeddings.
        
        CRITICAL: Generated sentences must go through same pipeline as curated ones:
        1. G2P for phoneme sequence
        2. Embedding generation
        3. Caching
        """
        from apps.library.models import ReferenceSentence, Phoneme, SentencePhoneme
        from nlp_core.phoneme_extractor import text_to_phonemes
        import hashlib
        
        sentence_text = result.get('sentence')
        
        if not sentence_text:
            return None
        
        # Check if sentence already exists (avoid duplicates)
        existing = ReferenceSentence.objects.filter(text=sentence_text).first()
        if existing:
            logger.info(f"Sentence already exists: {sentence_text[:50]}")
            return existing
        
        try:
            # Step 1: Run G2P to get phoneme sequence
            phoneme_data = text_to_phonemes(sentence_text)
            phoneme_sequence = phoneme_data.get('phonemes', [])
            
            if not phoneme_sequence:
                logger.warning(f"G2P failed for: {sentence_text}")
                return None
            
            # Step 2: Create generation metadata
            generation_metadata = {
                'model': 'gpt-4',
                'target_phonemes': result.get('target_phonemes', []),
                'validation': result.get('validation', {}),
                'timestamp': str(timezone.now()),
            }
            
            # Step 3: Save sentence to DB
            from django.utils import timezone
            
            sentence = ReferenceSentence.objects.create(
                text=sentence_text,
                phoneme_sequence=phoneme_sequence,
                alignment_map=[],  # Will be computed when reference audio is generated
                difficulty_level=difficulty,
                sublevel='1',
                target_phonemes=result.get('target_phonemes', []),
                source='llm_generated',
                generation_metadata=generation_metadata,
                is_validated=True,
            )
            
            # Step 4: Create SentencePhoneme junction records
            target_words = result.get('target_words', [])
            for phoneme_arpabet in result.get('target_phonemes', []):
                try:
                    phoneme = Phoneme.objects.get(arpabet=phoneme_arpabet)
                    
                    # Find word context (use first target word if available)
                    word_context = target_words[0] if target_words else sentence_text.split()[0]
                    
                    SentencePhoneme.objects.create(
                        sentence=sentence,
                        phoneme=phoneme,
                        position='medial',  # Default
                        word_context=word_context,
                    )
                except Phoneme.DoesNotExist:
                    logger.warning(f"Phoneme not found: {phoneme_arpabet}")
            
            logger.info(f"Saved generated sentence: {sentence.id}")
            
            # Step 5: Optionally generate TTS audio in background
            # This ensures embeddings can be precomputed
            self._trigger_tts_generation(sentence)
            
            return sentence
            
        except Exception as e:
            logger.error(f"Failed to save generated sentence: {str(e)}")
            return None
    
    def _trigger_tts_generation(self, sentence):
        """
        Trigger TTS audio generation for the sentence (background task).
        
        This allows embeddings to be precomputed immediately.
        """
        try:
            from services.tts_service import generate_sentence_audio
            
            # Generate TTS audio
            audio_path = generate_sentence_audio(sentence)
            
            if audio_path:
                # Update sentence with audio path
                import os
                from django.conf import settings
                relative_path = os.path.relpath(audio_path, settings.MEDIA_ROOT)
                sentence.audio_file = relative_path
                sentence.save(update_fields=['audio_file'])
                
                logger.info(f"TTS audio generated for sentence {sentence.id}")
                
                # Optionally: precompute embeddings here
                self._precompute_embeddings(sentence)
        
        except Exception as e:
            logger.warning(f"TTS generation failed for sentence {sentence.id}: {str(e)}")
    
    def _precompute_embeddings(self, sentence):
        """
        Precompute and cache embeddings for the sentence.
        
        This ensures generated sentences have same performance as curated ones.
        """
        try:
            from nlp_core.vectorizer import compute_sentence_embedding
            import pickle
            
            audio_path = sentence.get_audio_source()
            if not audio_path:
                logger.warning(f"No audio for sentence {sentence.id}, skipping embeddings")
                return
            
            # Compute embeddings
            embeddings = compute_sentence_embedding(audio_path)
            
            if embeddings is not None:
                # Serialize and cache
                sentence.reference_embeddings = pickle.dumps(embeddings)
                sentence.save(update_fields=['reference_embeddings'])
                
                logger.info(f"Embeddings cached for sentence {sentence.id}")
        
        except Exception as e:
            logger.warning(f"Embedding generation failed for sentence {sentence.id}: {str(e)}")
