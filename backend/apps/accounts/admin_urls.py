"""
URL patterns for admin API endpoints.

All views require IsAdminUser (is_staff=True) permission.
"""

from django.urls import path
from .admin_views import AdminStatsView, AdminUserListView, AdminUserDetailView

urlpatterns = [
    path('stats/', AdminStatsView.as_view(), name='admin_stats'),
    path('users/', AdminUserListView.as_view(), name='admin_users'),
    path('users/<int:pk>/', AdminUserDetailView.as_view(), name='admin_user_detail'),
]
