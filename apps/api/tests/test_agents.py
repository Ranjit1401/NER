import pytest
import uuid
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient
from apps.api.main import app
from packages.ai_agents.schemas import AgentType, OrchestratedQueryRequest
from packages.ai_agents.agents import (
    SupervisorAgent,
    DisasterIntelligenceAgent,
    RouteIntelligenceAgent,
    LogisticsResourceAgent,
    ResearchHistoricalAgent
)
from packages.ai_agents.tools import ControlledAgentTools
from apps.api.services.ai_service import AIService, LatentStackResponse

client = TestClient(app)

@pytest.mark.asyncio
async def test_tools_mocked_db_queries():
    mock_session = AsyncMock()
    tools = ControlledAgentTools(mock_session)

    with patch.object(tools.disaster_repo, "list_all", new_callable=AsyncMock) as mock_disasters:
        mock_disasters.return_value = []
        res = await tools.get_active_disasters()
        assert res == []

    with patch.object(tools.gis_service, "find_roads_intersecting_impact_zones", new_callable=AsyncMock) as mock_roads:
        mock_roads.return_value = []
        res = await tools.get_affected_roads()
        assert res == []

@pytest.mark.asyncio
async def test_supervisor_agent_intent_classification():
    mock_ai_service = AsyncMock(spec=AIService)
    mock_ai_service.execute_prompt.return_value = LatentStackResponse(
        model="fast-reasoner",
        content="Supervisor summary of findings."
    )
    mock_tools = AsyncMock(spec=ControlledAgentTools)
    mock_tools.get_active_disasters.return_value = [
        {"id": "d1", "title": "Guwahati Flood", "disaster_type": "FLOOD", "severity": "HIGH", "affected_state": "Assam"}
    ]
    mock_tools.get_affected_roads.return_value = []
    mock_tools.get_all_road_corridors.return_value = [
        {"id": "r1", "highway_code": "NH-6", "segment_name": "Shillong", "current_status": "BLOCKED", "weight_limit_tons": 15.0}
    ]
    mock_tools.get_logistics_hubs_and_inventory.return_value = []

    supervisor = SupervisorAgent(mock_ai_service, mock_tools)
    result = await supervisor.orchestrate("Flood in Shillong affecting NH-6")

    assert "plan" in result
    assert len(result["agent_results"]) >= 2
    assert result["final_summary"] == "Supervisor summary of findings."
    # Check deterministic safety override rule was triggered
    assert any("DETERMINISTIC SAFETY OVERRIDE" in w for w in result["warnings"])

def test_ai_query_endpoint_integration():
    sample_audit_id = uuid.uuid4()
    mock_audit = AsyncMock()
    mock_audit.id = sample_audit_id

    mock_orch_res = {
        "query": "Test query",
        "plan": ["Step 1"],
        "agent_results": [],
        "final_summary": "Test summary",
        "recommendations": [],
        "evidence": [],
        "warnings": [],
        "total_execution_time_ms": 120
    }

    with patch("packages.ai_agents.agents.SupervisorAgent.orchestrate", new_callable=AsyncMock) as mock_orch:
        mock_orch.return_value = mock_orch_res
        with patch("apps.api.services.repositories.AuditLogRepository.log_decision", new_callable=AsyncMock) as mock_audit_log:
            mock_audit_log.return_value = mock_audit

            response = client.post("/api/v1/ai/query", json={"query": "Test query"})
            assert response.status_code == 200
            data = response.json()
            assert data["query"] == "Test query"
            assert data["final_summary"] == "Test summary"
            assert data["audit_log_id"] == str(sample_audit_id)
