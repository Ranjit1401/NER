import uuid
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from apps.api.core.database import get_db_session
from apps.api.schemas.sync_schemas import (
    FieldReportCreate, FieldReportRead, SyncResult, DriverEventCreate,
    DriverTelemetryRead, DriverEmergencyRead, ActiveVehicleRead, SystemAlertRead
)
from apps.api.services.sync_service import OfflineSyncService, LATEST_DRIVER_TELEMETRY
from apps.api.services.gis_utils import geometry_to_point_coords

router = APIRouter(prefix="/sync", tags=["Offline Sync & Field Reports"])

@router.post("/driver-events", response_model=SyncResult, status_code=status.HTTP_200_OK)
async def sync_driver_event(
    payload: DriverEventCreate,
    session: AsyncSession = Depends(get_db_session)
) -> SyncResult:
    service = OfflineSyncService(session)
    return await service.sync_driver_event(payload)

@router.get("/driver-telemetry/latest", response_model=list[ActiveVehicleRead])
async def get_latest_driver_telemetry(
    session: AsyncSession = Depends(get_db_session)
) -> list[ActiveVehicleRead]:
    service = OfflineSyncService(session)
    return await service.get_active_vehicles()

@router.get("/emergencies", response_model=list[DriverEmergencyRead])
async def list_emergencies(
    session: AsyncSession = Depends(get_db_session)
) -> list[DriverEmergencyRead]:
    service = OfflineSyncService(session)
    return await service.list_emergencies()

@router.post("/emergencies/{client_generated_id}/acknowledge", response_model=dict)
async def acknowledge_emergency(
    client_generated_id: str,
    session: AsyncSession = Depends(get_db_session)
) -> dict:
    service = OfflineSyncService(session)
    success = await service.acknowledge_emergency(client_generated_id)
    return {"client_generated_id": client_generated_id, "acknowledged": success}

@router.post("/field-reports", response_model=SyncResult, status_code=status.HTTP_200_OK)
async def sync_field_report(
    payload: FieldReportCreate,
    session: AsyncSession = Depends(get_db_session)
) -> SyncResult:
    service = OfflineSyncService(session)
    return await service.sync_field_report(payload)

@router.get("/field-reports", response_model=list[FieldReportRead])
async def list_field_reports(
    session: AsyncSession = Depends(get_db_session)
) -> list[FieldReportRead]:
    service = OfflineSyncService(session)
    reports = await service.list_reports()
    return [
        FieldReportRead(
            id=r.id,
            client_generated_id=r.client_generated_id,
            report_type=r.report_type,
            severity=r.severity,
            description=r.description,
            location=geometry_to_point_coords(r.location),
            reported_by=r.reported_by,
            observed_at=r.observed_at,
            created_at=r.created_at,
            version=r.version
        )
        for r in reports
    ]

@router.get("/alerts", response_model=list[SystemAlertRead])
async def list_system_alerts(
    session: AsyncSession = Depends(get_db_session)
) -> list[SystemAlertRead]:
    service = OfflineSyncService(session)
    alerts = await service.list_system_alerts()
    return [SystemAlertRead.model_validate(a) for a in alerts]

@router.post("/alerts/{alert_id}/dismiss", response_model=dict)
async def dismiss_system_alert(
    alert_id: str,
    session: AsyncSession = Depends(get_db_session)
) -> dict:
    service = OfflineSyncService(session)
    success = await service.dismiss_system_alert(alert_id)
    return {"id": alert_id, "status": "DISMISSED"}
