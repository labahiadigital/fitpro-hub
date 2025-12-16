"""
Script para cargar alimentos a Supabase usando la API REST
"""
import requests
import json
import os
import glob
import time

# Configuracion de Supabase
SUPABASE_URL = "https://ougfmkbjrpnjvujhuuyy.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91Z2Zta2JqcnBuanZ1amh1dXl5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTgwMzQzNywiZXhwIjoyMDgxMzc5NDM3fQ.1GM8C24zfAOnvt9-2Ba92dyE-DekB4aI2LDDVLah4bg"

def execute_sql(sql):
    """Ejecuta SQL usando la API REST de Supabase"""
    url = f"{SUPABASE_URL}/rest/v1/rpc/exec_sql"
    headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json"
    }
    
    response = requests.post(url, headers=headers, json={"query": sql})
    return response.status_code == 200, response.text

def execute_sql_direct(sql):
    """Ejecuta SQL directamente usando pg_graphql o similar"""
    # Usar el endpoint de SQL directo
    url = f"{SUPABASE_URL}/pg/query"
    headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.post(url, headers=headers, json={"query": sql}, timeout=60)
        return response.status_code in [200, 201], response.text
    except Exception as e:
        return False, str(e)

def main():
    print("=" * 60)
    print("CARGANDO ALIMENTOS A SUPABASE")
    print("=" * 60)
    
    # Obtener lista de archivos batch
    batch_files = sorted(glob.glob('sql_batches/batch_*.sql'))
    total_batches = len(batch_files)
    print(f"\nTotal de batches: {total_batches}")
    
    successful = 0
    failed = 0
    
    start_time = time.time()
    
    for i, batch_file in enumerate(batch_files, 1):
        # Leer contenido del batch
        with open(batch_file, 'r', encoding='utf-8') as f:
            sql_content = f.read()
        
        # Intentar ejecutar
        success, response = execute_sql_direct(sql_content)
        
        if success or "error" not in response.lower():
            successful += 1
        else:
            failed += 1
            if failed <= 5:
                print(f"  Error en batch {i}: {response[:100]}...")
        
        if i % 20 == 0 or i == total_batches:
            elapsed = time.time() - start_time
            print(f"  Progreso: {i}/{total_batches} ({successful} OK, {failed} errores) - {elapsed:.1f}s")
    
    elapsed = time.time() - start_time
    print(f"\n{'=' * 60}")
    print(f"COMPLETADO en {elapsed:.1f} segundos")
    print(f"Exitosos: {successful}/{total_batches}")
    print(f"Fallidos: {failed}/{total_batches}")
    print(f"Registros estimados: {successful * 25}")

if __name__ == '__main__':
    main()

