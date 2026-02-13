"""
Serializers for practice sessions and attempts.
"""

from rest_framework import serializers
from .models import UserSession, Attempt, PhonemeError, SublevelProgress
from apps.library.serializers import ReferenceSentenceListSerializer


class PhonemeErrorSerializer(serializers.ModelSerializer):
    """Serializer for phoneme-level errors."""
    
    phoneme_symbol = serializers.CharField(source='target_phoneme.symbol', read_only=True)
    phoneme_arpabet = serializers.CharField(source='target_phoneme.arpabet', read_only=True)
    is_weak = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = PhonemeError
        fields = [
            'id', 'phoneme_symbol', 'phoneme_arpabet', 'similarity_score',
            'word_context', 'position_in_word', 'start_time', 'end_time', 'is_weak'
        ]


class AttemptListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for attempt listings."""
    
    sentence_text = serializers.CharField(source='sentence.text', read_only=True)
    
    class Meta:
        model = Attempt
        fields = [
            'id', 'sentence_text', 'score', 'fluency_score', 'created_at'
        ]


class AttemptDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer with phoneme errors and feedback."""
    
    sentence = ReferenceSentenceListSerializer(read_only=True)
    phoneme_errors = PhonemeErrorSerializer(many=True, read_only=True)
    weak_phonemes = serializers.SerializerMethodField()
    
    class Meta:
        model = Attempt
        fields = [
            'id', 'sentence', 'score', 'fluency_score', 'phoneme_scores',
            'llm_feedback', 'phoneme_errors', 'weak_phonemes',
            'processing_time_ms', 'created_at'
        ]
    
    def get_weak_phonemes(self, obj):
        """Return list of weak phoneme symbols."""
        return [
            error.target_phoneme.arpabet 
            for error in obj.phoneme_errors.all() 
            if error.is_weak
        ]


class AttemptCreateSerializer(serializers.Serializer):
    """Serializer for creating a new attempt (assessment request)."""
    
    sentence_id = serializers.IntegerField(required=True)
    audio = serializers.FileField(required=True)
    
    def validate_sentence_id(self, value):
        from apps.library.models import ReferenceSentence
        if not ReferenceSentence.objects.filter(id=value, is_validated=True).exists():
            raise serializers.ValidationError('Invalid or unvalidated sentence ID.')
        return value


class UserSessionSerializer(serializers.ModelSerializer):
    """Serializer for practice sessions."""
    
    attempts = AttemptListSerializer(many=True, read_only=True)
    duration_minutes = serializers.SerializerMethodField()
    
    class Meta:
        model = UserSession
        fields = [
            'id', 'session_type', 'started_at', 'ended_at',
            'overall_score', 'total_attempts', 'attempts', 'duration_minutes'
        ]
    
    def get_duration_minutes(self, obj):
        if obj.ended_at and obj.started_at:
            delta = obj.ended_at - obj.started_at
            return round(delta.total_seconds() / 60, 1)
        return None


class AssessmentResultSerializer(serializers.Serializer):
    """Serializer for assessment API response."""
    
    overall_score = serializers.FloatField()
    fluency_score = serializers.FloatField(allow_null=True)
    phoneme_scores = serializers.ListField(child=serializers.DictField())
    weak_phonemes = serializers.ListField(child=serializers.CharField())
    llm_feedback = serializers.DictField()
    processing_time_ms = serializers.IntegerField()
    attempt_id = serializers.IntegerField()


class SublevelProgressSerializer(serializers.ModelSerializer):
    """Serializer for sublevel progress records."""
    
    class Meta:
        model = SublevelProgress
        fields = [
            'id', 'level', 'sublevel', 'attempts', 'average_score',
            'completed', 'completed_at'
        ]
        read_only_fields = ['id', 'completed_at']


class SublevelCompleteSerializer(serializers.Serializer):
    """Serializer for sublevel completion request."""
    
    level = serializers.CharField(required=True)
    sublevel = serializers.CharField(required=True)
    average_score = serializers.FloatField(required=True, min_value=0.0, max_value=1.0)
    attempts = serializers.IntegerField(default=5)
