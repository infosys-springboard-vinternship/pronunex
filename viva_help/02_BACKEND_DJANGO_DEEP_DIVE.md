# Backend (Django) Deep Dive

## 1. Project Configuration (`config/settings.py`)

### What is `settings.py`?
"It is the central configuration file for the entire Django backend. Every setting — database, authentication, middleware, scoring thresholds, API keys — is defined here."

### Key Settings Explained

#### Custom User Model
```python
AUTH_USER_MODEL = 'accounts.User'
```
**Q: Why use a custom user model?**
"Django's default User model uses username for login. We switched to email-based authentication because emails are unique and more natural for web apps. The custom User also adds fields like `proficiency_level`, `native_language`, `avatar_id`, and `daily_goal_target` that are specific to our speech therapy domain."

#### REST Framework Configuration
```python
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': ['rest_framework_simplejwt.authentication.JWTAuthentication'],
    'DEFAULT_PERMISSION_CLASSES': ['rest_framework.permissions.IsAuthenticated'],
    'DEFAULT_THROTTLE_RATES': {
        'login': '5/minute',
        'password_reset': '3/hour',
        'signup': '10/hour',
    },
}
```
**Q: Why JWT instead of session-based auth?**
"JWT is stateless — the server doesn't need to store session data. The React frontend sends the JWT in the Authorization header with every request. This is perfect for SPA architecture where frontend and backend run on different ports/domains."

**Q: What is throttling?**
"Rate limiting. We limit login to 5 attempts per minute to prevent brute-force attacks. Password reset is limited to 3 per hour to prevent email spam."

#### JWT Configuration
```python
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
}
```
**Q: What does ROTATE_REFRESH_TOKENS mean?**
"Every time a refresh token is used to get a new access token, the backend also issues a NEW refresh token and blacklists the old one. This means a stolen refresh token can only be used once before it becomes invalid."

#### Database Switching
```python
USE_SUPABASE = os.getenv('USE_SUPABASE', 'false').lower() == 'true'
if USE_SUPABASE and DATABASE_URL:
    DATABASES = {'default': dj_database_url.parse(DATABASE_URL)}
else:
    DATABASES = {'default': {'ENGINE': 'django.db.backends.sqlite3', ...}}
```
**Q: How does the database switching work?**
"A single environment variable `USE_SUPABASE` controls whether we use local SQLite or remote PostgreSQL. In development, we use SQLite for zero configuration. In production, we flip the flag and use Supabase PostgreSQL. The same code runs on both — Django's ORM abstracts the database difference."

#### Scoring Configuration (Centralized)
```python
SCORING_CONFIG = {
    'WEAK_PHONEME_THRESHOLD': 0.85,
    'SCORE_BOOST': 0.15,
    'EMBEDDING_DIM': 768,
    'SAMPLE_RATE': 16000,
}
```
**Q: Why centralize scoring config in settings?**
"So we can tune the entire scoring system from one place. If the mentor says 'make scoring stricter,' we just change `WEAK_PHONEME_THRESHOLD` from 0.85 to 0.90, and it propagates to every module that uses it."

---

## 2. URL Routing

### Root URLs (`config/urls.py`)
```python
urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/auth/', include('apps.accounts.urls')),
    path('api/v1/admin/', include('apps.accounts.admin_urls')),
    path('api/v1/library/', include('apps.library.urls')),
    path('api/v1/practice/', include('apps.practice.urls')),
    path('api/v1/', include('apps.analytics.urls')),
]
```

**Q: Why version the API with `/api/v1/`?**
"API versioning. If we need breaking changes later, we create `/api/v2/` endpoints while keeping v1 working. This prevents breaking existing clients."

**Q: What does `include()` do?**
"It delegates URL resolution to each app's own `urls.py`. This keeps routing modular — each app manages its own URLs rather than having one giant file."

### Complete API Endpoint Map

| Endpoint | Method | Purpose | Auth Required |
|----------|--------|---------|---------------|
| `/api/v1/auth/register/` | POST | Create new user account | No |
| `/api/v1/auth/login/` | POST | Authenticate and get JWT tokens | No |
| `/api/v1/auth/logout/` | POST | Blacklist refresh token | No (intentional) |
| `/api/v1/auth/token/refresh/` | POST | Get new access token | No |
| `/api/v1/auth/profile/` | GET/PUT | View/update user profile | Yes |
| `/api/v1/auth/password/reset/` | POST | Request password reset email | No |
| `/api/v1/auth/password/change/` | POST | Change password while logged in | Yes |
| `/api/v1/auth/google/` | POST | Google OAuth login | No |
| `/api/v1/library/phonemes/` | GET | List all 44 English phonemes | Yes |
| `/api/v1/library/sentences/` | GET | List practice sentences (filterable) | Yes |
| `/api/v1/library/sentences/{id}/audio/` | GET | Get/generate reference audio | Yes |
| `/api/v1/library/sentences/recommend/` | GET | Personalized recommendations | Yes |
| `/api/v1/practice/assess/` | POST | **Core endpoint** - assess pronunciation | Yes |
| `/api/v1/practice/attempt-feedback/` | GET | Poll for async LLM feedback | Yes |
| `/api/v1/practice/sessions/` | GET/POST | List/create practice sessions | Yes |
| `/api/v1/practice/sublevel-session/` | GET/POST | Get/create locked sublevel | Yes |
| `/api/v1/practice/sublevel-complete/` | POST | Record sublevel completion | Yes |
| `/api/v1/analytics/progress/` | GET | Dashboard data (cached 5 min) | Yes |
| `/api/v1/analytics/phonemes/` | GET | Per-phoneme analytics | Yes |
| `/api/v1/admin/stats/` | GET | System-wide analytics | Admin only |
| `/api/v1/admin/users/` | GET | User management list | Admin only |
| `/api/v1/admin/users/{id}/` | GET/PATCH/DELETE | User detail/edit/delete | Admin only |

---

## 3. Models (Database Schema)

### User Model (`accounts/models.py`)
```python
class User(AbstractUser):
    email = models.EmailField(unique=True)
    full_name = models.CharField(max_length=100)
    proficiency_level = models.CharField(choices=PROFICIENCY_CHOICES, default='beginner')
    daily_goal_target = models.PositiveSmallIntegerField(default=10)
    avatar_id = models.CharField(default='avatar-1')
    last_active = models.DateTimeField(null=True)
    
    USERNAME_FIELD = 'email'  # Login with email, not username
    REQUIRED_FIELDS = ['username', 'full_name']
```

**Q: What is `AbstractUser`?**
"It's Django's built-in user model that includes username, password hashing, is_active, is_staff, last_login etc. We extend it with our custom fields. Using `AbstractUser` means we keep all the authentication machinery Django provides."

**Q: What is `USERNAME_FIELD = 'email'`?**
"This tells Django to use the email field for authentication instead of the default username field. When a user logs in, they enter their email, not a username."

### PasswordResetToken Model
```python
class PasswordResetToken(models.Model):
    token_hash = models.CharField(max_length=64, unique=True)  # SHA-256 hash
    
    @classmethod
    def create_token(cls, user, expires_at):
        raw_token = cls.generate_raw_token()   # cryptographically secure
        token_hash = cls.hash_token(raw_token)  # SHA-256
        cls.objects.create(user=user, token_hash=token_hash, expires_at=expires_at)
        return raw_token  # ONLY returned once, then discarded
```

**Q: Why hash the reset token?**
"Security. If the database is breached, attackers see SHA-256 hashes, not usable tokens. The raw token is sent via email and never stored. When the user clicks the reset link, we hash the received token and compare it with the stored hash."

### ReferenceSentence Model (`library/models.py`)
```python
class ReferenceSentence(models.Model):
    text = models.TextField()
    phoneme_sequence = models.JSONField()      # Precomputed: ["DH", "AH0", "K", "W", "IH1", "K"]
    alignment_map = models.JSONField()         # Precomputed timestamps
    reference_embeddings = models.BinaryField() # Cached Wav2Vec2 embeddings
    audio_file = models.FileField()            # TTS-generated reference audio
    difficulty_level = models.CharField(choices=[('core','Core'), ('edge','Edge'), ('elite','Elite')])
```

**Q: Why store phoneme_sequence as JSONField?**
"Because a phoneme sequence is a variable-length list of strings. JSON is the natural way to store it. Django's JSONField maps directly to the database's JSON column type (or TEXT in SQLite), and DRF serializes it automatically."

**Q: What are reference_embeddings?**
"These are the 'gold standard' Wav2Vec2 neural embeddings for correct pronunciation. When a user speaks, we generate their embeddings and compare with these cached reference embeddings using cosine similarity. The score tells us how close the user's pronunciation is to the reference."

### Attempt Model (`practice/models.py`)
```python
class Attempt(models.Model):
    session = models.ForeignKey(UserSession, related_name='attempts')
    sentence = models.ForeignKey(ReferenceSentence, related_name='user_attempts')
    audio_file = models.FileField(upload_to='user_uploads/')
    score = models.FloatField()                 # Overall (0-1)
    phoneme_scores = models.JSONField()          # Per-phoneme detail
    llm_feedback = models.JSONField()            # LLM-generated coaching text
    processing_time_ms = models.IntegerField()   # Pipeline performance tracking
```

**Q: What is `related_name`?**
"It's the reverse accessor name. With `related_name='attempts'`, from a UserSession object I can call `session.attempts.all()` to get all attempts belonging to that session. Without it, Django would auto-generate `attempt_set` which is less readable."

---

## 4. Views (API Endpoints)

### View Pattern Used
"We use a mix of DRF class-based views:"
- **`generics.ListCreateAPIView`** — For endpoints that support both listing and creating (GET + POST)
- **`generics.RetrieveUpdateAPIView`** — For single-object GET + PUT
- **`APIView`** — For custom logic that doesn't fit CRUD patterns

### The Assessment View (Most Important!)
```python
class AssessmentView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]  # Accept file uploads
    
    def post(self, request):
        # 1. Validate input (sentence_id + audio file)
        # 2. Get or create active session
        # 3. Run assessment pipeline (AssessmentService)
        # 4. Save attempt + phoneme errors to DB
        # 5. Start async threads for: analytics update + LLM feedback
        # 6. Build instant fallback feedback
        # 7. Return scores immediately
```

**Q: Why `MultiPartParser`?**
"Because the frontend sends an audio file (binary data) along with form data (sentence_id). `MultiPartParser` handles `multipart/form-data` encoding, which is how browsers send file uploads."

**Q: Why async threads for feedback?**
"The assessment scores are computed in ~2-3 seconds. LLM feedback takes another 2-7 seconds. Instead of making the user wait 5-10 seconds total, we return scores immediately and generate LLM feedback in a background thread. The frontend polls `/attempt-feedback/` to check when the LLM feedback is ready."

### Serializers

**Q: What is a Serializer?**
"A serializer converts complex data types (Django model instances, querysets) to Python dictionaries that can be rendered into JSON. It also handles input validation — converting incoming JSON data into validated Python objects."

```python
class SignupSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True)
    
    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({'password_confirm': 'Passwords do not match.'})
        return attrs
    
    def create(self, validated_data):
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')
        user = User.objects.create(**validated_data)
        user.set_password(password)  # Hashes the password
        user.save()
        return user
```

**Q: Why `write_only=True` on password?**
"So the password is never included in API responses. It's only accepted in incoming requests."

**Q: What does `set_password()` do?**
"It hashes the password using Django's PBKDF2 algorithm with SHA-256. The raw password is never stored in the database."

---

## 5. Middleware (`accounts/middleware.py`)

```python
class UserActivityMiddleware:
    THROTTLE_SECONDS = 60
    
    def __call__(self, request):
        response = self.get_response(request)
        user = getattr(request, 'user', None)
        if user and user.is_authenticated:
            cache_key = f'user_activity_{user.pk}'
            if not cache.get(cache_key):
                User.objects.filter(pk=user.pk).update(last_active=timezone.now())
                cache.set(cache_key, True, self.THROTTLE_SECONDS)
        return response
```

**Q: What is middleware?**
"Middleware is code that runs on every request/response cycle. It's like a pipeline — the request passes through each middleware layer before reaching the view, and the response passes back through them. Our `UserActivityMiddleware` updates `last_active` on every authenticated request."

**Q: Why throttle with cache?**
"Without throttling, every single API call would trigger a database UPDATE query. If a user makes 50 requests in a minute, that's 50 unnecessary writes. By using cache, we only write to DB once per 60 seconds per user, reducing database load by ~98%."

---

## 6. Django Signals (`practice/signals.py`)

```python
@receiver(post_save, sender=Attempt)
def invalidate_dashboard_cache(sender, instance, created, **kwargs):
    if not created:
        return
    user_id = instance.session.user_id
    for days in (7, 30, 90):
        cache.delete(f"dashboard:{user_id}:{days}")
```

**Q: What are signals?**
"Signals are Django's way of implementing the Observer pattern. When a model is saved, Django fires a `post_save` signal. Our receiver listens for new Attempt objects and invalidates the cached dashboard data, ensuring the user sees fresh stats after practicing."

**Q: Why not just clear cache in the view?**
"Separation of concerns. The view shouldn't know about caching strategy. The signal approach is decoupled — if we add another place that creates Attempts (e.g., bulk import), the cache still gets invalidated automatically."

---

## 7. ORM Usage Examples

### Annotate + Aggregate
```python
# From admin_views.py - annotating user queryset with computed fields
queryset = User.objects.annotate(
    sessions_count=Count('practice_sessions', distinct=True),
    avg_score=Avg('practice_sessions__attempts__score'),
)
```
"This adds computed fields to each User object. `sessions_count` counts how many practice sessions each user has. `avg_score` follows two foreign key relationships (`User → UserSession → Attempt`) to calculate the average score. All of this happens in a single SQL query, not in Python loops."

### Bulk Create
```python
# From practice/views.py - saving multiple PhonemeErrors efficiently
PhonemeError.objects.bulk_create(errors_to_create)
```
"Instead of calling `.create()` 20 times (one per phoneme), `bulk_create` does it in ONE SQL INSERT statement. This is ~20x faster for large batches."

### select_related vs prefetch_related
```python
# select_related: JOIN in SQL (for ForeignKey/OneToOne)
Attempt.objects.filter(...).select_related('sentence')

# prefetch_related: Separate query (for reverse FK/M2M)
Attempt.objects.filter(...).prefetch_related('phoneme_errors')
```
"**select_related** does a SQL JOIN — fetches related objects in one query. Used for forward ForeignKey relationships. **prefetch_related** does a second query and joins in Python — used for reverse relationships or ManyToMany. Both prevent the N+1 query problem."
