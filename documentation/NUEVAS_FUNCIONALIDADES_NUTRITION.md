# Nuevas Funcionalidades del Sistema de Nutrición

## Resumen de Cambios Implementados

### 1. ✅ Avisos cada 15 días de recuerdo a entrenadores y usuarios

**Archivos creados/modificados:**
- `backend/app/models/notification.py` - Nuevo modelo `ReminderSetting`
- `backend/app/api/v1/endpoints/reminders.py` - Endpoints completos para gestión de recordatorios
- `backend/app/tasks/reminders.py` - Tareas de Celery para envío automático
- `backend/alembic/versions/003_add_allergens_diseases_favorites.py` - Migración

**Funcionalidades:**
- Recordatorios recurrentes configurables (por defecto cada 15 días)
- Tipos: `workout`, `nutrition`, `supplement`, `check_in`, `measurement`
- Se pueden configurar para entrenadores o clientes
- Envío automático vía email y notificación in-app
- Mensajes personalizables
- Auto-reprogramación después de cada envío

**Endpoints:**
```
GET    /api/v1/reminders
POST   /api/v1/reminders
GET    /api/v1/reminders/{id}
PUT    /api/v1/reminders/{id}
DELETE /api/v1/reminders/{id}
POST   /api/v1/reminders/{id}/trigger
```

---

### 2. ✅ Poner todas las medidas en 1g (Alimentos Personalizados)

**Archivos creados/modificados:**
- `backend/app/models/nutrition.py` - Nuevo modelo `CustomFood`
- `backend/app/api/v1/endpoints/nutrition.py` - Endpoints para alimentos personalizados
- `documentation/NUTRITION_SYSTEM_GUIDE.md` - Guía completa del sistema

**Funcionalidades:**
- Los alimentos personalizados almacenan valores nutricionales por 1g
- Facilita cálculos escalables y precisos
- Los alimentos de la base de datos general mantienen su estructura original
- Endpoint de cálculo nutricional unificado que maneja ambos tipos

**Estructura de alimento personalizado:**
```json
{
  "name": "Mi alimento",
  "calories": 1.65,      // por 1g
  "protein_g": 0.31,     // por 1g
  "carbs_g": 0.30,       // por 1g
  "fat_g": 0.036,        // por 1g
  "fiber_g": 0.02,       // por 1g
  "sugars_g": 0.05,      // por 1g
  "saturated_fat_g": 0.01,
  "sodium_mg": 0.74      // por 1g
}
```

**Endpoints:**
```
GET    /api/v1/nutrition/custom-foods
POST   /api/v1/nutrition/custom-foods
GET    /api/v1/nutrition/custom-foods/{id}
PUT    /api/v1/nutrition/custom-foods/{id}
DELETE /api/v1/nutrition/custom-foods/{id}
POST   /api/v1/nutrition/calculate-nutrition  // Calcula con alimentos + suplementos
```

---

### 3. ✅ Cambiar a Comida 1, Comida 2, Comida 3 con horarios editables

**Archivos modificados:**
- `backend/app/models/nutrition.py` - Campo `meal_times` en `MealPlan`
- `backend/app/api/v1/endpoints/nutrition.py` - Manejo de `meal_times`

**Funcionalidades:**
- Nombres de comidas completamente personalizables
- Horarios configurables para cada comida
- Por defecto: "Comida 1" (08:00), "Comida 2" (13:00), "Comida 3" (20:00)
- Se pueden agregar más comidas o cambiar los nombres

**Estructura:**
```json
{
  "meal_times": {
    "meals": [
      {"name": "Pre-entreno", "time": "07:00"},
      {"name": "Post-entreno", "time": "09:00"},
      {"name": "Comida principal", "time": "14:00"},
      {"name": "Merienda", "time": "17:00"},
      {"name": "Cena", "time": "21:00"}
    ]
  }
}
```

---

### 4. ✅ Añadir nutrición y cómo tomar suplementos

**Archivos modificados:**
- `backend/app/models/supplement.py` - Campos `how_to_take` y `timing`
- `backend/app/api/v1/endpoints/supplements.py` - Manejo de nuevos campos

**Funcionalidades:**
- Campo "Cómo tomar" (how_to_take): Instrucciones de preparación
- Campo "Timing": Momento óptimo para tomar
- Se incluyen en las recomendaciones de suplementos para clientes

**Ejemplo:**
```json
{
  "supplement_id": "uuid...",
  "dosage": "30g",
  "frequency": "Diario",
  "timing": "Después del entrenamiento",
  "how_to_take": "Mezclar con 300ml de agua o leche",
  "notes": "Tomar dentro de los 30 minutos post-entrenamiento"
}
```

---

### 5. ✅ Añadir favoritos para alimentos

**Archivos creados/modificados:**
- `backend/app/models/nutrition.py` - Modelo `FoodFavorite`
- `backend/app/api/v1/endpoints/nutrition.py` - Endpoints de favoritos

**Funcionalidades:**
- Cada usuario puede marcar alimentos favoritos
- Acceso rápido a alimentos frecuentemente usados
- Prevención de duplicados

**Endpoints:**
```
GET    /api/v1/nutrition/favorites
POST   /api/v1/nutrition/favorites/{food_id}
DELETE /api/v1/nutrition/favorites/{food_id}
```

---

### 6. ✅ Añadir alimentos personalizados

Ya cubierto en el punto 2, con endpoints completos para CRUD de alimentos personalizados por workspace.

---

### 7. ✅ Añadir alergenos y enfermedades a la ficha del cliente

**Archivos creados/modificados:**
- `backend/app/models/client.py` - Documentación actualizada de `health_data`
- `backend/app/schemas/health.py` - Constantes y esquemas
- `backend/app/api/v1/endpoints/health.py` - Endpoints para listas

**Funcionalidades:**
- Campo `health_data.allergens`: Lista de alergenos alimentarios
- Campo `health_data.diseases`: Lista de enfermedades/condiciones médicas
- Campo `health_data.intolerances`: Intolerancias alimentarias
- Campo `health_data.medications`: Medicamentos actuales
- Listas predefinidas de alergenos comunes (UE 14 + adicionales)
- Listas predefinidas de enfermedades comunes

**Estructura del health_data:**
```json
{
  "allergens": ["gluten", "lactosa", "frutos_secos"],
  "intolerances": ["fructosa"],
  "diseases": ["diabetes_tipo_2", "hipertension"],
  "medications": ["Metformina", "Losartán"],
  "injuries": ["Lesión de rodilla izquierda"],
  "activity_level": "moderate",
  "goal_type": "weight_loss",
  "goal_weight_kg": 75
}
```

**Endpoints:**
```
GET /api/v1/health/allergens      // Lista de 16 alergenos comunes
GET /api/v1/health/diseases       // Lista de 25+ enfermedades comunes
GET /api/v1/health/intolerances   // Lista de intolerancias comunes
```

---

### 8. ✅ Integrar suplementos como los alimentos en el sistema nutricional

**Archivos creados/modificados:**
- `backend/app/models/supplement.py` - Modelo `SupplementFavorite`
- `backend/app/api/v1/endpoints/supplements.py` - Endpoints de favoritos
- `backend/app/api/v1/endpoints/nutrition.py` - Endpoint de cálculo combinado

**Funcionalidades:**
- Favoritos para suplementos (igual que alimentos)
- Endpoint unificado para calcular macros incluyendo suplementos
- Los planes de nutrición pueden incluir suplementos en su estructura JSON
- Cálculo automático de valores nutricionales de suplementos según dosaje

**Endpoints de favoritos:**
```
GET    /api/v1/supplements/favorites
POST   /api/v1/supplements/favorites/{supplement_id}
DELETE /api/v1/supplements/favorites/{supplement_id}
```

**Endpoint de cálculo combinado:**
```
POST /api/v1/nutrition/calculate-nutrition
```

**Request:**
```json
{
  "foods": [
    {"id": "uuid1", "quantity": 150, "is_custom": false},
    {"id": "uuid2", "quantity": 200, "is_custom": true}
  ],
  "supplements": [
    {"id": "uuid3", "dosage_g": 30},
    {"id": "uuid4", "dosage_g": 5}
  ]
}
```

**Response:**
```json
{
  "total_calories": 450.5,
  "total_protein": 45.2,
  "total_carbs": 35.8,
  "total_fat": 12.3,
  "total_fiber": 8.5,
  "breakdown": {
    "foods": [...],
    "supplements": [...]
  }
}
```

---

## Migración de Base de Datos

### Nueva Migración: 003_add_allergens_diseases_favorites.py

**Nuevas tablas:**
1. `food_favorites` - Favoritos de alimentos por usuario
2. `custom_foods` - Alimentos personalizados del workspace
3. `supplement_favorites` - Favoritos de suplementos por usuario
4. `reminder_settings` - Configuración de recordatorios recurrentes

**Nuevos campos:**
1. `meal_plans.meal_times` - Estructura JSON de comidas personalizables
2. `supplement_recommendations.how_to_take` - Instrucciones de preparación
3. `supplement_recommendations.timing` - Momento para tomar

**Ejecutar migración:**
```bash
cd backend
alembic upgrade head
```

---

## Tareas de Celery

### Nueva tarea: `process_due_reminders`

**Frecuencia recomendada:** Cada hora

**Configuración en celery beat:**
```python
celery_app.conf.beat_schedule = {
    'process-reminders-every-hour': {
        'task': 'process_due_reminders',
        'schedule': crontab(minute=0),  # Cada hora en punto
    },
}
```

**Funcionalidad:**
- Busca todos los recordatorios activos cuya fecha de envío ya pasó
- Envía notificación in-app
- Envía email al destinatario
- Actualiza `last_sent` y reprograma `next_scheduled`

---

## Cambios en el Frontend (Recomendaciones)

### Componentes a crear/actualizar:

1. **MealPlanEditor**
   - Permitir editar nombres y horarios de comidas
   - Agregar suplementos además de alimentos
   - Calcular macros totales en tiempo real

2. **ClientHealthForm**
   - Checkboxes para alergenos comunes
   - Checkboxes para enfermedades comunes
   - Input para medicamentos
   - Usar endpoints `/api/v1/health/*` para poblar listas

3. **CustomFoodForm**
   - Formulario con campos en base 1g
   - Calculadora visual (ej: "165 kcal por 100g = 1.65 por 1g")
   - Información de alergenos

4. **FavoritesPanel**
   - Vista rápida de alimentos favoritos
   - Vista rápida de suplementos favoritos
   - Botón de estrella para añadir/quitar

5. **RemindersSettings**
   - Configurar recordatorios para cada cliente
   - Vista de próximos recordatorios programados
   - Botón para enviar manualmente

6. **SupplementRecommendationForm**
   - Campos adicionales: "Cómo tomar" y "Timing"
   - Plantillas predefinidas (ej: "Proteína post-entreno")

---

## Testing

### Casos de prueba prioritarios:

1. **Recordatorios**
   - Crear recordatorio cada 15 días
   - Verificar envío automático
   - Verificar reprogramación

2. **Alimentos personalizados**
   - Crear alimento con valores por 1g
   - Calcular nutrición con cantidad personalizada
   - Verificar cálculos correctos

3. **Favoritos**
   - Añadir/quitar de favoritos
   - Verificar que no se dupliquen
   - Listar favoritos por usuario

4. **Health data**
   - Actualizar alergenos en cliente
   - Actualizar enfermedades
   - Verificar estructura JSON correcta

5. **Cálculo combinado**
   - Calcular con alimentos regulares
   - Calcular con alimentos personalizados
   - Calcular con suplementos
   - Verificar totales correctos

---

## Próximos Pasos Sugeridos

1. **Frontend**: Implementar los componentes React mencionados
2. **Testing**: Crear tests unitarios y de integración
3. **Documentación**: Actualizar documentación de usuario
4. **Datos semilla**: Crear alimentos y suplementos predefinidos comunes
5. **Notificaciones**: Mejorar templates de email para recordatorios
6. **AI**: Integrar con generador AI para sugerir planes considerando alergenos/enfermedades

---

## Notas Importantes

- Los alimentos de la base de datos general (Open Food Facts) mantienen su estructura original por compatibilidad
- Solo los alimentos personalizados usan el sistema de 1g
- Los recordatorios se envían automáticamente, asegurarse de configurar Celery Beat
- El campo `health_data` es completamente flexible y puede expandirse sin migraciones
- Todos los endpoints requieren autenticación y pertenecen a un workspace
