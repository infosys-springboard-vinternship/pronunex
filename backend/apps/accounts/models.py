"""
Custom User Model for Pronunex.

Implements email-based authentication with proficiency tracking.
"""

from django.contrib.auth.models import AbstractUser
from django.core.validators import MinValueValidator, MaxValueValidator
from django.db import models
import secrets


class User(AbstractUser):
    """
    Custom user model with email-based authentication.
    Tracks native language and proficiency level for adaptive exercises.
    """
    
    PROFICIENCY_CHOICES = [
        ('beginner', 'Beginner'),
        ('intermediate', 'Intermediate'),
        ('advanced', 'Advanced'),
    ]
    
    email = models.EmailField(unique=True)
    full_name = models.CharField(max_length=100)
    native_language = models.CharField(max_length=50, blank=True)
    proficiency_level = models.CharField(
        max_length=20, 
        choices=PROFICIENCY_CHOICES, 
        default='beginner'
    )
    daily_goal_target = models.PositiveSmallIntegerField(
        default=10,
        validators=[MinValueValidator(1), MaxValueValidator(50)],
        help_text='Number of sentences the user aims to practice each day'
    )
    is_email_verified = models.BooleanField(default=False)
    avatar_id = models.CharField(
        max_length=20,
        default='avatar-1',
        help_text='ID of predefined avatar (avatar-1 to avatar-11)'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username', 'full_name']
    
    class Meta:
        verbose_name = 'User'
        verbose_name_plural = 'Users'
        ordering = ['-created_at']
    
    def __str__(self):
        return self.email


class PasswordResetToken(models.Model):
    """
    Token model for password reset functionality.
    
    Security: Tokens are stored as SHA-256 hashes.
    Raw tokens are returned only at creation time (to send via email).
    """
    
    user = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='reset_tokens'
    )
    token_hash = models.CharField(
        max_length=64, 
        unique=True,
        help_text='SHA-256 hash of the reset token'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)
    
    class Meta:
        verbose_name = 'Password Reset Token'
        verbose_name_plural = 'Password Reset Tokens'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Reset token for {self.user.email}"
    
    @classmethod
    def generate_raw_token(cls):
        """Generate a cryptographically secure raw token."""
        return secrets.token_urlsafe(48)
    
    @classmethod
    def hash_token(cls, raw_token: str) -> str:
        """Hash a raw token using SHA-256."""
        import hashlib
        return hashlib.sha256(raw_token.encode()).hexdigest()
    
    @classmethod
    def create_token(cls, user, expires_at):
        """
        Create a new password reset token.
        
        Args:
            user: User instance
            expires_at: Expiration datetime
            
        Returns:
            The raw token (to send via email). Hash is stored in DB.
        """
        raw_token = cls.generate_raw_token()
        token_hash = cls.hash_token(raw_token)
        
        cls.objects.create(
            user=user,
            token_hash=token_hash,
            expires_at=expires_at
        )
        
        return raw_token
    
    @classmethod
    def validate_token(cls, raw_token: str):
        """
        Validate a raw token by comparing its hash.
        
        Args:
            raw_token: The raw token from the reset link
            
        Returns:
            PasswordResetToken instance if valid and unused, None otherwise
        """
        token_hash = cls.hash_token(raw_token)
        try:
            return cls.objects.get(token_hash=token_hash, is_used=False)
        except cls.DoesNotExist:
            return None
