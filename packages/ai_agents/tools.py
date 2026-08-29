import uuid
from typing import Sequence, Any
from sqlalchemy.ext.asyncio import AsyncSession
from apps.api.services.repositories import (
    DisasterRepository,
    RoadRepository,
    HubRepository,
    GISQueryService
)

class ControlledAgentTools:
    """Tool execution layer for specialized AI agents. Wraps PostGIS/DB queries."""

    def __init__(self, session: AsyncSession) -> None:
        self.disaster_repo = DisasterRepository(session)
        self.road_repo = RoadRepository(session)
        self.hub_repo = HubRepository(session)
        self.gis_service = GISQueryService(session)

    async def get_active_disasters(self, state: str | None = None) -> list[dict[str, Any]]:
        disasters = await self.disaster_repo.list_all(status="ACTIVE", state=state)
        return [
            {
                "id": str(d.id),
                "title": d.title,
                "disaster_type": d.disaster_type,
                "severity": d.severity,
                "affected_state": d.affected_state,
                "reported_at": str(d.reported_at),
            }
            for d in disasters
        ]

    async def get_affected_roads(self) -> list[dict[str, Any]]:
        roads = await self.gis_service.find_roads_intersecting_impact_zones()
        return [
            {
                "id": str(r.id),
                "highway_code": r.highway_code,
                "segment_name": r.segment_name,
                "start_district": r.start_district,
                "end_district": r.end_district,
                "current_status": r.current_status,
                "weight_limit_tons": float(r.weight_limit_tons) if r.weight_limit_tons else None,
            }
            for r in roads
        ]

    async def get_all_road_corridors(self) -> list[dict[str, Any]]:
        roads = await self.road_repo.list_all()
        return [
            {
                "id": str(r.id),
                "highway_code": r.highway_code,
                "segment_name": r.segment_name,
                "current_status": r.current_status,
                "weight_limit_tons": float(r.weight_limit_tons) if r.weight_limit_tons else None,
                "elevation_m": float(r.elevation_m) if r.elevation_m else None,
            }
            for r in roads
        ]

    async def get_logistics_hubs_and_inventory(self, state: str | None = None) -> list[dict[str, Any]]:
        hubs = await self.hub_repo.list_hubs(state=state)
        result = []
        for h in hubs:
            inventory = await self.hub_repo.list_inventory_by_hub(h.id)
            result.append({
                "id": str(h.id),
                "name": h.name,
                "hub_type": h.hub_type,
                "district": h.district,
                "state": h.state,
                "status": h.status,
                "inventory": [
                    {
                        "item_name": item.item_name,
                        "item_category": item.item_category,
                        "quantity": float(item.quantity),
                        "unit": item.unit
                    }
                    for item in inventory
                ]
            })
        return result
