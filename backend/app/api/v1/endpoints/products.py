"""Products and session packages endpoints."""
from typing import List, Optional
from uuid import UUID
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel as BaseSchema, field_validator
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete as sa_delete
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.middleware.auth import get_current_user, require_roles
from app.models.product import (
    Product, SessionPackage, ClientPackage, Coupon,
    ProductStockConsumption, ProductStaff, product_machines, product_boxes,
)
from app.models.resource import Machine, Box
from app.models.payment import Subscription, SubscriptionStatus
from app.models.user import User
from app.services.product_capacity import (
    count_active_subscriptions,
    count_pending_invitations,
)
from app.schemas.product import (
    ProductCreate, ProductUpdate, ProductResponse, ProductList,
    SessionPackageCreate, SessionPackageUpdate, SessionPackageResponse, SessionPackageList,
    ClientPackageCreate, ClientPackageUpdate, ClientPackageResponse, ClientPackageList,
    CouponCreate, CouponUpdate, CouponResponse, CouponList,
    CouponValidate, CouponValidateResponse,
)

router = APIRouter()


# --- Helpers defensivos ---

def _safe_product_kind(product: Product) -> str:
    """Lee ``product.kind`` tolerando una migración 047 aún no aplicada.

    La columna está definida como ``deferred``: si no existe en BD, devolvemos
    ``'service'`` para mantener el comportamiento previo.
    """
    try:
        val = getattr(product, "kind", None)
        if val in ("service", "product"):
            return val
    except Exception:  # noqa: BLE001
        pass
    return "service"


def _product_response(product: Product) -> ProductResponse:
    """Serializa un ``Product`` incluyendo ``kind`` (con fallback a service)."""
    base = ProductResponse.model_validate(product)
    return base.model_copy(update={"kind": _safe_product_kind(product)})


# --- Resource binding schemas ---

class StockConsumptionSlot(BaseSchema):
    stock_item_id: UUID
    quantity: float = 1.0

    @field_validator("quantity")
    @classmethod
    def quantity_must_be_positive(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("La cantidad debe ser mayor a 0")
        return v

class StaffSlot(BaseSchema):
    user_id: UUID
    is_primary: bool = False

class ResourceSlot(BaseSchema):
    id: UUID
    is_primary: bool = True

class ProductResourcesUpdate(BaseSchema):
    stock_consumption: Optional[List[StockConsumptionSlot]] = None
    staff: Optional[List[StaffSlot]] = None
    machine_ids: Optional[List[ResourceSlot]] = None
    box_ids: Optional[List[ResourceSlot]] = None

class StockConsumptionResponse(BaseSchema):
    stock_item_id: UUID
    stock_item_name: Optional[str] = None
    quantity: float

class StaffResponse(BaseSchema):
    user_id: UUID
    user_name: Optional[str] = None
    is_primary: bool

class MachineResponse(BaseSchema):
    machine_id: UUID
    machine_name: Optional[str] = None
    is_primary: bool

class BoxResponse(BaseSchema):
    box_id: UUID
    box_name: Optional[str] = None
    is_primary: bool

class ProductResourcesResponse(BaseSchema):
    stock_consumption: List[StockConsumptionResponse] = []
    staff: List[StaffResponse] = []
    machines: List[MachineResponse] = []
    boxes: List[BoxResponse] = []


# ==================== Products ====================

@router.get("/", response_model=ProductList)
async def list_products(
    workspace_id: UUID,
    product_type: Optional[str] = None,
    kind: Optional[str] = Query(None, pattern=r'^(service|product)$'),
    is_active: Optional[bool] = None,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all products for a workspace.

    ``kind`` permite filtrar entre servicios (por defecto, los "productos"
    históricos) y productos físicos (sin recursos asignables).
    """
    query = select(Product).where(Product.workspace_id == workspace_id)

    if product_type:
        query = query.where(Product.product_type == product_type)
    if is_active is not None:
        query = query.where(Product.is_active == is_active)
    # Si la migración 047 está aplicada podemos filtrar por ``kind``; si aún
    # no lo está, hacemos el filtro en memoria para no romper el endpoint.
    apply_kind_filter_py = False
    if kind:
        try:
            query = query.where(Product.kind == kind)
        except Exception:  # noqa: BLE001
            apply_kind_filter_py = True

    count_query = select(func.count()).select_from(query.subquery())
    total = await db.scalar(count_query)

    query = query.offset((page - 1) * size).limit(size)
    result = await db.execute(query)
    products = list(result.scalars().all())

    if apply_kind_filter_py and kind:
        products = [p for p in products if _safe_product_kind(p) == kind]

    return ProductList(
        items=[_product_response(p) for p in products],
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
    payload = data.model_dump()
    # Defensivo: si la migración 047 aún no se aplicó, evitamos pasar ``kind``
    # al constructor del modelo para no romper el INSERT.
    kind_value = payload.pop("kind", None)
    product = Product(**payload)
    if kind_value:
        try:
            product.kind = kind_value
        except Exception:  # noqa: BLE001
            pass
    db.add(product)
    await db.commit()
    await db.refresh(product)
    return _product_response(product)


@router.get("/public/{product_id}", response_model=ProductResponse)
async def get_product_public(
    product_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get a product's public info (no auth required). Only returns active products."""
    result = await db.execute(
        select(Product).where(Product.id == product_id, Product.is_active.is_(True))
    )
    product = result.scalar_one_or_none()
    
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado o no disponible")

    return _product_response(product)


@router.get("/public/{product_id}/availability")
async def get_product_public_availability(
    product_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Public availability check used by the onboarding flow.

    Reports whether the product is sold out and, if so, exposes the custom
    ``sold_out`` action the workspace owner configured (redirect, HTML
    message or a waitlist form).
    """
    result = await db.execute(
        select(Product).where(Product.id == product_id, Product.is_active.is_(True))
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado o no disponible")

    active = await count_active_subscriptions(db, product_id)
    pending = await count_pending_invitations(db, product_id)
    used = active + pending
    max_users = product.max_users
    is_full = max_users is not None and used >= max_users

    sold_out_cfg = {}
    if isinstance(product.extra_data, dict):
        raw = product.extra_data.get("sold_out")
        if isinstance(raw, dict):
            sold_out_cfg = raw

    return {
        "product_id": str(product_id),
        "is_full": is_full,
        "used_seats": used,
        "max_users": max_users,
        "sold_out": sold_out_cfg if is_full else None,
    }


class WaitlistSignupRequest(BaseSchema):
    email: str
    name: Optional[str] = None
    phone: Optional[str] = None
    message: Optional[str] = None


@router.post("/public/{product_id}/waitlist")
async def join_product_waitlist(
    product_id: UUID,
    data: WaitlistSignupRequest,
    db: AsyncSession = Depends(get_db),
):
    """Enlist a prospective client on a sold-out product's waitlist.

    Persists the signup in ``extra_data.waitlist`` and, if configured, emails
    the workspace owner so they can follow up.
    """
    from datetime import datetime
    from sqlalchemy.orm.attributes import flag_modified

    from app.models.workspace import Workspace
    from app.models.user import User, UserRole, RoleType
    from app.services.email import email_service

    product = (
        await db.execute(
            select(Product).where(Product.id == product_id, Product.is_active.is_(True))
        )
    ).scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado o no disponible")

    email = (data.email or "").strip().lower()
    if "@" not in email:
        raise HTTPException(status_code=400, detail="Email no válido")

    extra = dict(product.extra_data or {})
    sold_out = extra.get("sold_out") if isinstance(extra.get("sold_out"), dict) else {}
    waitlist = list(extra.get("waitlist") or [])

    if any((entry.get("email") or "").lower() == email for entry in waitlist if isinstance(entry, dict)):
        return {"status": "already_registered"}

    entry = {
        "email": email,
        "name": (data.name or "").strip() or None,
        "phone": (data.phone or "").strip() or None,
        "message": (data.message or "").strip() or None,
        "created_at": datetime.utcnow().isoformat(),
    }
    waitlist.append(entry)
    extra["waitlist"] = waitlist
    product.extra_data = extra
    flag_modified(product, "extra_data")
    await db.commit()

    # Notify workspace owner / configured email so they can contact the lead.
    notify_email = (sold_out.get("waitlist_notify_email") or "").strip()
    if not notify_email:
        owner_q = await db.execute(
            select(User)
            .join(UserRole, UserRole.user_id == User.id)
            .where(
                UserRole.workspace_id == product.workspace_id,
                UserRole.role == RoleType.owner,
            )
            .limit(1)
        )
        owner = owner_q.scalar_one_or_none()
        notify_email = owner.email if owner else ""

    if notify_email:
        workspace = await db.get(Workspace, product.workspace_id)
        ws_name = workspace.name if workspace else "Trackfiz"
        body = (
            f"<p>Nueva inscripción en la waitlist del producto <strong>{product.name}</strong> "
            f"({ws_name}).</p>"
            f"<ul>"
            f"<li><strong>Email:</strong> {entry['email']}</li>"
            f"<li><strong>Nombre:</strong> {entry['name'] or '—'}</li>"
            f"<li><strong>Teléfono:</strong> {entry['phone'] or '—'}</li>"
            f"<li><strong>Mensaje:</strong> {entry['message'] or '—'}</li>"
            f"</ul>"
        )
        try:
            await email_service.send_email(
                to_email=notify_email,
                to_name=ws_name,
                subject=f"Nueva waitlist — {product.name}",
                html_content=body,
            )
        except Exception:  # pragma: no cover - non-blocking
            pass

    return {"status": "ok"}


@router.get("/{product_id}", response_model=ProductResponse)
async def get_product(
    product_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific product."""
    result = await db.execute(
        select(Product).where(
            Product.id == product_id,
            Product.workspace_id == current_user.workspace_id,
        )
    )
    product = result.scalar_one_or_none()
    
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    return _product_response(product)


@router.patch("/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: UUID,
    data: ProductUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["owner", "collaborator"])),
):
    """Update a product."""
    result = await db.execute(
        select(Product).where(
            Product.id == product_id,
            Product.workspace_id == current_user.workspace_id,
        )
    )
    product = result.scalar_one_or_none()
    
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        try:
            setattr(product, field, value)
        except Exception:  # noqa: BLE001 - defensivo por si la columna kind no existe aún
            if field != "kind":
                raise

    await db.commit()
    await db.refresh(product)
    return _product_response(product)


@router.get("/{product_id}/active-subscribers", response_model=dict)
async def get_product_active_subscribers(
    product_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get seat usage for a product: active subscribers, pending invitations,
    and whether the product has reached its `max_users` cap."""
    result = await db.execute(
        select(Product).where(
            Product.id == product_id,
            Product.workspace_id == current_user.workspace_id,
        )
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    active_subscribers = await count_active_subscriptions(db, product_id)
    pending = await count_pending_invitations(db, product_id)
    used = active_subscribers + pending
    max_users = product.max_users
    is_full = max_users is not None and used >= max_users
    remaining = max(max_users - used, 0) if max_users is not None else None

    return {
        "product_id": str(product_id),
        "active_subscribers": active_subscribers,
        "pending_invitations": pending,
        "used_seats": used,
        "max_users": max_users,
        "remaining_seats": remaining,
        "is_full": is_full,
    }


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(
    product_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["owner"])),
):
    """Delete a product. Fails if there are active subscribers."""
    result = await db.execute(
        select(Product).where(
            Product.id == product_id,
            Product.workspace_id == current_user.workspace_id,
        )
    )
    product = result.scalar_one_or_none()
    
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    
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
            detail=f"No se puede eliminar: hay {count} suscripci?n(es) activa(s) en este producto"
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
        raise HTTPException(status_code=404, detail="Paquete de sesiones no encontrado")
    
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
        raise HTTPException(status_code=404, detail="Paquete del cliente no encontrado")
    
    if package.status != 'active':
        raise HTTPException(status_code=400, detail="El paquete no est? activo")
    
    if package.used_sessions >= package.total_sessions:
        raise HTTPException(status_code=400, detail="No quedan sesiones disponibles")
    
    package.used_sessions += 1
    
    # Check if exhausted
    if package.used_sessions >= package.total_sessions:
        package.status = 'exhausted'
    
    await db.commit()
    await db.refresh(package)
    return ClientPackageResponse.model_validate(package)


# ==================== Product Resources ====================

@router.get("/{product_id}/resources", response_model=ProductResourcesResponse)
async def get_product_resources(
    product_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all resource bindings for a product."""
    result = await db.execute(
        select(Product).where(
            Product.id == product_id,
            Product.workspace_id == current_user.workspace_id,
        ).options(selectinload(Product.stock_consumption), selectinload(Product.staff_assignments))
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    stock = [
        StockConsumptionResponse(
            stock_item_id=sc.stock_item_id,
            stock_item_name=sc.stock_item.name if sc.stock_item else None,
            quantity=float(sc.quantity),
        )
        for sc in product.stock_consumption
    ]

    staff = [
        StaffResponse(
            user_id=sa.user_id,
            user_name=f"{sa.user.first_name or ''} {sa.user.last_name or ''}".strip() if sa.user else None,
            is_primary=sa.is_primary,
        )
        for sa in product.staff_assignments
    ]

    machines_q = await db.execute(
        select(product_machines.c.machine_id, product_machines.c.is_primary, Machine.name)
        .join(Machine, Machine.id == product_machines.c.machine_id)
        .where(product_machines.c.product_id == product_id)
    )
    machines_list = [
        MachineResponse(machine_id=r[0], machine_name=r[2], is_primary=r[1])
        for r in machines_q
    ]

    boxes_q = await db.execute(
        select(product_boxes.c.box_id, product_boxes.c.is_primary, Box.name)
        .join(Box, Box.id == product_boxes.c.box_id)
        .where(product_boxes.c.product_id == product_id)
    )
    boxes_list = [
        BoxResponse(box_id=r[0], box_name=r[2], is_primary=r[1])
        for r in boxes_q
    ]

    return ProductResourcesResponse(
        stock_consumption=stock, staff=staff, machines=machines_list, boxes=boxes_list,
    )


@router.put("/{product_id}/resources", response_model=ProductResourcesResponse)
async def update_product_resources(
    product_id: UUID,
    data: ProductResourcesUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["owner", "collaborator"])),
):
    """Update all resource bindings for a product (replace strategy)."""
    from app.models.stock import StockItem

    result = await db.execute(
        select(Product).where(
            Product.id == product_id,
            Product.workspace_id == current_user.workspace_id,
        )
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    ws = current_user.workspace_id

    # Los "productos" físicos no admiten recursos asignables (box/máquina/staff).
    # Sólo pueden vincular consumo de stock.
    if _safe_product_kind(product) == "product":
        if data.staff or data.machine_ids or data.box_ids:
            raise HTTPException(
                status_code=400,
                detail="Los productos físicos no pueden vincularse a boxes, máquinas ni miembros del equipo. Usa un servicio para eso.",
            )

    if data.stock_consumption is not None:
        if data.stock_consumption:
            ids = [sc.stock_item_id for sc in data.stock_consumption]
            valid = await db.execute(select(StockItem.id).where(StockItem.id.in_(ids), StockItem.workspace_id == ws))
            valid_ids = {r[0] for r in valid}
            if len(valid_ids) != len(ids):
                raise HTTPException(400, "Uno o m?s art?culos de stock no pertenecen a este workspace")
        await db.execute(sa_delete(ProductStockConsumption).where(ProductStockConsumption.product_id == product_id))
        for sc in data.stock_consumption:
            db.add(ProductStockConsumption(
                product_id=product_id, stock_item_id=sc.stock_item_id, quantity=Decimal(str(sc.quantity)),
            ))

    if data.staff is not None:
        await db.execute(sa_delete(ProductStaff).where(ProductStaff.product_id == product_id))
        for s in data.staff:
            db.add(ProductStaff(product_id=product_id, user_id=s.user_id, is_primary=s.is_primary))

    if data.machine_ids is not None:
        if data.machine_ids:
            ids = [m.id for m in data.machine_ids]
            valid = await db.execute(select(Machine.id).where(Machine.id.in_(ids), Machine.workspace_id == ws))
            valid_ids = {r[0] for r in valid}
            if len(valid_ids) != len(ids):
                raise HTTPException(400, "Una o m?s m?quinas no pertenecen a este workspace")
        await db.execute(sa_delete(product_machines).where(product_machines.c.product_id == product_id))
        for m in data.machine_ids:
            await db.execute(product_machines.insert().values(product_id=product_id, machine_id=m.id, is_primary=m.is_primary))

    if data.box_ids is not None:
        if data.box_ids:
            ids = [b.id for b in data.box_ids]
            valid = await db.execute(select(Box.id).where(Box.id.in_(ids), Box.workspace_id == ws))
            valid_ids = {r[0] for r in valid}
            if len(valid_ids) != len(ids):
                raise HTTPException(400, "Uno o m?s boxes no pertenecen a este workspace")
        await db.execute(sa_delete(product_boxes).where(product_boxes.c.product_id == product_id))
        for b in data.box_ids:
            await db.execute(product_boxes.insert().values(product_id=product_id, box_id=b.id, is_primary=b.is_primary))

    await db.commit()
    return await get_product_resources(product_id, db, current_user)


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
        return CouponValidateResponse(is_valid=False, message="C?digo no encontrado")
    
    if not coupon.is_active:
        return CouponValidateResponse(is_valid=False, message="Cup?n desactivado")
    
    if coupon.max_uses and coupon.current_uses >= coupon.max_uses:
        return CouponValidateResponse(is_valid=False, message="Cup?n agotado")
    
    # Check product applicability
    if data.product_id and coupon.applicable_products:
        if data.product_id not in coupon.applicable_products:
            return CouponValidateResponse(is_valid=False, message="Cup?n no aplicable a este producto")
    
    return CouponValidateResponse(
        is_valid=True,
        discount_type=coupon.discount_type,
        discount_value=float(coupon.discount_value),
        message="Cup?n v?lido",
    )

