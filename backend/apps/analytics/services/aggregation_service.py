"""
Aggregation Service for Pronunex Analytics.

OPTIMIZED — No Redis. Pure DB-level improvements + LocMemCache.
Changes:
- Weak/strong phonemes use DB-level filtering (no Python-side iteration)
- phoneme_progress eagerly loads via select_related (no N+1)
- recent_progress evaluated once via list() and reused in-memory
- _compute_practice_minutes uses annotate() instead of per-session loop
- _compute_user_level preserves composite score formula from original
"""

import logging
from datetime import timedelta
from django.utils import timezone
from django.db.models import Avg, Count, Max, Min, Sum
from django.conf import settings

from apps.analytics.models import UserProgress, PhonemeProgress, StreakRecord
from apps.practice.models import Attempt, UserSession, PhonemeError

logger = logging.getLogger(__name__)


class AggregationService:
    """
    Service class for analytics aggregation and calculations.

    Responsibilities:
    - Calculate dashboard statistics
    - Determine score trends
    - Identify weak/strong phonemes
    """

    def __init__(self, user):
        self.user = user
        self.threshold = settings.SCORING_CONFIG.get('WEAK_PHONEME_THRESHOLD', 0.7)

    def get_dashboard_stats(self, days=30):
        """
        Get comprehensive dashboard statistics.

        Optimized: 6 focused DB queries instead of 9+ with N+1 loops.
        """
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=days)

        # 1. Session stats — single DB call
        session_stats = UserSession.objects.filter(
            user=self.user
        ).aggregate(
            total_sessions=Count('id'),
        )

        # 2. Attempt stats — single DB call
        attempt_stats = Attempt.objects.filter(
            session__user=self.user
        ).aggregate(
            total_attempts=Count('id'),
            avg_score=Avg('score'),
            best_score=Max('score'),
        )

        # 3. Recent daily progress — evaluate once, reuse everywhere
        recent_progress = list(
            UserProgress.objects.filter(
                user=self.user,
                date__gte=start_date,
                date__lte=end_date,
            ).order_by('-date')[:days]
        )

        # 4. Phoneme progress — select_related prevents N+1
        phoneme_progress = list(
            PhonemeProgress.objects.filter(
                user=self.user
            ).select_related('phoneme').order_by('-current_score')
        )

        # 5. Weak/strong — DB-level filter, fetch only arpabet string
        weak_phonemes = list(
            PhonemeProgress.objects.filter(
                user=self.user,
                current_score__lt=self.threshold,
            ).select_related('phoneme').values_list('phoneme__arpabet', flat=True)[:10]
        )

        strong_phonemes = list(
            PhonemeProgress.objects.filter(
                user=self.user,
                current_score__gte=0.85,
            ).select_related('phoneme').values_list('phoneme__arpabet', flat=True)[:10]
        )

        # 6. Score trend — uses already-fetched recent_progress (no extra query)
        score_trend = self._calculate_score_trend(recent_progress)

        # 7. Streak — get_or_create = 1 query
        streak, _ = StreakRecord.objects.get_or_create(user=self.user)

        # 8. Weekly scores — built from already-fetched recent_progress dict
        progress_map = {p.date: p for p in recent_progress}
        weekly_scores = []
        weekly_labels = []

        for i in range(6, -1, -1):
            day = end_date - timedelta(days=i)
            day_progress = progress_map.get(day)

            score = 0
            if day_progress and day_progress.average_score:
                score = round(day_progress.average_score * 100, 1)

            weekly_scores.append(score)
            weekly_labels.append(day.strftime("%a"))

        # 9. Practice minutes — uses stored daily values or annotate-based fallback
        stored_minutes = sum(p.total_practice_minutes for p in recent_progress)

        if stored_minutes < 1.0:
            total_minutes = self._compute_practice_minutes(start_date, end_date)
        else:
            total_minutes = stored_minutes

        # 10. Daily goal — single COUNT query
        today = timezone.now().date()
        today_progress = progress_map.get(today)
        sentences_today = today_progress.attempts_count if today_progress else 0
        daily_goal_sentences = getattr(self.user, 'daily_goal_target', 10) or 10
        daily_goal_progress = min(int((sentences_today / daily_goal_sentences) * 100), 100)

        # 11. Computed level — reuses attempt_stats already in memory
        computed_level = self._compute_user_level(
            attempt_stats, weak_phonemes, strong_phonemes, phoneme_progress
        )

        return {
            'session_stats': session_stats,
            'attempt_stats': attempt_stats,
            'recent_progress': recent_progress,
            'phoneme_progress': phoneme_progress,
            'weak_phonemes': weak_phonemes,
            'strong_phonemes': strong_phonemes,
            'score_trend': score_trend,
            'streak': streak,
            'weekly_scores': weekly_scores,
            'weekly_labels': weekly_labels,
            'total_practice_minutes': round(total_minutes, 1),
            'daily_goal_progress': daily_goal_progress,
            'daily_goal_target': daily_goal_sentences,
            'computed_level': computed_level,
        }

    def _compute_user_level(self, attempt_stats, weak_phonemes, strong_phonemes, phoneme_progress):
        """
        Compute the user's proficiency level from practice performance.

        Uses a composite score:
        - 40% average pronunciation score
        - 30% practice volume (capped at 100 attempts)
        - 30% phoneme mastery ratio (strong / total practiced)

        Thresholds:
        - 0–39  → beginner
        - 40–69 → intermediate
        - 70+   → advanced
        """
        total_attempts = attempt_stats.get('total_attempts', 0) or 0
        avg_score = attempt_stats.get('avg_score', 0) or 0

        score_component = avg_score * 100 * 0.4
        volume_component = min(total_attempts / 100, 1.0) * 100 * 0.3

        total_practiced = len(phoneme_progress) if phoneme_progress else 0
        strong_count = len(strong_phonemes) if strong_phonemes else 0
        mastery_ratio = (strong_count / max(total_practiced, 1))
        mastery_component = mastery_ratio * 100 * 0.3

        composite = round(score_component + volume_component + mastery_component, 1)

        if composite >= 70:
            level = 'advanced'
        elif composite >= 40:
            level = 'intermediate'
        else:
            level = 'beginner'

        return {
            'level': level,
            'composite_score': composite,
        }

    def _compute_practice_minutes(self, start_date, end_date):
        """
        Compute total practice minutes from session timestamps.

        OPTIMIZED: Uses annotate() for a single SQL round-trip
        instead of N+1 per-session loop.
        """
        sessions = UserSession.objects.filter(
            user=self.user,
            started_at__date__gte=start_date,
            started_at__date__lte=end_date,
        ).annotate(
            first_attempt_at=Min('attempts__created_at'),
            last_attempt_at=Max('attempts__created_at'),
            attempt_count=Count('attempts'),
        )

        total = 0.0
        for session in sessions:
            # Prefer ended_at - started_at when session was explicitly ended
            if session.ended_at and session.started_at:
                delta = (session.ended_at - session.started_at).total_seconds() / 60
                if 0 < delta < 180:
                    total += delta
                    continue

            # Fallback: use annotated attempt timestamps + 15s buffer per attempt
            if session.first_attempt_at and session.last_attempt_at:
                span = (session.last_attempt_at - session.first_attempt_at).total_seconds() / 60
                buffer = (session.attempt_count * 15) / 60
                total += span + buffer

        return round(total, 1)

    def _calculate_score_trend(self, recent_progress):
        """
        Calculate score trend based on recent progress.

        Returns:
            str: 'improving', 'declining', 'stable', or 'insufficient_data'
        """
        if len(recent_progress) < 3:
            return 'insufficient_data'

        recent_scores = [
            rp.average_score for rp in recent_progress[:3]
            if rp.average_score
        ]
        older_scores = [
            rp.average_score for rp in recent_progress[3:6]
            if rp.average_score
        ]

        if not recent_scores or not older_scores:
            return 'insufficient_data'

        recent_avg = sum(recent_scores) / len(recent_scores)
        older_avg = sum(older_scores) / len(older_scores)

        if recent_avg > older_avg + 0.05:
            return 'improving'
        elif recent_avg < older_avg - 0.05:
            return 'declining'
        else:
            return 'stable'

    def get_weak_phonemes(self):
        """Get list of user's current weak phonemes."""
        phoneme_progress = PhonemeProgress.objects.filter(
            user=self.user,
            current_score__lt=self.threshold
        ).select_related('phoneme').order_by('current_score')

        return [
            {
                'phoneme': pp.phoneme.arpabet,
                'symbol': pp.phoneme.symbol,
                'score': round(pp.current_score, 2),
                'attempts': pp.attempts_count,
            }
            for pp in phoneme_progress
        ]

    def get_phoneme_analytics(self):
        """
        Get detailed per-phoneme analytics grouped by type.

        OPTIMIZED: Uses len() on already-iterated list instead of
        issuing a second .count() query.
        """
        phoneme_progress_list = list(
            PhonemeProgress.objects.filter(
                user=self.user
            ).select_related('phoneme').order_by('phoneme__type', 'phoneme__arpabet')
        )

        # Group by phoneme type
        by_type = {}
        for pp in phoneme_progress_list:
            ptype = pp.phoneme.type
            if ptype not in by_type:
                by_type[ptype] = []
            by_type[ptype].append({
                'phoneme': pp.phoneme.arpabet,
                'symbol': pp.phoneme.symbol,
                'current_score': pp.current_score,
                'attempts': pp.attempts_count,
                'best_score': pp.best_score,
            })

        # Get weak phoneme details with error contexts (batch query to avoid N+1)
        weak_phoneme_ids = [
            pp.phoneme_id for pp in phoneme_progress_list
            if pp.current_score < self.threshold
        ]

        # Single batch query for all weak phoneme errors
        all_errors = PhonemeError.objects.filter(
            attempt__session__user=self.user,
            target_phoneme_id__in=weak_phoneme_ids
        ).values(
            'target_phoneme_id', 'word_context', 'position_in_word'
        ).annotate(
            count=Count('id'),
            avg_score=Avg('similarity_score')
        ).order_by('target_phoneme_id', '-count')

        # Group errors by phoneme_id
        errors_by_phoneme = {}
        for err in all_errors:
            pid = err['target_phoneme_id']
            if pid not in errors_by_phoneme:
                errors_by_phoneme[pid] = []
            if len(errors_by_phoneme[pid]) < 5:
                errors_by_phoneme[pid].append(err)

        weak_details = []
        for pp in phoneme_progress_list:
            if pp.current_score < self.threshold:
                weak_details.append({
                    'phoneme': pp.phoneme.arpabet,
                    'symbol': pp.phoneme.symbol,
                    'current_score': pp.current_score,
                    'attempts': pp.attempts_count,
                    'common_errors': errors_by_phoneme.get(pp.phoneme_id, []),
                })

        return {
            'by_type': by_type,
            'weak_phonemes_detail': weak_details,
            'total_phonemes_practiced': len(phoneme_progress_list),
        }
