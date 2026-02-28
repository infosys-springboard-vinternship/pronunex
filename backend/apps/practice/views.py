"""
API Views for practice sessions and assessments.
"""

import logging
import threading
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from django.conf import settings
from django.utils import timezone
from django.db.models import Avg

from .models import UserSession, Attempt, PhonemeError, SublevelProgress, SublevelSession
from .serializers import (
    UserSessionSerializer,
    AttemptListSerializer,
    AttemptDetailSerializer,
    AttemptCreateSerializer,
    AssessmentResultSerializer,
    SublevelProgressSerializer,
    SublevelCompleteSerializer,
    SublevelSessionSerializer,
)
from .services import AssessmentService
from apps.library.models import ReferenceSentence, Phoneme

logger = logging.getLogger(__name__)


class UserSessionListView(generics.ListCreateAPIView):
    """
    GET /api/v1/sessions/
    POST /api/v1/sessions/
    
    List user's practice sessions or create a new one.
    """
    
    serializer_class = UserSessionSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return UserSession.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class UserSessionDetailView(generics.RetrieveAPIView):
    """
    GET /api/v1/sessions/{id}/
    
    Get session details with all attempts.
    """
    
    serializer_class = UserSessionSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return UserSession.objects.filter(user=self.request.user)


class EndSessionView(APIView):
    """
    POST /api/v1/sessions/{id}/end/
    
    End a practice session and calculate overall metrics.
    """
    
    permission_classes = [IsAuthenticated]
    
    def post(self, request, pk):
        try:
            session = UserSession.objects.get(pk=pk, user=request.user)
        except UserSession.DoesNotExist:
            return Response(
                {'error': 'Session not found.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        if session.ended_at:
            return Response(
                {'error': 'Session already ended.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        session.ended_at = timezone.now()
        session.calculate_overall_score()
        
        return Response({
            'message': 'Session ended successfully.',
            'session': UserSessionSerializer(session).data
        })


class AttemptListView(generics.ListAPIView):
    """
    GET /api/v1/attempts/
    
    List user's practice attempts.
    """
    
    serializer_class = AttemptListSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Attempt.objects.filter(
            session__user=self.request.user
        ).select_related('sentence')


class AttemptDetailView(generics.RetrieveAPIView):
    """
    GET /api/v1/attempts/{id}/
    
    Get attempt details with phoneme errors.
    """
    
    serializer_class = AttemptDetailSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Attempt.objects.filter(
            session__user=self.request.user
        ).prefetch_related('phoneme_errors')


class AssessmentView(APIView):
    """
    POST /api/v1/assess/
    
    Core pronunciation assessment endpoint.
    
    Processing flow:
    1. Receive audio + sentence_id
    2. Save audio to storage
    3. Clean audio (normalize, trim, resample)
    4. Fetch precomputed phoneme sequence from DB
    5. Run forced alignment on user audio
    6. Slice audio into phoneme segments
    7. Generate embeddings for each slice
    8. Fetch precomputed reference embeddings (cached)
    9. Calculate cosine similarity per phoneme
    10. Identify weak phonemes (score < configurable threshold)
    11. Generate LLM feedback (text only, not scoring)
    12. Save attempt and errors to DB
    13. Return structured response
    """
    
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    
    def post(self, request):
        # Check if ML models are enabled (disabled on Render free tier)
        from django.conf import settings as django_settings
        if not getattr(django_settings, 'ENABLE_ML_MODELS', True):
            return Response({
                'success': False,
                'error': 'ml_disabled',
                'message': (
                    'Pronunciation analysis is currently unavailable. '
                    'The backend is hosted on Render free tier to save resources. '
                    'All other features (login, library, reference audio) work normally. '
                    'Contact the admin to enable full ML-powered analysis.'
                ),
                'suggestion': 'You can still browse sentences, listen to reference audio, and track your progress.',
            }, status=status.HTTP_200_OK)

        serializer = AttemptCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                serializer.errors, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        sentence_id = serializer.validated_data['sentence_id']
        audio_file = serializer.validated_data['audio']
        
        try:
            sentence = ReferenceSentence.objects.get(id=sentence_id)
        except ReferenceSentence.DoesNotExist:
            return Response(
                {'error': 'Sentence not found.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get or create active session
        session = self._get_or_create_session(request.user)
        
        # Ensure reference audio exists (auto-generate if missing)
        self._ensure_reference_audio(sentence)
        
        # Run assessment pipeline
        assessment_service = AssessmentService()
        result = assessment_service.process_attempt(audio_file, sentence)
        
        # Handle expected error cases (return 200 so frontend can display them)
        if not result.get('success', False):
            error_type = result.get('error')
            
            # Content mismatch - user said wrong sentence
            if error_type == 'content_mismatch':
                logger.info(f"Content mismatch for user {request.user.email}: {result.get('transcribed')}")
                return Response({
                    'success': False,
                    'error': 'content_mismatch',
                    'message': result.get('message', 'Speech did not match expected sentence.'),
                    'transcribed': result.get('transcribed', ''),
                    'expected': sentence.text,
                    'similarity': result.get('similarity', 0.0),
                    'suggestion': result.get('suggestion', 'Please try again.'),
                }, status=status.HTTP_200_OK)
            
            # Unscorable - technical failure
            elif error_type == 'unscorable':
                logger.warning(f"Unscorable attempt for user {request.user.email}: {result.get('reason')}")
                return Response({
                    'success': False,
                    'error': 'unscorable',
                    'message': result.get('message', 'Could not analyze audio.'),
                    'reason': result.get('reason', 'unknown'),
                    'transcribed': result.get('transcribed', ''),
                    'suggestion': result.get('suggestion', 'Please try again.'),
                }, status=status.HTTP_200_OK)
            
            # Unknown error - return 500
            logger.error(f"Assessment failed for user {request.user.email}: {result}")
            return Response(
                {'error': error_type or 'Assessment failed.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        # Save attempt to database
        import time as _time
        t_db = _time.time()
        attempt = self._save_attempt(session, sentence, audio_file, result)
        
        # Save phoneme errors (bulk optimized)
        self._save_phoneme_errors(attempt, result.get('phoneme_scores', []))
        logger.info(f"[PERF] DB save (attempt+phonemes): {(_time.time()-t_db)*1000:.0f}ms")
        
        # === ASYNC: Analytics update (saves ~12s) ===
        def _update_analytics_async(user_id, attempt_id):
            try:
                from django.contrib.auth import get_user_model
                from apps.analytics.services import AnalyticsService
                User = get_user_model()
                user = User.objects.get(id=user_id)
                a = Attempt.objects.get(id=attempt_id)
                AnalyticsService().update_after_attempt(user, a)
            except Exception as e:
                logger.error(f"Async analytics failed: {e}")
        
        threading.Thread(
            target=_update_analytics_async,
            args=(request.user.id, attempt.id),
            daemon=True
        ).start()
        
        # === ASYNC: LLM feedback generation (saves ~2-7s) ===
        def _generate_feedback_async(attempt_id, phoneme_scores, weak_phonemes, sentence_text, overall_score):
            try:
                from apps.llm_engine.feedback_generator import generate_pronunciation_feedback
                feedback = generate_pronunciation_feedback(
                    phoneme_scores=phoneme_scores,
                    weak_phonemes=weak_phonemes,
                    sentence_text=sentence_text,
                    overall_score=overall_score
                )
                Attempt.objects.filter(id=attempt_id).update(llm_feedback=feedback)
                logger.info(f"[ASYNC] LLM feedback saved for attempt {attempt_id}")
            except Exception as e:
                logger.error(f"Async LLM feedback failed: {e}")
                # Save fallback feedback so frontend always gets something
                try:
                    from apps.llm_engine.feedback_generator import generate_fallback_feedback
                    fallback = generate_fallback_feedback(overall_score, weak_phonemes)
                    Attempt.objects.filter(id=attempt_id).update(llm_feedback=fallback)
                except Exception:
                    pass
        
        threading.Thread(
            target=_generate_feedback_async,
            args=(
                attempt.id,
                result.get('phoneme_scores', []),
                result.get('weak_phonemes', []),
                sentence.text,
                result.get('overall_score', 0)
            ),
            daemon=True
        ).start()
        
        # Build enriched weak phoneme details (articulation tips + practice words)
        t_wp = _time.time()
        weak_phoneme_details = self._build_weak_phoneme_details(attempt)
        logger.info(f"[PERF] Build weak phoneme details: {(_time.time()-t_wp)*1000:.0f}ms")
        
        # Generate instant fallback feedback so frontend has something to show
        from apps.llm_engine.feedback_generator import generate_fallback_feedback
        instant_feedback = generate_fallback_feedback(
            result.get('overall_score', 0),
            result.get('weak_phonemes', [])
        )
        
        logger.info(f"Assessment completed for user {request.user.email}: score {result['overall_score']}")
        
        response_data = {
            'success': True,
            'overall_score': result['overall_score'],
            'fluency_score': result.get('fluency_score'),
            'phoneme_scores': result['phoneme_scores'],
            'weak_phonemes': result['weak_phonemes'],
            'weak_phoneme_details': weak_phoneme_details,
            'llm_feedback': instant_feedback,  # Instant rule-based feedback
            'llm_feedback_pending': True,       # Signal frontend to poll for LLM feedback
            'mistakes': result.get('mistakes'),
            'transcribed': result.get('transcribed'),
            'processing_time_ms': result['processing_time_ms'],
            'attempt_id': attempt.id,
        }
        
        return Response(response_data, status=status.HTTP_200_OK)
    
    def _get_or_create_session(self, user):
        """Get active session or create new one."""
        # Find active session (no end time, created today)
        today = timezone.now().date()
        session = UserSession.objects.filter(
            user=user,
            ended_at__isnull=True,
            started_at__date=today
        ).first()
        
        if not session:
            session = UserSession.objects.create(
                user=user,
                session_type='practice'
            )
        
        return session
    
    def _save_attempt(self, session, sentence, audio_file, result):
        """Save attempt record to database."""
        attempt = Attempt.objects.create(
            session=session,
            sentence=sentence,
            audio_file=audio_file,
            score=result['overall_score'],
            fluency_score=result.get('fluency_score'),
            phoneme_scores=result.get('phoneme_scores'),
            llm_feedback=result.get('llm_feedback'),
            processing_time_ms=result.get('processing_time_ms'),
        )
        return attempt
    
    def _save_phoneme_errors(self, attempt, phoneme_scores):
        """Save phoneme-level results to database (bulk optimized)."""
        from django.conf import settings
        threshold = settings.SCORING_CONFIG.get('WEAK_PHONEME_THRESHOLD', 0.7)
        
        if not phoneme_scores:
            return
        
        # Pre-fetch all needed phonemes in ONE query (instead of N individual GETs)
        arpabet_list = [ps.get('phoneme') for ps in phoneme_scores if ps.get('phoneme')]
        phoneme_map = {
            p.arpabet: p 
            for p in Phoneme.objects.filter(arpabet__in=arpabet_list)
        }
        
        # Build all error objects and bulk_create
        errors_to_create = []
        for ps in phoneme_scores:
            phoneme = phoneme_map.get(ps.get('phoneme'))
            if not phoneme:
                logger.warning(f"Phoneme not found: {ps.get('phoneme')}")
                continue
            errors_to_create.append(PhonemeError(
                attempt=attempt,
                target_phoneme=phoneme,
                similarity_score=ps.get('score', 0),
                word_context=ps.get('word', ''),
                position_in_word=ps.get('position', 'medial'),
                start_time=ps.get('start'),
                end_time=ps.get('end'),
            ))
        
        if errors_to_create:
            PhonemeError.objects.bulk_create(errors_to_create)
    
    def _build_weak_phoneme_details(self, attempt):
        """Build enriched weak phoneme details with articulation tips and practice words.
        
        Strategy:
        1. Find phonemes below WEAK_PHONEME_THRESHOLD
        2. If none found but overall score < 0.95, return the 3 lowest-scoring phonemes
        3. Always provide actionable feedback when there's room for improvement
        """
        from apps.library.models import SentencePhoneme
        
        threshold = settings.SCORING_CONFIG.get('WEAK_PHONEME_THRESHOLD', 0.85)
        
        # Get all phoneme errors sorted by score (worst first), deduplicate
        all_errors = (
            attempt.phoneme_errors
            .select_related('target_phoneme')
            .order_by('similarity_score')
        )
        
        seen_phonemes = {}
        for error in all_errors:
            arpabet = error.target_phoneme.arpabet
            if arpabet not in seen_phonemes:
                seen_phonemes[arpabet] = error
        
        # Filter to weak phonemes (below threshold)
        weak_entries = {k: v for k, v in seen_phonemes.items() if v.similarity_score < threshold}
        
        # Fallback: if no weak phonemes but score isn't perfect, use 3 lowest-scoring
        if not weak_entries and seen_phonemes:
            overall = attempt.phoneme_errors.aggregate(avg=Avg('similarity_score'))['avg'] or 1.0
            if overall < 0.95:
                sorted_phonemes = sorted(seen_phonemes.items(), key=lambda x: x[1].similarity_score)
                weak_entries = dict(sorted_phonemes[:3])
        
        if not weak_entries:
            return []
        
        # Batch-fetch practice words for ALL weak phonemes in ONE query
        weak_phoneme_ids = [entry.target_phoneme_id for entry in weak_entries.values()]
        practice_words_qs = (
            SentencePhoneme.objects
            .filter(phoneme_id__in=weak_phoneme_ids)
            .values('phoneme__arpabet', 'word_context')
            .distinct()
        )
        
        # Group by arpabet
        practice_words_map = {}
        for row in practice_words_qs:
            arp = row['phoneme__arpabet']
            if arp not in practice_words_map:
                practice_words_map[arp] = []
            if len(practice_words_map[arp]) < 3:
                practice_words_map[arp].append(row['word_context'])
        
        details = []
        for arpabet, error in weak_entries.items():
            phoneme = error.target_phoneme
            
            # Use batch-fetched practice words
            words = practice_words_map.get(arpabet, [])
            if not words:
                words = [phoneme.example_word] if phoneme.example_word else []
            
            details.append({
                'arpabet': arpabet,
                'symbol': phoneme.symbol,
                'average_score': round(error.similarity_score, 3),
                'articulation_tip': phoneme.articulation_tip or phoneme.description,
                'practice_words': words,
            })
        
        return details
    
    def _ensure_reference_audio(self, sentence):
        """Ensure reference audio exists, generate via TTS if missing."""
        import os
        
        audio_path = sentence.get_audio_source()
        
        # Check if audio file exists
        if audio_path and os.path.exists(audio_path):
            return  # Audio already exists
        
        # Generate TTS audio
        try:
            from services.tts_service import generate_sentence_audio
            logger.info(f"Auto-generating TTS for sentence {sentence.id}")
            audio_path = generate_sentence_audio(sentence)
            
            # Update sentence with new audio path
            from django.conf import settings
            relative_path = os.path.relpath(audio_path, settings.MEDIA_ROOT)
            sentence.audio_file = relative_path
            sentence.save(update_fields=['audio_file'])
            
            logger.info(f"TTS generated successfully for sentence {sentence.id}")
        except Exception as e:
            logger.error(f"TTS generation failed for sentence {sentence.id}: {str(e)}")
            # Continue anyway - will fall back to dev mode in assessment


class AttemptFeedbackView(APIView):
    """
    GET /api/v1/practice/attempt-feedback/?attempt_id=123
    
    Lightweight polling endpoint for async LLM feedback.
    Frontend polls this after receiving scores to get the LLM-generated feedback.
    """
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        attempt_id = request.query_params.get('attempt_id')
        if not attempt_id:
            return Response(
                {'error': 'attempt_id parameter required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            attempt = Attempt.objects.get(
                id=attempt_id,
                session__user=request.user
            )
        except Attempt.DoesNotExist:
            return Response(
                {'error': 'Attempt not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        if attempt.llm_feedback:
            return Response({
                'ready': True,
                'llm_feedback': attempt.llm_feedback,
            })
        else:
            return Response({
                'ready': False,
                'llm_feedback': None,
            })


class SublevelCompleteView(APIView):
    """
    POST /api/v1/sublevel-complete/
    
    Record sublevel completion after user finishes all 5 sentences.
    """
    
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        serializer = SublevelCompleteSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )
        
        level = serializer.validated_data['level']
        sublevel = serializer.validated_data['sublevel']
        average_score = serializer.validated_data['average_score']
        attempts = serializer.validated_data['attempts']
        
        progress = SublevelProgress.objects.create(
            user=request.user,
            level=level,
            sublevel=sublevel,
            average_score=average_score,
            attempts=attempts,
            completed=True
        )
        
        logger.info(f"Sublevel completed: {request.user.email} - {level} L{sublevel} - {average_score}")
        
        return Response(
            SublevelProgressSerializer(progress).data,
            status=status.HTTP_201_CREATED
        )


class SublevelProgressView(APIView):
    """
    GET /api/v1/sublevel-progress/
    
    Get user's progress summary for all sublevels in a level.
    
    Query params:
    - level: core, edge, elite
    
    Returns completion %, best score, and attempt count per sublevel.
    """
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        level = request.query_params.get('level')
        
        if not level:
            return Response(
                {'error': 'level parameter required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        from django.db.models import Max, Count, Avg
        
        progress_data = []
        for sublevel_num in ['1', '2']:
            progress_records = SublevelProgress.objects.filter(
                user=request.user,
                level=level,
                sublevel=sublevel_num
            )
            
            if progress_records.exists():
                stats = progress_records.aggregate(
                    best_score=Max('average_score'),
                    attempt_count=Count('id'),
                    avg_score=Avg('average_score')
                )
                
                progress_data.append({
                    'sublevel': sublevel_num,
                    'completed': True,
                    'completion_percent': 100,
                    'best_score': stats['best_score'],
                    'attempt_count': stats['attempt_count'],
                    'average_score': stats['avg_score'],
                })
            else:
                progress_data.append({
                    'sublevel': sublevel_num,
                    'completed': False,
                    'completion_percent': 0,
                    'best_score': 0,
                    'attempt_count': 0,
                    'average_score': 0,
                })
        
        return Response({
            'level': level,
            'sublevels': progress_data
        })


class SublevelSummaryView(APIView):
    """
    GET /api/v1/practice/sublevel-summary/?level=core&sublevel=1
    
    Get comprehensive summary after completing a sublevel:
    - Average score across all sentences
    - Weak phonemes detected in this sublevel
    - Recommendation for next steps
    - Reinforcement sentence recommendations (2-5 targeted sentences)
    """
    
    permission_classes = [IsAuthenticated]
    
    def _get_reinforcement_sentences(self, weak_phoneme_arpabets, attempted_sentence_ids, difficulty_level, count=5):
        """
        Fetch targeted sentences for reinforcement practice.
        
        Strategy:
        1. Find sentences containing weak phonemes
        2. Prioritize sentences with multiple weak phonemes
        3. Avoid already attempted sentences
        4. Match difficulty level when possible
        5. Return 2-5 most relevant sentences
        """
        from django.db.models import Count, Q
        from apps.library.models import SentencePhoneme
        
        if not weak_phoneme_arpabets:
            return []
        
        # Limit to top 3 weak phonemes for focused practice
        target_phonemes = weak_phoneme_arpabets[:3]
        
        # Strategy 1: Query sentences via SentencePhoneme junction table
        reinforcement_sentences = list(
            ReferenceSentence.objects
            .filter(
                sentence_phonemes__phoneme__arpabet__in=target_phonemes,
                is_validated=True
            )
            .exclude(id__in=attempted_sentence_ids)  # Avoid repetition
            .annotate(
                weak_phoneme_count=Count(
                    'sentence_phonemes',
                    filter=Q(sentence_phonemes__phoneme__arpabet__in=target_phonemes)
                )
            )
            .order_by('-weak_phoneme_count', 'difficulty_level', 'id')  # Prioritize by relevance
            .distinct()[:count]
        )
        
        # Strategy 2 (fallback): If SentencePhoneme table is sparse, find sentences
        # via PhonemeError records that historically contained these phonemes
        if not reinforcement_sentences:
            logger.info(f"SentencePhoneme fallback triggered for phonemes: {target_phonemes}")
            reinforcement_sentences = list(
                ReferenceSentence.objects
                .filter(
                    user_attempts__phoneme_errors__target_phoneme__arpabet__in=target_phonemes,
                    is_validated=True
                )
                .exclude(id__in=attempted_sentence_ids)
                .distinct()[:count]
            )
        
        # Strategy 3 (last resort): Any validated sentence at same difficulty level
        if not reinforcement_sentences:
            logger.info(f"Last-resort fallback: fetching any validated sentences for level={difficulty_level}")
            reinforcement_sentences = list(
                ReferenceSentence.objects
                .filter(is_validated=True, difficulty_level=difficulty_level)
                .exclude(id__in=attempted_sentence_ids)
                .order_by('?')[:count]
            )
        
        # Format response
        result = []
        for s in reinforcement_sentences:
            # Get target phonemes from SentencePhoneme if available
            sp_phonemes = list(
                s.sentence_phonemes.filter(phoneme__arpabet__in=target_phonemes)
                .values_list('phoneme__arpabet', flat=True)
            ) if hasattr(s, 'sentence_phonemes') else []
            
            result.append({
                'id': s.id,
                'text': s.text,
                'difficulty_level': s.difficulty_level,
                'target_phonemes': sp_phonemes or target_phonemes,
            })
        
        return result
    
    def get(self, request):
        level = request.query_params.get('level')
        sublevel = request.query_params.get('sublevel')
        
        if not level or not sublevel:
            return Response(
                {'error': 'level and sublevel parameters required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get the sublevel session
        try:
            session = SublevelSession.objects.get(
                user=request.user,
                level=level,
                sublevel=sublevel
            )
        except SublevelSession.DoesNotExist:
            return Response(
                {'error': 'No session found for this sublevel.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Calculate average score from assessment results
        assessment_results = session.assessment_results or {}
        scores = [
            result.get('overall_score', 0) 
            for result in assessment_results.values() 
            if isinstance(result, dict)
        ]
        avg_score = sum(scores) / len(scores) if scores else 0
        
        # Get weak phonemes from attempts in this sublevel
        from django.db.models import Avg
        
        threshold = settings.SCORING_CONFIG.get('WEAK_PHONEME_THRESHOLD', 0.7)
        
        # Find all attempts for sentences in this sublevel session
        weak_phonemes_qs = (
            PhonemeError.objects
            .filter(
                attempt__sentence_id__in=session.sentence_ids,
                attempt__session__user=request.user
            )
            .values('target_phoneme', 'target_phoneme__arpabet', 'target_phoneme__symbol')
            .annotate(avg_score=Avg('similarity_score'))
            .filter(avg_score__lt=threshold)
            .order_by('avg_score')[:5]
        )
        
        weak_phonemes = [
            {
                'arpabet': wp['target_phoneme__arpabet'],
                'symbol': wp['target_phoneme__symbol'],
                'avg_score': round(wp['avg_score'], 3),
            }
            for wp in weak_phonemes_qs
        ]
        
        # Determine recommendation
        if avg_score >= 0.9:
            recommendation = 'excellent'
            message = 'Excellent work! You can proceed to the next sublevel.'
        elif avg_score >= 0.75:
            recommendation = 'good'
            message = 'Good job! Consider reviewing weak phonemes before moving on.'
        elif avg_score >= 0.6:
            recommendation = 'retry_recommended'
            message = 'You might benefit from retrying this sublevel to improve your score.'
        else:
            recommendation = 'retry_required'
            message = 'Please retry this sublevel to build stronger pronunciation skills.'
        
        # Get reinforcement sentence recommendations if weak phonemes exist
        reinforcement_sentences = []
        if weak_phonemes:
            weak_phoneme_arpabets = [wp['arpabet'] for wp in weak_phonemes]
            attempted_ids = session.attempted_sentence_ids or session.sentence_ids
            reinforcement_sentences = self._get_reinforcement_sentences(
                weak_phoneme_arpabets,
                attempted_ids,
                level,
                count=5
            )
        
        logger.info(
            f"Sublevel summary for {request.user.email}: level={level}, sublevel={sublevel}, "
            f"avg_score={avg_score:.3f}, weak_phonemes={len(weak_phonemes)}, "
            f"reinforcement_sentences={len(reinforcement_sentences)}"
        )
        
        return Response({
            'level': level,
            'sublevel': sublevel,
            'average_score': round(avg_score, 3),
            'total_sentences': len(session.sentence_ids),
            'completed_sentences': len(session.attempted_sentence_ids or []),
            'is_completed': session.is_completed,
            'weak_phonemes': weak_phonemes,
            'recommendation': recommendation,
            'message': message,
            'reinforcement_sentences': reinforcement_sentences,
        })


class SublevelRecommendationView(APIView):
    """
    GET /api/v1/practice/sublevel-recommendations/?session_id=123
    
    Aggregate weak phonemes across all attempts in a session and
    recommend targeted practice sentences.
    """
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        session_id = request.query_params.get('session_id')
        
        if not session_id:
            return Response(
                {'error': 'session_id parameter required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            session = UserSession.objects.get(pk=session_id, user=request.user)
        except UserSession.DoesNotExist:
            return Response(
                {'error': 'Session not found.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        from apps.library.models import SentencePhoneme
        
        threshold = settings.SCORING_CONFIG.get('WEAK_PHONEME_THRESHOLD_SUBLEVEL', 0.65)
        
        # Aggregate weak phonemes across all attempts in this session
        weak_phonemes_qs = (
            PhonemeError.objects
            .filter(attempt__session=session)
            .values('target_phoneme', 'target_phoneme__arpabet', 'target_phoneme__symbol')
            .annotate(avg_score=Avg('similarity_score'))
            .filter(avg_score__lt=threshold)
            .order_by('avg_score')[:5]
        )
        
        weak_phoneme_ids = [wp['target_phoneme'] for wp in weak_phonemes_qs]
        weak_phoneme_list = [
            {
                'arpabet': wp['target_phoneme__arpabet'],
                'symbol': wp['target_phoneme__symbol'],
                'avg_score': round(wp['avg_score'], 3),
            }
            for wp in weak_phonemes_qs
        ]
        
        # Find recommended sentences targeting these weak phonemes
        recommended_sentences = []
        if weak_phoneme_ids:
            sentences = (
                ReferenceSentence.objects
                .filter(sentence_phonemes__phoneme__in=weak_phoneme_ids)
                .distinct()
                .prefetch_related('sentence_phonemes__phoneme')
                [:5]
            )
            
            for sentence in sentences:
                target_phonemes = [
                    sp.phoneme.arpabet
                    for sp in sentence.sentence_phonemes.all()
                    if sp.phoneme_id in weak_phoneme_ids
                ]
                recommended_sentences.append({
                    'id': sentence.id,
                    'text': sentence.text,
                    'difficulty_level': sentence.difficulty_level,
                    'target_phonemes': target_phonemes,
                })
        
        return Response({
            'weak_phonemes': weak_phoneme_list,
            'recommended_sentences': recommended_sentences,
            'threshold': threshold,
        })


class SublevelSessionView(APIView):
    """
    GET  /api/v1/practice/sublevel-session/?level=core&sublevel=1
    PATCH /api/v1/practice/sublevel-session/
    DELETE /api/v1/practice/sublevel-session/?level=core&sublevel=1
    
    Manages fixed sentence assignments per user+level+sublevel.
    
    GET:   Get-or-create — assigns 5 sentences on first call, returns them on subsequent calls.
    PATCH: Update current_index and/or assessment_results as user progresses.
    DELETE: Reset the sublevel session (used for "Retry Sublevel").
    """
    
    permission_classes = [IsAuthenticated]
    
    def _get_deterministic_sentences(self, user, level, sublevel, count=5):
        """
        Get deterministic sentence selection using seeded randomization.
        
        Same user + level + sublevel combination always gets the same sentences
        in the same order, but different sublevels get different sentences.
        """
        import random
        
        # Get all available sentences
        sentences = list(
            ReferenceSentence.objects.filter(
                is_validated=True,
                difficulty_level=level,
                sublevel=sublevel
            ).values_list('id', flat=True)
        )
        
        # Fallback: if no sentences match sublevel, try level only
        if not sentences:
            sentences = list(
                ReferenceSentence.objects.filter(
                    is_validated=True,
                    difficulty_level=level
                ).values_list('id', flat=True)
            )
        
        if not sentences:
            return []
        
        # Use deterministic seeding: same user + level + sublevel = same selection
        seed_string = f"{user.id}-{level}-{sublevel}"
        random.seed(seed_string)
        
        # Randomly select without replacement
        selected = random.sample(sentences, min(count, len(sentences)))
        
        # Reset random seed to avoid side effects
        random.seed()
        
        return selected
    
    def get(self, request):
        level = request.query_params.get('level')
        sublevel = request.query_params.get('sublevel')
        
        if not level or not sublevel:
            return Response(
                {'error': 'level and sublevel parameters required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Try to get existing session
        session = SublevelSession.objects.filter(
            user=request.user,
            level=level,
            sublevel=sublevel
        ).first()
        
        if session:
            # Validate that all sentence IDs still exist
            existing_ids = set(
                ReferenceSentence.objects.filter(
                    id__in=session.sentence_ids, is_validated=True
                ).values_list('id', flat=True)
            )
            if set(session.sentence_ids) != existing_ids:
                # Some sentences were deleted — reassign
                logger.warning(f"Stale sentence IDs detected, reassigning for {request.user.email}")
                session.delete()
                session = None
        
        if not session:
            # Assign sentences deterministically using seeded randomization
            sentences = self._get_deterministic_sentences(
                request.user, level, sublevel, count=5
            )
            
            if not sentences:
                return Response(
                    {'error': 'No sentences available for this level/sublevel.'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            session = SublevelSession.objects.create(
                user=request.user,
                level=level,
                sublevel=sublevel,
                sentence_ids=sentences,
                current_index=0,
                attempted_sentence_ids=[],
                is_completed=False,
                assessment_results={}
            )
            
            logger.info(f"Created sublevel session for {request.user.email}: {level} L{sublevel} with {len(sentences)} sentences")
        
        serializer = SublevelSessionSerializer(session)
        return Response(serializer.data)
    
    def patch(self, request):
        level = request.data.get('level')
        sublevel = request.data.get('sublevel')
        
        if not level or not sublevel:
            return Response(
                {'error': 'level and sublevel required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            session = SublevelSession.objects.get(
                user=request.user,
                level=level,
                sublevel=sublevel
            )
        except SublevelSession.DoesNotExist:
            return Response(
                {'error': 'No active session found.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Update current_index if provided
        if 'current_index' in request.data:
            new_index = int(request.data['current_index'])
            if 0 <= new_index < len(session.sentence_ids):
                session.current_index = new_index
        
        # Update attempted_sentence_ids if provided
        if 'attempted_sentence_ids' in request.data:
            attempted = request.data['attempted_sentence_ids']
            if isinstance(attempted, list):
                # Merge new attempts with existing ones
                existing = session.attempted_sentence_ids or []
                # Add new IDs that aren't already recorded
                for sid in attempted:
                    if sid not in existing and sid in session.sentence_ids:
                        existing.append(sid)
                session.attempted_sentence_ids = existing
        
        # Update is_completed if provided
        if 'is_completed' in request.data:
            session.is_completed = bool(request.data['is_completed'])
        
        # Update assessment_results if provided
        if 'assessment_results' in request.data:
            # Merge new results into existing ones
            results = session.assessment_results or {}
            results.update(request.data['assessment_results'])
            session.assessment_results = results
        
        session.save()
        
        serializer = SublevelSessionSerializer(session)
        return Response(serializer.data)
    
    def delete(self, request):
        level = request.query_params.get('level')
        sublevel = request.query_params.get('sublevel')
        
        if not level or not sublevel:
            return Response(
                {'error': 'level and sublevel parameters required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        deleted_count, _ = SublevelSession.objects.filter(
            user=request.user,
            level=level,
            sublevel=sublevel
        ).delete()
        
        logger.info(f"Reset sublevel session for {request.user.email}: {level} L{sublevel} (deleted={deleted_count})")
        
        return Response({'message': 'Sublevel session reset.', 'deleted': deleted_count > 0})

