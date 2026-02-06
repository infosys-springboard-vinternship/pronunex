# Pronunex Backend Documentation

**Intelligent Speech Therapy Platform with Adaptive Exercises and Progress Tracking**

---

## Overview

Pronunex is an AI-powered speech therapy backend that evaluates pronunciation, generates personalized feedback, and adapts practice content based on user weaknesses.

### Architecture Principles

1. **Separation of Concerns**: NLP Core handles signal processing, LLM Engine only generates feedback text
2. **Deterministic Scoring**: All pronunciation scores use cosine similarity on embeddings
3. **LLM Constraints**: LLM never scores, detects phonemes, or judges speech correctness
4. **Precomputed Data**: Reference phonemes and embeddings are cached, not regenerated per request

---

## Project Structure

```
backend/
├── manage.py                    # Django entry point
├── requirements.txt             # Python dependencies
├── .env                         # Environment variables
│
├── config/                      # Django configuration
│   ├── settings.py              # Main settings
│   ├── urls.py                  # Root URL routing
│   ├── wsgi.py                  # WSGI application
│   └── asgi.py                  # ASGI application
│
├── apps/                        # Django applications
│   ├── accounts/                # User authentication
│   ├── library/                 # Phonemes & reference sentences
│   ├── practice/                # Sessions, attempts, assessment
│   ├── analytics/               # Progress tracking
│   ├── llm_engine/              # LLM feedback generation
│   └── sentence_engine/         # Adaptive sentence generation
│
├── nlp_core/                    # Signal processing modules
│   ├── audio_cleaner.py         # Audio preprocessing
│   ├── phoneme_extractor.py     # G2P conversion
│   ├── aligner.py               # Wav2Vec2 forced alignment
│   ├── audio_slicer.py          # Phoneme segmentation
│   ├── vectorizer.py            # Audio to embeddings
│   ├── scorer.py                # Cosine similarity scoring
│   ├── asr_validator.py         # Whisper ASR validation
│   ├── word_matcher.py          # DTW word alignment
│   ├── word_validator.py        # Word-level validation
│   ├── mistake_detector.py      # Multi-level error detection
│   ├── letter_highlighter.py    # Letter-level visualization
│   ├── per_scorer.py            # Phone Error Rate scoring
│   └── edit_distance.py         # Levenshtein utils
│
├── services/                    # Shared services
│   └── llm_service.py           # LLM API wrapper
│
└── media/                       # Audio storage
    ├── references/              # Reference audio files
    └── user_uploads/            # User recordings
```

---

## Quick Start

### 1. Create Virtual Environment

```bash
cd e:\Infosys\Speech_Therapy_Project\pronunex\backend
python -m venv venv_p
venv_p\Scripts\activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Run Migrations

```bash
python manage.py migrate
```

### 4. Seed Initial Data

```bash
python manage.py seed_data
```

### 5. Create Superuser

```bash
python manage.py createsuperuser
```

### 6. Run Development Server

```bash
python manage.py runserver
```

---

## Configuration

### Environment Variables (.env)

| Variable | Description |
|----------|-------------|
| `SECRET_KEY` | Django secret key |
| `DEBUG` | Debug mode (True/False) |
| `DATABASE_URL` | PostgreSQL connection string |
| `GROQ_API_KEY` | Groq API key for LLM |
| `GEMINI_API_KEY` | Google Gemini API key |
| `CEREBRAS_API_KEY` | Cerebras API key |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anonymous key |
| `USE_SUPABASE_STORAGE` | Enable Supabase storage (true/false) |

### Scoring Configuration

In `settings.py`:

```python
SCORING_CONFIG = {
    'WEAK_PHONEME_THRESHOLD': 0.7,  # Configurable
    'EMBEDDING_DIM': 768,
    'SAMPLE_RATE': 16000,
    'SILENCE_TRIM_DB': 20,
}
```

---

## Core Modules

### NLP Core Engine

**audio_cleaner.py**: Normalizes, trims silence, resamples to 16kHz
**phoneme_extractor.py**: Converts text to ARPAbet using G2P
**aligner.py**: Wav2Vec2 forced alignment for timestamps
**audio_slicer.py**: Slices audio by phoneme timestamps
**vectorizer.py**: Generates 768-dim embeddings
**scorer.py**: Calculates cosine similarity scores
**asr_validator.py**: Whisper transcription + hallucination detection
**word_matcher.py**: DTW alignment for transcribed vs expected words
**word_validator.py**: Word count/position validation
**mistake_detector.py**: Combines ASR + phoneme scores for error detection
**letter_highlighter.py**: Character-level error highlighting
**per_scorer.py**: Phone Error Rate (PER) scoring
**edit_distance.py**: Levenshtein distance calculations

### Assessment Flow

1. Receive audio + sentence_id
2. Clean audio (normalize, trim, resample)
3. Fetch precomputed phoneme sequence from DB
4. Run forced alignment on user audio
5. Slice audio into phoneme segments
6. Generate embeddings for each slice
7. Fetch precomputed reference embeddings (cached)
8. Calculate cosine similarity per phoneme
9. Identify weak phonemes (score < 0.7 threshold)
10. Generate LLM feedback (text only)
11. Save attempt and errors to DB
12. Return structured response

---

## Database Models

### accounts.User
Custom user with email authentication, native_language, proficiency_level

### library.Phoneme
44 English phonemes with ARPAbet, IPA, articulation tips

### library.ReferenceSentence
Practice sentences with precomputed phoneme_sequence, alignment_map, reference_embeddings

### practice.Attempt
User pronunciation attempts with scores and LLM feedback

### practice.PhonemeError
Per-phoneme error records for recommendations

### analytics.UserProgress
Daily aggregated progress for dashboards

### analytics.PhonemeProgress
Per-phoneme improvement tracking

---

## LLM Usage Constraints

**ALLOWED:**
- Generating human-readable feedback text
- Creating practice sentences (with G2P validation)
- Explaining recommendations
- Conversational coaching

**PROHIBITED:**
- Scoring pronunciation
- Detecting phonemes
- Judging speech correctness

All LLM outputs are validated before use.

---

## Testing

```bash
# Run all tests
python manage.py test

# Run specific app tests
python manage.py test apps.accounts
python manage.py test apps.practice

# NLP core tests
python -m pytest nlp_core/tests/ -v
```

---

## Admin Panel

Access at: `http://localhost:8000/admin/`

Features:
- User management
- Phoneme data
- Reference sentences
- Practice attempts
- Progress analytics
