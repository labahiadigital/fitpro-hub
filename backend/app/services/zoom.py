"""
Servicio de integración con Zoom API
"""

import base64
import hashlib
import hmac
import json
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
from uuid import UUID

import httpx
from pydantic import BaseModel


class ZoomMeeting(BaseModel):
    """Modelo de reunión de Zoom"""
    id: str
    topic: str
    start_time: datetime
    duration: int
    timezone: str
    join_url: str
    start_url: str
    password: Optional[str] = None


class ZoomService:
    """Servicio para integración con Zoom API"""

    ZOOM_API_BASE = "https://api.zoom.us/v2"
    ZOOM_OAUTH_BASE = "https://zoom.us/oauth"

    def __init__(
        self,
        account_id: str,
        client_id: str,
        client_secret: str,
        webhook_secret: Optional[str] = None,
    ):
        self.account_id = account_id
        self.client_id = client_id
        self.client_secret = client_secret
        self.webhook_secret = webhook_secret
        self._access_token: Optional[str] = None
        self._token_expires_at: Optional[datetime] = None

    async def _get_access_token(self) -> str:
        """Obtener token de acceso OAuth (Server-to-Server)"""
        if self._access_token and self._token_expires_at and datetime.utcnow() < self._token_expires_at:
            return self._access_token

        credentials = base64.b64encode(
            f"{self.client_id}:{self.client_secret}".encode()
        ).decode()

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.ZOOM_OAUTH_BASE}/token",
                headers={
                    "Authorization": f"Basic {credentials}",
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                data={
                    "grant_type": "account_credentials",
                    "account_id": self.account_id,
                },
            )
            response.raise_for_status()
            data = response.json()

            self._access_token = data["access_token"]
            expires_in = data.get("expires_in", 3600)
            self._token_expires_at = datetime.utcnow() + timedelta(seconds=expires_in - 60)

            return self._access_token

    async def _make_request(
        self,
        method: str,
        endpoint: str,
        data: Optional[Dict] = None,
    ) -> Dict[str, Any]:
        """Realizar petición a la API de Zoom"""
        token = await self._get_access_token()

        async with httpx.AsyncClient() as client:
            response = await client.request(
                method,
                f"{self.ZOOM_API_BASE}{endpoint}",
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json",
                },
                json=data,
            )
            response.raise_for_status()
            return response.json() if response.content else {}

    async def create_meeting(
        self,
        topic: str,
        start_time: datetime,
        duration: int = 60,
        timezone: str = "Europe/Madrid",
        password: Optional[str] = None,
        waiting_room: bool = True,
        auto_recording: str = "cloud",
        mute_upon_entry: bool = True,
        meeting_type: int = 2,  # 2 = Scheduled meeting
    ) -> ZoomMeeting:
        """Crear una reunión de Zoom"""
        meeting_data = {
            "topic": topic,
            "type": meeting_type,
            "start_time": start_time.strftime("%Y-%m-%dT%H:%M:%S"),
            "duration": duration,
            "timezone": timezone,
            "settings": {
                "waiting_room": waiting_room,
                "auto_recording": auto_recording,
                "mute_upon_entry": mute_upon_entry,
                "join_before_host": False,
                "approval_type": 0,  # Automatically approve
                "registration_type": 1,  # Attendees register once
            },
        }

        if password:
            meeting_data["password"] = password

        response = await self._make_request("POST", "/users/me/meetings", meeting_data)

        return ZoomMeeting(
            id=str(response["id"]),
            topic=response["topic"],
            start_time=datetime.fromisoformat(response["start_time"].replace("Z", "+00:00")),
            duration=response["duration"],
            timezone=response["timezone"],
            join_url=response["join_url"],
            start_url=response["start_url"],
            password=response.get("password"),
        )

    async def get_meeting(self, meeting_id: str) -> Dict[str, Any]:
        """Obtener información de una reunión"""
        return await self._make_request("GET", f"/meetings/{meeting_id}")

    async def update_meeting(
        self,
        meeting_id: str,
        topic: Optional[str] = None,
        start_time: Optional[datetime] = None,
        duration: Optional[int] = None,
    ) -> Dict[str, Any]:
        """Actualizar una reunión"""
        update_data = {}

        if topic:
            update_data["topic"] = topic
        if start_time:
            update_data["start_time"] = start_time.strftime("%Y-%m-%dT%H:%M:%S")
        if duration:
            update_data["duration"] = duration

        return await self._make_request("PATCH", f"/meetings/{meeting_id}", update_data)

    async def delete_meeting(self, meeting_id: str) -> None:
        """Eliminar una reunión"""
        await self._make_request("DELETE", f"/meetings/{meeting_id}")

    async def end_meeting(self, meeting_id: str) -> None:
        """Finalizar una reunión en curso"""
        await self._make_request("PUT", f"/meetings/{meeting_id}/status", {"action": "end"})

    async def list_meetings(
        self,
        meeting_type: str = "scheduled",  # scheduled, live, upcoming
        page_size: int = 30,
    ) -> List[Dict[str, Any]]:
        """Listar reuniones"""
        response = await self._make_request(
            "GET",
            f"/users/me/meetings?type={meeting_type}&page_size={page_size}",
        )
        return response.get("meetings", [])

    async def get_meeting_recordings(self, meeting_id: str) -> Dict[str, Any]:
        """Obtener grabaciones de una reunión"""
        return await self._make_request("GET", f"/meetings/{meeting_id}/recordings")

    async def get_meeting_participants(self, meeting_id: str) -> List[Dict[str, Any]]:
        """Obtener participantes de una reunión (después de finalizada)"""
        response = await self._make_request(
            "GET",
            f"/past_meetings/{meeting_id}/participants",
        )
        return response.get("participants", [])

    def verify_webhook_signature(
        self,
        payload: bytes,
        timestamp: str,
        signature: str,
    ) -> bool:
        """Verificar firma de webhook de Zoom"""
        if not self.webhook_secret:
            return False

        message = f"v0:{timestamp}:{payload.decode()}"
        expected_signature = "v0=" + hmac.new(
            self.webhook_secret.encode(),
            message.encode(),
            hashlib.sha256,
        ).hexdigest()

        return hmac.compare_digest(expected_signature, signature)

    def handle_webhook_event(self, event: Dict[str, Any]) -> Dict[str, Any]:
        """Procesar evento de webhook"""
        event_type = event.get("event")
        payload = event.get("payload", {})

        handlers = {
            "meeting.started": self._handle_meeting_started,
            "meeting.ended": self._handle_meeting_ended,
            "meeting.participant_joined": self._handle_participant_joined,
            "meeting.participant_left": self._handle_participant_left,
            "recording.completed": self._handle_recording_completed,
        }

        handler = handlers.get(event_type)
        if handler:
            return handler(payload)

        return {"event": event_type, "status": "unhandled"}

    def _handle_meeting_started(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Manejar evento de inicio de reunión"""
        meeting = payload.get("object", {})
        return {
            "event": "meeting.started",
            "meeting_id": meeting.get("id"),
            "start_time": meeting.get("start_time"),
        }

    def _handle_meeting_ended(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Manejar evento de fin de reunión"""
        meeting = payload.get("object", {})
        return {
            "event": "meeting.ended",
            "meeting_id": meeting.get("id"),
            "end_time": meeting.get("end_time"),
            "duration": meeting.get("duration"),
        }

    def _handle_participant_joined(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Manejar evento de participante unido"""
        meeting = payload.get("object", {})
        participant = meeting.get("participant", {})
        return {
            "event": "participant.joined",
            "meeting_id": meeting.get("id"),
            "participant_id": participant.get("id"),
            "participant_name": participant.get("user_name"),
            "participant_email": participant.get("email"),
            "join_time": participant.get("join_time"),
        }

    def _handle_participant_left(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Manejar evento de participante salido"""
        meeting = payload.get("object", {})
        participant = meeting.get("participant", {})
        return {
            "event": "participant.left",
            "meeting_id": meeting.get("id"),
            "participant_id": participant.get("id"),
            "participant_name": participant.get("user_name"),
            "leave_time": participant.get("leave_time"),
        }

    def _handle_recording_completed(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Manejar evento de grabación completada"""
        meeting = payload.get("object", {})
        recording_files = meeting.get("recording_files", [])

        video_url = None
        for file in recording_files:
            if file.get("file_type") == "MP4":
                video_url = file.get("download_url")
                break

        return {
            "event": "recording.completed",
            "meeting_id": meeting.get("id"),
            "recording_url": video_url,
            "recording_files": recording_files,
        }


class GoogleMeetService:
    """Servicio para integración con Google Meet (placeholder)"""

    def __init__(
        self,
        client_id: str,
        client_secret: str,
        refresh_token: str,
    ):
        self.client_id = client_id
        self.client_secret = client_secret
        self.refresh_token = refresh_token

    async def create_meeting(
        self,
        summary: str,
        start_time: datetime,
        end_time: datetime,
        attendees: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """Crear una reunión de Google Meet via Calendar API"""
        # TODO: Implementar integración con Google Calendar API
        # Por ahora retornamos un placeholder
        return {
            "id": "placeholder",
            "hangoutLink": "https://meet.google.com/placeholder",
            "summary": summary,
            "start": start_time.isoformat(),
            "end": end_time.isoformat(),
        }


class MicrosoftTeamsService:
    """Servicio para integración con Microsoft Teams (placeholder)"""

    def __init__(
        self,
        tenant_id: str,
        client_id: str,
        client_secret: str,
    ):
        self.tenant_id = tenant_id
        self.client_id = client_id
        self.client_secret = client_secret

    async def create_meeting(
        self,
        subject: str,
        start_time: datetime,
        end_time: datetime,
    ) -> Dict[str, Any]:
        """Crear una reunión de Teams via Graph API"""
        # TODO: Implementar integración con Microsoft Graph API
        return {
            "id": "placeholder",
            "joinUrl": "https://teams.microsoft.com/placeholder",
            "subject": subject,
            "startDateTime": start_time.isoformat(),
            "endDateTime": end_time.isoformat(),
        }
