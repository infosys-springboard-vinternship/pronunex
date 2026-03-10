"""
API Views for library content.
"""

from rest_framework import generics, filters
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from .models import Phoneme, ReferenceSentence
from .serializers import (
    PhonemeSerializer,
    ReferenceSentenceListSerializer,
    ReferenceSentenceDetailSerializer,
)


class PhonemeListView(generics.ListAPIView):
    """
    GET /api/v1/phonemes/
    
    List all English phonemes.
    Returns all 44 phonemes without server-side pagination.
    """
    
    queryset = Phoneme.objects.all()
    serializer_class = PhonemeSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None  # Disable pagination - only 44 items
    filter_backends = [filters.SearchFilter]
    search_fields = ['arpabet', 'type', 'example_word']


class PhonemeDetailView(generics.RetrieveAPIView):
    """
    GET /api/v1/phonemes/{id}/
    
    Get phoneme details with articulation tips.
    """
    
    queryset = Phoneme.objects.all()
    serializer_class = PhonemeSerializer
    permission_classes = [IsAuthenticated]


class SentenceListView(generics.ListAPIView):
    """
    GET /api/v1/sentences/
    
    List practice sentences with optional filtering.
    """
    
    queryset = ReferenceSentence.objects.filter(is_validated=True)
    serializer_class = ReferenceSentenceListSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['difficulty_level', 'source', 'sublevel']
    search_fields = ['text']
    ordering_fields = ['created_at', 'difficulty_level']


class SentenceDetailView(generics.RetrieveAPIView):
    """
    GET /api/v1/sentences/{id}/
    
    Get sentence details with precomputed phoneme data.
    """
    
    queryset = ReferenceSentence.objects.all()
    serializer_class = ReferenceSentenceDetailSerializer
    permission_classes = [IsAuthenticated]


class RecommendedSentencesView(APIView):
    """
    GET /api/v1/sentences/recommend/
    
    Get personalized sentence recommendations based on user weaknesses.
    """
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user = request.user
        limit = int(request.query_params.get('limit', 5))
        difficulty = request.query_params.get('difficulty')
        
        # Get user's weak phonemes from practice history
        from apps.practice.models import PhonemeError
        from django.db.models import Avg
        
        weak_phonemes = PhonemeError.objects.filter(
            attempt__session__user=user,
            similarity_score__lt=0.7  # Configurable threshold
        ).values_list('target_phoneme__arpabet', flat=True).distinct()
        
        # Find sentences targeting those phonemes
        queryset = ReferenceSentence.objects.filter(is_validated=True)
        
        if weak_phonemes:
            # Prioritize sentences with weak phonemes
            queryset = queryset.filter(
                target_phonemes__overlap=list(weak_phonemes)
            )
        
        sublevel = request.query_params.get('sublevel')
        
        if difficulty:
            queryset = queryset.filter(difficulty_level=difficulty)
        
        if sublevel:
            queryset = queryset.filter(sublevel=sublevel)
        
        # Fallback to difficulty-only filter if no matches with weak phonemes
        if not queryset.exists():
            queryset = ReferenceSentence.objects.filter(is_validated=True)
            if difficulty:
                queryset = queryset.filter(difficulty_level=difficulty)
            if sublevel:
                queryset = queryset.filter(sublevel=sublevel)
            if not difficulty and not sublevel:
                queryset = queryset.filter(difficulty_level=user.proficiency_level)
        
        # Ultimate fallback: any validated sentences
        if not queryset.exists():
            queryset = ReferenceSentence.objects.filter(is_validated=True)
        
        sentences = queryset.order_by('?')[:limit]
        serializer = ReferenceSentenceListSerializer(sentences, many=True)
        
        return Response({
            'recommendations': serializer.data,
            'based_on_weak_phonemes': list(weak_phonemes)[:10],
        })


class SentenceAudioView(APIView):
    """
    GET /api/v1/sentences/{id}/audio/
    
    Get or generate reference audio for a sentence using Groq TTS.
    Audio is cached after first generation.
    """
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request, pk):
        from django.http import FileResponse, HttpResponseRedirect
        from django.core.files.base import ContentFile
        from services.tts_service import get_tts_service
        import os, tempfile
        
        try:
            sentence = ReferenceSentence.objects.get(pk=pk)
        except ReferenceSentence.DoesNotExist:
            return Response({'error': 'Sentence not found'}, status=404)
        
        # Check if audio already exists in storage
        if sentence.has_audio():
            try:
                # Use storage.open() — works for both local and Supabase
                f = sentence.audio_file.open('rb')
                return FileResponse(
                    f,
                    content_type='audio/wav',
                    as_attachment=False,
                    filename=f'sentence_{pk}.wav'
                )
            except Exception:
                # If storage.open() fails (e.g. Supabase), proxy via URL
                audio_url = sentence.get_audio_source()
                if audio_url and audio_url.startswith('http'):
                    import requests as http_requests
                    resp = http_requests.get(audio_url)
                    if resp.status_code == 200:
                        from django.http import HttpResponse
                        return HttpResponse(
                            resp.content,
                            content_type='audio/wav',
                            headers={'Content-Disposition': f'inline; filename="sentence_{pk}.wav"'}
                        )
        
        # Generate audio using TTS
        try:
            tts = get_tts_service()
            
            # Generate to temp file, then save via storage API
            with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp:
                tmp_path = tmp.name
            
            tts.generate_audio(text=sentence.text, output_path=tmp_path)
            
            # Save via Django storage (works for both local and S3)
            with open(tmp_path, 'rb') as f:
                sentence.audio_file.save(
                    f'sentence_{pk}.wav',
                    ContentFile(f.read()),
                    save=True
                )
            
            # Clean up temp file
            os.unlink(tmp_path)
            
            # Serve the newly generated audio
            audio_url = sentence.get_audio_source()
            if audio_url and audio_url.startswith('http'):
                return HttpResponseRedirect(audio_url)
            
            f = sentence.audio_file.open('rb')
            return FileResponse(
                f,
                content_type='audio/wav',
                as_attachment=False,
                filename=f'sentence_{pk}.wav'
            )
            
        except Exception as e:
            return Response({
                'error': f'Failed to generate audio: {str(e)}',
                'sentence': sentence.text
            }, status=500)


class SentencePreGenerateView(APIView):
    """
    POST /api/v1/sentences/pregenerate/
    
    Batch pre-generate TTS audio for multiple sentences.
    Used by frontend to pre-load upcoming sentences.
    
    Rate limited to prevent API abuse:
    - Max 5 sentences per request
    - Only generates if audio doesn't already exist
    """
    
    permission_classes = [IsAuthenticated]
    
    # In-memory lock to prevent concurrent generation for same sentence
    _generating = set()
    
    def post(self, request):
        import os, tempfile
        from django.core.files.base import ContentFile
        from services.tts_service import get_tts_service
        
        sentence_ids = request.data.get('sentence_ids', [])
        
        # Validate: max 5 sentences per request
        if len(sentence_ids) > 5:
            sentence_ids = sentence_ids[:5]
        
        generated = []
        skipped = []
        errors = []
        
        for sid in sentence_ids:
            try:
                sentence = ReferenceSentence.objects.get(id=sid)
                
                # Check if already exists in storage
                if sentence.has_audio():
                    skipped.append(sid)
                    continue
                
                # Check if currently being generated
                if sid in self._generating:
                    skipped.append(sid)
                    continue
                
                # Mark as generating
                self._generating.add(sid)
                
                try:
                    # Generate TTS to temp file
                    tts = get_tts_service()
                    
                    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp:
                        tmp_path = tmp.name
                    
                    tts.generate_audio(text=sentence.text, output_path=tmp_path)
                    
                    # Save via Django storage (works for both local and S3)
                    with open(tmp_path, 'rb') as f:
                        sentence.audio_file.save(
                            f'sentence_{sid}.wav',
                            ContentFile(f.read()),
                            save=True
                        )
                    
                    # Clean up temp file
                    os.unlink(tmp_path)
                    
                    generated.append(sid)
                finally:
                    # Remove from generating set
                    self._generating.discard(sid)
                    
            except ReferenceSentence.DoesNotExist:
                errors.append({'id': sid, 'error': 'Not found'})
            except Exception as e:
                errors.append({'id': sid, 'error': str(e)})
                self._generating.discard(sid)
        
        return Response({
            'generated': generated,
            'skipped': skipped,
            'errors': errors,
        })

