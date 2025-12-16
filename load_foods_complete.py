"""
Script completo para cargar TODOS los datos de alimentos desde CSV de Mercadona y Consum a Supabase
Incluye todos los campos nutricionales, vitaminas, minerales, scores, etc.
"""
import csv
import re
import json

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
    """Obtiene el nombre del producto, priorizando español"""
    for field in ['product_name_es', 'product_name_en', 'product_name_ca', 'product_name_pt', 
                  'product_name_fr', 'product_name_it', 'product_name_de',
                  'generic_name_es', 'generic_name_en']:
        name = row.get(field, '').strip()
        if name:
            return name
    return None

def get_generic_name(row):
    """Obtiene el nombre genérico del producto"""
    for field in ['generic_name_es', 'generic_name_en', 'generic_name_pt', 'generic_name_fr']:
        name = row.get(field, '').strip()
        if name:
            return name
    return None

def get_ingredients(row):
    """Obtiene los ingredientes, priorizando español"""
    for field in ['ingredients_text_es', 'ingredients_text_en', 'ingredients_text_ca', 
                  'ingredients_text_pt', 'ingredients_text_fr', 'ingredients_text_it']:
        text = row.get(field, '').strip()
        if text:
            return text
    return None

def get_first_category(row):
    """Obtiene la primera categoría del producto"""
    categories = row.get('categories', '').strip()
    if categories:
        first_cat = categories.split(',')[0].strip()
        return first_cat[:200] if first_cat else None
    return None

def parse_allergens_tags(row):
    """Parsea los alérgenos como array"""
    tags = row.get('allergens_tags', '').strip()
    if tags:
        return [t.strip().replace("'", "''") for t in tags.split(',') if t.strip()]
    return None

def parse_traces_tags(row):
    """Parsea las trazas como array"""
    tags = row.get('traces_tags', '').strip()
    if tags:
        return [t.strip().replace("'", "''") for t in tags.split(',') if t.strip()]
    return None

def escape_sql(value):
    """Escapa un valor para SQL"""
    if value is None:
        return 'NULL'
    if isinstance(value, bool):
        return 'true' if value else 'false'
    if isinstance(value, (int, float)):
        return str(value)
    if isinstance(value, list):
        if not value:
            return 'NULL'
        escaped = [v.replace("'", "''") for v in value]
        return "ARRAY['" + "','".join(escaped) + "']"
    # String
    return "'" + str(value).replace("'", "''") + "'"

def process_csv(filepath, supermarket_name):
    """Procesa un archivo CSV y retorna los datos de alimentos"""
    foods = []
    skipped = 0
    
    with open(filepath, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f, delimiter='\t')
        
        for row in reader:
            name = get_product_name(row)
            
            # Saltar si no hay nombre
            if not name:
                skipped += 1
                continue
            
            # Obtener código de barras
            barcode = row.get('code', '').strip()
            
            # Obtener marca
            brand = row.get('brands', '').strip() or supermarket_name
            
            # Crear objeto de alimento con TODOS los campos
            food = {
                # Identificación
                'barcode': barcode if barcode else None,
                'name': name[:500],
                'generic_name': get_generic_name(row),
                'brand': brand[:200] if brand else None,
                'category': get_first_category(row),
                
                # Metadata
                'quantity': row.get('quantity', '').strip()[:100] or None,
                'packaging': row.get('packaging', '').strip()[:500] or None,
                'labels': row.get('labels', '').strip()[:500] or None,
                'origins': row.get('origins', '').strip()[:500] or None,
                'manufacturing_places': row.get('manufacturing_places', '').strip()[:500] or None,
                
                # Ingredientes y alérgenos
                'ingredients_text': get_ingredients(row),
                'allergens': row.get('allergens', '').strip()[:500] or None,
                'allergens_tags': parse_allergens_tags(row),
                'traces': row.get('traces', '').strip()[:500] or None,
                'traces_tags': parse_traces_tags(row),
                
                # Energía
                'energy_kj': safe_float(row.get('energy-kj_value')),
                'calories': safe_float(row.get('energy-kcal_value')),
                
                # Macronutrientes básicos
                'fat_g': safe_float(row.get('fat_value')),
                'saturated_fat_g': safe_float(row.get('saturated-fat_value')),
                'carbs_g': safe_float(row.get('carbohydrates_value')),
                'sugars_g': safe_float(row.get('sugars_value')),
                'fiber_g': safe_float(row.get('fiber_value')),
                'protein_g': safe_float(row.get('proteins_value')),
                'salt_g': safe_float(row.get('salt_value')),
                'sodium_mg': safe_float(row.get('sodium_value')),
                'alcohol_g': safe_float(row.get('alcohol_value')),
                
                # Grasas detalladas
                'monounsaturated_fat_g': safe_float(row.get('monounsaturated-fat_value')),
                'polyunsaturated_fat_g': safe_float(row.get('polyunsaturated-fat_value')),
                'trans_fat_g': safe_float(row.get('trans-fat_value')),
                'cholesterol_mg': safe_float(row.get('cholesterol_value')),
                'omega3_g': safe_float(row.get('omega-3-fat_value')),
                
                # Carbohidratos detallados
                'added_sugars_g': safe_float(row.get('added-sugars_value')),
                'starch_g': safe_float(row.get('starch_value')),
                'polyols_g': safe_float(row.get('polyols_value')),
                
                # Vitaminas
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
                
                # Minerales
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
                
                # Otros compuestos
                'caffeine_mg': safe_float(row.get('caffeine_value')),
                'choline_mg': safe_float(row.get('choline_value')),
                
                # Scores de Open Food Facts
                'nutriscore_grade': row.get('off:nutriscore_grade', '').strip()[:1].lower() or None,
                'nutriscore_score': safe_int(row.get('off:nutriscore_score')),
                'nova_group': safe_int(row.get('off:nova_groups')),
                'ecoscore_grade': row.get('off:environmental_score_grade', '').strip()[:1].lower() or None,
                'ecoscore_score': safe_int(row.get('off:environmental_score_score')),
                'food_groups': row.get('off:food_groups', '').strip()[:200] or None,
                
                # Fuente
                'source_supermarket': supermarket_name,
                'data_source': 'open_food_facts',
                
                # Valores por defecto
                'serving_size': 100,
                'serving_unit': 'g',
                'is_global': True,
            }
            
            foods.append(food)
    
    print(f"  - Procesados: {len(foods)}, Saltados (sin nombre): {skipped}")
    return foods

def generate_sql_insert(food):
    """Genera una sentencia INSERT para un alimento"""
    columns = [
        'barcode', 'name', 'generic_name', 'brand', 'category',
        'quantity', 'packaging', 'labels', 'origins', 'manufacturing_places',
        'ingredients_text', 'allergens', 'allergens_tags', 'traces', 'traces_tags',
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
    
    values = [escape_sql(food.get(col)) for col in columns]
    
    return f"({', '.join(values)})"

def generate_batch_sql(foods, batch_size=100):
    """Genera sentencias SQL INSERT en lotes"""
    columns = [
        'barcode', 'name', 'generic_name', 'brand', 'category',
        'quantity', 'packaging', 'labels', 'origins', 'manufacturing_places',
        'ingredients_text', 'allergens', 'allergens_tags', 'traces', 'traces_tags',
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
    
    sql_statements = []
    
    for i in range(0, len(foods), batch_size):
        batch = foods[i:i+batch_size]
        values = [generate_sql_insert(food) for food in batch]
        
        sql = f"""INSERT INTO foods ({', '.join(columns)})
VALUES {','.join(values)}
ON CONFLICT (barcode) DO UPDATE SET
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
        
        sql_statements.append(sql)
    
    return sql_statements

def main():
    print("=" * 60)
    print("CARGA COMPLETA DE ALIMENTOS A SUPABASE")
    print("=" * 60)
    
    print("\nProcesando CSV de Mercadona...")
    mercadona_foods = process_csv('mercadona.csv', 'Mercadona')
    
    print("\nProcesando CSV de Consum...")
    consum_foods = process_csv('consum.csv', 'Consum')
    
    # Combinar todos los alimentos
    all_foods = mercadona_foods + consum_foods
    print(f"\n{'=' * 60}")
    print(f"TOTAL DE ALIMENTOS: {len(all_foods)}")
    print(f"{'=' * 60}")
    
    # Estadísticas de datos disponibles
    print("\n--- Estadísticas de campos con datos ---")
    fields_to_check = [
        ('barcode', 'Código de barras'),
        ('ingredients_text', 'Ingredientes'),
        ('allergens', 'Alérgenos'),
        ('calories', 'Calorías'),
        ('nutriscore_grade', 'Nutriscore'),
        ('nova_group', 'NOVA Group'),
        ('vitamin_c_mg', 'Vitamina C'),
        ('calcium_mg', 'Calcio'),
        ('iron_mg', 'Hierro'),
    ]
    
    for field, label in fields_to_check:
        count = sum(1 for f in all_foods if f.get(field) is not None)
        pct = (count / len(all_foods)) * 100 if all_foods else 0
        print(f"  {label}: {count} ({pct:.1f}%)")
    
    # Generar SQL
    print("\nGenerando sentencias SQL...")
    sql_statements = generate_batch_sql(all_foods, batch_size=50)
    
    # Guardar SQL en archivos separados para facilitar la carga
    print(f"\nGuardando {len(sql_statements)} batches de SQL...")
    
    # Guardar todo en un solo archivo
    with open('foods_complete_insert.sql', 'w', encoding='utf-8') as f:
        for i, stmt in enumerate(sql_statements):
            f.write(f"-- Batch {i+1}/{len(sql_statements)}\n")
            f.write(stmt + '\n\n')
    
    print(f"\n[OK] SQL guardado en foods_complete_insert.sql")
    print(f"  - {len(sql_statements)} batches de ~50 registros cada uno")
    
    # Tambien guardar en lotes mas pequenos para ejecucion
    batch_files = []
    batches_per_file = 20  # 1000 registros por archivo
    
    for file_idx in range(0, len(sql_statements), batches_per_file):
        file_batches = sql_statements[file_idx:file_idx + batches_per_file]
        filename = f'foods_batch_{file_idx // batches_per_file + 1}.sql'
        batch_files.append(filename)
        
        with open(filename, 'w', encoding='utf-8') as f:
            for stmt in file_batches:
                f.write(stmt + '\n\n')
    
    print(f"\n[OK] Tambien guardado en {len(batch_files)} archivos separados:")
    for bf in batch_files[:5]:
        print(f"  - {bf}")
    if len(batch_files) > 5:
        print(f"  ... y {len(batch_files) - 5} mas")

if __name__ == '__main__':
    main()

