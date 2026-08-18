"""Client reports model — coach review notes for each client."""
from sqlalchemy import Column, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.models.base import BaseModel


class ClientReport(BaseModel):
    """A review note written by the coach for a client.

    Each report represents a single check-in / revision entry — the coach
    writes what they observed, changes to the plan, and general feedback.
    """

    __tablename__ = "client_reports"

    workspace_id = Column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    client_id = Column(
        UUID(as_uuid=True),
        ForeignKey("clients.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    created_by = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    title = Column(Text, nullable=True)
    body = Column(Text, nullable=False)
    client_feedback = Column(Text, nullable=True)

    client = relationship("Client", backref="reports")

    def __repr__(self) -> str:
        return f"<ClientReport {self.id} client={self.client_id}>"
