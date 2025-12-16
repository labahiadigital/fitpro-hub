"""
Script para cargar alimentos en bulk usando la librería supabase-py
"""
import os
import csv
import json
from supabase import create_client, Client

# Configuración de Supabase
SUPABASE_URL = "https://ougfmkbjrpnjvujhuuyy.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91Z2Zta2JqcnBuanZ1amh1dXl5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTgwMzQzNywiZXhwIjoyMDgxMzc5NDM3fQ.1GM8C24zfAOnvt9-2Ba92dyE-DekB4aI2LDDVLah4bg"

def safe_float(value):
    if not value or str(value).strip() == '':
        return None
    try:
        return float(str(value).replace(',', '.'))
    except:
        return None

def safe_int(value):
    if not value or str(value).strip() == '':
        return None
    try:
        return int(float(str(value).replace(',', '.')))
    except:
        return None

def get_name(row):
    for field in ['product_name_es', 'product_name_en', 'product_name_ca', 'product_name_pt']:
        name = row.get(field, '').strip()
        if name:
            return name[:500]
    return None

def get_generic_name(row):
    for field in ['generic_name_es', 'generic_name_en']:
        name = row.get(field, '').strip()
        if name:
            return name[:500]
    return None

def get_ingredients(row):
    for field in ['ingredients_text_es', 'ingredients_text_en', 'ingredients_text_ca']:
        text = row.get(field, '').strip()
        if text:
            return text
    return None

def get_category(row):
    categories = row.get('categories', '').strip()
    if categories:
        return categories.split(',')[0].strip()[:200]
    return None

def process_csv(filepath, supermarket):
    foods = []
    with open(filepath, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f, delimiter='\t')
        for row in reader:
            name = get_name(row)
            barcode = row.get('code', '').strip()
            
            if not name or not barcode:
                continue
            
            brand = row.get('brands', '').strip() or supermarket
            
            food = {
                'barcode': barcode,
                'name': name,
                'generic_name': get_generic_name(row),
                'brand': brand[:200] if brand else None,
                'category': get_category(row),
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
                'vitamin_a_ug': safe_float(row.get('vitamin-a_value')),
                'vitamin_d_ug': safe_float(row.get('vitamin-d_value')),
                'vitamin_e_mg': safe_float(row.get('vitamin-e_value')),
                'vitamin_c_mg': safe_float(row.get('vitamin-c_value')),
                'vitamin_b1_mg': safe_float(row.get('vitamin-b1_value')),
                'vitamin_b2_mg': safe_float(row.get('vitamin-b2_value')),
                'vitamin_b6_mg': safe_float(row.get('vitamin-b6_value')),
                'vitamin_b9_ug': safe_float(row.get('vitamin-b9_value')),
                'vitamin_b12_ug': safe_float(row.get('vitamin-b12_value')),
                'potassium_mg': safe_float(row.get('potassium_value')),
                'calcium_mg': safe_float(row.get('calcium_value')),
                'iron_mg': safe_float(row.get('iron_value')),
                'magnesium_mg': safe_float(row.get('magnesium_value')),
                'zinc_mg': safe_float(row.get('zinc_value')),
                'caffeine_mg': safe_float(row.get('caffeine_value')),
                'nutriscore_grade': (row.get('off:nutriscore_grade', '').strip()[:1].lower() or None),
                'nutriscore_score': safe_int(row.get('off:nutriscore_score')),
                'nova_group': safe_int(row.get('off:nova_groups')),
                'ecoscore_grade': (row.get('off:environmental_score_grade', '').strip()[:1].lower() or None),
                'ecoscore_score': safe_int(row.get('off:environmental_score_score')),
                'food_groups': (row.get('off:food_groups', '').strip()[:200] or None),
                'source_supermarket': supermarket,
                'data_source': 'open_food_facts',
                'serving_size': 100,
                'serving_unit': 'g',
                'is_global': True,
            }
            
            # Limpiar valores None para evitar problemas
            food = {k: v for k, v in food.items() if v is not None}
            foods.append(food)
    
    return foods

def main():
    print("=" * 60)
    print("CARGANDO ALIMENTOS A SUPABASE")
    print("=" * 60)
    
    # Crear cliente de Supabase
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    print("\nProcesando Mercadona...")
    mercadona_foods = process_csv('mercadona.csv', 'Mercadona')
    print(f"  - {len(mercadona_foods)} productos")
    
    print("\nProcesando Consum...")
    consum_foods = process_csv('consum.csv', 'Consum')
    print(f"  - {len(consum_foods)} productos")
    
    all_foods = mercadona_foods + consum_foods
    print(f"\nTotal: {len(all_foods)} productos")
    
    # Insertar en batches de 100
    batch_size = 100
    total_batches = (len(all_foods) + batch_size - 1) // batch_size
    
    print(f"\nInsertando en {total_batches} batches de {batch_size}...")
    
    successful = 0
    failed = 0
    
    for i in range(0, len(all_foods), batch_size):
        batch = all_foods[i:i+batch_size]
        batch_num = i // batch_size + 1
        
        try:
            # Usar upsert para evitar duplicados
            result = supabase.table('foods').upsert(
                batch,
                on_conflict='barcode'
            ).execute()
            successful += len(batch)
            
            if batch_num % 10 == 0 or batch_num == total_batches:
                print(f"  Batch {batch_num}/{total_batches} - OK ({successful} insertados)")
        except Exception as e:
            failed += len(batch)
            print(f"  Batch {batch_num}/{total_batches} - ERROR: {str(e)[:80]}...")
    
    print(f"\n{'=' * 60}")
    print(f"COMPLETADO")
    print(f"Insertados: {successful}")
    print(f"Fallidos: {failed}")

if __name__ == '__main__':
    main()

