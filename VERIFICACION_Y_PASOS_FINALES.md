# Verificación y Pasos Finales

## 📋 Estado Actual

### ✅ Completado
- Backend: Todos los modelos, endpoints y migraciones creados
- Frontend: Todos los componentes actualizados con las nuevas funcionalidades
- Sin errores de linting en ningún archivo

### ⏳ Pendiente de Ejecutar
- Migración de base de datos
- Verificación de tablas en Supabase
- Prueba de funcionalidades en navegador

---

## 🚀 Pasos para Completar la Implementación

### 1. Backend - Configurar Entorno

```bash
cd backend

# Crear entorno virtual (si no existe)
python -m venv venv

# Activar entorno virtual
# Windows PowerShell:
.\venv\Scripts\Activate.ps1
# Windows CMD:
.\venv\Scripts\activate.bat

# Instalar dependencias
pip install -r requirements.txt
```

### 2. Backend - Ejecutar Migraciones

```bash
# Asegúrate de estar en el directorio backend con el entorno virtual activado

# Verificar conexión a la base de datos
alembic current

# Ejecutar migraciones
alembic upgrade head

# Deberías ver:
# INFO  [alembic.runtime.migration] Running upgrade 002 -> 003, add allergens diseases and favorites
```

### 3. Verificar Tablas Creadas

Las siguientes tablas deberían haberse creado:

- ✅ `custom_foods` - Alimentos personalizados (valores por 1g)
- ✅ `food_favorites` - Favoritos de alimentos
- ✅ `supplement_favorites` - Favoritos de suplementos
- ✅ `reminder_settings` - Configuración de recordatorios

**Campos añadidos a tablas existentes:**
- ✅ `meal_plans.meal_times` - Estructura JSON de comidas personalizables
- ✅ `supplement_recommendations.how_to_take` - Instrucciones
- ✅ `supplement_recommendations.timing` - Momento para tomar

### 4. Iniciar Servicios

#### Backend
```bash
cd backend
# Con entorno virtual activado:
uvicorn app.main:app --reload --port 8000
```

#### Frontend
```bash
cd frontend
npm install  # Si es la primera vez
npm run dev
```

### 5. Verificar en Navegador

1. **Abrir aplicación**: `http://localhost:5173`

2. **Ir a Nutrición** (`/nutrition`)

3. **Verificar Funcionalidades:**

   **A. Alimentos con Favoritos**
   - [ ] Ver lista de alimentos
   - [ ] Click en estrella (debería ponerse amarilla)
   - [ ] Recargar página (estrella debe seguir amarilla)
   - [ ] Click de nuevo (estrella debe ponerse gris)

   **B. Crear Plan Nutricional**
   - [ ] Click en "Nuevo Plan"
   - [ ] Llenar nombre, descripción, macros
   - [ ] Scroll al constructor de plan

   **C. Agregar Comidas**
   - [ ] Click en "Comida 1" (debería crearse)
   - [ ] Editar nombre (ej: cambiar a "Pre-entreno")
   - [ ] Editar hora (ej: cambiar a "07:00")
   - [ ] Los cambios deben verse inmediatamente

   **D. Agregar Alimentos/Suplementos**
   - [ ] Click en "Añadir Alimento o Suplemento"
   - [ ] Debería abrirse modal con DOS pestañas:
     - "Alimentos"
     - "Suplementos"
   - [ ] En pestaña "Alimentos":
     - [ ] Buscar un alimento
     - [ ] Click para agregarlo
   - [ ] En pestaña "Suplementos":
     - [ ] Debe mostrar suplementos disponibles
     - [ ] Click para agregarlo
     - [ ] Debe verse con ícono de píldora 💊

   **E. Cantidades en Gramos**
   - [ ] Al agregar alimento, debería mostrar "100g" por defecto
   - [ ] Input debe tener sufijo "g"
   - [ ] Cambiar valor a "150" → debe mostrar "150g"
   - [ ] Macros deben actualizarse automáticamente
   - [ ] NO debe haber multiplicadores como "1x", "2x"

   **F. Guardar y Verificar**
   - [ ] Guardar plan
   - [ ] Recargar página
   - [ ] Abrir plan guardado
   - [ ] Verificar que nombres, horarios y cantidades se mantienen

---

## 🐛 Troubleshooting

### Problema: "No se pueden cargar los alimentos"

**Causa**: Tabla `foods` vacía en Supabase

**Solución**:
```sql
-- Ejecutar en SQL Editor de Supabase
-- Insertar algunos alimentos de ejemplo

INSERT INTO foods (name, category, calories, protein_g, carbs_g, fat_g, quantity, is_global)
VALUES 
  ('Pechuga de Pollo', 'en:meats', 165, 31, 0, 3.6, '100g', true),
  ('Arroz Blanco', 'en:cereals-and-potatoes', 130, 2.7, 28, 0.3, '100g', true),
  ('Brócoli', 'en:vegetables', 34, 2.8, 7, 0.4, '100g', true);
```

### Problema: "No se pueden cargar los suplementos"

**Causa**: Tabla `supplements` vacía

**Solución**:
```sql
-- Insertar algunos suplementos de ejemplo

INSERT INTO supplements (name, brand, category, serving_size, calories, protein, carbs, fat, usage_instructions, is_global)
VALUES 
  ('Proteína Whey', 'Optimum Nutrition', 'proteína', '30g', 120, 24, 3, 1, 'Mezclar con agua o leche', true),
  ('Creatina', 'Creapure', 'creatina', '5g', 0, 0, 0, 0, 'Mezclar con agua o zumo', true),
  ('BCAA', 'Scitec', 'aminoácidos', '10g', 40, 10, 0, 0, 'Tomar durante el entrenamiento', true);
```

### Problema: "Error 404 al llamar a /nutrition/favorites"

**Causa**: Backend no está corriendo o tablas no creadas

**Solución**:
1. Verificar que backend está corriendo: `http://localhost:8000/docs`
2. Ejecutar migraciones: `alembic upgrade head`
3. Verificar en Supabase que tabla `food_favorites` existe

### Problema: "Los favoritos no se guardan"

**Causa**: Error de autenticación o workspace_id

**Verificación**:
1. Abrir DevTools (F12) → Console
2. Ver si hay errores de red
3. Verificar que el usuario está autenticado
4. Verificar workspace_id en localStorage

---

## 📊 Verificación de Tablas en Supabase

### Acceso al Dashboard

1. Ir a: https://supabase.com/dashboard/project/ougfmkbjrpnjvujhuuyy
2. Login con tus credenciales
3. Ir a "Table Editor"

### Tablas a Verificar

#### 1. `custom_foods`
**Columnas esperadas:**
- id (uuid)
- workspace_id (uuid)
- created_by (uuid)
- name (text)
- brand (text)
- category_id (uuid)
- serving_size (numeric)
- serving_unit (text)
- calories (numeric)
- protein_g (numeric)
- carbs_g (numeric)
- fat_g (numeric)
- fiber_g (numeric)
- sugars_g (numeric)
- saturated_fat_g (numeric)
- sodium_mg (numeric)
- ingredients (text)
- allergens (text)
- image_url (text)
- notes (text)
- created_at (timestamp)
- updated_at (timestamp)

#### 2. `food_favorites`
**Columnas esperadas:**
- id (uuid)
- workspace_id (uuid)
- user_id (uuid)
- food_id (uuid)
- created_at (timestamp)
- updated_at (timestamp)
- CONSTRAINT: unique(user_id, food_id)

#### 3. `supplement_favorites`
**Columnas esperadas:**
- id (uuid)
- workspace_id (uuid)
- user_id (uuid)
- supplement_id (uuid)
- created_at (timestamp)
- updated_at (timestamp)
- CONSTRAINT: unique(user_id, supplement_id)

#### 4. `reminder_settings`
**Columnas esperadas:**
- id (uuid)
- workspace_id (uuid)
- user_id (uuid)
- client_id (uuid)
- reminder_type (varchar)
- frequency_days (integer)
- last_sent (timestamp)
- next_scheduled (timestamp)
- is_active (boolean)
- custom_message (text)
- created_at (timestamp)
- updated_at (timestamp)

#### 5. `meal_plans` (campo añadido)
**Nuevo campo:**
- meal_times (jsonb) - Debe tener valor por defecto

#### 6. `supplement_recommendations` (campos añadidos)
**Nuevos campos:**
- how_to_take (text)
- timing (text)

---

## ✅ Checklist de Verificación Completa

### Backend
- [ ] Entorno virtual creado y activado
- [ ] Dependencias instaladas (`pip install -r requirements.txt`)
- [ ] Variables de entorno configuradas (`.env`)
- [ ] Migraciones ejecutadas (`alembic upgrade head`)
- [ ] Backend corriendo (`uvicorn app.main:app --reload`)
- [ ] Swagger docs accesible (`http://localhost:8000/docs`)

### Base de Datos
- [ ] Tabla `custom_foods` existe
- [ ] Tabla `food_favorites` existe
- [ ] Tabla `supplement_favorites` existe
- [ ] Tabla `reminder_settings` existe
- [ ] Campo `meal_plans.meal_times` existe
- [ ] Campos `supplement_recommendations.how_to_take` y `timing` existen

### Frontend
- [ ] Dependencias instaladas (`npm install`)
- [ ] Frontend corriendo (`npm run dev`)
- [ ] App accesible (`http://localhost:5173`)
- [ ] Sin errores en consola del navegador

### Funcionalidades
- [ ] Alimentos muestran botón de estrella
- [ ] Click en estrella funciona (añade/quita favorito)
- [ ] Al crear plan, se pueden editar nombres de comidas
- [ ] Al crear plan, se pueden editar horarios
- [ ] Modal muestra pestañas "Alimentos" y "Suplementos"
- [ ] Se pueden agregar suplementos a comidas
- [ ] Suplementos se distinguen con ícono de píldora
- [ ] Cantidades se muestran en gramos (ej: "150g")
- [ ] Input de cantidad tiene sufijo "g"
- [ ] Cálculos de macros son correctos
- [ ] Al guardar plan, todo se persiste correctamente

---

## 🎯 Prueba Completa End-to-End

### Escenario: Crear plan para cliente con suplementación

1. **Login** en la aplicación
2. **Ir a Nutrición** → Pestaña "Planes"
3. **Click "Nuevo Plan"**
4. **Llenar datos básicos**:
   - Nombre: "Plan Ganancia Muscular"
   - Descripción: "Plan para aumentar masa muscular"
   - Calorías: 3000
   - Proteína: 200g
   - Carbohidratos: 350g
   - Grasas: 80g

5. **Día Lunes - Agregar comidas**:
   
   a) **Comida 1 (Pre-entreno)**:
   - Click "Comida 1"
   - Editar nombre → "Pre-entreno"
   - Editar hora → "07:00"
   - Click "Añadir Alimento o Suplemento"
   - Pestaña "Alimentos" → Buscar "avena" → Agregar
   - Cambiar cantidad a "80g"
   - Pestaña "Suplementos" → Agregar "Cafeína" → "200" (mg convertido a "0.2g")
   
   b) **Comida 2 (Post-entreno)**:
   - Click "Comida 2"
   - Editar nombre → "Post-entreno"
   - Editar hora → "09:00"
   - Agregar "Pechuga de Pollo" → "200g"
   - Agregar "Arroz" → "150g"
   - Agregar suplemento "Proteína Whey" → "30g"
   
   c) **Comida 3 (Comida principal)**:
   - Click "Comida 3"
   - Editar nombre → "Comida"
   - Editar hora → "14:00"
   - Agregar alimentos...

6. **Verificar Resumen del Día**:
   - Ver que macros se calculan correctamente
   - Calorías totales
   - Proteína, Carbohidratos, Grasas

7. **Copiar a todos los días**:
   - Click "Copiar a todos los días"
   - Verificar que se replica en Martes, Miércoles, etc.

8. **Marcar favoritos**:
   - Volver a pestaña "Alimentos"
   - Buscar "Pechuga de Pollo"
   - Click en estrella → Debe ponerse amarilla
   - Buscar "Proteína Whey" en suplementos
   - Click en estrella → Debe ponerse amarilla

9. **Guardar Plan**:
   - Click "Crear Plan"
   - Debe mostrar notificación de éxito
   - Plan debe aparecer en lista

10. **Verificar Persistencia**:
    - Recargar página (F5)
    - Buscar el plan creado
    - Click "Editar"
    - Verificar que:
      - Nombres de comidas personalizados se mantienen
      - Horarios se mantienen
      - Cantidades en gramos se mantienen
      - Suplementos están presentes

11. **Verificar Favoritos**:
    - Recargar página
    - Ir a pestaña "Alimentos"
    - Buscar "Pechuga de Pollo"
    - Estrella debe estar amarilla (favorito)

---

## 📞 Contacto y Soporte

Si encuentras algún problema durante la verificación:

1. **Revisa los logs del backend**:
   ```bash
   # En la terminal donde corre uvicorn
   # Busca errores en las peticiones
   ```

2. **Revisa la consola del navegador**:
   ```
   F12 → Console
   Busca errores en rojo
   ```

3. **Verifica la red**:
   ```
   F12 → Network
   Filtra por "Fetch/XHR"
   Mira las peticiones fallidas (en rojo)
   ```

4. **Documentación de referencia**:
   - `CAMBIOS_FRONTEND_COMPLETADOS.md` - Resumen técnico
   - `NUEVAS_FUNCIONALIDADES_NUTRITION.md` - Documentación de APIs
   - `RESUMEN_CAMBIOS_NUTRITION.md` - Resumen ejecutivo

---

## ✨ Resultado Esperado

Al completar todos los pasos, deberías tener:

✅ **Sistema de favoritos funcionando** (estrellas amarillas)
✅ **Nombres de comidas personalizables** (Pre-entreno, Post-entreno, etc.)
✅ **Horarios editables** por comida
✅ **Cantidades en gramos específicos** (no multiplicadores)
✅ **Suplementos integrados** en planes nutricionales
✅ **Cálculos de macros precisos** incluyendo suplementos
✅ **Todo persistiendo correctamente** en la base de datos

**¡El sistema completo de nutrición mejorado está listo para producción!** 🎉
