"""Celery tasks for sending reminders."""
import logging
from datetime import datetime, timedelta
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.tasks.celery_app import celery_app
from app.core.database import AsyncSessionLocal as async_session
from app.models.notification import ReminderSetting, Notification
from app.models.user import User
from app.models.client import Client
from app.services.email import send_email

logger = logging.getLogger(__name__)


@celery_app.task(name="process_due_reminders")
def process_due_reminders():
    """
    Procesar todos los recordatorios que están programados para ahora o antes.
    Esta tarea debe ejecutarse cada hora.
    """
    import asyncio
    asyncio.run(_process_due_reminders())


async def _process_due_reminders():
    """
    Procesar recordatorios pendientes de forma asíncrona.
    """
    async with async_session() as db:
        now = datetime.utcnow()
        now_str = now.isoformat()
        
        # Obtener todos los recordatorios activos cuya fecha programada ya pasó
        result = await db.execute(
            select(ReminderSetting).where(
                ReminderSetting.is_active == True,
                ReminderSetting.next_scheduled <= now_str
            )
        )
        reminders = result.scalars().all()
        
        for reminder in reminders:
            try:
                await _send_reminder(db, reminder)
                
                # Actualizar las fechas del recordatorio
                reminder.last_sent = now_str
                reminder.next_scheduled = (now + timedelta(days=reminder.frequency_days)).isoformat()
                await db.commit()
                
            except Exception as e:
                logger.exception("Error enviando recordatorio %s", reminder.id)
                await db.rollback()


async def _send_reminder(db: AsyncSession, reminder: ReminderSetting):
    """
    Enviar un recordatorio específico.
    """
    # Determinar el destinatario y el mensaje
    if reminder.user_id:
        # Recordatorio para entrenador/usuario
        result = await db.execute(
            select(User).where(User.id == reminder.user_id)
        )
        user = result.scalar_one_or_none()
        
        if not user:
            return
        
        recipient_name = f"{user.first_name} {user.last_name}"
        recipient_email = user.email
        
    elif reminder.client_id:
        # Recordatorio para cliente
        result = await db.execute(
            select(Client).where(Client.id == reminder.client_id)
        )
        client = result.scalar_one_or_none()
        
        if not client:
            return
        
        recipient_name = client.full_name
        recipient_email = client.email
    else:
        return
    
    # Determinar el mensaje según el tipo de recordatorio
    messages = {
        'workout': {
            'subject': '💪 Recordatorio de entrenamiento',
            'default_message': '¡Hola! Es momento de revisar tu plan de entrenamiento y asegurarte de estar cumpliendo tus objetivos.'
        },
        'nutrition': {
            'subject': '🥗 Recordatorio de nutrición',
            'default_message': '¡Hola! No olvides revisar tu plan de nutrición y mantener una alimentación saludable.'
        },
        'supplement': {
            'subject': '💊 Recordatorio de suplementos',
            'default_message': '¡Hola! Recuerda tomar tus suplementos según las indicaciones de tu plan.'
        },
        'check_in': {
            'subject': '📊 Recordatorio de check-in',
            'default_message': '¡Hola! Es momento de hacer un seguimiento de tu progreso. Por favor actualiza tus medidas y comparte tu feedback.'
        },
        'measurement': {
            'subject': '📏 Recordatorio de mediciones',
            'default_message': '¡Hola! Es momento de actualizar tus mediciones corporales y fotos de progreso.'
        }
    }
    
    reminder_info = messages.get(reminder.reminder_type, {
        'subject': 'Recordatorio',
        'default_message': 'Tienes un recordatorio pendiente.'
    })
    
    subject = reminder_info['subject']
    message = reminder.custom_message or reminder_info['default_message']
    
    # Crear notificación in-app
    notification = Notification(
        workspace_id=reminder.workspace_id,
        user_id=reminder.user_id or reminder.client_id,
        title=subject,
        message=message,
        notification_type='reminder',
        category=reminder.reminder_type
    )
    db.add(notification)
    
    # Enviar email
    try:
        html_content = f"""
        <html>
            <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2>{subject}</h2>
                <p>Hola {recipient_name},</p>
                <p>{message}</p>
                <p style="margin-top: 30px; color: #666;">
                    Este es un recordatorio automático programado cada {reminder.frequency_days} días.
                </p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                <p style="color: #999; font-size: 12px;">
                    Si deseas modificar la frecuencia de estos recordatorios, contacta con tu entrenador.
                </p>
            </body>
        </html>
        """
        
        await send_email(
            to_email=recipient_email,
            subject=subject,
            html_content=html_content
        )
    except Exception as e:
        logger.exception("Error enviando email de recordatorio")


@celery_app.task(name="create_default_reminders_for_client")
def create_default_reminders_for_client(workspace_id: str, client_id: str):
    """
    Crear recordatorios por defecto para un nuevo cliente.
    """
    import asyncio
    asyncio.run(_create_default_reminders_for_client(workspace_id, client_id))


async def _create_default_reminders_for_client(workspace_id: str, client_id: str):
    """
    Crear recordatorios por defecto para un cliente.
    """
    async with async_session() as db:
        now = datetime.utcnow()
        
        # Crear recordatorios por defecto cada 15 días
        default_reminders = [
            {
                'reminder_type': 'check_in',
                'frequency_days': 15,
            },
            {
                'reminder_type': 'measurement',
                'frequency_days': 15,
            }
        ]
        
        for reminder_data in default_reminders:
            next_scheduled = now + timedelta(days=reminder_data['frequency_days'])
            
            reminder = ReminderSetting(
                workspace_id=workspace_id,
                client_id=client_id,
                reminder_type=reminder_data['reminder_type'],
                frequency_days=reminder_data['frequency_days'],
                next_scheduled=next_scheduled.isoformat(),
                is_active=True
            )
            db.add(reminder)
        
        await db.commit()
