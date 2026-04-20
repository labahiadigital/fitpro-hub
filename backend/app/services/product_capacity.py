"""Product capacity enforcement.

Products can be capped with a `max_users` seat limit. This module centralises
the rules used to count consumed seats and to block new subscriptions / payments
when the cap has been reached.

A "consumed seat" is any of:
  - An active / trialing / past_due / paused subscription whose
    `metadata.product_id` matches the product.
  - A pending invitation (self-service or manual) for the product, since
    that client has already reserved a slot and is expected to complete
    signup shortly. Pending invitations that expire free up the seat
    automatically.

Cancelled / expired subscriptions DO NOT count.
"""
from __future__ import annotations

from typing import Optional
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.invitation import ClientInvitation
from app.models.payment import Subscription, SubscriptionStatus
from app.models.product import Product


_ACTIVE_SUB_STATES = (
    SubscriptionStatus.active,
    SubscriptionStatus.trialing,
    SubscriptionStatus.past_due,
    SubscriptionStatus.paused,
)


async def count_active_subscriptions(db: AsyncSession, product_id: UUID) -> int:
    """Count subscriptions currently holding a seat for this product."""
    q = select(func.count()).select_from(Subscription).where(
        Subscription.extra_data["product_id"].astext == str(product_id),
        Subscription.status.in_(_ACTIVE_SUB_STATES),
    )
    return int((await db.scalar(q)) or 0)


async def count_pending_invitations(
    db: AsyncSession, product_id: UUID, *, exclude_invitation_id: Optional[UUID] = None
) -> int:
    """Count pending invitations that have reserved a seat for this product."""
    q = select(func.count()).select_from(ClientInvitation).where(
        ClientInvitation.product_id == product_id,
        ClientInvitation.status == "pending",
        ClientInvitation.expires_at > func.now(),
    )
    if exclude_invitation_id is not None:
        q = q.where(ClientInvitation.id != exclude_invitation_id)
    return int((await db.scalar(q)) or 0)


async def get_product_usage(
    db: AsyncSession,
    product_id: UUID,
    *,
    include_pending: bool = True,
    exclude_invitation_id: Optional[UUID] = None,
) -> int:
    """Total seats consumed by a product."""
    total = await count_active_subscriptions(db, product_id)
    if include_pending:
        total += await count_pending_invitations(
            db, product_id, exclude_invitation_id=exclude_invitation_id
        )
    return total


async def ensure_product_capacity(
    db: AsyncSession,
    product: Product,
    *,
    include_pending: bool = True,
    exclude_invitation_id: Optional[UUID] = None,
) -> None:
    """Raise HTTP 409 if the product's `max_users` cap is already reached.

    Products without a cap (``max_users IS NULL``) are always accepted.
    ``exclude_invitation_id`` lets us re-check capacity when an already-pending
    invitation is being converted into a subscription (we don't want to count
    it twice).
    """
    if product is None or product.max_users is None:
        return

    usage = await get_product_usage(
        db,
        product.id,
        include_pending=include_pending,
        exclude_invitation_id=exclude_invitation_id,
    )
    if usage >= product.max_users:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Este producto ha alcanzado su limite de {product.max_users} "
                "usuarios. No se pueden crear mas suscripciones."
            ),
        )


async def ensure_product_capacity_by_id(
    db: AsyncSession,
    product_id: UUID,
    *,
    include_pending: bool = True,
    exclude_invitation_id: Optional[UUID] = None,
    workspace_id: Optional[UUID] = None,
) -> Product:
    """Load a product by id and enforce its capacity. Returns the product.

    ``workspace_id`` is recommended to scope the lookup to the caller's
    workspace and prevent cross-tenant product references.
    """
    if workspace_id is not None:
        q = select(Product).where(
            Product.id == product_id,
            Product.workspace_id == workspace_id,
        )
        product = (await db.execute(q)).scalar_one_or_none()
    else:
        product = await db.get(Product, product_id)
    if product is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Producto no encontrado",
        )
    await ensure_product_capacity(
        db,
        product,
        include_pending=include_pending,
        exclude_invitation_id=exclude_invitation_id,
    )
    return product
