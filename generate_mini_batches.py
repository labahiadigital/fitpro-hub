"""
Script para generar mini-batches de SQL para cargar en Supabase
Genera archivos SQL más pequeños para poder ejecutarlos vía MCP
"""
import csv
import json
import os

def safe_float(value):
    """Convierte un valor a float de forma segura"""
    if not value or str(value).strip() == '':
        return None
    try:
        return float(str(value).replace(',', '.'))
    except (ValueError, AttributeError):
        return None

def safe_int(value):
    """Convierte un valor a int de forma segura"""
    if not value or str(value).strip() == '':
        return None
    try:
        return int(float(str(value).replace(',', '.')))
    except (ValueError, AttributeError):
        return None

def get_product_name(row):
    """Obtiene el nombre del producto"""
    for field in ['product_name_es', 'product_name_en', 'product_name_ca', 'product_name_pt', 
                  'product_name_fr', 'product_name_it', 'product_name_de',
                  'generic_name_es', 'generic_name_en']:
        name = row.get(field, '').strip()
        if name:
            return name
    return None

def get_generic_name(row):
    for field in ['generic_name_es', 'generic_name_en', 'generic_name_pt', 'generic_name_fr']:
        name = row.get(field, '').strip()
        if name:
            return name
    return None

def get_ingredients(row):
    for field in ['ingredients_text_es', 'ingredients_text_en', 'ingredients_text_ca', 
                  'ingredients_text_pt', 'ingredients_text_fr', 'ingredients_text_it']:
        text = row.get(field, '').strip()
        if text:
            return text
    return None

def get_first_category(row):
    categories = row.get('categories', '').strip()
    if categories:
        first_cat = categories.split(',')[0].strip()
        return first_cat[:200] if first_cat else None
    return None

def escape_sql(value):
    """Escapa un valor para SQL"""
    if value is None:
        return 'NULL'
    if isinstance(value, bool):
        return 'true' if value else 'false'
    if isinstance(value, (int, float)):
        return str(value)
    # String - escapar comillas simples y limpiar saltos de linea
    cleaned = str(value).replace("'", "''").replace('\n', ' ').replace('\r', ' ')
    return "'" + cleaned + "'"

def process_csv_to_values(filepath, supermarket_name, limit=None):
    """Procesa CSV y genera valores SQL"""
    values_list = []
    
    with open(filepath, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f, delimiter='\t')
        
        count = 0
        for row in reader:
            if limit and count >= limit:
                break
                
            name = get_product_name(row)
            if not name:
                continue
            
            barcode = row.get('code', '').strip()
            if not barcode:
                continue
            
            brand = row.get('brands', '').strip() or supermarket_name
            
            # Construir valores
            values = {
                'barcode': barcode,
                'name': name[:500],
                'generic_name': get_generic_name(row),
                'brand': brand[:200] if brand else None,
                'category': get_first_category(row),
                'quantity': (row.get('quantity', '').strip()[:100] or None),
                'packaging': (row.get('packaging', '').strip()[:500] or None),
                'labels': (row.get('labels', '').strip()[:500] or None),
                'origins': (row.get('origins', '').strip()[:500] or None),
                'manufacturing_places': (row.get('manufacturing_places', '').strip()[:500] or None),
                'ingredients_text': get_ingredients(row),
                'allergens': (row.get('allergens', '').strip()[:500] or None),
                'traces': (row.get('traces', '').strip()[:500] or None),
                'energy_kj': safe_float(row.get('energy-kj_value')),
                'calories': safe_float(row.get('energy-kcal_value')),
                'fat_g': safe_float(row.get('fat_value')),
                'saturated_fat_g': safe_float(row.get('saturated-fat_value')),
                'carbs_g': safe_float(row.get('carbohydrates_value')),
                'sugars_g': safe_float(row.get('sugars_value')),
                'fiber_g': safe_float(row.get('fiber_value')),
                'protein_g': safe_float(row.get('proteins_value')),
                'salt_g': safe_float(row.get('salt_value')),
                'sodium_mg': safe_float(row.get('sodium_value')),
                'alcohol_g': safe_float(row.get('alcohol_value')),
                'monounsaturated_fat_g': safe_float(row.get('monounsaturated-fat_value')),
                'polyunsaturated_fat_g': safe_float(row.get('polyunsaturated-fat_value')),
                'trans_fat_g': safe_float(row.get('trans-fat_value')),
                'cholesterol_mg': safe_float(row.get('cholesterol_value')),
                'omega3_g': safe_float(row.get('omega-3-fat_value')),
                'added_sugars_g': safe_float(row.get('added-sugars_value')),
                'starch_g': safe_float(row.get('starch_value')),
                'polyols_g': safe_float(row.get('polyols_value')),
                'vitamin_a_ug': safe_float(row.get('vitamin-a_value')),
                'vitamin_d_ug': safe_float(row.get('vitamin-d_value')),
                'vitamin_e_mg': safe_float(row.get('vitamin-e_value')),
                'vitamin_k_ug': safe_float(row.get('vitamin-k_value')),
                'vitamin_c_mg': safe_float(row.get('vitamin-c_value')),
                'vitamin_b1_mg': safe_float(row.get('vitamin-b1_value')),
                'vitamin_b2_mg': safe_float(row.get('vitamin-b2_value')),
                'vitamin_b6_mg': safe_float(row.get('vitamin-b6_value')),
                'vitamin_b9_ug': safe_float(row.get('vitamin-b9_value')),
                'vitamin_b12_ug': safe_float(row.get('vitamin-b12_value')),
                'vitamin_pp_mg': safe_float(row.get('vitamin-pp_value')),
                'pantothenic_acid_mg': safe_float(row.get('pantothenic-acid_value')),
                'potassium_mg': safe_float(row.get('potassium_value')),
                'calcium_mg': safe_float(row.get('calcium_value')),
                'phosphorus_mg': safe_float(row.get('phosphorus_value')),
                'iron_mg': safe_float(row.get('iron_value')),
                'magnesium_mg': safe_float(row.get('magnesium_value')),
                'zinc_mg': safe_float(row.get('zinc_value')),
                'copper_mg': safe_float(row.get('copper_value')),
                'manganese_mg': safe_float(row.get('manganese_value')),
                'selenium_ug': safe_float(row.get('selenium_value')),
                'iodine_ug': safe_float(row.get('iodine_value')),
                'caffeine_mg': safe_float(row.get('caffeine_value')),
                'choline_mg': safe_float(row.get('choline_value')),
                'nutriscore_grade': (row.get('off:nutriscore_grade', '').strip()[:1].lower() or None),
                'nutriscore_score': safe_int(row.get('off:nutriscore_score')),
                'nova_group': safe_int(row.get('off:nova_groups')),
                'ecoscore_grade': (row.get('off:environmental_score_grade', '').strip()[:1].lower() or None),
                'ecoscore_score': safe_int(row.get('off:environmental_score_score')),
                'food_groups': (row.get('off:food_groups', '').strip()[:200] or None),
                'source_supermarket': supermarket_name,
                'data_source': 'open_food_facts',
                'serving_size': 100,
                'serving_unit': 'g',
                'is_global': True,
            }
            
            values_list.append(values)
            count += 1
    
    return values_list

def generate_insert_sql(values_list, batch_size=25):
    """Genera SQL INSERT para un lote de valores"""
    columns = [
        'barcode', 'name', 'generic_name', 'brand', 'category',
        'quantity', 'packaging', 'labels', 'origins', 'manufacturing_places',
        'ingredients_text', 'allergens', 'traces',
        'energy_kj', 'calories', 'fat_g', 'saturated_fat_g', 'carbs_g',
        'sugars_g', 'fiber_g', 'protein_g', 'salt_g', 'sodium_mg', 'alcohol_g',
        'monounsaturated_fat_g', 'polyunsaturated_fat_g', 'trans_fat_g', 'cholesterol_mg', 'omega3_g',
        'added_sugars_g', 'starch_g', 'polyols_g',
        'vitamin_a_ug', 'vitamin_d_ug', 'vitamin_e_mg', 'vitamin_k_ug', 'vitamin_c_mg',
        'vitamin_b1_mg', 'vitamin_b2_mg', 'vitamin_b6_mg', 'vitamin_b9_ug', 'vitamin_b12_ug',
        'vitamin_pp_mg', 'pantothenic_acid_mg',
        'potassium_mg', 'calcium_mg', 'phosphorus_mg', 'iron_mg', 'magnesium_mg',
        'zinc_mg', 'copper_mg', 'manganese_mg', 'selenium_ug', 'iodine_ug',
        'caffeine_mg', 'choline_mg',
        'nutriscore_grade', 'nutriscore_score', 'nova_group', 'ecoscore_grade', 'ecoscore_score', 'food_groups',
        'source_supermarket', 'data_source', 'serving_size', 'serving_unit', 'is_global'
    ]
    
    sql_batches = []
    
    for i in range(0, len(values_list), batch_size):
        batch = values_list[i:i+batch_size]
        
        rows = []
        for v in batch:
            row_values = [escape_sql(v.get(col)) for col in columns]
            rows.append(f"({', '.join(row_values)})")
        
        sql = f"""INSERT INTO foods ({', '.join(columns)})
VALUES {', '.join(rows)}
ON CONFLICT (barcode) WHERE barcode IS NOT NULL DO UPDATE SET
    name = EXCLUDED.name,
    generic_name = COALESCE(EXCLUDED.generic_name, foods.generic_name),
    brand = COALESCE(EXCLUDED.brand, foods.brand),
    category = COALESCE(EXCLUDED.category, foods.category),
    ingredients_text = COALESCE(EXCLUDED.ingredients_text, foods.ingredients_text),
    allergens = COALESCE(EXCLUDED.allergens, foods.allergens),
    calories = COALESCE(EXCLUDED.calories, foods.calories),
    protein_g = COALESCE(EXCLUDED.protein_g, foods.protein_g),
    carbs_g = COALESCE(EXCLUDED.carbs_g, foods.carbs_g),
    fat_g = COALESCE(EXCLUDED.fat_g, foods.fat_g),
    fiber_g = COALESCE(EXCLUDED.fiber_g, foods.fiber_g),
    nutriscore_grade = COALESCE(EXCLUDED.nutriscore_grade, foods.nutriscore_grade),
    nova_group = COALESCE(EXCLUDED.nova_group, foods.nova_group),
    updated_at = now();"""
        
        sql_batches.append(sql)
    
    return sql_batches

def main():
    # Crear directorio para mini batches
    os.makedirs('sql_batches', exist_ok=True)
    
    print("Procesando Mercadona...")
    mercadona_values = process_csv_to_values('mercadona.csv', 'Mercadona')
    print(f"  - {len(mercadona_values)} productos")
    
    print("Procesando Consum...")
    consum_values = process_csv_to_values('consum.csv', 'Consum')
    print(f"  - {len(consum_values)} productos")
    
    all_values = mercadona_values + consum_values
    print(f"\nTotal: {len(all_values)} productos")
    
    # Generar batches de 25 registros (para mantener SQL pequeno)
    print("\nGenerando SQL batches...")
    sql_batches = generate_insert_sql(all_values, batch_size=25)
    print(f"  - {len(sql_batches)} batches generados")
    
    # Guardar cada batch en un archivo separado
    for i, sql in enumerate(sql_batches):
        filename = f'sql_batches/batch_{i+1:04d}.sql'
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(sql)
    
    print(f"\nArchivos guardados en sql_batches/")
    print(f"Total: {len(sql_batches)} archivos")
    
    # Tambien generar un archivo con todos los batches numerados para referencia
    with open('sql_batches/index.txt', 'w') as f:
        f.write(f"Total batches: {len(sql_batches)}\n")
        f.write(f"Total productos: {len(all_values)}\n")
        f.write(f"Productos por batch: 25\n")

if __name__ == '__main__':
    main()

