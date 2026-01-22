# Pronunex API Contract Documentation

## Overview
This document serves as contract for the Pronunex Backend API. It describes the available endpoints, their purpose, and the expected data exchange formats.

**Base URL**: `/api/v1/`

## Authentication
The API uses **JWT (JSON Web Tokens)** for authentication.
1.  **Login** or **Register** to receive an `access` token and a `refresh` token.
2.  Include the `access` token in the `Authorization` header for all protected requests:
    ```
    Authorization: Bearer <your_access_token>
    ```
3.  When the access token expires, use the refresh endpoints (standard SimpleJWT behavior) to obtain a new one.

---

## 1. Accounts & Authentication

### Register User
**POST** `/auth/register/`
-   **Purpose**: Create a new user account.
-   **Input**: `email`, `username`, `full_name`, `password`, `password_confirm`, `native_language`, `proficiency_level`.
-   **Output**: The created user profile and initial auth tokens.

### Login
**POST** `/auth/login/`
-   **Purpose**: Authenticate an existing user.
-   **Input**: `email`, `password`.
-   **Output**: User profile and auth tokens (`access`, `refresh`).

### Get Profile
**GET** `/auth/profile/`
-   **Purpose**: Retrieve the currently logged-in user's profile information.
-   **Output**: User details (id, email, username, stats, etc.).

### Update Profile
**PUT** `/auth/profile/`
-   **Purpose**: Update user profile details.
-   **Input**: JSON object with fields to update (e.g., `full_name`, `native_language`).
-   **Output**: The updated user profile.

---

## 2. Library (Content)

### List Phonemes
**GET** `/library/phonemes/`
-   **Purpose**: Get a list of all English phonemes supported by the system.
-   **Query Params**: `search` (optional).
-   **Output**: List of phoneme objects (symbol, IPA, type, description).

### Get Phoneme Details
**GET** `/library/phonemes/{id}/`
-   **Purpose**: Get detailed information about a specific phoneme, including articulation tips.
-   **Output**: Detailed phoneme object.

### List Sentences
**GET** `/library/sentences/`
-   **Purpose**: Browse practice sentences.
-   **Query Params**: 
    -   `difficulty_level` (beginner/intermediate/advanced)
    -   `search` (text search)
-   **Output**: List of sentence summaries.

### Get Recommended Sentences
**GET** `/library/sentences/recommend/`
-   **Purpose**: Get personalized sentence recommendations based on the user's weak phonemes.
-   **Query Params**: 
    -   `limit` (default 5)
    -   `difficulty` (optional override)
-   **Output**: List of recommended sentences and the weak phonemes they target.

### Get Sentence Audio
**GET** `/library/sentences/{id}/audio/`
-   **Purpose**: stream or download the reference audio for a sentence.
-   **Behavior**: Generates audio on-the-fly using TTS if it doesn't exist.
-   **Output**: WAV audio file.

---

## 3. Practice & Assessment

### List Sessions
**GET** `/practice/sessions/`
-   **Purpose**: View history of practice sessions.
-   **Output**: List of past sessions with scores and dates.

### Create Session
**POST** `/practice/sessions/`
-   **Purpose**: Start a new practice session explicitly (optional, usually handled automatically).
-   **Output**: New session object.

### End Session
**POST** `/practice/sessions/{id}/end/`
-   **Purpose**: Mark a session as finished and calculate final aggregate stats.
-   **Output**: Session summary.

### Assess Pronunciation (Core Feature)
**POST** `/practice/assess/`
-   **Purpose**: Upload a user's voice recording to evaluate pronunciation against a target sentence.
-   **Input (Multipart Form)**: 
    -   `audio`: The recorded audio file (WAV/Blob).
    -   `sentence_id`: ID of the sentence being practiced.
-   **Output**: Detailed assessment result:
    -   `overall_score` (0-100)
    -   `fluency_score`
    -   `weak_phonemes` (list of mispronounced sounds)
    -   `phoneme_scores` (breakdown)
    -   `llm_feedback` (textual coaching tips)

---

## 4. Analytics & Progress

### Progress Dashboard
**GET** `/analytics/progress/`
-   **Purpose**: Get a high-level summary of user progress for the dashboard.
-   **Query Params**: `days` (default 30).
-   **Output**: 
    -   Total sessions/minutes/attempts.
    -   Overall average score.
    -   Current weak & strong phonemes.
    -   Score trend (improving/stable/declining).
    -   Streak info.

### Phoneme Statistics
**GET** `/analytics/phoneme-stats/`
-   **Purpose**: Detailed breakdown of performance per phoneme.
-   **Output**: 
    -   Phonemes grouped by type (vowels/consonants).
    -   `weak_phonemes_detail`: Specifics on problematic sounds, including common error contexts (e.g., "Often mispronounced at the end of words").
