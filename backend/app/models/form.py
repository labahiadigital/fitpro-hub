from sqlalchemy import Column, String, Text, ForeignKey, DateTime, Boolean
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY
from sqlalchemy.orm import relationship, deferred

from app.models.base import BaseModel


class Form(BaseModel):
    __tablename__ = "forms"

    # NULL cuando el formulario es una plantilla global del sistema
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=True, index=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    # Form details
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    form_type = Column(String(50), default="custom")  # parq, custom, consent, etc.

    # Form schema (fields definition)
    schema = Column(JSONB, default=lambda: {
        "fields": []
    })

    # Settings
    settings = Column(JSONB, default=lambda: {
        "require_signature": False,
        "send_reminder": True,
        "reminder_days": 3,
        "allow_edit": False,
        "send_on_onboarding": False,
    })

    # Status
    is_active = Column(Boolean, default=True, nullable=False)

    # Plantilla del sistema (visible para todos los workspaces, no editable).
    # Para usarlo en el workspace propio debe copiarse (fork).
    is_global = Column(Boolean, default=False, nullable=False, index=True)

    # Obligatorio: cuando se envía a un cliente debe aparecer como
    # notificación persistente hasta que el cliente responda.
    is_required = Column(Boolean, default=False, nullable=False)

    # Productos a los que está vinculado el formulario. Cuando un cliente
    # compre o contrate un producto incluido en esta lista, el formulario
    # podrá enviarse automáticamente (o sugerirse) como parte del flujo.
    # Usamos ``deferred`` para que SQLAlchemy NO incluya la columna en el
    # SELECT por defecto: así los listados siguen funcionando aunque la
    # migración 045 no se haya aplicado todavía en el entorno destino.
    product_ids = deferred(
        Column(ARRAY(UUID(as_uuid=True)), nullable=False, server_default="{}"),
        group="product_ids",
    )

    # Relationships
    workspace = relationship("Workspace", back_populates="forms")
    submissions = relationship("FormSubmission", back_populates="form", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Form {self.name}>"


class FormSubmission(BaseModel):
    __tablename__ = "form_submissions"
    
    form_id = Column(UUID(as_uuid=True), ForeignKey("forms.id", ondelete="CASCADE"), nullable=False, index=True)
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Submission data
    answers = Column(JSONB, default=lambda: {})
    
    # Status
    status = Column(String(50), default="pending")  # pending, submitted, reviewed
    submitted_at = Column(DateTime(timezone=True), nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    reviewed_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    # Signature (if required)
    signature_data = Column(JSONB, nullable=True)  # Contains timestamp and signature image/hash
    
    # Relationships
    form = relationship("Form", back_populates="submissions")
    client = relationship("Client", back_populates="form_submissions")
    
    def __repr__(self):
        return f"<FormSubmission {self.form_id} by {self.client_id}>"

