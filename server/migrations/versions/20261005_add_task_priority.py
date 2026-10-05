"""Add task priority.

Revision ID: 20261005_priority
Revises: 1551bbe550f9
Create Date: 2026-10-05
"""
from alembic import op
import sqlalchemy as sa


revision = '20261005_priority'
down_revision = '1551bbe550f9'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        'task',
        sa.Column('priority', sa.Integer(), nullable=False, server_default='3')
    )


def downgrade():
    op.drop_column('task', 'priority')
