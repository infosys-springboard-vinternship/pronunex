# System Design & End-to-End Flow

## 1. System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                           USER (Browser)                           │
│                                                                     │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐            │
│   │  Landing Page │  │   Dashboard  │  │   Practice   │            │
│   │  (Public)     │  │  (Protected) │  │  (Protected) │            │
│   └───────┬──────┘  └──────┬───────┘  └──────┬───────┘            │
│           │                │                  │                     │
│           └────────────────┼──────────────────┘                    │
│                            │                                        │
│                    ┌───────▼──────┐                                 │
│                    │   ApiClient  │  JWT in Authorization header    │
│                    │  (Singleton) │  Auto token refresh             │
│                    └───────┬──────┘                                 │
└────────────────────────────┼────────────────────────────────────────┘
                             │  HTTP/HTTPS
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        DJANGO BACKEND                               │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    MIDDLEWARE CHAIN                           │   │
│  │  CORS → JWT Auth → UserActivity → Request → Response         │   │
│  └─────────────────────────────┬───────────────────────────────┘   │
│                                │                                    │
│  ┌─────────────────────────────▼───────────────────────────────┐   │
│  │                      URL ROUTER                              │   │
│  │  /api/v1/auth/     → accounts app                            │   │
│  │  /api/v1/library/  → library app                             │   │
│  │  /api/v1/practice/ → practice app                            │   │
│  │  /api/v1/analytics → analytics app                           │   │
│  │  /api/v1/admin/    → admin views                             │   │
│  └─────────────────────────────┬───────────────────────────────┘   │
│                                │                                    │
│  ┌─────────┬──────────┬────────┼────────┬──────────┬────────┐      │
│  │accounts │ library  │practice│analytics│llm_engine│sentence│      │
│  │  app    │   app    │  app   │   app   │   app    │_engine │      │
│  └────┬────┴────┬─────┴───┬────┴────┬────┴────┬─────┴───┬────┘      │
│       │         │         │         │         │         │            │
│  ┌────▼─────────▼─────────▼─────────▼─────────▼────┐    │            │
│  │              SERVICE LAYER                       │    │            │
│  │  AuthService │ LibraryService │ AssessmentService│    │            │
│  │  AnalyticsService │ FeedbackGenerator            │    │            │
│  └──────────────────────┬───────────────────────────┘    │            │
│                         │                                │            │
│  ┌──────────────────────▼────────────────────────────┐   │            │
│  │              NLP CORE (Deterministic)              │   │            │
│  │  audio_cleaner → asr_validator → aligner →         │   │            │
│  │  vectorizer → scorer → mistake_detector            │   │            │
│  └───────────────────────┬────────────────────────────┘   │            │
│                          │                                │            │
│  ┌───────────────────────▼──┐  ┌──────────────────────┐  │            │
│  │      Database (ORM)      │  │   External Services   │  │            │
│  │  SQLite / PostgreSQL     │  │  Groq Whisper (ASR)   │  │            │
│  │  (via Supabase)          │  │  Groq Orpheus (TTS)   │  │            │
│  └──────────────────────────┘  │  Groq/Cerebras (LLM)  │  │            │
│                                │  Supabase (Auth/S3)    │  │            │
│                                └──────────────────────┘  │            │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Complete User Journey Flows

### Flow A: New User Registration → First Practice Session
```
1. User visits landing page (/)
2. Clicks "Get Started" → redirected to /register
3. Fills form: email, username, full_name, password
4. Frontend: POST /api/v1/auth/register/
   Backend: validate → create user (password hashed) → return JWT tokens
5. Frontend: stores tokens in sessionStorage, redirects to /dashboard
6. Dashboard loads: GET /api/v1/analytics/progress/?days=30
   Backend: empty data (new user, no attempts)
7. User clicks "Start Practice" → navigates to /practice
8. Practice page loads: GET /api/v1/library/sentences/?difficulty=core
   Backend: returns first batch of sentences
9. User sees sentence, clicks Record, speaks into microphone
10. Frontend: captures audio via MediaRecorder → creates Blob
11. User clicks Submit
12. Frontend: POST /api/v1/practice/assess/ (FormData with audio + sentence_id)
13. Backend NLP Pipeline:
    a. Clean audio (webm → wav, 16kHz, denoise)
    b. ASR validation (Groq Whisper transcription → compare with expected)
    c. If match: forced alignment → embedding extraction → cosine scoring
    d. Save Attempt + PhonemeErrors to DB
    e. Launch async threads: LLM feedback + analytics update
    f. Return instant scores
14. Frontend: displays score ring, phoneme breakdown, word highlights
15. Frontend: polls /practice/attempt-feedback/ every 2s for LLM feedback
16. When LLM feedback arrives: displays coaching tips
17. User practices more sentences → repeat steps 9-16
18. Dashboard cache is auto-invalidated (Django signal on Attempt save)
```

### Flow B: Returning User Login → Dashboard
```
1. User visits /login
2. Enters email + password
3. Frontend: POST /api/v1/auth/login/
   Backend: authenticate → generate JWT pair → return with user data
4. Frontend: stores tokens in sessionStorage
5. Redirect to /dashboard
6. Dashboard component mounts → useDashboard() hook fires
7. Hook: GET /api/v1/analytics/progress/?days=30
   Backend: check cache → if cached, return immediately
            if not cached, aggregate: overall score, fluency, streak,
            daily activity, phoneme weaknesses → cache result → return
8. Dashboard renders: stat cards, trend charts, weakness heatmap
```

### Flow C: Token Expiry → Auto Refresh
```
1. User is on dashboard, access token expires (1 hour)
2. Next API call returns 401 Unauthorized
3. ApiClient interceptor catches 401
4. ApiClient: POST /api/v1/auth/token/refresh/ { refresh: "..." }
   Backend: validate refresh token → generate new access + refresh
            → blacklist old refresh token → return new tokens
5. ApiClient: stores new tokens → retries original request
6. User sees no interruption
```

### Flow D: Password Reset (Forgot Password)
```
1. User clicks "Forgot Password" on login page
2. Enters email → POST /api/v1/auth/password/reset/
3. Backend:
   a. Always returns 200 OK (prevent user enumeration)
   b. If email exists: generate random token → hash with SHA-256
      → store hash in DB → send raw token via email link
4. User clicks link in email: /reset-password?token=RAW_TOKEN
5. User enters new password → POST /api/v1/auth/password/reset/confirm/
   { token: "RAW_TOKEN", new_password: "..." }
6. Backend: hash received token → find matching hash in DB
   → check expiry → update password → delete token record
7. User redirected to login with success message
```

---

## 3. Data Flow: Assessment Request (Detailed)

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Frontend   │     │   Backend    │     │   External   │
│   (React)    │     │   (Django)   │     │   Services   │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                    │
       │ POST /assess/      │                    │
       │ (audio + id)       │                    │
       │ ──────────────────>│                    │
       │                    │                    │
       │                    │ clean audio        │
       │                    │ (ffmpeg, denoise)  │
       │                    │                    │
       │                    │ send audio ──────> │ Groq Whisper
       │                    │                    │ (ASR)
       │                    │ <── transcription ─│
       │                    │                    │
       │                    │ validate text match│
       │                    │ (SequenceMatcher)  │
       │                    │                    │
       │                    │ forced alignment   │
       │                    │ (phoneme slicing)  │
       │                    │                    │
       │                    │ Wav2Vec2 embeddings│
       │                    │ (PyTorch, local)   │
       │                    │                    │
       │                    │ cosine similarity  │
       │                    │ (scipy, local)     │
       │                    │                    │
       │                    │ save to DB         │
       │                    │                    │
       │  instant scores    │                    │
       │ <──────────────────│                    │
       │                    │                    │
       │                    │──── async thread ─>│ Groq LLM
       │                    │                    │ (feedback)
       │                    │ <── LLM response ──│
       │                    │                    │
       │                    │ save feedback to DB│
       │                    │                    │
       │ poll /feedback     │                    │
       │ ──────────────────>│                    │
       │  LLM feedback      │                    │
       │ <──────────────────│                    │
```

---

## 4. Caching Architecture

```
┌────────────────────────────────────────────────────┐
│                 CACHING LAYERS                      │
│                                                     │
│  Layer 1: Frontend (Module-level cache)             │
│  ┌─────────────────────────────────────────┐       │
│  │ useDashboard: _cache (5 min TTL)        │       │
│  │ - Prevents duplicate API calls          │       │
│  │ - Shared across all component instances │       │
│  │ - Invalidated after new assessment      │       │
│  └─────────────────────────┬───────────────┘       │
│                            │ (cache miss)           │
│                            ▼                        │
│  Layer 2: Backend (Django LocMemCache)              │
│  ┌─────────────────────────────────────────┐       │
│  │ dashboard:{user_id}:{days} (5 min TTL)  │       │
│  │ phoneme_analytics:{user_id} (5 min TTL) │       │
│  │ user_activity_{user_pk} (60 sec TTL)    │       │
│  │                                          │       │
│  │ Invalidated by Django signals:           │       │
│  │ post_save(Attempt) → delete cache keys   │       │
│  └─────────────────────────┬───────────────┘       │
│                            │ (cache miss)           │
│                            ▼                        │
│  Layer 3: Database (PostgreSQL / SQLite)            │
│  ┌─────────────────────────────────────────┐       │
│  │ Actual data source                       │       │
│  │ Aggregation queries (Avg, Count, etc.)   │       │
│  └─────────────────────────────────────────┘       │
└────────────────────────────────────────────────────┘
```

**Q: Why LocMemCache and not Redis?**
"LocMemCache stores data in the Django process's memory. For a single-server deployment, it's faster than Redis (no network round-trip) and requires zero additional infrastructure. The trade-off is that cache is lost on server restart, but our data can always be recomputed from the database."

---

## 5. Error Handling Strategy

### Backend Error Hierarchy
```
API Request
    ├── Validation Error (400) — Bad input data
    │   Serializer.is_valid() raises ValidationError
    │
    ├── Authentication Error (401) — Missing/invalid JWT
    │   JWTAuthentication middleware
    │
    ├── Permission Error (403) — Valid JWT but not allowed
    │   IsAdminUser / IsAuthenticated
    │
    ├── Not Found (404) — Resource doesn't exist
    │   Model.objects.get() raises DoesNotExist
    │
    ├── Rate Limited (429) — Too many requests
    │   Custom throttle classes
    │
    └── Server Error (500) — Unhandled exception
        Caught by DRF's exception handler
```

### Frontend Error Handling
```javascript
class ApiError {
    constructor(code, message, status, details) {
        this.code = code;        // 'VALIDATION_ERROR', 'AUTH_ERROR', etc.
        this.message = message;  // Human-readable message
        this.status = status;    // HTTP status code
        this.details = details;  // Field-level errors
    }
}

// Usage in components
try {
    await api.post('/auth/login/', credentials);
} catch (error) {
    if (error instanceof ApiError) {
        if (error.status === 401) toast.error('Invalid credentials');
        if (error.status === 429) toast.error('Too many attempts. Try later.');
        if (error.details?.email) setFieldError('email', error.details.email);
    } else {
        toast.error('Network error. Check your connection.');
    }
}
```

---

## 6. Scalability Considerations

**Q: What would you change if Pronunex had 10,000 users?**

| Current | Scaled |
|---------|--------|
| SQLite | PostgreSQL (connection pooling) |
| LocMemCache | Redis (shared across workers) |
| Single Django process | Gunicorn with 4-8 workers |
| Local file storage | Supabase S3 / AWS S3 |
| Threading for async | Celery task queue |
| In-process Wav2Vec2 | Dedicated ML inference server |

**Q: What would you change if the NLP pipeline was too slow?**
"Three optimizations:
1. **GPU inference** for Wav2Vec2 (10x faster embeddings)
2. **Batch processing** — process multiple phonemes in one model pass
3. **Model distillation** — use a smaller, fine-tuned model instead of wav2vec2-base"

**Q: Is the system horizontally scalable?**
"Yes, with modifications. The stateless JWT auth means any server can handle any request. The main bottleneck is the NLP pipeline, which is CPU-bound. We'd need to move to a task queue (Celery + Redis) so NLP processing can be distributed across multiple workers."

---

## 7. File Storage Architecture

```
Development Mode (USE_SUPABASE=false):
    ├── media/
    │   ├── references/           # TTS-generated reference audio
    │   │   └── sentence_42.wav
    │   └── user_uploads/         # User recording audio
    │       └── attempt_123.webm
    └── Served by Django's runserver

Production Mode (USE_SUPABASE=true):
    ├── Supabase Storage (S3-compatible)
    │   ├── references bucket
    │   └── user-uploads bucket
    └── Served by Supabase CDN
```

**Q: How does the switching work in code?**
```python
# settings.py
if USE_SUPABASE:
    DEFAULT_FILE_STORAGE = 'config.storage_backends.SupabaseStorage'
else:
    # Default Django file storage (local filesystem)
    pass
```
"Django's `FileField` uses `DEFAULT_FILE_STORAGE` for all file operations. By changing this setting, ALL file uploads/downloads transparently switch between local and S3 storage without changing any model or view code."
