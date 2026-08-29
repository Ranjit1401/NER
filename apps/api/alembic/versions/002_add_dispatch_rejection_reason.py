"""Add rejection_reason to dispatch_orders table

Revision ID: 002_add_dispatch_rejection_reason
Revises: 001_initial_phase3_schema
Create Date: 2026-08-28 20:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '002'
down_revision: Union[str, None] = '001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.add_column('dispatch_orders', sa.Column('rejection_reason', sa.Text(), nullable=True))

def downgrade() -> None:
    op.drop_column('dispatch_orders', 'rejection_reason')
