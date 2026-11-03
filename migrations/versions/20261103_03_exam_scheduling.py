"""Add scheduled start times to exams.

Revision ID: 20261103_03
Revises: 20261028_02
Create Date: 2026-11-03
"""
from alembic import op
import sqlalchemy as sa


revision = "20261103_03"
down_revision = "20261028_02"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("exams") as batch:
        batch.add_column(sa.Column("scheduled_at", sa.DateTime(), nullable=True))
        batch.create_index("ix_exams_scheduled_at", ["scheduled_at"])


def downgrade():
    with op.batch_alter_table("exams") as batch:
        batch.drop_index("ix_exams_scheduled_at")
        batch.drop_column("scheduled_at")
