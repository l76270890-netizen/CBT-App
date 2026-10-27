"""Create the original CBT tables for a fresh database.

Revision ID: 20261026_00
Revises:
Create Date: 2026-10-26
"""
from alembic import op
import sqlalchemy as sa

revision = "20261026_00"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("username", sa.String(length=80), nullable=False),
        sa.Column("email", sa.String(length=120), nullable=False, unique=True),
        sa.Column("password", sa.String(length=200), nullable=False),
    )
    op.create_table(
        "exams",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("title", sa.String(length=200), nullable=True),
        sa.Column("examType", sa.String(length=80), nullable=True),
        sa.Column("subject", sa.String(length=500), nullable=True),
        sa.Column("year", sa.Integer(), nullable=True),
        sa.Column("duration", sa.Integer(), nullable=True),
        sa.Column("totalQuestions", sa.Integer(), nullable=True, server_default="0"),
        sa.Column("created_at", sa.DateTime(), nullable=True),
    )
    op.create_table(
        "questions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("examId", sa.Integer(), sa.ForeignKey("exams.id", name="fk_questions_examId_exams"), nullable=True),
        sa.Column("examType", sa.String(length=80), nullable=True),
        sa.Column("subject", sa.String(length=100), nullable=True),
        sa.Column("question", sa.Text(), nullable=True),
        sa.Column("options", sa.JSON(), nullable=True),
        sa.Column("answer", sa.String(length=10), nullable=True),
        sa.Column("explanation", sa.Text(), nullable=True),
        sa.Column("year", sa.Integer(), nullable=True, server_default="2024"),
    )
    op.create_table(
        "results",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("email", sa.String(length=120), nullable=True),
        sa.Column("title", sa.String(length=200), nullable=True, server_default="Practice Test"),
        sa.Column("score", sa.Integer(), nullable=True),
        sa.Column("total", sa.Integer(), nullable=True),
        sa.Column("duration", sa.String(length=20), nullable=True, server_default="0m"),
        sa.Column("status", sa.String(length=20), nullable=True, server_default="Failed"),
        sa.Column("mode", sa.String(length=20), nullable=True, server_default="exam"),
        sa.Column("examType", sa.String(length=80), nullable=True),
        sa.Column("date", sa.DateTime(), nullable=True),
    )


def downgrade():
    op.drop_table("results")
    op.drop_table("questions")
    op.drop_table("exams")
    op.drop_table("users")
