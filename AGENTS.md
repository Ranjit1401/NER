# Agent Instructions

## Package Manager & Stack
- **Frontend**: React + TypeScript + Vite + Tailwind CSS + Framer Motion (use `npm`)
- **Backend**: Python 3.11+ + FastAPI + Pydantic v2 + SQLAlchemy / SQLModel + Asyncpg (use `pip` / `venv` or `poetry`)
- **Database**: PostgreSQL 15+ with PostGIS extension enabled
- **AI Gateway**: LatentStack router (`/v1/chat/completions`, model abstraction layer)

## Directory Structure
```
smart-logistics-intelligence/
├── apps/
│   ├── web/               # React + TS Command Center Frontend
│   └── api/               # FastAPI Backend Service
├── packages/
│   ├── ai-agents/         # Multi-agent orchestrator & specialized agents
│   └── shared-types/      # Shared domain schema & TypeScript definitions
├── docker/                # Docker compose & container configurations
├── docs/                  # Specs, Architecture, API contracts
├── AGENTS.md
├── ARCHITECTURE.md
└── PHASES.md
```

## Commands
| Task | Command |
|------|---------|
| Frontend Dev | `npm --prefix apps/web run dev` |
| Frontend Build | `npm --prefix apps/web run build` |
| Backend Dev | `uvicorn apps.api.main:app --reload --port 8000` |
| Run Tests | `pytest` (backend) / `npm test` (frontend) |
| Docker Up | `docker-compose up -d` |

## Core Rules & Guardrails
- **No Direct LLM SDK Hardcoding**: Route all LLM requests through LatentStack abstraction/gateway.
- **Explainable AI**: AI recommendations MUST include evidence logs, confidence scores, and reasoning traces.
- **Human-in-the-Loop**: Operational actions (dispatches, route rerouting approval) require explicit human confirmation. Deterministic rules override AI suggestions on critical safety thresholds.
- **Offline-First Resilience**: Implement local browser/edge SQLite sync, tile caching, and queued offline mutation logs for poor-connectivity NER regions.
- **Security & Secrets**: Never hardcode API keys or database credentials; always use `.env` / environment variables. Audit log all AI decisions.
