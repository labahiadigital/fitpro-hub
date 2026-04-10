"""Box, Machine, Service-enhanced, and Appointment models."""
from sqlalchemy import Column, String, Text, ForeignKey, Boolean, Integer, Numeric, DateTime, Table
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.models.base import BaseModel


# ── M2M: Service <-> Machine ──
service_machines = Table(
    "service_machines",
    BaseModel.metadata,
    Column("service_id", UUID(as_uuid=True), ForeignKey("services.id", ondelete="CASCADE"), primary_key=True),
    Column("machine_id", UUID(as_uuid=True), ForeignKey("machines.id", ondelete="CASCADE"), primary_key=True),
)

# ── M2M: Appointment <-> Machine ──
appointment_machines = Table(
    "appointment_machines",
    BaseModel.metadata,
    Column("appointment_id", UUID(as_uuid=True), ForeignKey("appointments.id", ondelete="CASCADE"), primary_key=True),
    Column("machine_id", UUID(as_uuid=True), ForeignKey("machines.id", ondelete="CASCADE"), primary_key=True),
)


class Box(BaseModel):
    __tablename__ = "boxes"

    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    color_hex = Column(String(7), nullable=False, server_default="#3B82F6")
    is_active = Column(Boolean, nullable=False, server_default="true")
    sort_order = Column(Integer, nullable=False, server_default="0")

    workspace = relationship("Workspace", lazy="selectin")
    machines = relationship("Machine", back_populates="fixed_box", foreign_keys="[Machine.fixed_box_id]")
    appointments = relationship("Appointment", back_populates="box")

    def __repr__(self):
        return f"<Box {self.name}>"


class Machine(BaseModel):
    __tablename__ = "machines"

    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    color_hex = Column(String(7), nullable=False, server_default="#8B5CF6")
    is_active = Column(Boolean, nullable=False, server_default="true")
    fixed_box_id = Column(UUID(as_uuid=True), ForeignKey("boxes.id", ondelete="SET NULL"), nullable=True, index=True)

    workspace = relationship("Workspace", lazy="selectin")
    fixed_box = relationship("Box", back_populates="machines", foreign_keys=[fixed_box_id], lazy="selectin")
    services = relationship("Service", secondary=service_machines, back_populates="machines")
    appointments = relationship("Appointment", secondary=appointment_machines, back_populates="machines_used")

    def __repr__(self):
        return f"<Machine {self.name}>"


class Service(BaseModel):
    __tablename__ = "services"

    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(300), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(100), nullable=True)
    price = Column(Numeric(10, 2), nullable=False, server_default="0")
    duration_minutes = Column(Integer, nullable=False, server_default="60")
    tax_percentage = Column(Numeric(5, 2), nullable=False, server_default="21")
    retention_percentage = Column(Numeric(5, 2), nullable=False, server_default="0")
    default_box_id = Column(UUID(as_uuid=True), ForeignKey("boxes.id", ondelete="SET NULL"), nullable=True, index=True)
    is_active = Column(Boolean, nullable=False, server_default="true")
    show_online = Column(Boolean, nullable=False, server_default="true")
    color_hex = Column(String(7), nullable=False, server_default="#10B981")

    workspace = relationship("Workspace", lazy="selectin")
    default_box = relationship("Box", lazy="selectin")
    machines = relationship("Machine", secondary=service_machines, back_populates="services")
    staff_assignments = relationship("ServiceStaff", back_populates="service", cascade="all, delete-orphan")
    stock_consumption = relationship("ServiceStockConsumption", back_populates="service", cascade="all, delete-orphan")
    appointments = relationship("Appointment", back_populates="service")

    def __repr__(self):
        return f"<Service {self.name}>"


class ServiceStaff(BaseModel):
    """M2M with extra: which staff members can perform this service."""
    __tablename__ = "service_staff"

    service_id = Column(UUID(as_uuid=True), ForeignKey("services.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    is_primary = Column(Boolean, nullable=False, server_default="false")

    service = relationship("Service", back_populates="staff_assignments")
    user = relationship("User", lazy="selectin")

    def __repr__(self):
        return f"<ServiceStaff service={self.service_id} user={self.user_id} primary={self.is_primary}>"


class ServiceStockConsumption(BaseModel):
    """M2M with extra: stock consumed when a service appointment is attended."""
    __tablename__ = "service_stock_consumption"

    service_id = Column(UUID(as_uuid=True), ForeignKey("services.id", ondelete="CASCADE"), nullable=False, index=True)
    stock_item_id = Column(UUID(as_uuid=True), ForeignKey("stock_items.id", ondelete="CASCADE"), nullable=False, index=True)
    quantity = Column(Numeric(10, 2), nullable=False, server_default="1")

    service = relationship("Service", back_populates="stock_consumption")
    stock_item = relationship("StockItem", lazy="selectin")

    def __repr__(self):
        return f"<ServiceStockConsumption service={self.service_id} item={self.stock_item_id} qty={self.quantity}>"


class Appointment(BaseModel):
    __tablename__ = "appointments"

    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    service_id = Column(UUID(as_uuid=True), ForeignKey("services.id", ondelete="SET NULL"), nullable=True, index=True)
    staff_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id", ondelete="SET NULL"), nullable=True, index=True)
    box_id = Column(UUID(as_uuid=True), ForeignKey("boxes.id", ondelete="SET NULL"), nullable=True, index=True)
    start_time = Column(DateTime(timezone=True), nullable=False, index=True)
    end_time = Column(DateTime(timezone=True), nullable=False, index=True)
    status = Column(String(20), nullable=False, server_default="pending")
    notes = Column(Text, nullable=True)

    workspace = relationship("Workspace", lazy="selectin")
    service = relationship("Service", back_populates="appointments", lazy="selectin")
    staff = relationship("User", lazy="selectin")
    client = relationship("Client", lazy="selectin")
    box = relationship("Box", back_populates="appointments", lazy="selectin")
    machines_used = relationship("Machine", secondary=appointment_machines, back_populates="appointments")

    def __repr__(self):
        return f"<Appointment {self.id} status={self.status}>"
