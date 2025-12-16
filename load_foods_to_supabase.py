"""
Script para cargar datos de alimentos desde CSV de Mercadona y Consum a Supabase
"""
import csv
import re
import json

def parse_serving_size(serving_str):
    """Extrae el tamaño y unidad de porción de un string"""
    if not serving_str:
        return 100, 'g'
    
    # Patrones comunes: "100 g", "1 serving (100 g)", "40 g", "1L", etc.
    match = re.search(r'(\d+(?:\.\d+)?)\s*(g|ml|L|kg|mg|oz|portion)?', serving_str, re.IGNORECASE)
    if match:
        size = float(match.group(1))
        unit = match.group(2) or 'g'
        # Normalizar unidades
        if unit.lower() == 'l':
            size *= 1000
            unit = 'ml'
        elif unit.lower() == 'kg':
            size *= 1000
            unit = 'g'
        return size, unit.lower()
    return 100, 'g'

def safe_float(value):
    """Convierte un valor a float de forma segura"""
    if not value or value.strip() == '':
        return None
    try:
        return float(value.replace(',', '.'))
    except (ValueError, AttributeError):
        return None

def get_product_name(row):
    """Obtiene el nombre del producto, priorizando español"""
    # Intentar obtener nombre en español primero
    name = row.get('product_name_es', '').strip()
    if not name:
        name = row.get('product_name_en', '').strip()
    if not name:
        name = row.get('product_name_ca', '').strip()
    if not name:
        name = row.get('product_name_pt', '').strip()
    if not name:
        # Intentar nombre genérico
        name = row.get('generic_name_es', '').strip()
    if not name:
        name = row.get('generic_name_en', '').strip()
    return name

def get_category(row):
    """Obtiene la categoría del producto"""
    categories = row.get('categories', '').strip()
    if categories:
        # Tomar la primera categoría
        first_cat = categories.split(',')[0].strip()
        return first_cat[:100] if first_cat else None
    return None

def process_csv(filepath, brand_name):
    """Procesa un archivo CSV y retorna los datos de alimentos"""
    foods = []
    
    with open(filepath, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f, delimiter='\t')
        
        for row in reader:
            name = get_product_name(row)
            
            # Saltar si no hay nombre
            if not name:
                continue
            
            # Obtener calorías
            calories = safe_float(row.get('energy-kcal_value'))
            
            # Saltar si no hay información nutricional básica
            if calories is None:
                continue
            
            # Obtener marca del CSV o usar la predeterminada
            brand = row.get('brands', '').strip()
            if not brand:
                brand = brand_name
            
            # Obtener valores nutricionales
            protein = safe_float(row.get('proteins_value'))
            carbs = safe_float(row.get('carbohydrates_value'))
            fat = safe_float(row.get('fat_value'))
            fiber = safe_float(row.get('fiber_value'))
            
            # Obtener tamaño de porción
            serving_str = row.get('serving_size', '')
            serving_size, serving_unit = parse_serving_size(serving_str)
            
            # Determinar si los datos son por 100g o por porción
            nutrition_per = row.get('nutrition_data_per', '100g')
            
            # Si los datos nutricionales son por porción, normalizar a 100g
            if 'serving' in nutrition_per.lower() and serving_size and serving_size != 100:
                factor = 100 / serving_size
                if calories: calories *= factor
                if protein: protein *= factor
                if carbs: carbs *= factor
                if fat: fat *= factor
                if fiber: fiber *= factor
            
            # Crear objeto de alimento
            food = {
                'name': name[:255],  # Limitar longitud
                'brand': brand[:100] if brand else None,
                'category': get_category(row),
                'calories': round(calories, 1) if calories else 0,
                'protein_g': round(protein, 2) if protein else 0,
                'carbs_g': round(carbs, 2) if carbs else 0,
                'fat_g': round(fat, 2) if fat else 0,
                'fiber_g': round(fiber, 2) if fiber else 0,
                'serving_size': 100,  # Normalizado a 100g
                'serving_unit': 'g',
                'is_global': True,
                'nutrients': json.dumps({
                    'sugars_g': safe_float(row.get('sugars_value')),
                    'saturated_fat_g': safe_float(row.get('saturated-fat_value')),
                    'sodium_mg': safe_float(row.get('sodium_value')) * 1000 if safe_float(row.get('sodium_value')) else None,
                    'salt_g': safe_float(row.get('salt_value')),
                    'source': brand_name
                })
            }
            
            foods.append(food)
    
    return foods

def generate_sql_inserts(foods, batch_size=100):
    """Genera sentencias SQL INSERT para los alimentos"""
    sql_statements = []
    
    for i in range(0, len(foods), batch_size):
        batch = foods[i:i+batch_size]
        
        values = []
        for food in batch:
            # Escapar comillas simples en strings
            name = food['name'].replace("'", "''")
            brand = food['brand'].replace("'", "''") if food['brand'] else 'NULL'
            category = food['category'].replace("'", "''") if food['category'] else 'NULL'
            nutrients = food['nutrients'].replace("'", "''")
            
            value = f"""(
                '{name}',
                {f"'{brand}'" if brand != 'NULL' else 'NULL'},
                {f"'{category}'" if category != 'NULL' else 'NULL'},
                {food['calories']},
                {food['protein_g']},
                {food['carbs_g']},
                {food['fat_g']},
                {food['fiber_g']},
                '{nutrients}'::jsonb,
                {food['serving_size']},
                '{food['serving_unit']}',
                {str(food['is_global']).lower()}
            )"""
            values.append(value)
        
        sql = f"""INSERT INTO foods (name, brand, category, calories, protein_g, carbs_g, fat_g, fiber_g, nutrients, serving_size, serving_unit, is_global)
VALUES {','.join(values)}
ON CONFLICT DO NOTHING;"""
        
        sql_statements.append(sql)
    
    return sql_statements

def main():
    print("Procesando CSV de Mercadona...")
    mercadona_foods = process_csv('mercadona.csv', 'Mercadona')
    print(f"  - Encontrados {len(mercadona_foods)} alimentos con datos nutricionales")
    
    print("Procesando CSV de Consum...")
    consum_foods = process_csv('consum.csv', 'Consum')
    print(f"  - Encontrados {len(consum_foods)} alimentos con datos nutricionales")
    
    # Combinar todos los alimentos
    all_foods = mercadona_foods + consum_foods
    print(f"\nTotal de alimentos a cargar: {len(all_foods)}")
    
    # Generar SQL
    print("\nGenerando sentencias SQL...")
    sql_statements = generate_sql_inserts(all_foods, batch_size=50)
    
    # Guardar SQL en archivo
    with open('foods_insert.sql', 'w', encoding='utf-8') as f:
        for stmt in sql_statements:
            f.write(stmt + '\n\n')
    
    print(f"SQL guardado en foods_insert.sql ({len(sql_statements)} batches)")
    
    # También imprimir estadísticas
    print("\n--- Estadísticas ---")
    print(f"Mercadona: {len(mercadona_foods)} alimentos")
    print(f"Consum: {len(consum_foods)} alimentos")
    print(f"Total: {len(all_foods)} alimentos")

if __name__ == '__main__':
    main()

