import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch
from apps.api.main import app
from apps.api.core.config import settings
from apps.api.services.ai_service import AIService, LatentStackClient, LatentStackRequest, LatentStackResponse, LatentStackClientError

client = TestClient(app)

def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    assert "Smart Logistics Intelligence" in response.json()["message"]

def test_version_endpoint():
    response = client.get("/version")
    assert response.status_code == 200
    assert response.json()["version"] == settings.VERSION

@patch("apps.api.routers.health.check_postgis_readiness")
def test_health_endpoint(mock_postgis):
    mock_postgis.return_value = {"connected": True, "postgis_available": True}
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"
    assert response.json()["database"]["connected"] is True

def test_configuration_load():
    assert settings.PROJECT_NAME == "Smart Logistics Intelligence API"
    assert "v1" in settings.LATENTSTACK_BASE_URL

@pytest.mark.asyncio
async def test_latentstack_client_success():
    mock_response_data = LatentStackResponse(
        id="chatcmpl-123",
        model="fast-reasoner",
        content="Test AI Response",
        prompt_tokens=10,
        completion_tokens=20
    )
    
    with patch.object(LatentStackClient, "completion", new_callable=AsyncMock) as mock_comp:
        mock_comp.return_value = mock_response_data
        
        service = AIService()
        res = await service.execute_prompt("System", "Hello")
        
        assert res.content == "Test AI Response"
        assert res.model == "fast-reasoner"
        assert res.prompt_tokens == 10
        mock_comp.assert_called_once()

@pytest.mark.asyncio
async def test_latentstack_client_error_propagation():
    with patch.object(LatentStackClient, "completion", new_callable=AsyncMock) as mock_comp:
        mock_comp.side_effect = LatentStackClientError("Connection Refused")
        
        service = AIService()
        with pytest.raises(LatentStackClientError) as exc_info:
            await service.execute_prompt("System", "Hello")
            
        assert "Connection Refused" in str(exc_info.value)
