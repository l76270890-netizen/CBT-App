"""Add school boundaries, roles, sessions, and reportable attempts.

Revision ID: 20261027_01
Revises:
Create Date: 2026-10-27
"""
from alembic import op
import sqlalchemy as sa

revision = "20261027_01"
down_revision = "20261026_00"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if not inspector.has_table("schools"):
        op.create_table(
            "schools",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("name", sa.String(length=200), nullable=False),
            sa.Column("created_at", sa.DateTime(), nullable=False),
        )
    if not inspector.has_table("school_classes"):
        op.create_table(
            "school_classes",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("school_id", sa.Integer(), sa.ForeignKey("schools.id", name="fk_school_classes_school_id_schools"), nullable=False),
            sa.Column("name", sa.String(length=120), nullable=False),
            sa.UniqueConstraint("school_id", "name", name="uq_school_class_name"),
        )
    if "ix_school_classes_school_id" not in {index["name"] for index in sa.inspect(bind).get_indexes("school_classes")}:
        op.create_index("ix_school_classes_school_id", "school_classes", ["school_id"])

    with op.batch_alter_table("users") as batch:
        if "profile_image" not in {column["name"] for column in inspector.get_columns("users")}:
            batch.add_column(sa.Column("profile_image", sa.String(length=1000), nullable=True))
        batch.add_column(sa.Column("school_id", sa.Integer(), sa.ForeignKey("schools.id", name="fk_users_school_id_schools"), nullable=True))
        batch.add_column(sa.Column("role", sa.String(length=32), nullable=False, server_default="student"))
        batch.add_column(sa.Column("class_id", sa.Integer(), sa.ForeignKey("school_classes.id", name="fk_users_class_id_school_classes"), nullable=True))
        batch.add_column(sa.Column("account_status", sa.String(length=20), nullable=False, server_default="active"))
        batch.add_column(sa.Column("last_seen_at", sa.DateTime(), nullable=True))
        batch.create_index("ix_users_school_id", ["school_id"])
        batch.create_index("ix_users_role", ["role"])
        batch.create_index("ix_users_class_id", ["class_id"])
        batch.create_index("ix_users_account_status", ["account_status"])
        batch.create_index("ix_users_last_seen_at", ["last_seen_at"])

    with op.batch_alter_table("exams") as batch:
        batch.add_column(sa.Column("school_id", sa.Integer(), sa.ForeignKey("schools.id", name="fk_exams_school_id_schools"), nullable=True))
        batch.create_index("ix_exams_school_id", ["school_id"])
    with op.batch_alter_table(
        "questions",
        naming_convention={"fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s"},
    ) as batch:
        if "image_path" not in {column["name"] for column in inspector.get_columns("questions")}:
            batch.add_column(sa.Column("image_path", sa.String(length=1000), nullable=True))
        batch.add_column(sa.Column("school_id", sa.Integer(), sa.ForeignKey("schools.id", name="fk_questions_school_id_schools"), nullable=True))
        batch.create_index("ix_questions_examId", ["examId"])
        batch.create_index("ix_questions_school_id", ["school_id"])

    op.create_table(
        "exam_subjects",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("exam_id", sa.Integer(), sa.ForeignKey("exams.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.UniqueConstraint("exam_id", "name", name="uq_exam_subject_name"),
    )
    op.create_index("ix_exam_subjects_exam_id", "exam_subjects", ["exam_id"])

    with op.batch_alter_table("results") as batch:
        batch.add_column(sa.Column("school_id", sa.Integer(), sa.ForeignKey("schools.id", name="fk_results_school_id_schools"), nullable=True))
        batch.add_column(sa.Column("exam_id", sa.Integer(), sa.ForeignKey("exams.id", name="fk_results_exam_id_exams"), nullable=True))
        batch.add_column(sa.Column("subject_name", sa.String(length=120), nullable=True))
        batch.add_column(sa.Column("completed_at", sa.DateTime(), nullable=True))
        batch.create_index("ix_results_user_id", ["user_id"])
        batch.create_index("ix_results_school_id", ["school_id"])
        batch.create_index("ix_results_exam_id", ["exam_id"])
        batch.create_index("ix_results_completed_at", ["completed_at"])

    op.create_table(
        "attempts",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("student_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("school_id", sa.Integer(), sa.ForeignKey("schools.id"), nullable=False),
        sa.Column("exam_id", sa.Integer(), sa.ForeignKey("exams.id"), nullable=False),
        sa.Column("subject", sa.String(length=120), nullable=False),
        sa.Column("score", sa.Float(), nullable=False),
        sa.Column("total", sa.Float(), nullable=False),
        sa.Column("completed_at", sa.DateTime(), nullable=False),
    )
    for col in ("student_id", "school_id", "exam_id", "subject", "completed_at"):
        op.create_index(f"ix_attempts_{col}", "attempts", [col])

    op.create_table(
        "auth_tokens",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False, unique=True),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("revoked_at", sa.DateTime(), nullable=True),
    )
    for col in ("user_id", "token_hash", "expires_at"):
        op.create_index(f"ix_auth_tokens_{col}", "auth_tokens", [col])

    # Make existing configured subjects available for validation. Records remain
    # school_id=NULL until the operator explicitly assigns the legacy single-school data.
    for exam_id, subject_csv in bind.execute(sa.text("SELECT id, subject FROM exams")):
        names = dict.fromkeys(part.strip() for part in (subject_csv or "").split(",") if part.strip())
        for name in names:
            bind.execute(sa.text("INSERT INTO exam_subjects (exam_id, name) VALUES (:exam_id, :name)"),
                         {"exam_id": exam_id, "name": name})


def downgrade():
    op.drop_table("auth_tokens")
    op.drop_table("attempts")
    with op.batch_alter_table("results") as batch:
        for index in ("ix_results_completed_at", "ix_results_exam_id", "ix_results_school_id", "ix_results_user_id"):
            batch.drop_index(index)
        for col in ("completed_at", "subject_name", "exam_id", "school_id"):
            batch.drop_column(col)
    op.drop_table("exam_subjects")
    with op.batch_alter_table("questions") as batch:
        batch.drop_index("ix_questions_school_id")
        batch.drop_index("ix_questions_examId")
        batch.drop_column("school_id")
    with op.batch_alter_table("exams") as batch:
        batch.drop_index("ix_exams_school_id")
        batch.drop_column("school_id")
    with op.batch_alter_table("users") as batch:
        for index in ("ix_users_last_seen_at", "ix_users_account_status", "ix_users_class_id", "ix_users_role", "ix_users_school_id"):
            batch.drop_index(index)
        for col in ("last_seen_at", "account_status", "class_id", "role", "school_id"):
            batch.drop_column(col)
    op.drop_table("school_classes")
    op.drop_table("schools")
