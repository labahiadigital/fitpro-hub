"""Pausa de suscripción + tracking de emails Brevo + plantillas de campaña.

Revision ID: 052
Revises: 051
Create Date: 2026-05-05

Cambios principales:

1. ``subscriptions``: añade ``paused_at`` y ``paused_until`` para soportar
   pausa temporal (Stripe ``pause_collection``). El estado ``paused`` ya
   existe en el enum ``subscription_status`` desde 001.
2. ``email_events``: nueva tabla que registra cada evento de email
   (request, delivered, opened, clicked, bounced, spam, unsubscribed).
   El backend la alimenta desde el webhook de Brevo y desde el envío
   transaccional, lo que permite ordenar la pestaña "Seguimiento" por
   ``last_email_sent_at`` y mostrar si el cliente ha leído o no su
   correo.
3. ``email_campaign_templates``: plantillas de campaña con descuento
   por segmento (carrito abandonado, inactivo). Cada plantilla puede
   llevar un código de descuento, importe fijo o porcentaje.
4. ``client_invitations``: ``last_email_sent_at``, ``last_email_subject``
   y ``brevo_message_id`` para mostrar el estado del último email
   enviado por la pestaña "Seguimiento".
5. ``client_invitations.marketing_consent``: si el invitado aceptó
   comunicaciones comerciales (booleano nullable, NULL = no respondió).
"""
from alembic import op
import sqlalchemy as sa


revision = "052"
down_revision = "051"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ---- 1) Subscription pause -----------------------------------------
    op.add_column(
        "subscriptions",
        sa.Column("paused_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "subscriptions",
        sa.Column("paused_until", sa.DateTime(timezone=True), nullable=True),
    )

    # ---- 2) Email events table -----------------------------------------
    op.create_table(
        "email_events",
        sa.Column(
            "id",
            sa.dialects.postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "workspace_id",
            sa.dialects.postgresql.UUID(as_uuid=True),
            sa.ForeignKey("workspaces.id", ondelete="CASCADE"),
            nullable=True,
            index=True,
        ),
        sa.Column("brevo_message_id", sa.String(255), nullable=True, index=True),
        sa.Column("recipient_email", sa.String(255), nullable=False, index=True),
        sa.Column(
            "user_id",
            sa.dialects.postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
            index=True,
        ),
        sa.Column(
            "client_id",
            sa.dialects.postgresql.UUID(as_uuid=True),
            sa.ForeignKey("clients.id", ondelete="SET NULL"),
            nullable=True,
            index=True,
        ),
        sa.Column(
            "invitation_id",
            sa.dialects.postgresql.UUID(as_uuid=True),
            sa.ForeignKey("client_invitations.id", ondelete="SET NULL"),
            nullable=True,
            index=True,
        ),
        sa.Column("event_type", sa.String(40), nullable=False, index=True),
        sa.Column("subject", sa.String(500), nullable=True),
        sa.Column("template_kind", sa.String(80), nullable=True),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "payload",
            sa.dialects.postgresql.JSONB,
            nullable=False,
            server_default="{}",
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
    )
    op.create_index(
        "ix_email_events_recipient_occurred",
        "email_events",
        ["recipient_email", "occurred_at"],
    )

    # ---- 3) Email campaign templates -----------------------------------
    op.create_table(
        "email_campaign_templates",
        sa.Column(
            "id",
            sa.dialects.postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "workspace_id",
            sa.dialects.postgresql.UUID(as_uuid=True),
            sa.ForeignKey("workspaces.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "created_by",
            sa.dialects.postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("name", sa.String(150), nullable=False),
        sa.Column("subject", sa.String(255), nullable=False),
        sa.Column("body_html", sa.Text, nullable=False),
        # Segmento al que está dirigida la plantilla:
        # abandoned_cart | inactive | reminder | custom
        sa.Column(
            "target_segment",
            sa.String(40),
            nullable=False,
            server_default="custom",
        ),
        # Descuento opcional. Si discount_type es "percent" -> %; "amount" -> EUR.
        sa.Column("discount_type", sa.String(10), nullable=True),
        sa.Column("discount_value", sa.Numeric(10, 2), nullable=True),
        sa.Column("discount_code", sa.String(60), nullable=True),
        sa.Column(
            "is_active",
            sa.Boolean,
            nullable=False,
            server_default=sa.text("true"),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
    )
    op.create_index(
        "ix_email_campaign_templates_ws_segment",
        "email_campaign_templates",
        ["workspace_id", "target_segment"],
    )

    # ---- 4) Invitation tracking ----------------------------------------
    op.add_column(
        "client_invitations",
        sa.Column("last_email_sent_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "client_invitations",
        sa.Column("last_email_subject", sa.String(255), nullable=True),
    )
    op.add_column(
        "client_invitations",
        sa.Column("brevo_message_id", sa.String(255), nullable=True),
    )
    op.add_column(
        "client_invitations",
        sa.Column("marketing_consent", sa.Boolean, nullable=True),
    )
    op.create_index(
        "ix_client_invitations_last_email_sent_at",
        "client_invitations",
        ["last_email_sent_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_client_invitations_last_email_sent_at", table_name="client_invitations")
    op.drop_column("client_invitations", "marketing_consent")
    op.drop_column("client_invitations", "brevo_message_id")
    op.drop_column("client_invitations", "last_email_subject")
    op.drop_column("client_invitations", "last_email_sent_at")

    op.drop_index(
        "ix_email_campaign_templates_ws_segment",
        table_name="email_campaign_templates",
    )
    op.drop_table("email_campaign_templates")

    op.drop_index("ix_email_events_recipient_occurred", table_name="email_events")
    op.drop_table("email_events")

    op.drop_column("subscriptions", "paused_until")
    op.drop_column("subscriptions", "paused_at")
