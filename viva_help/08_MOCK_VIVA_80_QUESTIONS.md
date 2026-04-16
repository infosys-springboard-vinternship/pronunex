# Mock Viva Q&A — 80 Questions with Model Answers

> **Instructions:** Read each question, think of YOUR answer first, then compare with the model answer below.
> Focus on explaining **WHY** you made each decision, not just **WHAT** you did.

---

## SECTION 1: PROJECT & ARCHITECTURE (Q1–Q15)

### Q1: Explain your project in 2 minutes.
**Answer:** "Pronunex is an AI-powered English pronunciation improvement platform. Users record sentences, and the system provides real-time, phoneme-level accuracy feedback.

The backend is built with Django REST Framework and uses a deterministic NLP pipeline: the user's audio goes through cleaning, speech-to-text validation via Groq Whisper, forced phoneme alignment, and then embedding-based cosine similarity scoring using the Wav2Vec2 neural model. This scoring is fully deterministic — no LLM is involved in judging accuracy.

An LLM (Llama 3.3 70B via Groq) generates human-readable coaching tips AFTER the scores are already computed. The frontend is a React SPA that handles audio recording, displays per-phoneme score breakdowns, and tracks user progress with daily analytics and streak tracking.

Key design decisions include separating deterministic scoring from LLM feedback, using JWT for stateless auth, precomputing reference embeddings for performance, and running LLM feedback asynchronously so users get instant scores."

---

### Q2: Why did you choose Django over Flask or Node.js?
**Answer:** "Django provides batteries-included features critical for this project: a robust ORM for complex analytics queries, built-in user authentication that we extended for JWT, admin interface for data management, and a mature middleware system. DRF adds standardized serialization, pagination, throttling, and permission classes.

Flask would require assembling these pieces manually — SQLAlchemy, Flask-Login, marshmallow, etc. Node.js with Express would need even more assembly and doesn't have an equivalent of Django's ORM for complex aggregation queries like `annotate(avg=Avg('attempts__score'))`.

For a CRUD-heavy application with complex database queries and authentication, Django is the optimal choice."

---

### Q3: Why React instead of Angular or Vue?
**Answer:** "React's component model with hooks gives us the right level of flexibility. We use custom hooks like `useAudio` for microphone recording and `useDashboard` for shared data fetching — these are elegant abstractions that Angular's service-injection pattern would make more verbose.

React also has the largest ecosystem — finding solutions for specific problems like audio waveform visualization is easier. Vite as the build tool gives us sub-second hot module replacement, which is critical for iterating on the UI quickly."

---

### Q4: Why did you separate scoring from LLM feedback?
**Answer:** "This is the most important architectural decision in the project. Three reasons:

1. **Determinism:** Cosine similarity between Wav2Vec2 embeddings gives the same score for the same audio every time. An LLM would give different scores on different calls — you can't trust it for measurement.

2. **Speed:** Cosine similarity takes milliseconds. LLM inference takes 2-7 seconds. By separating them, users get instant scores.

3. **Auditability:** If a user asks 'why did I get 72%?', we can show the exact phoneme-by-phoneme cosine similarity values. With an LLM, we can only say 'the model thought so.'

The LLM's role is limited to translating pre-computed scores into natural language coaching — like a sports commentator who watches a scoreboard, not a referee who decides the score."

---

### Q5: What is cosine similarity and why did you use it?
**Answer:** "Cosine similarity measures the angle between two vectors. If two vectors point in the same direction, similarity is 1 (identical). If perpendicular, it's 0 (unrelated).

I used it because it's magnitude-invariant — it measures direction, not length. This means it doesn't matter if the user spoke quietly or loudly; it only compares the acoustic pattern (formants, spectral features) captured in the Wav2Vec2 embedding. Euclidean distance would penalize quiet speakers because their embedding magnitudes would be smaller."

---

### Q6: What is Wav2Vec2 and why did you choose it?
**Answer:** "Wav2Vec2 is a self-supervised speech representation model by Facebook/Meta, trained on 960 hours of LibriSpeech. It takes raw audio waveforms and outputs 768-dimensional dense vectors that encode acoustic and phonemic properties.

I chose it because:
1. It captures phoneme-level features — exactly what we need for pronunciation scoring
2. The base model runs on CPU (no GPU required for deployment)
3. It produces fixed-size embeddings that enable mathematical comparison
4. It's widely used in speech research, so I could validate my approach against published papers"

---

### Q7: Explain the middleware chain in your Django app.
**Answer:** "Requests pass through middleware in order:

1. **CorsMiddleware** — Adds CORS headers so the React frontend (port 5173) can make requests to Django (port 8000)
2. **SecurityMiddleware** — Handles HTTPS redirects and security headers
3. **SessionMiddleware** — Manages Django sessions (needed for admin panel)
4. **CommonMiddleware** — URL normalization (trailing slashes, etc.)
5. **UserActivityMiddleware** (custom) — Updates `last_active` timestamp for authenticated users, throttled to once per 60 seconds via cache to avoid excessive DB writes

The middleware chain is bidirectional — requests go through in forward order, responses go through in reverse order."

---

### Q8: How do you handle file uploads in your API?
**Answer:** "The assessment endpoint uses `MultiPartParser` and `FormParser`:

1. Frontend creates a `FormData` object with the audio blob and sentence ID
2. Browser sends it as `multipart/form-data` with a boundary separator
3. Django's `MultiPartParser` decodes the binary audio into `request.FILES['audio']`
4. We save it to a temporary file using `tempfile.NamedTemporaryFile`
5. The NLP pipeline processes the temp file
6. After processing, the audio is optionally saved to permanent storage (local or Supabase S3)

Important detail: we DON'T set `Content-Type: multipart/form-data` manually in the frontend. The browser must set it automatically because it includes the boundary string that separates form fields."

---

### Q9: What is the N+1 query problem and how do you avoid it?
**Answer:** "N+1 occurs when you fetch N objects and then make 1 additional query per object to get related data. For example, fetching 20 attempts and then querying each attempt's sentence individually = 21 queries.

I avoid it with:
- `select_related('sentence')` for ForeignKey relationships — does a SQL JOIN, one query total
- `prefetch_related('phoneme_errors')` for reverse relationships — does exactly 2 queries (one for attempts, one for all related errors)
- `annotate()` to compute aggregates in the database query itself, rather than in Python loops

Example from admin views: `User.objects.annotate(sessions_count=Count('practice_sessions'), avg_score=Avg('practice_sessions__attempts__score'))` — this computes session count and average score in ONE query, not N+1."

---

### Q10: How does your authentication flow work?
**Answer:** "Stateless JWT authentication:

1. **Login:** User submits email + password. Backend validates credentials, generates an access token (1-hour expiry) and a refresh token (7-day expiry). Both are returned in the response body.

2. **Storage:** Frontend stores tokens in `sessionStorage` (cleared on tab close, more secure than localStorage).

3. **Requests:** Every API call includes `Authorization: Bearer <access_token>` header. Django's `JWTAuthentication` middleware decodes the token, extracts the user ID, and attaches the user to `request.user`.

4. **Token Refresh:** When the access token expires, the API client catches the 401, calls `/token/refresh/` with the refresh token, gets new tokens, and retries the original request.

5. **Rotation:** Each refresh grants both a new access AND a new refresh token. The old refresh token is blacklisted to prevent reuse."

---

### Q11: Why sessionStorage over localStorage for tokens?
**Answer:** "Security. sessionStorage is scoped to the browser tab and cleared when the tab is closed. If a user logs into Pronunex on a public library computer and closes the tab, their tokens are automatically gone.

localStorage persists indefinitely until explicitly cleared. A user who forgets to log out on a shared computer would remain authenticated forever. The trade-off is that users need to re-login when they open a new tab, but security outweighs convenience here."

---

### Q12: What is the role of Django signals in your project?
**Answer:** "I use `post_save` signals on the `Attempt` model for two purposes:

1. **Cache invalidation:** When a new attempt is saved, the signal deletes the cached dashboard data for that user (`dashboard:{user_id}:{days}` and `phoneme_analytics:{user_id}`). This ensures the dashboard shows fresh data after practice.

2. **Auto-close stale sessions:** If a session is more than 30 minutes old and the last attempt was more than 15 minutes ago, the signal automatically ends the session. This handles cases where users close the browser without ending their session.

Signals implement the Observer pattern — they decouple the 'what happened' (new attempt saved) from 'what should react to it' (cache invalidation). This is cleaner than putting cache invalidation logic directly in the view."

---

### Q13: How do you handle database migrations?
**Answer:** "Using Django's built-in migration system:

1. `python manage.py makemigrations` — Scans model changes and generates migration files
2. `python manage.py migrate` — Applies migrations to the database

Each migration is a version-controlled Python file that records schema changes. The migration history is stored in the `django_migrations` table.

For production switches between SQLite and PostgreSQL, I use `dj_database_url` to parse the `DATABASE_URL` environment variable. The migration files are database-agnostic — Django's ORM generates the appropriate SQL for each backend."

---

### Q14: What is CSRF and why don't you need it for APIs?
**Answer:** "CSRF (Cross-Site Request Forgery) protects against attackers tricking a user's browser into making requests to a trusted site using the user's cookies.

We don't need CSRF protection on our API because we use JWT tokens in the Authorization header, not cookies. CSRF attacks exploit the browser's automatic cookie-sending behavior. Since JWTs are stored in sessionStorage and explicitly added to headers by JavaScript, a malicious site cannot access them — they're protected by the Same-Origin Policy.

The Django admin panel still uses CSRF because it uses session cookies."

---

### Q15: What design patterns are used in your project?
**Answer:** "Several:

1. **Service Layer Pattern** — Business logic is in service classes (AssessmentService, AnalyticsService), not in views. Views are thin HTTP handlers.

2. **Singleton Pattern** — `_tts_service`, `_llm_service`, and `_groq_client` are module-level singletons, initialized once and reused. Prevents creating expensive client connections repeatedly.

3. **Observer Pattern** — Django signals. When an Attempt is saved, observers (cache invalidation, session auto-close) react without the view knowing about them.

4. **Strategy Pattern** — LLM provider fallback. The `generate()` method iterates through providers (Groq → Cerebras) using the same interface.

5. **Provider Pattern** — React Context providers (AuthProvider, SettingsProvider, UIProvider) provide shared state through the component tree.

6. **Adapter Pattern** — `storage_backends.py` adapts Supabase S3 to Django's file storage interface."

---

## SECTION 2: NLP & AUDIO PROCESSING (Q16–Q30)

### Q16: Walk me through what happens when a user records audio.
**Answer:** "Step by step:

1. User clicks Record → browser requests microphone permission via `getUserMedia()`
2. `MediaRecorder` starts capturing audio at 44.1kHz in WebM/Opus format
3. Audio chunks are collected every 100ms into an array
4. User clicks Stop → chunks are combined into a Blob
5. User clicks Submit → Blob is wrapped in FormData and sent as HTTP POST
6. Backend receives the file, saves to temp location
7. Audio cleaning: FFmpeg converts WebM→WAV, resampled to 16kHz, noise reduction applied
8. Groq Whisper transcribes the cleaned audio, returns text + word timestamps
9. Transcription is compared with expected text — if less than 60% similar, rejected
10. Forced alignment maps audio segments to individual phonemes
11. Wav2Vec2 generates 768-dim embeddings for each phoneme segment
12. Cosine similarity compares user embeddings with precomputed reference embeddings
13. Scores are saved to DB, LLM feedback is generated asynchronously
14. Frontend receives instant scores and displays them"

---

### Q17: What is the ASR gatekeeper and why is it necessary?
**Answer:** "The ASR (Automatic Speech Recognition) validator is a quality gate before scoring. Without it, if a user said 'hello world' but was supposed to say 'she sells seashells,' the cosine similarity would still produce numbers — meaningless garbage numbers, but numbers nonetheless.

The gatekeeper uses Groq's Whisper API to transcribe what the user actually said, then compares it with the expected text using three complementary methods: SequenceMatcher (character-level), Levenshtein distance (edit distance), and DTW word alignment. If the best similarity score is below 0.6 (60%), the attempt is rejected with a helpful message. This prevents the 'Yes Man' bug where every random utterance gets scored."

---

### Q18: Why three similarity metrics instead of one?
**Answer:** "Different metrics excel at different error types:

- **SequenceMatcher** (difflib) — Good at detecting word reordering and partial matches
- **Levenshtein distance** — Good at single character substitutions and insertions/deletions
- **DTW word matching** — Aligns words even when length differs, handles additions/deletions

Example: If the user says 'she sell seashell' instead of 'she sells seashells,' SequenceMatcher gives 0.89, but Levenshtein gives 0.92 because only 2 characters differ. By taking `max()` of all metrics, we give the user the benefit of the doubt."

---

### Q19: What is Whisper hallucination and how do you handle it?
**Answer:** "Whisper sometimes produces garbage output on noisy or very short audio — for example, repeated non-English characters like 'سيبالسيبال' or repeated patterns like 'the the the the the.'

My `_is_hallucination()` function detects four patterns:
1. More than 30% non-ASCII characters in the output
2. Same character repeated 6+ times in a row
3. Same word appearing more than 50% of the time
4. Long text with no spaces (single very long 'word')

When hallucination is detected, we return an empty transcription, which triggers a clean error message telling the user to speak more clearly."

---

### Q20: What are phoneme embeddings?
**Answer:** "A phoneme embedding is a 768-dimensional vector that numerically represents the acoustic characteristics of a spoken phoneme. It's produced by feeding the phoneme's audio segment through the Wav2Vec2 neural network.

Think of it like a fingerprint for pronunciation. When someone correctly pronounces 'TH,' the embedding points in a specific direction in 768-dimensional space. When someone incorrectly says 'T' instead of 'TH,' the embedding points in a different direction. Cosine similarity measures the angle between these directions — smaller angle means more similar pronunciation."

---

### Q21: Why precompute reference embeddings?
**Answer:** "Computing Wav2Vec2 embeddings takes ~500ms per sentence. If we computed both user and reference embeddings during assessment, that's ~1 second just for embeddings.

By precomputing reference embeddings when sentences are added to the library (via `python manage.py precompute_embeddings`), we store them as binary data in the `ReferenceSentence.reference_embeddings` field. During assessment, we only compute the user's embeddings (~500ms) and compare with the cached reference. This cuts embedding time in half."

---

### Q22: What are the limitations of your scoring system?
**Answer:** "Several honest limitations:

1. **Accent bias:** Reference embeddings are from a single TTS voice (Groq Orpheus 'Diana'). Users with different but valid accents may score lower.

2. **Alignment errors:** If forced alignment misaligns phoneme boundaries, the wrong audio segment gets scored against the wrong reference phoneme.

3. **Score boost:** The 0.15 boost makes scores feel better but masks some real weaknesses.

4. **Single reference:** We compare against one reference pronunciation. Human speech has natural variation — multiple references would be more robust.

5. **No prosody scoring:** We score individual phonemes but don't measure intonation, rhythm, or stress patterns at the sentence level."

---

### Q23: What is the score boost and why does it exist?
**Answer:** "The `SCORE_BOOST` of 0.15 is added to the raw cosine similarity score. It exists for pedagogical reasons — raw similarity scores are harsh. Even near-perfect pronunciation might only get 0.70-0.75 because the TTS reference voice has different acoustic properties than any real human voice.

Without the boost, most users would see scores in the 60-75% range, which feels discouraging. With the boost, scores map to a more intuitive range: 75-90% feels like 'good with room to improve.' It's the same principle as grading curves in education."

---

### Q24: What is forced phoneme alignment?
**Answer:** "Forced alignment is the process of mapping known text to audio, determining the exact timestamps where each word and phoneme was spoken.

Given: Audio file + known text 'She sells'
Output: 
- 'She' → 0.0s to 0.3s
- 'sells' → 0.35s to 0.8s
- Phoneme 'SH' → 0.0s to 0.15s
- Phoneme 'IY1' → 0.15s to 0.3s
- etc.

We use word timestamps from Groq Whisper, then further split into phonemes using the precomputed `alignment_map` stored on each `ReferenceSentence`. The alignment map defines how phonemes are distributed within each word."

---

### Q25: What is Phone Error Rate (PER)?
**Answer:** "PER is a standard metric in speech assessment, calculated as:

`PER = (Substitutions + Deletions + Insertions) / Reference Length × 100%`

For example:
- Expected phonemes: [SH, IY1, S, EH1, L, Z]
- User phonemes:     [SH, IY1, T, EH1, L]
- Substitution: S→T (1)
- Deletion: Z (1)
- PER = (1 + 1 + 0) / 6 = 33.3%

My `per_scorer.py` module calculates this to give another perspective on pronunciation accuracy alongside cosine similarity."

---

### Q26: How does the substitution pattern detection work?
**Answer:** "I have a lookup table of 27 common speech therapy patterns mapping expected phonemes to likely substitutions:

```python
('TH', 'T') → 'Voiceless TH fronting'
('R', 'W')  → 'R/W gliding'
('S', 'TH') → 'Interdental lisp'
```

When a phoneme scores below the weak threshold (0.85), I check if it matches any known substitution pattern. If the user's 'TH' scored 0.4, the system identifies it as likely 'Voiceless TH fronting' — the user is probably saying 'T' instead of 'TH.'

This drives specific coaching: 'Place your tongue between your teeth and blow air gently for TH sounds.'"

---

### Q27: What happens if the NLP models aren't available?
**Answer:** "The system has a Dev Mode fallback. When importing PyTorch fails (because it's not installed), the system catches the ImportError and switches to generating random but realistic-looking scores.

Dev Mode is detected automatically — there's no config flag. It exists so frontend developers can work on the UI without needing a full AI environment (PyTorch + torchaudio = 2GB+ of dependencies). The scores look realistic enough for UI testing but are clearly labeled in the API response."

---

### Q28: How does the TTS service work?
**Answer:** "The TTSService uses Groq's Orpheus model to generate reference pronunciation audio:

1. Takes sentence text as input
2. Sends to Groq API with model='canopylabs/orpheus-v1-english', voice='diana'
3. Receives WAV audio response
4. Saves to `media/references/sentence_{id}.wav`
5. File path is stored on the `ReferenceSentence.audio_file` field

The service is a singleton to reuse the API connection. Audio is generated once per sentence and cached — subsequent requests serve the cached file. If the audio already exists, the API is never called."

---

### Q29: What is the LLM boundary in your system?
**Answer:** "The LLM receives these pre-computed inputs:
- Sentence text
- Overall score (already calculated)
- List of weak phonemes (already identified)
- Per-phoneme scores (already computed)

The LLM generates these outputs:
- Summary text ('Good attempt! Focus on TH sounds.')
- Phoneme-specific tips ('For TH, place your tongue between teeth...')
- Encouragement text
- Practice focus suggestions

The LLM DOES NOT:
- Score pronunciation
- Detect phonemes
- Determine which phonemes are weak
- Judge whether speech was correct

This boundary is enforced by the prompt template, which explicitly says 'DO NOT re-score. Use the provided scores.'"

---

### Q30: What is the LLM fallback mechanism?
**Answer:** "Three-tier fallback:

1. **Groq** (Llama 3.3 70B via Groq inference) — First choice, fastest
2. **Cerebras** (Llama 3.3 70B via Cerebras inference) — Same model, different provider
3. **Rule-based templates** — Hardcoded feedback based on score ranges

If Groq fails (rate limit, timeout), the code automatically tries Cerebras. If both fail, `generate_fallback_feedback()` provides basic feedback using if/else logic:
- Score ≥ 0.85 → 'Excellent pronunciation!'
- Score ≥ 0.70 → 'Good with room for improvement'
- Score ≥ 0.50 → 'Several sounds need practice'
- Below 0.50 → 'This was challenging, focus on basics'

Plus hardcoded articulation tips for 14 common phonemes."

---

## SECTION 3: FRONTEND SPECIFICS (Q31–Q45)

### Q31: Explain React Context and how you use it.
**Answer:** "Context is React's built-in mechanism for sharing state across components without prop drilling (passing props through every intermediate component).

I use three contexts:
1. **AuthContext** — `user` object, `login()`, `logout()`, `loading` state. Any component can call `useAuth()` to check if user is logged in.
2. **SettingsContext** — Theme mode, primary color, font scale. Stored in localStorage. Provides `updateSetting()` and `resetSettings()`.
3. **UIContext** — Toast notifications, sidebar collapse state. Provides `showToast()` for any component to trigger notifications.

Each has a Provider wrapping the App and a custom hook for consumption."

---

### Q32: What is the useCallback and useMemo hook?
**Answer:** "`useCallback` memoizes a function reference. Without it, a new function object is created on every render, which can cause child components to re-render unnecessarily:

```javascript
// Without useCallback: new function on every render
const handleClick = () => doSomething();

// With useCallback: same reference unless dependencies change
const handleClick = useCallback(() => doSomething(), [dependencies]);
```

`useMemo` memoizes a computed value:
```javascript
// Without: recalculated on every render
const expensiveResult = computeExpensive(data);

// With: only recalculated when data changes
const expensiveResult = useMemo(() => computeExpensive(data), [data]);
```

In my code, `useAudio`'s `startRecording` and `stopRecording` are wrapped in `useCallback` to prevent unnecessary re-renders of the recording UI."

---

### Q33: What is the difference between useRef and useState?
**Answer:** "`useState` causes a re-render when the value changes. `useRef` does NOT.

In my `useAudio` hook:
- `audioBlob`, `duration`, `state` use `useState` — because the UI needs to update when these change
- `mediaRecorderRef`, `streamRef`, `chunksRef` use `useRef` — because these are implementation details that don't affect the UI. Changing the MediaRecorder reference shouldn't cause a re-render.

Rule of thumb: if changing the value should update the screen, use `useState`. If it's just internal bookkeeping, use `useRef`."

---

### Q34: How does lazy loading work in your app?
**Answer:** "I use React's `lazy()` and `Suspense`:

```jsx
const Practice = lazy(() => import('./pages/Practice'));

<Suspense fallback={<LoadingFallback />}>
    <Practice />
</Suspense>
```

When the user navigates to `/practice`, React dynamically imports the Practice module. Until it's loaded, `Suspense` renders the fallback UI (a loading spinner).

Vite handles the code splitting — it creates a separate `.js` chunk for the Practice page. The initial bundle only includes the landing page and common components. This reduces initial load time by ~30-40% because the Practice page is the heaviest component with audio recording logic."

---

### Q35: How does your API client handle concurrent token refreshes?
**Answer:** "With promise deduplication. If three API calls fail with 401 simultaneously, all three would try to refresh the token. But only ONE should actually call the refresh endpoint.

The `_refreshPromise` field acts as a semaphore:
1. First caller: `_refreshPromise` is null → starts actual refresh, stores the Promise
2. Second caller: `_refreshPromise` exists → awaits the same Promise
3. Third caller: same → awaits the same Promise
4. When refresh completes: `_refreshPromise` is set to null, all three callers get the new token

Without this, we'd send three refresh requests, and two would fail because the refresh token gets blacklisted after the first use."

---

### Q36: What is the Virtual DOM?
**Answer:** "The Virtual DOM is React's in-memory representation of the UI. When state changes, React:

1. Creates a new Virtual DOM tree
2. Diffs it against the previous Virtual DOM (reconciliation)
3. Calculates the minimal set of real DOM changes needed
4. Applies only those changes to the actual browser DOM

This is faster than directly manipulating the DOM because DOM operations are expensive (they trigger layout recalculation, painting, compositing). React batches changes and makes the minimum number of DOM mutations."

---

### Q37: Explain the component lifecycle and useEffect.
**Answer:** "`useEffect` handles side effects in functional components. It replaces three class lifecycle methods:

```javascript
useEffect(() => {
    // componentDidMount + componentDidUpdate
    // Runs after render
    
    fetchData();
    
    return () => {
        // componentWillUnmount
        // Cleanup function
        cleanup();
    };
}, [dependency]); // Only re-run when dependency changes
```

In my app:
- `AuthContext`: `useEffect([], [])` on mount checks sessionStorage for existing tokens
- `SettingsContext`: `useEffect([], [settings])` persists settings to localStorage and updates CSS variables when settings change
- `useDashboard`: `useEffect([], [fetch, enabled])` fetches dashboard data when the hook is enabled
- `useAudio`: cleanup function releases the microphone stream and revokes object URLs"

---

### Q38: What are controlled vs uncontrolled components?
**Answer:** "A **controlled component** has its value managed by React state. Every keystroke triggers a state update:
```jsx
const [email, setEmail] = useState('');
<input value={email} onChange={e => setEmail(e.target.value)} />
```

An **uncontrolled component** manages its own value internally via the DOM:
```jsx
const inputRef = useRef();
<input ref={inputRef} />
// Access value: inputRef.current.value
```

My forms use controlled components because I need real-time validation (like password strength checking), dynamic error messages, and to enable/disable the submit button based on form state."

---

### Q39: How does conditional rendering work in your components?
**Answer:** "Three patterns:

1. **Logical AND** — Render if condition is true:
```jsx
{user?.is_staff && <AdminPanel />}
```

2. **Ternary** — Choose between two renders:
```jsx
{isLoading ? <Spinner /> : <Content />}
```

3. **Early return** — Don't render the rest:
```jsx
if (loading) return <LoadingScreen />;
if (!user) return <Navigate to='/login' />;
return <Dashboard />;
```

I use early returns in ProtectedRoute for auth gating, ternaries for loading/content switching, and logical AND for optional features like the admin panel."

---

### Q40: What is prop drilling and how do you avoid it?
**Answer:** "Prop drilling is passing data through multiple intermediate components that don't use it:
```
App → Layout → Sidebar → UserProfile → Avatar (needs user data)
```
Every component in the chain needs to accept and pass `user` even if only Avatar uses it.

I avoid it with React Context. The `AuthProvider` wraps the entire app, and any component at any depth can call `useAuth()` to get the user directly:
```jsx
function Avatar() {
    const { user } = useAuth();  // Direct access, no drilling
    return <img src={user.avatar} />;
}
```"

---

## SECTION 4: DATABASE & ORM (Q41–Q50)

### Q41: Explain your database schema relationships.
**Answer:** "Key relationships:

- **User → UserSession** (1:N): A user has many practice sessions
- **UserSession → Attempt** (1:N): A session has many pronunciation attempts
- **Attempt → PhonemeError** (1:N): An attempt has many phoneme-level errors
- **ReferenceSentence → SentencePhoneme → Phoneme** (M:N through table): Many-to-many between sentences and phonemes
- **User → UserProgress** (1:N): Daily progress records
- **User → StreakRecord** (1:1): One streak record per user

The deepest query chain: `User → UserSession → Attempt → PhonemeError` — this is used in admin views to aggregate user performance across all their practice history."

---

### Q42: What is the difference between `CharField` and `TextField`?
**Answer:** "`CharField` has a max_length argument and maps to VARCHAR in SQL — used for short, fixed-length strings like email, username, phoneme symbols. `TextField` has no max_length and maps to TEXT — used for unlimited-length content like sentence text, feedback JSON, or descriptions.

In PostgreSQL, there's actually no performance difference. In MySQL, VARCHAR has storage optimization for short strings. I use CharField for fields I know won't exceed a certain length (email: 254 chars) and TextField for content that varies widely (sentence text, JSON payloads)."

---

### Q43: What is `JSONField` and when do you use it?
**Answer:** "JSONField stores structured JSON data directly in the database. I use it extensively:

- `ReferenceSentence.phoneme_sequence` — Array of phoneme symbols `['SH', 'IY1', 'S', 'EH1', 'L', 'Z']`
- `ReferenceSentence.alignment_map` — Nested object with word-phoneme timing data
- `Attempt.phoneme_scores` — Array of score objects `[{phoneme: 'SH', score: 0.91}, ...]`
- `Attempt.llm_feedback` — LLM's structured coaching response

JSONField is powerful because it stores variable-structure data without requiring separate tables. The trade-off is you can't easily query INSIDE the JSON in SQLite (PostgreSQL supports JSON querying with jsonb)."

---

### Q44: What is `bulk_create()` and why use it?
**Answer:** "`bulk_create()` inserts multiple records in a single SQL INSERT statement. Instead of:
```python
for score in phoneme_scores:
    PhonemeError.objects.create(attempt=attempt, phoneme=score['phoneme'], ...)
# 20 separate INSERT queries
```

I do:
```python
errors = [PhonemeError(attempt=attempt, phoneme=ps['phoneme'], ...) for ps in scores]
PhonemeError.objects.bulk_create(errors)
# 1 INSERT query with 20 rows
```

For 20 phonemes, this reduces database round-trips from 20 to 1, which is roughly 20x faster."

---

### Q45: How do your analytics queries work?
**Answer:** "Using Django ORM aggregation:

```python
progress = UserProgress.objects.filter(
    user=user,
    date__gte=start_date
).aggregate(
    avg_score=Avg('overall_score'),
    total_attempts=Sum('attempts_count'),
    total_sessions=Count('id'),
    avg_fluency=Avg('fluency_score'),
)
```

This generates a single SQL query:
```sql
SELECT AVG(overall_score), SUM(attempts_count), COUNT(id), AVG(fluency_score)
FROM analytics_userprogress
WHERE user_id = ? AND date >= ?
```

All computation happens in the database, not Python. This is critical for performance — the DB engine is optimized for aggregation."

---

## SECTION 5: SECURITY (Q46–Q55)

### Q46: How do you prevent brute-force login attacks?
**Answer:** "Custom throttle class with DRF:
```python
class LoginRateThrottle(AnonRateThrottle):
    scope = 'login'
    # Rate: 5/minute in settings
```

After 5 failed login attempts from the same IP within one minute, subsequent attempts get a 429 response with a `Retry-After` header. The throttle is based on IP address for anonymous requests.

Additionally, Django's password hashing uses PBKDF2 with SHA-256, which is deliberately slow (~100ms per attempt), making brute force computationally expensive."

---

### Q47: How do you prevent user enumeration?
**Answer:** "In the password reset endpoint, we return the same 200 OK response regardless of whether the email exists:

```python
def post(self, request):
    email = request.data.get('email')
    user = User.objects.filter(email=email).first()
    
    if user:
        # Generate token, send email
        ...
    
    # ALWAYS return same response
    return Response({'message': 'If an account exists with that email, you will receive a reset link.'})
```

An attacker testing 'admin@company.com' gets the same response as testing 'nonexistent@fake.com'. They can't distinguish between existing and non-existing accounts."

---

### Q48: How does your admin self-protection work?
**Answer:** "Three guards in `AdminUserDetailView`:

1. **Cannot remove own admin status:**
```python
if user.pk == request.user.pk and 'is_staff' in data and not data['is_staff']:
    return 403
```

2. **Cannot deactivate own account:**
```python
if user.pk == request.user.pk and 'is_active' in data and not data['is_active']:
    return 403
```

3. **Cannot delete own account:**
```python
if user.pk == request.user.pk:
    return 403
```

This prevents the last admin from accidentally locking themselves out of the system."

---

### Q49: What is XSS and how do you prevent it?
**Answer:** "Cross-Site Scripting — injecting malicious JavaScript into a web page. Prevention:

1. **React auto-escapes** — JSX automatically escapes any values embedded in templates. `{userInput}` renders as text, not HTML. Even if someone's username is `<script>alert('hacked')</script>`, it displays as literal text.

2. **DRF serialization** — All data is serialized to JSON, which doesn't execute scripts.

3. **No `dangerouslySetInnerHTML`** — I never use this React escape hatch that renders raw HTML.

4. **Content Security Policy** — The CSP header restricts inline scripts and external sources."

---

### Q50: How is the password reset token secured?
**Answer:** "Multi-layer security:

1. **Generation:** `secrets.token_urlsafe(32)` — cryptographically random, 32 bytes of entropy. Impossible to guess.

2. **Storage:** Only the SHA-256 hash is stored in the database. The raw token is sent via email and never persisted.

3. **Expiration:** 1-hour time limit. After that, the token is rejected even if valid.

4. **Single use:** The token record is deleted after successful password reset. It can't be reused.

5. **Rate limiting:** Password reset requests are throttled to 3 per hour per IP.

If the database is breached, attackers see SHA-256 hashes — they can't reverse these to get usable tokens."

---

## SECTION 6: PERFORMANCE & OPTIMIZATION (Q51–Q60)

### Q51: How do you optimize the assessment response time?
**Answer:** "Three strategies:

1. **Precomputed references:** Reference embeddings are cached in the database, saving ~500ms per assessment.

2. **Async LLM feedback:** Scores return in ~2-3 seconds. LLM feedback runs in a background thread and is polled separately, saving 2-7 seconds from the critical path.

3. **Efficient DB operations:** `bulk_create()` for phoneme errors (1 query instead of 20), `select_related()` for sentence lookup."

---

### Q52: How does your caching strategy work?
**Answer:** "Two-layer caching:

**Backend (Django LocMemCache):**
- Dashboard data: cached for 5 minutes per user per time range
- Phoneme analytics: cached for 5 minutes per user
- User activity: write-throttled to once per 60 seconds
- Invalidation: Django signals delete cache on new attempt

**Frontend (Module-level JS):**
- `useDashboard` has a module-level `_cache` object shared across all component instances
- 5 minutes TTL matching backend
- Request deduplication with `_cache.promise`
- Explicit `invalidate()` after new assessment

The combination means: after a practice session, the signal invalidates backend cache, the hook invalidates frontend cache, and the next dashboard view fetches fresh data."

---

### Q53: What is code splitting and how do you use it?
**Answer:** "Code splitting divides the JavaScript bundle into smaller chunks that load on demand:

```jsx
const Practice = lazy(() => import('./pages/Practice'));
const Progress = lazy(() => import('./pages/Progress'));
const AdminProfile = lazy(() => import('./pages/AdminProfile'));
```

Vite automatically creates separate chunks for each lazy import. The initial page load only downloads the core bundle (~100KB). Heavy pages like Practice (~50KB) are loaded only when navigated to.

Benefits: faster initial page load, reduced memory usage, users who never visit Practice never download that code."

---

### Q54: What is debouncing/throttling and where do you use it?
**Answer:** "**Throttling:** Limits function execution to once per interval.
- Used in `UserActivityMiddleware`: updates DB max once per 60 seconds per user, not on every request.
- Used in recording duration timer: updates every 100ms instead of every requestAnimationFrame.

**Debouncing:** Delays execution until input stops.
- Used in admin search: waits 300ms after the user stops typing before firing the API call. Prevents sending a request for every character typed."

---

### Q55: How do you minimize database queries?
**Answer:** "Several techniques:

1. **`select_related()`** — SQL JOIN for ForeignKey, eliminates N+1
2. **`prefetch_related()`** — Separate query for reverse FK, eliminates N+1
3. **`annotate()`** — Compute fields in DB, not Python
4. **`bulk_create()`** — Insert N rows in 1 query
5. **Caching** — Don't query at all for 5 minutes
6. **`filter().update()` over `get().save()`** — For single-field updates, `.update()` is one query vs `.get()` (SELECT) + `.save()` (UPDATE) = two queries"

---

## SECTION 7: TOUGH QUESTIONS (Q56–Q70)

### Q56: What was the hardest bug you fixed?
**Answer:** "The 'Yes Man' bug. Before implementing ASR validation, the scoring pipeline would accept any audio and produce plausible-looking scores. A user could say completely wrong words and still get 60-70% scores because the cosine similarity between random embeddings isn't zero — it tends to cluster around 0.4-0.6.

The fix was implementing the ASR gatekeeper that transcribes audio first and rejects speech that doesn't match the expected text. This required integrating three different similarity metrics (SequenceMatcher, Levenshtein, DTW) to handle various types of mispronunciation without being too strict."

---

### Q57: What would you improve if you had more time?
**Answer:** "Five improvements:

1. **Multiple reference voices** — Score against 3-5 reference speakers to reduce accent bias
2. **Prosody scoring** — Measure intonation contour and rhythm, not just individual phonemes
3. **Real-time streaming** — WebSocket-based assessment that scores as the user speaks
4. **Spaced repetition** — Algorithmically schedule practice for phonemes the user consistently struggles with
5. **Peer comparison** — Anonymous benchmarks showing how the user's scores compare with others at the same level"

---

### Q58: How would you scale this to 10,000 concurrent users?
**Answer:** "Four key changes:

1. **Task queue:** Replace threading with Celery + Redis for async tasks (LLM feedback, analytics). Threading doesn't scale past one process.

2. **Horizontal scaling:** Run 4-8 Gunicorn workers behind Nginx. JWT auth is stateless, so any worker can handle any request.

3. **Dedicated ML server:** Move Wav2Vec2 inference to a separate service (TorchServe or Triton) with GPU acceleration. Keep Django for API logic only.

4. **Distributed cache:** Switch from LocMemCache to Redis so cache is shared across workers. LocMemCache is per-process."

---

### Q59: Have you written tests for this project?
**Answer:** "Yes, I have unit tests for the core scoring module and service layer. The scoring tests verify that cosine similarity produces expected values for known inputs, and that the unscorable result is returned correctly for invalid embeddings.

The test structure follows the Arrange-Act-Assert pattern:
```python
def test_cosine_similarity_identical_vectors():
    vec = np.array([1.0, 0.0, 1.0])
    assert calculate_cosine_similarity(vec, vec) == 1.0

def test_zero_vector_returns_zero():
    zero = np.zeros(768)
    vec = np.random.randn(768)
    assert calculate_cosine_similarity(zero, vec) == 0.0
```

For integration testing, I use DRF's `APIClient` to test endpoints with authenticated requests."

---

### Q60: What is the most complex query in your backend?
**Answer:** "The admin stats query that computes system-wide analytics:

```python
queryset = User.objects.annotate(
    sessions_count=Count('practice_sessions', distinct=True),
    avg_score=Avg('practice_sessions__attempts__score'),
)
```

This traverses two foreign key relationships (User → UserSession → Attempt) and computes aggregates across the entire chain. In SQL, this becomes a multi-table JOIN with GROUP BY and aggregate functions.

The `distinct=True` is critical — without it, the COUNT would multiply by the number of attempts per session since the JOIN produces a cartesian product."

---

## SECTION 8: RAPID-FIRE (Q61–Q80)

### Q61: What is REST?
"Representational State Transfer. A set of architectural constraints for web APIs: stateless requests, resource-based URLs, standard HTTP methods (GET, POST, PUT, DELETE), and JSON format."

### Q62: What is an ORM?
"Object-Relational Mapper. Maps Python classes to database tables and Python objects to rows. Django's ORM lets me write `User.objects.filter(is_active=True)` instead of raw SQL."

### Q63: What is a migration?
"A version-controlled record of database schema changes. Django auto-generates migration files from model changes. Running `migrate` applies them in order."

### Q64: What is CORS?
"Cross-Origin Resource Sharing. Browser security mechanism that blocks requests between different origins. We whitelist `localhost:5173` in Django settings to allow the React frontend to call our API."

### Q65: What is JWT vs Session?
"JWT: token contains user info, sent in header, stateless (server stores nothing). Session: random ID stored in cookie, server keeps session data. We use JWT for API statelessness."

### Q66: What is the difference between PUT and PATCH?
"PUT replaces the entire resource. PATCH updates only the specified fields. We use PATCH for profile updates so the user doesn't need to resend every field."

### Q67: What is a serializer?
"Converts Python objects to JSON (serialization) and validates incoming JSON into Python objects (deserialization). DRF serializers handle both directions."

### Q68: What are HTTP status codes you use?
"200 OK — Success. 201 Created — Resource created. 400 Bad Request — Validation error. 401 Unauthorized — No/invalid token. 403 Forbidden — Valid token but not allowed. 404 Not Found. 429 Too Many Requests — Rate limited. 500 Server Error."

### Q69: What is async/await in JavaScript?
"Syntactic sugar over Promises. `await` pauses function execution until the Promise resolves. Makes async code read like synchronous code. `async` marks a function that uses `await`."

### Q70: What is the event loop in JavaScript?
"JavaScript is single-threaded. The event loop processes the call stack, then picks tasks from the queue (setTimeout callbacks, Promise resolutions, etc.). This enables non-blocking I/O — while waiting for a fetch() response, other code can run."

### Q71: What is a Promise?
"An object representing the eventual completion or failure of an async operation. Has three states: pending, fulfilled (resolved), rejected. Our API client's `request()` method returns Promises."

### Q72: What are props vs state?
"Props are read-only data passed from parent to child. State is internal data managed by the component. When state changes, the component re-renders."

### Q73: What is `useEffect` cleanup?
"The return function in useEffect runs when the component unmounts or before the effect re-runs. Used to cancel subscriptions, clear timers, release resources. Our `useAudio` cleanup releases the microphone stream."

### Q74: What is the key prop in lists?
"A unique identifier for list items that helps React efficiently update the DOM. Without keys, React re-renders the entire list. With keys, it only updates changed items."

### Q75: What is memoization?
"Caching the result of expensive computations. In React, `useMemo` memoizes values and `useCallback` memoizes functions. Prevents unnecessary recalculations on re-render."

### Q76: What is the difference between `==` and `===` in JavaScript?
"`==` does type coercion (e.g., `'5' == 5` is true). `===` checks both value and type (e.g., `'5' === 5` is false). Always use `===` to avoid unexpected behavior."

### Q77: What is the spread operator (`...`)?
"Creates shallow copies and merges objects/arrays. `{...defaults, ...userSettings}` merges userSettings ON TOP of defaults. Used extensively in our state management."

### Q78: What is destructuring?
"Extract values from objects/arrays into variables. `const { user, loading } = useAuth()` instead of `const auth = useAuth(); const user = auth.user;`"

### Q79: What is `FormData` in JavaScript?
"A browser API for constructing multipart/form-data, used for file uploads. We use it to send audio blobs to the assessment endpoint: `formData.append('audio', blob, 'recording.webm')`."

### Q80: What are environment variables and how do you use them?
"Configuration values stored outside the code. Backend: `.env` file loaded by `python-dotenv`, accessed via `os.environ.get()` or `settings.GROQ_API_KEY`. Frontend: `.env` with `VITE_` prefix, accessed via `import.meta.env.VITE_API_URL`. They separate secrets from code — the `.env` file is never committed to Git."

---

## VIVA TIPS

1. **Start answers with "So..." or "The..."** — It sounds natural and gives you a moment to think
2. **Draw diagrams** — When explaining the NLP pipeline or data flow, offer to draw it
3. **Connect to real code** — Say "In `scorer.py`, line 77..." to show you know the codebase intimately
4. **Admit limitations** — "One limitation is..." shows maturity and self-awareness
5. **Explain trade-offs** — "We chose X over Y because..." shows engineering judgment
6. **Use analogies** — "Cosine similarity is like measuring the angle between two arrows"
7. **Practice the 2-minute pitch** — Q1's answer should be rehearsed and smooth
