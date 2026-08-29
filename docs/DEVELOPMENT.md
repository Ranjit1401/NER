# Local Development & SIH Demonstration Setup Guide

## System Overview
Smart Logistics Intelligence is an AI-powered Disaster & Emergency Logistics Management platform tailored for the North Eastern Region (NER) of India. The platform integrates PostGIS spatial GIS, multi-agent AI orchestration via LatentStack router gateway, human-in-the-loop dispatch sign-off, and IndexedDB offline resilience.

---

## Containerized Quickstart (Docker Compose)

The entire application stack (PostGIS DB, FastAPI API, Nginx Web Frontend) can be launched with Docker Compose:

1. **Start Container Stack**:
   ```bash
   docker-compose up -d --build
   ```
2. **Verify Service Health**:
   ```bash
   docker-compose ps
   ```
   - `sli_postgis`: PostgreSQL 15 + PostGIS 3.3 (Port 5432)
   - `sli_api`: FastAPI Backend Service (Port 8000)
   - `sli_web`: Nginx Production Web Build (Port 3000)

3. **Initialize Database Migrations & Synthetic Seed Data**:
   ```bash
   alembic -c apps/api/alembic.ini upgrade head
   python -m apps.api.seed_data
   ```

---

## Local Development Setup

### Backend (FastAPI) Setup
1. Navigate to directory:
   ```bash
   cd apps/api
   ```
2. Activate virtual environment and install dependencies:
   ```bash
   python -m venv venv
   # Windows:
   .\venv\Scripts\activate
   # Linux/macOS:
   source venv/bin/activate
   pip install -r requirements.txt
   ```
3. Copy environment template:
   ```bash
   cp .env.example .env
   ```
4. Run migrations & start Uvicorn server:
   ```bash
   alembic -c alembic.ini upgrade head
   python -m seed_data
   uvicorn apps.api.main:app --reload --port 8000
   ```
5. Run backend tests:
   ```bash
   python -m pytest apps/api/tests -v
   ```

### Frontend (React + Vite) Setup
1. Navigate to directory:
   ```bash
   cd apps/web
   ```
2. Install Node dependencies & run dev server:
   ```bash
   npm install
   npm run dev
   ```
3. Run tests & production build check:
   ```bash
   npm run test
   npm run build
   ```

---

## AI Multi-Agent Engine & LatentStack Configuration
All AI functionality routes through the **LatentStack Router Gateway** (`/v1/chat/completions`).

```env
LATENTSTACK_BASE_URL=https://router.latentstack.dev/v1
LATENTSTACK_API_KEY=sk-your-latentstack-key
LATENTSTACK_PRIMARY_MODEL=fast-reasoner
LATENTSTACK_TIMEOUT_SECONDS=30.0
```

*Note: Security Guardrail — `LATENTSTACK_API_KEY` is strictly managed on the backend and NEVER exposed to frontend clients.*

---

## SIH Demonstration Script
For the complete 5–10 minute live judge demonstration script, refer to:
👉 **[`docs/SIH_DEMO.md`](./SIH_DEMO.md)**
