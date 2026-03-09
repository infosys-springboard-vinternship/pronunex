"""
Signal handlers for practice app.

Automatically end sessions after a period of inactivity.
Invalidate dashboard cache on new attempts.
"""

import logging
from datetime import timedelta
from django.core.cache import cache
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone

from .models import Attempt, UserSession

logger = logging.getLogger(__name__)


@receiver(post_save, sender=Attempt)
def invalidate_dashboard_cache(sender, instance, created, **kwargs):
    """Delete cached dashboard when a new attempt is submitted."""
    if not created:
        return
    user_id = instance.session.user_id
    for days in (7, 30, 90):
        cache.delete(f"dashboard:{user_id}:{days}")
    cache.delete(f"phoneme_analytics:{user_id}")


@receiver(post_save, sender=Attempt)
def auto_end_session_on_attempt(sender, instance, created, **kwargs):
    """
    Automatically end a session if it's been created more than 30 minutes ago
    and no attempts have been made in the last 15 minutes.
    
    This ensures sessions are closed even if the user doesn't explicitly end them.
    """
    if not created:
        return  # Only process new attempts
    
    session = instance.session
    
    # Don't auto-close if session is already ended
    if session.ended_at:
        return
    
    # Auto-close sessions that are more than 30 minutes old with no recent activity
    now = timezone.now()
    session_age = now - session.started_at
    
    # Check if last attempt is more than 15 minutes old
    last_attempt = Attempt.objects.filter(
        session=session
    ).order_by('-created_at').first()
    
    if last_attempt:
        time_since_last = now - last_attempt.created_at
        
        # Auto-close if session is older than 30 min and no activity in 15 min
        if session_age > timedelta(minutes=30) and time_since_last > timedelta(minutes=15):
            session.ended_at = now
            session.calculate_overall_score()
            session.save()
            logger.info(f"Auto-closed session {session.id} due to inactivity")
