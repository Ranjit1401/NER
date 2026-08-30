# NER Disaster & Logistics Command Center

**AI-Based Smart Logistics and Accessibility Intelligence Platform for the North Eastern Region (NER)**

Built for BuildSprint 2026 · Powered by LatentCode

---

## The Problem

The North Eastern Region of India faces major logistics and accessibility challenges due to difficult terrain, extreme weather, limited transport connectivity, and frequent road disruptions from landslides, floods, and infrastructure gaps. Essential goods — medicines, food, construction materials, agricultural produce — often get delayed reaching remote districts, driving up costs and disrupting public services.

There is currently no integrated platform offering real-time logistics visibility, route accessibility status, predictive disruption alerts, and optimized transport planning tailored to NER's terrain.

## The Solution

An AI-powered platform that gives government officials, dispatchers, and field teams a single live view of the region's road accessibility and logistics operations — combining GIS mapping, real-time disaster intelligence, AI-driven route status, and end-to-end dispatch tracking.

**Core capabilities:**

- **Live GIS disaster map** — geotagged, severity-coded disruptions (floods, landslides, road damage) across NER districts
- **AI-driven route intelligence** — real-time clear / caution / blocked status across major highway corridors (NH-27, NH-6, NH-10, NH-15, NH-29, and more), with alternate route suggestions
- **Dispatch approvals & tracking** — GPS-based movement tracking for vehicles carrying essential supplies
- **Real-time alerts** — automated notifications for blocked roads, high-risk corridors, and delayed deliveries
- **Resource inventory & audit logs** — centralized visibility into supply availability and platform activity
- **Field-level reporting** — mobile-first app for officers and drivers to log geo-tagged updates from the ground

> **Note:** Offline sync for the field app (for low-network zones) is on the roadmap and not yet fully implemented in this build.

## Architecture

| Component | Description | Stack |
|---|---|---|
| `apps/api` | Backend API serving route, disaster, and dispatch data | Python, FastAPI |
| `apps/web` | Government Command Center dashboard | Next.js / React |
| `apps/field-app` | Mobile-first field reporting app for officers & drivers | React |

---

## Getting Started

### 1. Backend (API)

```bash
cd apps/api

# Create a virtual environment (if needed)
python -m venv .venv

# Activate it
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start the server
uvicorn app.main:app --reload --port 8000
```

- API: [http://localhost:8000](http://localhost:8000)
- Interactive API docs (Swagger): [http://localhost:8000/docs](http://localhost:8000/docs)

### 2. Government Command Center (Web Dashboard)

From the project root, in a new terminal:

```bash
npm --prefix apps/web install
npm --prefix apps/web run dev
```

- Dashboard: [http://localhost:3000](http://localhost:3000)

The Command Center provides:

- Overview
- Disaster Intelligence
- Route Intelligence
- Logistics Overview
- Dispatch Approvals
- Field Reports
- Resource Inventory
- Real-time Alerts
- AI Operations
- Audit Logs
- System Settings

### 3. Field Operations App

The mobile-first field application lives at `apps/field-app/`.

```bash
npm --prefix apps/field-app install
npm --prefix apps/field-app run dev
```

---

## Prerequisites

- Python 3.10+
- Node.js 18+
- npm

---

## Roadmap

- [ ] Offline-first sync for the Field Operations App (queue updates, sync when reconnected)
- [ ] Weather API integration for predictive disruption alerts
- [ ] Multilingual notifications
- [ ] Integration with government transport databases

---

## Team

- Ranjit Bhardwaj
- Nikita Mishra 

## Hackathon

Built during [BuildSprint 2026](https://latentforce.dev) — a 48-hour hackathon by LatentForce — using LatentCode.
