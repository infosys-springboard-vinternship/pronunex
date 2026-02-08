"""
Gamification Service for Pronunex.

Handles XP, gems, hearts, quests, achievements, and rewards logic.
"""

import logging
import random
from datetime import timedelta
from django.utils import timezone
from django.db import transaction

from apps.analytics.models import (
    UserXP, DailyQuest, Achievement, UserAchievement,
    UserGems, UserHearts, StreakRecord
)

logger = logging.getLogger(__name__)


class GamificationService:
    """
    Centralized service for all gamification logic.
    """
    
    XP_REWARDS = {
        'sentence_completed': 10,
        'perfect_score': 5,
        'streak_bonus': 15,
        'quest_completed': 0,
        'achievement_unlocked': 0,
    }
    
    GEM_REWARDS = {
        'sentence_completed': 5,
        'perfect_pronunciation': 10,
        'no_retry_bonus': 5,
        'daily_streak': 20,
    }
    
    def __init__(self):
        pass
    
    def award_xp(self, user, amount, reason=''):
        """
        Award XP to user and check for level ups and achievements.
        """
        xp, _ = UserXP.objects.get_or_create(user=user)
        level_up = xp.add_xp(amount, reason)
        
        if level_up:
            self._check_level_achievements(user, xp.current_level)
        
        return level_up, xp.current_level
    
    def award_gems(self, user, amount, reason=''):
        """Award gems to user."""
        gems, _ = UserGems.objects.get_or_create(user=user)
        gems.add_gems(amount, reason)
        return gems
    
    def process_practice_rewards(self, user, attempt):
        """
        Main reward processing after practice attempt.
        Awards XP, gems, updates quests, checks achievements.
        """
        rewards = {
            'xp_earned': 0,
            'gems_earned': 0,
            'level_up': False,
            'new_level': 1,
            'achievements_unlocked': [],
            'quests_completed': [],
        }
        
        score = attempt.score
        
        xp_amount = self.XP_REWARDS['sentence_completed']
        gems_amount = self.GEM_REWARDS['sentence_completed']
        
        if score >= 0.95:
            xp_amount += self.XP_REWARDS['perfect_score']
            gems_amount += self.GEM_REWARDS['perfect_pronunciation']
        
        streak = StreakRecord.objects.filter(user=user).first()
        if streak and streak.current_streak > 0:
            xp_amount += self.XP_REWARDS['streak_bonus']
        
        level_up, new_level = self.award_xp(user, xp_amount, 'Practice completed')
        self.award_gems(user, gems_amount, 'Practice completed')
        
        rewards['xp_earned'] = xp_amount
        rewards['gems_earned'] = gems_amount
        rewards['level_up'] = level_up
        rewards['new_level'] = new_level
        
        if score < 0.5:
            hearts, _ = UserHearts.objects.get_or_create(user=user)
            hearts.lose_heart()
        
        self._update_quests_for_practice(user, attempt, rewards)
        self._check_practice_achievements(user, rewards)
        
        return rewards
    
    def _update_quests_for_practice(self, user, attempt, rewards):
        """Update quest progress for practice."""
        today = timezone.now().date()
        quests = DailyQuest.objects.filter(
            user=user,
            date=today,
            is_completed=False
        )
        
        for quest in quests:
            updated = False
            
            if quest.quest_type == 'practice_count':
                quest.current_progress += 1
                updated = True
            
            elif quest.quest_type == 'perfect_score' and attempt.score >= 0.95:
                quest.current_progress += 1
                updated = True
            
            elif quest.quest_type == 'phoneme_focus' and quest.target_phoneme:
                phoneme_errors = attempt.phoneme_errors.filter(
                    target_phoneme=quest.target_phoneme
                )
                if phoneme_errors.exists():
                    quest.current_progress += 1
                    updated = True
            
            if updated and quest.current_progress >= quest.target_value:
                quest.is_completed = True
                quest.completed_at = timezone.now()
                self.award_xp(user, quest.xp_reward, f'Quest: {quest.title}')
                self.award_gems(user, quest.gems_reward, f'Quest: {quest.title}')
                rewards['quests_completed'].append(quest.title)
            
            if updated:
                quest.save()
    
    def _check_practice_achievements(self, user, rewards):
        """Check and unlock practice-related achievements."""
        from apps.practice.models import Attempt
        
        total_attempts = Attempt.objects.filter(session__user=user).count()
        
        achievements_to_check = [
            ('first_steps', 'total_attempts', 1),
            ('practice_10', 'total_attempts', 10),
            ('practice_50', 'total_attempts', 50),
            ('practice_100', 'total_attempts', 100),
            ('practice_500', 'total_attempts', 500),
        ]
        
        for achievement_name, req_type, req_value in achievements_to_check:
            if req_type == 'total_attempts' and total_attempts >= req_value:
                self._unlock_achievement(user, achievement_name, rewards)
    
    def _check_level_achievements(self, user, level):
        """Check and unlock level-based achievements."""
        rewards = {'achievements_unlocked': []}
        
        level_achievements = [
            ('level_5', 5),
            ('level_10', 10),
            ('level_25', 25),
            ('level_50', 50),
        ]
        
        for achievement_name, required_level in level_achievements:
            if level >= required_level:
                self._unlock_achievement(user, achievement_name, rewards)
    
    def _unlock_achievement(self, user, achievement_identifier, rewards):
        """Unlock an achievement if not already unlocked."""
        try:
            achievement = Achievement.objects.get(
                name__icontains=achievement_identifier,
                is_active=True
            )
        except Achievement.DoesNotExist:
            return
        
        if UserAchievement.objects.filter(user=user, achievement=achievement).exists():
            return
        
        user_achievement = UserAchievement.objects.create(
            user=user,
            achievement=achievement,
            xp_awarded=achievement.xp_reward
        )
        
        self.award_xp(user, achievement.xp_reward, f'Achievement: {achievement.name}')
        rewards['achievements_unlocked'].append(achievement.name)
        
        logger.info(f"User {user.email} unlocked achievement: {achievement.name}")
    
    def update_streak(self, user):
        """Update user streak after practice."""
        streak, _ = StreakRecord.objects.get_or_create(user=user)
        today = timezone.now().date()
        
        if not streak.last_practice_date:
            streak.current_streak = 1
            streak.longest_streak = 1
            streak.last_practice_date = today
        elif streak.last_practice_date == today:
            return streak
        elif streak.last_practice_date == today - timedelta(days=1):
            streak.current_streak += 1
            if streak.current_streak > streak.longest_streak:
                streak.longest_streak = streak.current_streak
            streak.last_practice_date = today
        else:
            days_missed = (today - streak.last_practice_date).days
            if days_missed == 1 and streak.streak_freeze_used_at == today - timedelta(days=1):
                streak.current_streak += 1
            else:
                streak.current_streak = 1
            streak.last_practice_date = today
        
        if streak.practice_calendar is None:
            streak.practice_calendar = {}
        streak.practice_calendar[str(today)] = True
        
        streak.save()
        
        self._check_streak_achievements(user, streak.current_streak)
        
        return streak
    
    def _check_streak_achievements(self, user, streak_days):
        """Check and unlock streak-based achievements."""
        rewards = {'achievements_unlocked': []}
        
        streak_achievements = [
            ('streak_7', 7),
            ('streak_30', 30),
            ('streak_50', 50),
            ('streak_100', 100),
            ('streak_365', 365),
        ]
        
        for achievement_name, required_days in streak_achievements:
            if streak_days >= required_days:
                self._unlock_achievement(user, achievement_name, rewards)
    
    def generate_daily_quests(self, user):
        """Generate 3 random daily quests for user."""
        today = timezone.now().date()
        
        existing = DailyQuest.objects.filter(user=user, date=today)
        if existing.exists():
            return existing
        
        quest_templates = [
            {
                'quest_type': 'practice_count',
                'title': 'Daily Practice',
                'description': 'Complete 5 pronunciation exercises',
                'target_value': 5,
                'xp_reward': 20,
                'gems_reward': 10,
            },
            {
                'quest_type': 'perfect_score',
                'title': 'Perfect Performance',
                'description': 'Get 3 perfect scores (95%+)',
                'target_value': 3,
                'xp_reward': 30,
                'gems_reward': 15,
            },
            {
                'quest_type': 'streak_maintain',
                'title': 'Keep the Streak',
                'description': 'Practice today to maintain your streak',
                'target_value': 1,
                'xp_reward': 15,
                'gems_reward': 5,
            },
        ]
        
        from apps.analytics.models import PhonemeProgress
        weak_phonemes = PhonemeProgress.objects.filter(
            user=user,
            current_score__lt=0.7
        ).order_by('current_score')[:3]
        
        if weak_phonemes.exists():
            phoneme = weak_phonemes.first().phoneme
            quest_templates.append({
                'quest_type': 'phoneme_focus',
                'title': f'Master {phoneme.symbol}',
                'description': f'Practice the {phoneme.symbol} sound 5 times',
                'target_value': 5,
                'target_phoneme': phoneme,
                'xp_reward': 25,
                'gems_reward': 10,
            })
        
        selected_quests = random.sample(quest_templates, min(3, len(quest_templates)))
        
        quests = []
        for quest_data in selected_quests:
            quest = DailyQuest.objects.create(
                user=user,
                date=today,
                **quest_data
            )
            quests.append(quest)
        
        logger.info(f"Generated {len(quests)} daily quests for {user.email}")
        return quests
    
    def reset_daily_xp(self):
        """Reset daily XP for all users (run via cron)."""
        from django.utils import timezone
        today = timezone.now().date()
        
        UserXP.objects.filter(last_daily_reset__lt=today).update(
            daily_xp=0,
            last_daily_reset=today
        )
    
    def reset_weekly_xp(self):
        """Reset weekly XP for all users (run via cron)."""
        from django.utils import timezone
        today = timezone.now().date()
        
        UserXP.objects.filter(last_weekly_reset__lt=today - timedelta(days=7)).update(
            weekly_xp=0,
            last_weekly_reset=today
        )
