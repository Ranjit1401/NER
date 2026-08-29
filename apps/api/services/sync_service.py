import uuid
import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from geoalchemy2.functions import ST_GeomFromText
from apps.api.models.domain import FieldReport, AIAuditLog
from apps.api.schemas.sync_schemas import FieldReportCreate, DriverEventCreate, DriverTelemetryRead, SyncResult

# In-memory latest telemetry cache by driver/truck
LATEST_DRIVER_TELEMETRY: dict[str, DriverTelemetryRead] = {}
from apps.api.services.gis_utils import point_to_wkt, geometry_to_point_coords

class OfflineSyncService:
    """Service providing idempotent mutation ingestion and version conflict resolution."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def sync_field_report(self, data: FieldReportCreate) -> SyncResult:
        # 1. Idempotency Check (Check if client_generated_id already exists)
        stmt = select(FieldReport).where(FieldReport.client_generated_id == data.client_generated_id)
        res = await self.session.execute(stmt)
        existing = res.scalar_one_or_none()

        if existing:
            # Check version conflict
            if data.version < existing.version:
                return SyncResult(
                    client_generated_id=data.client_generated_id,
                    status="CONFLICT",
                    server_id=existing.id,
                    message="Conflict: Server has a newer version of this report.",
                    conflict_details={
                        "client_version": data.version,
                        "server_version": existing.version,
                        "server_description": existing.description
                    }
                )

            # Idempotent return if already synced
            return SyncResult(
                client_generated_id=data.client_generated_id,
                status="SYNCED",
                server_id=existing.id,
                message="Report already synchronized (Idempotent replay)."
            )

        # 2. Ingest New Field Report
        loc_wkt = point_to_wkt(data.location)
        report = FieldReport(
            client_generated_id=data.client_generated_id,
            report_type=data.report_type,
            severity=data.severity.value,
            description=data.description,
            location=ST_GeomFromText(loc_wkt, 4326),
            reported_by=data.reported_by,
            observed_at=data.observed_at,
            version=data.version,
            sync_metadata={"source": "OFFLINE_MUTATION_QUEUE"}
        )
        self.session.add(report)

        # 3. Log Sync Audit Event
        audit = AIAuditLog(
            agent_name="OFFLINE_SYNC_ENGINE",
            prompt_summary=f"Ingested offline field report: {data.client_generated_id}",
            recommendation=f"Field report '{data.report_type}' synced successfully.",
            confidence_score=1.000,
            evidence_data={
                "client_generated_id": data.client_generated_id,
                "report_type": data.report_type,
                "severity": data.severity.value,
                "reported_by": data.reported_by
            },
            model_used="OFFLINE_SYNC_SERVICE",
            execution_time_ms=0
        )
        self.session.add(audit)

        await self.session.commit()
        await self.session.refresh(report)

        return SyncResult(
            client_generated_id=data.client_generated_id,
            status="SYNCED",
            server_id=report.id,
            message="Field report synchronized successfully."
        )

    async def sync_driver_event(self, data: DriverEventCreate) -> SyncResult:
        """Process driver trip status updates, road hazard reports, and SOS emergencies idempotently."""
        # Update latest telemetry cache
        telemetry = DriverTelemetryRead(
            driver_id=data.driver_id,
            truck_id=data.truck_id,
            dispatch_id=data.dispatch_id,
            latitude=data.latitude,
            longitude=data.longitude,
            speed_kmh=data.speed_kmh,
            heading=data.heading,
            trip_status=data.trip_status or "EN_ROUTE",
            severity=data.severity.value if hasattr(data.severity, "value") else str(data.severity),
            recorded_at=data.created_at,
            connection_status="ONLINE"
        )
        LATEST_DRIVER_TELEMETRY[data.truck_id] = telemetry

        audit = AIAuditLog(
            agent_name="TRUCK_DRIVER_TELEMETRY" if data.event_type != "EMERGENCY_SOS" else "CRITICAL_DRIVER_SOS",
            prompt_summary=f"Ingested driver event [{data.event_type}]: {data.dispatch_id}",
            recommendation=f"Driver event '{data.event_type}' processed for convoy {data.dispatch_id}. Location: ({data.latitude:.4f}, {data.longitude:.4f})",
            confidence_score=1.000,
            evidence_data={
                "client_generated_id": data.client_generated_id,
                "dispatch_id": data.dispatch_id,
                "driver_id": data.driver_id,
                "truck_id": data.truck_id,
                "event_type": data.event_type,
                "trip_status": data.trip_status,
                "problem_type": data.problem_type,
                "latitude": data.latitude,
                "longitude": data.longitude,
                "speed_kmh": data.speed_kmh,
                "description": data.description,
            },
            model_used="DRIVER_TELEMETRY_ENGINE",
            execution_time_ms=0
        )
        self.session.add(audit)
        await self.session.commit()

        return SyncResult(
            client_generated_id=data.client_generated_id,
            status="SYNCED",
            message=f"Driver event '{data.event_type}' synchronized successfully."
        )

    async def list_reports(self) -> list[FieldReport]:
        stmt = select(FieldReport).order_by(FieldReport.created_at.desc())
        res = await self.session.execute(stmt)
        return list(res.scalars().all())
