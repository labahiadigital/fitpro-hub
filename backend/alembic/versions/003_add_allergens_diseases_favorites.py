"""add allergens diseases and favorites

Revision ID: 003
Revises: 002
Create Date: 2026-01-14
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '003'
down_revision = '002'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add allergens and diseases to client model
    # These will be stored in health_data JSONB field with specific keys
    
    # Add favorites table for foods
    op.create_table('food_favorites',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('workspace_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('food_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.String(), nullable=False),
        sa.Column('updated_at', sa.String(), nullable=False),
        sa.ForeignKeyConstraint(['food_id'], ['foods.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['workspace_id'], ['workspaces.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'food_id', name='unique_user_food_favorite')
    )
    op.create_index(op.f('ix_food_favorites_user_id'), 'food_favorites', ['user_id'])
    op.create_index(op.f('ix_food_favorites_workspace_id'), 'food_favorites', ['workspace_id'])
    
    # Add custom foods table (linked to workspace, not global)
    op.create_table('custom_foods',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('workspace_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('name', sa.Text(), nullable=False),
        sa.Column('brand', sa.Text(), nullable=True),
        sa.Column('category_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('serving_size', sa.Numeric(), nullable=False, server_default='100'),
        sa.Column('serving_unit', sa.Text(), nullable=False, server_default='g'),
        
        # Nutritional info (all per 1g)
        sa.Column('calories', sa.Numeric(), nullable=False, server_default='0'),
        sa.Column('protein_g', sa.Numeric(), nullable=False, server_default='0'),
        sa.Column('carbs_g', sa.Numeric(), nullable=False, server_default='0'),
        sa.Column('fat_g', sa.Numeric(), nullable=False, server_default='0'),
        sa.Column('fiber_g', sa.Numeric(), nullable=False, server_default='0'),
        sa.Column('sugars_g', sa.Numeric(), nullable=False, server_default='0'),
        sa.Column('saturated_fat_g', sa.Numeric(), nullable=False, server_default='0'),
        sa.Column('sodium_mg', sa.Numeric(), nullable=False, server_default='0'),
        
        # Additional details
        sa.Column('ingredients', sa.Text(), nullable=True),
        sa.Column('allergens', sa.Text(), nullable=True),
        sa.Column('image_url', sa.Text(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        
        sa.Column('created_at', sa.String(), nullable=False),
        sa.Column('updated_at', sa.String(), nullable=False),
        sa.ForeignKeyConstraint(['category_id'], ['food_categories.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['workspace_id'], ['workspaces.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_custom_foods_workspace_id'), 'custom_foods', ['workspace_id'])
    op.create_index(op.f('ix_custom_foods_name'), 'custom_foods', ['name'])
    
    # Add meal plan structure improvements
    # Add meal_times to meal plan (JSON structure with customizable meal times)
    op.add_column('meal_plans', sa.Column('meal_times', postgresql.JSONB(), 
        server_default=sa.text("'{\"meals\": [{\"name\": \"Comida 1\", \"time\": \"08:00\"}, {\"name\": \"Comida 2\", \"time\": \"13:00\"}, {\"name\": \"Comida 3\", \"time\": \"20:00\"}]}'::jsonb"),
        nullable=False
    ))
    
    # Add supplement favorites
    op.create_table('supplement_favorites',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('workspace_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('supplement_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.String(), nullable=False),
        sa.Column('updated_at', sa.String(), nullable=False),
        sa.ForeignKeyConstraint(['supplement_id'], ['supplements.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['workspace_id'], ['workspaces.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'supplement_id', name='unique_user_supplement_favorite')
    )
    op.create_index(op.f('ix_supplement_favorites_user_id'), 'supplement_favorites', ['user_id'])
    op.create_index(op.f('ix_supplement_favorites_workspace_id'), 'supplement_favorites', ['workspace_id'])
    
    # Add how_to_take to supplement_recommendations
    op.add_column('supplement_recommendations', sa.Column('how_to_take', sa.Text(), nullable=True))
    op.add_column('supplement_recommendations', sa.Column('timing', sa.Text(), nullable=True))  # e.g., "Antes del entrenamiento", "Con comida"
    
    # Add reminder settings to notifications
    op.create_table('reminder_settings',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('workspace_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('client_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('reminder_type', sa.String(50), nullable=False),  # 'workout', 'nutrition', 'supplement', 'check_in'
        sa.Column('frequency_days', sa.Integer(), nullable=False, server_default='15'),  # Every N days
        sa.Column('last_sent', sa.String(), nullable=True),
        sa.Column('next_scheduled', sa.String(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('custom_message', sa.Text(), nullable=True),
        sa.Column('created_at', sa.String(), nullable=False),
        sa.Column('updated_at', sa.String(), nullable=False),
        sa.ForeignKeyConstraint(['workspace_id'], ['workspaces.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['client_id'], ['clients.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_reminder_settings_workspace_id'), 'reminder_settings', ['workspace_id'])
    op.create_index(op.f('ix_reminder_settings_user_id'), 'reminder_settings', ['user_id'])
    op.create_index(op.f('ix_reminder_settings_client_id'), 'reminder_settings', ['client_id'])
    op.create_index(op.f('ix_reminder_settings_next_scheduled'), 'reminder_settings', ['next_scheduled'])


def downgrade() -> None:
    op.drop_index(op.f('ix_reminder_settings_next_scheduled'), table_name='reminder_settings')
    op.drop_index(op.f('ix_reminder_settings_client_id'), table_name='reminder_settings')
    op.drop_index(op.f('ix_reminder_settings_user_id'), table_name='reminder_settings')
    op.drop_index(op.f('ix_reminder_settings_workspace_id'), table_name='reminder_settings')
    op.drop_table('reminder_settings')
    
    op.drop_column('supplement_recommendations', 'timing')
    op.drop_column('supplement_recommendations', 'how_to_take')
    
    op.drop_index(op.f('ix_supplement_favorites_workspace_id'), table_name='supplement_favorites')
    op.drop_index(op.f('ix_supplement_favorites_user_id'), table_name='supplement_favorites')
    op.drop_table('supplement_favorites')
    
    op.drop_column('meal_plans', 'meal_times')
    
    op.drop_index(op.f('ix_custom_foods_name'), table_name='custom_foods')
    op.drop_index(op.f('ix_custom_foods_workspace_id'), table_name='custom_foods')
    op.drop_table('custom_foods')
    
    op.drop_index(op.f('ix_food_favorites_workspace_id'), table_name='food_favorites')
    op.drop_index(op.f('ix_food_favorites_user_id'), table_name='food_favorites')
    op.drop_table('food_favorites')
