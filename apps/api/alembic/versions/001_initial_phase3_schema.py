"""Initial Phase 3 PostGIS Schema

Revision ID: 001_initial_phase3_schema
Revises: 
Create Date: 2026-08-28 19:30:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import geoalchemy2

revision: str = '001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # Ensure PostGIS extension exists
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis;")

    # Table: users
    op.create_table(
        'users',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('email', sa.String(255), nullable=False, unique=True),
        sa.Column('hashed_password', sa.String(255), nullable=False),
        sa.Column('full_name', sa.String(255), nullable=False),
        sa.Column('role', sa.String(50), nullable=False, server_default='OPERATOR'),
        sa.Column('organization', sa.String(255), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()'))
    )
    op.create_index('ix_users_email', 'users', ['email'])

    # Table: disaster_events
    op.create_table(
        'disaster_events',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('disaster_type', sa.String(50), nullable=False),
        sa.Column('severity', sa.String(50), nullable=False),
        sa.Column('affected_state', sa.String(100), nullable=False),
        sa.Column('location', geoalchemy2.types.Geometry(geometry_type='POINT', srid=4326), nullable=False),
        sa.Column('impact_zone', geoalchemy2.types.Geometry(geometry_type='POLYGON', srid=4326), nullable=True),
        sa.Column('status', sa.String(50), nullable=False, server_default='ACTIVE'),
        sa.Column('reported_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()')),
        sa.Column('metadata', postgresql.JSONB(), server_default='{}')
    )
    op.create_index('ix_disaster_events_state', 'disaster_events', ['affected_state'])
    op.create_index('ix_disaster_events_status', 'disaster_events', ['status'])

    # Table: road_segments
    op.create_table(
        'road_segments',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('highway_code', sa.String(50), nullable=False),
        sa.Column('segment_name', sa.String(255), nullable=False),
        sa.Column('start_district', sa.String(100), nullable=False),
        sa.Column('end_district', sa.String(100), nullable=False),
        sa.Column('geometry', geoalchemy2.types.Geometry(geometry_type='LINESTRING', srid=4326), nullable=False),
        sa.Column('current_status', sa.String(50), nullable=False, server_default='CLEAR'),
        sa.Column('weight_limit_tons', sa.Numeric(5, 2), nullable=True),
        sa.Column('elevation_m', sa.Numeric(6, 2), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()'))
    )
    op.create_index('ix_road_segments_code', 'road_segments', ['highway_code'])
    op.create_index('ix_road_segments_status', 'road_segments', ['current_status'])

    # Table: logistics_hubs
    op.create_table(
        'logistics_hubs',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('hub_type', sa.String(50), nullable=False),
        sa.Column('district', sa.String(100), nullable=False),
        sa.Column('state', sa.String(100), nullable=False),
        sa.Column('location', geoalchemy2.types.Geometry(geometry_type='POINT', srid=4326), nullable=False),
        sa.Column('capacity_sqm', sa.Numeric(10, 2), nullable=True),
        sa.Column('contact_person', sa.String(255), nullable=True),
        sa.Column('status', sa.String(50), nullable=False, server_default='OPERATIONAL')
    )
    op.create_index('ix_logistics_hubs_state', 'logistics_hubs', ['state'])

    # Table: inventory_items
    op.create_table(
        'inventory_items',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('hub_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('logistics_hubs.id', ondelete='CASCADE'), nullable=False),
        sa.Column('item_category', sa.String(100), nullable=False),
        sa.Column('item_name', sa.String(255), nullable=False),
        sa.Column('quantity', sa.Numeric(12, 2), nullable=False),
        sa.Column('unit', sa.String(50), nullable=False),
        sa.Column('last_updated', sa.DateTime(timezone=True), server_default=sa.text('NOW()'))
    )
    op.create_index('ix_inventory_items_hub_id', 'inventory_items', ['hub_id'])

    # Table: dispatch_orders
    op.create_table(
        'dispatch_orders',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('order_code', sa.String(100), nullable=False, unique=True),
        sa.Column('origin_hub_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('logistics_hubs.id'), nullable=True),
        sa.Column('destination_hub_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('logistics_hubs.id'), nullable=True),
        sa.Column('recommended_route_id', sa.String(255), nullable=True),
        sa.Column('allocated_items', postgresql.JSONB(), nullable=False),
        sa.Column('ai_recommendation_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('status', sa.String(50), nullable=False, server_default='PROPOSED'),
        sa.Column('approved_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('approved_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()'))
    )
    op.create_index('ix_dispatch_orders_code', 'dispatch_orders', ['order_code'])
    op.create_index('ix_dispatch_orders_status', 'dispatch_orders', ['status'])

    # Table: ai_audit_logs
    op.create_table(
        'ai_audit_logs',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('agent_name', sa.String(100), nullable=False),
        sa.Column('prompt_summary', sa.Text(), nullable=False),
        sa.Column('recommendation', sa.Text(), nullable=False),
        sa.Column('confidence_score', sa.Numeric(4, 3), nullable=False),
        sa.Column('evidence_data', postgresql.JSONB(), nullable=False),
        sa.Column('model_used', sa.String(100), nullable=False),
        sa.Column('execution_time_ms', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()'))
    )
    op.create_index('ix_ai_audit_logs_agent', 'ai_audit_logs', ['agent_name'])
    op.create_index('ix_ai_audit_logs_created_at', 'ai_audit_logs', ['created_at'])

def downgrade() -> None:
    op.drop_table('ai_audit_logs')
    op.drop_table('dispatch_orders')
    op.drop_table('inventory_items')
    op.drop_table('logistics_hubs')
    op.drop_table('road_segments')
    op.drop_table('disaster_events')
    op.drop_table('users')
