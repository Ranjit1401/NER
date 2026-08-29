import uuid
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from apps.api.core.database import get_db_session
from apps.api.schemas.domain import DisasterEventCreate, DisasterEventRead, DisasterEventUpdate
from apps.api.services.repositories import DisasterRepository
from apps.api.services.gis_utils import geometry_to_point_coords, geometry_to_polygon_coords

router = APIRouter(prefix="/disasters", tags=["Disaster Intelligence"])

def _to_read_schema(event) -> DisasterEventRead:
    return DisasterEventRead(
        id=event.id,
        title=event.title,
        disaster_type=event.disaster_type,
        severity=event.severity,
        affected_state=event.affected_state,
        location=geometry_to_point_coords(event.location),
        impact_zone=geometry_to_polygon_coords(event.impact_zone),
        status=event.status,
        metadata=event.metadata_info or {},
        reported_at=event.reported_at
    )

@router.post("/", response_model=DisasterEventRead, status_code=status.HTTP_201_CREATED)
async def create_disaster_event(
    payload: DisasterEventCreate,
    session: AsyncSession = Depends(get_db_session)
) -> DisasterEventRead:
    repo = DisasterRepository(session)
    event = await repo.create(payload)
    return _to_read_schema(event)

@router.get("/", response_model=list[DisasterEventRead])
async def list_disaster_events(
    status_filter: str | None = Query(None, alias="status"),
    state_filter: str | None = Query(None, alias="state"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    session: AsyncSession = Depends(get_db_session)
) -> list[DisasterEventRead]:
    repo = DisasterRepository(session)
    events = await repo.list_all(status=status_filter, state=state_filter, limit=limit, offset=offset)
    return [_to_read_schema(e) for e in events]

@router.get("/{disaster_id}", response_model=DisasterEventRead)
async def get_disaster_event(
    disaster_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session)
) -> DisasterEventRead:
    repo = DisasterRepository(session)
    event = await repo.get_by_id(disaster_id)
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Disaster event not found")
    return _to_read_schema(event)

@router.patch("/{disaster_id}", response_model=DisasterEventRead)
async def update_disaster_event(
    disaster_id: uuid.UUID,
    payload: DisasterEventUpdate,
    session: AsyncSession = Depends(get_db_session)
) -> DisasterEventRead:
    repo = DisasterRepository(session)
    event = await repo.update(disaster_id, payload)
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Disaster event not found")
    return _to_read_schema(event)
