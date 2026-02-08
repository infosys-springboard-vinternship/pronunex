"""
API Views for analytics and progress tracking.

Views are thin HTTP handlers - business logic is in services layer.
"""

import logging
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import (
    UserProgress, UserXP, DailyQuest, Achievement, UserAchievement,
    UserGems, UserHearts, UserLeague, WeeklyLeaderboard, Friendship
)
from .serializers import (
    UserProgressSerializer,
    PhonemeProgressSerializer,
    StreakSerializer,
    UserXPSerializer,
    DailyQuestSerializer,
    AchievementSerializer,
    UserAchievementSerializer,
    UserGemsSerializer,
    UserHeartsSerializer,
    UserLeagueSerializer,
    WeeklyLeaderboardSerializer,
    FriendshipSerializer,
    GamificationDashboardSerializer,
)
from .services import AnalyticsService, AggregationService

logger = logging.getLogger(__name__)


class ProgressDashboardView(APIView):
    """
    GET /api/v1/analytics/progress/
    
    Get comprehensive progress dashboard data.
    """
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        days = int(request.query_params.get('days', 30))
        
        # Use aggregation service for all calculations
        service = AggregationService(request.user)
        stats = service.get_dashboard_stats(days=days)
        
        response_data = {
            'total_sessions': stats['session_stats'].get('total_sessions', 0),
            'total_attempts': stats['attempt_stats'].get('total_attempts', 0),
            'total_practice_minutes': stats['total_practice_minutes'],
            'overall_average_score': round(stats['attempt_stats'].get('avg_score', 0) or 0, 2),
            'current_weak_phonemes': stats['weak_phonemes'],
            'current_strong_phonemes': stats['strong_phonemes'],
            'score_trend': stats['score_trend'],
            'recent_progress': UserProgressSerializer(stats['recent_progress'], many=True).data,
            'streak': StreakSerializer(stats['streak']).data,

            'phoneme_progress': PhonemeProgressSerializer(stats['phoneme_progress'], many=True).data,
            'weekly_scores': stats['weekly_scores'],
            'weekly_labels': stats['weekly_labels'],
            'daily_goal_progress': stats.get('daily_goal_progress', 0),
        }
        
        return Response(response_data)


class PhonemeAnalyticsView(APIView):
    """
    GET /api/v1/analytics/phonemes/
    
    Get detailed per-phoneme analytics.
    """
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        service = AggregationService(request.user)
        return Response(service.get_phoneme_analytics())


class HistoryView(generics.ListAPIView):
    """
    GET /api/v1/analytics/history/
    
    Get daily progress history.
    """
    
    serializer_class = UserProgressSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        from datetime import timedelta
        from django.utils import timezone
        
        days = int(self.request.query_params.get('days', 30))
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=days)
        
        return UserProgress.objects.filter(
            user=self.request.user,
            date__gte=start_date,
            date__lte=end_date
        ).order_by('-date')


class WeakPhonemesView(APIView):
    """
    GET /api/v1/analytics/weak-phonemes/
    
    Get list of user's current weak phonemes.
    """
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        from django.conf import settings
        threshold = settings.SCORING_CONFIG.get('WEAK_PHONEME_THRESHOLD', 0.7)
        
        service = AggregationService(request.user)
        weak_phonemes = service.get_weak_phonemes()
        
        return Response({
            'weak_phonemes': weak_phonemes,
            'threshold': threshold,
            'count': len(weak_phonemes),
        })


# Convenience function for backward compatibility
def update_user_analytics(user, attempt):
    """
    Update analytics after a new attempt.
    Called from assessment service.
    
    This is a wrapper for AnalyticsService.update_after_attempt()
    maintained for backward compatibility.
    """
    service = AnalyticsService()
    service.update_after_attempt(user, attempt)


class GamificationDashboardView(APIView):
    """
    GET /api/v1/gamification/dashboard/
    
    Get complete gamification dashboard data.
    """
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user = request.user
        
        xp, _ = UserXP.objects.get_or_create(user=user)
        gems, _ = UserGems.objects.get_or_create(user=user)
        hearts, _ = UserHearts.objects.get_or_create(user=user)
        
        from .models import StreakRecord
        streak, _ = StreakRecord.objects.get_or_create(user=user)
        
        try:
            league = UserLeague.objects.get(user=user)
            league_data = UserLeagueSerializer(league).data
        except UserLeague.DoesNotExist:
            league_data = None
        
        today = timezone.now().date()
        daily_quests = DailyQuest.objects.filter(user=user, date=today)
        
        recent_achievements = UserAchievement.objects.filter(user=user).order_by('-unlocked_at')[:5]
        
        if league_data:
            leaderboard = WeeklyLeaderboard.objects.filter(
                league=league.current_league,
                week_start__lte=today,
                week_end__gte=today
            ).order_by('-weekly_xp')[:20]
        else:
            leaderboard = []
        
        data = {
            'xp': UserXPSerializer(xp).data,
            'streak': StreakSerializer(streak).data,
            'gems': UserGemsSerializer(gems).data,
            'hearts': UserHeartsSerializer(hearts).data,
            'league': league_data,
            'daily_quests': DailyQuestSerializer(daily_quests, many=True).data,
            'recent_achievements': UserAchievementSerializer(recent_achievements, many=True).data,
            'leaderboard': WeeklyLeaderboardSerializer(leaderboard, many=True).data,
        }
        
        return Response(data)


class UserXPView(APIView):
    """
    GET /api/v1/gamification/xp/
    POST /api/v1/gamification/xp/set-goal/
    
    Get user XP or update daily goal.
    """
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        xp, _ = UserXP.objects.get_or_create(user=request.user)
        return Response(UserXPSerializer(xp).data)
    
    def post(self, request):
        xp, _ = UserXP.objects.get_or_create(user=request.user)
        new_goal = request.data.get('daily_xp_goal')
        
        if new_goal not in [10, 20, 30, 50]:
            return Response(
                {'error': 'Invalid goal. Must be 10, 20, 30, or 50'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        xp.daily_xp_goal = new_goal
        xp.save()
        
        return Response(UserXPSerializer(xp).data)


class DailyQuestsView(APIView):
    """
    GET /api/v1/gamification/quests/
    
    Get today's daily quests.
    """
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        today = timezone.now().date()
        quests = DailyQuest.objects.filter(user=request.user, date=today)
        
        if not quests.exists():
            from .services import GamificationService
            service = GamificationService()
            quests = service.generate_daily_quests(request.user)
        
        return Response(DailyQuestSerializer(quests, many=True).data)


class AchievementsView(APIView):
    """
    GET /api/v1/gamification/achievements/
    
    Get all achievements and user unlock status.
    """
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        achievements = Achievement.objects.filter(is_active=True)
        unlocked = UserAchievement.objects.filter(user=request.user).values_list('achievement_id', flat=True)
        
        data = []
        for achievement in achievements:
            achievement_data = AchievementSerializer(achievement).data
            achievement_data['is_unlocked'] = achievement.id in unlocked
            data.append(achievement_data)
        
        return Response(data)


class UserAchievementsView(APIView):
    """
    GET /api/v1/gamification/achievements/unlocked/
    
    Get user's unlocked achievements.
    """
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        unlocked = UserAchievement.objects.filter(user=request.user).order_by('-unlocked_at')
        return Response(UserAchievementSerializer(unlocked, many=True).data)


class GemsView(APIView):
    """
    GET /api/v1/gamification/gems/
    
    Get user gems balance.
    """
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        gems, _ = UserGems.objects.get_or_create(user=request.user)
        return Response(UserGemsSerializer(gems).data)


class HeartsView(APIView):
    """
    GET /api/v1/gamification/hearts/
    POST /api/v1/gamification/hearts/refill/
    
    Get hearts or refill with gems.
    """
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        hearts, _ = UserHearts.objects.get_or_create(user=request.user)
        return Response(UserHeartsSerializer(hearts).data)
    
    def post(self, request):
        hearts, _ = UserHearts.objects.get_or_create(user=request.user)
        gems, _ = UserGems.objects.get_or_create(user=request.user)
        
        refill_cost = 10
        
        if hearts.current_hearts >= UserHearts.MAX_HEARTS:
            return Response(
                {'error': 'Hearts already full'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if gems.available_gems < refill_cost:
            return Response(
                {'error': 'Not enough gems'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        gems.spend_gems(refill_cost, 'Heart refill')
        hearts.refill_all_hearts()
        
        return Response({
            'hearts': UserHeartsSerializer(hearts).data,
            'gems': UserGemsSerializer(gems).data,
        })


class LeaderboardView(APIView):
    """
    GET /api/v1/gamification/leaderboard/
    
    Get current week's leaderboard.
    """
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            user_league = UserLeague.objects.get(user=request.user)
        except UserLeague.DoesNotExist:
            return Response({'error': 'User not in a league'}, status=status.HTTP_404_NOT_FOUND)
        
        today = timezone.now().date()
        leaderboard = WeeklyLeaderboard.objects.filter(
            league=user_league.current_league,
            week_start__lte=today,
            week_end__gte=today
        ).order_by('-weekly_xp')[:50]
        
        user_entry = leaderboard.filter(user=request.user).first()
        
        return Response({
            'leaderboard': WeeklyLeaderboardSerializer(leaderboard, many=True).data,
            'user_rank': user_entry.rank if user_entry else None,
            'league': UserLeagueSerializer(user_league).data,
        })


class FriendsLeaderboardView(APIView):
    """
    GET /api/v1/gamification/leaderboard/friends/
    
    Get friends-only leaderboard.
    """
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        friends = Friendship.get_friends(request.user)
        friend_ids = list(friends.values_list('id', flat=True))
        friend_ids.append(request.user.id)
        
        today = timezone.now().date()
        leaderboard = WeeklyLeaderboard.objects.filter(
            user_id__in=friend_ids,
            week_start__lte=today,
            week_end__gte=today
        ).order_by('-weekly_xp')
        
        return Response(WeeklyLeaderboardSerializer(leaderboard, many=True).data)


class FriendshipView(APIView):
    """
    GET /api/v1/gamification/friends/
    POST /api/v1/gamification/friends/request/
    POST /api/v1/gamification/friends/accept/<int:friendship_id>/
    POST /api/v1/gamification/friends/reject/<int:friendship_id>/
    DELETE /api/v1/gamification/friends/<int:friendship_id>/
    
    Manage friendships.
    """
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        friends = Friendship.get_friends(request.user)
        pending_received = Friendship.objects.filter(to_user=request.user, status='pending')
        pending_sent = Friendship.objects.filter(from_user=request.user, status='pending')
        
        return Response({
            'friends': [{'id': f.id, 'email': f.email, 'full_name': f.full_name, 'avatar_id': f.avatar_id} for f in friends],
            'pending_received': FriendshipSerializer(pending_received, many=True).data,
            'pending_sent': FriendshipSerializer(pending_sent, many=True).data,
        })
    
    def post(self, request):
        to_user_email = request.data.get('to_user_email')
        
        if not to_user_email:
            return Response({'error': 'to_user_email required'}, status=status.HTTP_400_BAD_REQUEST)
        
        from apps.accounts.models import User
        try:
            to_user = User.objects.get(email=to_user_email)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
        
        if to_user == request.user:
            return Response({'error': 'Cannot add yourself'}, status=status.HTTP_400_BAD_REQUEST)
        
        if Friendship.are_friends(request.user, to_user):
            return Response({'error': 'Already friends'}, status=status.HTTP_400_BAD_REQUEST)
        
        existing = Friendship.objects.filter(from_user=request.user, to_user=to_user).first()
        if existing:
            return Response({'error': 'Request already sent'}, status=status.HTTP_400_BAD_REQUEST)
        
        friendship = Friendship.objects.create(from_user=request.user, to_user=to_user)
        return Response(FriendshipSerializer(friendship).data, status=status.HTTP_201_CREATED)


class FriendshipActionView(APIView):
    """
    POST /api/v1/gamification/friends/<int:friendship_id>/accept/
    POST /api/v1/gamification/friends/<int:friendship_id>/reject/
    DELETE /api/v1/gamification/friends/<int:friendship_id>/
    """
    
    permission_classes = [IsAuthenticated]
    
    def post(self, request, friendship_id, action):
        try:
            friendship = Friendship.objects.get(id=friendship_id, to_user=request.user)
        except Friendship.DoesNotExist:
            return Response({'error': 'Friendship request not found'}, status=status.HTTP_404_NOT_FOUND)
        
        if action == 'accept':
            friendship.status = 'accepted'
            friendship.save()
            return Response(FriendshipSerializer(friendship).data)
        elif action == 'reject':
            friendship.status = 'rejected'
            friendship.save()
            return Response(FriendshipSerializer(friendship).data)
        
        return Response({'error': 'Invalid action'}, status=status.HTTP_400_BAD_REQUEST)
    
    def delete(self, request, friendship_id):
        from django.db import models as django_models
        friendship = Friendship.objects.filter(
            id=friendship_id
        ).filter(
            django_models.Q(from_user=request.user) | django_models.Q(to_user=request.user)
        ).first()
        
        if not friendship:
            return Response({'error': 'Friendship not found'}, status=status.HTTP_404_NOT_FOUND)
        
        friendship.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class StreakFreezeView(APIView):
    """
    POST /api/v1/gamification/streak/freeze/
    
    Use a streak freeze.
    """
    
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        from .models import StreakRecord
        streak, _ = StreakRecord.objects.get_or_create(user=request.user)
        
        if streak.streak_freezes_available <= 0:
            return Response(
                {'error': 'No streak freezes available'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        today = timezone.now().date()
        if streak.streak_freeze_used_at == today:
            return Response(
                {'error': 'Streak freeze already used today'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        streak.streak_freezes_available -= 1
        streak.streak_freeze_used_at = today
        streak.save()
        
        return Response(StreakSerializer(streak).data)
