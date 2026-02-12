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


class ScoringConfig(models.Model):
    """
    Singleton scoring configuration stored in database.
    
    Only one active config exists at a time.
    Changes create history entries for audit trail and rollback.
    """
    
    tier_thresholds = models.JSONField(
        default=dict,
        help_text='Score tier boundaries: {"excellent": 0.9, "good": 0.7, "fair": 0.5}'
    )
    per_cutoffs = models.JSONField(
        default=dict,
        help_text='PER cutoff values: {"excellent": 0.1, "good": 0.25, "poor": 0.5}'
    )
    weak_phoneme_threshold = models.FloatField(
        default=0.7,
        help_text='Below this score, a phoneme is considered weak (0-1)'
    )
    accuracy_weight = models.FloatField(
        default=0.7,
        help_text='Weight for accuracy in final score (0-1)'
    )
    fluency_weight = models.FloatField(
        default=0.3,
        help_text='Weight for fluency in final score (0-1)'
    )
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='scoring_config_updates'
    )
    
    class Meta:
        verbose_name = 'Scoring Config'
        verbose_name_plural = 'Scoring Configs'
    
    def __str__(self):
        return f"ScoringConfig (updated {self.updated_at})"
    
    @classmethod
    def get_active(cls):
        """Get or create the singleton scoring config."""
        config, _ = cls.objects.get_or_create(pk=1, defaults={
            'tier_thresholds': {
                'excellent': 0.9,
                'good': 0.7,
                'fair': 0.5,
                'poor': 0.0
            },
            'per_cutoffs': {
                'excellent': 0.1,
                'good': 0.25,
                'fair': 0.4,
                'poor': 0.5
            },
        })
        return config
    
    def save(self, *args, **kwargs):
        """Force singleton by always using pk=1."""
        self.pk = 1
        super().save(*args, **kwargs)
    
    def delete(self, *args, **kwargs):
        """Prevent deletion of singleton config."""
        pass


class ScoringConfigHistory(models.Model):
    """
    Audit trail for scoring configuration changes.
    
    Every config change creates a snapshot for rollback capability.
    """
    
    config_snapshot = models.JSONField(
        help_text='Complete config state at time of change'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='scoring_config_history'
    )
    reason = models.CharField(
        max_length=255,
        blank=True,
        help_text='Reason for config change'
    )
    
    class Meta:
        verbose_name = 'Scoring Config History'
        verbose_name_plural = 'Scoring Config History Records'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Config snapshot at {self.created_at}"


class SystemLog(models.Model):
    """
    System-level error and event logging.
    
    Tracks STT failures, alignment errors, TTS errors,
    and other system issues for admin monitoring.
    """
    
    LOG_TYPES = [
        ('stt_error', 'STT Error'),
        ('alignment_error', 'Alignment Error'),
        ('system_error', 'System Error'),
        ('tts_error', 'TTS Error'),
        ('llm_error', 'LLM Error'),
        ('security', 'Security Event'),
        ('admin_action', 'Admin Action'),
    ]
    
    SEVERITY_CHOICES = [
        ('info', 'Info'),
        ('warning', 'Warning'),
        ('error', 'Error'),
        ('critical', 'Critical'),
    ]
    
    type = models.CharField(max_length=50, choices=LOG_TYPES, db_index=True)
    severity = models.CharField(
        max_length=20,
        choices=SEVERITY_CHOICES,
        default='error',
        db_index=True
    )
    message = models.TextField()
    details = models.JSONField(null=True, blank=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='system_logs'
    )
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    
    class Meta:
        verbose_name = 'System Log'
        verbose_name_plural = 'System Logs'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['type', 'created_at']),
            models.Index(fields=['severity', 'created_at']),
        ]
    
    def __str__(self):
        return f"[{self.severity.upper()}] {self.type}: {self.message[:80]}"
