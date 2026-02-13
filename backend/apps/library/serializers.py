"""
Serializers for library content.
"""

from rest_framework import serializers
from .models import Phoneme, ReferenceSentence, SentencePhoneme


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
            'id', 'text', 'difficulty_level', 'sublevel', 'audio_source',
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
            'id', 'text', 'difficulty_level', 'sublevel', 'audio_source',
            'phoneme_sequence', 'alignment_map', 'target_phonemes',
            'source', 'is_validated', 'sentence_phonemes',
            'created_at', 'updated_at'
        ]
    
    def get_audio_source(self, obj):
        return obj.get_audio_source()
