"""
Synthetic Development Seed Data script for the 8 North Eastern Region (NER) States:
Assam, Meghalaya, Arunachal Pradesh, Nagaland, Manipur, Mizoram, Tripura, Sikkim.

NOTE: This dataset contains synthetic/demo data for development and demonstration purposes.
It is NOT real government data or real-time disaster feed.
"""
import asyncio
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from apps.api.core.database import AsyncSessionLocal, engine
from apps.api.models.domain import Base
from apps.api.schemas.domain import (
    DisasterEventCreate, DisasterType, SeverityLevel, DisasterStatus,
    RoadSegmentCreate, RoadStatus,
    LogisticsHubCreate, HubType, HubStatus,
    InventoryItemCreate,
    DispatchOrderCreate,
    AIAuditLogCreate,
    PointCoordinates, LineCoordinates, PolygonCoordinates
)
from apps.api.services.repositories import (
    DisasterRepository,
    RoadRepository,
    HubRepository,
    DispatchRepository,
    AuditLogRepository
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("seed_data")

# --- Synthetic Seed Datasets ---
DEMO_DISASTERS = [
    DisasterEventCreate(
        title="SYNTHETIC: Brahmaputra River Flash Flood",
        disaster_type=DisasterType.FLOOD,
        severity=SeverityLevel.CRITICAL,
        affected_state="Assam",
        location=PointCoordinates(latitude=26.1833, longitude=91.7333), # Guwahati / Kamrup
        impact_zone=PolygonCoordinates(exterior=[
            PointCoordinates(latitude=26.15, longitude=91.68),
            PointCoordinates(latitude=26.22, longitude=91.68),
            PointCoordinates(latitude=26.22, longitude=91.78),
            PointCoordinates(latitude=26.15, longitude=91.78),
        ]),
        status=DisasterStatus.ACTIVE,
        metadata={"note": "SYNTHETIC DEMO DATA: Monsoonal river swelling simulation."}
    ),
    DisasterEventCreate(
        title="SYNTHETIC: NH-6 East Khasi Hills Landslide",
        disaster_type=DisasterType.LANDSLIDE,
        severity=SeverityLevel.HIGH,
        affected_state="Meghalaya",
        location=PointCoordinates(latitude=25.5788, longitude=91.8933), # Shillong
        impact_zone=PolygonCoordinates(exterior=[
            PointCoordinates(latitude=25.55, longitude=91.87),
            PointCoordinates(latitude=25.60, longitude=91.87),
            PointCoordinates(latitude=25.60, longitude=91.92),
            PointCoordinates(latitude=25.55, longitude=91.92),
        ]),
        status=DisasterStatus.ACTIVE,
        metadata={"note": "SYNTHETIC DEMO DATA: Slope instability simulation along NH-6 corridor."}
    ),
    DisasterEventCreate(
        title="SYNTHETIC: Teesta Stage-III GLOF Alert",
        disaster_type=DisasterType.GLOF,
        severity=SeverityLevel.HIGH,
        affected_state="Sikkim",
        location=PointCoordinates(latitude=27.3389, longitude=88.6065), # Gangtok / Mangan
        status=DisasterStatus.ACTIVE,
        metadata={"note": "SYNTHETIC DEMO DATA: Glacial lake outburst flood simulation."}
    )
]

DEMO_ROADS = [
    RoadSegmentCreate(
        highway_code="NH-27",
        segment_name="Guwahati - Nagaon Corridor",
        start_district="Kamrup Metropolitan",
        end_district="Nagaon",
        geometry=LineCoordinates(points=[
            PointCoordinates(latitude=26.1833, longitude=91.7333),
            PointCoordinates(latitude=26.2500, longitude=92.1500),
            PointCoordinates(latitude=26.3500, longitude=92.6833)
        ]),
        current_status=RoadStatus.CAUTION,
        weight_limit_tons=25.0,
        elevation_m=55.0
    ),
    RoadSegmentCreate(
        highway_code="NH-6",
        segment_name="Shillong - Jowai Highway",
        start_district="East Khasi Hills",
        end_district="West Jaintia Hills",
        geometry=LineCoordinates(points=[
            PointCoordinates(latitude=25.5788, longitude=91.8933),
            PointCoordinates(latitude=25.4800, longitude=92.0500),
            PointCoordinates(latitude=25.4500, longitude=92.2000)
        ]),
        current_status=RoadStatus.BLOCKED,
        weight_limit_tons=15.0,
        elevation_m=1450.0
    ),
    RoadSegmentCreate(
        highway_code="NH-10",
        segment_name="Siliguri - Gangtok Highway",
        start_district="Darjeeling",
        end_district="East Sikkim",
        geometry=LineCoordinates(points=[
            PointCoordinates(latitude=26.7167, longitude=88.4333),
            PointCoordinates(latitude=27.1000, longitude=88.5000),
            PointCoordinates(latitude=27.3389, longitude=88.6065)
        ]),
        current_status=RoadStatus.CAUTION,
        weight_limit_tons=20.0,
        elevation_m=1600.0
    ),
    RoadSegmentCreate(
        highway_code="NH-15",
        segment_name="Tezpur - Lakhimpur Highway",
        start_district="Sonitpur",
        end_district="Lakhimpur",
        geometry=LineCoordinates(points=[
            PointCoordinates(latitude=26.6333, longitude=92.8000),
            PointCoordinates(latitude=26.9000, longitude=93.5000),
            PointCoordinates(latitude=27.2333, longitude=94.1000)
        ]),
        current_status=RoadStatus.CLEAR,
        weight_limit_tons=30.0,
        elevation_m=78.0
    ),
    RoadSegmentCreate(
        highway_code="NH-29",
        segment_name="Dimapur - Kohima Corridor",
        start_district="Dimapur",
        end_district="Kohima",
        geometry=LineCoordinates(points=[
            PointCoordinates(latitude=25.9060, longitude=93.7270),
            PointCoordinates(latitude=25.7800, longitude=93.9500),
            PointCoordinates(latitude=25.6701, longitude=94.1077)
        ]),
        current_status=RoadStatus.CAUTION,
        weight_limit_tons=18.0,
        elevation_m=1444.0
    ),
    RoadSegmentCreate(
        highway_code="NH-54",
        segment_name="Silchar - Aizawl Arterial",
        start_district="Cachar",
        end_district="Aizawl",
        geometry=LineCoordinates(points=[
            PointCoordinates(latitude=24.8333, longitude=92.7833),
            PointCoordinates(latitude=24.2000, longitude=92.7000),
            PointCoordinates(latitude=23.7307, longitude=92.7173)
        ]),
        current_status=RoadStatus.CLEAR,
        weight_limit_tons=22.0,
        elevation_m=1132.0
    )
]

DEMO_HUBS = [
    LogisticsHubCreate(
        name="Guwahati Central Emergency Depot",
        hub_type=HubType.DEPOT,
        district="Kamrup Metropolitan",
        state="Assam",
        location=PointCoordinates(latitude=26.1400, longitude=91.7900),
        capacity_sqm=5000.0,
        contact_person="Logistics Officer Baruah",
        status=HubStatus.OPERATIONAL
    ),
    LogisticsHubCreate(
        name="Shillong Relief Camp & Helipad",
        hub_type=HubType.HELIPAD,
        district="East Khasi Hills",
        state="Meghalaya",
        location=PointCoordinates(latitude=25.5800, longitude=91.8800),
        capacity_sqm=1200.0,
        contact_person="Camp Manager Lyndem",
        status=HubStatus.OPERATIONAL
    ),
    LogisticsHubCreate(
        name="Gangtok Emergency Supply Base",
        hub_type=HubType.DEPOT,
        district="East Sikkim",
        state="Sikkim",
        location=PointCoordinates(latitude=27.3200, longitude=88.6100),
        capacity_sqm=2000.0,
        contact_person="Supply Officer Bhotia",
        status=HubStatus.OPERATIONAL
    ),
    LogisticsHubCreate(
        name="Tezpur Airbase Logistics staging",
        hub_type=HubType.HELIPAD,
        district="Sonitpur",
        state="Assam",
        location=PointCoordinates(latitude=26.7100, longitude=92.7900),
        capacity_sqm=3500.0,
        contact_person="Flight Cdr Sharma",
        status=HubStatus.OPERATIONAL
    ),
    LogisticsHubCreate(
        name="Kohima Forward Supply Depot",
        hub_type=HubType.DEPOT,
        district="Kohima",
        state="Nagaland",
        location=PointCoordinates(latitude=25.6700, longitude=94.1100),
        capacity_sqm=1800.0,
        contact_person="Regional Admin Ao",
        status=HubStatus.OPERATIONAL
    ),
    LogisticsHubCreate(
        name="Aizawl Emergency Relief Base",
        hub_type=HubType.DEPOT,
        district="Aizawl",
        state="Mizoram",
        location=PointCoordinates(latitude=23.7300, longitude=92.7200),
        capacity_sqm=1500.0,
        contact_person="Disaster Officer Lalthan",
        status=HubStatus.OPERATIONAL
    )
]

async def seed_database() -> None:
    logger.info("Initializing database tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as session:
        disaster_repo = DisasterRepository(session)
        road_repo = RoadRepository(session)
        hub_repo = HubRepository(session)
        dispatch_repo = DispatchRepository(session)
        audit_repo = AuditLogRepository(session)

        logger.info("Seeding Disasters...")
        existing_disasters = await disaster_repo.list_all()
        existing_titles = {d.title for d in existing_disasters}
        for d in DEMO_DISASTERS:
            if d.title not in existing_titles:
                await disaster_repo.create(d)

        logger.info("Seeding Road Segments...")
        existing_roads = await road_repo.list_all()
        existing_highways = {r.highway_code for r in existing_roads}
        for r in DEMO_ROADS:
            if r.highway_code not in existing_highways:
                await road_repo.create(r)

        logger.info("Seeding Logistics Hubs & Inventory...")
        existing_hubs = await hub_repo.list_hubs()
        existing_hub_names = {h.name for h in existing_hubs}
        created_hubs = list(existing_hubs)
        for h in DEMO_HUBS:
            if h.name not in existing_hub_names:
                hub = await hub_repo.create_hub(h)
                created_hubs.append(hub)

                # Add inventory for each hub
                await hub_repo.add_inventory(InventoryItemCreate(
                    hub_id=hub.id,
                    item_category="FOOD",
                    item_name="Ready-To-Eat Rice Rations (20kg)",
                    quantity=500.0,
                    unit="BOXES"
                ))
                await hub_repo.add_inventory(InventoryItemCreate(
                    hub_id=hub.id,
                    item_category="WATER",
                    item_name="Water Purification Tablets (1000s)",
                    quantity=200.0,
                    unit="PACKS"
                ))
                await hub_repo.add_inventory(InventoryItemCreate(
                    hub_id=hub.id,
                    item_category="MEDICAL",
                    item_name="Emergency First Aid Kits",
                    quantity=150.0,
                    unit="UNITS"
                ))

        existing_orders = await dispatch_repo.list_orders()
        if len(created_hubs) >= 3 and len(existing_orders) == 0:
            logger.info("Seeding Sample Dispatch Orders for Multiple Corridors...")
            await dispatch_repo.create_order(DispatchOrderCreate(
                origin_hub_id=created_hubs[0].id,
                destination_hub_id=created_hubs[1].id,
                recommended_route_id="NH-27",
                allocated_items={"FOOD": 100.0, "WATER": 50.0}
            ))
            await dispatch_repo.create_order(DispatchOrderCreate(
                origin_hub_id=created_hubs[0].id,
                destination_hub_id=created_hubs[2].id,
                recommended_route_id="NH-10",
                allocated_items={"MEDICAL": 30.0, "WATER": 80.0}
            ))
            await dispatch_repo.create_order(DispatchOrderCreate(
                origin_hub_id=created_hubs[1].id,
                destination_hub_id=created_hubs[0].id,
                recommended_route_id="NH-6",
                allocated_items={"FOOD": 50.0}
            ))

        logger.info("Seeding Initial AI Audit Log...")
        await audit_repo.log_decision(AIAuditLogCreate(
            agent_name="DisasterIntelligenceAgent",
            prompt_summary="Assessed Guwahati flash flood risk zone",
            recommendation="Issue CAUTION alert on NH-27; route heavy trucks via Guwahati bypass.",
            confidence_score=0.925,
            evidence_data={"river_level_m": 48.5, "rainfall_24h_mm": 185.0},
            model_used="fast-reasoner",
            execution_time_ms=240
        ))

        logger.info("Seed data creation complete!")

if __name__ == "__main__":
    asyncio.run(seed_database())
