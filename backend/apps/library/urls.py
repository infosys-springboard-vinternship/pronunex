"""
URL patterns for library endpoints.
"""

from django.urls import path
from .views import (
    PhonemeListView,
    PhonemeDetailView,
    SentenceListView,
    SentenceDetailView,
    RecommendedSentencesView,
    SentenceAudioView,
    SentencePreGenerateView,
    LearningPathListView,
    LearningPathDetailView,
    LearningPathUnitsView,
)

urlpatterns = [
    # Phonemes
    path('phonemes/', PhonemeListView.as_view(), name='phoneme_list'),
    path('phonemes/<int:pk>/', PhonemeDetailView.as_view(), name='phoneme_detail'),
    
    # Sentences
    path('sentences/', SentenceListView.as_view(), name='sentence_list'),
    path('sentences/<int:pk>/', SentenceDetailView.as_view(), name='sentence_detail'),
    path('sentences/<int:pk>/audio/', SentenceAudioView.as_view(), name='sentence_audio'),
    path('sentences/recommend/', RecommendedSentencesView.as_view(), name='sentence_recommend'),
    path('sentences/pregenerate/', SentencePreGenerateView.as_view(), name='sentence_pregenerate'),
    
    # Learning Paths (Skill Tree)
    path('learning-paths/', LearningPathListView.as_view(), name='learning_path_list'),
    path('learning-paths/<int:pk>/', LearningPathDetailView.as_view(), name='learning_path_detail'),
    path('learning-paths/<int:pk>/units/', LearningPathUnitsView.as_view(), name='learning_path_units'),
]


