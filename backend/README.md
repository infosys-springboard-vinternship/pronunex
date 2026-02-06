# Pronunex Backend

Django-based backend for the Pronunex speech therapy platform, providing pronunciation assessment, adaptive practice generation, and progress tracking APIs.

## Features

- **User Authentication**: JWT-based authentication with custom user model
- **Pronunciation Assessment**: Phoneme-level scoring using Wav2Vec2 embeddings
- **Adaptive Exercises**: AI-generated sentences targeting weak phonemes
- **Progress Analytics**: Aggregated statistics and improvement tracking
- **Reference Library**: 44 English phonemes with articulation guidance
- **LLM Integration**: Multiple LLM providers for feedback generation

## Technology Stack

- **Framework**: Django 4.2+ with Django REST Framework
- **Database**: PostgreSQL (via Supabase)
- **Audio Processing**: librosa, soundfile, pydub, scipy
- **NLP Models**: 
  - Wav2Vec2 (forced alignment)
  - G2P (grapheme-to-phoneme conversion)
  - Transformers (embeddings)
- **LLM Providers**: Google Gemini, Groq, Cerebras
- **Storage**: Supabase Storage or local filesystem

## Project Structure

```
backend/
├── manage.py                    # Django CLI
├── requirements.txt             # Python dependencies
├── .env.example                 # Environment template
│
├── config/                      # Django configuration
│   ├── settings.py              # Main settings
│   ├── urls.py                  # Root URL routing
│   ├── wsgi.py                  # WSGI application
│   └── asgi.py                  # ASGI application
│
├── apps/                        # Django applications
│   ├── accounts/                # User authentication & profiles
│   ├── library/                 # Phonemes & reference sentences
│   ├── practice/                # Sessions, attempts, assessment
│   ├── analytics/               # Progress tracking & statistics
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
│   ├── asr_validator.py         # Whisper ASR speech validation
│   ├── word_matcher.py          # DTW-based word alignment
│   ├── word_validator.py        # Word-level validation
│   ├── mistake_detector.py      # Multi-level error detection
│   ├── letter_highlighter.py    # Letter-level error visualization
│   ├── per_scorer.py            # Phone Error Rate scoring
│   └── edit_distance.py         # Levenshtein distance utils
│
├── services/                    # Shared services
│   └── llm_service.py           # LLM API wrapper
│
└── media/                       # Audio storage (gitignored)
    ├── references/              # Reference audio files
    └── user_uploads/            # User recordings
```

## Setup

### 1. Create Virtual Environment

```bash
python -m venv venv

# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure Environment

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
# Django
SECRET_KEY=your-secret-key-here
DEBUG=True

# Database
DATABASE_URL=postgresql://user:password@host:port/database

# LLM APIs
GEMINI_API_KEY=your_gemini_key
GROQ_API_KEY=your_groq_key
CEREBRAS_API_KEY=your_cerebras_key

# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
USE_SUPABASE_STORAGE=true
```

### 4. Run Migrations

```bash
python manage.py migrate
```

### 5. Seed Initial Data

```bash
python manage.py seed_data
```

This command creates:
- 44 English phonemes with articulation tips
- Reference sentences with precomputed data
- Sample practice exercises

### 6. Create Superuser

```bash
python manage.py createsuperuser
```

### 7. Run Development Server

```bash
python manage.py runserver
```

Backend will be available at `http://localhost:8000`

## API Endpoints
### Authentication (`/api/v1/auth/`)

- `POST /register/` - User registration
- `POST /login/` - User login (returns JWT tokens)
- `POST /logout/` - User logout
- `POST /token/refresh/` - Refresh access token
- `GET /profile/` - Get user profile
- `PUT /profile/` - Update user profile

### Library (`/api/v1/library/`)

- `GET /phonemes/` - List all phonemes
- `GET /phonemes/{id}/` - Get phoneme details
- `GET /sentences/` - List reference sentences
- `GET /sentences/{id}/` - Get sentence details

### Practice (`/api/v1/practice/`)

- `POST /sessions/` - Create practice session
- `GET /sessions/` - List user sessions
- `POST /assess/` - Submit audio for assessment
- `GET /attempts/` - List user attempts
- `GET /attempts/{id}/` - Get attempt details

### Analytics (`/api/v1/analytics/`)

- `GET /progress/` - Get user progress summary
- `GET /phoneme-stats/` - Get phoneme-level statistics
- `GET /weak-phonemes/` - Get current weak phonemes

## Core Modules

### NLP Core Engine

**audio_cleaner.py**: Normalizes audio, trims silence, resamples to 16kHz

**phoneme_extractor.py**: Converts text to ARPAbet phonemes using G2P

**aligner.py**: Performs Wav2Vec2 forced alignment for phoneme timestamps

**audio_slicer.py**: Slices audio into phoneme segments based on timestamps

**vectorizer.py**: Generates 768-dimensional embeddings from audio

**scorer.py**: Calculates cosine similarity between user and reference embeddings

**asr_validator.py**: Whisper-based transcription validation (gatekeeper before scoring)

**word_matcher.py**: DTW-based alignment between transcribed and expected words

**word_validator.py**: Word count and position validation before phoneme analysis

**mistake_detector.py**: Combines ASR + phoneme scores to pinpoint errors at word/phoneme/letter levels

**letter_highlighter.py**: Character-level error visualization using edit operations

**per_scorer.py**: Phone Error Rate (PER) calculation with penalty-based scoring

**edit_distance.py**: Levenshtein distance for word/phoneme accuracy calculation

### Assessment Flow

1. Receive audio file and sentence ID
2. Clean and preprocess audio
3. Fetch precomputed phoneme sequence from database
4. Run forced alignment on user audio
5. Slice audio into phoneme segments
6. Generate embeddings for each segment
7. Fetch cached reference embeddings
8. Calculate cosine similarity per phoneme
9. Identify weak phonemes (score < threshold)
10. Generate LLM feedback text
11. Save attempt and errors to database
12. Return structured response

### LLM Usage Constraints

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

## Database Models

### accounts.User
Custom user model with email authentication, native language, proficiency level

### library.Phoneme
44 English phonemes with ARPAbet, IPA, articulation tips

### library.ReferenceSentence
Practice sentences with precomputed phoneme sequences, alignment maps, reference embeddings

### practice.Attempt
User pronunciation attempts with scores and LLM feedback

### practice.PhonemeError
Per-phoneme error records for adaptive recommendations

### analytics.UserProgress
Daily aggregated progress metrics

### analytics.PhonemeProgress
Per-phoneme improvement tracking over time

## Configuration

### Scoring Configuration

In `config/settings.py`:

```python
SCORING_CONFIG = {
    'WEAK_PHONEME_THRESHOLD': 0.7,  # Configurable threshold
    'EMBEDDING_DIM': 768,           # Wav2Vec2 dimension
    'SAMPLE_RATE': 16000,           # Audio sample rate
    'SILENCE_TRIM_DB': 20,          # Silence threshold
}
```

### Storage Configuration

Toggle between local and Supabase storage:

```python
USE_SUPABASE_STORAGE = True  # Use Supabase
USE_SUPABASE_STORAGE = False # Use for local media/
```

## Testing

```bash
# Run all tests
python manage.py test

# Run specific app tests
python manage.py test apps.accounts
python manage.py test apps.practice

# Run with coverage
coverage run --source='.' manage.py test
coverage report
```

## Admin Panel

Access at `http://localhost:8000/admin/`

Features:
- User management
- Phoneme library management
- Reference sentence management
- Practice attempt review
- Progress analytics

## Development

### Creating Migrations

```bash
python manage.py makemigrations
python manage.py migrate
```

### Adding New Phonemes

```python
from apps.library.models import Phoneme

Phoneme.objects.create(
    arpabet='AE',
    ipa='æ',
    example_word='cat',
    articulation_tip='Lower jaw, spread lips'
)
```

### Adding Reference Sentences

```python
from apps.library.models import ReferenceSentence

ReferenceSentence.objects.create(
    text='The cat sat on the mat',
    difficulty='beginner',
    target_phonemes=['AE', 'AE', 'AE']
)
```

## Troubleshooting

### Audio Processing Issues

- Ensure `ffmpeg` is installed and in PATH
- Check audio format (WAV, 16kHz recommended)
- Verify file size limits in settings

### Database Connection

- Verify `DATABASE_URL` format
- Check PostgreSQL service is running
- Ensure database exists and is accessible

### LLM API Errors

- Verify API keys are correct
- Check API rate limits
- Ensure internet connectivity

## Performance Considerations

- Reference embeddings are cached in database
- Use Supabase storage for production to avoid local disk usage
- Consider Redis for session caching in production
- Use async tasks (Celery) for heavy audio processing

## Security

- Never commit `.env` file
- Rotate API keys regularly
- Use strong `SECRET_KEY` in production
- Set `DEBUG=False` in production
- Configure `ALLOWED_HOSTS` properly
- Use HTTPS in production

## Deployment

For production deployment:

1. Set `DEBUG=False`
2. Configure `ALLOWED_HOSTS`
3. Use production database
4. Set up static file serving
5. Configure CORS properly
6. Use environment variables for secrets
7. Set up logging and monitoring

## License

MIT License - see root LICENSE file

## Support

For issues, please use the GitHub issue tracker.
