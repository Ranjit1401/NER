# System Architecture: Smart Logistics Intelligence (NER India)

## 1. Executive Summary & Core Design Principles
Smart Logistics Intelligence is an AI-powered Disaster & Emergency Logistics Management platform tailored for the North Eastern Region (NER) of India (Assam, Meghalaya, Arunachal Pradesh, Nagaland, Manipur, Mizoram, Tripura, Sikkim). NER's terrain, extreme weather events (landslides, flash floods), and vulnerable road corridors (e.g., Siliguri Corridor / Chicken's Neck, NH-27, NH-6) require an offline-first, explainable, human-in-the-loop operational command platform.

### Core Architecture Guardrails
1. **LatentStack Abstraction Layer**: Zero direct SDK bindings to external LLM providers. All LLM calls pass through the LatentStack router (`/v1/chat/completions`) for model switching, fallback, and cost monitoring.
2. **Explainable & Auditable AI**: All AI recommendations store confidence scores, evidence trails, and reasoning chains in PostgreSQL audit logs.
3. **Human-In-The-Loop Operations**: No automated AI dispatch or automatic rerouting without command-center human sign-off.
4. **Deterministic Hard Safety Rules**: Deterministic GIS/risk rules override LLM recommendations (e.g., if road bridge weight limit < truck weight or flood depth > 0.5m, route is automatically hard-blocked).
5. **Offline-First Browser & Edge Sync**: Browser IndexedDB/SQLite local storage, vector tile caching, and mutation queues handle frequent network cut-offs across hill states.

---

## 2. Monorepo Directory Structure
```
smart-logistics-intelligence/
├── apps/
│   ├── web/                     # React 18 + TS + Vite Command Center Dashboard
│   │   ├── src/
│   │   │   ├── components/      # Map, Analytics, Dispatch, Alert Panels
│   │   │   ├── services/        # IndexedDB, Sync Engine, API Clients
│   │   │   ├── store/           # Zustand State Management
│   │   │   └── types/           # Frontend Domain Types
│   └── api/                     # FastAPI Service Entry & Endpoints
│       ├── routers/             # Disasters, Routes, Resources, Agents, Sync
│       ├── services/            # GIS Engine, Risk Calculator, Dispatch Service
│       └── core/                # Config, DB Session, Security, LatentStack Client
├── packages/
│   ├── ai-agents/               # Multi-agent Orchestration System
│   │   ├── supervisor/          # Orchestrator / Supervisor Agent
│   │   ├── agents/              # Disaster, Route, Resource, Research Agents
│   │   ├── tools/               # GIS Query, Weather API, Inventory Tools
│   │   └── latentstack/         # LatentStack Router Gateway Wrapper
│   └── shared-types/            # Shared JSON Schema & Pydantic/TS Contracts
├── docker/                      # Dockerfile & Docker Compose Configurations
├── docs/                        # Architecture & API Specifications
├── AGENTS.md                    # Permanent Agent Development Guidelines
├── ARCHITECTURE.md              # System Architecture Specification (This File)
└── PHASES.md                    # Staged Implementation Plan
```

---

## 3. System Boundaries & Layer Responsibilities

```
[ Command Center React Dashboard (Web) ]
       │  ▲ (Offline Sync / IndexedDB Queue)
       ▼  │
[ FastAPI REST API & WebSockets ]
       │
  ┌────┴───────────────────────────┬──────────────────────────────┐
  ▼                                ▼                              ▼
[ PostGIS / Postgres DB ]   [ GIS & Risk Engine ]   [ Multi-Agent System (ai-agents) ]
  (Spatial Index, Routes,      (NetworkX / pgRouting,         │
   Resources, Audit Logs)       Deterministic Safety)         │ (OpenAI-compatible protocol)
                                                                 ▼
                                                     [ LatentStack Gateway Router ]
                                                                 │
                                                    ┌────────────┴────────────┐
                                                    ▼                         ▼
                                             [ Primary LLM ]          [ Fallback LLMs ]
```

- **Frontend (apps/web)**: Tactical dark-themed government command center UI. Renders GIS vector maps (MapLibre / Leaflet), real-time alert feeds, route comparison boards, and human-in-the-loop operational approval dialogs.
- **Backend (apps/api)**: Asynchronous FastAPI application managing CRUD, authentication (JWT / RBAC), postGIS spatial queries, deterministic routing risk score computations, and offline mutation sync ingestion.
- **GIS Engine (apps/api/services)**: Hybrid spatial evaluator combining PostGIS spatial relationships with Python NetworkX / pgRouting topology graphs. Evaluates flood overlay intersections, landslide hazard zones, and bridge clearances.
- **Multi-Agent Engine (packages/ai-agents)**: Asynchronous agent orchestration engine. Features an agent Supervisor routing domain events to specialized agents (Disaster, Route, Resource, Research).
- **LatentStack Gateway**: Central AI proxy providing standard OpenAI-compatible `/v1/chat/completions` API across multiple model providers with fallback, caching, and token usage auditing.

---

## 4. Multi-Agent System Architecture & Agent Roles

### 1. Supervisor / Orchestrator Agent
- **Role**: Command coordinator and input classifier.
- **Responsibilities**:
  - Parses user prompts or automated system alerts (e.g., "Flash flood reported on NH-27 near Lumding").
  - Decomposes requests and delegates sub-tasks to specialized agents.
  - Synthesizes multi-agent responses into a cohesive operational briefing.
  - Ensures human confirmation guards are attached to operational proposals.

### 2. Disaster Intelligence Agent
- **Role**: Natural hazard tracking and severity estimation.
- **Responsibilities**:
  - Ingests weather alerts, rainfall radar data, river gauge telemetry, and crowdsourced incident feeds.
  - Computes spatial impact buffers (e.g., 5km radius around river flood plain).
  - Categorizes disaster severity (Low, Medium, High, Severe).

### 3. Route Intelligence Agent
- **Role**: Transport network viability and dynamic rerouting analysis.
- **Responsibilities**:
  - Queries road network graph for affected segments intersecting active disaster buffers.
  - Calculates multi-factor Route Risk Score (RRS):
    $$RRS = w_1 \cdot \text{DisasterProximity} + w_2 \cdot \text{SlopeElevation} + w_3 \cdot \text{WeatherSeverity} + w_4 \cdot \text{RoadClass}$$
  - Generates top-3 safest alternative routes with delay overhead estimates.

### 4. Logistics & Resource Allocation Agent
- **Role**: Inventory and emergency relief distribution optimizer.
- **Responsibilities**:
  - Tracks depot stock levels (food grain, water purification units, medical kits, tents, fuel).
  - Matches affected district demands against nearest available depot inventory.
  - Generates optimal fleet dispatch proposals subject to vehicle weight/capacity constraints.

### 5. Research & Historical Data Agent
- **Role**: Pattern matching and historical analog comparison.
- **Responsibilities**:
  - Queries historical NER monsoon/disaster datasets (e.g., 2022 Assam floods, 2023 Sikkim GLOF).
  - Provides contextual historical insights (e.g., "NH-6 in Meghalaya usually suffers 3-5 day closures after >200mm rainfall").

---

## 5. LatentStack AI Infrastructure Integration
All AI models are invoked through a uniform client configured to target the LatentStack endpoint.

```python
# System-wide LatentStack Provider Wrapper Example Concept
from openai import AsyncOpenAI
import os

latentstack_client = AsyncOpenAI(
    base_url=os.getenv("LATENTSTACK_BASE_URL", "http://localhost:8080/v1"),
    api_key=os.getenv("LATENTSTACK_API_KEY", "latentstack-key"),
)
```
- **Gateway Config**:
  - Primary Model: `fast-reasoner` (e.g., Gemini 3.7 Flash or equivalent router alias).
  - Heavy Reasoning Model: `deep-reasoner` (e.g., Claude 3.5 Sonnet / DeepSeek R1 alias).
  - Fallback Chain: `Primary -> Secondary -> Tertiary Provider`.
- **Audit Logging**: Every LatentStack request/response pair is recorded with prompt tokens, completion tokens, latency, agent ID, and confidence score into `ai_audit_logs`.

---

## 6. Initial Database Schema (PostgreSQL + PostGIS)

```sql
-- Enable PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- Users & Role-Based Access Control
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'OPERATOR', -- ADMIN, COMMANDER, OPERATOR, FIELD_OFFICER
    organization VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disaster Events
CREATE TABLE disaster_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    disaster_type VARCHAR(50) NOT NULL, -- FLOOD, LANDSLIDE, GLOF, EARTHQUAKE
    severity VARCHAR(50) NOT NULL,      -- LOW, MEDIUM, HIGH, CRITICAL
    affected_state VARCHAR(100) NOT NULL,
    location GEOMETRY(Point, 4326) NOT NULL,
    impact_zone GEOMETRY(Polygon, 4326),
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    reported_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Road Network Corridors & Segments
CREATE TABLE road_segments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    highway_code VARCHAR(50) NOT NULL, -- NH-27, NH-6, NH-10
    segment_name VARCHAR(255) NOT NULL,
    start_district VARCHAR(100) NOT NULL,
    end_district VARCHAR(100) NOT NULL,
    geometry GEOMETRY(LineString, 4326) NOT NULL,
    current_status VARCHAR(50) DEFAULT 'CLEAR', -- CLEAR, CAUTION, BLOCKED, IMPASSABLE
    weight_limit_tons NUMERIC(5,2),
    elevation_m NUMERIC(6,2),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Logistics Depots & Relief Camps
CREATE TABLE logistics_hubs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    hub_type VARCHAR(50) NOT NULL, -- DEPOT, RELIEF_CAMP, AIRFIELD, HELIPAD
    district VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    location GEOMETRY(Point, 4326) NOT NULL,
    capacity_sqm NUMERIC(10,2),
    contact_person VARCHAR(255),
    status VARCHAR(50) DEFAULT 'OPERATIONAL'
);

-- Inventory Stock
CREATE TABLE inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hub_id UUID REFERENCES logistics_hubs(id) ON DELETE CASCADE,
    item_category VARCHAR(100) NOT NULL, -- FOOD, WATER, MEDICAL, SHELTER, FUEL
    item_name VARCHAR(255) NOT NULL,
    quantity NUMERIC(12,2) NOT NULL,
    unit VARCHAR(50) NOT NULL, -- KG, LITERS, UNITS, BOXES
    last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- Dispatch Orders (Human-in-the-loop approved)
CREATE TABLE dispatch_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_code VARCHAR(100) UNIQUE NOT NULL,
    origin_hub_id UUID REFERENCES logistics_hubs(id),
    destination_hub_id UUID REFERENCES logistics_hubs(id),
    recommended_route_id VARCHAR(255),
    allocated_items JSONB NOT NULL,
    ai_recommendation_id UUID,
    status VARCHAR(50) NOT NULL DEFAULT 'PROPOSED', -- PROPOSED, APPROVED, IN_TRANSIT, DELIVERED, REJECTED
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Decision & Explanation Audit Logs
CREATE TABLE ai_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_name VARCHAR(100) NOT NULL,
    prompt_summary TEXT NOT NULL,
    recommendation TEXT NOT NULL,
    confidence_score NUMERIC(4,3) NOT NULL,
    evidence_data JSONB NOT NULL,
    model_used VARCHAR(100) NOT NULL,
    execution_time_ms INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 7. Major API Modules & Endpoint Design

### Authentication & Users (`/api/v1/auth`)
- `POST /login`: Authenticate and issue JWT.
- `GET /me`: Fetch current user role and permissions.

### Disaster Intelligence (`/api/v1/disasters`)
- `GET /`: List active/historical disasters with PostGIS bbox filtering.
- `POST /`: Report new disaster event (Operator or automated alert).
- `GET /{id}/impact-zone`: Return GIS polygon of affected area.

### Route Intelligence & GIS (`/api/v1/routes`)
- `POST /assess-risk`: Evaluate risk for specific highway corridors.
- `POST /find-alternate`: Compute top 3 alternate route geometries avoiding disaster polygon zones.
- `GET /tile/{z}/{x}/{y}.pbf`: Vector tile endpoint for roads and hazard overlays.

### Logistics & Resources (`/api/v1/resources`)
- `GET /hubs`: List depots and relief camps with location coordinates.
- `GET /inventory`: Query stock levels across hubs.
- `POST /dispatch/propose`: Propose a dispatch order based on supply-demand matching.
- `POST /dispatch/{id}/approve`: Command Center Officer sign-off (Human-in-the-Loop).

### Multi-Agent Intelligence (`/api/v1/agents`)
- `POST /query`: Send operational query to Supervisor Agent.
- `GET /audit-logs`: List AI recommendations, confidence scores, and evidence logs.

### Offline Sync (`/api/v1/sync`)
- `POST /push-mutations`: Batch ingest offline queued operator actions.
- `GET /pull-delta`: Fetch delta updates since client's last sync timestamp.

---

## 8. Offline-First Resilience Strategy
1. **Browser Local Storage**: IndexedDB manages cached vector map tiles, road segment statuses, resource inventories, and pending field officer offline mutations.
2. **Offline Mutation Queue**: When offline, dispatch requests or road closure reports are assigned client-generated UUIDs and stored in an IndexedDB Sync Queue.
3. **Background Sync Process**: On network restoration, the Service Worker sends `/api/v1/sync/push-mutations`. The backend reconciles conflicts using Last-Write-Wins (LWW) with server-side operational lock override.
4. **Offline Rule Engine**: Basic GIS proximity check and vehicle weight constraints run in-browser WebAssembly / JS rules engine when disconnected from LatentStack/backend.

---

## 9. Verification & Safety Verification Plan
- **Deterministic Override**: If route safety score < threshold (0.3), UI marks route as RED / BLOCKED regardless of agent text output.
- **Traceability**: UI displays "View AI Evidence Trail" modal linking directly to the corresponding `ai_audit_logs` record.
