"""
Account management endpoints for users and trainers.
Handles account deletion with recovery period (GDPR compliance).
"""
from datetime import datetime, timezone, timedelta
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, and_, text
import logging

from app.core.database import get_db
from app.core.security import verify_password
from app.core.config import settings
from app.models.user import User, UserRole, RoleType
from app.models.client import Client
from app.models.workspace import Workspace
from app.schemas.account import (
    AccountDeletionRequest,
    AccountDeletionCancelRequest,
    AccountDeletionResponse,
    AccountStatusResponse,
)
from app.middleware.auth import get_current_user, CurrentUser
from app.services.email import email_service, EmailTemplates

logger = logging.getLogger(__name__)

router = APIRouter()

# Recovery period in days (30 days for GDPR compliance)
ACCOUNT_RECOVERY_DAYS = 30


@router.get("/deletion-status", response_model=AccountStatusResponse)
async def get_deletion_status(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get current account deletion status.
    Returns whether account is scheduled for deletion and recovery time remaining.
    """
    user = current_user.user
    
    recovery_days = None
    if user.scheduled_deletion_at:
        days_until_deletion = (user.scheduled_deletion_at.replace(tzinfo=timezone.utc) - datetime.now(timezone.utc)).days
        recovery_days = max(0, days_until_deletion)
    
    return AccountStatusResponse(
        is_pending_deletion=user.is_pending_deletion,
        scheduled_deletion_at=user.scheduled_deletion_at,
        recovery_days_remaining=recovery_days,
        deletion_reason=user.deletion_reason
    )


@router.post("/request-deletion", response_model=AccountDeletionResponse)
async def request_account_deletion(
    data: AccountDeletionRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Request account deletion (soft delete).
    Account will be scheduled for permanent deletion after recovery period.
    User can cancel deletion within the recovery period.
    
    For clients: Only deletes their own account and associated data.
    For owners: Also deletes their workspace and all associated data (clients, etc.)
    """
    user = current_user.user
    
    # Verify password
    if not user.password_hash or not verify_password(data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Contraseña incorrecta"
        )
    
    # Check if already scheduled for deletion
    if user.is_pending_deletion:
        recovery_days = (user.scheduled_deletion_at.replace(tzinfo=timezone.utc) - datetime.now(timezone.utc)).days
        return AccountDeletionResponse(
            success=False,
            message="Tu cuenta ya está programada para eliminación",
            scheduled_deletion_at=user.scheduled_deletion_at,
            recovery_days_remaining=max(0, recovery_days)
        )
    
    # Schedule deletion
    scheduled_at = datetime.now(timezone.utc) + timedelta(days=ACCOUNT_RECOVERY_DAYS)
    user.scheduled_deletion_at = scheduled_at
    user.deletion_reason = data.reason
    user.is_active = False  # Deactivate account immediately
    
    await db.commit()
    
    logger.info(f"Account deletion scheduled for user {user.email}, deletion at {scheduled_at}")
    
    # Send confirmation email
    try:
        cancel_url = f"{settings.FRONTEND_URL}/settings/account"
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"></head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #2A2822 0%, #3D3A32 100%); padding: 30px; text-align: center; border-radius: 16px 16px 0 0;">
                <h1 style="color: white; margin: 0;">Solicitud de eliminación de cuenta</h1>
            </div>
            <div style="background: white; padding: 30px; border: 1px solid #eee; border-radius: 0 0 16px 16px;">
                <p>Hola {user.full_name or 'Usuario'},</p>
                <p>Hemos recibido tu solicitud para eliminar tu cuenta en Trackfiz.</p>
                <p><strong>Tu cuenta será eliminada permanentemente el {scheduled_at.strftime('%d/%m/%Y')}.</strong></p>
                <p>Tienes <strong>{ACCOUNT_RECOVERY_DAYS} días</strong> para cancelar esta solicitud si cambias de opinión.</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{cancel_url}" style="background: #E7E247; color: #2A2822; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                        Cancelar eliminación
                    </a>
                </div>
                <p style="color: #999; font-size: 13px;">Si no solicitaste esto, cancela la eliminación inmediatamente y cambia tu contraseña.</p>
            </div>
        </body>
        </html>
        """
        await email_service.send_email(
            to_email=user.email,
            to_name=user.full_name or user.email,
            subject="Confirmación de eliminación de cuenta - Trackfiz",
            html_content=html_content,
        )
    except Exception as e:
        logger.error(f"Failed to send deletion confirmation email: {e}")
    
    return AccountDeletionResponse(
        success=True,
        message=f"Tu cuenta ha sido programada para eliminación. Tienes {ACCOUNT_RECOVERY_DAYS} días para cancelar esta solicitud.",
        scheduled_deletion_at=scheduled_at,
        recovery_days_remaining=ACCOUNT_RECOVERY_DAYS
    )


@router.post("/cancel-deletion", response_model=AccountDeletionResponse)
async def cancel_account_deletion(
    data: AccountDeletionCancelRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Cancel scheduled account deletion.
    Only works during the recovery period before permanent deletion.
    """
    user = current_user.user
    
    # Verify password
    if not user.password_hash or not verify_password(data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Contraseña incorrecta"
        )
    
    # Check if deletion is scheduled
    if not user.is_pending_deletion:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tu cuenta no está programada para eliminación"
        )
    
    # Cancel deletion
    user.scheduled_deletion_at = None
    user.deletion_reason = None
    user.is_active = True  # Reactivate account
    
    await db.commit()
    
    logger.info(f"Account deletion cancelled for user {user.email}")
    
    # Send confirmation email
    try:
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"></head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #2A2822 0%, #3D3A32 100%); padding: 30px; text-align: center; border-radius: 16px 16px 0 0;">
                <h1 style="color: white; margin: 0;">Eliminación de cuenta cancelada</h1>
            </div>
            <div style="background: white; padding: 30px; border: 1px solid #eee; border-radius: 0 0 16px 16px;">
                <p>Hola {user.full_name or 'Usuario'},</p>
                <p>La solicitud de eliminación de tu cuenta ha sido <strong>cancelada correctamente</strong>.</p>
                <p>Tu cuenta está activa y puedes seguir usando Trackfiz con normalidad.</p>
                <p style="color: #999; font-size: 13px;">Si no realizaste esta acción, te recomendamos cambiar tu contraseña inmediatamente.</p>
            </div>
        </body>
        </html>
        """
        await email_service.send_email(
            to_email=user.email,
            to_name=user.full_name or user.email,
            subject="Eliminación de cuenta cancelada - Trackfiz",
            html_content=html_content,
        )
    except Exception as e:
        logger.error(f"Failed to send cancellation email: {e}")
    
    return AccountDeletionResponse(
        success=True,
        message="La eliminación de tu cuenta ha sido cancelada. Tu cuenta está activa nuevamente.",
        scheduled_deletion_at=None,
        recovery_days_remaining=None
    )


async def permanently_delete_user(
    user_id: UUID,
    db: AsyncSession,
    delete_workspace: bool = False
) -> None:
    """
    Permanently delete a user and all associated data.
    This is the GDPR "right to be forgotten" implementation.
    
    IMPORTANT: This function handles the deletion order to avoid foreign key violations.
    """
    # Get user
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise ValueError(f"User {user_id} not found")
    
    logger.info(f"Starting permanent deletion for user {user.email} (ID: {user_id})")
    
    # Get user's roles to find workspaces
    result = await db.execute(
        select(UserRole).where(UserRole.user_id == user_id)
    )
    user_roles = result.scalars().all()
    
    # For each workspace where user is owner, decide what to do
    owner_workspace_ids = [
        ur.workspace_id for ur in user_roles 
        if ur.role == RoleType.owner
    ]
    
    # Get client IDs associated with this user (via user_id in clients table)
    result = await db.execute(
        select(Client.id).where(Client.user_id == user_id)
    )
    client_ids = [row[0] for row in result.all()]
    
    # Delete records with NO ACTION foreign keys first (in correct order)
    # These would block deletion if not handled
    
    # 1. Delete from tables referencing clients
    for client_id in client_ids:
        await db.execute(text("DELETE FROM reminder_settings WHERE client_id = :id"), {"id": str(client_id)})
        await db.execute(text("DELETE FROM referral_conversions WHERE converted_client_id = :id"), {"id": str(client_id)})
        await db.execute(text("DELETE FROM live_class_registrations WHERE client_id = :id"), {"id": str(client_id)})
        await db.execute(text("DELETE FROM course_reviews WHERE client_id = :id"), {"id": str(client_id)})
        await db.execute(text("DELETE FROM course_enrollments WHERE client_id = :id"), {"id": str(client_id)})
        await db.execute(text("DELETE FROM challenge_participants WHERE client_id = :id"), {"id": str(client_id)})
        await db.execute(text("DELETE FROM certificates WHERE client_id = :id"), {"id": str(client_id)})
        await db.execute(text("DELETE FROM ai_suggestions WHERE client_id = :id"), {"id": str(client_id)})
        await db.execute(text("DELETE FROM ai_generations WHERE client_id = :id"), {"id": str(client_id)})
        await db.execute(text("DELETE FROM affiliates WHERE client_id = :id"), {"id": str(client_id)})
    
    # 2. Delete clients associated with this user
    await db.execute(text("DELETE FROM clients WHERE user_id = :id"), {"id": str(user_id)})
    
    # 3. Delete from tables referencing user directly (NO ACTION constraints)
    await db.execute(text("DELETE FROM supplement_favorites WHERE user_id = :id"), {"id": str(user_id)})
    await db.execute(text("DELETE FROM reminder_settings WHERE user_id = :id"), {"id": str(user_id)})
    await db.execute(text("DELETE FROM referral_conversions WHERE converted_user_id = :id"), {"id": str(user_id)})
    await db.execute(text("DELETE FROM live_class_registrations WHERE user_id = :id"), {"id": str(user_id)})
    await db.execute(text("DELETE FROM live_classes WHERE instructor_id = :id"), {"id": str(user_id)})
    await db.execute(text("DELETE FROM instructors WHERE user_id = :id"), {"id": str(user_id)})
    await db.execute(text("DELETE FROM course_reviews WHERE user_id = :id"), {"id": str(user_id)})
    await db.execute(text("DELETE FROM course_enrollments WHERE user_id = :id"), {"id": str(user_id)})
    await db.execute(text("DELETE FROM challenge_participants WHERE user_id = :id"), {"id": str(user_id)})
    await db.execute(text("DELETE FROM certificates WHERE user_id = :id"), {"id": str(user_id)})
    await db.execute(text("DELETE FROM ai_generations WHERE user_id = :id"), {"id": str(user_id)})
    await db.execute(text("DELETE FROM affiliates WHERE user_id = :id"), {"id": str(user_id)})
    await db.execute(text("DELETE FROM affiliates WHERE approved_by = :id"), {"id": str(user_id)})
    await db.execute(text("DELETE FROM food_favorites WHERE user_id = :id"), {"id": str(user_id)})
    
    # 4. Handle workspaces where user is owner
    if delete_workspace and owner_workspace_ids:
        for workspace_id in owner_workspace_ids:
            # First delete all clients in the workspace and their related data
            result = await db.execute(
                select(Client.id).where(Client.workspace_id == workspace_id)
            )
            workspace_client_ids = [row[0] for row in result.all()]
            
            for client_id in workspace_client_ids:
                await db.execute(text("DELETE FROM reminder_settings WHERE client_id = :id"), {"id": str(client_id)})
                await db.execute(text("DELETE FROM referral_conversions WHERE converted_client_id = :id"), {"id": str(client_id)})
                await db.execute(text("DELETE FROM live_class_registrations WHERE client_id = :id"), {"id": str(client_id)})
                await db.execute(text("DELETE FROM course_reviews WHERE client_id = :id"), {"id": str(client_id)})
                await db.execute(text("DELETE FROM course_enrollments WHERE client_id = :id"), {"id": str(client_id)})
                await db.execute(text("DELETE FROM challenge_participants WHERE client_id = :id"), {"id": str(client_id)})
                await db.execute(text("DELETE FROM certificates WHERE client_id = :id"), {"id": str(client_id)})
                await db.execute(text("DELETE FROM ai_suggestions WHERE client_id = :id"), {"id": str(client_id)})
                await db.execute(text("DELETE FROM ai_generations WHERE client_id = :id"), {"id": str(client_id)})
                await db.execute(text("DELETE FROM affiliates WHERE client_id = :id"), {"id": str(client_id)})
            
            # Delete workspace-level NO ACTION tables
            await db.execute(text("DELETE FROM food_favorites WHERE workspace_id = :id"), {"id": str(workspace_id)})
            await db.execute(text("DELETE FROM supplement_favorites WHERE workspace_id = :id"), {"id": str(workspace_id)})
            await db.execute(text("DELETE FROM supplements WHERE workspace_id = :id"), {"id": str(workspace_id)})
            await db.execute(text("DELETE FROM reminder_settings WHERE workspace_id = :id"), {"id": str(workspace_id)})
            
            # Delete workspace (CASCADE will handle the rest)
            await db.execute(text("DELETE FROM workspaces WHERE id = :id"), {"id": str(workspace_id)})
            logger.info(f"Deleted workspace {workspace_id}")
    
    # 5. Delete user (CASCADE handles user_roles and notifications)
    await db.execute(text("DELETE FROM users WHERE id = :id"), {"id": str(user_id)})
    
    await db.commit()
    logger.info(f"Permanently deleted user {user.email}")


@router.delete("/permanent", status_code=status.HTTP_204_NO_CONTENT)
async def delete_account_permanently(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Permanently delete account immediately (skip recovery period).
    This is for cases where user explicitly requests immediate deletion.
    Requires the account to already be scheduled for deletion.
    
    WARNING: This action is irreversible!
    """
    user = current_user.user
    
    # Must be scheduled for deletion first
    if not user.is_pending_deletion:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Debes solicitar la eliminación primero antes de eliminar permanentemente"
        )
    
    # Check if user is owner of any workspace
    is_owner = current_user.role == RoleType.owner
    
    try:
        await permanently_delete_user(user.id, db, delete_workspace=is_owner)
    except Exception as e:
        logger.error(f"Error permanently deleting user {user.email}: {e}")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al eliminar la cuenta permanentemente"
        )
