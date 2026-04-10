"""Service CRUD with staff, machines, and stock consumption M2M."""
from typing import Optional, List
from uuid import UUID
from datetime import datetime, timezone
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete as sa_delete
from sqlalchemy.orm import selectinload
from pydantic import BaseModel as BaseSchema

from app.core.database import get_db
from app.models.resource import Service, ServiceStaff, ServiceStockConsumption, Machine, service_machines
from app.api.deps import require_staff, CurrentUser

router = APIRouter()


class StaffAssignment(BaseSchema):
    user_id: UUID
    is_primary: bool = False


class StockConsumptionItem(BaseSchema):
    stock_item_id: UUID
    quantity: float = 1.0


class ServiceCreate(BaseSchema):
    name: str
    description: Optional[str] = None
    category: Optional[str] = None
    price: float = 0
    duration_minutes: int = 60
    tax_percentage: float = 21
    retention_percentage: float = 0
    default_box_id: Optional[UUID] = None
    is_active: bool = True
    show_online: bool = True
    color_hex: str = "#10B981"
    machine_ids: List[UUID] = []
    staff: List[StaffAssignment] = []
    stock_consumption: List[StockConsumptionItem] = []


class ServiceUpdate(BaseSchema):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    price: Optional[float] = None
    duration_minutes: Optional[int] = None
    tax_percentage: Optional[float] = None
    retention_percentage: Optional[float] = None
    default_box_id: Optional[UUID] = None
    is_active: Optional[bool] = None
    show_online: Optional[bool] = None
    color_hex: Optional[str] = None
    machine_ids: Optional[List[UUID]] = None
    staff: Optional[List[StaffAssignment]] = None
    stock_consumption: Optional[List[StockConsumptionItem]] = None


class ServiceStaffResponse(BaseSchema):
    user_id: UUID
    user_name: Optional[str] = None
    is_primary: bool

class StockConsumptionResponse(BaseSchema):
    stock_item_id: UUID
    stock_item_name: Optional[str] = None
    quantity: float

class ServiceResponse(BaseSchema):
    id: UUID
    workspace_id: UUID
    name: str
    description: Optional[str] = None
    category: Optional[str] = None
    price: float
    duration_minutes: int
    tax_percentage: float
    retention_percentage: float
    default_box_id: Optional[UUID] = None
    is_active: bool
    show_online: bool
    color_hex: str
    machine_ids: List[UUID] = []
    staff: List[ServiceStaffResponse] = []
    stock_consumption: List[StockConsumptionResponse] = []
    created_at: datetime
    updated_at: datetime


def _build_response(svc: Service) -> ServiceResponse:
    return ServiceResponse(
        id=svc.id, workspace_id=svc.workspace_id, name=svc.name,
        description=svc.description, category=svc.category,
        price=float(svc.price), duration_minutes=svc.duration_minutes,
        tax_percentage=float(svc.tax_percentage), retention_percentage=float(svc.retention_percentage),
        default_box_id=svc.default_box_id, is_active=svc.is_active,
        show_online=svc.show_online, color_hex=svc.color_hex,
        machine_ids=[m.id for m in svc.machines],
        staff=[
            ServiceStaffResponse(
                user_id=sa.user_id,
                user_name=f"{sa.user.first_name} {sa.user.last_name}" if sa.user else None,
                is_primary=sa.is_primary,
            )
            for sa in svc.staff_assignments
        ],
        stock_consumption=[
            StockConsumptionResponse(
                stock_item_id=sc.stock_item_id,
                stock_item_name=sc.stock_item.name if sc.stock_item else None,
                quantity=float(sc.quantity),
            )
            for sc in svc.stock_consumption
        ],
        created_at=svc.created_at, updated_at=svc.updated_at,
    )


def _eager_opts():
    return [
        selectinload(Service.machines),
        selectinload(Service.staff_assignments).selectinload(ServiceStaff.user),
        selectinload(Service.stock_consumption).selectinload(ServiceStockConsumption.stock_item),
    ]


@router.get("", response_model=List[ServiceResponse])
async def list_services(
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Service)
        .options(*_eager_opts())
        .where(Service.workspace_id == current_user.workspace_id)
        .order_by(Service.name)
    )
    return [_build_response(s) for s in result.scalars().unique().all()]


@router.post("", response_model=ServiceResponse, status_code=status.HTTP_201_CREATED)
async def create_service(
    data: ServiceCreate,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    svc = Service(
        workspace_id=current_user.workspace_id,
        name=data.name, description=data.description, category=data.category,
        price=data.price, duration_minutes=data.duration_minutes,
        tax_percentage=data.tax_percentage, retention_percentage=data.retention_percentage,
        default_box_id=data.default_box_id, is_active=data.is_active,
        show_online=data.show_online, color_hex=data.color_hex,
    )
    db.add(svc)
    await db.flush()

    if data.machine_ids:
        machines = (await db.execute(select(Machine).where(Machine.id.in_(data.machine_ids)))).scalars().all()
        svc.machines = list(machines)

    for sa_item in data.staff:
        db.add(ServiceStaff(service_id=svc.id, user_id=sa_item.user_id, is_primary=sa_item.is_primary))

    for sc_item in data.stock_consumption:
        db.add(ServiceStockConsumption(
            service_id=svc.id, stock_item_id=sc_item.stock_item_id,
            quantity=Decimal(str(sc_item.quantity)),
        ))

    await db.commit()

    result = await db.execute(select(Service).options(*_eager_opts()).where(Service.id == svc.id))
    return _build_response(result.scalar_one())


@router.get("/{service_id}", response_model=ServiceResponse)
async def get_service(
    service_id: UUID,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Service).options(*_eager_opts())
        .where(Service.id == service_id, Service.workspace_id == current_user.workspace_id)
    )
    svc = result.scalar_one_or_none()
    if not svc:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")
    return _build_response(svc)


@router.put("/{service_id}", response_model=ServiceResponse)
async def update_service(
    service_id: UUID,
    data: ServiceUpdate,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Service).options(*_eager_opts())
        .where(Service.id == service_id, Service.workspace_id == current_user.workspace_id)
    )
    svc = result.scalar_one_or_none()
    if not svc:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")

    scalar_fields = {"name", "description", "category", "price", "duration_minutes",
                     "tax_percentage", "retention_percentage", "default_box_id",
                     "is_active", "show_online", "color_hex"}
    for k, v in data.model_dump(exclude_unset=True).items():
        if k in scalar_fields:
            setattr(svc, k, v)

    if data.machine_ids is not None:
        machines = (await db.execute(select(Machine).where(Machine.id.in_(data.machine_ids)))).scalars().all()
        svc.machines = list(machines)

    if data.staff is not None:
        await db.execute(sa_delete(ServiceStaff).where(ServiceStaff.service_id == svc.id))
        for sa_item in data.staff:
            db.add(ServiceStaff(service_id=svc.id, user_id=sa_item.user_id, is_primary=sa_item.is_primary))

    if data.stock_consumption is not None:
        await db.execute(sa_delete(ServiceStockConsumption).where(ServiceStockConsumption.service_id == svc.id))
        for sc_item in data.stock_consumption:
            db.add(ServiceStockConsumption(
                service_id=svc.id, stock_item_id=sc_item.stock_item_id,
                quantity=Decimal(str(sc_item.quantity)),
            ))

    svc.updated_at = datetime.now(timezone.utc)
    await db.commit()

    result2 = await db.execute(select(Service).options(*_eager_opts()).where(Service.id == svc.id))
    return _build_response(result2.scalar_one())


@router.delete("/{service_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_service(
    service_id: UUID,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Service).where(Service.id == service_id, Service.workspace_id == current_user.workspace_id)
    )
    svc = result.scalar_one_or_none()
    if not svc:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")
    await db.delete(svc)
    await db.commit()
