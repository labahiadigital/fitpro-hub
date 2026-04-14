"""Task management endpoints - Kanban board API."""
import logging
from datetime import datetime, time
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel as PydanticModel
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.middleware.auth import require_workspace, CurrentUser
from app.models.task import Task, TaskStatus, TaskPriority

logger = logging.getLogger(__name__)

router = APIRouter()


# ============ SCHEMAS ============

class TaskCreate(PydanticModel):
    title: str
    description: Optional[str] = None
    status: TaskStatus = TaskStatus.TODO
    priority: TaskPriority = TaskPriority.MEDIUM
    assigned_to: Optional[UUID] = None
    team_group_id: Optional[UUID] = None
    client_id: Optional[UUID] = None
    due_date: Optional[datetime] = None
    due_time: Optional[time] = None
    source: str = "manual"
    source_ref: Optional[str] = None


class TaskUpdate(PydanticModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[TaskStatus] = None
    priority: Optional[TaskPriority] = None
    assigned_to: Optional[UUID] = None
    team_group_id: Optional[UUID] = None
    client_id: Optional[UUID] = None
    due_date: Optional[datetime] = None
    due_time: Optional[time] = None


class TaskStatusUpdate(PydanticModel):
    status: TaskStatus


class TaskResponse(PydanticModel):
    id: UUID
    workspace_id: UUID
    title: str
    description: Optional[str]
    status: str
    priority: str
    assigned_to: Optional[UUID]
    team_group_id: Optional[UUID] = None
    client_id: Optional[UUID] = None
    created_by: Optional[UUID]
    due_date: Optional[datetime]
    due_time: Optional[time] = None
    source: str = "manual"
    source_ref: Optional[str] = None
    archived_at: Optional[datetime]
    deleted_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============ ENDPOINTS ============

@router.get("", response_model=List[TaskResponse])
async def list_tasks(
    task_status: Optional[TaskStatus] = Query(None, alias="status"),
    assigned_to: Optional[UUID] = None,
    client_id: Optional[UUID] = None,
    priority: Optional[TaskPriority] = None,
    state: str = Query("created", pattern="^(created|archived|deleted)$"),
    search: Optional[str] = None,
    due_from: Optional[datetime] = None,
    due_to: Optional[datetime] = None,
    current_user: CurrentUser = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    try:
        query = select(Task).where(Task.workspace_id == current_user.workspace_id)

        if state == "created":
            query = query.where(and_(Task.archived_at.is_(None), Task.deleted_at.is_(None)))
        elif state == "archived":
            query = query.where(and_(Task.archived_at.isnot(None), Task.deleted_at.is_(None)))
        elif state == "deleted":
            query = query.where(Task.deleted_at.isnot(None))

        if task_status:
            query = query.where(Task.status == task_status.value)
        if assigned_to:
            query = query.where(Task.assigned_to == assigned_to)
        if client_id:
            query = query.where(Task.client_id == client_id)
        if priority:
            query = query.where(Task.priority == priority.value)
        if search:
            query = query.where(Task.title.ilike(f"%{search}%"))
        if due_from:
            query = query.where(Task.due_date >= due_from)
        if due_to:
            query = query.where(Task.due_date <= due_to)

        query = query.order_by(Task.created_at.desc())
        result = await db.execute(query)
        return result.scalars().all()
    except Exception as e:
        logger.exception("Error listing tasks: %s", e)
        raise HTTPException(status_code=500, detail="Error al obtener tareas")


@router.post("", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_task(
    data: TaskCreate,
    current_user: CurrentUser = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    try:
        task = Task(
            workspace_id=current_user.workspace_id,
            title=data.title,
            description=data.description,
            status=data.status.value,
            priority=data.priority.value,
            assigned_to=data.assigned_to,
            client_id=data.client_id,
            created_by=current_user.id,
            due_date=data.due_date,
            due_time=data.due_time,
            source=data.source,
            source_ref=data.source_ref,
        )
        db.add(task)
        await db.commit()
        await db.refresh(task)
        return task
    except Exception as e:
        await db.rollback()
        logger.exception("Error creating task: %s", e)
        raise HTTPException(status_code=500, detail="Error al crear tarea")


@router.patch("/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: UUID,
    data: TaskUpdate,
    current_user: CurrentUser = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    try:
        result = await db.execute(
            select(Task).where(
                and_(Task.id == task_id, Task.workspace_id == current_user.workspace_id)
            )
        )
        task = result.scalar_one_or_none()
        if not task:
            raise HTTPException(status_code=404, detail="Tarea no encontrada")

        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            if isinstance(value, (TaskStatus, TaskPriority)):
                value = value.value
            setattr(task, field, value)

        await db.commit()
        await db.refresh(task)
        return task
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.exception("Error updating task: %s", e)
        raise HTTPException(status_code=500, detail="Error al actualizar tarea")


@router.patch("/{task_id}/status", response_model=TaskResponse)
async def update_task_status(
    task_id: UUID,
    data: TaskStatusUpdate,
    current_user: CurrentUser = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    try:
        result = await db.execute(
            select(Task).where(
                and_(Task.id == task_id, Task.workspace_id == current_user.workspace_id)
            )
        )
        task = result.scalar_one_or_none()
        if not task:
            raise HTTPException(status_code=404, detail="Tarea no encontrada")

        task.status = data.status.value
        await db.commit()
        await db.refresh(task)
        return task
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.exception("Error updating task status: %s", e)
        raise HTTPException(status_code=500, detail="Error al actualizar estado de tarea")


@router.patch("/{task_id}/archive", response_model=TaskResponse)
async def archive_task(
    task_id: UUID,
    current_user: CurrentUser = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    try:
        result = await db.execute(
            select(Task).where(
                and_(Task.id == task_id, Task.workspace_id == current_user.workspace_id)
            )
        )
        task = result.scalar_one_or_none()
        if not task:
            raise HTTPException(status_code=404, detail="Tarea no encontrada")

        task.archived_at = datetime.utcnow() if not task.archived_at else None
        await db.commit()
        await db.refresh(task)
        return task
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.exception("Error archiving task: %s", e)
        raise HTTPException(status_code=500, detail="Error al archivar tarea")


@router.delete("/{task_id}", response_model=TaskResponse)
async def delete_task(
    task_id: UUID,
    current_user: CurrentUser = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    try:
        result = await db.execute(
            select(Task).where(
                and_(Task.id == task_id, Task.workspace_id == current_user.workspace_id)
            )
        )
        task = result.scalar_one_or_none()
        if not task:
            raise HTTPException(status_code=404, detail="Tarea no encontrada")

        task.deleted_at = datetime.utcnow()
        await db.commit()
        await db.refresh(task)
        return task
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.exception("Error deleting task: %s", e)
        raise HTTPException(status_code=500, detail="Error al eliminar tarea")


# ============ AUTO-TASK GENERATION UTILITY ============

async def create_auto_task(
    db: AsyncSession,
    workspace_id: UUID,
    created_by: UUID,
    title: str,
    due_date: datetime,
    source: str = "auto",
    source_ref: str = "",
    client_id: UUID | None = None,
    assigned_to: UUID | None = None,
    description: str | None = None,
    notify_user: bool = True,
    notification_link: str | None = None,
    replace_existing: bool = False,
):
    """Create an automatic task and optionally notify the assignee.

    Safe to call after a commit – uses its own session so the caller's
    transaction is never affected.
    Returns the Task or None on error / duplicate.

    When *replace_existing* is True and a task with the same source_ref
    already exists, the old task is soft-deleted and a new one is created.
    """
    from app.core.database import AsyncSessionLocal

    try:
        async with AsyncSessionLocal() as session:
            if source_ref:
                existing_result = await session.execute(
                    select(Task).where(
                        and_(
                            Task.workspace_id == workspace_id,
                            Task.source_ref == source_ref,
                            Task.deleted_at.is_(None),
                        )
                    )
                )
                existing = existing_result.scalar_one_or_none()
                if existing:
                    if not replace_existing:
                        return None
                    existing.deleted_at = datetime.utcnow()

            target_user = assigned_to or created_by
            task = Task(
                workspace_id=workspace_id,
                title=title,
                description=description,
                status="todo",
                priority="medium",
                assigned_to=target_user,
                client_id=client_id,
                created_by=created_by,
                due_date=due_date,
                source=source,
                source_ref=source_ref,
            )
            session.add(task)
            await session.commit()
            await session.refresh(task)

        if notify_user:
            try:
                from app.services.notification_service import notify
                await notify(
                    db=db,
                    event="task_created",
                    user_id=target_user,
                    workspace_id=workspace_id,
                    title=f"Nueva tarea: {title}",
                    body=description or title,
                    notification_type="reminder",
                    link=notification_link or "/tasks",
                )
            except Exception:
                logger.exception("Failed to notify for auto-task: %s", title)

        return task
    except Exception:
        logger.exception("Failed to create auto-task: %s", title)
        return None
