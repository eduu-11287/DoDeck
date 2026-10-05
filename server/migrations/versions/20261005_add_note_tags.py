"""Add tags to notes.

Revision ID: 20261005_note_tags
Revises: 20261005_priority
Create Date: 2026-10-05
"""
from alembic import op
import sqlalchemy as sa


revision = '20261005_note_tags'
down_revision = '20261005_priority'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('note', sa.Column('tags', sa.String(length=500), nullable=True))


def downgrade():
    op.drop_column('note', 'tags')
