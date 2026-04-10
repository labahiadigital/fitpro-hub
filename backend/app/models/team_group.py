"""Team group models for workspace team organization."""
from sqlalchemy import Column, String, Text, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from app.models.base import BaseModel


class TeamGroup(BaseModel):
    __tablename__ = "team_groups"

    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    color = Column(String(20), nullable=True, default="blue")
    permissions = Column(JSONB, nullable=False, default=dict, server_default="{}")

    members = relationship("TeamGroupMember", back_populates="group", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<TeamGroup {self.name}>"


class TeamGroupMember(BaseModel):
    __tablename__ = "team_group_members"
    __table_args__ = (
        UniqueConstraint("group_id", "user_id", name="uq_group_member"),
    )

    group_id = Column(UUID(as_uuid=True), ForeignKey("team_groups.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    group = relationship("TeamGroup", back_populates="members")

    def __repr__(self):
        return f"<TeamGroupMember group={self.group_id} user={self.user_id}>"
