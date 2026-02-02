"""
Google Calendar Integration Models

Modelos para almacenar tokens OAuth y mapeos de sincronización
entre bookings de Trackfiz y eventos de Google Calendar.
"""
from sqlalchemy import Column, String, Text, Boolean, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.models.base import BaseModel


class GoogleCalendarToken(BaseModel):
    """
    Almacena tokens OAuth de Google Calendar para cada usuario.
    Permite sincronización bidireccional con Google Calendar.
    """
    __tablename__ = "google_calendar_tokens"
    
    # Usuario y workspace
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # OAuth tokens (almacenados encriptados)
    access_token = Column(Text, nullable=False)
    refresh_token = Column(Text, nullable=False)
    token_expiry = Column(DateTime(timezone=True), nullable=False)
    
    # Información del calendario
    calendar_id = Column(String(255), default="primary")  # ID del calendario en Google
    calendar_name = Column(String(255), nullable=True)  # Nombre legible del calendario
    email = Column(String(255), nullable=True)  # Email de la cuenta de Google
    
    # Configuración de sincronización
    sync_enabled = Column(Boolean, default=True)
    last_sync_at = Column(DateTime(timezone=True), nullable=True)
    sync_token = Column(String(500), nullable=True)  # Para sincronización incremental
    
    # Push notifications (webhooks de Google)
    channel_id = Column(String(255), nullable=True)  # ID del canal de notificaciones
    channel_resource_id = Column(String(255), nullable=True)  # Resource ID del canal
    channel_expiry = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    user = relationship("User", backref="google_calendar_tokens")
    workspace = relationship("Workspace", backref="google_calendar_tokens")
    
    def __repr__(self):
        return f"<GoogleCalendarToken user={self.user_id} calendar={self.calendar_id}>"


class CalendarSyncMapping(BaseModel):
    """
    Mapeo entre bookings de Trackfiz y eventos de Google Calendar.
    Permite rastrear qué booking corresponde a qué evento en Google.
    """
    __tablename__ = "calendar_sync_mappings"
    
    # Booking local
    booking_id = Column(UUID(as_uuid=True), ForeignKey("bookings.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Usuario cuyo calendario contiene el evento
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Evento en Google Calendar
    google_event_id = Column(String(255), nullable=False, index=True)
    google_calendar_id = Column(String(255), nullable=False)
    
    # Tracking de sincronización
    last_synced_at = Column(DateTime(timezone=True), nullable=True)
    sync_direction = Column(String(50), default="trackfiz_to_google")  # trackfiz_to_google o google_to_trackfiz
    
    # Relationships
    booking = relationship("Booking", backref="calendar_sync_mappings")
    user = relationship("User", backref="calendar_sync_mappings")
    
    def __repr__(self):
        return f"<CalendarSyncMapping booking={self.booking_id} event={self.google_event_id}>"
