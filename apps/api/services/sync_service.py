import uuid
import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from geoalchemy2.functions import ST_GeomFromText
from apps.api.models.domain import FieldReport, AIAuditLog
from apps.api.schemas.sync_schemas import FieldReportCreate, SyncResult
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

    async def list_reports(self) -> list[FieldReport]:
        stmt = select(FieldReport).order_by(FieldReport.created_at.desc())
        res = await self.session.execute(stmt)
        return list(res.scalars().all())
