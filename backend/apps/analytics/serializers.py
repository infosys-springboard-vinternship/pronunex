"""
Serializers for analytics data.
"""

from rest_framework import serializers
from .models import (
    UserProgress, PhonemeProgress, StreakRecord,
    UserXP, XPTransaction, Achievement, UserAchievement,
    DailyQuest, UserGems, GemTransaction, UserHearts,
    League, UserLeague, WeeklyLeaderboard, Friendship
)


class UserProgressSerializer(serializers.ModelSerializer):
    """Serializer for daily progress data."""
    
    class Meta:
        model = UserProgress
        fields = [
            'date', 'sessions_count', 'total_practice_minutes',
            'attempts_count', 'average_score', 'best_score',
            'weak_phonemes', 'improved_phonemes'
        ]


class PhonemeProgressSerializer(serializers.ModelSerializer):
    """Serializer for per-phoneme progress."""
    
    phoneme_symbol = serializers.CharField(source='phoneme.symbol', read_only=True)
    phoneme_arpabet = serializers.CharField(source='phoneme.arpabet', read_only=True)
    is_weak = serializers.BooleanField(read_only=True)
    total_improvement = serializers.FloatField(read_only=True)
    
    class Meta:
        model = PhonemeProgress
        fields = [
            'phoneme_symbol', 'phoneme_arpabet', 'current_score',
            'attempts_count', 'first_attempt_score', 'best_score',
            'improvement_rate', 'is_weak', 'total_improvement',
            'first_practiced', 'last_practiced'
        ]


class StreakSerializer(serializers.ModelSerializer):
    """Serializer for streak data."""
    
    class Meta:
        model = StreakRecord
        fields = [
            'current_streak', 'longest_streak', 'last_practice_date',
            'streak_freezes_available', 'streak_freeze_used_at',
            'practice_calendar'
        ]


class ProgressDashboardSerializer(serializers.Serializer):
    """Serializer for aggregated dashboard data."""
    
    # Summary stats
    total_sessions = serializers.IntegerField()
    total_attempts = serializers.IntegerField()
    total_practice_minutes = serializers.FloatField()
    overall_average_score = serializers.FloatField()
    
    # Current state
    current_weak_phonemes = serializers.ListField(child=serializers.CharField())
    current_strong_phonemes = serializers.ListField(child=serializers.CharField())
    
    # Trends
    score_trend = serializers.CharField()  # 'improving', 'stable', 'declining'
    recent_progress = UserProgressSerializer(many=True)
    
    # Streak
    streak = StreakSerializer()
    
    # Phoneme breakdown
    phoneme_progress = PhonemeProgressSerializer(many=True)


class UserXPSerializer(serializers.ModelSerializer):
    """Serializer for user XP and level data."""
    
    xp_to_next_level = serializers.IntegerField(read_only=True)
    progress_percentage = serializers.SerializerMethodField()
    
    class Meta:
        model = UserXP
        fields = [
            'total_xp', 'weekly_xp', 'daily_xp', 'daily_xp_goal',
            'current_level', 'xp_to_next_level', 'progress_percentage',
            'last_daily_reset', 'last_weekly_reset'
        ]
    
    def get_progress_percentage(self, obj):
        """Calculate percentage to next level."""
        if obj.xp_to_next_level() == 0:
            return 100
        xp_for_current_level = (obj.current_level - 1) * 100
        xp_for_next_level = obj.current_level * 100
        current_progress = obj.total_xp - xp_for_current_level
        level_range = xp_for_next_level - xp_for_current_level
        return int((current_progress / level_range) * 100)


class XPTransactionSerializer(serializers.ModelSerializer):
    """Serializer for XP transaction history."""
    
    class Meta:
        model = XPTransaction
        fields = ['amount', 'reason', 'level_after', 'created_at']


class AchievementSerializer(serializers.ModelSerializer):
    """Serializer for achievement definitions."""
    
    class Meta:
        model = Achievement
        fields = [
            'id', 'name', 'description', 'category', 'icon',
            'xp_reward', 'requirement_type', 'requirement_value'
        ]


class UserAchievementSerializer(serializers.ModelSerializer):
    """Serializer for user unlocked achievements."""
    
    achievement = AchievementSerializer(read_only=True)
    
    class Meta:
        model = UserAchievement
        fields = ['achievement', 'unlocked_at', 'xp_awarded']


class DailyQuestSerializer(serializers.ModelSerializer):
    """Serializer for daily quests."""
    
    progress_percentage = serializers.IntegerField(read_only=True)
    target_phoneme_symbol = serializers.CharField(
        source='target_phoneme.symbol',
        read_only=True,
        allow_null=True
    )
    
    class Meta:
        model = DailyQuest
        fields = [
            'id', 'quest_type', 'title', 'description',
            'target_value', 'current_progress', 'progress_percentage',
            'xp_reward', 'gems_reward', 'target_phoneme_symbol',
            'date', 'is_completed', 'completed_at'
        ]


class UserGemsSerializer(serializers.ModelSerializer):
    """Serializer for user gems balance."""
    
    available_gems = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = UserGems
        fields = ['total_gems', 'gems_spent', 'available_gems']


class GemTransactionSerializer(serializers.ModelSerializer):
    """Serializer for gem transaction history."""
    
    class Meta:
        model = GemTransaction
        fields = ['amount', 'transaction_type', 'reason', 'created_at']


class UserHeartsSerializer(serializers.ModelSerializer):
    """Serializer for user hearts/lives."""
    
    max_hearts = serializers.IntegerField(default=5, read_only=True)
    
    class Meta:
        model = UserHearts
        fields = [
            'current_hearts', 'max_hearts', 'last_heart_lost',
            'last_heart_refill', 'has_unlimited_hearts'
        ]


class LeagueSerializer(serializers.ModelSerializer):
    """Serializer for league tiers."""
    
    class Meta:
        model = League
        fields = ['name', 'min_rank', 'order', 'icon']


class UserLeagueSerializer(serializers.ModelSerializer):
    """Serializer for user league status."""
    
    current_league = LeagueSerializer(read_only=True)
    highest_league = LeagueSerializer(read_only=True)
    
    class Meta:
        model = UserLeague
        fields = [
            'current_league', 'weekly_rank', 'promotion_count',
            'demotion_count', 'highest_league', 'joined_current_league'
        ]


class WeeklyLeaderboardSerializer(serializers.ModelSerializer):
    """Serializer for leaderboard entries."""
    
    user_email = serializers.CharField(source='user.email', read_only=True)
    user_full_name = serializers.CharField(source='user.full_name', read_only=True)
    user_avatar_id = serializers.CharField(source='user.avatar_id', read_only=True)
    league_name = serializers.CharField(source='league.name', read_only=True)
    
    class Meta:
        model = WeeklyLeaderboard
        fields = [
            'user_email', 'user_full_name', 'user_avatar_id',
            'league_name', 'week_start', 'week_end',
            'weekly_xp', 'rank', 'promoted', 'demoted'
        ]


class FriendshipSerializer(serializers.ModelSerializer):
    """Serializer for friend connections."""
    
    from_user_email = serializers.CharField(source='from_user.email', read_only=True)
    from_user_full_name = serializers.CharField(source='from_user.full_name', read_only=True)
    from_user_avatar_id = serializers.CharField(source='from_user.avatar_id', read_only=True)
    
    to_user_email = serializers.CharField(source='to_user.email', read_only=True)
    to_user_full_name = serializers.CharField(source='to_user.full_name', read_only=True)
    to_user_avatar_id = serializers.CharField(source='to_user.avatar_id', read_only=True)
    
    class Meta:
        model = Friendship
        fields = [
            'id', 'from_user_email', 'from_user_full_name', 'from_user_avatar_id',
            'to_user_email', 'to_user_full_name', 'to_user_avatar_id',
            'status', 'created_at', 'updated_at'
        ]


class GamificationDashboardSerializer(serializers.Serializer):
    """Complete gamification dashboard data."""
    
    xp = UserXPSerializer()
    streak = StreakSerializer()
    gems = UserGemsSerializer()
    hearts = UserHeartsSerializer()
    league = UserLeagueSerializer()
    daily_quests = DailyQuestSerializer(many=True)
    recent_achievements = UserAchievementSerializer(many=True)
    leaderboard = WeeklyLeaderboardSerializer(many=True)
