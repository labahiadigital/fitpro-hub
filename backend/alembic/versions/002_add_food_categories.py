"""Add food_categories table and update foods table

Revision ID: 002
Revises: 001
Create Date: 2026-01-02

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '002'
down_revision = '001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create food_categories table
    op.create_table(
        'food_categories',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('uuid_generate_v4()')),
        sa.Column('name', sa.Text, nullable=False, unique=True),
        sa.Column('description', sa.Text, nullable=True),
        sa.Column('icon', sa.Text, nullable=True),
        sa.Column('parent_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('food_categories.id', ondelete='SET NULL'), nullable=True),
        sa.Column('is_system', sa.Boolean, server_default='false'),
        sa.Column('sort_order', sa.Integer, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()')),
    )
    op.create_index('idx_food_categories_name', 'food_categories', ['name'])
    op.create_index('idx_food_categories_parent_id', 'food_categories', ['parent_id'])
    
    # Check if foods table exists, if not create it
    # Note: This table may already exist in Supabase, so we use IF NOT EXISTS
    op.execute('''
        CREATE TABLE IF NOT EXISTS foods (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
            category_id UUID REFERENCES food_categories(id) ON DELETE SET NULL,
            name TEXT NOT NULL,
            brand TEXT,
            category TEXT,
            generic_name TEXT,
            quantity TEXT,
            packaging TEXT,
            labels TEXT,
            origins TEXT,
            manufacturing_places TEXT,
            serving_size NUMERIC DEFAULT 100,
            serving_unit TEXT DEFAULT 'g',
            calories NUMERIC DEFAULT 0,
            energy_kj NUMERIC DEFAULT 0,
            protein_g NUMERIC DEFAULT 0,
            carbs_g NUMERIC DEFAULT 0,
            fat_g NUMERIC DEFAULT 0,
            fiber_g NUMERIC DEFAULT 0,
            saturated_fat_g NUMERIC DEFAULT 0,
            monounsaturated_fat_g NUMERIC,
            polyunsaturated_fat_g NUMERIC,
            trans_fat_g NUMERIC,
            cholesterol_mg NUMERIC,
            omega3_g NUMERIC,
            sugars_g NUMERIC DEFAULT 0,
            added_sugars_g NUMERIC,
            starch_g NUMERIC,
            polyols_g NUMERIC,
            salt_g NUMERIC DEFAULT 0,
            sodium_mg NUMERIC DEFAULT 0,
            potassium_mg NUMERIC,
            calcium_mg NUMERIC,
            phosphorus_mg NUMERIC,
            iron_mg NUMERIC,
            magnesium_mg NUMERIC,
            zinc_mg NUMERIC,
            copper_mg NUMERIC,
            manganese_mg NUMERIC,
            selenium_ug NUMERIC,
            iodine_ug NUMERIC,
            vitamin_a_ug NUMERIC,
            vitamin_d_ug NUMERIC,
            vitamin_e_mg NUMERIC,
            vitamin_k_ug NUMERIC,
            vitamin_c_mg NUMERIC,
            vitamin_b1_mg NUMERIC,
            vitamin_b2_mg NUMERIC,
            vitamin_b6_mg NUMERIC,
            vitamin_b9_ug NUMERIC,
            vitamin_b12_ug NUMERIC,
            vitamin_pp_mg NUMERIC,
            pantothenic_acid_mg NUMERIC,
            alcohol_g NUMERIC DEFAULT 0,
            caffeine_mg NUMERIC,
            choline_mg NUMERIC,
            ingredients_text TEXT,
            allergens TEXT,
            allergens_tags TEXT[],
            traces TEXT,
            traces_tags TEXT[],
            nutriscore_grade CHAR(1),
            nutriscore_score INTEGER,
            nova_group INTEGER,
            ecoscore_grade CHAR(1),
            ecoscore_score INTEGER,
            barcode TEXT UNIQUE,
            image_url TEXT,
            food_groups TEXT,
            source_supermarket TEXT,
            data_source TEXT DEFAULT 'open_food_facts',
            nutrients JSONB DEFAULT '{}',
            is_global BOOLEAN DEFAULT FALSE,
            is_public BOOLEAN DEFAULT FALSE,
            is_system BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
    ''')
    
    # Add indexes for foods table if they don't exist
    op.execute('CREATE INDEX IF NOT EXISTS idx_foods_workspace_id ON foods(workspace_id)')
    op.execute('CREATE INDEX IF NOT EXISTS idx_foods_category_id ON foods(category_id)')
    op.execute('CREATE INDEX IF NOT EXISTS idx_foods_name ON foods(name)')
    op.execute('CREATE INDEX IF NOT EXISTS idx_foods_barcode ON foods(barcode)')
    
    # Add category_id column to foods if it doesn't exist
    op.execute('''
        DO $$ 
        BEGIN 
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name='foods' AND column_name='category_id') THEN
                ALTER TABLE foods ADD COLUMN category_id UUID REFERENCES food_categories(id) ON DELETE SET NULL;
            END IF;
        END $$;
    ''')
    
    # Add is_public column to foods if it doesn't exist
    op.execute('''
        DO $$ 
        BEGIN 
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name='foods' AND column_name='is_public') THEN
                ALTER TABLE foods ADD COLUMN is_public BOOLEAN DEFAULT FALSE;
            END IF;
        END $$;
    ''')
    
    # Add is_system column to foods if it doesn't exist
    op.execute('''
        DO $$ 
        BEGIN 
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name='foods' AND column_name='is_system') THEN
                ALTER TABLE foods ADD COLUMN is_system BOOLEAN DEFAULT FALSE;
            END IF;
        END $$;
    ''')
    
    # Insert default food categories
    op.execute('''
        INSERT INTO food_categories (name, description, icon, is_system, sort_order) VALUES
        ('Frutas', 'Frutas frescas y procesadas', '🍎', true, 1),
        ('Verduras', 'Verduras y hortalizas', '🥬', true, 2),
        ('Carnes', 'Carnes rojas y blancas', '🥩', true, 3),
        ('Pescados y Mariscos', 'Pescados, mariscos y productos del mar', '🐟', true, 4),
        ('Lácteos', 'Leche, quesos, yogures y derivados', '🥛', true, 5),
        ('Huevos', 'Huevos y derivados', '🥚', true, 6),
        ('Cereales y Granos', 'Cereales, arroz, pasta y granos', '🌾', true, 7),
        ('Legumbres', 'Legumbres y derivados', '🫘', true, 8),
        ('Frutos Secos', 'Frutos secos y semillas', '🥜', true, 9),
        ('Aceites y Grasas', 'Aceites, mantequillas y grasas', '🫒', true, 10),
        ('Bebidas', 'Bebidas y líquidos', '🥤', true, 11),
        ('Snacks', 'Aperitivos y snacks', '🍿', true, 12),
        ('Dulces', 'Dulces, chocolates y postres', '🍫', true, 13),
        ('Condimentos', 'Salsas, especias y condimentos', '🧂', true, 14),
        ('Suplementos', 'Suplementos nutricionales', '💊', true, 15)
        ON CONFLICT (name) DO NOTHING
    ''')


def downgrade() -> None:
    # Remove columns from foods if they exist
    op.execute('''
        DO $$ 
        BEGIN 
            IF EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name='foods' AND column_name='category_id') THEN
                ALTER TABLE foods DROP COLUMN category_id;
            END IF;
        END $$;
    ''')
    
    op.drop_index('idx_food_categories_parent_id', table_name='food_categories')
    op.drop_index('idx_food_categories_name', table_name='food_categories')
    op.drop_table('food_categories')

