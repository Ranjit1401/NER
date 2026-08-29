import uuid
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from apps.api.core.database import get_db_session
from apps.api.schemas.domain import (
    LogisticsHubCreate, LogisticsHubRead,
    InventoryItemCreate, InventoryItemRead, InventoryItemUpdate
)
from apps.api.services.repositories import HubRepository, GISQueryService
from apps.api.services.gis_utils import geometry_to_point_coords

router = APIRouter(prefix="/hubs", tags=["Logistics & Inventory"])

def _hub_to_read(hub) -> LogisticsHubRead:
    items = []
    if hasattr(hub, "inventory_items") and hub.inventory_items:
        items = [
            InventoryItemRead(
                id=item.id,
                hub_id=item.hub_id,
                item_category=item.item_category,
                item_name=item.item_name,
                quantity=item.quantity,
                unit=item.unit,
                last_updated=item.last_updated
            )
            for item in hub.inventory_items
        ]
    return LogisticsHubRead(
        id=hub.id,
        name=hub.name,
        hub_type=hub.hub_type,
        district=hub.district,
        state=hub.state,
        location=geometry_to_point_coords(hub.location),
        capacity_sqm=hub.capacity_sqm,
        contact_person=hub.contact_person,
        status=hub.status,
        inventory_items=items
    )

@router.post("/", response_model=LogisticsHubRead, status_code=status.HTTP_201_CREATED)
async def create_hub(
    payload: LogisticsHubCreate,
    session: AsyncSession = Depends(get_db_session)
) -> LogisticsHubRead:
    repo = HubRepository(session)
    hub = await repo.create_hub(payload)
    return _hub_to_read(hub)

@router.get("/", response_model=list[LogisticsHubRead])
async def list_hubs(
    state: str | None = Query(None),
    hub_type: str | None = Query(None),
    session: AsyncSession = Depends(get_db_session)
) -> list[LogisticsHubRead]:
    repo = HubRepository(session)
    hubs = await repo.list_hubs(state=state, hub_type=hub_type)
    return [_hub_to_read(h) for h in hubs]

@router.get("/nearby", response_model=list[LogisticsHubRead])
async def find_nearby_hubs(
    latitude: float = Query(..., ge=-90.0, le=90.0),
    longitude: float = Query(..., ge=-180.0, le=180.0),
    radius_km: float = Query(50.0, ge=1.0, le=500.0),
    session: AsyncSession = Depends(get_db_session)
) -> list[LogisticsHubRead]:
    gis_service = GISQueryService(session)
    hubs = await gis_service.find_hubs_near_point(latitude, longitude, radius_km)
    return [_hub_to_read(h) for h in hubs]

@router.get("/{hub_id}", response_model=LogisticsHubRead)
async def get_hub(
    hub_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session)
) -> LogisticsHubRead:
    repo = HubRepository(session)
    hub = await repo.get_hub_by_id(hub_id)
    if not hub:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Logistics hub not found")
    return _hub_to_read(hub)

@router.post("/inventory", response_model=InventoryItemRead, status_code=status.HTTP_201_CREATED)
async def add_inventory_item(
    payload: InventoryItemCreate,
    session: AsyncSession = Depends(get_db_session)
) -> InventoryItemRead:
    repo = HubRepository(session)
    item = await repo.add_inventory(payload)
    return InventoryItemRead.model_validate(item)

@router.get("/{hub_id}/inventory", response_model=list[InventoryItemRead])
async def list_hub_inventory(
    hub_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session)
) -> list[InventoryItemRead]:
    repo = HubRepository(session)
    items = await repo.list_inventory_by_hub(hub_id)
    return [InventoryItemRead.model_validate(i) for i in items]

@router.patch("/inventory/{item_id}", response_model=InventoryItemRead)
async def update_inventory_quantity(
    item_id: uuid.UUID,
    payload: InventoryItemUpdate,
    session: AsyncSession = Depends(get_db_session)
) -> InventoryItemRead:
    repo = HubRepository(session)
    item = await repo.update_inventory_quantity(item_id, payload.quantity)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inventory item not found")
    return InventoryItemRead.model_validate(item)
