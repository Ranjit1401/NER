import uuid
import datetime
from pydantic import BaseModel, ConfigDict, Field
from apps.api.schemas.domain import SeverityLevel, PointCoordinates

# --- Field Report & Offline Sync Schemas ---
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

class DriverEventCreate(BaseModel):
    client_generated_id: str = Field(..., min_length=5, max_length=255)
    event_type: str = Field(..., min_length=2, max_length=100)
    dispatch_id: str = "DISP-1001"
    driver_id: str = "NER-DRIVER-01"
    truck_id: str = "TRK-NE-042"
    trip_status: str | None = None
    problem_type: str | None = None
    severity: SeverityLevel = SeverityLevel.MEDIUM
    latitude: float
    longitude: float
    speed_kmh: float = 45.0
    heading: float = 90.0
    description: str = ""
    created_at: datetime.datetime
    version: int = 1

class DriverTelemetryRead(BaseModel):
    driver_id: str
    truck_id: str
    dispatch_id: str
    latitude: float
    longitude: float
    speed_kmh: float
    heading: float
    trip_status: str
    severity: str
    recorded_at: datetime.datetime
    connection_status: str = "ONLINE"
