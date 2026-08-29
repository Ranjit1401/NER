import pytest
import uuid
import time
import datetime
from unittest.mock import AsyncMock, patch, MagicMock
from fastapi.testclient import TestClient
from apps.api.main import app
from apps.api.schemas.domain import (
    DispatchStatus,
    UserRole,
    DispatchOrderApproveRequest
)
from apps.api.services.dispatch_service import OperationalDispatchService

client = TestClient(app)

# 1. Full E2E REST API Lifecycle Test (Mocked DB Session)
def test_full_api_lifecycle():
    # Health check
    with patch("apps.api.routers.health.check_postgis_readiness", new_callable=AsyncMock) as mock_health:
        mock_health.return_value = {"connected": True, "postgis_available": True}
        res_health = client.get("/health")
        assert res_health.status_code == 200

    # Version check
    res_version = client.get("/version")
    assert res_version.status_code == 200

    # Disasters list
    with patch("apps.api.services.repositories.DisasterRepository.list_all", new_callable=AsyncMock) as mock_disasters:
        mock_disasters.return_value = []
        res_disasters = client.get("/api/v1/disasters/")
        assert res_disasters.status_code == 200

    # Roads list
    with patch("apps.api.services.repositories.RoadRepository.list_all", new_callable=AsyncMock) as mock_roads:
        mock_roads.return_value = []
        res_roads = client.get("/api/v1/roads/")
        assert res_roads.status_code == 200

    # Affected roads list
    with patch("apps.api.services.repositories.GISQueryService.find_roads_intersecting_impact_zones", new_callable=AsyncMock) as mock_aff:
        mock_aff.return_value = []
        res_affected = client.get("/api/v1/roads/affected-by-disasters")
        assert res_affected.status_code == 200

    # Hubs list
    with patch("apps.api.services.repositories.HubRepository.list_hubs", new_callable=AsyncMock) as mock_hubs:
        mock_hubs.return_value = []
        res_hubs = client.get("/api/v1/hubs/")
        assert res_hubs.status_code == 200

    # Dispatches list
    with patch("apps.api.services.repositories.DispatchRepository.list_orders", new_callable=AsyncMock) as mock_disp:
        mock_disp.return_value = []
        res_dispatches = client.get("/api/v1/dispatches/")
        assert res_dispatches.status_code == 200

    # Audit logs list
    with patch("apps.api.services.repositories.AuditLogRepository.list_logs", new_callable=AsyncMock) as mock_audit:
        mock_audit.return_value = []
        res_audit = client.get("/api/v1/audit-logs/")
        assert res_audit.status_code == 200

# 2. Multi-Agent Query E2E Integration
def test_multi_agent_query_e2e():
    mock_orch_res = {
        "query": "Heavy rainfall has affected Shillong. Which routes should we avoid?",
        "plan": [
            "Execute DisasterIntelligenceAgent to identify active hazards & impact zones.",
            "Execute RouteIntelligenceAgent to evaluate corridor viability & deterministic blocks.",
            "Execute LogisticsResourceAgent to inspect inventory levels and depot readiness."
        ],
        "agent_results": [
            {
                "agent_name": "DisasterIntelligenceAgent",
                "agent_type": "DISASTER",
                "status": "SUCCESS",
                "summary": "Identified active landslide near Shillong on NH-6.",
                "findings": [{"category": "HAZARD", "fact": "NH-6 blocked by landslide", "is_database_result": True}],
                "recommendations": [],
                "evidence": [{"source_type": "PostGIS", "source_name": "disaster_events", "data_summary": "Shillong Landslide"}],
                "confidence_score": 0.95,
                "warnings": [],
                "execution_time_ms": 120
            }
        ],
        "final_summary": "Active monsoonal hazards affect East Khasi Hills (NH-6). Prohibit heavy transport on NH-6.",
        "recommendations": [
            {
                "action": "Prohibit heavy logistics transit on NH-6.",
                "reasoning": "Hard deterministic safety block override triggered due to verified landslide blockage.",
                "requires_human_approval": True
            }
        ],
        "evidence": [
            {"source_type": "PostGIS", "source_name": "disaster_events", "data_summary": "Shillong Landslide"}
        ],
        "warnings": ["DETERMINISTIC SAFETY OVERRIDE: NH-6 is BLOCKED!"],
        "total_execution_time_ms": 280
    }

    mock_audit = MagicMock()
    mock_audit.id = uuid.uuid4()

    with patch("packages.ai_agents.agents.SupervisorAgent.orchestrate", new_callable=AsyncMock) as mock_orch:
        mock_orch.return_value = mock_orch_res
        with patch("apps.api.services.repositories.AuditLogRepository.log_decision", new_callable=AsyncMock) as mock_audit_log:
            mock_audit_log.return_value = mock_audit

            res = client.post("/api/v1/ai/query", json={"query": "Heavy rainfall has affected Shillong."})
            assert res.status_code == 200
            data = res.json()
            assert len(data["execution_plan"]) == 3
            assert data["agent_results"][0]["agent_name"] == "DisasterIntelligenceAgent"
            assert "DETERMINISTIC SAFETY OVERRIDE" in data["warnings"][0]

# 3. Lightweight API Latency / Load Benchmark
def test_lightweight_api_benchmark():
    latencies = []
    for _ in range(10):
        start = time.time()
        res = client.get("/version")
        latencies.append((time.time() - start) * 1000.0)
        assert res.status_code == 200

    latencies.sort()
    avg_latency = sum(latencies) / len(latencies)
    p95_latency = latencies[int(len(latencies) * 0.95)]

    assert avg_latency < 500.0 # Benchmark tolerance for local test environment
