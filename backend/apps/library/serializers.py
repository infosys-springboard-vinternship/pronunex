"""
Serializers for library content.
"""

from rest_framework import serializers
from .models import (
    Phoneme, ReferenceSentence, SentencePhoneme,
    LearningPath, PhonemeUnit, UnitPhoneme, UserPhonemeProgress
)


class PhonemeSerializer(serializers.ModelSerializer):
    """Serializer for phoneme data."""
    
    class Meta:
        model = Phoneme
        fields = [
            'id', 'symbol', 'arpabet', 'ipa', 'type',
            'example_word', 'description', 'articulation_tip'
        ]


class SentencePhonemeSerializer(serializers.ModelSerializer):
    """Serializer for sentence-phoneme relationships."""
    
    phoneme = PhonemeSerializer(read_only=True)
    
    class Meta:
        model = SentencePhoneme
        fields = ['phoneme', 'position', 'word_context']


class ReferenceSentenceListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for sentence listings."""
    
    audio_source = serializers.SerializerMethodField()
    
    class Meta:
        model = ReferenceSentence
        fields = [
            'id', 'text', 'difficulty_level', 'audio_source',
            'target_phonemes', 'source', 'is_validated'
        ]
    
    def get_audio_source(self, obj):
        return obj.get_audio_source()


class ReferenceSentenceDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer with phoneme data for assessment."""
    
    audio_source = serializers.SerializerMethodField()
    sentence_phonemes = SentencePhonemeSerializer(many=True, read_only=True)
    
    class Meta:
        model = ReferenceSentence
        fields = [
            'id', 'text', 'difficulty_level', 'audio_source',
            'phoneme_sequence', 'alignment_map', 'target_phonemes',
            'source', 'is_validated', 'sentence_phonemes',
            'created_at', 'updated_at'
        ]
    
    def get_audio_source(self, obj):
        return obj.get_audio_source()


class LearningPathSerializer(serializers.ModelSerializer):
    """Serializer for learning paths."""
    
    is_unlocked = serializers.SerializerMethodField()
    completion_percentage = serializers.SerializerMethodField()
    
    class Meta:
        model = LearningPath
        fields = [
            'id', 'name', 'difficulty', 'description',
            'unlock_criteria_accuracy', 'order', 'is_active',
            'is_unlocked', 'completion_percentage'
        ]
    
    def get_is_unlocked(self, obj):
        """Check if path is unlocked for user."""
        from django.db import models
        user = self.context.get('user')
        if not user or obj.unlock_criteria_accuracy == 0:
            return True
        
        from apps.analytics.models import PhonemeProgress
        avg_score = PhonemeProgress.objects.filter(
            user=user
        ).aggregate(models.Avg('current_score'))['current_score__avg']
        
        return avg_score and (avg_score * 100) >= obj.unlock_criteria_accuracy
    
    def get_completion_percentage(self, obj):
        """Calculate path completion percentage."""
        user = self.context.get('user')
        if not user:
            return 0
        
        total_phonemes = UnitPhoneme.objects.filter(
            unit__learning_path=obj
        ).count()
        
        if total_phonemes == 0:
            return 0
        
        completed_phonemes = UserPhonemeProgress.objects.filter(
            user=user,
            unit_phoneme__unit__learning_path=obj,
            crown_level__gte=3
        ).count()
        
        return int((completed_phonemes / total_phonemes) * 100)


class UnitPhonemeSerializer(serializers.ModelSerializer):
    """Serializer for unit phonemes."""
    
    phoneme = PhonemeSerializer(read_only=True)
    user_progress = serializers.SerializerMethodField()
    
    class Meta:
        model = UnitPhoneme
        fields = ['id', 'phoneme', 'order', 'user_progress']
    
    def get_user_progress(self, obj):
        """Get user progress for this phoneme."""
        user = self.context.get('user')
        if not user:
            return None
        
        try:
            progress = UserPhonemeProgress.objects.get(
                user=user,
                unit_phoneme=obj
            )
            return UserPhonemeProgressSerializer(progress).data
        except UserPhonemeProgress.DoesNotExist:
            return {
                'crown_level': 0,
                'is_legendary': False,
                'practice_count': 0,
                'average_score': 0,
                'is_unlocked': False
            }


class PhonemeUnitSerializer(serializers.ModelSerializer):
    """Serializer for phoneme units."""
    
    phonemes = UnitPhonemeSerializer(many=True, read_only=True)
    is_unlocked = serializers.SerializerMethodField()
    completion_percentage = serializers.SerializerMethodField()
    
    class Meta:
        model = PhonemeUnit
        fields = [
            'id', 'name', 'description', 'order', 'icon',
            'phonemes', 'is_unlocked', 'completion_percentage'
        ]
    
    def get_is_unlocked(self, obj):
        """Check if unit is unlocked for user."""
        user = self.context.get('user')
        if not user:
            return False
        
        if not obj.unlock_criteria_previous_unit:
            return True
        
        previous_unit = obj.unlock_criteria_previous_unit
        total_phonemes = previous_unit.phonemes.count()
        
        if total_phonemes == 0:
            return True
        
        completed_phonemes = UserPhonemeProgress.objects.filter(
            user=user,
            unit_phoneme__unit=previous_unit,
            crown_level__gte=3
        ).count()
        
        completion_percentage = (completed_phonemes / total_phonemes) * 100
        return completion_percentage >= 80
    
    def get_completion_percentage(self, obj):
        """Calculate unit completion percentage."""
        user = self.context.get('user')
        if not user:
            return 0
        
        total_phonemes = obj.phonemes.count()
        if total_phonemes == 0:
            return 0
        
        completed_phonemes = UserPhonemeProgress.objects.filter(
            user=user,
            unit_phoneme__unit=obj,
            crown_level__gte=3
        ).count()
        
        return int((completed_phonemes / total_phonemes) * 100)


class UserPhonemeProgressSerializer(serializers.ModelSerializer):
    """Serializer for user phoneme progress with crown levels."""
    
    phoneme_symbol = serializers.CharField(
        source='unit_phoneme.phoneme.symbol',
        read_only=True
    )
    phoneme_arpabet = serializers.CharField(
        source='unit_phoneme.phoneme.arpabet',
        read_only=True
    )
    is_unlocked = serializers.BooleanField(read_only=True)
    can_level_up = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = UserPhonemeProgress
        fields = [
            'phoneme_symbol', 'phoneme_arpabet', 'crown_level',
            'is_legendary', 'practice_count', 'last_practiced',
            'average_score', 'is_unlocked', 'can_level_up'
        ]


class SkillTreeSerializer(serializers.Serializer):
    """Complete skill tree with paths, units, and user progress."""
    
    learning_paths = LearningPathSerializer(many=True)
    current_path = LearningPathSerializer()
