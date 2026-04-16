# Pronunex Viva - Quick Reference Cheat Sheet

> **Print this or keep it open during last-minute revision.**

---

## 1-MINUTE PITCH
"Pronunex is an AI-powered pronunciation coach. Users record sentences, and our deterministic NLP pipeline — using Wav2Vec2 embeddings and cosine similarity — scores each phoneme. An LLM generates coaching tips from those pre-computed scores. The scoring is math, not AI opinion."

---

## TECH STACK AT A GLANCE
```
Backend:  Django 5 + DRF + SimpleJWT + SQLite/PostgreSQL
Frontend: React 18 + Vite + Tailwind CSS
NLP:      Wav2Vec2 (embeddings) + Groq Whisper (ASR) + scipy (cosine)
LLM:      Groq Llama 3.3 70B → Cerebras fallback → Rule-based fallback
TTS:      Groq Orpheus (reference audio)
Storage:  Local filesystem / Supabase S3
Cache:    Django LocMemCache (backend) + Module-level JS cache (frontend)
Auth:     JWT (access 1h + refresh 7d, rotation + blacklisting)
```

---

## THE PIPELINE (Memorize This!)
```
Audio → Clean (FFmpeg) → ASR Validate (Whisper) → Align (phoneme slicing)
     → Embed (Wav2Vec2) → Score (cosine similarity) → Save DB
     → [async] LLM Feedback → [poll] Frontend displays
```

---

## 5 KEY DESIGN DECISIONS (Why Questions)

| Decision | Why |
|----------|-----|
| Scoring separated from LLM | Deterministic, fast (ms vs seconds), auditable |
| JWT over sessions | Stateless, works across origins, no server-side session store |
| Precomputed reference embeddings | Cuts assessment time in half (~500ms saved) |
| Async LLM feedback | Users see scores instantly, feedback loads in background |
| LocMemCache over Redis | Zero infrastructure, fast (in-process), sufficient for single-server |

---

## 5 SECURITY FEATURES (Know These)

| Feature | How |
|---------|-----|
| Brute-force prevention | `LoginRateThrottle`: 5 attempts/minute per IP |
| Token rotation | Each refresh gives new tokens, old one blacklisted |
| Password reset security | SHA-256 hashed tokens, 1hr expiry, same response for all emails |
| Admin self-protection | Cannot demote/deactivate/delete self (403) |
| XSS prevention | React auto-escapes, no `dangerouslySetInnerHTML` |

---

## 6 DJANGO ORM PATTERNS (Code Examples)

```python
# 1. Avoid N+1 (forward FK)
Attempt.objects.select_related('sentence').filter(...)

# 2. Avoid N+1 (reverse FK)
Attempt.objects.prefetch_related('phoneme_errors').filter(...)

# 3. Compute in DB
User.objects.annotate(avg=Avg('practice_sessions__attempts__score'))

# 4. Bulk insert
PhonemeError.objects.bulk_create([PhonemeError(...) for ps in scores])

# 5. Efficient update
User.objects.filter(pk=user.pk).update(last_active=now())

# 6. Cache pattern
cached = cache.get(key)
if cached: return cached
data = expensive_query()
cache.set(key, data, timeout=300)
```

---

## 5 REACT PATTERNS (Code Examples)

```jsx
// 1. Protected Route
if (!user) return <Navigate to="/login" replace />;
return <Outlet />;

// 2. useRef vs useState
const mediaRecorderRef = useRef(null); // No re-render
const [score, setScore] = useState(0); // Causes re-render

// 3. Lazy Loading
const Practice = lazy(() => import('./pages/Practice'));
<Suspense fallback={<Spinner />}><Practice /></Suspense>

// 4. Context consumption
const { user, login, logout } = useAuth();

// 5. API call pattern
try {
    const { data } = await api.post(endpoint, payload);
} catch (err) {
    if (err.status === 401) refreshToken();
}
```

---

## KEY FILES TO REFERENCE

| If asked about... | Point to this file |
|---|---|
| NLP scoring | `backend/nlp_core/scorer.py` — `calculate_cosine_similarity()` |
| ASR gatekeeper | `backend/nlp_core/asr_validator.py` — `validate_speech()` |
| Core assessment | `backend/apps/practice/views.py` — `AssessmentView.post()` |
| Business logic | `backend/apps/practice/services.py` — `AssessmentService` |
| LLM boundary | `backend/apps/llm_engine/feedback_generator.py` |
| JWT auth flow | `frontend/src/api/client.js` — `ApiClient.request()` |
| Audio recording | `frontend/src/hooks/useAudio.js` |
| State management | `frontend/src/context/AuthContext.jsx` |
| Theming | `frontend/src/context/SettingsContext.jsx` |
| All config | `backend/config/settings.py` + `frontend/src/config/globalConfig.js` |

---

## COMMON FOLLOW-UP TRAPS

**"Can you show me the code?"** → Open VS Code, navigate to the exact file. Know the folder structure.

**"What if the LLM is wrong?"** → "It can't be wrong about scores — it only generates text from pre-computed scores. At worst, the coaching text is unhelpful, and the fallback system provides basic tips."

**"Why not use ChatGPT?"** → "We use Llama 3.3 70B via Groq/Cerebras because: (a) it's open-source, (b) Groq provides sub-second inference, (c) we need JSON-structured output, and (d) cost — Groq's free tier handles our volume."

**"Is this production-ready?"** → "For a demonstration, yes. For 10K users, I'd need: Celery for async tasks, Redis for shared cache, PostgreSQL with connection pooling, and a dedicated ML inference server."

---

## STUDY PRIORITY ORDER

1. **08_MOCK_VIVA_80_QUESTIONS.md** → Practice answers aloud
2. **03_NLP_PIPELINE_DEEP_DIVE.md** → The heart of the project
3. **01_PROJECT_OVERVIEW.md** → Your 2-minute pitch
4. **04_API_DESIGN_AND_DATA_FLOW.md** → Request/response flows
5. **02_BACKEND_DJANGO_DEEP_DIVE.md** → Django-specific questions
6. **05_FRONTEND_REACT_DEEP_DIVE.md** → React concepts
7. **07_SYSTEM_DESIGN_AND_FLOW.md** → Architecture diagrams
8. **06_UI_UX_CSS_DEEP_DIVE.md** → CSS/design questions
