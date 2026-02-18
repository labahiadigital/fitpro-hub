"""Add product_id and payment_id to client_invitations, make payments.client_id nullable

Revision ID: 007
Revises: 006
Create Date: 2026-02-17

Links invitations to products (subscription plans) and payments,
enabling the onboarding payment flow with Redsys.
Also makes payments.client_id nullable since onboarding payments are created
before the client record exists.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '007'
down_revision = '006'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        'client_invitations',
        sa.Column('product_id', postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.add_column(
        'client_invitations',
        sa.Column('payment_id', postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_foreign_key(
        'fk_invitation_product',
        'client_invitations',
        'products',
        ['product_id'],
        ['id'],
        ondelete='SET NULL',
    )
    op.create_foreign_key(
        'fk_invitation_payment',
        'client_invitations',
        'payments',
        ['payment_id'],
        ['id'],
        ondelete='SET NULL',
    )
    # Make payments.client_id nullable for onboarding payments
    op.alter_column('payments', 'client_id', nullable=True)


def downgrade() -> None:
    op.alter_column('payments', 'client_id', nullable=False)
    op.drop_constraint('fk_invitation_payment', 'client_invitations', type_='foreignkey')
    op.drop_constraint('fk_invitation_product', 'client_invitations', type_='foreignkey')
    op.drop_column('client_invitations', 'payment_id')
    op.drop_column('client_invitations', 'product_id')
