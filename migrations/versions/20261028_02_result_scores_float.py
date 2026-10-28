"""Allow decimal scores in student history records.

Revision ID: 20261028_02
Revises: 20261027_01
Create Date: 2026-10-28
"""
from alembic import op
import sqlalchemy as sa


revision = "20261028_02"
down_revision = "20261027_01"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("results") as batch:
        batch.alter_column("score", existing_type=sa.Integer(), type_=sa.Float())
        batch.alter_column("total", existing_type=sa.Integer(), type_=sa.Float())


def downgrade():
    with op.batch_alter_table("results") as batch:
        batch.alter_column("score", existing_type=sa.Float(), type_=sa.Integer())
        batch.alter_column("total", existing_type=sa.Float(), type_=sa.Integer())
