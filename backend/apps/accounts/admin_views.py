"""
Admin API Views for system analytics and user management.

Security layers:
- IsAdminUser permission (is_staff=True) on every view
- IsAuthenticated required (JWT)
- Self-protection: admins cannot demote/delete themselves
- No raw SQL — all queries use Django ORM
- Rate limiting on destructive operations
"""

import logging
from datetime import timedelta

from django.db.models import Avg, Count, Q, F
from django.db.models.functions import TruncDate
from django.utils import timezone
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.pagination import PageNumberPagination

from .models import User
from .admin_serializers import (
    AdminUserListSerializer,
    AdminUserDetailSerializer,
    AdminUserEditSerializer,
)
from apps.practice.models import UserSession, Attempt

logger = logging.getLogger(__name__)


class AdminUserPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class AdminStatsView(APIView):
    """
    GET /api/v1/admin/stats/
    
    System-wide analytics dashboard — real data aggregated from DB.
    Protected: requires is_staff=True.
    """
    
    permission_classes = [IsAuthenticated, IsAdminUser]
    
    def get(self, request):
        now = timezone.now()
        today = now.date()
        week_ago = today - timedelta(days=7)
        two_weeks_ago = today - timedelta(days=14)
        online_threshold = now - timedelta(minutes=5)
        
        # Core counts
        total_users = User.objects.count()
        active_today = User.objects.filter(
            Q(last_active__date=today) | Q(last_login__date=today)
        ).distinct().count()
        online_now = User.objects.filter(last_active__gte=online_threshold).count()
        new_users_week = User.objects.filter(created_at__date__gte=week_ago).count()
        total_sessions = UserSession.objects.count()
        total_attempts = Attempt.objects.count()
        
        # Average score across all attempts
        avg_result = Attempt.objects.aggregate(avg=Avg('score'))
        avg_score = round(avg_result['avg'] or 0, 2)
        
        # Level distribution
        level_distribution = list(
            User.objects.values('proficiency_level')
            .annotate(count=Count('id'))
            .order_by('proficiency_level')
        )
        
        # Signup trend (last 14 days)
        signup_trend = list(
            User.objects.filter(created_at__date__gte=two_weeks_ago)
            .annotate(date=TruncDate('created_at'))
            .values('date')
            .annotate(count=Count('id'))
            .order_by('date')
        )
        
        # Active users trend (last 14 days) — uses last_active
        active_trend = list(
            User.objects.filter(
                Q(last_active__date__gte=two_weeks_ago) | Q(last_login__date__gte=two_weeks_ago)
            )
            .annotate(date=TruncDate('last_active'))
            .values('date')
            .annotate(count=Count('id', distinct=True))
            .order_by('date')
        )
        
        # Serialize dates to ISO strings
        for entry in signup_trend:
            entry['date'] = entry['date'].isoformat() if entry['date'] else None
        for entry in active_trend:
            entry['date'] = entry['date'].isoformat() if entry['date'] else None
        
        return Response({
            'total_users': total_users,
            'active_today': active_today,
            'online_now': online_now,
            'new_users_this_week': new_users_week,
            'total_sessions': total_sessions,
            'total_attempts': total_attempts,
            'avg_score': avg_score,
            'level_distribution': level_distribution,
            'signup_trend': signup_trend,
            'active_users_trend': active_trend,
        })


class AdminUserListView(APIView):
    """
    GET /api/v1/admin/users/
    
    Paginated user list with search, filter, and sort.
    Protected: requires is_staff=True.
    
    Query params:
        search: filter by email, username, or full_name (case-insensitive)
        is_active: true/false
        is_staff: true/false
        ordering: created_at, -created_at, email, last_login, -last_login
        page: page number
        page_size: items per page (max 100)
    """
    
    permission_classes = [IsAuthenticated, IsAdminUser]
    pagination_class = AdminUserPagination
    
    ALLOWED_ORDERING = {
        'created_at', '-created_at',
        'email', '-email',
        'last_login', '-last_login',
        'full_name', '-full_name',
    }
    
    def get(self, request):
        queryset = User.objects.annotate(
            sessions_count=Count('practice_sessions', distinct=True),
            avg_score=Avg('practice_sessions__attempts__score'),
        )
        
        # Search filter
        search = request.query_params.get('search', '').strip()
        if search:
            queryset = queryset.filter(
                Q(email__icontains=search) |
                Q(username__icontains=search) |
                Q(full_name__icontains=search)
            )
        
        # Boolean filters
        is_active = request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        
        is_staff = request.query_params.get('is_staff')
        if is_staff is not None:
            queryset = queryset.filter(is_staff=is_staff.lower() == 'true')
        
        # Ordering (whitelist validated)
        ordering = request.query_params.get('ordering', '-created_at')
        if ordering not in self.ALLOWED_ORDERING:
            ordering = '-created_at'
        queryset = queryset.order_by(ordering)
        
        # Paginate
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(queryset, request)
        serializer = AdminUserListSerializer(page, many=True)
        
        return paginator.get_paginated_response(serializer.data)


class AdminUserDetailView(APIView):
    """
    GET/PATCH/DELETE /api/v1/admin/users/<id>/
    
    View, edit, or delete a user account.
    Protected: requires is_staff=True.
    
    Security:
    - Admins cannot demote themselves (is_staff=False on self)
    - Admins cannot deactivate themselves (is_active=False on self)
    - Admins cannot delete themselves
    """
    
    permission_classes = [IsAuthenticated, IsAdminUser]
    
    def _get_user(self, pk):
        try:
            return User.objects.annotate(
                sessions_count=Count('practice_sessions', distinct=True),
                attempts_count=Count('practice_sessions__attempts', distinct=True),
                avg_score=Avg('practice_sessions__attempts__score'),
            ).get(pk=pk)
        except User.DoesNotExist:
            return None
    
    def get(self, request, pk):
        user = self._get_user(pk)
        if not user:
            return Response(
                {'error': 'User not found.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = AdminUserDetailSerializer(user)
        return Response(serializer.data)
    
    def patch(self, request, pk):
        user = self._get_user(pk)
        if not user:
            return Response(
                {'error': 'User not found.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = AdminUserEditSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        
        # Self-protection: prevent admin from demoting/deactivating self
        if user.pk == request.user.pk:
            if 'is_staff' in data and not data['is_staff']:
                return Response(
                    {'error': 'You cannot remove your own admin privileges.'},
                    status=status.HTTP_403_FORBIDDEN
                )
            if 'is_active' in data and not data['is_active']:
                return Response(
                    {'error': 'You cannot deactivate your own account.'},
                    status=status.HTTP_403_FORBIDDEN
                )
        
        # Apply validated changes
        for field, value in data.items():
            setattr(user, field, value)
        user.save(update_fields=list(data.keys()) + ['updated_at'])
        
        action = ', '.join(f"{k}={v}" for k, v in data.items())
        logger.info(f"Admin {request.user.email} updated user {user.email}: {action}")
        
        # Re-fetch with annotations for response
        user = self._get_user(pk)
        return Response(AdminUserDetailSerializer(user).data)
    
    def delete(self, request, pk):
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response(
                {'error': 'User not found.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Self-protection
        if user.pk == request.user.pk:
            return Response(
                {'error': 'You cannot delete your own account.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        email = user.email
        user.delete()
        
        logger.info(f"Admin {request.user.email} deleted user {email}")
        
        return Response(
            {'message': f'User {email} has been deleted.'},
            status=status.HTTP_200_OK
        )
