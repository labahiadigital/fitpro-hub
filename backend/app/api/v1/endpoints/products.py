"""Products and session packages endpoints."""
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.middleware.auth import get_current_user, require_roles
from app.models.product import Product, SessionPackage, ClientPackage, Coupon
from app.models.payment import Subscription, SubscriptionStatus
from app.models.user import User
from app.schemas.product import (
    ProductCreate, ProductUpdate, ProductResponse, ProductList,
    SessionPackageCreate, SessionPackageUpdate, SessionPackageResponse, SessionPackageList,
    ClientPackageCreate, ClientPackageUpdate, ClientPackageResponse, ClientPackageList,
    CouponCreate, CouponUpdate, CouponResponse, CouponList,
    CouponValidate, CouponValidateResponse,
)

router = APIRouter()


# ==================== Products ====================

@router.get("/", response_model=ProductList)
async def list_products(
    workspace_id: UUID,
    product_type: Optional[str] = None,
    is_active: Optional[bool] = None,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all products for a workspace."""
    query = select(Product).where(Product.workspace_id == workspace_id)
    
    if product_type:
        query = query.where(Product.product_type == product_type)
    if is_active is not None:
        query = query.where(Product.is_active == is_active)
    
    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total = await db.scalar(count_query)
    
    # Apply pagination
    query = query.offset((page - 1) * size).limit(size)
    result = await db.execute(query)
    products = result.scalars().all()
    
    return ProductList(
        items=[ProductResponse.model_validate(p) for p in products],
        total=total or 0,
        page=page,
        size=size,
    )


@router.post("/", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_product(
    data: ProductCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["owner", "collaborator"])),
):
    """Create a new product."""
    product = Product(**data.model_dump())
    db.add(product)
    await db.commit()
    await db.refresh(product)
    return ProductResponse.model_validate(product)


@router.get("/public/{product_id}", response_model=ProductResponse)
async def get_product_public(
    product_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get a product's public info (no auth required). Only returns active products."""
    result = await db.execute(
        select(Product).where(Product.id == product_id, Product.is_active == True)
    )
    product = result.scalar_one_or_none()
    
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado o no disponible")
    
    return ProductResponse.model_validate(product)


@router.get("/{product_id}", response_model=ProductResponse)
async def get_product(
    product_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific product."""
    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalar_one_or_none()
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    return ProductResponse.model_validate(product)


@router.patch("/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: UUID,
    data: ProductUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["owner", "collaborator"])),
):
    """Update a product."""
    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalar_one_or_none()
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(product, field, value)
    
    await db.commit()
    await db.refresh(product)
    return ProductResponse.model_validate(product)


@router.get("/{product_id}/active-subscribers", response_model=dict)
async def get_product_active_subscribers(
    product_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get count of active subscribers for a product."""
    count_result = await db.execute(
        select(func.count()).select_from(Subscription).where(
            Subscription.extra_data["product_id"].astext == str(product_id),
            Subscription.status == SubscriptionStatus.active,
        )
    )
    count = count_result.scalar() or 0
    return {"product_id": str(product_id), "active_subscribers": count}


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(
    product_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["owner"])),
):
    """Delete a product. Fails if there are active subscribers."""
    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalar_one_or_none()
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    active_subs = await db.execute(
        select(func.count()).select_from(Subscription).where(
            Subscription.extra_data["product_id"].astext == str(product_id),
            Subscription.status == SubscriptionStatus.active,
        )
    )
    count = active_subs.scalar() or 0
    if count > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"No se puede eliminar: hay {count} suscripción(es) activa(s) en este producto"
        )
    
    await db.delete(product)
    await db.commit()


# ==================== Session Packages ====================

@router.get("/packages/", response_model=SessionPackageList)
async def list_session_packages(
    workspace_id: UUID,
    is_active: Optional[bool] = None,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all session packages for a workspace."""
    query = select(SessionPackage).where(SessionPackage.workspace_id == workspace_id)
    
    if is_active is not None:
        query = query.where(SessionPackage.is_active == is_active)
    
    count_query = select(func.count()).select_from(query.subquery())
    total = await db.scalar(count_query)
    
    query = query.offset((page - 1) * size).limit(size)
    result = await db.execute(query)
    packages = result.scalars().all()
    
    return SessionPackageList(
        items=[SessionPackageResponse.model_validate(p) for p in packages],
        total=total or 0,
        page=page,
        size=size,
    )


@router.post("/packages/", response_model=SessionPackageResponse, status_code=status.HTTP_201_CREATED)
async def create_session_package(
    data: SessionPackageCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["owner", "collaborator"])),
):
    """Create a new session package."""
    package = SessionPackage(**data.model_dump())
    db.add(package)
    await db.commit()
    await db.refresh(package)
    return SessionPackageResponse.model_validate(package)


@router.patch("/packages/{package_id}", response_model=SessionPackageResponse)
async def update_session_package(
    package_id: UUID,
    data: SessionPackageUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["owner", "collaborator"])),
):
    """Update a session package."""
    result = await db.execute(select(SessionPackage).where(SessionPackage.id == package_id))
    package = result.scalar_one_or_none()
    
    if not package:
        raise HTTPException(status_code=404, detail="Session package not found")
    
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(package, field, value)
    
    await db.commit()
    await db.refresh(package)
    return SessionPackageResponse.model_validate(package)


# ==================== Client Packages ====================

@router.get("/client-packages/", response_model=ClientPackageList)
async def list_client_packages(
    workspace_id: UUID,
    client_id: Optional[UUID] = None,
    status: Optional[str] = None,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all client packages."""
    query = select(ClientPackage).where(ClientPackage.workspace_id == workspace_id)
    
    if client_id:
        query = query.where(ClientPackage.client_id == client_id)
    if status:
        query = query.where(ClientPackage.status == status)
    
    count_query = select(func.count()).select_from(query.subquery())
    total = await db.scalar(count_query)
    
    query = query.offset((page - 1) * size).limit(size)
    result = await db.execute(query)
    packages = result.scalars().all()
    
    return ClientPackageList(
        items=[ClientPackageResponse.model_validate(p) for p in packages],
        total=total or 0,
        page=page,
        size=size,
    )


@router.post("/client-packages/", response_model=ClientPackageResponse, status_code=status.HTTP_201_CREATED)
async def create_client_package(
    data: ClientPackageCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["owner", "collaborator"])),
):
    """Assign a package to a client."""
    package = ClientPackage(**data.model_dump())
    db.add(package)
    await db.commit()
    await db.refresh(package)
    return ClientPackageResponse.model_validate(package)


@router.post("/client-packages/{package_id}/use-session", response_model=ClientPackageResponse)
async def use_session(
    package_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["owner", "collaborator"])),
):
    """Use one session from a client package."""
    result = await db.execute(select(ClientPackage).where(ClientPackage.id == package_id))
    package = result.scalar_one_or_none()
    
    if not package:
        raise HTTPException(status_code=404, detail="Client package not found")
    
    if package.status != 'active':
        raise HTTPException(status_code=400, detail="Package is not active")
    
    if package.used_sessions >= package.total_sessions:
        raise HTTPException(status_code=400, detail="No sessions remaining")
    
    package.used_sessions += 1
    
    # Check if exhausted
    if package.used_sessions >= package.total_sessions:
        package.status = 'exhausted'
    
    await db.commit()
    await db.refresh(package)
    return ClientPackageResponse.model_validate(package)


# ==================== Coupons ====================

@router.get("/coupons/", response_model=CouponList)
async def list_coupons(
    workspace_id: UUID,
    is_active: Optional[bool] = None,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all coupons for a workspace."""
    query = select(Coupon).where(Coupon.workspace_id == workspace_id)
    
    if is_active is not None:
        query = query.where(Coupon.is_active == is_active)
    
    count_query = select(func.count()).select_from(query.subquery())
    total = await db.scalar(count_query)
    
    query = query.offset((page - 1) * size).limit(size)
    result = await db.execute(query)
    coupons = result.scalars().all()
    
    return CouponList(
        items=[CouponResponse.model_validate(c) for c in coupons],
        total=total or 0,
        page=page,
        size=size,
    )


@router.post("/coupons/", response_model=CouponResponse, status_code=status.HTTP_201_CREATED)
async def create_coupon(
    data: CouponCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["owner", "collaborator"])),
):
    """Create a new coupon."""
    coupon = Coupon(**data.model_dump())
    db.add(coupon)
    await db.commit()
    await db.refresh(coupon)
    return CouponResponse.model_validate(coupon)


@router.post("/coupons/validate", response_model=CouponValidateResponse)
async def validate_coupon(
    data: CouponValidate,
    workspace_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Validate a coupon code."""
    result = await db.execute(
        select(Coupon).where(
            Coupon.workspace_id == workspace_id,
            Coupon.code == data.code,
        )
    )
    coupon = result.scalar_one_or_none()
    
    if not coupon:
        return CouponValidateResponse(is_valid=False, message="Código no encontrado")
    
    if not coupon.is_active:
        return CouponValidateResponse(is_valid=False, message="Cupón desactivado")
    
    if coupon.max_uses and coupon.current_uses >= coupon.max_uses:
        return CouponValidateResponse(is_valid=False, message="Cupón agotado")
    
    # Check product applicability
    if data.product_id and coupon.applicable_products:
        if data.product_id not in coupon.applicable_products:
            return CouponValidateResponse(is_valid=False, message="Cupón no aplicable a este producto")
    
    return CouponValidateResponse(
        is_valid=True,
        discount_type=coupon.discount_type,
        discount_value=float(coupon.discount_value),
        message="Cupón válido",
    )

