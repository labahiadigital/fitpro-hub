"""
Google Calendar Integration Endpoints

Endpoints para OAuth, estado de conexión y sincronización con Google Calendar.
"""
import secrets
import json
from typing import Optional, List
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Request, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from pydantic import BaseModel

from app.core.database import get_db
from app.core.config import settings
from app.models.google_calendar import GoogleCalendarToken, CalendarSyncMapping
from app.models.booking import Booking
from app.models.client import Client
from app.middleware.auth import require_workspace, CurrentUser
from app.services.google_calendar import google_calendar_service, GoogleCalendarError

router = APIRouter()


# ============ SCHEMAS ============

class GoogleCalendarAuthUrlResponse(BaseModel):
    """Respuesta con URL de autorización OAuth"""
    auth_url: str


class GoogleCalendarCallbackRequest(BaseModel):
    """Request para callback de OAuth"""
    code: str
    state: Optional[str] = None


class GoogleCalendarStatusResponse(BaseModel):
    """Estado de la conexión de Google Calendar"""
    connected: bool
    email: Optional[str] = None
    calendar_id: Optional[str] = None
    calendar_name: Optional[str] = None
    sync_enabled: bool = False
    last_sync_at: Optional[datetime] = None


class GoogleCalendarSyncResponse(BaseModel):
    """Respuesta de sincronización"""
    success: bool
    events_synced: int = 0
    message: str = ""


class GoogleCalendarDisconnectResponse(BaseModel):
    """Respuesta de desconexión"""
    success: bool
    message: str


# ============ ENDPOINTS ============

@router.get("/auth-url", response_model=GoogleCalendarAuthUrlResponse)
async def get_auth_url(
    current_user: CurrentUser = Depends(require_workspace),
):
    """
    Obtener URL de autorización OAuth de Google.
    El usuario será redirigido a Google para autorizar acceso a su calendario.
    """
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Integración con Google Calendar no configurada. Contacta al administrador."
        )
    
    # Crear state con info del usuario (para validar en callback)
    state_data = {
        "user_id": str(current_user.id),
        "workspace_id": str(current_user.workspace_id),
        "nonce": secrets.token_urlsafe(16)
    }
    state = json.dumps(state_data)
    
    try:
        auth_url = google_calendar_service.get_auth_url(state)
        return GoogleCalendarAuthUrlResponse(auth_url=auth_url)
    except GoogleCalendarError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=e.message
        )


@router.post("/callback", response_model=GoogleCalendarStatusResponse)
async def oauth_callback(
    data: GoogleCalendarCallbackRequest,
    current_user: CurrentUser = Depends(require_workspace),
    db: AsyncSession = Depends(get_db)
):
    """
    Callback de OAuth de Google.
    Intercambia el código por tokens y guarda la conexión.
    """
    if not data.code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Código de autorización no proporcionado"
        )
    
    try:
        # Intercambiar código por tokens
        tokens = await google_calendar_service.exchange_code_for_tokens(data.code)
        
        if not tokens.get("refresh_token"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No se obtuvo refresh token. Por favor, revoca el acceso en tu cuenta de Google y vuelve a intentar."
            )
        
        # Obtener info del usuario de Google
        user_info = await google_calendar_service.get_user_info(tokens["access_token"])
        
        # Buscar token existente
        result = await db.execute(
            select(GoogleCalendarToken).where(
                and_(
                    GoogleCalendarToken.user_id == current_user.id,
                    GoogleCalendarToken.workspace_id == current_user.workspace_id
                )
            )
        )
        existing_token = result.scalar_one_or_none()
        
        if existing_token:
            # Actualizar token existente
            existing_token.access_token = tokens["access_token"]
            existing_token.refresh_token = tokens["refresh_token"]
            existing_token.token_expiry = tokens["expiry"]
            existing_token.email = user_info.get("email")
            existing_token.sync_enabled = True
            token = existing_token
        else:
            # Crear nuevo token
            token = GoogleCalendarToken(
                user_id=current_user.id,
                workspace_id=current_user.workspace_id,
                access_token=tokens["access_token"],
                refresh_token=tokens["refresh_token"],
                token_expiry=tokens["expiry"],
                email=user_info.get("email"),
                calendar_id="primary",
                sync_enabled=True
            )
            db.add(token)
        
        await db.commit()
        await db.refresh(token)
        
        # Crear o obtener el calendario "Trackfiz" separado
        try:
            await google_calendar_service.get_or_create_trackfiz_calendar(token, db)
            await db.refresh(token)
        except Exception as e:
            print(f"[Google Calendar] Error creando calendario Trackfiz: {e}")
            # No es crítico, se usará el calendario principal
        
        return GoogleCalendarStatusResponse(
            connected=True,
            email=token.email,
            calendar_id=token.calendar_id,
            calendar_name=token.calendar_name or "Trackfiz",
            sync_enabled=token.sync_enabled,
            last_sync_at=token.last_sync_at
        )
        
    except GoogleCalendarError as e:
        raise HTTPException(
            status_code=e.status_code or status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=e.message
        )


@router.get("/status", response_model=GoogleCalendarStatusResponse)
async def get_status(
    current_user: CurrentUser = Depends(require_workspace),
    db: AsyncSession = Depends(get_db)
):
    """
    Obtener estado de la conexión de Google Calendar del usuario.
    """
    result = await db.execute(
        select(GoogleCalendarToken).where(
            and_(
                GoogleCalendarToken.user_id == current_user.id,
                GoogleCalendarToken.workspace_id == current_user.workspace_id
            )
        )
    )
    token = result.scalar_one_or_none()
    
    if not token:
        return GoogleCalendarStatusResponse(
            connected=False,
            sync_enabled=False
        )
    
    return GoogleCalendarStatusResponse(
        connected=True,
        email=token.email,
        calendar_id=token.calendar_id,
        calendar_name=token.calendar_name,
        sync_enabled=token.sync_enabled,
        last_sync_at=token.last_sync_at
    )


@router.post("/disconnect", response_model=GoogleCalendarDisconnectResponse)
async def disconnect(
    current_user: CurrentUser = Depends(require_workspace),
    db: AsyncSession = Depends(get_db)
):
    """
    Desconectar Google Calendar del usuario.
    """
    result = await db.execute(
        select(GoogleCalendarToken).where(
            and_(
                GoogleCalendarToken.user_id == current_user.id,
                GoogleCalendarToken.workspace_id == current_user.workspace_id
            )
        )
    )
    token = result.scalar_one_or_none()
    
    if not token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No hay Google Calendar conectado"
        )
    
    # Detener push notifications si están activas
    try:
        await google_calendar_service.stop_push_notifications(token)
    except Exception:
        pass
    
    # Eliminar mappings de sincronización del usuario
    await db.execute(
        CalendarSyncMapping.__table__.delete().where(
            CalendarSyncMapping.user_id == current_user.id
        )
    )
    
    # Eliminar token
    await db.delete(token)
    await db.commit()
    
    return GoogleCalendarDisconnectResponse(
        success=True,
        message="Google Calendar desconectado correctamente"
    )


@router.post("/sync", response_model=GoogleCalendarSyncResponse)
async def sync_calendar(
    background_tasks: BackgroundTasks,
    current_user: CurrentUser = Depends(require_workspace),
    db: AsyncSession = Depends(get_db)
):
    """
    Sincronizar manualmente los bookings con Google Calendar.
    """
    # Buscar token
    result = await db.execute(
        select(GoogleCalendarToken).where(
            and_(
                GoogleCalendarToken.user_id == current_user.id,
                GoogleCalendarToken.workspace_id == current_user.workspace_id,
                GoogleCalendarToken.sync_enabled == True
            )
        )
    )
    token = result.scalar_one_or_none()
    
    if not token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google Calendar no conectado o sincronización deshabilitada"
        )
    
    try:
        print(f"[Google Calendar] Iniciando sincronización para usuario {current_user.id}...")
        
        # Asegurar token válido
        token = await google_calendar_service.ensure_valid_token(token, db)
        print(f"[Google Calendar] Token válido, calendar_id actual: {token.calendar_id}")
        
        # Asegurar que existe el calendario Trackfiz
        calendar_id = await google_calendar_service.get_or_create_trackfiz_calendar(token, db)
        print(f"[Google Calendar] Calendario Trackfiz: {calendar_id}")
        
        # Refrescar el token para obtener el calendar_id actualizado
        await db.refresh(token)
        
        # Obtener bookings del workspace (últimos 7 días y próximos 60 días)
        # Incluimos pasados recientes para sincronizar eventos que se hayan creado recientemente
        now = datetime.now(timezone.utc)
        
        result = await db.execute(
            select(Booking).where(
                and_(
                    Booking.workspace_id == current_user.workspace_id,
                    Booking.start_time >= now - timedelta(days=7),
                    Booking.start_time <= now + timedelta(days=60)
                )
            )
        )
        bookings = result.scalars().all()
        
        print(f"[Google Calendar] Encontrados {len(bookings)} bookings para sincronizar")
        
        events_synced = 0
        errors = []
        
        for booking in bookings:
            try:
                # Obtener cliente si existe
                client = None
                if booking.client_id:
                    client_result = await db.execute(
                        select(Client).where(Client.id == booking.client_id)
                    )
                    client = client_result.scalar_one_or_none()
                
                # Sincronizar booking
                event_id = await google_calendar_service.sync_booking_to_google(
                    booking=booking,
                    user_id=current_user.id,
                    db=db,
                    client=client
                )
                
                if event_id:
                    events_synced += 1
                    print(f"[Google Calendar] Booking {booking.id} sincronizado: {event_id}")
            except Exception as e:
                print(f"[Google Calendar] Error sincronizando booking {booking.id}: {e}")
                errors.append(str(e))
        
        # Actualizar última sincronización
        token.last_sync_at = datetime.now(timezone.utc)
        await db.commit()
        
        message = f"Se sincronizaron {events_synced} eventos con Google Calendar"
        if errors:
            message += f" ({len(errors)} errores)"
        
        return GoogleCalendarSyncResponse(
            success=True,
            events_synced=events_synced,
            message=message
        )
        
    except GoogleCalendarError as e:
        print(f"[Google Calendar] GoogleCalendarError: {e.message}")
        raise HTTPException(
            status_code=e.status_code or status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=e.message
        )
    except Exception as e:
        print(f"[Google Calendar] Error inesperado: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al sincronizar: {str(e)}"
        )


@router.patch("/settings")
async def update_settings(
    sync_enabled: bool,
    current_user: CurrentUser = Depends(require_workspace),
    db: AsyncSession = Depends(get_db)
):
    """
    Actualizar configuración de sincronización.
    """
    result = await db.execute(
        select(GoogleCalendarToken).where(
            and_(
                GoogleCalendarToken.user_id == current_user.id,
                GoogleCalendarToken.workspace_id == current_user.workspace_id
            )
        )
    )
    token = result.scalar_one_or_none()
    
    if not token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google Calendar no conectado"
        )
    
    token.sync_enabled = sync_enabled
    await db.commit()
    
    return {"success": True, "sync_enabled": sync_enabled}


class GoogleEventResponse(BaseModel):
    """Evento de Google Calendar para mostrar en la webapp."""
    id: str
    title: str
    start: datetime
    end: datetime
    all_day: bool = False
    calendar_name: str
    calendar_id: str
    is_trackfiz: bool = False
    location: Optional[str] = None
    description: Optional[str] = None


@router.get("/events", response_model=List[GoogleEventResponse])
async def get_google_events(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    include_trackfiz: bool = False,
    current_user: CurrentUser = Depends(require_workspace),
    db: AsyncSession = Depends(get_db)
):
    """
    Obtener eventos de Google Calendar del usuario.
    
    Por defecto excluye los eventos de Trackfiz (que ya están en bookings).
    Útil para mostrar la disponibilidad completa del usuario.
    """
    result = await db.execute(
        select(GoogleCalendarToken).where(
            and_(
                GoogleCalendarToken.user_id == current_user.id,
                GoogleCalendarToken.workspace_id == current_user.workspace_id
            )
        )
    )
    token = result.scalar_one_or_none()
    
    if not token:
        return []
    
    try:
        # Asegurar token válido
        token = await google_calendar_service.ensure_valid_token(token, db)
        
        # Fechas por defecto: próximos 30 días
        now = datetime.now(timezone.utc)
        if not start_date:
            start_date = now - timedelta(days=7)
        if not end_date:
            end_date = now + timedelta(days=30)
        
        # Obtener eventos de todos los calendarios
        events = await google_calendar_service.get_all_user_events(
            token=token,
            time_min=start_date,
            time_max=end_date,
            include_trackfiz=include_trackfiz
        )
        
        # Convertir a formato de respuesta
        result_events = []
        for event in events:
            # Determinar si es evento de todo el día
            start_data = event.get('start', {})
            end_data = event.get('end', {})
            
            if 'date' in start_data:
                # Evento de todo el día
                all_day = True
                start = datetime.fromisoformat(start_data['date'])
                end = datetime.fromisoformat(end_data.get('date', start_data['date']))
            else:
                all_day = False
                start_str = start_data.get('dateTime', '')
                end_str = end_data.get('dateTime', start_str)
                
                # Parsear datetime con timezone
                if start_str:
                    start = datetime.fromisoformat(start_str.replace('Z', '+00:00'))
                    end = datetime.fromisoformat(end_str.replace('Z', '+00:00'))
                else:
                    continue  # Saltar eventos sin fecha
            
            result_events.append(GoogleEventResponse(
                id=event.get('id', ''),
                title=event.get('summary', 'Sin título'),
                start=start,
                end=end,
                all_day=all_day,
                calendar_name=event.get('_calendar_name', 'Calendario'),
                calendar_id=event.get('_calendar_id', ''),
                is_trackfiz=event.get('_is_trackfiz', False),
                location=event.get('location'),
                description=event.get('description')
            ))
        
        return result_events
        
    except GoogleCalendarError as e:
        print(f"[Google Calendar] Error obteniendo eventos: {e.message}")
        return []
    except Exception as e:
        print(f"[Google Calendar] Error inesperado: {e}")
        import traceback
        traceback.print_exc()
        return []


# ============ WEBHOOK (PÚBLICO) ============

@router.post("/webhook")
async def google_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """
    Webhook para recibir notificaciones de cambios en Google Calendar.
    Este endpoint es llamado por Google cuando hay cambios en un calendario.
    
    Headers importantes:
    - X-Goog-Channel-ID: ID del canal de notificación
    - X-Goog-Resource-ID: ID del recurso (calendario)
    - X-Goog-Resource-State: Estado del recurso (sync, exists, etc.)
    """
    channel_id = request.headers.get("X-Goog-Channel-ID")
    resource_id = request.headers.get("X-Goog-Resource-ID")
    resource_state = request.headers.get("X-Goog-Resource-State")
    
    if not channel_id:
        return {"status": "ignored", "reason": "No channel ID"}
    
    # Buscar token por channel_id
    result = await db.execute(
        select(GoogleCalendarToken).where(
            GoogleCalendarToken.channel_id == channel_id
        )
    )
    token = result.scalar_one_or_none()
    
    if not token:
        return {"status": "ignored", "reason": "Unknown channel"}
    
    # Si es notificación de sync inicial, ignorar
    if resource_state == "sync":
        return {"status": "ok", "message": "Sync notification received"}
    
    # Para otras notificaciones, podríamos sincronizar cambios desde Google
    # Por ahora, solo registramos que recibimos la notificación
    print(f"[Google Calendar Webhook] Channel: {channel_id}, State: {resource_state}")
    
    # TODO: Implementar sincronización de cambios desde Google a Trackfiz
    # Esto requeriría:
    # 1. Obtener eventos modificados desde Google
    # 2. Comparar con bookings existentes
    # 3. Actualizar/crear bookings según corresponda
    
    return {"status": "ok"}
