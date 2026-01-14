# Guía del Sistema Nutricional

## Sistema de Medidas Unificado (1g como base)

### Alimentos Personalizados

Todos los valores nutricionales de los **alimentos personalizados** se almacenan en base a **1 gramo**. Esto permite una fácil escalabilidad y cálculos precisos.

**Ejemplo de alimento personalizado:**
```json
{
  "name": "Pechuga de pollo",
  "serving_size": 100,
  "serving_unit": "g",
  "calories": 1.65,      // kcal por 1g (165 kcal por 100g)
  "protein_g": 0.31,     // g de proteína por 1g (31g por 100g)
  "carbs_g": 0,          // g de carbohidratos por 1g
  "fat_g": 0.036,        // g de grasa por 1g (3.6g por 100g)
  "fiber_g": 0,
  "sugars_g": 0,
  "saturated_fat_g": 0.01,
  "sodium_mg": 0.74      // mg de sodio por 1g (74mg por 100g)
}
```

### Alimentos de la Base de Datos (Foods)

Los alimentos de la base de datos general mantienen sus valores nutricionales **por porción definida** (normalmente 100g), para compatibilidad con las fuentes de datos existentes (Open Food Facts, etc.).

**Conversión al calcular planes:**
```javascript
// Si un alimento tiene valores por 100g y queremos calcular para 150g:
const portionSize = 150; // gramos que queremos
const servingSize = 100; // tamaño de porción del alimento
const factor = portionSize / servingSize; // 1.5

const calories = food.calories * factor;
const protein = food.protein_g * factor;
// etc.
```

### Suplementos en el Sistema Nutricional

Los suplementos ahora se integran de forma similar a los alimentos, permitiendo:

1. **Añadir suplementos a planes nutricionales**
2. **Calcular macros totales incluyendo suplementos**
3. **Gestionar favoritos de suplementos**
4. **Instrucciones de cómo tomar** cada suplemento

**Ejemplo de suplemento en recomendación:**
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

## Estructura de Planes de Comidas

### Nombres de Comidas Personalizables

En lugar de "Desayuno", "Comida", "Cena", ahora usamos:
- **Comida 1** (por defecto 08:00)
- **Comida 2** (por defecto 13:00)
- **Comida 3** (por defecto 20:00)

Los nombres y horarios son completamente personalizables:

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

## Alergenos y Enfermedades

### Ficha del Cliente

El campo `health_data` del cliente ahora incluye:

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

### Endpoints disponibles

- `GET /api/v1/health/allergens` - Lista de alergenos comunes
- `GET /api/v1/health/diseases` - Lista de enfermedades comunes
- `GET /api/v1/health/intolerances` - Lista de intolerancias comunes

## Favoritos

### Alimentos Favoritos

- `GET /api/v1/nutrition/favorites` - Listar alimentos favoritos
- `POST /api/v1/nutrition/favorites/{food_id}` - Añadir a favoritos
- `DELETE /api/v1/nutrition/favorites/{food_id}` - Quitar de favoritos

### Suplementos Favoritos

- `GET /api/v1/supplements/favorites` - Listar suplementos favoritos
- `POST /api/v1/supplements/favorites/{supplement_id}` - Añadir a favoritos
- `DELETE /api/v1/supplements/favorites/{supplement_id}` - Quitar de favoritos

## Recordatorios Automáticos

### Sistema de Recordatorios cada 15 días

Los recordatorios se configuran por workspace y pueden ser para:
- Entrenadores (user_id)
- Clientes (client_id)

**Tipos de recordatorios:**
- `workout` - Recordatorio de entrenamiento
- `nutrition` - Recordatorio de nutrición
- `supplement` - Recordatorio de suplementos
- `check_in` - Recordatorio de seguimiento
- `measurement` - Recordatorio de mediciones

**Endpoints:**
- `GET /api/v1/reminders` - Listar recordatorios
- `POST /api/v1/reminders` - Crear recordatorio
- `PUT /api/v1/reminders/{id}` - Actualizar recordatorio
- `DELETE /api/v1/reminders/{id}` - Eliminar recordatorio
- `POST /api/v1/reminders/{id}/trigger` - Enviar recordatorio manualmente

**Ejemplo de creación:**
```json
{
  "client_id": "uuid...",
  "reminder_type": "check_in",
  "frequency_days": 15,
  "custom_message": "Es momento de hacer un seguimiento. Por favor actualiza tus medidas."
}
```

### Tarea Automática de Celery

La tarea `process_due_reminders` se ejecuta cada hora y envía:
- Notificación in-app
- Email al destinatario

Los recordatorios se reprograman automáticamente según la frecuencia configurada.

## Alimentos Personalizados

### Crear Alimento Personalizado

`POST /api/v1/nutrition/custom-foods`

```json
{
  "name": "Mi receta especial",
  "brand": "Casero",
  "category_id": "uuid...",
  "serving_size": 100,
  "serving_unit": "g",
  "calories": 2.5,        // por 1g
  "protein_g": 0.15,      // por 1g
  "carbs_g": 0.30,        // por 1g
  "fat_g": 0.10,          // por 1g
  "fiber_g": 0.05,
  "sugars_g": 0.10,
  "saturated_fat_g": 0.03,
  "sodium_mg": 0.5,
  "ingredients": "Pollo, arroz, verduras...",
  "allergens": "Puede contener trazas de gluten",
  "notes": "Receta especial para clientes con diabetes"
}
```

### Listar Alimentos Personalizados

`GET /api/v1/nutrition/custom-foods?search=receta`

Solo muestra los alimentos del workspace actual.

## Migración de Datos

Para ejecutar las migraciones:

```bash
cd backend
alembic upgrade head
```

Esto creará:
- Tabla `custom_foods`
- Tabla `food_favorites`
- Tabla `supplement_favorites`
- Tabla `reminder_settings`
- Campo `meal_times` en `meal_plans`
- Campos `how_to_take` y `timing` en `supplement_recommendations`
