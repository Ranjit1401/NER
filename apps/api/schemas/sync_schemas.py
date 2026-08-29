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
