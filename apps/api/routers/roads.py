import uuid
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from apps.api.core.database import get_db_session
from apps.api.schemas.domain import RoadSegmentCreate, RoadSegmentRead
from apps.api.services.repositories import RoadRepository, GISQueryService
from apps.api.services.gis_utils import geometry_to_line_coords

router = APIRouter(prefix="/roads", tags=["Route Intelligence"])

def _to_read_schema(road) -> RoadSegmentRead:
    return RoadSegmentRead(
        id=road.id,
        highway_code=road.highway_code,
        segment_name=road.segment_name,
        start_district=road.start_district,
        end_district=road.end_district,
        geometry=geometry_to_line_coords(road.geometry),
        current_status=road.current_status,
        weight_limit_tons=road.weight_limit_tons,
        elevation_m=road.elevation_m,
        updated_at=road.updated_at
    )

@router.post("/", response_model=RoadSegmentRead, status_code=status.HTTP_201_CREATED)
async def create_road_segment(
    payload: RoadSegmentCreate,
    session: AsyncSession = Depends(get_db_session)
) -> RoadSegmentRead:
    repo = RoadRepository(session)
    road = await repo.create(payload)
    return _to_read_schema(road)

@router.get("/", response_model=list[RoadSegmentRead])
async def list_road_segments(
    highway_code: str | None = Query(None),
    status_filter: str | None = Query(None, alias="status"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    session: AsyncSession = Depends(get_db_session)
) -> list[RoadSegmentRead]:
    repo = RoadRepository(session)
    roads = await repo.list_all(highway_code=highway_code, status=status_filter, limit=limit, offset=offset)
    return [_to_read_schema(r) for r in roads]

@router.get("/affected-by-disasters", response_model=list[RoadSegmentRead])
async def list_affected_road_segments(
    session: AsyncSession = Depends(get_db_session)
) -> list[RoadSegmentRead]:
    gis_service = GISQueryService(session)
    roads = await gis_service.find_roads_intersecting_impact_zones()
    return [_to_read_schema(r) for r in roads]

@router.get("/{road_id}", response_model=RoadSegmentRead)
async def get_road_segment(
    road_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session)
) -> RoadSegmentRead:
    repo = RoadRepository(session)
    road = await repo.get_by_id(road_id)
    if not road:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Road segment not found")
    return _to_read_schema(road)
