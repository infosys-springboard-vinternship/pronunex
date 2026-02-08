---
description: Repository Information Overview
alwaysApply: true
---

# Pronunex Repository Information Overview

## Repository Summary
**Pronunex** is an AI-powered speech therapy platform designed to evaluate pronunciation accuracy, identify phoneme-level errors, and provide personalized practice exercises. It uses **Wav2Vec2** for pronunciation assessment and **LLMs** (Gemini, Groq, Cerebras) for generating human-readable feedback.

## Repository Structure
The project is organized as a multi-project repository with distinct backend and frontend components.

### Main Repository Components
- **[./backend](./backend)**: Django REST Framework backend handling audio processing, NLP analysis, and data management.
- **[./frontend](./frontend)**: React frontend built with Vite, providing the user interface for practice and progress tracking.
- **[./docs](./docs)**: Project documentation and guides.

---

## Projects

### Backend (Django REST Framework)
**Configuration File**: [./backend/requirements.txt](./backend/requirements.txt)

#### Language & Runtime
- **Language**: Python
- **Version**: 3.10+
- **Build System**: pip
- **Package Manager**: pip

#### Dependencies
- **Main Dependencies**:
    - `Django >= 4.2`
    - `djangorestframework >= 3.14`
    - `librosa == 0.10.2.post1` (Audio Processing)
    - `torch == 2.2.2`, `torchaudio == 2.2.2` (Deep Learning)
    - `transformers == 4.38.2` (Wav2Vec2 Models)
    - `groq >= 0.4`, `cerebras-cloud-sdk >= 1.0` (LLM Integration)
    - `supabase >= 2.0` (Storage & Database)
- **Development Dependencies**:
    - `psycopg2-binary`
    - `python-dotenv`

#### Build & Installation
```bash
cd backend
python -m venv venv
# Windows: venv\Scripts\activate | Linux/Mac: source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python manage.py migrate
python manage.py seed_data
python manage.py runserver
```

#### Testing
- **Framework**: Django Test Runner
- **Test Location**: Inside `apps/*/tests.py` or `tests/` directories within app folders.
- **Naming Convention**: `test_*.py`
- **Run Command**:
```bash
cd backend
python manage.py test
```

---

### Frontend (React + Vite)
**Configuration File**: [./frontend/package.json](./frontend/package.json)

#### Language & Runtime
- **Language**: JavaScript (React)
- **Version**: Node.js 18+
- **Build System**: Vite 6
- **Package Manager**: npm

#### Dependencies
- **Main Dependencies**:
    - `react ^18.3.1`
    - `react-router-dom ^7.1.1`
    - `recharts ^2.15.0` (Progress Charts)
    - `lucide-react ^0.469.0` (Icons)
    - `@supabase/supabase-js ^2.95.3` (Storage Client)
    - `framer-motion ^12.27.5` (Animations)
- **Development Dependencies**:
    - `vite ^6.0.7`
    - `tailwindcss ^4.1.18`
    - `eslint ^9.17.0`
    - `prettier ^3.4.2`

#### Build & Installation
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

#### Operations
- **Build**: `npm run build`
- **Lint**: `npm run lint`
- **Format**: `npm run format`

#### Testing
- **Validation**: ESLint for code quality and Prettier for formatting.
- **Run Command**:
```bash
cd frontend
npm run lint
```
