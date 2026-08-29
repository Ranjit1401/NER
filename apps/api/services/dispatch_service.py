import uuid
import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from fastapi import HTTPException, status
from apps.api.models.domain import (
    DispatchOrder,
    LogisticsHub,
    InventoryItem,
    RoadSegment,
    DisasterEvent,
    AIAuditLog
)
from apps.api.schemas.domain import (
    DispatchStatus,
    UserRole,
    DispatchOrderCreate,
    DispatchOrderApproveRequest,
    DispatchOrderRejectRequest
)

# Valid state machine transitions
ALLOWED_TRANSITIONS = {
    DispatchStatus.PROPOSED: [DispatchStatus.PENDING_APPROVAL, DispatchStatus.CANCELLED],
    DispatchStatus.PENDING_APPROVAL: [DispatchStatus.APPROVED, DispatchStatus.REJECTED, DispatchStatus.CANCELLED],
    DispatchStatus.APPROVED: [DispatchStatus.DISPATCHED, DispatchStatus.FAILED],
    DispatchStatus.DISPATCHED: [DispatchStatus.DELIVERED, DispatchStatus.FAILED],
    DispatchStatus.DELIVERED: [],
    DispatchStatus.REJECTED: [],
    DispatchStatus.CANCELLED: [],
    DispatchStatus.FAILED: []
}

class OperationalDispatchService:
    """Transactional service enforcing RBAC, state machine, safety checks, and atomic inventory deduction."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def propose_dispatch(self, data: DispatchOrderCreate) -> DispatchOrder:
        # Validate origin & destination hubs exist
        origin_res = await self.session.execute(select(LogisticsHub).where(LogisticsHub.id == data.origin_hub_id))
        origin = origin_res.scalar_one_or_none()
        if not origin:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Origin logistics hub not found")

        dest_res = await self.session.execute(select(LogisticsHub).where(LogisticsHub.id == data.destination_hub_id))
        dest = dest_res.scalar_one_or_none()
        if not dest:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Destination logistics hub not found")

        if origin.status != "OPERATIONAL":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Origin hub status is {origin.status}, cannot propose dispatch")

        order_code = f"DISP-{uuid.uuid4().hex[:8].upper()}"
        order = DispatchOrder(
            order_code=order_code,
            origin_hub_id=data.origin_hub_id,
            destination_hub_id=data.destination_hub_id,
            recommended_route_id=data.recommended_route_id,
            allocated_items=data.allocated_items,
            ai_recommendation_id=data.ai_recommendation_id,
            status=DispatchStatus.PENDING_APPROVAL.value # Propose moves directly to PENDING_APPROVAL
        )
        self.session.add(order)
        await self.session.commit()
        await self.session.refresh(order)
        return order

    async def approve_dispatch(self, order_id: uuid.UUID, request: DispatchOrderApproveRequest) -> DispatchOrder:
        """Atomically validate safety, lock inventory rows, deduct stock, and approve dispatch in a single DB transaction."""
        
        # 1. RBAC Check
        if request.user_role not in [UserRole.COMMANDER, UserRole.ADMIN]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only COMMANDER or ADMIN role can approve operational dispatches"
            )

        # 2. Lock & Fetch Dispatch Order
        order_stmt = select(DispatchOrder).where(DispatchOrder.id == order_id).with_for_update()
        order_res = await self.session.execute(order_stmt)
        order = order_res.scalar_one_or_none()

        if not order:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dispatch order not found")

        current_status = DispatchStatus(order.status)
        if current_status not in [DispatchStatus.PENDING_APPROVAL, DispatchStatus.PROPOSED]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid transition: Cannot approve dispatch in status '{current_status}'. Must be 'PENDING_APPROVAL' or 'PROPOSED'."
            )

        # 3. Deterministic Safety Rule Validation (Check if recommended route is hard-blocked)
        if order.recommended_route_id:
            road_res = await self.session.execute(
                select(RoadSegment).where(RoadSegment.highway_code == order.recommended_route_id)
            )
            roads = road_res.scalars().all()
            for r in roads:
                if r.current_status in ["BLOCKED", "IMPASSABLE"]:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"DETERMINISTIC SAFETY BLOCK: Recommended route '{order.recommended_route_id}' is {r.current_status}. Approval denied."
                    )

        # 4. Lock & Deduct Inventory (SELECT FOR UPDATE)
        allocated_items: dict[str, float] = order.allocated_items
        for item_key, req_qty in allocated_items.items():
            if req_qty <= 0:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid requested quantity for {item_key}: {req_qty}")

            inv_stmt = (
                select(InventoryItem)
                .where(
                    InventoryItem.hub_id == order.origin_hub_id,
                    (InventoryItem.item_category == item_key) | (InventoryItem.item_name == item_key)
                )
                .with_for_update()
            )
            inv_res = await self.session.execute(inv_stmt)
            inv_item = inv_res.scalar_one_or_none()

            if not inv_item:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Inventory item '{item_key}' not found at origin hub"
                )

            current_qty = float(inv_item.quantity)
            if current_qty < req_qty:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"INSUFFICIENT INVENTORY: Item '{item_key}' has {current_qty} available, but {req_qty} requested."
                )

            # Deduct inventory quantity
            inv_item.quantity = current_qty - req_qty
            inv_item.last_updated = datetime.datetime.now(datetime.timezone.utc)

        # 5. Update Dispatch Order Status to APPROVED
        order.status = DispatchStatus.APPROVED.value
        order.approved_by = request.user_id
        order.approved_at = datetime.datetime.now(datetime.timezone.utc)

        # 6. Audit Logging
        audit_log = AIAuditLog(
            agent_name="HUMAN_COMMANDER_APPROVAL",
            prompt_summary=f"Commander {request.user_id} approved dispatch {order.order_code}",
            recommendation=f"Approved dispatch {order.order_code} from hub {order.origin_hub_id} to {order.destination_hub_id}",
            confidence_score=1.000,
            evidence_data={
                "dispatch_id": str(order.id),
                "approved_by_user_id": str(request.user_id),
                "allocated_items": allocated_items,
                "previous_status": "PENDING_APPROVAL",
                "new_status": "APPROVED"
            },
            model_used="HUMAN_SIGN_OFF",
            execution_time_ms=0
        )
        self.session.add(audit_log)

        # Commit Transaction
        await self.session.commit()
        await self.session.refresh(order)
        return order

    async def update_dispatch_status(self, order_id: uuid.UUID, new_status: DispatchStatus) -> DispatchOrder:
        """Update dispatch status through valid state machine transitions."""
        order_stmt = select(DispatchOrder).where(DispatchOrder.id == order_id).with_for_update()
        order_res = await self.session.execute(order_stmt)
        order = order_res.scalar_one_or_none()

        if not order:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dispatch order not found")

        current = DispatchStatus(order.status)
        
        # Valid state transitions
        valid_transitions = {
            DispatchStatus.PROPOSED: [DispatchStatus.PENDING_APPROVAL, DispatchStatus.CANCELLED],
            DispatchStatus.PENDING_APPROVAL: [DispatchStatus.APPROVED, DispatchStatus.REJECTED, DispatchStatus.CANCELLED],
            DispatchStatus.APPROVED: [DispatchStatus.ASSIGNED, DispatchStatus.ACCEPTED, DispatchStatus.EN_ROUTE, DispatchStatus.CANCELLED],
            DispatchStatus.ASSIGNED: [DispatchStatus.ACCEPTED, DispatchStatus.REJECTED, DispatchStatus.CANCELLED],
            DispatchStatus.ACCEPTED: [DispatchStatus.EN_ROUTE, DispatchStatus.CANCELLED],
            DispatchStatus.EN_ROUTE: [DispatchStatus.DELIVERED, DispatchStatus.FAILED],
            DispatchStatus.DISPATCHED: [DispatchStatus.DELIVERED, DispatchStatus.FAILED],
        }

        allowed = valid_transitions.get(current, [])
        if new_status not in allowed:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid transition from '{current}' to '{new_status}'. Allowed: {[s.value for s in allowed]}"
            )

        order.status = new_status.value
        await self.session.commit()
        await self.session.refresh(order)
        return order

    async def reject_dispatch(self, order_id: uuid.UUID, request: DispatchOrderRejectRequest) -> DispatchOrder:
        """Reject dispatch proposal and record rejection reason in audit log."""
        if request.user_role not in [UserRole.COMMANDER, UserRole.ADMIN]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only COMMANDER or ADMIN role can reject operational dispatches"
            )

        order_stmt = select(DispatchOrder).where(DispatchOrder.id == order_id).with_for_update()
        order_res = await self.session.execute(order_stmt)
        order = order_res.scalar_one_or_none()

        if not order:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dispatch order not found")

        current_status = DispatchStatus(order.status)
        if current_status not in [DispatchStatus.PENDING_APPROVAL, DispatchStatus.PROPOSED]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid transition: Cannot reject dispatch in status '{current_status}'. Must be 'PENDING_APPROVAL' or 'PROPOSED'."
            )

        order.status = DispatchStatus.REJECTED.value
        order.rejection_reason = request.rejection_reason

        audit_log = AIAuditLog(
            agent_name="HUMAN_COMMANDER_REJECTION",
            prompt_summary=f"Commander {request.user_id} rejected dispatch {order.order_code}",
            recommendation=f"Rejected dispatch {order.order_code}. Reason: {request.rejection_reason}",
            confidence_score=1.000,
            evidence_data={
                "dispatch_id": str(order.id),
                "rejected_by_user_id": str(request.user_id),
                "rejection_reason": request.rejection_reason,
                "previous_status": "PENDING_APPROVAL",
                "new_status": "REJECTED"
            },
            model_used="HUMAN_SIGN_OFF",
            execution_time_ms=0
        )
        self.session.add(audit_log)

        await self.session.commit()
        await self.session.refresh(order)
        return order

    async def submit_for_approval(self, order_id: uuid.UUID) -> DispatchOrder:
        """Submit a PROPOSED dispatch order for Commander review, moving status to PENDING_APPROVAL."""
        order_stmt = select(DispatchOrder).where(DispatchOrder.id == order_id).with_for_update()
        order_res = await self.session.execute(order_stmt)
        order = order_res.scalar_one_or_none()

        if not order:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dispatch order not found")

        current_status = DispatchStatus(order.status)
        if current_status != DispatchStatus.PROPOSED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot submit dispatch in status '{current_status}'. Only 'PROPOSED' dispatches can be submitted for approval."
            )

        order.status = DispatchStatus.PENDING_APPROVAL.value
        await self.session.commit()
        await self.session.refresh(order)
        return order
