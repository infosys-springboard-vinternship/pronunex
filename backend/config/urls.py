"""
URL configuration for Pronunex backend.

API endpoints are versioned under /api/v1/
"""

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # API v1 endpoints
    path('api/v1/auth/', include('apps.accounts.urls')),
    path('api/v1/library/', include('apps.library.urls')),
    path('api/v1/practice/', include('apps.practice.urls')),
    path('api/v1/', include('apps.analytics.urls')),
    
    # Admin API endpoints
    path('api/v1/admin/', include('apps.accounts.admin_urls')),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
