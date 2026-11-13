# DRISHTIRAKSHA

**Real-Time Multimodal Deepfake Detection and Coordinated Misinformation Intelligence Platform**

> Hackathon project for YUKTIK 2026 — Problem Statement PS11

## What is DRISHTIRAKSHA?

DRISHTIRAKSHA is an investigator-facing platform that analyzes suspicious media and text to detect deepfakes, verify factual claims, and identify potentially coordinated misinformation campaigns.

### Modules

| Module | Responsibility | Stage 1 Status |
|---|---|---|
| **CORE_BACKEND** | FastAPI app, investigation lifecycle, API, database, orchestration | ✅ Implemented |
| **MEDIA_AI** | Image/audio/video deepfake detection, media fingerprinting | 🔲 Planned |
| **CLAIM_AI** | Multilingual claim extraction, evidence retrieval, verification | 🔲 Planned |
| **NETWORK_AI** | Account relationship graphs, coordination detection | 🔲 Planned (starter code available) |
| **PROPAGATION** | Posting timelines, repost lineage, spread indicators | 🔲 Planned (starter code available) |
| **FRONTEND** | Next.js investigator dashboard | 🔲 Planned |

### Investigation Lifecycle

Investigations progress through: `QUEUED` → `PROCESSING` → `COMPLETED` / `PARTIAL` / `FAILED`

Each module independently tracks: `PENDING` → `RUNNING` → `COMPLETED` / `FAILED` / `UNAVAILABLE` / `NOT_APPLICABLE`

A failure in one module does not erase results from other modules.

## Current Status (Stage 1)

- ✅ FastAPI backend with investigation CRUD
- ✅ SQLite persistence with async I/O
- ✅ Safe media upload handling with validation
- ✅ Investigation lifecycle state machine
- ✅ Per-module status tracking
- ✅ Health endpoint
- ✅ Comprehensive test suite
- 🔲 AI model inference (deferred to Stage 2+)
- 🔲 Frontend (deferred to Stage 2)
- 🔲 Network/Propagation integration (starter code preserved in `reference/`)

## Setup

### Prerequisites

- Python 3.12+
- Node.js 20+ (for frontend, future)
- Git

### Backend Setup

```powershell
# Clone
git clone https://github.com/abhinav2007-cyber/drishtiraksha.git
cd drishtiraksha

# Install Python dependencies
py -3.12 -m pip install -r backend/requirements.txt

# Copy and configure environment
copy .env.example .env
# Edit .env with your settings (API keys, etc.)

# Start the backend
py -3.12 -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
```

### API Startup

```powershell
cd C:\Projects\drishtiraksha
py -3.12 -m uvicorn backend.main:app --reload --port 8000
```

The API will be available at `http://127.0.0.1:8000`.

Interactive docs: `http://127.0.0.1:8000/docs`

### Run Tests

```powershell
cd C:\Projects\drishtiraksha
py -3.12 -m pytest backend/tests/ -v
```

## API Overview

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/health` | Health check with module availability |
| `POST` | `/api/v1/investigations` | Create investigation (text or file upload) |
| `GET` | `/api/v1/investigations` | List all investigations |
| `GET` | `/api/v1/investigations/{id}` | Get full investigation details |
| `GET` | `/api/v1/investigations/{id}/status` | Lightweight status poll |
| `GET` | `/api/v1/investigations/{id}/media` | Media analysis results |
| `GET` | `/api/v1/investigations/{id}/claims` | Claim analysis results |
| `GET` | `/api/v1/investigations/{id}/network` | Network analysis results |
| `GET` | `/api/v1/investigations/{id}/propagation` | Propagation timeline results |

### Example: Create a text investigation

```bash
curl -X POST http://127.0.0.1:8000/api/v1/investigations \
  -H "Content-Type: application/json" \
  -d '{"input_type": "text", "text": "A major bank will close tomorrow"}'
```

## Known Limitations

- No AI model inference is active in Stage 1. Module results return `PENDING` or `NOT_APPLICABLE`.
- No frontend dashboard yet.
- Network and propagation analysis uses demonstration data only.
- Coordination scores are heuristic indicators, not probabilities or proof of intent.
- The earliest observed post in a dataset is not necessarily the original source.
- Claim verification requires configured API keys for evidence retrieval.
- Embedding similarity measures semantic relatedness, not factual truth.

## Project Structure

```
drishtiraksha/
├── backend/
│   ├── main.py              # FastAPI application entry point
│   ├── config.py             # Configuration and settings
│   ├── schemas.py            # Canonical Pydantic models
│   ├── database.py           # SQLite async database layer
│   ├── storage.py            # Upload handling and validation
│   ├── orchestrator.py       # Investigation processing lifecycle
│   ├── routers/              # API route handlers
│   ├── modules/              # AI analysis modules (future)
│   ├── tests/                # Automated test suite
│   └── uploads/              # Runtime upload storage (gitignored)
├── frontend/                 # Next.js application (future)
├── reference/                # Preserved starter code from team
├── data/fixtures/            # Labeled test data
├── docs/                     # Documentation
├── .env.example              # Environment template
└── .gitignore
```

## License

Hackathon project — YUKTIK 2026.
