# NLP Pipeline Deep Dive (The Heart of Pronunex)

> **This is the most likely focus of your viva.** The NLP pipeline is what makes Pronunex unique. Know every stage.

---

## End-to-End Pipeline Flow

```
User speaks into microphone
        │
        ▼
┌─────────────────────┐
│  1. Audio Capture    │  Frontend: useAudio hook → MediaRecorder API
│     (Browser)        │  Format: audio/webm;codecs=opus
└────────┬────────────┘
         │  HTTP POST (multipart/form-data)
         ▼
┌─────────────────────┐
│  2. Audio Cleaning   │  audio_cleaner.py
│     (Backend)        │  → Convert webm → wav (FFmpeg)
│                      │  → Resample to 16kHz (model requirement)
│                      │  → Noise reduction (noisereduce library)
│                      │  → Normalize amplitude
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│  3. ASR Validation   │  asr_validator.py
│     (Gatekeeper)     │  → Send audio to Groq Whisper API
│                      │  → Get transcription + word timestamps
│                      │  → Compare with expected text (SequenceMatcher + Levenshtein + DTW)
│                      │  → Hallucination detection
│                      │  → Decision: match (≥0.9) / partial (≥0.6) / mismatch (<0.6)
│                      │  → If mismatch → REJECT (don't score wrong speech)
└────────┬────────────┘
         │  (only if can_proceed=True)
         ▼
┌─────────────────────┐
│  4. Forced Alignment │  aligner.py
│                      │  → Map audio segments to individual phonemes
│                      │  → Use word timestamps from Whisper
│                      │  → Slice audio into phoneme-level chunks
│                      │  → Each chunk = one phoneme's audio
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│  5. Embedding Gen    │  vectorizer.py
│                      │  → Load Wav2Vec2 model (facebook/wav2vec2-base)
│                      │  → Feed each phoneme audio chunk through model
│                      │  → Extract 768-dimensional embedding vector per phoneme
│                      │  → Output: List[np.ndarray] — user embeddings
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│  6. Cosine Scoring   │  scorer.py
│                      │  → Compare user_embedding[i] vs reference_embedding[i]
│                      │  → similarity = 1 - cosine_distance(user, ref)
│                      │  → Score range: 0.0 (completely different) to 1.0 (perfect match)
│                      │  → Validation: check for NaN, Inf, zero vectors
│                      │  → Mark phonemes below threshold as "weak"
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│  7. Mistake Detect   │  mistake_detector.py + per_scorer.py
│                      │  → Word-level diff (SequenceMatcher)
│                      │  → Substitution pattern detection (TH→T, R→W, etc.)
│                      │  → Phone Error Rate (PER) calculation
│                      │  → Position-based analysis (initial/medial/final)
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│  8. Score Assembly   │  services.py (AssessmentService)
│     + DB Save        │  → Calculate overall score (weighted average)
│                      │  → Apply score boost (+0.15 for encouragement)
│                      │  → Save Attempt + PhonemeError records to DB
│                      │  → Return instant scores to frontend
└────────┬────────────┘
         │  (async background thread)
         ▼
┌─────────────────────┐
│  9. LLM Feedback     │  feedback_generator.py + llm_service.py
│     (Async)          │  → Build prompt with PRE-COMPUTED scores
│                      │  → Send to Groq (Llama 3.3) / Cerebras fallback
│                      │  → Parse JSON response
│                      │  → Update Attempt.llm_feedback in DB
│                      │  → Frontend polls /attempt-feedback/ to get it
└─────────────────────┘
```

---

## Stage-by-Stage Breakdown

### Stage 1: Audio Capture (Frontend)

**File:** `frontend/src/hooks/useAudio.js`

```javascript
const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
mediaRecorder.start(100); // Collect data chunks every 100ms
```

**Q: Why WebM/Opus format?**
"Opus is the most efficient audio codec for speech. It provides good quality at low bitrates. WebM is natively supported by Chrome and Firefox without requiring any plugins."

**Q: What audio constraints are used?**
```javascript
audio: {
    echoCancellation: true,   // Removes echo from speakers
    noiseSuppression: true,   // Reduces background noise
    sampleRate: 44100,        // High quality capture
}
```
"We capture at 44.1kHz for quality, then the backend resamples to 16kHz because that's what the Wav2Vec2 model expects."

**Q: How does the recording state machine work?**
```
IDLE → REQUESTING → RECORDING → PROCESSING → IDLE (with audioBlob)
                  → DENIED (permission refused)
                  → ERROR (hardware issue)
```

**Q: What is the max recording duration?**
"30 seconds by default. The hook auto-stops recording at `maxDuration` to prevent oversized uploads."

---

### Stage 2: Audio Cleaning

**File:** `backend/nlp_core/audio_cleaner.py`

**Q: Why do we need audio cleaning?**
"Browser audio (WebM/Opus) needs conversion to WAV format for PyTorch processing. We also need to:
1. **Resample to 16kHz** — Wav2Vec2 was trained on 16kHz audio
2. **Remove noise** — Users record in noisy environments
3. **Normalize amplitude** — Different microphones produce different volume levels"

**Q: What tool does the conversion?**
"FFmpeg. It's an industry-standard tool for audio/video processing. We shell out to `ffmpeg` to convert WebM → WAV."

**Q: What happens if the audio is too short or silent?**
"The pipeline detects silence and returns an error asking the user to speak more clearly. The ASR step will also return empty transcription for silent audio."

---

### Stage 3: ASR Validation (The GATEKEEPER)

**File:** `backend/nlp_core/asr_validator.py`

This is the **most critical safety mechanism** in the pipeline.

**Q: What problem does ASR validation solve?**
"The 'Yes Man' bug. Without this gate, if a user said 'hello world' when expected to say 'she sells seashells,' the system would still try to score it and produce garbage scores. The ASR validator REJECTS audio that doesn't match the expected text."

**Q: How does it work step by step?**
1. Send audio to **Groq Whisper API** (whisper-large-v3-turbo model)
2. Get back transcription text + word-level timestamps
3. Compare transcription vs expected text using **three methods:**
   - `SequenceMatcher.ratio()` — character-level similarity
   - `edit_distance_similarity()` — Levenshtein distance based
   - `compare_word_sequences()` — DTW (Dynamic Time Warping) word alignment
4. Take the **maximum** of the similarity scores
5. Decision:
   - ≥ 0.9 → `match` → proceed to scoring
   - ≥ 0.6 → `partial` → proceed but show word mistakes
   - < 0.6 → `mismatch` → REJECT, ask user to try again

**Q: What is hallucination detection?**
```python
def _is_hallucination(text):
    # Check for non-ASCII characters (>30% ratio)
    # Check for repeated characters (6+ same char)
    # Check for same word repeated >50% of the time
    # Check for no spaces in long text
```
"Whisper sometimes hallucinates — producing garbage like 'سيبالسيبال' or 'éééééé' on noisy audio. We detect these patterns and return empty transcription instead, which triggers a clean error message."

**Q: Why use `max(sequence_similarity, levenshtein_similarity)`?**
"Different similarity metrics perform better on different types of errors. SequenceMatcher is better for word order issues, Levenshtein is better for character substitutions. Taking the max gives the most generous (user-friendly) comparison."

---

### Stage 4: Forced Alignment

**File:** `backend/nlp_core/aligner.py`

**Q: What is forced alignment?**
"Forced alignment maps audio segments to their corresponding phonemes. Given the audio and the known text, it determines WHEN each phoneme was spoken. Output: start/end timestamps for each phoneme in the audio."

**Q: Why do we need it?**
"To score individual phonemes, we need to isolate each phoneme's audio. Without alignment, we'd only have a single score for the whole sentence, which isn't useful for targeted feedback."

**Q: Where do word timestamps come from?**
"From Groq Whisper API. When we request `timestamp_granularities=['word']`, Whisper returns start/end times for each word. We then split further into phonemes based on the precomputed alignment map."

---

### Stage 5: Embedding Generation (Vectorizer)

**File:** `backend/nlp_core/vectorizer.py`

**Q: What is Wav2Vec2?**
"A self-supervised speech representation model by Facebook/Meta. It was trained on 960 hours of LibriSpeech audio. It converts raw audio waveforms into 768-dimensional dense vectors (embeddings) that capture the acoustic and linguistic properties of speech."

**Q: Why Wav2Vec2 specifically?**
"Three reasons:
1. It captures phonemic features — it was designed for speech representation
2. It produces fixed-dimensional vectors that can be compared mathematically
3. The `wav2vec2-base` model is small enough to run on CPU (no GPU required)"

**Q: What does the embedding represent?**
"Each 768-dimensional vector encodes acoustic features like formant frequencies, voice onset time, spectral patterns, and phonemic characteristics. Two similar-sounding phonemes will have similar vectors (small cosine distance)."

---

### Stage 6: Cosine Similarity Scoring

**File:** `backend/nlp_core/scorer.py`

```python
def calculate_cosine_similarity(vec1, vec2):
    # Validate: NaN, Inf, zero vectors
    norm1 = np.linalg.norm(vec1)
    norm2 = np.linalg.norm(vec2)
    if norm1 == 0 or norm2 == 0:
        return 0.0
    
    distance = cosine(vec1, vec2)       # scipy.spatial.distance.cosine
    similarity = 1.0 - distance         # Convert distance to similarity
    return max(0.0, min(1.0, similarity))  # Clamp to [0, 1]
```

**Q: What is cosine similarity?**
"It measures the angle between two vectors. If two vectors point in the same direction, cosine similarity = 1 (identical). If perpendicular, cosine similarity = 0 (unrelated). It ranges from -1 to 1, but we clamp to [0, 1] since negative similarity doesn't make sense for pronunciation."

**Q: Why cosine similarity instead of Euclidean distance?**
"Cosine similarity is magnitude-invariant — it only cares about direction, not length. This means a quietly spoken phoneme and a loudly spoken phoneme can still get the same score, because the acoustic pattern is the same regardless of volume."

**Q: What validations does the scorer perform?**
1. **Embedding count mismatch** — user has different number of phonemes than expected
2. **Zero embeddings** — more than 50% zero vectors means bad audio quality
3. **NaN/Inf embeddings** — numerical processing errors
4. **All-zero scores** — complete scoring failure

"Instead of faking scores (which the old code did), we now return an `unscorable` result with a helpful message like 'Speak closer to the microphone in a quiet environment.'"

### Substitution Pattern Detection
```python
SUBSTITUTION_PATTERNS = {
    ('TH', 'T'): 'Voiceless TH fronting',    # "think" → "tink"
    ('R', 'W'):  'R/W gliding',               # "red" → "wed"
    ('L', 'Y'):  'L/Y gliding',               # "like" → "yike"
    ('S', 'TH'): 'Interdental lisp',          # "sing" → "thing"
    ('K', 'T'):  'Fronting',                   # "cat" → "tat"
    ('Z', 'S'):  'Devoicing',                  # "buzz" → "buss"
    ...
}
```

**Q: What are substitution patterns?**
"They are common pronunciation errors that follow predictable rules. For example, many non-native speakers substitute 'TH' with 'T' (saying 'tink' instead of 'think'). By detecting these patterns, we can give specific coaching like 'Place your tongue between your teeth for TH sounds.'"

---

### Stage 7: Word-Level Analysis

**Q: What is the word diff?**
```python
# Using SequenceMatcher from difflib
Expected:    ["she", "sells", "seashells"]
Transcribed: ["she", "sell",  "seashell"]

Result:
  - "she"       → type: "correct"
  - "sells"     → type: "wrong", issue: "missing_ending_s"
  - "seashells" → type: "wrong", issue: "missing_ending_s"
```

"We compare transcribed words with expected words to identify exactly what the user said differently. The `_detect_word_issue()` function classifies the error type: missing endings, missing beginnings, character substitutions, or general mispronunciation."

---

### Stage 8: Score Assembly (`AssessmentService.process_attempt`)

**File:** `backend/apps/practice/services.py`

```python
class AssessmentService:
    def process_attempt(self, audio_path, sentence, user):
        # 1. Clean audio
        cleaned_path = self.audio_cleaner.clean(audio_path)
        
        # 2. ASR validation (gatekeeper)
        asr_result = self.asr_validator.validate(cleaned_path, sentence.text)
        if not asr_result['can_proceed']:
            return self._build_rejection_response(asr_result)
        
        # 3. Run NLP pipeline (alignment + embedding + scoring)
        nlp_result = self._run_nlp_pipeline(cleaned_path, sentence)
        
        # 4. Calculate overall score
        overall_score = calculate_overall_score(nlp_result['phoneme_scores'])
        boosted_score = min(1.0, overall_score + SCORE_BOOST)
        
        # 5. Generate error summary
        error_summary = generate_error_summary(nlp_result['phoneme_scores'])
        
        return {
            'score': boosted_score,
            'phoneme_scores': nlp_result['phoneme_scores'],
            'word_scores': nlp_result['word_scores'],
            'asr_result': asr_result,
            'error_summary': error_summary,
        }
```

**Q: What is SCORE_BOOST (0.15)?**
"A pedagogical decision. Raw cosine similarity scores can feel harsh — even near-perfect pronunciation might only get 0.75. The 0.15 boost makes scores more encouraging while maintaining relative ordering. It's the same principle as grading curves in education."

**Q: What is Dev Mode?**
"When PyTorch/torchaudio are not installed (e.g., on a laptop without GPU), the system enters 'Dev Mode.' It generates realistic-looking random scores so the frontend can still be developed and tested without a full AI environment. Dev mode is detected via a try/except on the import, not a config flag."

---

### Stage 9: LLM Feedback (Async)

**File:** `backend/apps/llm_engine/feedback_generator.py`

```python
def generate_pronunciation_feedback(phoneme_scores, weak_phonemes, sentence_text, overall_score):
    prompt = build_feedback_prompt(
        sentence_text=sentence_text,
        overall_score=overall_score,         # PRE-COMPUTED, not asked to judge
        weak_phonemes=weak_phonemes,         # PRE-COMPUTED
        phoneme_scores=phoneme_scores        # PRE-COMPUTED
    )
    
    result = llm.generate(prompt=prompt, provider="auto")
    
    if not result['success']:
        return generate_fallback_feedback(overall_score, weak_phonemes)
    
    return validate_feedback_response(result['content'], weak_phonemes)
```

**Q: What does the LLM receive vs. what does it generate?**
- **Receives:** Pre-computed scores, list of weak phonemes, the sentence text
- **Generates:** Human-readable summary, articulation tips, encouragement, practice focus areas
- **Does NOT:** Score pronunciation, detect phonemes, or make accuracy judgments

**Q: What is the fallback when LLM fails?**
"A rule-based template system. It maps score ranges to predefined messages (Excellent/Good/Fair/Challenging) and provides basic articulation tips from a hardcoded dictionary. This ensures the user always gets SOME feedback even if both LLM providers (Groq and Cerebras) are down."

**Q: How does the LLM provider fallback work?**
```
User request → Try Groq (llama-3.3-70b-versatile)
                  ├─ Success → Return response
                  └─ Failure → Try Cerebras (llama-3.3-70b)
                                  ├─ Success → Return response
                                  └─ Failure → Use rule-based fallback
```
"The `LLMService.generate()` method iterates through providers in order. Both use the same Llama 3.3 70B model but different inference providers, so if one is rate-limited or down, the other likely works."

---

## Key Design Decisions to Know

### Why NOT use LLM for scoring?
"Three fundamental reasons:
1. **Non-deterministic:** The same audio could get different scores on different attempts
2. **Non-auditable:** You can't mathematically prove an LLM score is correct
3. **Latency:** LLM inference takes 2-7 seconds. Cosine similarity takes <100ms
By separating scoring (deterministic math) from feedback (LLM text), we get fast, reproducible scores with rich human-readable coaching."

### Why precompute reference data?
"Computing Wav2Vec2 embeddings is expensive (~500ms per sentence). By precomputing reference embeddings when sentences are added to the library, the assessment pipeline only processes the user's audio. This cuts assessment time in half."

### Why use Groq Whisper instead of local Whisper?
"Local Whisper requires downloading a 1.5GB model and uses significant RAM/CPU. The Groq API provides the same whisper-large-v3-turbo model with sub-second inference time, accessible via a simple HTTP call. Trade-off: requires internet, but saves ~2GB RAM."
