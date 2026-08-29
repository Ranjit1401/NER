# Smart Logistics Intelligence — Smart India Hackathon (SIH) Demonstration Script

## Overview
This document provides the step-by-step 5–10 minute live demonstration script for Smart Logistics Intelligence — an AI-powered Disaster & Emergency Logistics Management platform tailored for the North Eastern Region (NER) of India.

---

## Pre-Demo Setup

1. Start all containerized services via Docker Compose:
   ```bash
   docker-compose up -d
   ```
2. Verify all 3 services (`sli_postgis`, `sli_api`, `sli_web`) are healthy:
   ```bash
   docker-compose ps
   ```
3. Run PostGIS database migrations and load synthetic NER seed dataset:
   ```bash
   alembic -c apps/api/alembic.ini upgrade head
   python -m apps.api.seed_data
   ```
4. Open Command Center UI in Chrome/Edge at `http://localhost:3000`.

---

## Demonstration Script (Step-by-Step)

### STEP 1: Command Center Tactical Dashboard Overview
- **Action**: Display the main Overview dashboard (`http://localhost:3000`).
- **Talking Point**: *"Smart Logistics Intelligence is designed specifically for the extreme terrain and poor connectivity of India's North Eastern Region (Assam, Meghalaya, Sikkim, Nagaland). The top status bar provides real-time telemetry on API connectivity, PostGIS spatial database readiness, and LatentStack AI router availability."*

### STEP 2: Interactive GIS Map & Spatial Overlays
- **Action**: Interact with the MapLibre GL JS map. Toggle the *Active Hazards*, *Impact Zone Polygons*, *Road Corridors*, and *Logistics Hubs* layer controls.
- **Talking Point**: *"Our PostGIS spatial layer maps disaster epicenters, 5km impact buffer polygons, highway corridors (NH-27, NH-6, NH-10), and emergency supply depots. Clicking any feature displays instant inspection cards."*

### STEP 3: Multi-Agent AI Operations ("Ask Intelligence")
- **Action**: Switch to the **AI Operations** tab. In the "Ask Intelligence" box, submit:
  > *"Heavy rainfall has affected Shillong. Which routes should we avoid and which nearby hubs can supply emergency materials?"*
- **Talking Point**: *"The request routes through LatentStack to our Supervisor Orchestrator. The Supervisor classifies intent and dispatches Disaster, Route, and Logistics Agents concurrently. All LLM calls pass strictly through LatentStack's model abstraction layer."*
- **Highlight**: Point out the generated execution plan, agent confidence scores, and structured evidence logs.

### STEP 4: Human-In-The-Loop (HITL) Dispatch Operations
- **Action**: Switch to the **Dispatch Approvals** tab. Select a pending dispatch order and click **`REVIEW DISPATCH`**.
- **Talking Point**: *"Safety is paramount in emergency command. AI recommendations are advisory and CANNOT execute dispatches autonomously. The Commander Review Modal presents origin/destination hubs, requested resources, and route safety status."*
- **Action**: Click **`APPROVE DISPATCH (HUMAN SIGN-OFF)`**.
- **Result**: Show that inventory stock is atomically deducted in PostgreSQL (`SELECT FOR UPDATE`), the order status moves to `APPROVED`, and an audit log is recorded.

### STEP 5: Offline-First Field Operations & Replay
- **Action**: Switch to the **Field Reports (Sync)** tab. Open Browser Developer Tools ➔ Network ➔ Select **Offline**.
- **Talking Point**: *"NER hill states frequently suffer complete network blackouts. Watch as our offline sync engine gracefully transitions the UI to OFFLINE mode."*
- **Action**: Submit a new field observation:
  > *"NH-6 blockage observed near Shillong due to slope instability."*
- **Result**: Point out that the report is saved directly into IndexedDB local storage and marked as `QUEUED FOR SYNC`.
- **Action**: Restore Network to **Online** and click **`SYNC NOW`**.
- **Result**: The sync engine automatically replays the queued report to `/api/v1/sync/field-reports` idempotently, updating status to `SYNCED`.

### STEP 6: Deterministic Safety Rule Override
- **Action**: Attempt a dispatch proposal specifying `NH-6` (which is currently hard-blocked).
- **Talking Point**: *"Critical safety thresholds override AI suggestions. When a highway corridor is hard-blocked by landslide or flood, deterministic GIS rules trigger a `DETERMINISTIC SAFETY BLOCK` override. Inventory remains 100% untouched and approval is denied."*

### STEP 7: Explainable AI Audit Log Ledger
- **Action**: Switch to the **Audit Logs** tab.
- **Talking Point**: *"Every operational decision—whether human or AI-generated—is recorded in PostGIS `ai_audit_logs` with prompt summaries, confidence scores, execution latencies, and structured evidence trails for government review."*

---

## Demo Verification Summary

| Feature | Demonstrated Capability |
|---|---|
| **GIS Infrastructure** | PostGIS EPSG:4326 map layers, hazard polygons, highway line strings |
| **Multi-Agent Engine** | LatentStack-routed Supervisor, Disaster, Route, & Logistics agents |
| **Human-In-The-Loop** | Commander review modal, sign-off approval, atomic stock deduction |
| **Offline Resilience** | IndexedDB mutation queue, auto-sync replay, idempotent server processing |
| **Safety Overrides** | Deterministic GIS rules overriding LLM route recommendations |
