"""
API Views for authentication and user management.

Security features:
- Rate limiting via custom throttle classes
- Logic delegated to services layer
- No sensitive data logged
"""

from rest_framework import status, generics
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.views import TokenRefreshView
import logging

from .models import User
from .serializers import (
    SignupSerializer,
    LoginSerializer,
    UserProfileSerializer,
    PasswordResetRequestSerializer,
    PasswordResetConfirmSerializer,
    ChangePasswordSerializer,
)
from .throttling import (
    LoginRateThrottle,
    PasswordResetRateThrottle,
    SignupRateThrottle,
)
from .services import AuthenticationService, PasswordResetService, SupabaseEmailService, GoogleAuthService

logger = logging.getLogger(__name__)


class SignupView(generics.CreateAPIView):
    """
    POST /api/v1/auth/signup/
    
    Register a new user account.
    Rate limited to prevent mass account creation.
    """
    
    queryset = User.objects.all()
    serializer_class = SignupSerializer
    permission_classes = [AllowAny]
    throttle_classes = [SignupRateThrottle]
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        # Generate tokens for immediate login
        auth_service = AuthenticationService()
        tokens = auth_service.generate_tokens(user)
        
        logger.info("New user registered")
        
        return Response({
            'message': 'Registration successful.',
            'user': UserProfileSerializer(user).data,
            'tokens': tokens
        }, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    """
    POST /api/v1/auth/login/
    
    Authenticate user and return JWT tokens.
    Rate limited to prevent brute-force attacks.
    """
    
    permission_classes = [AllowAny]
    throttle_classes = [LoginRateThrottle]
    
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        user = serializer.validated_data['user']
        
        auth_service = AuthenticationService()
        tokens = auth_service.generate_tokens(user)
        
        logger.info("User logged in")
        
        return Response({
            'message': 'Login successful.',
            'user': UserProfileSerializer(user).data,
            'tokens': tokens,
        }, status=status.HTTP_200_OK)


class LogoutView(APIView):
    """
    POST /api/v1/auth/logout/
    
    Blacklist the refresh token to logout user.
    Allows unauthenticated requests to handle expired tokens gracefully.
    """
    
    permission_classes = [AllowAny]
    
    def post(self, request):
        refresh_token = request.data.get('refresh')
        
        auth_service = AuthenticationService()
        success, message = auth_service.logout(refresh_token)
        
        return Response({'message': message}, status=status.HTTP_200_OK)


class UserProfileView(generics.RetrieveUpdateAPIView):
    """
    GET /api/v1/auth/profile/
    PUT /api/v1/auth/profile/
    
    Retrieve or update user profile.
    """
    
    serializer_class = UserProfileSerializer
    permission_classes = [IsAuthenticated]
    
    def get_object(self):
        return self.request.user


class PasswordResetRequestView(APIView):
    """
    POST /api/v1/auth/password/reset/
    
    Request a password reset email.
    Rate limited to prevent email spam.
    """
    
    permission_classes = [AllowAny]
    throttle_classes = [PasswordResetRateThrottle]
    
    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        email = serializer.validated_data['email']
        
        # Use service for token creation
        reset_service = PasswordResetService()
        success, raw_token = reset_service.request_reset(email)
        
        # Send email if token was created
        if raw_token:
            email_service = SupabaseEmailService()
            email_service.send_password_reset_email(email, raw_token)
        
        # Always return same response (no user enumeration)
        return Response({
            'message': 'If the email exists, a reset link has been sent.'
        }, status=status.HTTP_200_OK)


class PasswordResetConfirmView(APIView):
    """
    POST /api/v1/auth/password/reset/confirm/
    
    Confirm password reset with token.
    """
    
    permission_classes = [AllowAny]
    
    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        raw_token = serializer.validated_data['token']
        new_password = serializer.validated_data['new_password']
        
        # Use service for password reset
        reset_service = PasswordResetService()
        success, message = reset_service.reset_password(raw_token, new_password)
        
        if not success:
            return Response({'error': message}, status=status.HTTP_400_BAD_REQUEST)
        
        return Response({'message': message}, status=status.HTTP_200_OK)


class ChangePasswordView(APIView):
    """
    POST /api/v1/auth/password/change/
    
    Change password while logged in.
    """
    
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        user = request.user
        current_password = serializer.validated_data['current_password']
        new_password = serializer.validated_data['new_password']
        
        if not user.check_password(current_password):
            return Response({
                'error': 'Current password is incorrect.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        user.set_password(new_password)
        user.save()
        
        logger.info("Password changed for user")
        
        return Response({
            'message': 'Password changed successfully.'
        }, status=status.HTTP_200_OK)


class GoogleLoginView(APIView):
    """
    POST /api/v1/auth/google/
    
    Authenticate user via Google OAuth (Supabase).
    Creates new user if not exists, or links to existing account.
    """
    
    permission_classes = [AllowAny]
    
    def post(self, request):
        email = request.data.get('email')
        name = request.data.get('name')
        access_token = request.data.get('access_token')
        
        if not email:
            return Response(
                {'error': 'Email is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            google_service = GoogleAuthService()
            user, tokens = google_service.authenticate_google_user(
                email=email,
                name=name,
            )
            
            return Response({
                'message': 'Google login successful.',
                'user': UserProfileSerializer(user).data,
                'tokens': tokens,
            }, status=status.HTTP_200_OK)
            
        except ValueError as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f"Google login error: {e}")
            return Response(
                {'error': 'Authentication failed'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
