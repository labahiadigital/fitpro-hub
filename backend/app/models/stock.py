"""Stock management models."""
from sqlalchemy import Column, String, Text, ForeignKey, Boolean, Numeric
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship, deferred

from app.models.base import BaseModel


class StockCategory(BaseModel):
    __tablename__ = "stock_categories"

    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(200), nullable=False)
    icon = Column(String(50), nullable=True)

    workspace = relationship("Workspace", lazy="selectin")
    items = relationship("StockItem", back_populates="category", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<StockCategory {self.name}>"


class StockItem(BaseModel):
    __tablename__ = "stock_items"

    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    category_id = Column(UUID(as_uuid=True), ForeignKey("stock_categories.id", ondelete="SET NULL"), nullable=True, index=True)
    name = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    unit = Column(String(20), nullable=False, server_default="ud")
    current_stock = Column(Numeric, nullable=False, server_default="0")
    min_stock = Column(Numeric, nullable=False, server_default="0")
    max_stock = Column(Numeric, nullable=False, server_default="0")
    price = Column(Numeric, nullable=False, server_default="0")
    location = Column(String(200), nullable=True)
    tax_rate = Column(Numeric, nullable=False, server_default="21")
    irpf_rate = Column(Numeric, nullable=False, server_default="0")
    is_active = Column(Boolean, nullable=False, server_default="true")
    # Asignación opcional a un box y/o proveedor ya existentes. Ambas
    # columnas se marcan ``deferred`` para que los SELECT por defecto no
    # las incluyan; así los listados siguen funcionando aunque la migración
    # 048 aún no esté aplicada en el entorno destino.
    box_id = deferred(
        Column(UUID(as_uuid=True), ForeignKey("boxes.id", ondelete="SET NULL"), nullable=True, index=True),
        group="box_id",
    )
    supplier_id = deferred(
        Column(UUID(as_uuid=True), ForeignKey("suppliers.id", ondelete="SET NULL"), nullable=True, index=True),
        group="supplier_id",
    )

    category = relationship("StockCategory", back_populates="items", lazy="selectin")
    movements = relationship("StockMovement", back_populates="item", cascade="all, delete-orphan")
    box_allocations = relationship(
        "StockItemBox",
        back_populates="item",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    def __repr__(self):
        return f"<StockItem {self.name}>"


class StockItemBox(BaseModel):
    """Distribución de stock de un artículo por box (multi-box).

    Permite que un mismo artículo de inventario tenga unidades repartidas
    en distintos boxes/sedes del workspace. Si la tabla está vacía para
    un item se considera que el stock vive en ``StockItem.current_stock``
    (modo legacy con un único box opcional en ``StockItem.box_id``).
    """

    __tablename__ = "stock_item_boxes"

    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    item_id = Column(UUID(as_uuid=True), ForeignKey("stock_items.id", ondelete="CASCADE"), nullable=False, index=True)
    box_id = Column(UUID(as_uuid=True), ForeignKey("boxes.id", ondelete="CASCADE"), nullable=False, index=True)
    current_stock = Column(Numeric, nullable=False, server_default="0")
    min_stock = Column(Numeric, nullable=False, server_default="0")
    max_stock = Column(Numeric, nullable=False, server_default="0")

    item = relationship("StockItem", back_populates="box_allocations", lazy="selectin")

    def __repr__(self):
        return f"<StockItemBox item={self.item_id} box={self.box_id} qty={self.current_stock}>"


class StockMovement(BaseModel):
    __tablename__ = "stock_movements"

    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    item_id = Column(UUID(as_uuid=True), ForeignKey("stock_items.id", ondelete="CASCADE"), nullable=False, index=True)
    movement_type = Column(String(20), nullable=False)
    quantity = Column(Numeric, nullable=False)
    previous_stock = Column(Numeric, nullable=False, server_default="0")
    new_stock = Column(Numeric, nullable=False, server_default="0")
    reason = Column(Text, nullable=False)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    box_id = deferred(
        Column(UUID(as_uuid=True), ForeignKey("boxes.id", ondelete="SET NULL"), nullable=True, index=True),
        group="box_id",
    )

    item = relationship("StockItem", back_populates="movements", lazy="selectin")

    def __repr__(self):
        return f"<StockMovement {self.movement_type} qty={self.quantity}>"
