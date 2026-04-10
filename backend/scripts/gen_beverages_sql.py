# -*- coding: utf-8 -*-
"""Generate SQL INSERT for beverages from Excel, handling date-coerced numbers."""
import openpyxl
import os
import sys
from datetime import datetime

sys.stdout.reconfigure(encoding='utf-8')

EXCEL_DATA = [
    ("Agua Mineral", "Aguas e Infusiones", 250, 100, 0, 0, 0, 0),
    ("Agua de Coco", "Aguas e Infusiones", 250, 100, 19, 0.7, 0.2, 3.7),
    ("Café Solo (Espresso)", "Café", 40, 100, 2, 0.1, 0.2, 0),
    ("Café con Leche (Entera)", "Café", 200, 100, 42, 2.5, 2.3, 3.2),
    ("Café Americano", "Café", 250, 100, 1, 0.1, 0, 0.1),
    ("Café Capuchino", "Café", 200, 100, 55, 3.4, 2.8, 4.1),
    ("Té Verde / Negro", "Té e Infusiones", 200, 100, 1, 0, 0, 0.2),
    ("Té Matcha Latte (con leche)", "Té e Infusiones", 200, 100, 60, 3.2, 2.5, 6.5),
    ("Infusión de Hierbas", "Té e Infusiones", 200, 100, 1, 0, 0, 0),
    ("Leche Entera", "Lácteos", 250, 100, 63, 3.2, 3.6, 4.7),
    ("Leche Semidesnatada", "Lácteos", 250, 100, 46, 3.3, 1.6, 4.8),
    ("Leche Desnatada", "Lácteos", 250, 100, 34, 3.4, 0.1, 5),
    ("Leche sin Lactosa (Entera)", "Lácteos", 250, 100, 62, 3.1, 3.5, 4.7),
    ("Leche de Cabra", "Lácteos", 200, 100, 69, 3.6, 4.1, 4.5),
    ("Leche de Oveja", "Lácteos", 200, 100, 108, 6, 7, 5.4),
    ("Kéfir Bebible", "Lácteos / Fermentados", 200, 100, 45, 3.4, 1.5, 4),
    ("Yogur Líquido (Natural)", "Lácteos", 200, 100, 72, 3, 2.5, 9),
    ("Bebida de Soja", "Bebidas Vegetales", 250, 100, 38, 3, 1.6, 2.5),
    ("Bebida de Avena", "Bebidas Vegetales", 250, 100, 48, 1, 0.8, 8.5),
    ("Bebida de Arroz", "Bebidas Vegetales", 250, 100, 47, 0.1, 1, 9.4),
    ("Bebida de Almendra (Sin Azúcar)", "Bebidas Vegetales", 250, 100, 13, 0.5, 1.1, 0.3),
    ("Bebida de Anacardo (Cashew)", "Bebidas Vegetales", 250, 100, 23, 0.7, 1.1, 2.6),
    ("Bebida de Avellana", "Bebidas Vegetales", 250, 100, 29, 0.4, 1.6, 3.1),
    ("Gazpacho (Bebible)", "Bebidas Vegetales", 200, 100, 45, 0.8, 3, 3.5),
    ("Kombucha", "Fermentados", 200, 100, 15, 0, 0, 3.5),
    ("Horchata de Chufa", "Bebidas Tradicionales", 250, 100, 85, 0.6, 2.4, 15),
    ("Refresco de Cola", "Refrescos", 330, 100, 42, 0, 0, 10.6),
    ("Refresco de Naranja", "Refrescos", 330, 100, 42, 0, 0, 10.5),
    ("Tónica", "Refrescos", 200, 100, 35, 0, 0, 8.3),
    ("Ginger Ale", "Refrescos", 200, 100, 34, 0, 0, 8.5),
    ("Refresco Cola Zero", "Bebidas Light / Zero", 330, 100, 0.3, 0, 0, 0),
    ("Té Frío Zero", "Bebidas Light / Zero", 330, 100, 1, 0, 0, 0.2),
    ("Zumo de Naranja Natural", "Zumos de Fruta", 200, 100, 45, 0.7, 0.2, 10),
    ("Zumo de Piña (Bote)", "Zumos de Fruta", 200, 100, 50, 0.3, 0.1, 12),
    ("Néctar Multifrutas", "Zumos de Fruta", 200, 100, 52, 0.4, 0.1, 12.5),
    ("Mosto (Zumo de uva)", "Zumos de Fruta", 150, 100, 65, 0.4, 0, 16),
    ("Bebida Isotónica (Azul)", "Bebidas Isotónicas", 500, 100, 24, 0, 0, 6),
    ("Bebida Energética", "Bebidas Energéticas", 250, 100, 45, 0, 0, 11),
    ("Cacao Soluble (con leche semi)", "Bebidas de Cacao", 250, 100, 78, 3.5, 1.8, 12),
    ("Batido de Chocolate", "Lácteos / Dulces", 200, 100, 78, 3.3, 1.9, 11.8),
    ("Cerveza Rubia", "Bebidas Alcohólicas", 330, 100, 43, 0.3, 0, 3.5),
    ("Cerveza 0,0", "Bebidas Alcohólicas", 330, 100, 20, 0.2, 0, 4.2),
    ("Cerveza Negra", "Bebidas Alcohólicas", 330, 100, 50, 0.5, 0, 4.5),
    ("Vino Tinto", "Bebidas Alcohólicas", 150, 100, 85, 0, 0, 2.6),
    ("Vino Blanco", "Bebidas Alcohólicas", 150, 100, 82, 0, 0, 1.5),
    ("Sidra", "Bebidas Alcohólicas", 250, 100, 45, 0, 0, 4),
    ("Vermut", "Bebidas Alcohólicas", 100, 100, 140, 0, 0, 12),
    ("Ginebra / Ron / Vodka", "Bebidas Alcohólicas", 50, 100, 231, 0, 0, 0.1),
    ("Batido Proteína (Whey)", "Suplementos Deportivos", 300, 100, 55, 10, 0.8, 2),
]


values = []
for name, cat, srv, ref, cal, prot, fat, carbs in EXCEL_DATA:
    n = name.replace("'", "''")
    c = cat.replace("'", "''")
    values.append(
        f"(gen_random_uuid(), '{n}', '{c}', {srv}, {ref}, {cal}, {prot}, {fat}, {carbs}, true, now(), now())"
    )

sql = "INSERT INTO beverages (id, name, category, serving_size_ml, reference_ml, calories, protein, fat, carbs, is_global, created_at, updated_at) VALUES\n"
sql += ",\n".join(values) + ";\n"

out_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "beverages_seed.sql")
with open(out_path, "w", encoding="utf-8") as f:
    f.write(sql)
print(f"Generated {len(values)} rows -> {out_path}")
