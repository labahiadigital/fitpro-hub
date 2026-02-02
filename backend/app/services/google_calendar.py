"""
Google Calendar Service

Servicio para integración bidireccional con Google Calendar:
- OAuth 2.0 flow
- CRUD de eventos
- Sincronización de bookings
- Push notifications (webhooks)
"""
import json
import secrets
import asyncio
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import UUID
from urllib.parse import urlencode

import httpx
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request as GoogleRequest
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

# Thread pool para ejecutar llamadas síncronas de Google API
_executor = ThreadPoolExecutor(max_workers=5)

from app.core.config import settings
from app.models.google_calendar import GoogleCalendarToken, CalendarSyncMapping
from app.models.booking import Booking, BookingStatus
from app.models.client import Client
from app.models.user import User


# OAuth scopes needed
# - calendar: Full access to manage calendars (create, delete, etc.)
# - calendar.events: Manage events in calendars
# - userinfo.email: Get user's email address
SCOPES = [
    'https://www.googleapis.com/auth/calendar',  # Full calendar access (needed to create calendars)
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/userinfo.email',
]


class GoogleCalendarError(Exception):
    """Error del servicio de Google Calendar"""
    def __init__(self, message: str, status_code: Optional[int] = None):
        self.message = message
        self.status_code = status_code
        super().__init__(self.message)


class GoogleCalendarService:
    """
    Servicio para integración con Google Calendar API
    """
    
    def __init__(self):
        self.client_id = settings.GOOGLE_CLIENT_ID
        self.client_secret = settings.GOOGLE_CLIENT_SECRET
        self.redirect_uri = settings.GOOGLE_REDIRECT_URI
    
    # ============ OAUTH FLOW ============
    
    def get_auth_url(self, state: str) -> str:
        """
        Genera URL de autorización OAuth de Google.
        
        Args:
            state: Estado para validar el callback (incluir user_id encriptado)
            
        Returns:
            URL para redirigir al usuario a Google
        """
        if not self.client_id:
            raise GoogleCalendarError("Google Calendar no está configurado")
        
        # Log para debug
        print(f"[Google Calendar] Generating auth URL with redirect_uri: {self.redirect_uri}")
        
        params = {
            "client_id": self.client_id,
            "redirect_uri": self.redirect_uri,
            "response_type": "code",
            "scope": " ".join(SCOPES),
            "access_type": "offline",
            "prompt": "consent",  # Forzar para obtener refresh_token
            "state": state,
        }
        
        # Usar urlencode para codificar correctamente los parámetros
        query = urlencode(params)
        auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?{query}"
        print(f"[Google Calendar] Auth URL: {auth_url}")
        return auth_url
    
    async def exchange_code_for_tokens(self, code: str) -> dict:
        """
        Intercambia código de autorización por tokens OAuth.
        
        Args:
            code: Código de autorización de Google
            
        Returns:
            dict con access_token, refresh_token, expiry
        """
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "code": code,
                    "grant_type": "authorization_code",
                    "redirect_uri": self.redirect_uri,
                }
            )
            
            if response.status_code != 200:
                error_data = response.json()
                raise GoogleCalendarError(
                    f"Error al obtener tokens: {error_data.get('error_description', error_data.get('error'))}",
                    response.status_code
                )
            
            data = response.json()
            
            return {
                "access_token": data["access_token"],
                "refresh_token": data.get("refresh_token"),
                "expiry": datetime.now(timezone.utc) + timedelta(seconds=data.get("expires_in", 3600))
            }
    
    async def refresh_access_token(self, refresh_token: str) -> dict:
        """
        Refresca el access token usando el refresh token.
        
        Args:
            refresh_token: Token de refresh
            
        Returns:
            dict con nuevo access_token y expiry
        """
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "refresh_token": refresh_token,
                    "grant_type": "refresh_token",
                }
            )
            
            if response.status_code != 200:
                error_data = response.json()
                raise GoogleCalendarError(
                    f"Error al refrescar token: {error_data.get('error_description', error_data.get('error'))}",
                    response.status_code
                )
            
            data = response.json()
            
            return {
                "access_token": data["access_token"],
                "expiry": datetime.now(timezone.utc) + timedelta(seconds=data.get("expires_in", 3600))
            }
    
    async def get_user_info(self, access_token: str) -> dict:
        """
        Obtiene información del usuario de Google.
        
        Args:
            access_token: Token de acceso
            
        Returns:
            dict con email y nombre
        """
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://www.googleapis.com/oauth2/v2/userinfo",
                headers={"Authorization": f"Bearer {access_token}"}
            )
            
            if response.status_code != 200:
                raise GoogleCalendarError("Error al obtener info del usuario")
            
            return response.json()
    
    async def ensure_valid_token(
        self, 
        token: GoogleCalendarToken, 
        db: AsyncSession
    ) -> GoogleCalendarToken:
        """
        Asegura que el token sea válido, refrescándolo si es necesario.
        
        Args:
            token: Token actual
            db: Sesión de base de datos
            
        Returns:
            Token actualizado
        """
        # Si el token expira en menos de 5 minutos, refrescarlo
        # Convertir a timezone-aware si es naive
        token_expiry = token.token_expiry
        if token_expiry.tzinfo is None:
            token_expiry = token_expiry.replace(tzinfo=timezone.utc)
        
        if token_expiry <= datetime.now(timezone.utc) + timedelta(minutes=5):
            try:
                new_tokens = await self.refresh_access_token(token.refresh_token)
                token.access_token = new_tokens["access_token"]
                token.token_expiry = new_tokens["expiry"]
                await db.commit()
            except GoogleCalendarError as e:
                # Si falla el refresh, el token puede estar revocado
                raise GoogleCalendarError(f"Token expirado y no se pudo refrescar: {e.message}")
        
        return token
    
    def _get_calendar_service(self, token: GoogleCalendarToken):
        """
        Crea un servicio de Google Calendar API.
        
        Args:
            token: Token OAuth
            
        Returns:
            Servicio de Calendar API
        """
        credentials = Credentials(
            token=token.access_token,
            refresh_token=token.refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=self.client_id,
            client_secret=self.client_secret,
        )
        
        return build('calendar', 'v3', credentials=credentials, cache_discovery=False)
    
    # ============ CALENDAR OPERATIONS ============
    
    async def get_or_create_trackfiz_calendar(self, token: GoogleCalendarToken, db: AsyncSession) -> str:
        """
        Obtiene o crea un calendario "Trackfiz" separado para las sesiones.
        
        Args:
            token: Token OAuth
            db: Sesión de base de datos
            
        Returns:
            ID del calendario Trackfiz
        """
        try:
            service = self._get_calendar_service(token)
            loop = asyncio.get_event_loop()
            
            # Buscar si ya existe un calendario Trackfiz (ejecutar en thread pool)
            print("[Google Calendar] Buscando calendarios existentes...")
            calendar_list = await loop.run_in_executor(
                _executor,
                lambda: service.calendarList().list().execute()
            )
            
            for calendar in calendar_list.get('items', []):
                if calendar.get('summary') == 'Trackfiz':
                    calendar_id = calendar['id']
                    print(f"[Google Calendar] Calendario Trackfiz encontrado: {calendar_id}")
                    
                    # Actualizar el token con el calendar_id si no lo tiene
                    if token.calendar_id != calendar_id:
                        token.calendar_id = calendar_id
                        token.calendar_name = 'Trackfiz'
                        await db.commit()
                    
                    return calendar_id
            
            # No existe, crear uno nuevo
            print("[Google Calendar] Creando calendario Trackfiz...")
            new_calendar = {
                'summary': 'Trackfiz',
                'description': 'Sesiones y reservas de Trackfiz',
                'timeZone': 'Europe/Madrid',
            }
            
            created_calendar = await loop.run_in_executor(
                _executor,
                lambda: service.calendars().insert(body=new_calendar).execute()
            )
            calendar_id = created_calendar['id']
            
            print(f"[Google Calendar] Calendario Trackfiz creado: {calendar_id}")
            
            # Actualizar el token con el nuevo calendar_id
            token.calendar_id = calendar_id
            token.calendar_name = 'Trackfiz'
            await db.commit()
            
            return calendar_id
            
        except HttpError as e:
            print(f"[Google Calendar] Error al crear/obtener calendario Trackfiz: {e.reason}")
            import traceback
            traceback.print_exc()
            # Fallback al calendario principal
            return token.calendar_id or 'primary'
        except Exception as e:
            print(f"[Google Calendar] Error inesperado en get_or_create_trackfiz_calendar: {e}")
            import traceback
            traceback.print_exc()
            return token.calendar_id or 'primary'
    
    async def get_calendar_info(self, token: GoogleCalendarToken) -> dict:
        """
        Obtiene información del calendario.
        
        Args:
            token: Token OAuth
            
        Returns:
            dict con info del calendario
        """
        try:
            service = self._get_calendar_service(token)
            calendar = service.calendars().get(calendarId=token.calendar_id or 'primary').execute()
            
            return {
                "id": calendar.get("id"),
                "name": calendar.get("summary"),
                "timezone": calendar.get("timeZone"),
            }
        except HttpError as e:
            raise GoogleCalendarError(f"Error al obtener calendario: {e.reason}", e.resp.status)
    
    def _booking_to_event(self, booking: Booking, client: Optional[Client] = None) -> dict:
        """
        Convierte un Booking a formato de evento de Google Calendar.
        
        Args:
            booking: Booking de Trackfiz
            client: Cliente asociado (opcional)
            
        Returns:
            dict en formato de evento de Google
        """
        # Preparar título con indicador de estado
        title = booking.title
        status_emoji = ""
        
        if booking.status == BookingStatus.completed:
            status_emoji = "✅ "
        elif booking.status == BookingStatus.cancelled:
            status_emoji = "❌ "
        elif booking.status == BookingStatus.no_show:
            status_emoji = "⚠️ "
        
        event = {
            "summary": f"{status_emoji}{title}",
            "description": booking.description or "",
            "start": {
                "dateTime": booking.start_time.isoformat(),
                "timeZone": "Europe/Madrid",  # TODO: usar timezone del workspace
            },
            "end": {
                "dateTime": booking.end_time.isoformat(),
                "timeZone": "Europe/Madrid",
            },
        }
        
        # Añadir información de estado a la descripción
        status_text = {
            BookingStatus.pending: "⏳ Pendiente de confirmar",
            BookingStatus.confirmed: "✅ Confirmada",
            BookingStatus.completed: "✅ Completada",
            BookingStatus.cancelled: "❌ Cancelada",
            BookingStatus.no_show: "⚠️ No asistió",
        }.get(booking.status, "")
        
        if status_text:
            event["description"] = f"Estado: {status_text}\n\n{event['description']}"
        
        # Añadir ubicación
        location = booking.location or {}
        if location.get("type") == "in_person" and location.get("address"):
            event["location"] = location["address"]
        elif location.get("type") == "online" and location.get("online_link"):
            event["description"] += f"\n\nEnlace de videollamada: {location['online_link']}"
        
        # Añadir cliente como asistente si tiene email
        if client and client.email:
            event["attendees"] = [{"email": client.email}]
        
        # NO marcar el evento como "cancelled" en Google Calendar porque lo oculta/elimina.
        # En su lugar, usamos emoji, color gris y texto en descripción para indicar cancelación.
        # El evento solo se elimina cuando el usuario usa el botón "Eliminar".
        
        # Color del evento según estado (colorId de Google Calendar)
        # 1=azul, 2=verde, 3=púrpura, 4=rojo, 5=amarillo, 6=naranja, 7=turquesa, 8=gris, 9=azul oscuro, 10=verde oscuro, 11=rojo oscuro
        color_map = {
            BookingStatus.pending: "5",     # Amarillo
            BookingStatus.confirmed: "1",   # Azul
            BookingStatus.completed: "10",  # Verde oscuro
            BookingStatus.cancelled: "8",   # Gris
            BookingStatus.no_show: "11",    # Rojo oscuro
        }
        if booking.status in color_map:
            event["colorId"] = color_map[booking.status]
        
        # Añadir metadata de Trackfiz
        event["extendedProperties"] = {
            "private": {
                "trackfiz_booking_id": str(booking.id),
                "trackfiz_source": "trackfiz",
                "trackfiz_status": booking.status.value if booking.status else "unknown",
            }
        }
        
        return event
    
    async def create_event(
        self, 
        booking: Booking, 
        token: GoogleCalendarToken,
        client: Optional[Client] = None
    ) -> str:
        """
        Crea un evento en Google Calendar.
        
        Args:
            booking: Booking de Trackfiz
            token: Token OAuth
            client: Cliente asociado
            
        Returns:
            ID del evento creado en Google
        """
        try:
            service = self._get_calendar_service(token)
            event = self._booking_to_event(booking, client)
            calendar_id = token.calendar_id or 'primary'
            
            loop = asyncio.get_event_loop()
            created = await loop.run_in_executor(
                _executor,
                lambda: service.events().insert(
                    calendarId=calendar_id,
                    body=event,
                    sendUpdates='none'
                ).execute()
            )
            
            return created.get('id')
            
        except HttpError as e:
            raise GoogleCalendarError(f"Error al crear evento: {e.reason}", e.resp.status)
    
    async def update_event(
        self,
        google_event_id: str,
        booking: Booking,
        token: GoogleCalendarToken,
        client: Optional[Client] = None
    ) -> None:
        """
        Actualiza un evento en Google Calendar.
        
        Args:
            google_event_id: ID del evento en Google
            booking: Booking actualizado
            token: Token OAuth
            client: Cliente asociado
        """
        try:
            service = self._get_calendar_service(token)
            event = self._booking_to_event(booking, client)
            calendar_id = token.calendar_id or 'primary'
            
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(
                _executor,
                lambda: service.events().update(
                    calendarId=calendar_id,
                    eventId=google_event_id,
                    body=event,
                    sendUpdates='none'
                ).execute()
            )
            
        except HttpError as e:
            if e.resp.status == 404:
                # Evento no existe, crear uno nuevo
                return await self.create_event(booking, token, client)
            raise GoogleCalendarError(f"Error al actualizar evento: {e.reason}", e.resp.status)
    
    async def delete_event(
        self,
        google_event_id: str,
        token: GoogleCalendarToken
    ) -> None:
        """
        Elimina un evento de Google Calendar.
        
        Args:
            google_event_id: ID del evento en Google
            token: Token OAuth
        """
        try:
            service = self._get_calendar_service(token)
            loop = asyncio.get_event_loop()
            
            calendar_id = token.calendar_id or 'primary'
            await loop.run_in_executor(
                _executor,
                lambda: service.events().delete(
                    calendarId=calendar_id,
                    eventId=google_event_id,
                    sendUpdates='none'
                ).execute()
            )
            
        except HttpError as e:
            if e.resp.status != 404:  # Ignorar si ya no existe
                raise GoogleCalendarError(f"Error al eliminar evento: {e.reason}", e.resp.status)
    
    # ============ SYNC OPERATIONS ============
    
    async def sync_booking_to_google(
        self,
        booking: Booking,
        user_id: UUID,
        db: AsyncSession,
        client: Optional[Client] = None
    ) -> Optional[str]:
        """
        Sincroniza un booking a Google Calendar del usuario.
        
        Args:
            booking: Booking a sincronizar
            user_id: ID del usuario cuyo calendario usar
            db: Sesión de base de datos
            client: Cliente asociado al booking
            
        Returns:
            ID del evento en Google o None si no hay token
        """
        print(f"[Google Calendar] sync_booking_to_google llamado para booking {booking.id}, user {user_id}")
        
        # Buscar token del usuario
        result = await db.execute(
            select(GoogleCalendarToken).where(
                and_(
                    GoogleCalendarToken.user_id == user_id,
                    GoogleCalendarToken.workspace_id == booking.workspace_id,
                    GoogleCalendarToken.sync_enabled == True
                )
            )
        )
        token = result.scalar_one_or_none()
        
        if not token:
            print(f"[Google Calendar] No hay token para usuario {user_id} en workspace {booking.workspace_id}")
            return None
        
        print(f"[Google Calendar] Token encontrado, calendar_id: {token.calendar_id}")
        
        # Asegurar token válido
        token = await self.ensure_valid_token(token, db)
        
        # Asegurar que existe el calendario Trackfiz y actualizar token.calendar_id si es necesario
        if not token.calendar_id or token.calendar_id == 'primary':
            print(f"[Google Calendar] Creando/obteniendo calendario Trackfiz...")
            calendar_id = await self.get_or_create_trackfiz_calendar(token, db)
            await db.refresh(token)
            print(f"[Google Calendar] Usando calendario: {token.calendar_id}")
        
        # Buscar mapping existente
        result = await db.execute(
            select(CalendarSyncMapping).where(
                and_(
                    CalendarSyncMapping.booking_id == booking.id,
                    CalendarSyncMapping.user_id == user_id
                )
            )
        )
        mapping = result.scalar_one_or_none()
        
        try:
            if mapping:
                # Actualizar evento existente
                print(f"[Google Calendar] Actualizando evento existente {mapping.google_event_id} para booking {booking.id}")
                await self.update_event(mapping.google_event_id, booking, token, client)
                mapping.last_synced_at = datetime.now(timezone.utc)
            else:
                # Crear nuevo evento
                print(f"[Google Calendar] Creando nuevo evento para booking {booking.id} en calendario {token.calendar_id}")
                google_event_id = await self.create_event(booking, token, client)
                print(f"[Google Calendar] Evento creado con ID: {google_event_id}")
                
                # Guardar mapping
                mapping = CalendarSyncMapping(
                    booking_id=booking.id,
                    user_id=user_id,
                    google_event_id=google_event_id,
                    google_calendar_id=token.calendar_id or 'primary',
                    last_synced_at=datetime.now(timezone.utc),
                    sync_direction='trackfiz_to_google'
                )
                db.add(mapping)
            
            await db.commit()
            return mapping.google_event_id
            
        except GoogleCalendarError as e:
            print(f"[Google Calendar] GoogleCalendarError sincronizando booking {booking.id}: {e.message}")
            return None
        except Exception as e:
            print(f"[Google Calendar] Error inesperado sincronizando booking {booking.id}: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    async def delete_booking_from_google(
        self,
        booking_id: UUID,
        user_id: UUID,
        db: AsyncSession
    ) -> bool:
        """
        Elimina un booking de Google Calendar.
        
        Args:
            booking_id: ID del booking
            user_id: ID del usuario
            db: Sesión de base de datos
            
        Returns:
            True si se eliminó correctamente
        """
        # Buscar mapping
        result = await db.execute(
            select(CalendarSyncMapping).where(
                and_(
                    CalendarSyncMapping.booking_id == booking_id,
                    CalendarSyncMapping.user_id == user_id
                )
            )
        )
        mapping = result.scalar_one_or_none()
        
        if not mapping:
            return False
        
        # Buscar token
        result = await db.execute(
            select(GoogleCalendarToken).where(
                GoogleCalendarToken.user_id == user_id
            )
        )
        token = result.scalar_one_or_none()
        
        if not token:
            return False
        
        try:
            token = await self.ensure_valid_token(token, db)
            await self.delete_event(mapping.google_event_id, token)
            
            # Eliminar mapping
            await db.delete(mapping)
            await db.commit()
            
            return True
            
        except GoogleCalendarError as e:
            print(f"[Google Calendar] Error eliminando evento: {e.message}")
            return False
    
    async def get_events_from_google(
        self,
        token: GoogleCalendarToken,
        time_min: Optional[datetime] = None,
        time_max: Optional[datetime] = None,
        max_results: int = 100,
        calendar_id: Optional[str] = None
    ) -> list:
        """
        Obtiene eventos de Google Calendar.
        
        Args:
            token: Token OAuth
            time_min: Fecha mínima
            time_max: Fecha máxima
            max_results: Número máximo de resultados
            calendar_id: ID del calendario (default: token.calendar_id o 'primary')
            
        Returns:
            Lista de eventos
        """
        try:
            service = self._get_calendar_service(token)
            loop = asyncio.get_event_loop()
            
            target_calendar = calendar_id or token.calendar_id or 'primary'
            
            params = {
                "calendarId": target_calendar,
                "maxResults": max_results,
                "singleEvents": True,
                "orderBy": "startTime",
            }
            
            # Formatear fechas en RFC3339 - Google Calendar requiere formato específico
            if time_min:
                # Remover microsegundos y asegurar formato correcto
                time_min_clean = time_min.replace(microsecond=0)
                if time_min_clean.tzinfo is None:
                    params["timeMin"] = time_min_clean.isoformat() + "Z"
                else:
                    params["timeMin"] = time_min_clean.isoformat()
            if time_max:
                time_max_clean = time_max.replace(microsecond=0)
                if time_max_clean.tzinfo is None:
                    params["timeMax"] = time_max_clean.isoformat() + "Z"
                else:
                    params["timeMax"] = time_max_clean.isoformat()
            
            result = await loop.run_in_executor(
                _executor,
                lambda: service.events().list(**params).execute()
            )
            
            return result.get('items', [])
            
        except HttpError as e:
            raise GoogleCalendarError(f"Error al obtener eventos: {e.reason}", e.resp.status)
    
    async def get_all_user_events(
        self,
        token: GoogleCalendarToken,
        time_min: Optional[datetime] = None,
        time_max: Optional[datetime] = None,
        include_trackfiz: bool = True
    ) -> list:
        """
        Obtiene todos los eventos del usuario de todos sus calendarios visibles.
        Útil para mostrar disponibilidad completa.
        
        Args:
            token: Token OAuth
            time_min: Fecha mínima
            time_max: Fecha máxima
            include_trackfiz: Si incluir eventos del calendario Trackfiz
            
        Returns:
            Lista de eventos de todos los calendarios
        """
        try:
            service = self._get_calendar_service(token)
            loop = asyncio.get_event_loop()
            
            # Obtener lista de calendarios del usuario (en thread pool)
            print("[Google Calendar] Obteniendo lista de calendarios del usuario...")
            calendar_list = await loop.run_in_executor(
                _executor,
                lambda: service.calendarList().list().execute()
            )
            
            all_events = []
            trackfiz_calendar_id = token.calendar_id if token.calendar_name == 'Trackfiz' else None
            
            print(f"[Google Calendar] Encontrados {len(calendar_list.get('items', []))} calendarios")
            
            for calendar in calendar_list.get('items', []):
                calendar_id = calendar['id']
                calendar_name = calendar.get('summary', 'Sin nombre')
                
                # Saltar Trackfiz si no se quiere incluir
                if not include_trackfiz and calendar_id == trackfiz_calendar_id:
                    print(f"[Google Calendar] Saltando calendario Trackfiz: {calendar_name}")
                    continue
                
                # Solo calendarios que el usuario puede ver
                if calendar.get('accessRole') not in ['owner', 'writer', 'reader']:
                    continue
                
                try:
                    print(f"[Google Calendar] Obteniendo eventos de: {calendar_name}")
                    events = await self.get_events_from_google(
                        token=token,
                        time_min=time_min,
                        time_max=time_max,
                        calendar_id=calendar_id
                    )
                    
                    print(f"[Google Calendar] {len(events)} eventos en {calendar_name}")
                    
                    # Añadir metadata del calendario a cada evento
                    for event in events:
                        event['_calendar_id'] = calendar_id
                        event['_calendar_name'] = calendar_name
                        event['_is_trackfiz'] = (calendar_id == trackfiz_calendar_id)
                    
                    all_events.extend(events)
                    
                except Exception as e:
                    print(f"[Google Calendar] Error obteniendo eventos de {calendar_name}: {e}")
                    continue
            
            # Ordenar por fecha de inicio
            all_events.sort(key=lambda e: e.get('start', {}).get('dateTime', e.get('start', {}).get('date', '')))
            
            return all_events
            
        except HttpError as e:
            raise GoogleCalendarError(f"Error al obtener calendarios: {e.reason}", e.resp.status)
    
    # ============ PUSH NOTIFICATIONS ============
    
    async def setup_push_notifications(
        self,
        token: GoogleCalendarToken,
        webhook_url: str,
        db: AsyncSession
    ) -> dict:
        """
        Configura push notifications para cambios en el calendario.
        
        Args:
            token: Token OAuth
            webhook_url: URL del webhook para recibir notificaciones
            db: Sesión de base de datos
            
        Returns:
            dict con channel_id y expiration
        """
        try:
            service = self._get_calendar_service(token)
            
            channel_id = secrets.token_urlsafe(32)
            
            # Las notificaciones expiran en 7 días máximo
            expiration = datetime.now(timezone.utc) + timedelta(days=7)
            
            body = {
                "id": channel_id,
                "type": "web_hook",
                "address": webhook_url,
                "expiration": int(expiration.timestamp() * 1000),
            }
            
            result = service.events().watch(
                calendarId=token.calendar_id or 'primary',
                body=body
            ).execute()
            
            # Guardar info del canal
            token.channel_id = result.get('id')
            token.channel_resource_id = result.get('resourceId')
            token.channel_expiry = datetime.fromtimestamp(int(result.get('expiration', 0)) / 1000)
            
            await db.commit()
            
            return {
                "channel_id": token.channel_id,
                "expiration": token.channel_expiry,
            }
            
        except HttpError as e:
            raise GoogleCalendarError(f"Error configurando push notifications: {e.reason}", e.resp.status)
    
    async def stop_push_notifications(
        self,
        token: GoogleCalendarToken
    ) -> None:
        """
        Detiene las push notifications de un canal.
        
        Args:
            token: Token OAuth con info del canal
        """
        if not token.channel_id or not token.channel_resource_id:
            return
        
        try:
            service = self._get_calendar_service(token)
            
            service.channels().stop(body={
                "id": token.channel_id,
                "resourceId": token.channel_resource_id,
            }).execute()
            
        except HttpError:
            # Ignorar errores al detener (el canal puede haber expirado)
            pass


# Instancia singleton del servicio
google_calendar_service = GoogleCalendarService()
