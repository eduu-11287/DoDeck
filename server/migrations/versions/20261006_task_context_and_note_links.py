"""Add task descriptions, checklists and note-task links.

Revision ID: 20261006_task_context
Revises: 20261005_note_tags
Create Date: 2026-10-06
"""
from alembic import op
import sqlalchemy as sa


revision = '20261006_task_context'
down_revision = '20261005_note_tags'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('task', sa.Column('description', sa.Text(), nullable=True))
    op.add_column(
        'task',
        sa.Column('checklist_data', sa.Text(), nullable=False, server_default='[]')
    )
    with op.batch_alter_table('note') as batch_op:
        batch_op.add_column(sa.Column('task_id', sa.Integer(), nullable=True))
        batch_op.create_foreign_key(
            'fk_note_task_id_task', 'task', ['task_id'], ['id'],
            ondelete='SET NULL'
        )


def downgrade():
    with op.batch_alter_table('note') as batch_op:
        batch_op.drop_constraint('fk_note_task_id_task', type_='foreignkey')
        batch_op.drop_column('task_id')
    op.drop_column('task', 'checklist_data')
    op.drop_column('task', 'description')
