"""Add field_reports table for offline synchronization

Revision ID: 003_add_field_reports
Revises: 002_add_dispatch_rejection_reason
Create Date: 2026-08-28 21:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import geoalchemy2

revision: str = '003'
down_revision: Union[str, None] = '002'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.create_table(
        'field_reports',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('client_generated_id', sa.String(255), nullable=False, unique=True),
        sa.Column('report_type', sa.String(100), nullable=False),
        sa.Column('severity', sa.String(50), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('location', geoalchemy2.types.Geometry(geometry_type='POINT', srid=4326), nullable=False),
        sa.Column('reported_by', sa.String(255), nullable=False),
        sa.Column('observed_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()')),
        sa.Column('version', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('sync_metadata', postgresql.JSONB(), server_default='{}')
    )
    op.create_index('ix_field_reports_client_id', 'field_reports', ['client_generated_id'])

def downgrade() -> None:
    op.drop_table('field_reports')
