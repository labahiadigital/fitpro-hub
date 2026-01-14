# Checklist de Implementación - Sistema de Nutrición Mejorado

## ✅ Backend - Modelos de Base de Datos

- [x] Modelo `ReminderSetting` creado en `notification.py`
- [x] Modelo `CustomFood` creado en `nutrition.py`
- [x] Modelo `FoodFavorite` creado en `nutrition.py`
- [x] Modelo `SupplementFavorite` creado en `supplement.py`
- [x] Campo `meal_times` agregado a `MealPlan`
- [x] Campos `how_to_take` y `timing` agregados a `SupplementRecommendation`
- [x] Documentación de `health_data` actualizada en `client.py`

## ✅ Backend - Migraciones

- [x] Migración `003_add_allergens_diseases_favorites.py` creada
- [x] Tabla `reminder_settings` definida
- [x] Tabla `custom_foods` definida
- [x] Tabla `food_favorites` definida
- [x] Tabla `supplement_favorites` definida
- [ ] **Ejecutar:** `cd backend && alembic upgrade head`

## ✅ Backend - Endpoints

### Recordatorios
- [x] `GET /api/v1/reminders` - Listar
- [x] `POST /api/v1/reminders` - Crear
- [x] `GET /api/v1/reminders/{id}` - Obtener
- [x] `PUT /api/v1/reminders/{id}` - Actualizar
- [x] `DELETE /api/v1/reminders/{id}` - Eliminar
- [x] `POST /api/v1/reminders/{id}/trigger` - Enviar manualmente

### Alimentos Personalizados
- [x] `GET /api/v1/nutrition/custom-foods` - Listar
- [x] `POST /api/v1/nutrition/custom-foods` - Crear
- [x] `GET /api/v1/nutrition/custom-foods/{id}` - Obtener
- [x] `PUT /api/v1/nutrition/custom-foods/{id}` - Actualizar
- [x] `DELETE /api/v1/nutrition/custom-foods/{id}` - Eliminar

### Favoritos
- [x] `GET /api/v1/nutrition/favorites` - Listar alimentos favoritos
- [x] `POST /api/v1/nutrition/favorites/{food_id}` - Añadir
- [x] `DELETE /api/v1/nutrition/favorites/{food_id}` - Quitar
- [x] `GET /api/v1/supplements/favorites` - Listar suplementos favoritos
- [x] `POST /api/v1/supplements/favorites/{supplement_id}` - Añadir
- [x] `DELETE /api/v1/supplements/favorites/{supplement_id}` - Quitar

### Cálculos
- [x] `POST /api/v1/nutrition/calculate-nutrition` - Calcular macros (alimentos + suplementos)

### Datos de Salud
- [x] `GET /api/v1/health/allergens` - Listar alergenos
- [x] `GET /api/v1/health/diseases` - Listar enfermedades
- [x] `GET /api/v1/health/intolerances` - Listar intolerancias

## ✅ Backend - Tareas de Celery

- [x] Tarea `process_due_reminders` creada
- [x] Tarea `create_default_reminders_for_client` creada
- [x] Función `_send_reminder` implementada
- [ ] **Configurar:** Celery Beat schedule para ejecutar cada hora

## ✅ Backend - Schemas

- [x] `ReminderCreate` schema
- [x] `ReminderUpdate` schema
- [x] `ReminderResponse` schema
- [x] `CustomFoodCreate` schema
- [x] `CustomFoodResponse` schema
- [x] `MealTimeSchema` schema
- [x] `MealTimesSchema` schema
- [x] `NutritionCalculationRequest` schema
- [x] `NutritionCalculationResponse` schema
- [x] `HealthDataSchema` schema (referencia)
- [x] Constantes de alergenos y enfermedades

## ✅ Backend - Router

- [x] Router de `reminders` registrado
- [x] Router de `health` registrado
- [x] Sin errores de linter

## ✅ Documentación

- [x] `NUTRITION_SYSTEM_GUIDE.md` - Guía completa del sistema
- [x] `NUEVAS_FUNCIONALIDADES_NUTRITION.md` - Documentación detallada
- [x] `RESUMEN_CAMBIOS_NUTRITION.md` - Resumen ejecutivo
- [x] `CHECKLIST_IMPLEMENTACION.md` - Este checklist

## 🔄 Pendiente - Configuración

### 1. Ejecutar Migración de Base de Datos
```bash
cd backend
alembic upgrade head
```

### 2. Configurar Celery Beat
En `backend/app/tasks/celery_app.py` o donde configures Celery:

```python
from celery.schedules import crontab

celery_app.conf.beat_schedule = {
    'process-reminders-every-hour': {
        'task': 'process_due_reminders',
        'schedule': crontab(minute=0),  # Cada hora en punto
    },
}
```

### 3. Reiniciar Servicios
```bash
# Reiniciar backend
docker-compose restart backend

# Reiniciar Celery worker
docker-compose restart celery

# Iniciar Celery beat (si no está corriendo)
docker-compose up -d celery-beat
```

## 🔄 Pendiente - Frontend

### Componentes a Crear/Actualizar

#### 1. ReminderSettings Component
```tsx
// src/components/settings/ReminderSettings.tsx
- Formulario para crear/editar recordatorios
- Lista de recordatorios activos
- Botón para enviar manualmente
- Filtros por tipo y destinatario
```

#### 2. CustomFoodForm Component
```tsx
// src/components/nutrition/CustomFoodForm.tsx
- Formulario con campos por 1g
- Calculadora visual (ej: 165 kcal/100g = 1.65/1g)
- Campo de alergenos
- Campo de ingredientes
```

#### 3. ClientHealthForm Component
```tsx
// src/components/clients/ClientHealthForm.tsx
- Checkboxes para alergenos comunes
- Checkboxes para enfermedades comunes
- Input array para medicamentos
- Usar endpoints /api/v1/health/* para poblar
```

#### 4. MealPlanEditor Updates
```tsx
// src/components/nutrition/MealPlanEditor.tsx
- Editor de nombres y horarios de comidas
- Agregar suplementos además de alimentos
- Calculadora de macros en tiempo real
- Usar endpoint /api/v1/nutrition/calculate-nutrition
```

#### 5. FavoriteButton Component
```tsx
// src/components/common/FavoriteButton.tsx
- Botón de estrella toggle
- Maneja alimentos y suplementos
- Feedback visual
```

### Hooks a Crear

```tsx
// src/hooks/useReminders.ts
export function useReminders() {
  // GET, POST, PUT, DELETE reminders
}

// src/hooks/useCustomFoods.ts
export function useCustomFoods() {
  // GET, POST, PUT, DELETE custom foods
}

// src/hooks/useFavorites.ts
export function useFavorites(type: 'food' | 'supplement') {
  // GET, POST, DELETE favorites
}

// src/hooks/useHealthData.ts
export function useHealthData() {
  // GET allergens, diseases, intolerances
}
```

## 🧪 Testing Recomendado

### Tests Unitarios Backend

```python
# tests/test_reminders.py
- test_create_reminder()
- test_list_reminders()
- test_trigger_reminder()
- test_auto_reschedule()

# tests/test_custom_foods.py
- test_create_custom_food()
- test_calculate_nutrition_1g_base()
- test_custom_food_workspace_isolation()

# tests/test_favorites.py
- test_add_food_to_favorites()
- test_prevent_duplicate_favorites()
- test_list_user_favorites()

# tests/test_health_data.py
- test_update_client_allergens()
- test_update_client_diseases()
- test_get_allergen_list()
```

### Tests de Integración

```python
# tests/integration/test_nutrition_flow.py
- test_complete_meal_plan_with_custom_foods()
- test_calculate_nutrition_with_supplements()
- test_meal_plan_with_custom_meal_times()

# tests/integration/test_reminders_flow.py
- test_create_and_send_reminder()
- test_reminder_rescheduling()
```

### Tests E2E Frontend

```typescript
// e2e/nutrition.spec.ts
- Create custom food and add to meal plan
- Mark food as favorite
- Calculate nutrition with supplements
- Update meal times

// e2e/reminders.spec.ts
- Create reminder for client
- View upcoming reminders
- Trigger reminder manually

// e2e/client-health.spec.ts
- Add allergens to client
- Add diseases to client
- View health data in profile
```

## 📊 Verificación Final

### Checklist de Pruebas Manuales

- [ ] Crear un recordatorio cada 15 días para un cliente
- [ ] Verificar que el recordatorio aparece en la lista
- [ ] Enviar un recordatorio manualmente
- [ ] Crear un alimento personalizado con valores por 1g
- [ ] Añadir el alimento personalizado a un plan de comidas
- [ ] Calcular nutrición incluyendo suplementos
- [ ] Marcar un alimento como favorito
- [ ] Marcar un suplemento como favorito
- [ ] Actualizar alergenos en la ficha de un cliente
- [ ] Actualizar enfermedades en la ficha de un cliente
- [ ] Crear plan de comidas con nombres personalizados ("Pre-entreno", etc.)
- [ ] Editar horarios de comidas en un plan
- [ ] Añadir instrucciones "cómo tomar" a una recomendación de suplemento
- [ ] Verificar que se envía email de recordatorio (revisar logs)

### Validación de Datos

```sql
-- Verificar tablas creadas
SELECT table_name FROM information_schema.tables 
WHERE table_name IN ('custom_foods', 'food_favorites', 'supplement_favorites', 'reminder_settings');

-- Verificar campos nuevos
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'meal_plans' AND column_name = 'meal_times';

SELECT column_name FROM information_schema.columns 
WHERE table_name = 'supplement_recommendations' 
AND column_name IN ('how_to_take', 'timing');
```

## 📈 Métricas de Éxito

Una vez implementado, monitorear:

- [ ] Número de recordatorios creados
- [ ] Tasa de envío exitoso de recordatorios
- [ ] Número de alimentos personalizados por workspace
- [ ] Uso de favoritos (alimentos y suplementos)
- [ ] Completitud de datos de salud en clientes (% con alergenos/enfermedades)
- [ ] Tiempo de cálculo de nutrición combinada

## 🎯 Estado General

- **Backend Models:** ✅ 100% Completado
- **Backend Endpoints:** ✅ 100% Completado
- **Backend Tasks:** ✅ 100% Completado
- **Documentación:** ✅ 100% Completado
- **Migración BD:** ⏳ Pendiente de ejecutar
- **Frontend:** ⏳ Pendiente de implementar
- **Testing:** ⏳ Pendiente de implementar

**Próximo paso:** Ejecutar migración de BD y comenzar implementación de frontend.
