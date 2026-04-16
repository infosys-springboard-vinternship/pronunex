# API Design & Data Flow

## 1. How APIs Are Built (DRF Pattern)

### Request → Response Lifecycle
```
Client (React) sends HTTP request
        │
        ▼
Django Middleware Chain (CORS → Auth → UserActivity)
        │
        ▼
URL Router → matches /api/v1/practice/assess/
        │
        ▼
DRF View → AssessmentView.post()
  ├── Authentication: JWTAuthentication checks Authorization header
  ├── Permission: IsAuthenticated verifies token is valid
  ├── Parser: MultiPartParser decodes multipart/form-data
  ├── Serializer: validates input data
  ├── Service Layer: runs business logic
  └── Response: returns JSON with status code
        │
        ▼
Django Middleware Chain (reverse)
        │
        ▼
HTTP Response → Client
```

**Q: What is the difference between Authentication and Permission?**
- **Authentication:** "WHO are you?" — Extracts user identity from JWT token
- **Permission:** "Are you ALLOWED?" — Checks if authenticated user has the right role (e.g., `IsAdminUser` checks `is_staff=True`)

**Q: What are Parsers?**
"Parsers decode the request body into Python data structures. `JSONParser` handles `application/json`, `MultiPartParser` handles `multipart/form-data` (file uploads), `FormParser` handles `application/x-www-form-urlencoded`."

---

## 2. Complete Request-Response Flow: Assessment Endpoint

This is the **most critical API flow** — know it step by step.

### Frontend Side
```javascript
// In the Practice page component
const handleSubmit = async () => {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');  // Binary file
    formData.append('sentence_id', currentSentence.id);      // Integer

    const response = await api.post(ENDPOINTS.PRACTICE.ASSESS, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    
    // response.data contains: { score, phoneme_scores, word_scores, asr_result, ... }
    setResults(response.data);
    
    // Start polling for LLM feedback
    pollForFeedback(response.data.attempt_id);
};
```

### Backend Side (What happens behind the scenes)

**Step 1: Request arrives at `AssessmentView.post()`**
```python
class AssessmentView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    
    def post(self, request):
        sentence_id = request.data.get('sentence_id')
        audio_file = request.FILES.get('audio')
        
        # Validate inputs
        if not sentence_id or not audio_file:
            return Response({'error': 'Missing required fields'}, status=400)
```

**Step 2: Get or create active session**
```python
        # Find user's active session or create new one
        session = UserSession.objects.filter(
            user=request.user,
            ended_at__isnull=True  # Not yet ended
        ).first()
        
        if not session:
            session = UserSession.objects.create(user=request.user)
```

**Step 3: Save uploaded audio temporarily**
```python
        # Save to temp file for NLP processing
        import tempfile
        with tempfile.NamedTemporaryFile(suffix='.webm', delete=False) as tmp:
            for chunk in audio_file.chunks():
                tmp.write(chunk)
            audio_path = tmp.name
```

**Step 4: Run AssessmentService (NLP Pipeline)**
```python
        service = AssessmentService()
        result = service.process_attempt(audio_path, sentence, request.user)
        
        # result = {
        #     'score': 0.82,
        #     'phoneme_scores': [{phoneme: 'SH', score: 0.91, is_weak: False}, ...],
        #     'word_scores': [{word: 'she', score: 0.91}, ...],
        #     'asr_result': {status: 'match', similarity: 0.95, ...},
        #     'error_summary': {weak_count: 2, substitutions: [...], ...}
        # }
```

**Step 5: Save Attempt to database**
```python
        attempt = Attempt.objects.create(
            session=session,
            sentence=sentence,
            score=result['score'],
            phoneme_scores=result['phoneme_scores'],  # JSONField
            processing_time_ms=result['processing_time_ms'],
        )
        
        # Bulk create phoneme errors
        errors = [
            PhonemeError(attempt=attempt, phoneme=ps['phoneme'], score=ps['score'], ...)
            for ps in result['phoneme_scores'] if ps['is_weak']
        ]
        PhonemeError.objects.bulk_create(errors)
```

**Step 6: Launch async tasks**
```python
        # Background thread 1: LLM feedback generation
        import threading
        threading.Thread(
            target=self._generate_feedback_async,
            args=(attempt.id, result['phoneme_scores'], sentence.text, result['score']),
            daemon=True
        ).start()
        
        # Background thread 2: Analytics update
        threading.Thread(
            target=self._update_analytics_async,
            args=(request.user, result['score'], result['phoneme_scores']),
            daemon=True
        ).start()
```

**Step 7: Return instant response**
```python
        return Response({
            'attempt_id': str(attempt.id),
            'score': result['score'],
            'phoneme_scores': result['phoneme_scores'],
            'word_scores': result.get('word_scores', []),
            'asr_result': {
                'status': result['asr_result']['status'],
                'transcribed': result['asr_result']['transcribed'],
                'word_diff': result['asr_result']['word_diff'],
            },
            'feedback': fallback_feedback,  # Instant rule-based feedback
        }, status=200)
```

### Frontend Polling for LLM Feedback
```javascript
const pollForFeedback = async (attemptId) => {
    const maxAttempts = 10;
    for (let i = 0; i < maxAttempts; i++) {
        await sleep(2000);  // Wait 2 seconds between polls
        
        const response = await api.get(
            `${ENDPOINTS.PRACTICE.ATTEMPT_FEEDBACK}?attempt_id=${attemptId}`
        );
        
        if (response.data.feedback) {
            setLlmFeedback(response.data.feedback);
            return;
        }
    }
    // If 10 polls fail, user keeps the instant fallback feedback
};
```

---

## 3. Authentication Flow

### Login Flow
```
Frontend                          Backend
   │                                │
   │  POST /api/v1/auth/login/      │
   │  { email, password }           │
   │ ─────────────────────────────> │
   │                                │ → Validate credentials
   │                                │ → Generate JWT pair (access + refresh)
   │                                │ → Update last_login timestamp
   │  { access, refresh, user }     │
   │ <───────────────────────────── │
   │                                │
   │  Store tokens in sessionStorage│
   │  (NOT localStorage for security)
   │                                │
   │  Every subsequent request:     │
   │  Authorization: Bearer <access>│
   │ ─────────────────────────────> │
   │                                │ → JWTAuthentication middleware
   │                                │ → Decode token, get user_id
   │                                │ → Attach user to request
```

**Q: Why sessionStorage instead of localStorage?**
"sessionStorage is cleared when the browser tab is closed. If a user walks away from a public computer and closes the tab, their tokens are automatically gone. localStorage persists forever, which is a security risk."

**Q: What happens when the access token expires?**
```javascript
// In ApiClient.request() - Automatic token refresh
if (response.status === 401) {
    const refreshed = await this._refreshToken();
    if (refreshed) {
        return this.request(method, endpoint, data, options);  // Retry original request
    } else {
        this._handleAuthFailure();  // Redirect to login
    }
}
```
"The API client has a 401 interceptor. When a request fails with Unauthorized, it automatically tries to refresh the token using the refresh token. If successful, it retries the original request. If the refresh also fails (token expired or blacklisted), it redirects to login."

### Token Refresh Flow
```
Frontend                          Backend
   │                                │
   │  POST /api/v1/auth/token/refresh/
   │  { refresh: "old_refresh_token" }
   │ ─────────────────────────────> │
   │                                │ → Validate refresh token
   │                                │ → Generate NEW access token
   │                                │ → Generate NEW refresh token (rotation)
   │                                │ → BLACKLIST old refresh token
   │  { access: "new", refresh: "new" }
   │ <───────────────────────────── │
```

---

## 4. Password Reset Flow (Security-Critical)

```
User clicks "Forgot Password"
        │
        ▼
Frontend: POST /api/v1/auth/password/reset/
          { email: "user@example.com" }
        │
        ▼
Backend:
  1. Always returns 200 (prevents user enumeration)
  2. If email exists:
     a. Generate cryptographically secure token (secrets.token_urlsafe)
     b. Hash token with SHA-256
     c. Store HASH in PasswordResetToken table
     d. Send raw token via email link
  3. If email doesn't exist: do nothing, still return 200
        │
        ▼
User clicks email link: /reset-password?token=RAW_TOKEN
        │
        ▼
Frontend: POST /api/v1/auth/password/reset/confirm/
          { token: "RAW_TOKEN", new_password: "..." }
        │
        ▼
Backend:
  1. Hash received token with SHA-256
  2. Look up hash in DB
  3. Check expiration (1 hour)
  4. If valid: update password, delete token
  5. If invalid: return 400
```

**Q: Why hash the token before storing?**
"If the database is breached, attackers would see raw reset tokens and could reset any user's password. By storing only the SHA-256 hash, a breach reveals nothing usable. The raw token exists only in the email link."

**Q: Why always return 200 regardless of email existence?**
"User enumeration prevention. If we returned 404 for non-existent emails, an attacker could test thousands of emails to find valid accounts. By always returning the same response, they can't distinguish between existing and non-existing accounts."

---

## 5. Dashboard Data API (Caching Strategy)

### Backend Caching
```python
class UserProgressView(APIView):
    def get(self, request):
        days = int(request.query_params.get('days', 30))
        user_id = request.user.id
        cache_key = f"dashboard:{user_id}:{days}"
        
        # Try cache first (5 minute TTL)
        cached = cache.get(cache_key)
        if cached:
            return Response(cached)  # Instant response from memory
        
        # Expensive DB query
        data = self._compute_dashboard_data(request.user, days)
        
        # Store in cache for 5 minutes
        cache.set(cache_key, data, timeout=300)
        
        return Response(data)
```

### Frontend Caching (Module-Level)
```javascript
// useDashboard.js - Module-level singleton cache
let _cache = {
    data: null,
    promise: null,      // In-flight request deduplication
    timestamp: 0,
    endpoint: null,
};

const STALE_MS = 5 * 60 * 1000; // 5 minutes — matches backend TTL
```

**Q: Why cache on BOTH frontend and backend?**
- **Backend cache:** Reduces database queries. Multiple API calls within 5 minutes get served from memory.
- **Frontend cache:** Reduces HTTP requests. Multiple components using `useDashboard()` share the same data without making separate API calls.

**Q: What is request deduplication in useDashboard?**
"If multiple components mount simultaneously (common in React), they all call `useDashboard()`. The `_cache.promise` field ensures only ONE HTTP request fires. All other callers `await` the same promise. This prevents the 'thundering herd' problem."

**Q: When does the cache get invalidated?**
"On the backend: Django signals. When a new `Attempt` is saved, the `post_save` signal fires and deletes the cache key. On the frontend: the `invalidate()` function resets `_cache`, and it's called after submitting a new assessment."

---

## 6. Admin API (RBAC)

```python
class AdminStatsView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]  # Both required
```

**Q: How does admin access control work?**
"Two-layer permission:
1. `IsAuthenticated` — Must have a valid JWT
2. `IsAdminUser` — Checks if `request.user.is_staff == True`
Both must pass. A regular user with a valid JWT gets 403 Forbidden."

**Q: What admin self-protection exists?**
```python
# In AdminUserDetailView
if user.pk == request.user.pk:
    if 'is_staff' in data and not data['is_staff']:
        return Response({'error': 'You cannot remove your own admin privileges.'}, status=403)
    if 'is_active' in data and not data['is_active']:
        return Response({'error': 'You cannot deactivate your own account.'}, status=403)
```
"Admins cannot:
- Remove their own admin status
- Deactivate their own account
- Delete their own account
This prevents accidental lockout."

---

## 7. CORS Configuration

```python
# settings.py
CORS_ALLOWED_ORIGINS = [
    'http://localhost:5173',    # Vite dev server
    'http://127.0.0.1:5173',
]
CORS_ALLOW_CREDENTIALS = True
```

**Q: What is CORS?**
"Cross-Origin Resource Sharing. The browser blocks requests from `localhost:5173` (React) to `localhost:8000` (Django) by default — they're different origins. CORS headers tell the browser it's OK for the React app to make requests to our API."

**Q: Why allow credentials?**
"So the browser sends cookies and Authorization headers with cross-origin requests. Without this, JWT tokens in the Authorization header would be stripped by the browser."
