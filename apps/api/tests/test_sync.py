import pytest
import uuid
import datetime
from unittest.mock import AsyncMock, patch, MagicMock
from fastapi.testclient import TestClient
from apps.api.main import app
from apps.api.models.domain import FieldReport, AIAuditLog
from apps.api.schemas.sync_schemas import FieldReportCreate, DriverEventCreate
from apps.api.services.sync_service import OfflineSyncService

client = TestClient(app)

@pytest.mark.asyncio
async def test_sync_field_report_success():
    mock_session = AsyncMock()
    service = OfflineSyncService(mock_session)

    # 1st execute query: no existing report found
    mock_session.execute.return_value = MagicMock(scalar_one_or_none=lambda: None)

    report_data = FieldReportCreate(
        client_generated_id="REP-CLIENT-001",
        report_type="ROAD_BLOCKAGE",
        severity="HIGH",
        description="NH-6 Shillong section blocked by fallen trees",
        location={"latitude": 25.57, "longitude": 91.89},
        observed_at=datetime.datetime.now(datetime.timezone.utc),
        version=1
    )

    res = await service.sync_field_report(report_data)

    assert res.status == "SYNCED"
    assert res.client_generated_id == "REP-CLIENT-001"
    mock_session.commit.assert_called_once()

@pytest.mark.asyncio
async def test_sync_field_report_idempotent_replay():
    mock_session = AsyncMock()
    service = OfflineSyncService(mock_session)

    existing_id = uuid.uuid4()
    existing_report = FieldReport(
        id=existing_id,
        client_generated_id="REP-CLIENT-002",
        report_type="ROAD_BLOCKAGE",
        severity="HIGH",
        description="Initial report",
        version=1
    )

    mock_session.execute.return_value = MagicMock(scalar_one_or_none=lambda: existing_report)

    report_data = FieldReportCreate(
        client_generated_id="REP-CLIENT-002",
        report_type="ROAD_BLOCKAGE",
        severity="HIGH",
        description="Initial report",
        location={"latitude": 25.57, "longitude": 91.89},
        observed_at=datetime.datetime.now(datetime.timezone.utc),
        version=1
    )

    res = await service.sync_field_report(report_data)

    assert res.status == "SYNCED"
    assert res.server_id == existing_id
    assert "Idempotent" in res.message

@pytest.mark.asyncio
async def test_sync_field_report_conflict_detection():
    mock_session = AsyncMock()
    service = OfflineSyncService(mock_session)

    existing_id = uuid.uuid4()
    # Existing report on server has version 2
    existing_report = FieldReport(
        id=existing_id,
        client_generated_id="REP-CLIENT-003",
        report_type="ROAD_BLOCKAGE",
        severity="HIGH",
        description="Server updated report",
        version=2
    )

    mock_session.execute.return_value = MagicMock(scalar_one_or_none=lambda: existing_report)

    # Client attempts to sync stale version 1
    report_data = FieldReportCreate(
        client_generated_id="REP-CLIENT-003",
        report_type="ROAD_BLOCKAGE",
        severity="MEDIUM",
        description="Stale client report",
        location={"latitude": 25.57, "longitude": 91.89},
        observed_at=datetime.datetime.now(datetime.timezone.utc),
        version=1
    )

    res = await service.sync_field_report(report_data)

    assert res.status == "CONFLICT"
    assert "Conflict" in res.message
    assert res.conflict_details["server_version"] == 2

def test_sync_field_report_api_endpoint():
    payload = {
        "client_generated_id": "REP-CLIENT-API-01",
        "report_type": "DISASTER_OBSERVATION",
        "severity": "CRITICAL",
        "description": "Flash flood overflowing river bank in Kamrup",
        "location": {"latitude": 26.18, "longitude": 91.73},
        "observed_at": "2026-08-28T14:00:00Z",
        "reported_by": "FIELD_OFFICER_PATIL"
    }

    mock_sync_result = MagicMock()
    mock_sync_result.client_generated_id = "REP-CLIENT-API-01"
    mock_sync_result.status = "SYNCED"
    mock_sync_result.server_id = uuid.uuid4()
    mock_sync_result.message = "Field report synchronized successfully."
    mock_sync_result.conflict_details = None

    with patch("apps.api.services.sync_service.OfflineSyncService.sync_field_report", new_callable=AsyncMock) as mock_sync:
        mock_sync.return_value = mock_sync_result
        res = client.post("/api/v1/sync/field-reports", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "SYNCED"
        assert data["client_generated_id"] == "REP-CLIENT-API-01"

@pytest.mark.asyncio
async def test_sync_driver_event_success():
    mock_session = AsyncMock()
    service = OfflineSyncService(mock_session)

    driver_event = DriverEventCreate(
        client_generated_id="DRV-EVENT-TEST-01",
        event_type="TRIP_UPDATE",
        dispatch_id="DISP-1001",
        driver_id="NER-DRIVER-01",
        truck_id="TRK-NE-042",
        trip_status="EN_ROUTE",
        latitude=26.1833,
        longitude=91.7333,
        speed_kmh=48.0,
        heading=90.0,
        description="Driver entered NH-27 main corridor",
        created_at=datetime.datetime.now(datetime.timezone.utc)
    )

    res = await service.sync_driver_event(driver_event)

    assert res.status == "SYNCED"
    assert res.client_generated_id == "DRV-EVENT-TEST-01"
    mock_session.commit.assert_called_once()

@pytest.mark.asyncio
async def test_get_active_vehicles_merges_telemetry():
    mock_session = AsyncMock()
    service = OfflineSyncService(mock_session)

    d1 = MagicMock(id=uuid.uuid4(), order_code="DISP-1001", status="APPROVED", created_at=datetime.datetime.now(datetime.timezone.utc), recommended_route_id="NH-27")
    d2 = MagicMock(id=uuid.uuid4(), order_code="DISP-1002", status="EN_ROUTE", created_at=datetime.datetime.now(datetime.timezone.utc), recommended_route_id="NH-10")
    d3 = MagicMock(id=uuid.uuid4(), order_code="DISP-1003", status="ACCEPTED", created_at=datetime.datetime.now(datetime.timezone.utc), recommended_route_id="NH-6")

    mock_session.execute.return_value = MagicMock(scalars=lambda: MagicMock(all=lambda: [d1, d2, d3]))

    vehicles = await service.get_active_vehicles()
    assert len(vehicles) == 3
    assert vehicles[0].order_code == "DISP-1001"
    assert vehicles[1].order_code == "DISP-1002"
    assert vehicles[2].order_code == "DISP-1003"

@pytest.mark.asyncio
async def test_dismiss_system_alert_persists():
    mock_session = AsyncMock()
    service = OfflineSyncService(mock_session)

    mock_alert = MagicMock()
    mock_alert.id = uuid.uuid4()
    mock_alert.title = "Test Alert"
    mock_alert.status = "ACTIVE"

    mock_session.execute.return_value = MagicMock(scalars=lambda: MagicMock(first=lambda: mock_alert))

    success = await service.dismiss_system_alert(str(mock_alert.id))
    assert success is True
    assert mock_alert.status == "DISMISSED"
    mock_session.commit.assert_called_once()
