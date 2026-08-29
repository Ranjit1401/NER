import uuid
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from apps.api.core.database import get_db_session
from apps.api.schemas.sync_schemas import FieldReportCreate, FieldReportRead, SyncResult
from apps.api.services.sync_service import OfflineSyncService
from apps.api.services.gis_utils import geometry_to_point_coords

router = APIRouter(prefix="/sync", tags=["Offline Sync & Field Reports"])

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
