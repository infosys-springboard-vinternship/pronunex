"""
Middleware for tracking user activity.

Updates `last_active` on authenticated requests, throttled to once per 60 seconds
to avoid unnecessary DB writes on rapid consecutive requests.
"""

from django.utils import timezone
from django.core.cache import cache


class UserActivityMiddleware:
    """
    Updates User.last_active on each authenticated request.
    
    Uses cache-based throttling: only writes to DB once per 60 seconds per user.
    This provides accurate "active today" and "online now" stats without DB overhead.
    """
    
    THROTTLE_SECONDS = 60
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        response = self.get_response(request)
        
        user = getattr(request, 'user', None)
        if user and user.is_authenticated:
            cache_key = f'user_activity_{user.pk}'
            if not cache.get(cache_key):
                from .models import User
                User.objects.filter(pk=user.pk).update(last_active=timezone.now())
                cache.set(cache_key, True, self.THROTTLE_SECONDS)
        
        return response
