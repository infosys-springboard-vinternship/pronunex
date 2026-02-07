"""
Google OAuth Authentication Service.

Handles user creation/linking from Supabase/Google OAuth tokens.
"""

import logging
from typing import Dict, Optional, Tuple
from django.db import IntegrityError
from rest_framework_simplejwt.tokens import RefreshToken

from ..models import User

logger = logging.getLogger(__name__)


class GoogleAuthService:
    """
    Service for handling Google OAuth authentication via Supabase.
    
    Creates or links users based on email from OAuth provider.
    """
    
    def authenticate_google_user(
        self, 
        email: str, 
        name: Optional[str] = None,
        **kwargs
    ) -> Tuple[User, Dict[str, str]]:
        """
        Authenticate or create a user from Google OAuth.
        
        Args:
            email: User's email from Google OAuth
            name: User's display name from Google
            
        Returns:
            Tuple of (User instance, JWT tokens dict)
            
        Raises:
            ValueError: If email is missing
        """
        if not email:
            raise ValueError("Email is required for Google authentication")
        
        email = email.lower().strip()
        
        # Try to find existing user by email
        user = self._get_or_create_user(email, name)
        
        # Generate Django JWT tokens
        tokens = self._generate_tokens(user)
        
        logger.info(f"Google OAuth: User authenticated - {email}")
        
        return user, tokens
    
    def _get_or_create_user(self, email: str, name: Optional[str]) -> User:
        """
        Find existing user or create new one from Google OAuth data.
        
        Args:
            email: User's email address
            name: User's display name
            
        Returns:
            User instance
        """
        try:
            # Try to find existing user by email
            user = User.objects.get(email=email)
            
            # Update name if provided and user doesn't have one
            if name and not user.full_name:
                user.full_name = name
                user.save(update_fields=['full_name'])
            
            # Mark email as verified since it's from Google OAuth
            if not user.is_email_verified:
                user.is_email_verified = True
                user.save(update_fields=['is_email_verified'])
                
            return user
            
        except User.DoesNotExist:
            # Create new user
            return self._create_user_from_google(email, name)
    
    def _create_user_from_google(self, email: str, name: Optional[str]) -> User:
        """
        Create a new user from Google OAuth data.
        
        Args:
            email: User's email address
            name: User's display name
            
        Returns:
            Newly created User instance
        """
        # Generate username from email (before @)
        base_username = email.split('@')[0]
        username = self._generate_unique_username(base_username)
        
        # Use name or generate from email
        full_name = name or base_username.replace('.', ' ').replace('_', ' ').title()
        
        try:
            user = User.objects.create(
                email=email,
                username=username,
                full_name=full_name,
                is_email_verified=True,  # Google verified email
            )
            user.set_unusable_password()  # No password for OAuth users
            user.save()
            
            logger.info(f"Created new user via Google OAuth: {email}")
            return user
            
        except IntegrityError as e:
            logger.error(f"Failed to create Google OAuth user: {e}")
            raise ValueError(f"Could not create user account: {str(e)}")
    
    def _generate_unique_username(self, base_username: str) -> str:
        """
        Generate a unique username, adding suffix if needed.
        
        Args:
            base_username: Base username to start with
            
        Returns:
            Unique username string
        """
        username = base_username[:30]  # Django max length
        
        if not User.objects.filter(username=username).exists():
            return username
        
        # Add numeric suffix for uniqueness
        counter = 1
        while counter < 100:
            new_username = f"{username[:27]}{counter}"
            if not User.objects.filter(username=new_username).exists():
                return new_username
            counter += 1
        
        # Fallback: use random suffix
        import secrets
        return f"{username[:22]}{secrets.token_hex(4)}"
    
    def _generate_tokens(self, user: User) -> Dict[str, str]:
        """
        Generate JWT tokens for user.
        
        Args:
            user: User instance
            
        Returns:
            Dict with 'access' and 'refresh' token strings
        """
        refresh = RefreshToken.for_user(user)
        return {
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        }
