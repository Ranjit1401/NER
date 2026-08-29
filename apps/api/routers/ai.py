from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from apps.api.core.database import get_db_session
from apps.api.services.ai_service import AIService
from apps.api.services.repositories import AuditLogRepository
from packages.ai_agents import (
    OrchestratedQueryRequest,
    OrchestratedQueryResponse,
    ControlledAgentTools,
    SupervisorAgent
)
from apps.api.schemas.domain import AIAuditLogCreate

router = APIRouter(prefix="/ai", tags=["AI Operations & Multi-Agent Orchestration"])

@router.post("/query", response_model=OrchestratedQueryResponse, status_code=status.HTTP_200_OK)
async def process_orchestrated_query(
    payload: OrchestratedQueryRequest,
    session: AsyncSession = Depends(get_db_session)
) -> OrchestratedQueryResponse:
    ai_service = AIService()
    tools = ControlledAgentTools(session)
    supervisor = SupervisorAgent(ai_service, tools)

    orchestration_result = await supervisor.orchestrate(payload.query)

    # Save Audit Log Record to PostGIS/Postgres DB
    audit_repo = AuditLogRepository(session)
    audit_record = await audit_repo.log_decision(AIAuditLogCreate(
        agent_name="SupervisorAgent",
        prompt_summary=payload.query[:500],
        recommendation=orchestration_result["final_summary"][:1000],
        confidence_score=0.92,
        evidence_data={
            "plan": orchestration_result["plan"],
            "agent_count": len(orchestration_result["agent_results"]),
            "warnings_count": len(orchestration_result["warnings"])
        },
        model_used="fast-reasoner",
        execution_time_ms=orchestration_result["total_execution_time_ms"]
    ))

    return OrchestratedQueryResponse(
        query=orchestration_result["query"],
        execution_plan=orchestration_result["plan"],
        agent_results=orchestration_result["agent_results"],
        final_summary=orchestration_result["final_summary"],
        recommendations=orchestration_result["recommendations"],
        evidence=orchestration_result["evidence"],
        warnings=orchestration_result["warnings"],
        total_execution_time_ms=orchestration_result["total_execution_time_ms"],
        audit_log_id=str(audit_record.id)
    )
