"""
Admin URL routes for Pronunex.

All routes are prefixed with /api/v1/admin/ via the main urls.py.
Every view requires IsAdminUser permission.
"""

from django.urls import path
from apps.accounts.admin_views import (
    AdminStatsView,
    AdminUsersView,
    AdminUserDetailView,
    AdminUserDisableView,
    AdminUserEnableView,
    AdminUserResetProgressView,
    AdminSentencesView,
    AdminSentenceDetailView,
    AdminSentenceGenerateView,
    AdminSentenceBulkImportView,
    AdminSentenceExportView,
    AdminAnalyticsView,
    AdminScoringView,
    AdminScoringHistoryView,
    AdminScoringRollbackView,
    AdminLogsView,
)

urlpatterns = [
    # Dashboard
    path('stats/', AdminStatsView.as_view(), name='admin-stats'),
    
    # Users
    path('users/', AdminUsersView.as_view(), name='admin-users'),
    path('users/<int:user_id>/', AdminUserDetailView.as_view(), name='admin-user-detail'),
    path('users/<int:user_id>/disable/', AdminUserDisableView.as_view(), name='admin-user-disable'),
    path('users/<int:user_id>/enable/', AdminUserEnableView.as_view(), name='admin-user-enable'),
    path('users/<int:user_id>/reset-progress/', AdminUserResetProgressView.as_view(), name='admin-user-reset'),
    
    # Sentences
    path('sentences/', AdminSentencesView.as_view(), name='admin-sentences'),
    path('sentences/<int:sentence_id>/', AdminSentenceDetailView.as_view(), name='admin-sentence-detail'),
    path('sentences/generate/', AdminSentenceGenerateView.as_view(), name='admin-sentence-generate'),
    path('sentences/bulk-import/', AdminSentenceBulkImportView.as_view(), name='admin-sentence-bulk-import'),
    path('sentences/export/', AdminSentenceExportView.as_view(), name='admin-sentence-export'),
    
    # Analytics
    path('analytics/', AdminAnalyticsView.as_view(), name='admin-analytics'),
    
    # Scoring
    path('scoring/', AdminScoringView.as_view(), name='admin-scoring'),
    path('scoring/history/', AdminScoringHistoryView.as_view(), name='admin-scoring-history'),
    path('scoring/rollback/', AdminScoringRollbackView.as_view(), name='admin-scoring-rollback'),
    
    # Logs
    path('logs/', AdminLogsView.as_view(), name='admin-logs'),
]
