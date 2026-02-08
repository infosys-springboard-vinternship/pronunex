"""
URL patterns for analytics endpoints.
"""

from django.urls import path
from .views import (
    ProgressDashboardView,
    PhonemeAnalyticsView,
    WeakPhonemesView,
    HistoryView,
    GamificationDashboardView,
    UserXPView,
    DailyQuestsView,
    AchievementsView,
    UserAchievementsView,
    GemsView,
    HeartsView,
    LeaderboardView,
    FriendsLeaderboardView,
    FriendshipView,
    FriendshipActionView,
    StreakFreezeView,
)

urlpatterns = [
    path('analytics/progress/', ProgressDashboardView.as_view(), name='progress_dashboard'),
    path('analytics/phoneme-stats/', PhonemeAnalyticsView.as_view(), name='phoneme_stats'),
    path('analytics/weak-phonemes/', WeakPhonemesView.as_view(), name='weak_phonemes'),
    path('analytics/history/', HistoryView.as_view(), name='progress_history'),
    
    path('gamification/dashboard/', GamificationDashboardView.as_view(), name='gamification_dashboard'),
    
    path('gamification/xp/', UserXPView.as_view(), name='user_xp'),
    path('gamification/xp/set-goal/', UserXPView.as_view(), name='set_xp_goal'),
    
    path('gamification/quests/', DailyQuestsView.as_view(), name='daily_quests'),
    
    path('gamification/achievements/', AchievementsView.as_view(), name='achievements'),
    path('gamification/achievements/unlocked/', UserAchievementsView.as_view(), name='user_achievements'),
    
    path('gamification/gems/', GemsView.as_view(), name='gems'),
    
    path('gamification/hearts/', HeartsView.as_view(), name='hearts'),
    path('gamification/hearts/refill/', HeartsView.as_view(), name='refill_hearts'),
    
    path('gamification/leaderboard/', LeaderboardView.as_view(), name='leaderboard'),
    path('gamification/leaderboard/friends/', FriendsLeaderboardView.as_view(), name='friends_leaderboard'),
    
    path('gamification/friends/', FriendshipView.as_view(), name='friends'),
    path('gamification/friends/request/', FriendshipView.as_view(), name='friend_request'),
    path('gamification/friends/<int:friendship_id>/accept/', FriendshipActionView.as_view(), {'action': 'accept'}, name='accept_friend'),
    path('gamification/friends/<int:friendship_id>/reject/', FriendshipActionView.as_view(), {'action': 'reject'}, name='reject_friend'),
    path('gamification/friends/<int:friendship_id>/', FriendshipActionView.as_view(), name='delete_friend'),
    
    path('gamification/streak/freeze/', StreakFreezeView.as_view(), name='streak_freeze'),
]
