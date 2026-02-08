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
    
    streak_freezes_available = models.IntegerField(
        default=0,
        help_text='Number of streak freezes user can use'
    )
    streak_freeze_used_at = models.DateField(
        null=True,
        blank=True,
        help_text='Last date streak freeze was used'
    )
    
    practice_calendar = models.JSONField(
        default=dict,
        help_text='Calendar data: {"2024-01-15": true, "2024-01-16": true}'
    )
    
    class Meta:
        verbose_name = 'Streak Record'
        verbose_name_plural = 'Streak Records'
    
    def __str__(self):
        return f"{self.user.email} - {self.current_streak} day streak"


class UserXP(models.Model):
    """
    Experience Points (XP) system for user engagement.
    Tracks daily, weekly, and total XP with leveling.
    """
    
    DAILY_GOAL_CHOICES = [
        (10, 'Casual - 10 XP/day'),
        (20, 'Regular - 20 XP/day'),
        (30, 'Serious - 30 XP/day'),
        (50, 'Intense - 50 XP/day'),
    ]
    
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='xp'
    )
    
    total_xp = models.IntegerField(default=0)
    weekly_xp = models.IntegerField(default=0)
    daily_xp = models.IntegerField(default=0)
    
    daily_xp_goal = models.IntegerField(
        default=20,
        choices=DAILY_GOAL_CHOICES
    )
    
    current_level = models.IntegerField(default=1)
    
    last_daily_reset = models.DateField(auto_now_add=True)
    last_weekly_reset = models.DateField(auto_now_add=True)
    
    class Meta:
        verbose_name = 'User XP'
        verbose_name_plural = 'User XP Records'
    
    def __str__(self):
        return f"{self.user.email} - Level {self.current_level} ({self.total_xp} XP)"
    
    def add_xp(self, amount, reason=''):
        """Add XP and update level if threshold reached."""
        self.total_xp += amount
        self.weekly_xp += amount
        self.daily_xp += amount
        
        new_level = self.calculate_level(self.total_xp)
        level_up = new_level > self.current_level
        self.current_level = new_level
        
        self.save()
        
        XPTransaction.objects.create(
            user=self.user,
            amount=amount,
            reason=reason,
            level_after=self.current_level
        )
        
        return level_up
    
    @staticmethod
    def calculate_level(total_xp):
        """Calculate level from total XP (100 XP per level)."""
        return max(1, (total_xp // 100) + 1)
    
    def xp_to_next_level(self):
        """Calculate XP needed for next level."""
        next_level_xp = self.current_level * 100
        return next_level_xp - self.total_xp


class XPTransaction(models.Model):
    """
    Log of XP transactions for transparency and analytics.
    """
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='xp_transactions'
    )
    
    amount = models.IntegerField()
    reason = models.CharField(max_length=100)
    level_after = models.IntegerField()
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = 'XP Transaction'
        verbose_name_plural = 'XP Transactions'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.user.email} +{self.amount} XP: {self.reason}"


class Achievement(models.Model):
    """
    Achievement definitions with XP rewards.
    """
    
    CATEGORY_CHOICES = [
        ('streak', 'Streak'),
        ('practice', 'Practice'),
        ('mastery', 'Mastery'),
        ('social', 'Social'),
    ]
    
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField()
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    
    icon = models.CharField(
        max_length=50,
        default='trophy',
        help_text='Icon name for SVG rendering'
    )
    
    xp_reward = models.IntegerField(default=50)
    
    requirement_type = models.CharField(
        max_length=50,
        help_text='streak_days, total_attempts, phoneme_mastery, etc.'
    )
    requirement_value = models.IntegerField()
    
    is_active = models.BooleanField(default=True)
    
    class Meta:
        verbose_name = 'Achievement'
        verbose_name_plural = 'Achievements'
        ordering = ['category', 'requirement_value']
    
    def __str__(self):
        return self.name


class UserAchievement(models.Model):
    """
    Tracks which achievements users have unlocked.
    """
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='unlocked_achievements'
    )
    achievement = models.ForeignKey(
        Achievement,
        on_delete=models.CASCADE,
        related_name='user_unlocks'
    )
    
    unlocked_at = models.DateTimeField(auto_now_add=True)
    xp_awarded = models.IntegerField()
    
    class Meta:
        verbose_name = 'User Achievement'
        verbose_name_plural = 'User Achievements'
        unique_together = ['user', 'achievement']
        ordering = ['-unlocked_at']
    
    def __str__(self):
        return f"{self.user.email} - {self.achievement.name}"


class DailyQuest(models.Model):
    """
    Daily rotating quests for engagement.
    """
    
    QUEST_TYPE_CHOICES = [
        ('practice_count', 'Complete N sentences'),
        ('streak_maintain', 'Maintain streak'),
        ('perfect_score', 'Get N perfect scores'),
        ('phoneme_focus', 'Practice specific phoneme N times'),
        ('time_challenge', 'Practice for N minutes'),
    ]
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='daily_quests'
    )
    
    quest_type = models.CharField(max_length=30, choices=QUEST_TYPE_CHOICES)
    title = models.CharField(max_length=100)
    description = models.TextField()
    
    target_value = models.IntegerField(help_text='Target number to complete')
    current_progress = models.IntegerField(default=0)
    
    xp_reward = models.IntegerField(default=15)
    gems_reward = models.IntegerField(default=5)
    
    target_phoneme = models.ForeignKey(
        'library.Phoneme',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        help_text='For phoneme_focus quests'
    )
    
    date = models.DateField()
    is_completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        verbose_name = 'Daily Quest'
        verbose_name_plural = 'Daily Quests'
        ordering = ['date', '-is_completed']
        unique_together = ['user', 'date', 'quest_type']
    
    def __str__(self):
        status = '✓' if self.is_completed else f'{self.current_progress}/{self.target_value}'
        return f"{self.user.email} - {self.title} [{status}]"
    
    @property
    def progress_percentage(self):
        """Calculate quest completion percentage."""
        if self.target_value == 0:
            return 0
        return min(100, int((self.current_progress / self.target_value) * 100))


class UserGems(models.Model):
    """
    Virtual currency system for unlockables.
    """
    
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='gems'
    )
    
    total_gems = models.IntegerField(default=0)
    gems_spent = models.IntegerField(default=0)
    
    class Meta:
        verbose_name = 'User Gems'
        verbose_name_plural = 'User Gems'
    
    def __str__(self):
        return f"{self.user.email} - {self.available_gems} gems"
    
    @property
    def available_gems(self):
        """Calculate available gems after spending."""
        return self.total_gems - self.gems_spent
    
    def add_gems(self, amount, reason=''):
        """Add gems to user balance."""
        self.total_gems += amount
        self.save()
        
        GemTransaction.objects.create(
            user=self.user,
            amount=amount,
            transaction_type='earn',
            reason=reason
        )
    
    def spend_gems(self, amount, reason=''):
        """Spend gems if user has enough."""
        if self.available_gems >= amount:
            self.gems_spent += amount
            self.save()
            
            GemTransaction.objects.create(
                user=self.user,
                amount=-amount,
                transaction_type='spend',
                reason=reason
            )
            return True
        return False


class GemTransaction(models.Model):
    """
    Log of gem transactions.
    """
    
    TRANSACTION_TYPE_CHOICES = [
        ('earn', 'Earned'),
        ('spend', 'Spent'),
    ]
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='gem_transactions'
    )
    
    amount = models.IntegerField()
    transaction_type = models.CharField(max_length=10, choices=TRANSACTION_TYPE_CHOICES)
    reason = models.CharField(max_length=100)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = 'Gem Transaction'
        verbose_name_plural = 'Gem Transactions'
        ordering = ['-created_at']
    
    def __str__(self):
        sign = '+' if self.transaction_type == 'earn' else '-'
        return f"{self.user.email} {sign}{abs(self.amount)} gems: {self.reason}"


class UserHearts(models.Model):
    """
    Hearts/Lives system - lose hearts on poor performance.
    """
    
    MAX_HEARTS = 5
    
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='hearts'
    )
    
    current_hearts = models.IntegerField(default=MAX_HEARTS)
    last_heart_lost = models.DateTimeField(null=True, blank=True)
    last_heart_refill = models.DateTimeField(null=True, blank=True)
    
    has_unlimited_hearts = models.BooleanField(
        default=False,
        help_text='Premium feature or earned through perfect streaks'
    )
    
    class Meta:
        verbose_name = 'User Hearts'
        verbose_name_plural = 'User Hearts'
    
    def __str__(self):
        if self.has_unlimited_hearts:
            return f"{self.user.email} - ∞ hearts"
        return f"{self.user.email} - {self.current_hearts}/{self.MAX_HEARTS} hearts"
    
    def lose_heart(self):
        """Decrease heart count if not unlimited."""
        if not self.has_unlimited_hearts and self.current_hearts > 0:
            self.current_hearts -= 1
            self.last_heart_lost = models.functions.Now()
            self.save()
            return True
        return False
    
    def refill_heart(self):
        """Refill one heart."""
        if self.current_hearts < self.MAX_HEARTS:
            self.current_hearts += 1
            self.last_heart_refill = models.functions.Now()
            self.save()
            return True
        return False
    
    def refill_all_hearts(self):
        """Refill all hearts."""
        self.current_hearts = self.MAX_HEARTS
        self.last_heart_refill = models.functions.Now()
        self.save()


class League(models.Model):
    """
    League tiers for weekly competition.
    """
    
    TIER_CHOICES = [
        ('bronze', 'Bronze'),
        ('silver', 'Silver'),
        ('gold', 'Gold'),
        ('platinum', 'Platinum'),
        ('diamond', 'Diamond'),
    ]
    
    name = models.CharField(max_length=20, choices=TIER_CHOICES, unique=True)
    min_rank = models.IntegerField(help_text='Minimum rank to stay in league')
    order = models.IntegerField(default=0)
    
    icon = models.CharField(
        max_length=50,
        default='trophy',
        help_text='Icon name for SVG rendering'
    )
    
    class Meta:
        verbose_name = 'League'
        verbose_name_plural = 'Leagues'
        ordering = ['order']
    
    def __str__(self):
        return f"{self.get_name_display()} League"


class UserLeague(models.Model):
    """
    Tracks user's current league membership.
    """
    
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='league_status'
    )
    
    current_league = models.ForeignKey(
        League,
        on_delete=models.CASCADE,
        related_name='current_members'
    )
    
    weekly_rank = models.IntegerField(default=0)
    promotion_count = models.IntegerField(default=0)
    demotion_count = models.IntegerField(default=0)
    
    highest_league = models.ForeignKey(
        League,
        on_delete=models.SET_NULL,
        null=True,
        related_name='peak_members'
    )
    
    joined_current_league = models.DateField(auto_now_add=True)
    
    class Meta:
        verbose_name = 'User League'
        verbose_name_plural = 'User Leagues'
    
    def __str__(self):
        return f"{self.user.email} - {self.current_league.get_name_display()}"


class WeeklyLeaderboard(models.Model):
    """
    Weekly leaderboard entries for competition.
    """
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='leaderboard_entries'
    )
    league = models.ForeignKey(
        League,
        on_delete=models.CASCADE,
        related_name='leaderboard_entries'
    )
    
    week_start = models.DateField()
    week_end = models.DateField()
    
    weekly_xp = models.IntegerField(default=0)
    rank = models.IntegerField(null=True, blank=True)
    
    promoted = models.BooleanField(default=False)
    demoted = models.BooleanField(default=False)
    
    class Meta:
        verbose_name = 'Weekly Leaderboard Entry'
        verbose_name_plural = 'Weekly Leaderboard Entries'
        ordering = ['league', '-weekly_xp']
        unique_together = ['user', 'week_start']
    
    def __str__(self):
        return f"{self.user.email} - Week {self.week_start} - {self.weekly_xp} XP"


class Friendship(models.Model):
    """
    Friend connections for social features.
    """
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('accepted', 'Accepted'),
        ('rejected', 'Rejected'),
    ]
    
    from_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='sent_friend_requests'
    )
    to_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='received_friend_requests'
    )
    
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Friendship'
        verbose_name_plural = 'Friendships'
        unique_together = ['from_user', 'to_user']
    
    def __str__(self):
        return f"{self.from_user.email} → {self.to_user.email} ({self.status})"
    
    @classmethod
    def are_friends(cls, user1, user2):
        """Check if two users are friends."""
        return cls.objects.filter(
            models.Q(from_user=user1, to_user=user2) |
            models.Q(from_user=user2, to_user=user1),
            status='accepted'
        ).exists()
    
    @classmethod
    def get_friends(cls, user):
        """Get all friends for a user."""
        from django.db.models import Q
        friendships = cls.objects.filter(
            Q(from_user=user) | Q(to_user=user),
            status='accepted'
        )
        
        friend_ids = []
        for friendship in friendships:
            if friendship.from_user == user:
                friend_ids.append(friendship.to_user.id)
            else:
                friend_ids.append(friendship.from_user.id)
        
        from accounts.models import User
        return User.objects.filter(id__in=friend_ids)
