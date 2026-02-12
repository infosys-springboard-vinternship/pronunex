"""
Centralized system logging utility for Pronunex.

Provides helper functions to create SystemLog entries
from any part of the application.
"""

import logging

logger = logging.getLogger(__name__)


def get_client_ip(request):
    """Extract client IP from request, handling reverse proxies."""
    x_forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded:
        return x_forwarded.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')


def log_system_event(log_type, message, severity='error', details=None, user=None, ip_address=None):
    """
    Create a SystemLog entry.
    
    Args:
        log_type: One of SystemLog.LOG_TYPES choices
        message: Human-readable message
        severity: info, warning, error, critical
        details: Optional JSON-serializable dict with extra context
        user: Optional User instance
        ip_address: Optional client IP string
    """
    from apps.analytics.models import SystemLog
    
    try:
        SystemLog.objects.create(
            type=log_type,
            severity=severity,
            message=message,
            details=details,
            user=user,
            ip_address=ip_address
        )
    except Exception as e:
        # Fallback to standard logging if DB write fails
        logger.error(f"Failed to write SystemLog: {e}")
        logger.error(f"Original event: [{log_type}] {message}")


def log_security_event(message, details=None, user=None, request=None):
    """
    Log a security-related event (suspicious activity, access violations, etc.)
    
    Args:
        message: Description of the security event
        details: Extra context
        user: User instance (if available)
        request: HTTP request (to extract IP)
    """
    ip = get_client_ip(request) if request else None
    log_system_event(
        log_type='security',
        message=message,
        severity='warning',
        details=details,
        user=user,
        ip_address=ip
    )


def log_admin_action(action, admin_user, details=None, request=None):
    """
    Log an admin action for audit trail.
    
    Args:
        action: Description of the admin action
        admin_user: Admin User instance
        details: Extra context
        request: HTTP request
    """
    ip = get_client_ip(request) if request else None
    log_system_event(
        log_type='admin_action',
        message=action,
        severity='info',
        details=details,
        user=admin_user,
        ip_address=ip
    )
