"""seed global beverages data

Revision ID: 033
Revises: 032
Create Date: 2026-04-10
"""
from alembic import op

revision = "033"
down_revision = "032"
branch_labels = None
depends_on = None

SEED_SQL = """
INSERT INTO beverages (id, name, category, serving_size_ml, reference_ml, calories, protein, fat, carbs, is_global, created_at, updated_at) VALUES
(gen_random_uuid(), 'Agua Mineral', 'Aguas e Infusiones', 250, 100, 0, 0, 0, 0, true, now(), now()),
(gen_random_uuid(), 'Agua de Coco', 'Aguas e Infusiones', 250, 100, 19, 0.7, 0.2, 3.7, true, now(), now()),
(gen_random_uuid(), 'Café Solo (Espresso)', 'Café', 40, 100, 2, 0.1, 0.2, 0, true, now(), now()),
(gen_random_uuid(), 'Café con Leche (Entera)', 'Café', 200, 100, 42, 2.5, 2.3, 3.2, true, now(), now()),
(gen_random_uuid(), 'Café Americano', 'Café', 250, 100, 1, 0.1, 0, 0.1, true, now(), now()),
(gen_random_uuid(), 'Café Capuchino', 'Café', 200, 100, 55, 3.4, 2.8, 4.1, true, now(), now()),
(gen_random_uuid(), 'Té Verde / Negro', 'Té e Infusiones', 200, 100, 1, 0, 0, 0.2, true, now(), now()),
(gen_random_uuid(), 'Té Matcha Latte (con leche)', 'Té e Infusiones', 200, 100, 60, 3.2, 2.5, 6.5, true, now(), now()),
(gen_random_uuid(), 'Infusión de Hierbas', 'Té e Infusiones', 200, 100, 1, 0, 0, 0, true, now(), now()),
(gen_random_uuid(), 'Leche Entera', 'Lácteos', 250, 100, 63, 3.2, 3.6, 4.7, true, now(), now()),
(gen_random_uuid(), 'Leche Semidesnatada', 'Lácteos', 250, 100, 46, 3.3, 1.6, 4.8, true, now(), now()),
(gen_random_uuid(), 'Leche Desnatada', 'Lácteos', 250, 100, 34, 3.4, 0.1, 5, true, now(), now()),
(gen_random_uuid(), 'Leche sin Lactosa (Entera)', 'Lácteos', 250, 100, 62, 3.1, 3.5, 4.7, true, now(), now()),
(gen_random_uuid(), 'Leche de Cabra', 'Lácteos', 200, 100, 69, 3.6, 4.1, 4.5, true, now(), now()),
(gen_random_uuid(), 'Leche de Oveja', 'Lácteos', 200, 100, 108, 6, 7, 5.4, true, now(), now()),
(gen_random_uuid(), 'Kéfir Bebible', 'Lácteos / Fermentados', 200, 100, 45, 3.4, 1.5, 4, true, now(), now()),
(gen_random_uuid(), 'Yogur Líquido (Natural)', 'Lácteos', 200, 100, 72, 3, 2.5, 9, true, now(), now()),
(gen_random_uuid(), 'Bebida de Soja', 'Bebidas Vegetales', 250, 100, 38, 3, 1.6, 2.5, true, now(), now()),
(gen_random_uuid(), 'Bebida de Avena', 'Bebidas Vegetales', 250, 100, 48, 1, 0.8, 8.5, true, now(), now()),
(gen_random_uuid(), 'Bebida de Arroz', 'Bebidas Vegetales', 250, 100, 47, 0.1, 1, 9.4, true, now(), now()),
(gen_random_uuid(), 'Bebida de Almendra (Sin Azúcar)', 'Bebidas Vegetales', 250, 100, 13, 0.5, 1.1, 0.3, true, now(), now()),
(gen_random_uuid(), 'Bebida de Anacardo (Cashew)', 'Bebidas Vegetales', 250, 100, 23, 0.7, 1.1, 2.6, true, now(), now()),
(gen_random_uuid(), 'Bebida de Avellana', 'Bebidas Vegetales', 250, 100, 29, 0.4, 1.6, 3.1, true, now(), now()),
(gen_random_uuid(), 'Gazpacho (Bebible)', 'Bebidas Vegetales', 200, 100, 45, 0.8, 3, 3.5, true, now(), now()),
(gen_random_uuid(), 'Kombucha', 'Fermentados', 200, 100, 15, 0, 0, 3.5, true, now(), now()),
(gen_random_uuid(), 'Horchata de Chufa', 'Bebidas Tradicionales', 250, 100, 85, 0.6, 2.4, 15, true, now(), now()),
(gen_random_uuid(), 'Refresco de Cola', 'Refrescos', 330, 100, 42, 0, 0, 10.6, true, now(), now()),
(gen_random_uuid(), 'Refresco de Naranja', 'Refrescos', 330, 100, 42, 0, 0, 10.5, true, now(), now()),
(gen_random_uuid(), 'Tónica', 'Refrescos', 200, 100, 35, 0, 0, 8.3, true, now(), now()),
(gen_random_uuid(), 'Ginger Ale', 'Refrescos', 200, 100, 34, 0, 0, 8.5, true, now(), now()),
(gen_random_uuid(), 'Refresco Cola Zero', 'Bebidas Light / Zero', 330, 100, 0.3, 0, 0, 0, true, now(), now()),
(gen_random_uuid(), 'Té Frío Zero', 'Bebidas Light / Zero', 330, 100, 1, 0, 0, 0.2, true, now(), now()),
(gen_random_uuid(), 'Zumo de Naranja Natural', 'Zumos de Fruta', 200, 100, 45, 0.7, 0.2, 10, true, now(), now()),
(gen_random_uuid(), 'Zumo de Piña (Bote)', 'Zumos de Fruta', 200, 100, 50, 0.3, 0.1, 12, true, now(), now()),
(gen_random_uuid(), 'Néctar Multifrutas', 'Zumos de Fruta', 200, 100, 52, 0.4, 0.1, 12.5, true, now(), now()),
(gen_random_uuid(), 'Mosto (Zumo de uva)', 'Zumos de Fruta', 150, 100, 65, 0.4, 0, 16, true, now(), now()),
(gen_random_uuid(), 'Bebida Isotónica (Azul)', 'Bebidas Isotónicas', 500, 100, 24, 0, 0, 6, true, now(), now()),
(gen_random_uuid(), 'Bebida Energética', 'Bebidas Energéticas', 250, 100, 45, 0, 0, 11, true, now(), now()),
(gen_random_uuid(), 'Cacao Soluble (con leche semi)', 'Bebidas de Cacao', 250, 100, 78, 3.5, 1.8, 12, true, now(), now()),
(gen_random_uuid(), 'Batido de Chocolate', 'Lácteos / Dulces', 200, 100, 78, 3.3, 1.9, 11.8, true, now(), now()),
(gen_random_uuid(), 'Cerveza Rubia', 'Bebidas Alcohólicas', 330, 100, 43, 0.3, 0, 3.5, true, now(), now()),
(gen_random_uuid(), 'Cerveza 0,0', 'Bebidas Alcohólicas', 330, 100, 20, 0.2, 0, 4.2, true, now(), now()),
(gen_random_uuid(), 'Cerveza Negra', 'Bebidas Alcohólicas', 330, 100, 50, 0.5, 0, 4.5, true, now(), now()),
(gen_random_uuid(), 'Vino Tinto', 'Bebidas Alcohólicas', 150, 100, 85, 0, 0, 2.6, true, now(), now()),
(gen_random_uuid(), 'Vino Blanco', 'Bebidas Alcohólicas', 150, 100, 82, 0, 0, 1.5, true, now(), now()),
(gen_random_uuid(), 'Sidra', 'Bebidas Alcohólicas', 250, 100, 45, 0, 0, 4, true, now(), now()),
(gen_random_uuid(), 'Vermut', 'Bebidas Alcohólicas', 100, 100, 140, 0, 0, 12, true, now(), now()),
(gen_random_uuid(), 'Ginebra / Ron / Vodka', 'Bebidas Alcohólicas', 50, 100, 231, 0, 0, 0.1, true, now(), now()),
(gen_random_uuid(), 'Batido Proteína (Whey)', 'Suplementos Deportivos', 300, 100, 55, 10, 0.8, 2, true, now(), now())
ON CONFLICT DO NOTHING;
"""


def upgrade() -> None:
    op.execute(SEED_SQL)


def downgrade() -> None:
    op.execute("DELETE FROM beverages WHERE is_global = true;")
