import uuid
import datetime
from enum import Enum
from pydantic import BaseModel, ConfigDict, Field, field_validator

# --- Enums ---
class DisasterType(str, Enum):
    FLOOD = "FLOOD"
    LANDSLIDE = "LANDSLIDE"
    GLOF = "GLOF"
    EARTHQUAKE = "EARTHQUAKE"

class SeverityLevel(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

class DisasterStatus(str, Enum):
    ACTIVE = "ACTIVE"
    CONTAINED = "CONTAINED"
    RESOLVED = "RESOLVED"

class RoadStatus(str, Enum):
    CLEAR = "CLEAR"
    CAUTION = "CAUTION"
    BLOCKED = "BLOCKED"
    IMPASSABLE = "IMPASSABLE"

class HubType(str, Enum):
    DEPOT = "DEPOT"
    RELIEF_CAMP = "RELIEF_CAMP"
    AIRFIELD = "AIRFIELD"
    HELIPAD = "HELIPAD"

class HubStatus(str, Enum):
    OPERATIONAL = "OPERATIONAL"
    FULL = "FULL"
    DAMAGED = "DAMAGED"

class DispatchStatus(str, Enum):
    PROPOSED = "PROPOSED"
    PENDING_APPROVAL = "PENDING_APPROVAL"
    APPROVED = "APPROVED"
    DISPATCHED = "DISPATCHED"
    DELIVERED = "DELIVERED"
    REJECTED = "REJECTED"
    CANCELLED = "CANCELLED"
    FAILED = "FAILED"

class UserRole(str, Enum):
    ADMIN = "ADMIN"
    COMMANDER = "COMMANDER"
    OPERATOR = "OPERATOR"
    FIELD_OFFICER = "FIELD_OFFICER"

# --- GIS Schemas ---
class PointCoordinates(BaseModel):
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)

class LineCoordinates(BaseModel):
    points: list[PointCoordinates] = Field(..., min_length=2)

class PolygonCoordinates(BaseModel):
    exterior: list[PointCoordinates] = Field(..., min_length=3)

# --- Disaster Schemas ---
class DisasterEventBase(BaseModel):
    title: str = Field(..., min_length=3, max_length=255)
    disaster_type: DisasterType
    severity: SeverityLevel
    affected_state: str = Field(..., min_length=2, max_length=100)
    location: PointCoordinates
    impact_zone: PolygonCoordinates | None = None
    status: DisasterStatus = DisasterStatus.ACTIVE
    metadata_info: dict | None = Field(default={}, alias="metadata")

    model_config = ConfigDict(populate_by_name=True)

class DisasterEventCreate(DisasterEventBase):
    pass

class DisasterEventUpdate(BaseModel):
    title: str | None = None
    severity: SeverityLevel | None = None
    status: DisasterStatus | None = None
    metadata_info: dict | None = Field(default=None, alias="metadata")

class DisasterEventRead(DisasterEventBase):
    id: uuid.UUID
    reported_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

# --- Road Segment Schemas ---
class RoadSegmentBase(BaseModel):
    highway_code: str = Field(..., min_length=2, max_length=50)
    segment_name: str = Field(..., min_length=3, max_length=255)
    start_district: str = Field(..., min_length=2, max_length=100)
    end_district: str = Field(..., min_length=2, max_length=100)
    geometry: LineCoordinates
    current_status: RoadStatus = RoadStatus.CLEAR
    weight_limit_tons: float | None = Field(None, ge=0.0, le=200.0)
    elevation_m: float | None = Field(None, ge=0.0, le=9000.0)

class RoadSegmentCreate(RoadSegmentBase):
    pass

class RoadSegmentUpdate(BaseModel):
    current_status: RoadStatus | None = None
    weight_limit_tons: float | None = None

class RoadSegmentRead(RoadSegmentBase):
    id: uuid.UUID
    updated_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)

# --- Logistics Hub & Inventory Schemas ---
class InventoryItemBase(BaseModel):
    item_category: str = Field(..., min_length=2, max_length=100)
    item_name: str = Field(..., min_length=2, max_length=255)
    quantity: float = Field(..., ge=0.0)
    unit: str = Field(..., min_length=1, max_length=50)

class InventoryItemCreate(InventoryItemBase):
    hub_id: uuid.UUID

class InventoryItemUpdate(BaseModel):
    quantity: float = Field(..., ge=0.0)

class InventoryItemRead(InventoryItemBase):
    id: uuid.UUID
    hub_id: uuid.UUID
    last_updated: datetime.datetime

    model_config = ConfigDict(from_attributes=True)

class LogisticsHubBase(BaseModel):
    name: str = Field(..., min_length=3, max_length=255)
    hub_type: HubType
    district: str = Field(..., min_length=2, max_length=100)
    state: str = Field(..., min_length=2, max_length=100)
    location: PointCoordinates
    capacity_sqm: float | None = Field(None, ge=0.0)
    contact_person: str | None = None
    status: HubStatus = HubStatus.OPERATIONAL

class LogisticsHubCreate(LogisticsHubBase):
    pass

class LogisticsHubRead(LogisticsHubBase):
    id: uuid.UUID
    inventory_items: list[InventoryItemRead] = []

    model_config = ConfigDict(from_attributes=True)

# --- Dispatch Order Schemas ---
class DispatchOrderCreate(BaseModel):
    origin_hub_id: uuid.UUID
    destination_hub_id: uuid.UUID
    recommended_route_id: str | None = None
    allocated_items: dict[str, float] = Field(..., description="Mapping of item category/name to quantity")
    ai_recommendation_id: uuid.UUID | None = None

class DispatchOrderApproveRequest(BaseModel):
    user_id: uuid.UUID
    user_role: UserRole = UserRole.COMMANDER

class DispatchOrderRejectRequest(BaseModel):
    user_id: uuid.UUID
    user_role: UserRole = UserRole.COMMANDER
    rejection_reason: str = Field(..., min_length=3, max_length=500)

class DispatchOrderUpdate(BaseModel):
    status: DispatchStatus
    approved_by: uuid.UUID | None = None
    rejection_reason: str | None = None

class DispatchOrderRead(BaseModel):
    id: uuid.UUID
    order_code: str
    origin_hub_id: uuid.UUID | None
    destination_hub_id: uuid.UUID | None
    recommended_route_id: str | None
    allocated_items: dict
    ai_recommendation_id: uuid.UUID | None
    status: DispatchStatus
    approved_by: uuid.UUID | None
    approved_at: datetime.datetime | None
    rejection_reason: str | None = None
    created_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)

# --- AI Audit Log Schemas ---
class FieldReportCreate(BaseModel):
    client_generated_id: str = Field(..., min_length=5, max_length=255)
    report_type: str = Field(..., min_length=2, max_length=100)
    severity: SeverityLevel
    description: str = Field(..., min_length=3)
    location: PointCoordinates
    observed_at: datetime.datetime
    reported_by: str = "FIELD_OFFICER"
    version: int = 1

class FieldReportRead(BaseModel):
    id: uuid.UUID
    client_generated_id: str
    report_type: str
    severity: SeverityLevel
    description: str
    location: PointCoordinates
    reported_by: str
    observed_at: datetime.datetime
    created_at: datetime.datetime
    version: int

    model_config = ConfigDict(from_attributes=True)

class SyncResult(BaseModel):
    client_generated_id: str
    status: str # SYNCED, CONFLICT, FAILED
    server_id: uuid.UUID | None = None
    message: str
    conflict_details: dict | None = None
class AIAuditLogCreate(BaseModel):
    agent_name: str = Field(..., min_length=2, max_length=100)
    prompt_summary: str
    recommendation: str
    confidence_score: float = Field(..., ge=0.0, le=1.0)
    evidence_data: dict = Field(default_factory=dict)
    model_used: str
    execution_time_ms: int = Field(..., ge=0)

class AIAuditLogRead(AIAuditLogCreate):
    id: uuid.UUID
    created_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)
