from typing import List, Optional
from uuid import UUID
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from app.core.database import get_db
from app.models.automation import Automation, AutomationLog, TriggerType, ActionType
from app.middleware.auth import require_workspace, require_staff, CurrentUser

router = APIRouter()


# ============ SCHEMAS ============

class ActionSchema(BaseModel):
    type: ActionType
    config: dict = {}


class ConditionSchema(BaseModel):
    field: str
    operator: str  # equals, not_equals, contains, greater_than, less_than
    value: str


class AutomationCreate(BaseModel):
    name: str
    description: Optional[str] = None
    trigger_type: TriggerType
    trigger_config: dict = {}
    actions: List[ActionSchema] = []
    conditions: List[ConditionSchema] = []
    is_active: bool = True


class AutomationResponse(BaseModel):
    id: UUID
    workspace_id: UUID
    name: str
    description: Optional[str]
    trigger_type: TriggerType
    trigger_config: dict
    actions: list
    conditions: list
    is_active: bool
    stats: dict
    created_at: datetime
    
    class Config:
        from_attributes = True


class AutomationLogResponse(BaseModel):
    id: UUID
    automation_id: UUID
    trigger_data: dict
    executed_actions: list
    status: str
    error_message: Optional[str]
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    created_at: datetime
    
    class Config:
        from_attributes = True


# ============ AUTOMATIONS ============

@router.get("", response_model=List[AutomationResponse])
async def list_automations(
    trigger_type: Optional[TriggerType] = None,
    is_active: Optional[bool] = None,
    current_user: CurrentUser = Depends(require_workspace),
    db: AsyncSession = Depends(get_db)
):
    """
    Listar automatizaciones del workspace.
    """
    query = select(Automation).where(
        Automation.workspace_id == current_user.workspace_id
    )
    
    if trigger_type:
        query = query.where(Automation.trigger_type == trigger_type)
    
    if is_active is not None:
        query = query.where(Automation.is_active == is_active)
    
    result = await db.execute(query.order_by(Automation.created_at.desc()))
    return result.scalars().all()


@router.post("", response_model=AutomationResponse, status_code=status.HTTP_201_CREATED)
async def create_automation(
    data: AutomationCreate,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """
    Crear una nueva automatización.
    """
    automation = Automation(
        workspace_id=current_user.workspace_id,
        created_by=current_user.id,
        name=data.name,
        description=data.description,
        trigger_type=data.trigger_type,
        trigger_config=data.trigger_config,
        actions=[a.model_dump() for a in data.actions],
        conditions=[c.model_dump() for c in data.conditions],
        is_active=data.is_active
    )
    db.add(automation)
    await db.commit()
    await db.refresh(automation)
    return automation


@router.get("/{automation_id}", response_model=AutomationResponse)
async def get_automation(
    automation_id: UUID,
    current_user: CurrentUser = Depends(require_workspace),
    db: AsyncSession = Depends(get_db)
):
    """
    Obtener detalles de una automatización.
    """
    result = await db.execute(
        select(Automation).where(
            Automation.id == automation_id,
            Automation.workspace_id == current_user.workspace_id
        )
    )
    automation = result.scalar_one_or_none()
    
    if not automation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Automatización no encontrada"
        )
    
    return automation


@router.put("/{automation_id}", response_model=AutomationResponse)
async def update_automation(
    automation_id: UUID,
    data: AutomationCreate,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """
    Actualizar una automatización.
    """
    result = await db.execute(
        select(Automation).where(
            Automation.id == automation_id,
            Automation.workspace_id == current_user.workspace_id
        )
    )
    automation = result.scalar_one_or_none()
    
    if not automation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Automatización no encontrada"
        )
    
    automation.name = data.name
    automation.description = data.description
    automation.trigger_type = data.trigger_type
    automation.trigger_config = data.trigger_config
    automation.actions = [a.model_dump() for a in data.actions]
    automation.conditions = [c.model_dump() for c in data.conditions]
    automation.is_active = data.is_active
    
    await db.commit()
    await db.refresh(automation)
    return automation


@router.delete("/{automation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_automation(
    automation_id: UUID,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """
    Eliminar una automatización.
    """
    result = await db.execute(
        select(Automation).where(
            Automation.id == automation_id,
            Automation.workspace_id == current_user.workspace_id
        )
    )
    automation = result.scalar_one_or_none()
    
    if not automation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Automatización no encontrada"
        )
    
    await db.delete(automation)
    await db.commit()


@router.post("/{automation_id}/toggle", response_model=AutomationResponse)
async def toggle_automation(
    automation_id: UUID,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """
    Activar/desactivar una automatización.
    """
    result = await db.execute(
        select(Automation).where(
            Automation.id == automation_id,
            Automation.workspace_id == current_user.workspace_id
        )
    )
    automation = result.scalar_one_or_none()
    
    if not automation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Automatización no encontrada"
        )
    
    automation.is_active = not automation.is_active
    await db.commit()
    await db.refresh(automation)
    return automation


# ============ LOGS ============

@router.get("/{automation_id}/logs", response_model=List[AutomationLogResponse])
async def list_automation_logs(
    automation_id: UUID,
    limit: int = 50,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """
    Listar historial de ejecuciones de una automatización.
    """
    result = await db.execute(
        select(AutomationLog)
        .where(AutomationLog.automation_id == automation_id)
        .order_by(AutomationLog.created_at.desc())
        .limit(limit)
    )
    return result.scalars().all()

