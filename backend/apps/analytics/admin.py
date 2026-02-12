from django.contrib import admin
from .models import (
    UserProgress, PhonemeProgress, StreakRecord,
    ScoringConfig, ScoringConfigHistory, SystemLog
)


@admin.register(UserProgress)
class UserProgressAdmin(admin.ModelAdmin):
    list_display = ['user', 'date', 'attempts_count', 'average_score', 'best_score']
    list_filter = ['date']
    search_fields = ['user__email']
    ordering = ['-date']
    date_hierarchy = 'date'


@admin.register(PhonemeProgress)
class PhonemeProgressAdmin(admin.ModelAdmin):
    list_display = ['user', 'phoneme', 'current_score', 'attempts_count', 'improvement_rate']
    list_filter = ['phoneme__type']
    search_fields = ['user__email', 'phoneme__arpabet']
    ordering = ['user', 'phoneme']


@admin.register(StreakRecord)
class StreakRecordAdmin(admin.ModelAdmin):
    list_display = ['user', 'current_streak', 'longest_streak', 'last_practice_date']
    search_fields = ['user__email']


@admin.register(ScoringConfig)
class ScoringConfigAdmin(admin.ModelAdmin):
    list_display = ['pk', 'weak_phoneme_threshold', 'accuracy_weight', 'fluency_weight', 'updated_at']
    readonly_fields = ['updated_at']


@admin.register(ScoringConfigHistory)
class ScoringConfigHistoryAdmin(admin.ModelAdmin):
    list_display = ['created_at', 'created_by', 'reason']
    list_filter = ['created_at']
    readonly_fields = ['config_snapshot', 'created_at', 'created_by']


@admin.register(SystemLog)
class SystemLogAdmin(admin.ModelAdmin):
    list_display = ['created_at', 'type', 'severity', 'message', 'user', 'ip_address']
    list_filter = ['type', 'severity', 'created_at']
    search_fields = ['message', 'user__email']
    readonly_fields = ['type', 'severity', 'message', 'details', 'user', 'ip_address', 'created_at']
    ordering = ['-created_at']

