# Pronunex - Complete Project Overview (Viva Guide)

## What is Pronunex?

**One-liner answer:** "Pronunex is an AI-powered English pronunciation improvement platform that uses NLP and audio analysis to give real-time, phoneme-level feedback on spoken English."

**Detailed answer:** "Pronunex helps non-native English speakers improve their pronunciation. When a user speaks a sentence, the system records their audio, runs it through a deterministic NLP pipeline — including ASR validation, forced alignment, and embedding-based cosine similarity scoring — and returns per-phoneme accuracy scores. An LLM then generates human-readable coaching feedback based on those pre-computed scores. The system also tracks progress over time with daily analytics, streak tracking, and weak-phoneme identification."

---

## Tech Stack (Know This Cold)

| Layer | Technology | Why We Chose It |
|-------|-----------|----------------|
| **Backend Framework** | Django 5.x + Django REST Framework | Mature, batteries-included, excellent ORM, great for rapid API development |
| **Frontend Framework** | React 18 (Vite) | Component-based UI, fast dev server with HMR, rich ecosystem |
| **Styling** | Tailwind CSS + Custom CSS | Utility-first for speed, custom CSS for complex animations |
| **Database** | SQLite (dev) / PostgreSQL via Supabase (prod) | SQLite for zero-config dev, Supabase PostgreSQL for production scale |
| **Authentication** | JWT (SimpleJWT) + Google OAuth via Supabase | Stateless auth for API, social login for UX |
| **NLP/Audio** | PyTorch + Wav2Vec2 + Groq Whisper API | Wav2Vec2 for embeddings, Whisper for speech-to-text |
| **LLM Feedback** | Groq (Llama 3.3 70B) + Cerebras fallback | Fast inference, auto-fallback between providers |
| **TTS** | Groq Orpheus model | Generates reference pronunciation audio |
| **File Storage** | Local filesystem (dev) / Supabase S3 (prod) | Seamless switching via `USE_SUPABASE` flag |
| **Caching** | Django LocMemCache | In-process cache, no Redis dependency needed |

---

## Project Structure

```
pronunex/
├── backend/                    # Django REST API
│   ├── config/                 # Django project settings
│   │   ├── settings.py         # All configuration (DB, JWT, CORS, scoring)
│   │   ├── urls.py             # Root URL routing (/api/v1/...)
│   │   └── storage_backends.py # Supabase S3 storage adapter
│   ├── apps/                   # Django apps (business logic)
│   │   ├── accounts/           # User auth, profiles, admin panel
│   │   ├── library/            # Phonemes, reference sentences, TTS
│   │   ├── practice/           # Sessions, attempts, assessment pipeline
│   │   ├── analytics/          # Progress tracking, dashboards, streaks
│   │   ├── llm_engine/         # LLM feedback generation (text only!)
│   │   └── sentence_engine/    # Dynamic sentence generation via LLM
│   ├── nlp_core/               # Deterministic audio processing pipeline
│   │   ├── audio_cleaner.py    # Noise reduction, normalization, resampling
│   │   ├── asr_validator.py    # Groq Whisper transcription + gatekeeper
│   │   ├── aligner.py          # Forced phoneme alignment
│   │   ├── vectorizer.py       # Wav2Vec2 embedding generation
│   │   ├── scorer.py           # Cosine similarity scoring
│   │   ├── mistake_detector.py # Word/phoneme error classification
│   │   └── per_scorer.py       # Phone Error Rate calculation
│   └── services/               # External service wrappers
│       ├── llm_service.py      # Groq/Cerebras unified LLM client
│       └── tts_service.py      # Text-to-Speech via Groq Orpheus
├── frontend/                   # React SPA (Vite)
│   └── src/
│       ├── api/                # API client + endpoint constants
│       ├── components/         # Reusable UI components
│       ├── context/            # React Context providers (Auth, Settings, UI)
│       ├── hooks/              # Custom hooks (useAudio, useDashboard, etc.)
│       ├── pages/              # Page-level components
│       ├── config/             # Global configuration (colors, settings)
│       └── styles/             # CSS files
```

---

## Core Architecture Principles

### 1. Separation of Scoring and Feedback
> "Scoring is deterministic (cosine similarity on embeddings). The LLM is ONLY used for generating human-readable feedback text. The LLM never scores, detects phonemes, or judges correctness."

**Why?** LLMs are non-deterministic. Two identical audio recordings could get different scores if an LLM judged them. By separating concerns, scores are reproducible and auditable.

### 2. Precomputed Reference Data
> "Reference phoneme sequences, alignment maps, and embeddings are precomputed and stored in the database. They are NOT regenerated during each assessment."

**Why?** Performance optimization. Computing reference embeddings is expensive. By caching them, each assessment only needs to process the user's audio.

### 3. Service Layer Pattern
> "Views are thin HTTP handlers. All business logic lives in service classes (AssessmentService, AnalyticsService, AuthenticationService)."

**Why?** Testability, reusability, and clean separation. Views handle HTTP concerns, services handle domain logic.

### 4. Async Processing
> "LLM feedback generation and analytics updates run in background threads after assessment scores are returned."

**Why?** The assessment endpoint returns scores in ~2-3 seconds. LLM feedback takes 2-7 seconds more. By making it async, the user sees their scores immediately while feedback loads in the background.

### 5. Centralized Configuration
> "All scoring thresholds, API keys, and feature flags are in settings.py or .env files. Frontend settings are in globalConfig.js."

**Why?** Single source of truth. Changing a threshold like `WEAK_PHONEME_THRESHOLD` propagates everywhere instantly.

---

## Database Design (ER Summary)

```
User (accounts.User)
  ├── has many → UserSession (practice sessions)
  │     └── has many → Attempt (individual pronunciation attempts)
  │           └── has many → PhonemeError (per-phoneme results)
  ├── has many → SublevelProgress (completed sublevel records)
  ├── has many → SublevelSession (locked sentence assignments)
  ├── has many → UserProgress (daily analytics)
  ├── has many → PhonemeProgress (per-phoneme tracking)
  └── has one → StreakRecord (streak tracking)

Phoneme (library.Phoneme)
  └── linked via → SentencePhoneme → ReferenceSentence

ReferenceSentence (library.ReferenceSentence)
  ├── precomputed: phoneme_sequence, alignment_map, reference_embeddings
  └── audio_file (local or Supabase)
```

---

## Security Measures Implemented

| Feature | Implementation |
|---------|---------------|
| **JWT Authentication** | Access token (1h) + Refresh token (7d), rotation enabled |
| **Password Hashing** | Django's PBKDF2 with SHA-256 |
| **Reset Token Security** | SHA-256 hashed tokens stored in DB, raw token sent only once |
| **Rate Limiting** | Login: 5/min, Signup: 10/hr, Password Reset: 3/hr |
| **CORS** | Whitelist-based in production, allow-all only in DEBUG |
| **Admin Self-Protection** | Admins cannot demote/deactivate/delete themselves |
| **User Enumeration Prevention** | Password reset always returns same message regardless of email existence |
| **Token Blacklisting** | Refresh tokens are blacklisted after rotation |
| **Input Validation** | Django validators + DRF serializer validation on all inputs |
