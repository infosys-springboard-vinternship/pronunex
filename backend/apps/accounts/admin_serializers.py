"""
Admin serializers for user management.

Security: Fields are carefully curated — no password hashes, tokens, or
internal fields are ever exposed. Write access is limited to safe fields only.
"""

from rest_framework import serializers
from .models import User


class AdminUserListSerializer(serializers.ModelSerializer):
    """Read-only serializer for the admin user table.
    
    Includes annotated fields (sessions_count, avg_score) that must be
    provided via queryset annotation in the view.
    """
    
    sessions_count = serializers.IntegerField(read_only=True, default=0)
    avg_score = serializers.FloatField(read_only=True, default=None)
    
    class Meta:
        model = User
        fields = [
            'id', 'email', 'username', 'full_name',
            'proficiency_level', 'native_language',
            'is_active', 'is_staff', 'is_email_verified',
            'daily_goal_target', 'avatar_id',
            'last_login', 'last_active', 'created_at',
            'sessions_count', 'avg_score',
        ]
        read_only_fields = fields


class AdminUserDetailSerializer(serializers.ModelSerializer):
    """Detailed read serializer for single user view."""
    
    sessions_count = serializers.IntegerField(read_only=True, default=0)
    attempts_count = serializers.IntegerField(read_only=True, default=0)
    avg_score = serializers.FloatField(read_only=True, default=None)
    
    class Meta:
        model = User
        fields = [
            'id', 'email', 'username', 'full_name',
            'proficiency_level', 'native_language',
            'is_active', 'is_staff', 'is_email_verified',
            'daily_goal_target', 'avatar_id',
            'last_login', 'last_active', 'date_joined', 'created_at', 'updated_at',
            'sessions_count', 'attempts_count', 'avg_score',
        ]
        read_only_fields = fields


class AdminUserEditSerializer(serializers.Serializer):
    """Write serializer for admin user edits.
    
    Only exposes safe, admin-editable fields.
    Password, email, and username changes are intentionally excluded.
    """
    
    is_active = serializers.BooleanField(required=False)
    is_staff = serializers.BooleanField(required=False)
    proficiency_level = serializers.ChoiceField(
        choices=User.PROFICIENCY_CHOICES,
        required=False,
    )
    daily_goal_target = serializers.IntegerField(
        min_value=1, max_value=50,
        required=False,
    )
