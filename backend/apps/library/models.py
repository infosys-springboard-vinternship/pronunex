"""
Library Models for Pronunex.

Contains static content: phonemes and reference sentences with precomputed data.
"""

from django.db import models


class Phoneme(models.Model):
    """
    English phoneme reference data.
    
    Contains 44 phonemes with ARPAbet and IPA representations.
    Used for mapping pronunciation errors and recommendations.
    """
    
    TYPE_CHOICES = [
        ('vowel', 'Vowel'),
        ('consonant', 'Consonant'),
        ('diphthong', 'Diphthong'),
        ('fricative', 'Fricative'),
        ('plosive', 'Plosive'),
        ('nasal', 'Nasal'),
        ('liquid', 'Liquid'),
        ('glide', 'Glide'),
        ('affricate', 'Affricate'),
    ]
    
    symbol = models.CharField(max_length=10, unique=True)  # Display symbol e.g., '/s/'
    arpabet = models.CharField(max_length=5, unique=True)  # ARPAbet e.g., 'S'
    ipa = models.CharField(max_length=10)                   # IPA symbol
    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    example_word = models.CharField(max_length=50)
    description = models.TextField(help_text='Articulation description')
    articulation_tip = models.TextField(
        blank=True,
        help_text='Tip for correct pronunciation'
    )
    
    class Meta:
        verbose_name = 'Phoneme'
        verbose_name_plural = 'Phonemes'
        ordering = ['type', 'arpabet']
    
    def __str__(self):
        return f"{self.arpabet} ({self.symbol})"


class ReferenceSentence(models.Model):
    """
    Reference sentence with precomputed phoneme data and embeddings.
    
    Key design principle: All phoneme sequences, alignment maps, and embeddings
    are precomputed and cached. They are NOT regenerated during assessment.
    """
    
    DIFFICULTY_CHOICES = [
        ('beginner', 'Beginner'),
        ('intermediate', 'Intermediate'),
        ('advanced', 'Advanced'),
    ]
    
    SOURCE_CHOICES = [
        ('curated', 'Curated'),
        ('llm_generated', 'LLM Generated'),
    ]
    
    text = models.TextField()
    
    # Audio storage (local file or Supabase URL)
    audio_file = models.FileField(upload_to='references/', blank=True, null=True)
    audio_url = models.URLField(blank=True, help_text='Supabase storage URL')
    
    # Precomputed phoneme data (fetched from DB, not regenerated)
    phoneme_sequence = models.JSONField(
        help_text='Precomputed ARPAbet sequence: ["DH", "AH0", "K", "W", "IH1", "K"]'
    )
    alignment_map = models.JSONField(
        help_text='Precomputed timestamps: [{"phoneme": "S", "start": 0.1, "end": 0.2}]'
    )
    
    # Precomputed reference embeddings (cached, not regenerated per request)
    reference_embeddings = models.BinaryField(
        null=True, 
        blank=True,
        help_text='Serialized numpy array of phoneme embeddings'
    )
    
    difficulty_level = models.CharField(
        max_length=20, 
        choices=DIFFICULTY_CHOICES,
        default='beginner'
    )
    
    # Target phonemes for practice focus
    target_phonemes = models.JSONField(
        null=True, 
        blank=True,
        help_text='Phonemes this sentence is designed to practice'
    )
    
    # Source tracking
    source = models.CharField(
        max_length=20, 
        choices=SOURCE_CHOICES, 
        default='curated'
    )
    generation_metadata = models.JSONField(
        null=True, 
        blank=True,
        help_text='LLM generation details: model, prompt hash, timestamp'
    )
    
    # Validation status
    is_validated = models.BooleanField(
        default=True,
        help_text='Whether phoneme sequence has been verified via G2P'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Reference Sentence'
        verbose_name_plural = 'Reference Sentences'
        ordering = ['difficulty_level', '-created_at']
        indexes = [
            models.Index(fields=['difficulty_level', '-created_at']),
            models.Index(fields=['source', '-created_at']),
        ]
    
    def __str__(self):
        return f"{self.text[:50]}..." if len(self.text) > 50 else self.text
    
    def get_audio_source(self):
        """Return the audio URL or absolute file path."""
        if self.audio_url:
            return self.audio_url
        elif self.audio_file:
            # Return absolute path for local files, not URL
            return self.audio_file.path
        return None


class SentencePhoneme(models.Model):
    """
    Junction table linking sentences to their target phonemes.
    Enables efficient querying for phoneme-focused practice.
    """
    
    sentence = models.ForeignKey(
        ReferenceSentence, 
        on_delete=models.CASCADE,
        related_name='sentence_phonemes'
    )
    phoneme = models.ForeignKey(
        Phoneme, 
        on_delete=models.CASCADE,
        related_name='sentence_phonemes'
    )
    position = models.CharField(
        max_length=20,
        choices=[
            ('initial', 'Initial'),
            ('medial', 'Medial'),
            ('final', 'Final'),
        ],
        help_text='Position of phoneme in word'
    )
    word_context = models.CharField(
        max_length=50,
        help_text='The word containing this phoneme'
    )
    
    class Meta:
        verbose_name = 'Sentence Phoneme'
        verbose_name_plural = 'Sentence Phonemes'
        ordering = ['sentence', 'position']
    
    def __str__(self):
        return f"{self.phoneme.arpabet} in '{self.word_context}'"
