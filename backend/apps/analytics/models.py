"""
Analytics Models for Pronunex.

Aggregated progress data for dashboard visualization.
"""

from django.db import models
from django.conf import settings


class UserProgress(models.Model):
    """
    Daily aggregated progress for a user.
    Used for progress visualization and trend analysis.
    """
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='daily_progress'
    )
    date = models.DateField()
    
    # Session metrics
    sessions_count = models.IntegerField(default=0)
    total_practice_minutes = models.FloatField(default=0)
    
    # Attempt metrics
    attempts_count = models.IntegerField(default=0)
    average_score = models.FloatField(null=True, blank=True)
    best_score = models.FloatField(null=True, blank=True)
    
    # Phoneme analysis
    weak_phonemes = models.JSONField(
        default=list,
        help_text='List of weak phonemes for this day'
    )
    improved_phonemes = models.JSONField(
        default=list,
        help_text='Phonemes that improved compared to previous day'
    )
    
    class Meta:
        verbose_name = 'User Progress'
        verbose_name_plural = 'User Progress Records'
        ordering = ['-date']
        unique_together = ['user', 'date']
    
    def __str__(self):
        return f"{self.user.email} - {self.date}"


class PhonemeProgress(models.Model):
    """
    Per-phoneme progress tracking for a user.
    Enables detailed analysis of specific sound improvements.
    """
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='phoneme_progress'
    )
    phoneme = models.ForeignKey(
        'library.Phoneme',
        on_delete=models.CASCADE,
        related_name='user_progress'
    )
    
    # Current state
    current_score = models.FloatField(
        default=0,
        help_text='Most recent average score for this phoneme'
    )
    attempts_count = models.IntegerField(default=0)
    
    # Historical tracking
    first_attempt_score = models.FloatField(null=True, blank=True)
    best_score = models.FloatField(null=True, blank=True)
    
    # Improvement metrics
    improvement_rate = models.FloatField(
        default=0,
        help_text='Score improvement per 10 attempts'
    )
    
    # Timestamps
    first_practiced = models.DateTimeField(null=True, blank=True)
    last_practiced = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        verbose_name = 'Phoneme Progress'
        verbose_name_plural = 'Phoneme Progress Records'
        ordering = ['user', 'phoneme']
        unique_together = ['user', 'phoneme']
        indexes = [
            models.Index(fields=['user', 'current_score']),
        ]
    
    def __str__(self):
        return f"{self.user.email} - {self.phoneme.arpabet}: {self.current_score:.2f}"
    
    @property
    def is_weak(self):
        """Check if phoneme is currently weak."""
        threshold = settings.SCORING_CONFIG.get('WEAK_PHONEME_THRESHOLD', 0.7)
        return self.current_score < threshold
    
    @property
    def total_improvement(self):
        """Calculate total improvement from first attempt."""
        if self.first_attempt_score is not None:
            return self.current_score - self.first_attempt_score
        return 0


class StreakRecord(models.Model):
    """
    Practice streak tracking for gamification.
    """
    
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='streak'
    )
    
    current_streak = models.IntegerField(default=0)
    longest_streak = models.IntegerField(default=0)
    last_practice_date = models.DateField(null=True, blank=True)
    
    class Meta:
        verbose_name = 'Streak Record'
        verbose_name_plural = 'Streak Records'
    
    def __str__(self):
        return f"{self.user.email} - {self.current_streak} day streak"
