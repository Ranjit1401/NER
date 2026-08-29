`# Staged Implementation Plan: Smart Logistics Intelligence

## Overview
This document outlines the phased development roadmap for building the Smart Logistics Intelligence platform. Development moves from foundational infrastructure and core GIS layers to multi-agent intelligence and offline-first capabilities.

---

## Phase 1: Workspace Setup & Foundational Infrastructure (Current Baseline)
- [x] Create directory structure (`apps/web`, `apps/api`, `packages/ai-agents`, `packages/shared-types`).
- [x] Define system architecture (`ARCHITECTURE.md`).
- [x] Establish agent instructions and guardrails (`AGENTS.md`).
- [x] Define staged implementation roadmap (`PHASES.md`).
- [ ] Set up root monorepo scripts (`package.json`, `pyproject.toml`, Docker Compose scaffolding).

---

## Phase 2: Database Schema & Core FastAPI Backend
- [ ] Configure PostGIS database container and migrations (SQLAlchemy / Alembic).
- [ ] Create core FastAPI backend application with structure (`routers`, `services`, `models`).
- [ ] Implement database models (`User`, `DisasterEvent`, `RoadSegment`, `LogisticsHub`, `InventoryItem`, `DispatchOrder`, `AIAuditLog`).
- [ ] Implement JWT Authentication and RBAC Middleware.
- [ ] Build initial CRUD REST APIs for disasters, road segments, and logistics hubs.

---

## Phase 3: Command Center Web Dashboard (React + TypeScript)
- [ ] Scaffold React 18 + Vite + Tailwind CSS + Framer Motion dark command center UI.
- [ ] Integrate MapLibre / Leaflet vector map with dark tile style.
- [ ] Implement spatial overlays (disaster hazard zones, road network lines, depot markers).
- [ ] Build Command Center layout:
  - Top Nav with Connectivity Status & Quick Incident Counter.
  - Left Panel: Live Incident & Disaster Feed.
  - Center: Interactive GIS Map.
  - Right Panel: Route Assessment & Resource Dispatch Modal.
  - Bottom Drawer: AI Reasoning & Evidence Log Viewer.

---

## Phase 4: Deterministic GIS & Route Risk Engine
- [ ] Implement Spatial Query Service using PostGIS (`ST_DWithin`, `ST_Intersects`).
- [ ] Build Route Risk Score (RRS) calculator combining disaster proximity, road class, and elevation.
- [ ] Implement route corridor safety checks and hard-block validation.
- [ ] Connect GIS risk engine endpoints to the frontend map visualization.

---

## Phase 5: Multi-Agent Intelligence Engine & LatentStack Integration
- [ ] Implement LatentStack client wrapper (`/v1/chat/completions`) with provider fallback support.
- [ ] Build specialized AI agents in `packages/ai-agents`:
  - **Supervisor / Orchestrator Agent**
  - **Disaster Intelligence Agent**
  - **Route Intelligence Agent**
  - **Logistics & Resource Agent**
  - **Research & Historical Data Agent**
- [ ] Build Explainability & Audit Log Logger (`ai_audit_logs`).
- [ ] Connect Agent Orchestrator to `/api/v1/agents/query` endpoint and frontend Command Assistant.

---

## Phase 6: Human-In-The-Loop Workflow & Operational Dispatches
- [ ] Implement Dispatch Proposal Engine (matching demand to hub stock).
- [ ] Build Human-in-the-Loop confirmation interface in frontend (Commander sign-off).
- [ ] Enforce deterministic safety gates (prevent dispatch on hard-blocked routes regardless of AI suggestions).
- [ ] Store officer approval metadata and timestamps in `dispatch_orders`.

---

## Phase 7: Offline-First Capability & Edge Resilience
- [ ] Implement IndexedDB storage in React client (caching roads, hubs, and offline vector tiles).
- [ ] Build Offline Mutation Queue for field incident reports and dispatch draft orders.
- [ ] Implement Background Sync service worker and `/api/v1/sync` reconciliation endpoints.
- [ ] Implement offline status indicator and browser fallback risk rules.

---

## Phase 8: Testing, Containerization & Verification
- [ ] Write backend unit & integration tests (`pytest`).
- [ ] Write frontend component and state tests (`vitest` / React Testing Library).
- [ ] Create multi-container `docker-compose.yml` (PostgreSQL/PostGIS, FastAPI backend, Vite web frontend, LatentStack mockup gateway).
- [ ] Verify security rules (no hardcoded secrets, input sanitization, RBAC checks).
