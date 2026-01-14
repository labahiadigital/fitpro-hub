#!/usr/bin/env python3
"""
Script de verificación de la implementación del sistema de nutrición mejorado.
Verifica que todos los archivos necesarios existan y estén correctamente configurados.
"""

import os
import sys
from pathlib import Path

# Colores para terminal
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
RESET = '\033[0m'

def check_file(file_path, description):
    """Verifica si un archivo existe."""
    if os.path.exists(file_path):
        print(f"{GREEN}[OK]{RESET} {description}: {file_path}")
        return True
    else:
        print(f"{RED}[FAIL]{RESET} {description}: {file_path} - NO ENCONTRADO")
        return False

def check_import(file_path, import_string, description):
    """Verifica si un archivo contiene un import o definición específica."""
    if not os.path.exists(file_path):
        print(f"{RED}[FAIL]{RESET} {description}: Archivo no encontrado")
        return False
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
        if import_string in content:
            print(f"{GREEN}[OK]{RESET} {description}")
            return True
        else:
            print(f"{RED}[FAIL]{RESET} {description} - NO ENCONTRADO")
            return False

def main():
    print("\n" + "="*70)
    print("VERIFICACIÓN DE IMPLEMENTACIÓN - SISTEMA DE NUTRICIÓN MEJORADO")
    print("="*70 + "\n")
    
    results = []
    
    # 1. Verificar archivos de modelos
    print("\n[MODELOS DE BASE DE DATOS]\n")
    results.append(check_import(
        "backend/app/models/nutrition.py",
        "class CustomFood",
        "Modelo CustomFood"
    ))
    results.append(check_import(
        "backend/app/models/nutrition.py",
        "class FoodFavorite",
        "Modelo FoodFavorite"
    ))
    results.append(check_import(
        "backend/app/models/nutrition.py",
        "meal_times = Column",
        "Campo meal_times en MealPlan"
    ))
    results.append(check_import(
        "backend/app/models/supplement.py",
        "class SupplementFavorite",
        "Modelo SupplementFavorite"
    ))
    results.append(check_import(
        "backend/app/models/supplement.py",
        "how_to_take = Column",
        "Campo how_to_take en SupplementRecommendation"
    ))
    results.append(check_import(
        "backend/app/models/notification.py",
        "class ReminderSetting",
        "Modelo ReminderSetting"
    ))
    
    # 2. Verificar migración
    print("\n[MIGRACION DE BASE DE DATOS]\n")
    results.append(check_file(
        "backend/alembic/versions/003_add_allergens_diseases_favorites.py",
        "Migración 003"
    ))
    
    # 3. Verificar endpoints
    print("\n[ENDPOINTS API]\n")
    results.append(check_file(
        "backend/app/api/v1/endpoints/reminders.py",
        "Endpoints de recordatorios"
    ))
    results.append(check_file(
        "backend/app/api/v1/endpoints/health.py",
        "Endpoints de datos de salud"
    ))
    results.append(check_import(
        "backend/app/api/v1/endpoints/nutrition.py",
        "class CustomFoodCreate",
        "Schemas de alimentos personalizados"
    ))
    results.append(check_import(
        "backend/app/api/v1/endpoints/nutrition.py",
        "async def list_custom_foods",
        "Endpoint listar alimentos personalizados"
    ))
    results.append(check_import(
        "backend/app/api/v1/endpoints/nutrition.py",
        "async def list_favorite_foods",
        "Endpoint listar favoritos"
    ))
    results.append(check_import(
        "backend/app/api/v1/endpoints/nutrition.py",
        "async def calculate_nutrition",
        "Endpoint cálculo de nutrición"
    ))
    results.append(check_import(
        "backend/app/api/v1/endpoints/supplements.py",
        "async def list_favorite_supplements",
        "Endpoint favoritos de suplementos"
    ))
    
    # 4. Verificar router
    print("\n[CONFIGURACION DE ROUTER]\n")
    results.append(check_import(
        "backend/app/api/v1/router.py",
        "reminders",
        "Import de reminders"
    ))
    results.append(check_import(
        "backend/app/api/v1/router.py",
        "health",
        "Import de health"
    ))
    results.append(check_import(
        "backend/app/api/v1/router.py",
        'prefix="/reminders"',
        "Router de reminders registrado"
    ))
    results.append(check_import(
        "backend/app/api/v1/router.py",
        'prefix="/health"',
        "Router de health registrado"
    ))
    
    # 5. Verificar tareas de Celery
    print("\n[TAREAS DE CELERY]\n")
    results.append(check_file(
        "backend/app/tasks/reminders.py",
        "Tareas de recordatorios"
    ))
    results.append(check_import(
        "backend/app/tasks/reminders.py",
        'name="process_due_reminders"',
        "Tarea process_due_reminders"
    ))
    
    # 6. Verificar schemas
    print("\n[SCHEMAS]\n")
    results.append(check_file(
        "backend/app/schemas/health.py",
        "Schemas de salud"
    ))
    results.append(check_import(
        "backend/app/schemas/health.py",
        "COMMON_ALLERGENS",
        "Constante COMMON_ALLERGENS"
    ))
    results.append(check_import(
        "backend/app/schemas/health.py",
        "COMMON_DISEASES",
        "Constante COMMON_DISEASES"
    ))
    
    # 7. Verificar documentación
    print("\n[DOCUMENTACION]\n")
    results.append(check_file(
        "documentation/NUTRITION_SYSTEM_GUIDE.md",
        "Guía del sistema de nutrición"
    ))
    results.append(check_file(
        "documentation/NUEVAS_FUNCIONALIDADES_NUTRITION.md",
        "Documentación de funcionalidades"
    ))
    results.append(check_file(
        "RESUMEN_CAMBIOS_NUTRITION.md",
        "Resumen de cambios"
    ))
    results.append(check_file(
        "CHECKLIST_IMPLEMENTACION.md",
        "Checklist de implementación"
    ))
    
    # Resumen
    print("\n" + "="*70)
    total = len(results)
    passed = sum(results)
    failed = total - passed
    
    if failed == 0:
        print(f"{GREEN}OK - TODOS LOS CHECKS PASARON ({passed}/{total}){RESET}")
        print("\nLa implementacion esta completa.")
        print("\nPROXIMOS PASOS:")
        print("   1. Ejecutar migración: cd backend && alembic upgrade head")
        print("   2. Configurar Celery Beat")
        print("   3. Reiniciar servicios")
        print("   4. Implementar componentes de frontend")
    else:
        print(f"{RED}ERROR - ALGUNOS CHECKS FALLARON ({passed}/{total} pasaron, {failed} fallaron){RESET}")
        print("\nRevisa los archivos faltantes arriba.")
        sys.exit(1)
    
    print("="*70 + "\n")

if __name__ == "__main__":
    main()
