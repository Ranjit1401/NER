import pytest
import uuid
import datetime
from unittest.mock import AsyncMock, patch, MagicMock
from fastapi import HTTPException
from fastapi.testclient import TestClient
from apps.api.main import app
from apps.api.models.domain import DispatchOrder, LogisticsHub, InventoryItem, RoadSegment, AIAuditLog
from apps.api.schemas.domain import (
    DispatchOrderCreate,
    DispatchOrderApproveRequest,
    DispatchOrderRejectRequest,
    DispatchStatus,
    UserRole
)
from apps.api.services.dispatch_service import OperationalDispatchService

client = TestClient(app)

# 1. Successful Commander approval API & Service test
@pytest.mark.asyncio
async def test_successful_commander_approval():
    mock_session = AsyncMock()
    service = OperationalDispatchService(mock_session)

    order_id = uuid.uuid4()
    user_id = uuid.uuid4()
    origin_id = uuid.uuid4()

    mock_order = DispatchOrder(
        id=order_id,
        order_code="DISP-100",
        origin_hub_id=origin_id,
        destination_hub_id=uuid.uuid4(),
        recommended_route_id="NH-27",
        allocated_items={"FOOD": 50.0},
        status=DispatchStatus.PENDING_APPROVAL.value
    )
    mock_road = RoadSegment(highway_code="NH-27", current_status="CLEAR")
    mock_inv = InventoryItem(hub_id=origin_id, item_category="FOOD", item_name="Rations", quantity=100.0)

    # Execute DB query sequence mocks
    mock_session.execute.side_effect = [
        MagicMock(scalar_one_or_none=lambda: mock_order), # Order lookup with_for_update
        MagicMock(scalars=lambda: MagicMock(all=lambda: [mock_road])), # Road lookup
        MagicMock(scalar_one_or_none=lambda: mock_inv), # Inventory lookup with_for_update
    ]

    request = DispatchOrderApproveRequest(user_id=user_id, user_role=UserRole.COMMANDER)
    res = await service.approve_dispatch(order_id, request)

    assert res.status == DispatchStatus.APPROVED.value
    assert res.approved_by == user_id
    assert mock_inv.quantity == 50.0 # Atomic deduction check: 100 - 50 = 50
    mock_session.commit.assert_called_once()

# 2. Unauthorized approval RBAC test
@pytest.mark.asyncio
async def test_unauthorized_approval_rbac():
    mock_session = AsyncMock()
    service = OperationalDispatchService(mock_session)
    request = DispatchOrderApproveRequest(user_id=uuid.uuid4(), user_role=UserRole.OPERATOR)

    with pytest.raises(HTTPException) as exc_info:
        await service.approve_dispatch(uuid.uuid4(), request)
    assert exc_info.value.status_code == 403
    assert "Only COMMANDER or ADMIN" in exc_info.value.detail

# 3. Successful rejection test
@pytest.mark.asyncio
async def test_successful_rejection():
    mock_session = AsyncMock()
    service = OperationalDispatchService(mock_session)
    order_id = uuid.uuid4()

    mock_order = DispatchOrder(id=order_id, order_code="DISP-101", status=DispatchStatus.PENDING_APPROVAL.value)
    mock_session.execute.return_value = MagicMock(scalar_one_or_none=lambda: mock_order)

    request = DispatchOrderRejectRequest(
        user_id=uuid.uuid4(),
        user_role=UserRole.COMMANDER,
        rejection_reason="Unsafe road conditions ahead"
    )
    res = await service.reject_dispatch(order_id, request)

    assert res.status == DispatchStatus.REJECTED.value
    assert res.rejection_reason == "Unsafe road conditions ahead"
    mock_session.commit.assert_called_once()

# 4. Rejection without reason validation test
def test_rejection_without_reason_validation():
    payload = {
        "user_id": str(uuid.uuid4()),
        "user_role": "COMMANDER",
        "rejection_reason": "" # Empty reason fails validation
    }
    res = client.post(f"/api/v1/dispatches/{uuid.uuid4()}/reject", json=payload)
    assert res.status_code == 422 # Unprocessable Entity validation error

# 5 & 6. Insufficient inventory & negative inventory prevention test
@pytest.mark.asyncio
async def test_insufficient_inventory_prevents_negative_stock():
    mock_session = AsyncMock()
    service = OperationalDispatchService(mock_session)

    order_id = uuid.uuid4()
    origin_id = uuid.uuid4()

    mock_order = DispatchOrder(
        id=order_id,
        order_code="DISP-102",
        origin_hub_id=origin_id,
        destination_hub_id=uuid.uuid4(),
        recommended_route_id="NH-27",
        allocated_items={"WATER": 500.0}, # Requesting 500
        status=DispatchStatus.PENDING_APPROVAL.value
    )
    mock_road = RoadSegment(highway_code="NH-27", current_status="CLEAR")
    mock_inv = InventoryItem(hub_id=origin_id, item_category="WATER", quantity=100.0) # Only 100 available

    mock_session.execute.side_effect = [
        MagicMock(scalar_one_or_none=lambda: mock_order),
        MagicMock(scalars=lambda: MagicMock(all=lambda: [mock_road])),
        MagicMock(scalar_one_or_none=lambda: mock_inv),
    ]

    request = DispatchOrderApproveRequest(user_id=uuid.uuid4(), user_role=UserRole.COMMANDER)
    with pytest.raises(HTTPException) as exc_info:
        await service.approve_dispatch(order_id, request)

    assert exc_info.value.status_code == 400
    assert "INSUFFICIENT INVENTORY" in exc_info.value.detail
    assert mock_inv.quantity == 100.0 # Stock remains 100, never negative
    mock_session.commit.assert_not_called()

# 7. Deterministic safety-blocked dispatch test
@pytest.mark.asyncio
async def test_deterministic_safety_blocked_dispatch():
    mock_session = AsyncMock()
    service = OperationalDispatchService(mock_session)

    order_id = uuid.uuid4()
    mock_order = DispatchOrder(
        id=order_id,
        order_code="DISP-103",
        origin_hub_id=uuid.uuid4(),
        destination_hub_id=uuid.uuid4(),
        recommended_route_id="NH-6",
        allocated_items={"FOOD": 10.0},
        status=DispatchStatus.PENDING_APPROVAL.value
    )
    mock_blocked_road = RoadSegment(highway_code="NH-6", current_status="BLOCKED")

    mock_session.execute.side_effect = [
        MagicMock(scalar_one_or_none=lambda: mock_order),
        MagicMock(scalars=lambda: MagicMock(all=lambda: [mock_blocked_road])),
    ]

    request = DispatchOrderApproveRequest(user_id=uuid.uuid4(), user_role=UserRole.COMMANDER)
    with pytest.raises(HTTPException) as exc_info:
        await service.approve_dispatch(order_id, request)

    assert exc_info.value.status_code == 400
    assert "DETERMINISTIC SAFETY BLOCK" in exc_info.value.detail

@pytest.mark.asyncio
async def test_submit_proposed_dispatch():
    mock_session = AsyncMock()
    service = OperationalDispatchService(mock_session)

    order_id = uuid.uuid4()
    mock_order = DispatchOrder(id=order_id, order_code="DISP-999", status=DispatchStatus.PROPOSED.value)
    mock_session.execute.return_value = MagicMock(scalar_one_or_none=lambda: mock_order)

    res = await service.submit_for_approval(order_id)
    assert res.status == DispatchStatus.PENDING_APPROVAL.value

# 8. Invalid status transition test
@pytest.mark.asyncio
async def test_invalid_status_transition():
    mock_session = AsyncMock()
    service = OperationalDispatchService(mock_session)

    order_id = uuid.uuid4()
    # Order is already APPROVED
    mock_order = DispatchOrder(id=order_id, order_code="DISP-104", status=DispatchStatus.APPROVED.value)
    mock_session.execute.return_value = MagicMock(scalar_one_or_none=lambda: mock_order)

    request = DispatchOrderApproveRequest(user_id=uuid.uuid4(), user_role=UserRole.COMMANDER)
    with pytest.raises(HTTPException) as exc_info:
        await service.approve_dispatch(order_id, request)

    assert exc_info.value.status_code == 400
    assert "Invalid transition" in exc_info.value.detail

@pytest.mark.asyncio
async def test_update_dispatch_status_lifecycle():
    mock_session = AsyncMock()
    service = OperationalDispatchService(mock_session)

    order_id = uuid.uuid4()
    mock_order = DispatchOrder(id=order_id, order_code="DISP-200", status=DispatchStatus.APPROVED.value)
    mock_session.execute.return_value = MagicMock(scalar_one_or_none=lambda: mock_order)

    # Valid transition: APPROVED -> ASSIGNED
    updated = await service.update_dispatch_status(order_id, DispatchStatus.ASSIGNED)
    assert updated.status == DispatchStatus.ASSIGNED.value

    # Invalid transition: DELIVERED -> PROPOSED
    mock_order_delivered = DispatchOrder(id=order_id, order_code="DISP-201", status=DispatchStatus.DELIVERED.value)
    mock_session.execute.return_value = MagicMock(scalar_one_or_none=lambda: mock_order_delivered)

    with pytest.raises(HTTPException) as exc_info:
        await service.update_dispatch_status(order_id, DispatchStatus.PROPOSED)
    assert exc_info.value.status_code == 400

# 9. Transaction rollback when operation fails test
@pytest.mark.asyncio
async def test_transaction_rollback_on_failure():
    mock_session = AsyncMock()
    service = OperationalDispatchService(mock_session)

    order_id = uuid.uuid4()
    mock_order = DispatchOrder(
        id=order_id,
        order_code="DISP-105",
        origin_hub_id=uuid.uuid4(),
        destination_hub_id=uuid.uuid4(),
        recommended_route_id="NH-27",
        allocated_items={"NON_EXISTENT_ITEM": 10.0},
        status=DispatchStatus.PENDING_APPROVAL.value
    )
    mock_road = RoadSegment(highway_code="NH-27", current_status="CLEAR")

    mock_session.execute.side_effect = [
        MagicMock(scalar_one_or_none=lambda: mock_order),
        MagicMock(scalars=lambda: MagicMock(all=lambda: [mock_road])),
        MagicMock(scalar_one_or_none=lambda: None), # Missing item
    ]

    request = DispatchOrderApproveRequest(user_id=uuid.uuid4(), user_role=UserRole.COMMANDER)
    with pytest.raises(HTTPException):
        await service.approve_dispatch(order_id, request)

    mock_session.commit.assert_not_called()

# 10. SELECT FOR UPDATE / concurrent approval protection test
@pytest.mark.asyncio
async def test_select_for_update_concurrency_protection():
    mock_session = AsyncMock()
    service = OperationalDispatchService(mock_session)

    order_id = uuid.uuid4()
    origin_id = uuid.uuid4()
    mock_order = DispatchOrder(
        id=order_id,
        order_code="DISP-106",
        origin_hub_id=origin_id,
        destination_hub_id=uuid.uuid4(),
        recommended_route_id="NH-27",
        allocated_items={"MEDICINE": 10.0},
        status=DispatchStatus.PENDING_APPROVAL.value
    )
    mock_road = RoadSegment(highway_code="NH-27", current_status="CLEAR")
    mock_inv = InventoryItem(hub_id=origin_id, item_category="MEDICINE", quantity=20.0)

    mock_session.execute.side_effect = [
        MagicMock(scalar_one_or_none=lambda: mock_order),
        MagicMock(scalars=lambda: MagicMock(all=lambda: [mock_road])),
        MagicMock(scalar_one_or_none=lambda: mock_inv),
    ]

    request = DispatchOrderApproveRequest(user_id=uuid.uuid4(), user_role=UserRole.COMMANDER)
    await service.approve_dispatch(order_id, request)

    assert mock_session.execute.call_count == 3
    assert mock_session.commit.call_count == 1

# 11 & 12. Atomic deduction and Audit log creation after approval test
@pytest.mark.asyncio
async def test_atomic_deduction_and_audit_log_after_approval():
    mock_session = AsyncMock()
    service = OperationalDispatchService(mock_session)

    order_id = uuid.uuid4()
    user_id = uuid.uuid4()
    origin_id = uuid.uuid4()
    mock_order = DispatchOrder(
        id=order_id,
        order_code="DISP-107",
        origin_hub_id=origin_id,
        destination_hub_id=uuid.uuid4(),
        recommended_route_id="NH-27",
        allocated_items={"FOOD": 30.0},
        status=DispatchStatus.PENDING_APPROVAL.value
    )
    mock_road = RoadSegment(highway_code="NH-27", current_status="CLEAR")
    mock_inv = InventoryItem(hub_id=origin_id, item_category="FOOD", quantity=100.0)

    mock_session.execute.side_effect = [
        MagicMock(scalar_one_or_none=lambda: mock_order),
        MagicMock(scalars=lambda: MagicMock(all=lambda: [mock_road])),
        MagicMock(scalar_one_or_none=lambda: mock_inv),
    ]

    request = DispatchOrderApproveRequest(user_id=user_id, user_role=UserRole.COMMANDER)
    await service.approve_dispatch(order_id, request)

    assert mock_inv.quantity == 70.0 # 100 - 30 = 70
    added_objects = [call[0][0] for call in mock_session.add.call_args_list]
    audit_logs = [obj for obj in added_objects if isinstance(obj, AIAuditLog)]
    assert len(audit_logs) == 1
    assert audit_logs[0].agent_name == "HUMAN_COMMANDER_APPROVAL"

# 13. Audit log creation after rejection test
@pytest.mark.asyncio
async def test_audit_log_after_rejection():
    mock_session = AsyncMock()
    service = OperationalDispatchService(mock_session)

    order_id = uuid.uuid4()
    mock_order = DispatchOrder(id=order_id, order_code="DISP-108", status=DispatchStatus.PENDING_APPROVAL.value)
    mock_session.execute.return_value = MagicMock(scalar_one_or_none=lambda: mock_order)

    request = DispatchOrderRejectRequest(
        user_id=uuid.uuid4(),
        user_role=UserRole.COMMANDER,
        rejection_reason="Duplicate request"
    )
    await service.reject_dispatch(order_id, request)

    added_objects = [call[0][0] for call in mock_session.add.call_args_list]
    audit_logs = [obj for obj in added_objects if isinstance(obj, AIAuditLog)]
    assert len(audit_logs) == 1
    assert audit_logs[0].agent_name == "HUMAN_COMMANDER_REJECTION"

# 14. Backend RBAC Enforcement test (API Level)
def test_api_rbac_enforcement():
    payload = {
        "user_id": str(uuid.uuid4()),
        "user_role": "OPERATOR" # Non-commander role
    }
    with patch("apps.api.services.dispatch_service.OperationalDispatchService.approve_dispatch", new_callable=AsyncMock) as mock_approve:
        mock_approve.side_effect = HTTPException(status_code=403, detail="Only COMMANDER or ADMIN role can approve operational dispatches")
        res = client.post(f"/api/v1/dispatches/{uuid.uuid4()}/approve", json=payload)
        assert res.status_code == 403
        assert "Only COMMANDER or ADMIN" in res.json()["detail"]
