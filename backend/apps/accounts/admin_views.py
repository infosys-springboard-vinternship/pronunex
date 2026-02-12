"""
Admin API Views for Pronunex.

Provides admin-only endpoints for user management, analytics,
scoring configuration, sentence management, and system monitoring.

Security:
- All views require IsAdminUser permission
- Admin-write endpoints have rate limiting
- Input sanitization on all write operations
- Admin actions logged to SystemLog audit trail
- IP tracking on security-sensitive operations
"""

import csv
import io
import json
import logging
from collections import Counter
from datetime import timedelta

from django.utils import timezone
from django.db.models import Avg, Count, Q, F
from django.http import HttpResponse
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser
from rest_framework.parsers import MultiPartParser, JSONParser
from rest_framework.throttling import UserRateThrottle
from rest_framework import status

from apps.accounts.models import User
from apps.practice.models import Attempt, UserSession, PhonemeError
from apps.library.models import ReferenceSentence
from apps.analytics.models import (
    UserProgress, ScoringConfig, ScoringConfigHistory, SystemLog
)
from apps.analytics.logging_utils import (
    log_admin_action, log_security_event, get_client_ip
)
from apps.accounts.admin_sentence_utils import (
    sanitize_sentence_text,
    generate_phoneme_sequence,
    extract_target_phonemes,
    auto_detect_difficulty,
    validate_difficulty_level,
    validate_target_phonemes,
)

logger = logging.getLogger(__name__)


# --- Rate Limiting ---

class AdminWriteThrottle(UserRateThrottle):
    """Rate limit admin write operations: 30/minute."""
    scope = 'admin_write'
    rate = '30/min'


class AdminBulkThrottle(UserRateThrottle):
    """Rate limit bulk operations: 5/minute."""
    scope = 'admin_bulk'
    rate = '5/min'


# --- Security Mixin ---

class AdminSecurityMixin:
    """
    Mixin providing security helpers for admin views.
    
    - Validates admin is not targeting themselves for destructive ops
    - Logs all admin actions to audit trail
    - Extracts client IP for tracking
    """
    
    def verify_not_self(self, request, target_user):
        """Prevent admin from disabling/resetting their own account."""
        if request.user.id == target_user.id:
            log_security_event(
                "Admin attempted self-destructive action",
                details={'action': request.path},
                user=request.user,
                request=request
            )
            return Response(
                {'error': 'Cannot perform this action on your own account'},
                status=status.HTTP_403_FORBIDDEN
            )
        return None


# ============================================================
#  Dashboard Stats
# ============================================================

class AdminStatsView(APIView):
    """
    GET /api/v1/admin/stats/
    
    Overview statistics for admin dashboard.
    """
    permission_classes = [IsAdminUser]
    
    def get(self, request):
        seven_days_ago = timezone.now() - timedelta(days=7)
        twenty_four_hours_ago = timezone.now() - timedelta(hours=24)
        
        total_users = User.objects.count()
        active_users = User.objects.filter(
            last_login__gte=seven_days_ago
        ).count()
        
        total_attempts = Attempt.objects.count()
        
        avg_accuracy = Attempt.objects.aggregate(
            avg=Avg('score')
        )['avg'] or 0
        
        # Compute avg PER from PhonemeError data
        avg_per = PhonemeError.objects.aggregate(
            avg=Avg('similarity_score')
        )['avg'] or 0
        
        # System health from recent logs
        recent_errors = SystemLog.objects.filter(
            created_at__gte=twenty_four_hours_ago,
            severity__in=['error', 'critical']
        ).count()
        
        system_status = 'OK'
        if recent_errors > 10:
            system_status = 'DEGRADED'
        elif recent_errors > 50:
            system_status = 'CRITICAL'
        
        # New users in last 7 days
        new_users = User.objects.filter(
            created_at__gte=seven_days_ago
        ).count()
        
        return Response({
            'total_users': total_users,
            'active_users': active_users,
            'new_users': new_users,
            'total_attempts': total_attempts,
            'avg_accuracy': round(avg_accuracy, 3),
            'avg_per': round(avg_per, 3),
            'system_status': system_status,
            'recent_errors_24h': recent_errors,
        })


# ============================================================
#  User Management
# ============================================================

class AdminUsersView(APIView):
    """
    GET /api/v1/admin/users/?page=1&limit=20&search=&status=
    
    Paginated list of users with stats.
    """
    permission_classes = [IsAdminUser]
    
    def get(self, request):
        # Pagination
        page = max(int(request.query_params.get('page', 1)), 1)
        limit = min(int(request.query_params.get('limit', 20)), 100)
        offset = (page - 1) * limit
        
        # Filters
        search = request.query_params.get('search', '').strip()
        status_filter = request.query_params.get('status', '')
        
        users = User.objects.all().order_by('-created_at')
        
        if search:
            users = users.filter(
                Q(email__icontains=search) |
                Q(full_name__icontains=search)
            )
        
        # Get counts before applying status filter
        base_queryset = users
        total_all = base_queryset.count()
        total_active = base_queryset.filter(is_active=True).count()
        total_disabled = base_queryset.filter(is_active=False).count()
        
        if status_filter == 'active':
            users = users.filter(is_active=True)
        elif status_filter == 'disabled':
            users = users.filter(is_active=False)
        
        total = users.count()
        
        # Efficiently compute attempt stats using annotations
        from django.db.models import Subquery, OuterRef
        
        attempt_stats = Attempt.objects.filter(
            session__user=OuterRef('pk')
        ).values('session__user').annotate(
            count=Count('id'),
            avg=Avg('score')
        ).values('count', 'avg')
        
        paginated_users = users.annotate(
            attempts_count=Subquery(
                attempt_stats.values('count')[:1]
            ),
            avg_score=Subquery(
                attempt_stats.values('avg')[:1]
            )
        )[offset:offset + limit]
        
        user_data = []
        for user in paginated_users:
            user_data.append({
                'id': user.id,
                'email': user.email,
                'full_name': user.full_name,
                'created_at': user.created_at,
                'is_active': user.is_active,
                'is_staff': user.is_staff,
                'last_activity': user.last_login.strftime('%Y-%m-%d %H:%M') if user.last_login else None,
                'total_attempts': user.attempts_count or 0,
                'avg_accuracy': round(user.avg_score or 0, 3),
            })
        
        return Response({
            'users': user_data,
            'total': total,
            'total_all': total_all,
            'total_active': total_active,
            'total_disabled': total_disabled,
            'page': page,
            'pages': max((total + limit - 1) // limit, 1),
            'limit': limit,
        })


class AdminUserDetailView(APIView):
    """
    GET /api/v1/admin/users/:id/
    
    Detailed information about a specific user with real phoneme data.
    """
    permission_classes = [IsAdminUser]
    
    def get(self, request, user_id):
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response(
                {'error': 'User not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        attempts = Attempt.objects.filter(session__user=user).order_by('-created_at')
        sessions = UserSession.objects.filter(user=user)
        
        # Accuracy trend from last 30 attempts
        accuracy_trend = []
        for attempt in attempts[:30]:
            accuracy_trend.append({
                'date': attempt.created_at.strftime('%Y-%m-%d'),
                'accuracy': round(attempt.score, 3)
            })
        
        # Real weak phonemes from PhonemeError data
        weak_phonemes = []
        phoneme_errors = PhonemeError.objects.filter(
            attempt__session__user=user
        ).values(
            'target_phoneme__arpabet'
        ).annotate(
            avg_score=Avg('similarity_score'),
            count=Count('id')
        ).filter(
            avg_score__lt=0.7
        ).order_by('avg_score')[:10]
        
        for pe in phoneme_errors:
            weak_phonemes.append({
                'phoneme': pe['target_phoneme__arpabet'],
                'avg_score': round(pe['avg_score'], 3),
                'occurrence_count': pe['count'],
            })
        
        # Recent attempts
        recent_attempts = []
        for attempt in attempts[:10]:
            # Determine tier
            score = attempt.score
            if score >= 0.9:
                tier = 'Excellent'
            elif score >= 0.7:
                tier = 'Good'
            elif score >= 0.5:
                tier = 'Fair'
            else:
                tier = 'Poor'
            
            recent_attempts.append({
                'timestamp': attempt.created_at,
                'sentence': attempt.sentence.text[:50],
                'accuracy': round(score, 3),
                'per': round(1 - score, 3),
                'tier': tier
            })
        
        total_sessions = sessions.count()
        
        return Response({
            'id': user.id,
            'email': user.email,
            'full_name': user.full_name,
            'created_at': user.created_at,
            'is_active': user.is_active,
            'last_activity': user.last_login.strftime('%Y-%m-%d %H:%M') if user.last_login else None,
            'total_attempts': attempts.count(),
            'total_sessions': total_sessions,
            'total_minutes': total_sessions * 10,
            'avg_accuracy': round(attempts.aggregate(avg=Avg('score'))['avg'] or 0, 3),
            'accuracy_trend': accuracy_trend,
            'weak_phonemes': weak_phonemes,
            'recent_attempts': recent_attempts,
        })


class AdminUserDisableView(AdminSecurityMixin, APIView):
    """
    POST /api/v1/admin/users/:id/disable/
    
    Disable a user account. Cannot disable self.
    """
    permission_classes = [IsAdminUser]
    throttle_classes = [AdminWriteThrottle]
    
    def post(self, request, user_id):
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response(
                {'error': 'User not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Security: prevent self-disable
        blocked = self.verify_not_self(request, user)
        if blocked:
            return blocked
        
        # Security: prevent disabling other admins
        if user.is_staff:
            log_security_event(
                f"Admin {request.user.email} attempted to disable admin {user.email}",
                user=request.user,
                request=request
            )
            return Response(
                {'error': 'Cannot disable another admin account'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        user.is_active = False
        user.save()
        
        log_admin_action(
            f"Disabled user {user.email}",
            admin_user=request.user,
            details={'target_user_id': user.id},
            request=request
        )
        
        return Response({'message': 'User disabled successfully'})


class AdminUserEnableView(AdminSecurityMixin, APIView):
    """
    POST /api/v1/admin/users/:id/enable/
    
    Re-enable a disabled user account.
    """
    permission_classes = [IsAdminUser]
    throttle_classes = [AdminWriteThrottle]
    
    def post(self, request, user_id):
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response(
                {'error': 'User not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        if user.is_active:
            return Response(
                {'error': 'User is already active'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user.is_active = True
        user.save()
        
        log_admin_action(
            f"Enabled user {user.email}",
            admin_user=request.user,
            details={'target_user_id': user.id},
            request=request
        )
        
        return Response({'message': 'User enabled successfully'})


class AdminUserResetProgressView(AdminSecurityMixin, APIView):
    """
    POST /api/v1/admin/users/:id/reset-progress/
    
    Reset user's progress data. Cannot reset self.
    """
    permission_classes = [IsAdminUser]
    throttle_classes = [AdminWriteThrottle]
    
    def post(self, request, user_id):
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response(
                {'error': 'User not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Security: prevent self-reset
        blocked = self.verify_not_self(request, user)
        if blocked:
            return blocked
        
        from apps.analytics.models import PhonemeProgress, StreakRecord
        
        deleted_sessions = UserSession.objects.filter(user=user).delete()[0]
        deleted_progress = UserProgress.objects.filter(user=user).delete()[0]
        deleted_phoneme_progress = PhonemeProgress.objects.filter(user=user).delete()[0]
        
        try:
            user.streak.delete()
            deleted_streak = 1
        except StreakRecord.DoesNotExist:
            deleted_streak = 0
        
        log_admin_action(
            f"Reset progress for user {user.email}",
            admin_user=request.user,
            details={
                'target_user_id': user.id,
                'deleted_sessions': deleted_sessions,
                'deleted_progress': deleted_progress,
                'deleted_phoneme_progress': deleted_phoneme_progress,
                'deleted_streak': deleted_streak,
            },
            request=request
        )
        
        return Response({'message': 'User progress reset successfully'})


# ============================================================
#  Sentence Management
# ============================================================

class AdminSentencesView(APIView):
    """
    GET /api/v1/admin/sentences/?page=1&limit=20&difficulty=&search=
    POST /api/v1/admin/sentences/
    
    Manage reference sentences with auto-phoneme generation.
    """
    permission_classes = [IsAdminUser]
    
    def get(self, request):
        # Pagination
        page = max(int(request.query_params.get('page', 1)), 1)
        limit = min(int(request.query_params.get('limit', 50)), 200)
        offset = (page - 1) * limit
        
        # Filters
        difficulty = request.query_params.get('difficulty', '')
        search = request.query_params.get('search', '').strip()
        
        sentences = ReferenceSentence.objects.all().order_by('-created_at')
        
        if difficulty and difficulty != 'all':
            sentences = sentences.filter(difficulty_level=difficulty)
        if search:
            sentences = sentences.filter(text__icontains=search)
        
        total = sentences.count()
        
        # Efficiently compute attempt stats using annotations
        paginated = sentences.annotate(
            usage_count=Count('user_attempts'),
            avg_accuracy=Avg('user_attempts__score')
        )[offset:offset + limit]
        
        sentence_data = []
        for sentence in paginated:
            sentence_data.append({
                'id': sentence.id,
                'text': sentence.text,
                'difficulty_level': sentence.difficulty_level,
                'target_phonemes': sentence.target_phonemes or [],
                'phoneme_sequence': sentence.phoneme_sequence or [],
                'is_validated': sentence.is_validated,
                'source': sentence.source,
                'avg_accuracy': round(sentence.avg_accuracy or 0, 3),
                'usage_count': sentence.usage_count or 0,
                'created_at': sentence.created_at,
            })
        
        return Response({
            'sentences': sentence_data,
            'total': total,
            'page': page,
            'pages': max((total + limit - 1) // limit, 1),
        })
    
    def post(self, request):
        """Create a sentence with auto-phoneme generation."""
        data = request.data
        
        # Validate and sanitize text
        try:
            text = sanitize_sentence_text(data.get('text', ''))
        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate difficulty
        try:
            difficulty = validate_difficulty_level(
                data.get('difficulty_level', 'beginner')
            )
        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate target phonemes
        try:
            target_phonemes = validate_target_phonemes(
                data.get('target_phonemes', [])
            )
        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check for duplicate sentences
        if ReferenceSentence.objects.filter(text__iexact=text).exists():
            return Response(
                {'error': 'A sentence with this text already exists'},
                status=status.HTTP_409_CONFLICT
            )
        
        # Auto-generate phoneme sequence
        phoneme_sequence = generate_phoneme_sequence(text)
        
        # Auto-extract target phonemes if not provided
        if not target_phonemes and phoneme_sequence:
            target_phonemes = extract_target_phonemes(phoneme_sequence)
        
        # Auto-detect difficulty if requested
        if data.get('auto_detect_difficulty'):
            difficulty = auto_detect_difficulty(text)
        
        sentence = ReferenceSentence.objects.create(
            text=text,
            difficulty_level=difficulty,
            target_phonemes=target_phonemes,
            is_validated=data.get('is_validated', True),
            phoneme_sequence=phoneme_sequence,
            alignment_map=[],
            source='curated',
        )
        
        log_admin_action(
            f"Created sentence: {text[:50]}",
            admin_user=request.user,
            details={
                'sentence_id': sentence.id,
                'difficulty': difficulty,
                'phoneme_count': len(phoneme_sequence),
            },
            request=request
        )
        
        return Response({
            'id': sentence.id,
            'message': 'Sentence created successfully',
            'phoneme_sequence': phoneme_sequence,
            'target_phonemes': target_phonemes,
            'difficulty_level': difficulty,
        }, status=status.HTTP_201_CREATED)


class AdminSentenceDetailView(APIView):
    """
    PUT /api/v1/admin/sentences/:id/
    DELETE /api/v1/admin/sentences/:id/
    PATCH /api/v1/admin/sentences/:id/
    """
    permission_classes = [IsAdminUser]
    throttle_classes = [AdminWriteThrottle]
    
    def put(self, request, sentence_id):
        try:
            sentence = ReferenceSentence.objects.get(id=sentence_id)
        except ReferenceSentence.DoesNotExist:
            return Response(
                {'error': 'Sentence not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        data = request.data
        
        # If text changed, re-sanitize and regenerate phonemes
        new_text = data.get('text')
        if new_text and new_text != sentence.text:
            try:
                new_text = sanitize_sentence_text(new_text)
            except ValueError as e:
                return Response(
                    {'error': str(e)},
                    status=status.HTTP_400_BAD_REQUEST
                )
            sentence.text = new_text
            sentence.phoneme_sequence = generate_phoneme_sequence(new_text)
        
        if 'difficulty_level' in data:
            try:
                sentence.difficulty_level = validate_difficulty_level(data['difficulty_level'])
            except ValueError as e:
                return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        
        if 'target_phonemes' in data:
            try:
                sentence.target_phonemes = validate_target_phonemes(data['target_phonemes'])
            except ValueError as e:
                return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        
        if 'is_validated' in data:
            sentence.is_validated = bool(data['is_validated'])
        
        sentence.save()
        
        log_admin_action(
            f"Updated sentence #{sentence_id}: {sentence.text[:50]}",
            admin_user=request.user,
            request=request
        )
        
        return Response({'message': 'Sentence updated successfully'})
    
    def patch(self, request, sentence_id):
        try:
            sentence = ReferenceSentence.objects.get(id=sentence_id)
        except ReferenceSentence.DoesNotExist:
            return Response(
                {'error': 'Sentence not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        if 'is_validated' in request.data:
            sentence.is_validated = bool(request.data['is_validated'])
            sentence.save()
        
        return Response({'message': 'Sentence updated successfully'})
    
    def delete(self, request, sentence_id):
        try:
            sentence = ReferenceSentence.objects.get(id=sentence_id)
        except ReferenceSentence.DoesNotExist:
            return Response(
                {'error': 'Sentence not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        text_preview = sentence.text[:50]
        sentence.delete()
        
        log_admin_action(
            f"Deleted sentence #{sentence_id}: {text_preview}",
            admin_user=request.user,
            request=request
        )
        
        return Response({'message': 'Sentence deleted successfully'})


class AdminSentenceGenerateView(APIView):
    """
    POST /api/v1/admin/sentences/generate/
    
    Generate sentences using AI (sentence engine).
    Returns generated sentences for admin review before saving.
    """
    permission_classes = [IsAdminUser]
    throttle_classes = [AdminBulkThrottle]
    
    def post(self, request):
        data = request.data
        target_phonemes = data.get('target_phonemes', [])
        difficulty = data.get('difficulty', 'intermediate')
        count = min(int(data.get('count', 3)), 10)  # Max 10 at a time
        
        try:
            target_phonemes = validate_target_phonemes(target_phonemes)
            difficulty = validate_difficulty_level(difficulty)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            from apps.sentence_engine.sentence_generator import batch_generate_sentences
            generated = batch_generate_sentences(
                weak_phonemes=target_phonemes,
                count=count,
                difficulty=difficulty
            )
            
            log_admin_action(
                f"Generated {len(generated)} AI sentences",
                admin_user=request.user,
                details={'phonemes': target_phonemes, 'difficulty': difficulty},
                request=request
            )
            
            return Response({
                'generated': generated,
                'count': len(generated),
            })
        except Exception as e:
            logger.error(f"AI sentence generation failed: {e}")
            return Response(
                {'error': 'Sentence generation failed. Check LLM service configuration.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class AdminSentenceBulkImportView(APIView):
    """
    POST /api/v1/admin/sentences/bulk-import/
    
    Bulk import sentences from CSV file.
    Expected CSV columns: text, difficulty_level (optional), target_phonemes (optional)
    """
    permission_classes = [IsAdminUser]
    parser_classes = [MultiPartParser]
    throttle_classes = [AdminBulkThrottle]
    
    MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB
    MAX_ROWS = 500
    
    def post(self, request):
        file = request.FILES.get('file')
        
        if not file:
            return Response(
                {'error': 'No file provided'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Security: validate file size
        if file.size > self.MAX_FILE_SIZE:
            return Response(
                {'error': f'File too large. Maximum size: {self.MAX_FILE_SIZE // (1024*1024)}MB'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Security: validate file type
        if not file.name.lower().endswith('.csv'):
            return Response(
                {'error': 'Only CSV files are accepted'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            content = file.read().decode('utf-8')
            reader = csv.DictReader(io.StringIO(content))
            
            imported = 0
            skipped = 0
            errors = []
            
            for i, row in enumerate(reader):
                if i >= self.MAX_ROWS:
                    errors.append(f"Row limit reached ({self.MAX_ROWS}). Remaining rows skipped.")
                    break
                
                text = row.get('text', '').strip()
                if not text:
                    skipped += 1
                    continue
                
                try:
                    text = sanitize_sentence_text(text)
                except ValueError as e:
                    errors.append(f"Row {i+1}: {str(e)}")
                    skipped += 1
                    continue
                
                # Skip duplicates
                if ReferenceSentence.objects.filter(text__iexact=text).exists():
                    skipped += 1
                    continue
                
                difficulty = row.get('difficulty_level', '').strip().lower()
                if difficulty not in ('beginner', 'intermediate', 'advanced'):
                    difficulty = auto_detect_difficulty(text)
                
                # Parse target phonemes
                raw_phonemes = row.get('target_phonemes', '')
                if raw_phonemes:
                    target_phonemes = [p.strip().upper() for p in raw_phonemes.split(',') if p.strip()]
                else:
                    target_phonemes = []
                
                phoneme_sequence = generate_phoneme_sequence(text)
                
                if not target_phonemes and phoneme_sequence:
                    target_phonemes = extract_target_phonemes(phoneme_sequence)
                
                ReferenceSentence.objects.create(
                    text=text,
                    difficulty_level=difficulty,
                    target_phonemes=target_phonemes,
                    phoneme_sequence=phoneme_sequence,
                    alignment_map=[],
                    is_validated=True,
                    source='curated',
                )
                imported += 1
            
            log_admin_action(
                f"Bulk imported {imported} sentences ({skipped} skipped)",
                admin_user=request.user,
                details={'imported': imported, 'skipped': skipped, 'errors': errors[:10]},
                request=request
            )
            
            return Response({
                'imported': imported,
                'skipped': skipped,
                'errors': errors[:10],
                'message': f'Successfully imported {imported} sentences',
            })
            
        except Exception as e:
            logger.error(f"Bulk import failed: {e}")
            return Response(
                {'error': f'Import failed: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )


class AdminSentenceExportView(APIView):
    """
    GET /api/v1/admin/sentences/export/
    
    Export all sentences as CSV download.
    """
    permission_classes = [IsAdminUser]
    
    def get(self, request):
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="pronunex_sentences.csv"'
        
        writer = csv.writer(response)
        writer.writerow(['text', 'difficulty_level', 'target_phonemes', 'is_validated', 'source'])
        
        for sentence in ReferenceSentence.objects.all().order_by('difficulty_level', 'text'):
            phonemes_str = ', '.join(sentence.target_phonemes or [])
            writer.writerow([
                sentence.text,
                sentence.difficulty_level,
                phonemes_str,
                sentence.is_validated,
                sentence.source,
            ])
        
        log_admin_action(
            "Exported sentences to CSV",
            admin_user=request.user,
            request=request
        )
        
        return response


# ============================================================
#  Analytics
# ============================================================

class AdminAnalyticsView(APIView):
    """
    GET /api/v1/admin/analytics/
    
    Real global analytics data aggregated from attempts and phoneme errors.
    """
    permission_classes = [IsAdminUser]
    
    def get(self, request):
        thirty_days_ago = timezone.now() - timedelta(days=30)
        
        # Real weak phonemes from PhonemeError data
        weak_phonemes = list(
            PhonemeError.objects.filter(
                attempt__created_at__gte=thirty_days_ago
            ).values(
                phoneme=F('target_phoneme__arpabet'),
            ).annotate(
                avg_score=Avg('similarity_score'),
                count=Count('id'),
            ).filter(
                avg_score__lt=0.7
            ).order_by('avg_score')[:15]
        )
        
        # Round scores
        for wp in weak_phonemes:
            wp['avg_score'] = round(wp['avg_score'], 3)
        
        # 30-day accuracy trend
        accuracy_trend = []
        for i in range(30, 0, -1):
            date = timezone.now() - timedelta(days=i)
            day_attempts = Attempt.objects.filter(
                created_at__date=date.date()
            )
            avg = day_attempts.aggregate(avg=Avg('score'))['avg'] or 0
            count = day_attempts.count()
            
            accuracy_trend.append({
                'date': date.strftime('%Y-%m-%d'),
                'avg_accuracy': round(avg, 3),
                'attempt_count': count,
            })
        
        # Real failed words (sentences with low average scores)
        failed_words = list(
            Attempt.objects.filter(
                score__lt=0.5,
                created_at__gte=thirty_days_ago,
            ).values(
                word=F('sentence__text'),
            ).annotate(
                count=Count('id'),
                avg_score=Avg('score'),
            ).order_by('-count')[:20]
        )
        
        for fw in failed_words:
            fw['word'] = fw['word'][:60]
            fw['avg_score'] = round(fw['avg_score'], 3)
        
        # Score distribution
        per_distribution = [
            {'range': '0-20%', 'count': Attempt.objects.filter(score__lte=0.2).count()},
            {'range': '20-40%', 'count': Attempt.objects.filter(score__gt=0.2, score__lte=0.4).count()},
            {'range': '40-60%', 'count': Attempt.objects.filter(score__gt=0.4, score__lte=0.6).count()},
            {'range': '60-80%', 'count': Attempt.objects.filter(score__gt=0.6, score__lte=0.8).count()},
            {'range': '80-100%', 'count': Attempt.objects.filter(score__gt=0.8).count()},
        ]
        
        return Response({
            'weak_phonemes': weak_phonemes,
            'accuracy_trend': accuracy_trend,
            'failed_words': failed_words,
            'per_distribution': per_distribution,
        })


# ============================================================
#  Scoring Configuration
# ============================================================

class AdminScoringView(APIView):
    """
    GET /api/v1/admin/scoring/
    POST /api/v1/admin/scoring/
    
    Manage scoring configuration (persisted to database).
    """
    permission_classes = [IsAdminUser]
    
    def get(self, request):
        config = ScoringConfig.get_active()
        
        return Response({
            'config': {
                'tier_thresholds': config.tier_thresholds,
                'per_cutoffs': config.per_cutoffs,
                'weak_phoneme_threshold': config.weak_phoneme_threshold,
                'accuracy_weight': config.accuracy_weight,
                'fluency_weight': config.fluency_weight,
            },
            'last_updated': config.updated_at,
            'updated_by': config.updated_by.email if config.updated_by else None,
        })
    
    def post(self, request):
        data = request.data
        config = ScoringConfig.get_active()
        
        # Validate weights sum to 1.0
        accuracy_w = float(data.get('accuracy_weight', config.accuracy_weight))
        fluency_w = float(data.get('fluency_weight', config.fluency_weight))
        
        if not (0 <= accuracy_w <= 1 and 0 <= fluency_w <= 1):
            return Response(
                {'error': 'Weights must be between 0 and 1'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if abs(accuracy_w + fluency_w - 1.0) > 0.01:
            return Response(
                {'error': 'Accuracy and fluency weights must sum to 1.0'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate threshold range
        threshold = float(data.get('weak_phoneme_threshold', config.weak_phoneme_threshold))
        if not (0 <= threshold <= 1):
            return Response(
                {'error': 'Threshold must be between 0 and 1'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create history snapshot BEFORE making changes
        ScoringConfigHistory.objects.create(
            config_snapshot={
                'tier_thresholds': config.tier_thresholds,
                'per_cutoffs': config.per_cutoffs,
                'weak_phoneme_threshold': config.weak_phoneme_threshold,
                'accuracy_weight': config.accuracy_weight,
                'fluency_weight': config.fluency_weight,
            },
            created_by=request.user,
            reason=data.get('reason', ''),
        )
        
        # Update config
        if 'tier_thresholds' in data and isinstance(data['tier_thresholds'], dict):
            config.tier_thresholds = data['tier_thresholds']
        if 'per_cutoffs' in data and isinstance(data['per_cutoffs'], dict):
            config.per_cutoffs = data['per_cutoffs']
        
        config.weak_phoneme_threshold = threshold
        config.accuracy_weight = accuracy_w
        config.fluency_weight = fluency_w
        config.updated_by = request.user
        config.save()
        
        log_admin_action(
            "Updated scoring configuration",
            admin_user=request.user,
            details={
                'accuracy_weight': accuracy_w,
                'fluency_weight': fluency_w,
                'threshold': threshold,
            },
            request=request
        )
        
        return Response({'message': 'Scoring configuration updated successfully'})


class AdminScoringHistoryView(APIView):
    """
    GET /api/v1/admin/scoring/history/
    
    List scoring configuration change history.
    """
    permission_classes = [IsAdminUser]
    
    def get(self, request):
        history = ScoringConfigHistory.objects.all()[:50]
        
        return Response({
            'history': [
                {
                    'id': h.id,
                    'config_snapshot': h.config_snapshot,
                    'created_at': h.created_at,
                    'created_by': h.created_by.email if h.created_by else None,
                    'reason': h.reason,
                }
                for h in history
            ]
        })


class AdminScoringRollbackView(APIView):
    """
    POST /api/v1/admin/scoring/rollback/
    
    Rollback scoring config to a historical snapshot.
    """
    permission_classes = [IsAdminUser]
    throttle_classes = [AdminWriteThrottle]
    
    def post(self, request):
        history_id = request.data.get('history_id')
        
        if not history_id:
            return Response(
                {'error': 'history_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            history = ScoringConfigHistory.objects.get(id=history_id)
        except ScoringConfigHistory.DoesNotExist:
            return Response(
                {'error': 'History entry not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        snapshot = history.config_snapshot
        config = ScoringConfig.get_active()
        
        # Save current state before rollback
        ScoringConfigHistory.objects.create(
            config_snapshot={
                'tier_thresholds': config.tier_thresholds,
                'per_cutoffs': config.per_cutoffs,
                'weak_phoneme_threshold': config.weak_phoneme_threshold,
                'accuracy_weight': config.accuracy_weight,
                'fluency_weight': config.fluency_weight,
            },
            created_by=request.user,
            reason=f'Pre-rollback snapshot (rolling back to #{history_id})',
        )
        
        # Apply the historical config
        config.tier_thresholds = snapshot.get('tier_thresholds', config.tier_thresholds)
        config.per_cutoffs = snapshot.get('per_cutoffs', config.per_cutoffs)
        config.weak_phoneme_threshold = snapshot.get('weak_phoneme_threshold', config.weak_phoneme_threshold)
        config.accuracy_weight = snapshot.get('accuracy_weight', config.accuracy_weight)
        config.fluency_weight = snapshot.get('fluency_weight', config.fluency_weight)
        config.updated_by = request.user
        config.save()
        
        log_admin_action(
            f"Rolled back scoring config to snapshot #{history_id}",
            admin_user=request.user,
            details={'history_id': history_id},
            request=request
        )
        
        return Response({'message': 'Scoring configuration rolled back successfully'})


# ============================================================
#  System Logs & Health
# ============================================================

class AdminLogsView(APIView):
    """
    GET /api/v1/admin/logs/?type=&severity=&page=1
    
    System logs and health metrics from SystemLog model.
    """
    permission_classes = [IsAdminUser]
    
    def get(self, request):
        # Filters
        log_type = request.query_params.get('type', '')
        severity = request.query_params.get('severity', '')
        page = max(int(request.query_params.get('page', 1)), 1)
        limit = 50
        offset = (page - 1) * limit
        
        twenty_four_hours_ago = timezone.now() - timedelta(hours=24)
        seven_days_ago = timezone.now() - timedelta(days=7)
        
        logs_qs = SystemLog.objects.all().order_by('-created_at')
        
        if log_type:
            logs_qs = logs_qs.filter(type=log_type)
        if severity:
            logs_qs = logs_qs.filter(severity=severity)
        
        total = logs_qs.count()
        log_entries = logs_qs[offset:offset + limit]
        
        logs = [
            {
                'id': log.id,
                'type': log.type,
                'severity': log.severity,
                'message': log.message,
                'details': log.details,
                'user': log.user.email if log.user else None,
                'ip_address': log.ip_address,
                'created_at': log.created_at,
            }
            for log in log_entries
        ]
        
        # Health metrics from last 24 hours
        recent_logs = SystemLog.objects.filter(created_at__gte=twenty_four_hours_ago)
        
        health = {
            'stt_failures': recent_logs.filter(type='stt_error').count(),
            'alignment_failures': recent_logs.filter(type='alignment_error').count(),
            'tts_failures': recent_logs.filter(type='tts_error').count(),
            'llm_failures': recent_logs.filter(type='llm_error').count(),
            'security_events': recent_logs.filter(type='security').count(),
            'total_errors': recent_logs.filter(severity__in=['error', 'critical']).count(),
            'total_warnings': recent_logs.filter(severity='warning').count(),
        }
        
        return Response({
            'logs': logs,
            'health': health,
            'total': total,
            'page': page,
            'pages': max((total + limit - 1) // limit, 1),
        })
