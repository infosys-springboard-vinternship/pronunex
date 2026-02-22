"""
URL patterns for practice endpoints.
"""

from django.urls import path
from .views import (
    UserSessionListView,
    UserSessionDetailView,
    EndSessionView,
    AttemptListView,
    AttemptDetailView,
    AssessmentView,
    AttemptFeedbackView,
    SublevelCompleteView,
    SublevelProgressView,
    SublevelSummaryView,
    SublevelRecommendationView,
    SublevelSessionView,
)

urlpatterns = [
    # Sessions
    path('sessions/', UserSessionListView.as_view(), name='session_list'),
    path('sessions/<int:pk>/', UserSessionDetailView.as_view(), name='session_detail'),
    path('sessions/<int:pk>/end/', EndSessionView.as_view(), name='session_end'),
    
    # Attempts
    path('attempts/', AttemptListView.as_view(), name='attempt_list'),
    path('attempts/<int:pk>/', AttemptDetailView.as_view(), name='attempt_detail'),
    
    # Core Assessment
    path('assess/', AssessmentView.as_view(), name='assess'),
    path('attempt-feedback/', AttemptFeedbackView.as_view(), name='attempt_feedback'),
    
    # Sublevel Progress
    path('sublevel-complete/', SublevelCompleteView.as_view(), name='sublevel_complete'),
    path('sublevel-progress/', SublevelProgressView.as_view(), name='sublevel_progress'),
    path('sublevel-summary/', SublevelSummaryView.as_view(), name='sublevel_summary'),
    path('sublevel-recommendations/', SublevelRecommendationView.as_view(), name='sublevel_recommendations'),
    path('sublevel-session/', SublevelSessionView.as_view(), name='sublevel_session'),
]

