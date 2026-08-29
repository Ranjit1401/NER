import uuid
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from apps.api.core.database import get_db_session
from apps.api.schemas.domain import (
    DispatchOrderCreate, DispatchOrderRead, DispatchOrderUpdate,
    DispatchOrderApproveRequest, DispatchOrderRejectRequest,
    AIAuditLogCreate, AIAuditLogRead, DispatchStatus
)
from apps.api.services.repositories import DispatchRepository, AuditLogRepository
from apps.api.services.dispatch_service import OperationalDispatchService

router = APIRouter(tags=["Dispatches & Audit Logs"])

# --- Dispatch Orders Router ---
dispatch_router = APIRouter(prefix="/dispatches", tags=["Dispatch Orders"])

@dispatch_router.post("/propose", response_model=DispatchOrderRead, status_code=status.HTTP_201_CREATED)
async def propose_dispatch_order(
    payload: DispatchOrderCreate,
    session: AsyncSession = Depends(get_db_session)
) -> DispatchOrderRead:
    service = OperationalDispatchService(session)
    order = await service.propose_dispatch(payload)
    return DispatchOrderRead.model_validate(order)

@dispatch_router.post("/{order_id}/submit", response_model=DispatchOrderRead)
async def submit_dispatch_order(
    order_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session)
) -> DispatchOrderRead:
    service = OperationalDispatchService(session)
    order = await service.submit_for_approval(order_id)
    return DispatchOrderRead.model_validate(order)

@dispatch_router.post("/{order_id}/approve", response_model=DispatchOrderRead)
async def approve_dispatch_order(
    order_id: uuid.UUID,
    payload: DispatchOrderApproveRequest,
    session: AsyncSession = Depends(get_db_session)
) -> DispatchOrderRead:
    service = OperationalDispatchService(session)
    order = await service.approve_dispatch(order_id, payload)
    return DispatchOrderRead.model_validate(order)

@dispatch_router.post("/{order_id}/reject", response_model=DispatchOrderRead)
async def reject_dispatch_order(
    order_id: uuid.UUID,
    payload: DispatchOrderRejectRequest,
    session: AsyncSession = Depends(get_db_session)
) -> DispatchOrderRead:
    service = OperationalDispatchService(session)
    order = await service.reject_dispatch(order_id, payload)
    return DispatchOrderRead.model_validate(order)

@dispatch_router.post("/{order_id}/status", response_model=DispatchOrderRead)
async def update_dispatch_status(
    order_id: uuid.UUID,
    new_status: DispatchStatus = Query(..., alias="status"),
    session: AsyncSession = Depends(get_db_session)
) -> DispatchOrderRead:
    service = OperationalDispatchService(session)
    order = await service.update_dispatch_status(order_id, new_status)
    return DispatchOrderRead.model_validate(order)

@dispatch_router.get("/", response_model=list[DispatchOrderRead])
async def list_dispatch_orders(
    status_filter: str | None = Query(None, alias="status"),
    session: AsyncSession = Depends(get_db_session)
) -> list[DispatchOrderRead]:
    repo = DispatchRepository(session)
    orders = await repo.list_orders(status=status_filter)
    return [DispatchOrderRead.model_validate(o) for o in orders]

@dispatch_router.get("/{order_id}", response_model=DispatchOrderRead)
async def get_dispatch_order(
    order_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session)
) -> DispatchOrderRead:
    repo = DispatchRepository(session)
    order = await repo.get_by_id(order_id)
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dispatch order not found")
    return DispatchOrderRead.model_validate(order)

# --- AI Audit Logs Router ---
audit_router = APIRouter(prefix="/audit-logs", tags=["AI Audit Logs"])

@audit_router.post("/", response_model=AIAuditLogRead, status_code=status.HTTP_201_CREATED)
async def record_audit_log(
    payload: AIAuditLogCreate,
    session: AsyncSession = Depends(get_db_session)
) -> AIAuditLogRead:
    repo = AuditLogRepository(session)
    audit = await repo.log_decision(payload)
    return AIAuditLogRead.model_validate(audit)

@audit_router.get("/", response_model=list[AIAuditLogRead])
async def list_audit_logs(
    agent_name: str | None = Query(None),
    limit: int = Query(50, ge=1, le=200),
    session: AsyncSession = Depends(get_db_session)
) -> list[AIAuditLogRead]:
    repo = AuditLogRepository(session)
    logs = await repo.list_logs(agent_name=agent_name, limit=limit)
    return [AIAuditLogRead.model_validate(l) for l in logs]
