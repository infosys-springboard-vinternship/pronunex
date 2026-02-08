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


class LearningPath(models.Model):
    """
    Learning paths with progressive difficulty (Sound Explorer, Fluency Adventurer, Pronunciation Champion).
    """
    
    DIFFICULTY_CHOICES = [
        ('beginner', 'Sound Explorer'),
        ('intermediate', 'Fluency Adventurer'),
        ('advanced', 'Pronunciation Champion'),
    ]
    
    name = models.CharField(max_length=100, unique=True)
    difficulty = models.CharField(max_length=20, choices=DIFFICULTY_CHOICES)
    description = models.TextField()
    
    unlock_criteria_accuracy = models.FloatField(
        default=0,
        help_text='Minimum accuracy % required to unlock (0 for beginner)'
    )
    unlock_criteria_previous_path = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        help_text='Previous path that must be completed'
    )
    
    order = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        verbose_name = 'Learning Path'
        verbose_name_plural = 'Learning Paths'
        ordering = ['order']
    
    def __str__(self):
        return f"{self.name} ({self.difficulty})"


class PhonemeUnit(models.Model):
    """
    Groups phonemes into learning units (e.g., Short Vowels, Long Vowels, Consonants).
    """
    
    learning_path = models.ForeignKey(
        LearningPath,
        on_delete=models.CASCADE,
        related_name='units'
    )
    
    name = models.CharField(max_length=100)
    description = models.TextField()
    
    order = models.IntegerField(default=0)
    
    icon = models.CharField(
        max_length=50,
        default='book',
        help_text='Icon name for SVG rendering'
    )
    
    unlock_criteria_previous_unit = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        help_text='Previous unit that must be completed'
    )
    
    class Meta:
        verbose_name = 'Phoneme Unit'
        verbose_name_plural = 'Phoneme Units'
        ordering = ['learning_path', 'order']
        unique_together = ['learning_path', 'order']
    
    def __str__(self):
        return f"{self.learning_path.name} - {self.name}"


class UnitPhoneme(models.Model):
    """
    Links phonemes to units with crown levels for mastery tracking.
    """
    
    unit = models.ForeignKey(
        PhonemeUnit,
        on_delete=models.CASCADE,
        related_name='phonemes'
    )
    phoneme = models.ForeignKey(
        Phoneme,
        on_delete=models.CASCADE,
        related_name='units'
    )
    
    order = models.IntegerField(default=0)
    
    class Meta:
        verbose_name = 'Unit Phoneme'
        verbose_name_plural = 'Unit Phonemes'
        ordering = ['unit', 'order']
        unique_together = ['unit', 'phoneme']
    
    def __str__(self):
        return f"{self.unit.name} - {self.phoneme.arpabet}"


class UserPhonemeProgress(models.Model):
    """
    Tracks user progress on individual phonemes with crown levels (1-5).
    """
    
    user = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='phoneme_progress_levels'
    )
    unit_phoneme = models.ForeignKey(
        UnitPhoneme,
        on_delete=models.CASCADE,
        related_name='user_progress'
    )
    
    crown_level = models.IntegerField(
        default=0,
        help_text='0 = locked, 1-5 = mastery levels'
    )
    is_legendary = models.BooleanField(
        default=False,
        help_text='Completed legendary challenge after 5 crowns'
    )
    
    practice_count = models.IntegerField(default=0)
    last_practiced = models.DateTimeField(null=True, blank=True)
    
    average_score = models.FloatField(default=0)
    
    class Meta:
        verbose_name = 'User Phoneme Progress'
        verbose_name_plural = 'User Phoneme Progress Records'
        unique_together = ['user', 'unit_phoneme']
    
    def __str__(self):
        crowns = '⭐' * self.crown_level
        legendary = ' 🏆' if self.is_legendary else ''
        return f"{self.user.email} - {self.unit_phoneme.phoneme.arpabet} {crowns}{legendary}"
    
    def is_unlocked(self):
        """Check if phoneme is unlocked for practice."""
        return self.crown_level > 0
    
    def can_level_up(self):
        """Check if user can advance to next crown level."""
        if self.crown_level >= 5:
            return False
        
        required_practices = (self.crown_level + 1) * 5
        min_score = 0.7 + (self.crown_level * 0.05)
        
        return (
            self.practice_count >= required_practices and
            self.average_score >= min_score
        )
