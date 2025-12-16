"""
Script para ejecutar todos los batches SQL en Supabase usando psycopg2
"""
import os
import glob
import time
import psycopg2
from psycopg2 import sql

# Configuracion de conexion directa a PostgreSQL
DATABASE_URL = "postgresql://postgres.ougfmkbjrpnjvujhuuyy:E13fitness2025!@aws-0-eu-west-3.pooler.supabase.com:6543/postgres"

def execute_batch(conn, sql_content, batch_num):
    """Ejecuta un batch SQL"""
    try:
        with conn.cursor() as cur:
            cur.execute(sql_content)
        conn.commit()
        return True, None
    except Exception as e:
        conn.rollback()
        return False, str(e)

def main():
    print("=" * 60)
    print("EJECUTANDO BATCHES SQL EN SUPABASE")
    print("=" * 60)
    
    # Obtener lista de archivos batch
    batch_files = sorted(glob.glob('sql_batches/batch_*.sql'))
    total_batches = len(batch_files)
    print(f"\nTotal de batches a ejecutar: {total_batches}")
    
    # Conectar a la base de datos
    print("\nConectando a Supabase...")
    try:
        conn = psycopg2.connect(DATABASE_URL)
        print("[OK] Conexion establecida")
    except Exception as e:
        print(f"[ERROR] No se pudo conectar: {e}")
        return
    
    # Ejecutar cada batch
    successful = 0
    failed = 0
    failed_batches = []
    
    start_time = time.time()
    
    for i, batch_file in enumerate(batch_files, 1):
        # Leer contenido del batch
        with open(batch_file, 'r', encoding='utf-8') as f:
            sql_content = f.read()
        
        # Ejecutar
        success, error = execute_batch(conn, sql_content, i)
        
        if success:
            successful += 1
            if i % 10 == 0 or i == total_batches:
                elapsed = time.time() - start_time
                rate = i / elapsed if elapsed > 0 else 0
                remaining = (total_batches - i) / rate if rate > 0 else 0
                print(f"  Batch {i}/{total_batches} - OK ({successful} exitosos, {failed} fallidos) - {remaining:.0f}s restantes")
        else:
            failed += 1
            failed_batches.append((batch_file, error))
            print(f"  Batch {i}/{total_batches} - ERROR: {error[:100]}...")
    
    # Cerrar conexion
    conn.close()
    
    # Resumen
    elapsed = time.time() - start_time
    print("\n" + "=" * 60)
    print("RESUMEN")
    print("=" * 60)
    print(f"Total batches: {total_batches}")
    print(f"Exitosos: {successful}")
    print(f"Fallidos: {failed}")
    print(f"Tiempo total: {elapsed:.1f} segundos")
    print(f"Registros insertados (aprox): {successful * 25}")
    
    if failed_batches:
        print("\nBatches fallidos:")
        for bf, err in failed_batches[:10]:
            print(f"  - {bf}: {err[:80]}...")

if __name__ == '__main__':
    main()

