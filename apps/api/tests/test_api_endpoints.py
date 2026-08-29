import pytest
import uuid
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient
from apps.api.main import app

client = TestClient(app)

def test_disasters_api_mocked():
    sample_id = uuid.uuid4()
    mock_disaster = AsyncMock()
    mock_disaster.id = sample_id
    mock_disaster.title = "Mock Flood"
    mock_disaster.disaster_type = "FLOOD"
    mock_disaster.severity = "HIGH"
    mock_disaster.affected_state = "Assam"
    mock_disaster.location = "POINT(91.73 26.18)"
    mock_disaster.impact_zone = None
    mock_disaster.status = "ACTIVE"
    mock_disaster.metadata_info = {}
    mock_disaster.reported_at = "2026-08-28T12:00:00Z"

    with patch("apps.api.services.repositories.DisasterRepository.list_all", new_callable=AsyncMock) as mock_list:
        mock_list.return_value = [mock_disaster]
        with patch("apps.api.services.gis_utils.geometry_to_point_coords") as mock_geom:
            mock_geom.return_value = {"latitude": 26.18, "longitude": 91.73}
            response = client.get("/api/v1/disasters/")
            assert response.status_code == 200
            data = response.json()
            assert len(data) == 1
            assert data[0]["title"] == "Mock Flood"

def test_hubs_api_mocked():
    sample_id = uuid.uuid4()
    mock_hub = AsyncMock()
    mock_hub.id = sample_id
    mock_hub.name = "Guwahati Depot"
    mock_hub.hub_type = "DEPOT"
    mock_hub.district = "Kamrup"
    mock_hub.state = "Assam"
    mock_hub.location = "POINT(91.79 26.14)"
    mock_hub.capacity_sqm = 5000.0
    mock_hub.contact_person = "Baruah"
    mock_hub.status = "OPERATIONAL"
    mock_hub.inventory_items = []

    with patch("apps.api.services.repositories.HubRepository.list_hubs", new_callable=AsyncMock) as mock_list:
        mock_list.return_value = [mock_hub]
        with patch("apps.api.services.gis_utils.geometry_to_point_coords") as mock_geom:
            mock_geom.return_value = {"latitude": 26.14, "longitude": 91.79}
            response = client.get("/api/v1/hubs/")
            assert response.status_code == 200
            data = response.json()
            assert len(data) == 1
            assert data[0]["name"] == "Guwahati Depot"
            assert data[0]["inventory_items"] == []
