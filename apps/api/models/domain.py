import uuid
import datetime
from sqlalchemy import String, Numeric, DateTime, ForeignKey, Index, Text, JSON
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
from geoalchemy2 import Geometry

class Base(DeclarativeBase):
    pass

class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(50), nullable=False, default="OPERATOR") # ADMIN, COMMANDER, OPERATOR, FIELD_OFFICER
    organization: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True), default=datetime.datetime.now(datetime.timezone.utc))

class DisasterEvent(Base):
    __tablename__ = "disaster_events"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    disaster_type: Mapped[str] = mapped_column(String(50), nullable=False) # FLOOD, LANDSLIDE, GLOF, EARTHQUAKE
    severity: Mapped[str] = mapped_column(String(50), nullable=False) # LOW, MEDIUM, HIGH, CRITICAL
    affected_state: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    location = mapped_column(Geometry(geometry_type="POINT", srid=4326), nullable=False)
    impact_zone = mapped_column(Geometry(geometry_type="POLYGON", srid=4326), nullable=True)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="ACTIVE", index=True) # ACTIVE, CONTAINED, RESOLVED
    reported_at: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True), default=datetime.datetime.now(datetime.timezone.utc))
    metadata_info: Mapped[dict | None] = mapped_column("metadata", JSONB, nullable=True, default={})

    __table_args__ = (
        Index("idx_disaster_location", location, postgresql_using="gist"),
        Index("idx_disaster_impact_zone", impact_zone, postgresql_using="gist"),
    )

class RoadSegment(Base):
    __tablename__ = "road_segments"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    highway_code: Mapped[str] = mapped_column(String(50), nullable=False, index=True) # NH-27, NH-6
    segment_name: Mapped[str] = mapped_column(String(255), nullable=False)
    start_district: Mapped[str] = mapped_column(String(100), nullable=False)
    end_district: Mapped[str] = mapped_column(String(100), nullable=False)
    geometry = mapped_column(Geometry(geometry_type="LINESTRING", srid=4326), nullable=False)
    current_status: Mapped[str] = mapped_column(String(50), nullable=False, default="CLEAR", index=True) # CLEAR, CAUTION, BLOCKED, IMPASSABLE
    weight_limit_tons: Mapped[float | None] = mapped_column(Numeric(5, 2), nullable=True)
    elevation_m: Mapped[float | None] = mapped_column(Numeric(6, 2), nullable=True)
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True), default=datetime.datetime.now(datetime.timezone.utc), onupdate=datetime.datetime.now(datetime.timezone.utc))

    __table_args__ = (
        Index("idx_road_geometry", geometry, postgresql_using="gist"),
    )

class LogisticsHub(Base):
    __tablename__ = "logistics_hubs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    hub_type: Mapped[str] = mapped_column(String(50), nullable=False) # DEPOT, RELIEF_CAMP, AIRFIELD, HELIPAD
    district: Mapped[str] = mapped_column(String(100), nullable=False)
    state: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    location = mapped_column(Geometry(geometry_type="POINT", srid=4326), nullable=False)
    capacity_sqm: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    contact_person: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="OPERATIONAL") # OPERATIONAL, FULL, DAMAGED

    inventory_items: Mapped[list["InventoryItem"]] = relationship("InventoryItem", back_populates="hub", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_hub_location", location, postgresql_using="gist"),
    )

class InventoryItem(Base):
    __tablename__ = "inventory_items"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    hub_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("logistics_hubs.id", ondelete="CASCADE"), nullable=False, index=True)
    item_category: Mapped[str] = mapped_column(String(100), nullable=False) # FOOD, WATER, MEDICAL, SHELTER, FUEL
    item_name: Mapped[str] = mapped_column(String(255), nullable=False)
    quantity: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    unit: Mapped[str] = mapped_column(String(50), nullable=False) # KG, LITERS, UNITS, BOXES
    last_updated: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True), default=datetime.datetime.now(datetime.timezone.utc), onupdate=datetime.datetime.now(datetime.timezone.utc))

    hub: Mapped["LogisticsHub"] = relationship("LogisticsHub", back_populates="inventory_items")

class DispatchOrder(Base):
    __tablename__ = "dispatch_orders"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_code: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    origin_hub_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("logistics_hubs.id"), nullable=True)
    destination_hub_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("logistics_hubs.id"), nullable=True)
    recommended_route_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    allocated_items: Mapped[dict] = mapped_column(JSONB, nullable=False)
    ai_recommendation_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="PROPOSED", index=True) # PROPOSED, PENDING_APPROVAL, APPROVED, DISPATCHED, DELIVERED, REJECTED, CANCELLED, FAILED
    approved_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    approved_at: Mapped[datetime.datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    rejection_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True), default=datetime.datetime.now(datetime.timezone.utc))

class AIAuditLog(Base):
    __tablename__ = "ai_audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    agent_name: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    prompt_summary: Mapped[str] = mapped_column(Text, nullable=False)
    recommendation: Mapped[str] = mapped_column(Text, nullable=False)
    confidence_score: Mapped[float] = mapped_column(Numeric(4, 3), nullable=False)
    evidence_data: Mapped[dict] = mapped_column(JSONB, nullable=False)
    model_used: Mapped[str] = mapped_column(String(100), nullable=False)
    execution_time_ms: Mapped[int] = mapped_column(nullable=False)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True), default=datetime.datetime.now(datetime.timezone.utc), index=True)

class FieldReport(Base):
    __tablename__ = "field_reports"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    client_generated_id: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    report_type: Mapped[str] = mapped_column(String(100), nullable=False) # ROAD_BLOCKAGE, DISASTER_OBSERVATION, LOGISTICS_ISSUE
    severity: Mapped[str] = mapped_column(String(50), nullable=False) # LOW, MEDIUM, HIGH, CRITICAL
    description: Mapped[str] = mapped_column(Text, nullable=False)
    location = mapped_column(Geometry(geometry_type="POINT", srid=4326), nullable=False)
    reported_by: Mapped[str] = mapped_column(String(255), nullable=False)
    observed_at: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True), default=datetime.datetime.now(datetime.timezone.utc))
    version: Mapped[int] = mapped_column(nullable=False, default=1)
    sync_metadata: Mapped[dict | None] = mapped_column(JSONB, nullable=True, default={})

    __table_args__ = (
        Index("idx_field_report_location", location, postgresql_using="gist"),
    )

class SystemAlert(Base):
    __tablename__ = "system_alerts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    client_generated_id: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True, index=True)
    alert_type: Mapped[str] = mapped_column(String(100), nullable=False) # SOS, HAZARD, FIELD_INCIDENT, DISASTER, BLOCKAGE
    severity: Mapped[str] = mapped_column(String(50), nullable=False) # CRITICAL, HIGH, MEDIUM, LOW
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    source: Mapped[str] = mapped_column(String(255), nullable=False)
    related_entity_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    latitude: Mapped[float | None] = mapped_column(Numeric(10, 6), nullable=True)
    longitude: Mapped[float | None] = mapped_column(Numeric(10, 6), nullable=True)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="ACTIVE", index=True) # ACTIVE, ACKNOWLEDGED, DISMISSED
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True), default=datetime.datetime.now(datetime.timezone.utc))
    dismissed_at: Mapped[datetime.datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    dismissed_by: Mapped[str | None] = mapped_column(String(255), nullable=True)
