import uuid
import datetime
from typing import Sequence
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, func, text
from geoalchemy2.functions import ST_DWithin, ST_Intersects, ST_GeomFromText, ST_Buffer
from apps.api.models.domain import (
    DisasterEvent,
    RoadSegment,
    LogisticsHub,
    InventoryItem,
    DispatchOrder,
    AIAuditLog
)
from apps.api.schemas.domain import (
    DisasterEventCreate, DisasterEventUpdate,
    RoadSegmentCreate, RoadSegmentUpdate,
    LogisticsHubCreate,
    InventoryItemCreate, InventoryItemUpdate,
    DispatchOrderCreate, DispatchOrderUpdate,
    AIAuditLogCreate
)
from apps.api.services.gis_utils import point_to_wkt, line_to_wkt, polygon_to_wkt

# --- Disaster Repository ---
class DisasterRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(self, data: DisasterEventCreate) -> DisasterEvent:
        loc_wkt = point_to_wkt(data.location)
        poly_wkt = polygon_to_wkt(data.impact_zone) if data.impact_zone else None

        disaster = DisasterEvent(
            title=data.title,
            disaster_type=data.disaster_type.value,
            severity=data.severity.value,
            affected_state=data.affected_state,
            location=ST_GeomFromText(loc_wkt, 4326),
            impact_zone=ST_GeomFromText(poly_wkt, 4326) if poly_wkt else None,
            status=data.status.value,
            metadata_info=data.metadata_info or {}
        )
        self.session.add(disaster)
        await self.session.commit()
        await self.session.refresh(disaster)
        return disaster

    async def get_by_id(self, disaster_id: uuid.UUID) -> DisasterEvent | None:
        result = await self.session.execute(
            select(DisasterEvent).where(DisasterEvent.id == disaster_id)
        )
        return result.scalar_one_or_none()

    async def list_all(
        self,
        status: str | None = None,
        state: str | None = None,
        limit: int = 50,
        offset: int = 0
    ) -> Sequence[DisasterEvent]:
        query = select(DisasterEvent)
        if status:
            query = query.where(DisasterEvent.status == status)
        if state:
            query = query.where(DisasterEvent.affected_state == state)
        query = query.order_by(DisasterEvent.reported_at.desc()).limit(limit).offset(offset)
        result = await self.session.execute(query)
        return result.scalars().all()

    async def update(self, disaster_id: uuid.UUID, data: DisasterEventUpdate) -> DisasterEvent | None:
        disaster = await self.get_by_id(disaster_id)
        if not disaster:
            return None
        if data.title:
            disaster.title = data.title
        if data.severity:
            disaster.severity = data.severity.value
        if data.status:
            disaster.status = data.status.value
        if data.metadata_info is not None:
            disaster.metadata_info = data.metadata_info
        await self.session.commit()
        await self.session.refresh(disaster)
        return disaster

# --- Road Segment Repository ---
class RoadRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(self, data: RoadSegmentCreate) -> RoadSegment:
        geom_wkt = line_to_wkt(data.geometry)
        road = RoadSegment(
            highway_code=data.highway_code,
            segment_name=data.segment_name,
            start_district=data.start_district,
            end_district=data.end_district,
            geometry=ST_GeomFromText(geom_wkt, 4326),
            current_status=data.current_status.value,
            weight_limit_tons=data.weight_limit_tons,
            elevation_m=data.elevation_m
        )
        self.session.add(road)
        await self.session.commit()
        await self.session.refresh(road)
        return road

    async def get_by_id(self, road_id: uuid.UUID) -> RoadSegment | None:
        result = await self.session.execute(
            select(RoadSegment).where(RoadSegment.id == road_id)
        )
        return result.scalar_one_or_none()

    async def list_all(
        self,
        highway_code: str | None = None,
        status: str | None = None,
        limit: int = 50,
        offset: int = 0
    ) -> Sequence[RoadSegment]:
        query = select(RoadSegment)
        if highway_code:
            query = query.where(RoadSegment.highway_code == highway_code)
        if status:
            query = query.where(RoadSegment.current_status == status)
        query = query.limit(limit).offset(offset)
        result = await self.session.execute(query)
        return result.scalars().all()

# --- Logistics Hub & Inventory Repository ---
class HubRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create_hub(self, data: LogisticsHubCreate) -> LogisticsHub:
        loc_wkt = point_to_wkt(data.location)
        hub = LogisticsHub(
            name=data.name,
            hub_type=data.hub_type.value,
            district=data.district,
            state=data.state,
            location=ST_GeomFromText(loc_wkt, 4326),
            capacity_sqm=data.capacity_sqm,
            contact_person=data.contact_person,
            status=data.status.value
        )
        self.session.add(hub)
        await self.session.commit()
        await self.session.refresh(hub)
        return hub

    async def get_hub_by_id(self, hub_id: uuid.UUID) -> LogisticsHub | None:
        from sqlalchemy.orm import selectinload
        result = await self.session.execute(
            select(LogisticsHub).options(selectinload(LogisticsHub.inventory_items)).where(LogisticsHub.id == hub_id)
        )
        return result.scalar_one_or_none()

    async def list_hubs(self, state: str | None = None, hub_type: str | None = None) -> Sequence[LogisticsHub]:
        from sqlalchemy.orm import selectinload
        query = select(LogisticsHub).options(selectinload(LogisticsHub.inventory_items))
        if state:
            query = query.where(LogisticsHub.state == state)
        if hub_type:
            query = query.where(LogisticsHub.hub_type == hub_type)
        result = await self.session.execute(query)
        return result.scalars().all()

    async def add_inventory(self, data: InventoryItemCreate) -> InventoryItem:
        item = InventoryItem(
            hub_id=data.hub_id,
            item_category=data.item_category,
            item_name=data.item_name,
            quantity=data.quantity,
            unit=data.unit
        )
        self.session.add(item)
        await self.session.commit()
        await self.session.refresh(item)
        return item

    async def list_inventory_by_hub(self, hub_id: uuid.UUID) -> Sequence[InventoryItem]:
        result = await self.session.execute(
            select(InventoryItem).where(InventoryItem.hub_id == hub_id)
        )
        return result.scalars().all()

    async def update_inventory_quantity(self, item_id: uuid.UUID, quantity: float) -> InventoryItem | None:
        result = await self.session.execute(
            select(InventoryItem).where(InventoryItem.id == item_id)
        )
        item = result.scalar_one_or_none()
        if not item:
            return None
        item.quantity = quantity
        item.last_updated = datetime.datetime.now(datetime.timezone.utc)
        await self.session.commit()
        await self.session.refresh(item)
        return item

# --- Dispatch Order Repository ---
class DispatchRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create_order(self, data: DispatchOrderCreate) -> DispatchOrder:
        order_code = f"DISP-{uuid.uuid4().hex[:8].upper()}"
        order = DispatchOrder(
            order_code=order_code,
            origin_hub_id=data.origin_hub_id,
            destination_hub_id=data.destination_hub_id,
            recommended_route_id=data.recommended_route_id,
            allocated_items=data.allocated_items,
            ai_recommendation_id=data.ai_recommendation_id,
            status="PROPOSED"
        )
        self.session.add(order)
        await self.session.commit()
        await self.session.refresh(order)
        return order

    async def get_by_id(self, order_id: uuid.UUID) -> DispatchOrder | None:
        result = await self.session.execute(
            select(DispatchOrder).where(DispatchOrder.id == order_id)
        )
        return result.scalar_one_or_none()

    async def list_orders(self, status: str | None = None) -> Sequence[DispatchOrder]:
        query = select(DispatchOrder)
        if status:
            query = query.where(DispatchOrder.status == status)
        query = query.order_by(DispatchOrder.created_at.desc())
        result = await self.session.execute(query)
        return result.scalars().all()

    async def update_status(self, order_id: uuid.UUID, data: DispatchOrderUpdate) -> DispatchOrder | None:
        order = await self.get_by_id(order_id)
        if not order:
            return None
        order.status = data.status.value
        if data.approved_by:
            order.approved_by = data.approved_by
            order.approved_at = datetime.datetime.now(datetime.timezone.utc)
        await self.session.commit()
        await self.session.refresh(order)
        return order

# --- Audit Log Repository ---
class AuditLogRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def log_decision(self, data: AIAuditLogCreate) -> AIAuditLog:
        audit = AIAuditLog(
            agent_name=data.agent_name,
            prompt_summary=data.prompt_summary,
            recommendation=data.recommendation,
            confidence_score=data.confidence_score,
            evidence_data=data.evidence_data,
            model_used=data.model_used,
            execution_time_ms=data.execution_time_ms
        )
        self.session.add(audit)
        await self.session.commit()
        await self.session.refresh(audit)
        return audit

    async def list_logs(self, agent_name: str | None = None, limit: int = 50) -> Sequence[AIAuditLog]:
        query = select(AIAuditLog)
        if agent_name:
            query = query.where(AIAuditLog.agent_name == agent_name)
        query = query.order_by(AIAuditLog.created_at.desc()).limit(limit)
        result = await self.session.execute(query)
        return result.scalars().all()

# --- GIS Spatial Service Methods ---
class GISQueryService:
    """Service providing spatial query foundations for Phase 4+ Route Intelligence Agent."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def find_roads_intersecting_impact_zones(self) -> Sequence[RoadSegment]:
        """Find road segments intersecting active disaster impact zones."""
        query = (
            select(RoadSegment)
            .join(
                DisasterEvent,
                ST_Intersects(RoadSegment.geometry, DisasterEvent.impact_zone)
            )
            .where(DisasterEvent.status == "ACTIVE")
            .distinct()
        )
        result = await self.session.execute(query)
        return result.scalars().all()

    async def find_hubs_near_point(self, latitude: float, longitude: float, radius_km: float = 50.0) -> Sequence[LogisticsHub]:
        """Find logistics hubs within radius_km of a coordinate point."""
        point_wkt = f"SRID=4326;POINT({longitude} {latitude})"
        # 1 degree lat approx 111,000 meters in WGS84
        query = (
            select(LogisticsHub)
            .where(
                ST_DWithin(
                    LogisticsHub.location,
                    ST_GeomFromText(point_wkt, 4326),
                    radius_km * 1000.0,
                    use_spheroid=True
                )
            )
        )
        result = await self.session.execute(query)
        return result.scalars().all()
