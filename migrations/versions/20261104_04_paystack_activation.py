"""Add verified Paystack payments and account subscriptions.

Revision ID: 20261104_04
Revises: 20261103_03
Create Date: 2026-11-04
"""
from alembic import op
import sqlalchemy as sa


revision = "20261104_04"
down_revision = "20261103_03"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("users") as batch:
        batch.add_column(sa.Column("subscription_plan", sa.String(length=16), nullable=True))
        batch.add_column(sa.Column("subscription_expires_at", sa.DateTime(), nullable=True))
        batch.create_index("ix_users_subscription_expires_at", ["subscription_expires_at"])

    op.create_table(
        "paystack_payments",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("reference", sa.String(length=120), nullable=False),
        sa.Column("email", sa.String(length=254), nullable=False),
        sa.Column("plan", sa.String(length=16), nullable=False),
        sa.Column("amount", sa.Integer(), nullable=False),
        sa.Column("currency", sa.String(length=3), nullable=False),
        sa.Column("pin_hash", sa.String(length=255), nullable=True),
        sa.Column("pin_expires_at", sa.DateTime(), nullable=True),
        sa.Column("pin_attempts", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("pin_used_at", sa.DateTime(), nullable=True),
        sa.Column("email_sent_at", sa.DateTime(), nullable=True),
        sa.Column("verified_at", sa.DateTime(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_paystack_payments_reference", "paystack_payments", ["reference"], unique=True)
    op.create_index("ix_paystack_payments_email", "paystack_payments", ["email"])
    op.create_index("ix_paystack_payments_pin_expires_at", "paystack_payments", ["pin_expires_at"])


def downgrade():
    op.drop_table("paystack_payments")
    with op.batch_alter_table("users") as batch:
        batch.drop_index("ix_users_subscription_expires_at")
        batch.drop_column("subscription_expires_at")
        batch.drop_column("subscription_plan")
