# Pronunex API Endpoints Summary

**Total Endpoints: 24**

Base URL: `http://localhost:8000/api/v1/`

---

## Authentication (8 endpoints)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/auth/register/` | User registration | No |
| POST | `/auth/login/` | JWT login, returns access & refresh tokens | No |
| POST | `/auth/logout/` | Blacklist refresh token | Yes |
| POST | `/auth/token/refresh/` | Refresh access token | No |
| GET | `/auth/profile/` | Get user profile | Yes |
| PUT | `/auth/profile/` | Update user profile | Yes |
| POST | `/auth/password/reset/` | Request password reset email | No |
| POST | `/auth/password/reset/confirm/` | Confirm password reset with token | No |
| POST | `/auth/password/change/` | Change password (logged in) | Yes |

---

## Library - Phonemes & Sentences (7 endpoints)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/library/phonemes/` | List all 44 English phonemes | Yes |
| GET | `/library/phonemes/{id}/` | Get phoneme details (ARPAbet, IPA, tips) | Yes |
| GET | `/library/sentences/` | List practice sentences | Yes |
| GET | `/library/sentences/{id}/` | Get sentence with phoneme data | Yes |
| GET | `/library/sentences/{id}/audio/` | Get TTS audio for sentence | Yes |
| GET | `/library/sentences/recommend/` | Personalized sentence recommendations | Yes |
| POST | `/library/sentences/pregenerate/` | Pre-generate sentence embeddings | Yes |

---

## Practice - Sessions & Assessment (6 endpoints)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/practice/sessions/` | List user's practice sessions | Yes |
| POST | `/practice/sessions/` | Create new practice session | Yes |
| GET | `/practice/sessions/{id}/` | Get session with attempts | Yes |
| POST | `/practice/sessions/{id}/end/` | End session, calculate metrics | Yes |
| GET | `/practice/attempts/` | List user's pronunciation attempts | Yes |
| GET | `/practice/attempts/{id}/` | Get attempt details with errors | Yes |
| **POST** | `/practice/assess/` | **Core pronunciation assessment** | Yes |

---

## Analytics - Progress Tracking (4 endpoints)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/analytics/progress/` | Progress dashboard (scores, streaks, trends) | Yes |
| GET | `/analytics/phoneme-stats/` | Per-phoneme analytics | Yes |
| GET | `/analytics/weak-phonemes/` | Get current weak phonemes | Yes |
| GET | `/analytics/history/` | Daily progress history | Yes |

---

## Authentication Header

For authenticated endpoints, include:
```
Authorization: Bearer <ACCESS_TOKEN>
```

---

## Quick Reference

| Category | Count | Base Path |
|----------|-------|-----------|
| Authentication | 8 | `/api/v1/auth/` |
| Library | 7 | `/api/v1/library/` |
| Practice | 6 | `/api/v1/practice/` |
| Analytics | 4 | `/api/v1/analytics/` |
| **Total** | **24** | |
