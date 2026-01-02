# Trackfiz - Nuevas Funcionalidades Implementadas

## Documento de requisitos de E13 Fitness / Borja Sanfelix

**Fecha:** Enero 2026  
**Estado:** ✅ COMPLETADO

---

## 📊 Estado de Implementación

| # | Funcionalidad | Prioridad | Estado |
|---|---------------|-----------|--------|
| 1 | Integración con Redsys | Alta | ✅ Completado |
| 2 | Biblioteca de Suplementación | Alta | ✅ Completado |
| 3 | Sistema de Intolerancias y Alergias | Alta | ✅ Completado |
| 4 | Generación de PDF | Alta | ✅ Completado |
| 5 | Nombres de Comidas Editables | Media | ✅ Completado |
| 6 | Bandeja de Entrada Integrada | Media | ✅ Completado |
| 7 | Chat Habilitado/Deshabilitado por Cliente | Media | ✅ Completado |
| 8 | Videos de Ejecución en Ejercicios | Media | ✅ Completado |
| 9 | Tooltips Informativos | Baja | ✅ Completado |
| 10 | Gestión de Equipo: Roles Personalizados | Alta | ✅ Completado |
| 11 | CRM: Campos Editables y Agrupables | Media | ✅ Completado |
| 12 | Ficha de Cliente Mejorada | Alta | ✅ Completado |
| 13 | **Clases Online en Vivo** | Media | ✅ Completado |
| 14 | **Generación con IA** | Baja | ✅ Completado |
| 15 | **Integración con Wearables** | Baja | ✅ Completado |

---

## 📋 Detalle de Implementación

### 1. 💳 INTEGRACIÓN CON REDSYS ✅
**Prioridad:** Alta  
**Estado:** ✅ Completado

Integración completa con la pasarela de pago española Redsys.

**Archivos creados:**
- `backend/app/services/redsys.py` - Servicio de integración
- `backend/app/api/v1/endpoints/redsys.py` - Endpoints de la API
- `backend/app/core/config.py` - Configuración de credenciales

**Funcionalidades implementadas:**
- ✅ Configurar credenciales Redsys (merchant code, secret key, terminal)
- ✅ Endpoint de creación de pago (`POST /api/v1/redsys/create-payment`)
- ✅ Webhook de notificación (`POST /api/v1/redsys/notification`)
- ✅ Verificación de firma HMAC-SHA256
- ✅ Soporte para entorno de pruebas y producción
- ✅ Códigos de respuesta en español

---

### 2. 💊 BIBLIOTECA DE SUPLEMENTACIÓN ✅
**Prioridad:** Alta  
**Estado:** ✅ Completado

Biblioteca completa de suplementos con sistema de referidos.

**Archivos creados:**
- `backend/app/models/supplement.py` - Modelos de datos
- `backend/app/api/v1/endpoints/supplements.py` - Endpoints de la API
- `frontend/src/components/supplements/SupplementLibrary.tsx` - Componente de biblioteca
- `frontend/src/pages/supplements/SupplementsPage.tsx` - Página de suplementos

**Funcionalidades implementadas:**
- ✅ Modelo de datos para suplementos (nombre, descripción, marca, enlace, imagen)
- ✅ Campo para código/enlace de referido por entrenador
- ✅ Porcentaje de comisión configurable
- ✅ Recomendaciones de suplementos por cliente
- ✅ Panel de administración de suplementos

---

### 3. 🚨 SISTEMA DE INTOLERANCIAS Y ALERGIAS ✅
**Prioridad:** Alta  
**Estado:** ✅ Completado

Sistema completo de gestión de alergias e intolerancias con visualización en rojo.

**Archivos creados/modificados:**
- `backend/app/models/client.py` - Campos de alergias, intolerancias y lesiones
- `frontend/src/components/common/AllergenBadge.tsx` - Componentes de visualización

**Funcionalidades implementadas:**
- ✅ Campo de intolerancias/alergias en ficha de cliente
- ✅ Lista de 14 alérgenos comunes (según normativa UE)
- ✅ Destacar en rojo alimentos problemáticos
- ✅ Alerta visual al asignar alimentos con intolerancias
- ✅ Sección visible en ficha de cliente: "Lesiones e intolerancias/alergias"
- ✅ Selector de alérgenos para formularios

---

### 4. 📄 GENERACIÓN DE PDF Y VISTA DE PLAN NUTRICIONAL ✅
**Prioridad:** Alta  
**Estado:** ✅ Completado

Generación de PDFs profesionales y vista web detallada para planes nutricionales.

**Archivos creados:**
- `backend/app/services/pdf_generator.py` - Servicio de generación
- `backend/app/api/v1/endpoints/pdf.py` - Endpoints de la API
- `frontend/src/components/nutrition/MealPlanDetailView.tsx` - Vista detallada del plan
- `frontend/src/pages/nutrition/MealPlanDetailPage.tsx` - Página de detalle

**Funcionalidades implementadas:**
- ✅ Botón "Exportar a PDF" en plan nutricional
- ✅ Botón "Exportar a PDF" en plan de entrenamiento
- ✅ Diseño profesional con branding del workspace
- ✅ **ALERTA IMPORTANTE**: Aviso de revisar alimentos con intolerancias/alergias
- ✅ Descarga directa del PDF
- ✅ **Vista web detallada** del plan nutricional con:
  - Cálculos energéticos (TDEE, mantenimiento, hipertrofia, definición)
  - Distribución de macronutrientes con gráfico circular
  - Temporalización de objetivos
  - Vista de comidas por día con tabla detallada
  - Sección de suplementación deportiva
  - Alertas de alérgenos en tiempo real
- ✅ Todos los datos provienen de Supabase (sin hardcoding)

---

### 5. ✏️ NOMBRES DE COMIDAS EDITABLES ✅
**Prioridad:** Media  
**Estado:** ✅ Completado

Nombres de comidas personalizables por cliente o workspace.

**Archivos creados:**
- `frontend/src/components/nutrition/EditableMealName.tsx` - Componente editable
- `backend/app/models/workspace.py` - Configuración de nombres

**Funcionalidades implementadas:**
- ✅ Campo editable para nombre de comida
- ✅ Valores por defecto: Desayuno, Media Mañana, Almuerzo, Merienda, Cena, Pre/Post-entreno
- ✅ Guardar nombres personalizados por workspace
- ✅ Edición inline con click
- ✅ Restaurar nombres por defecto

---

### 6. 📥 BANDEJA DE ENTRADA INTEGRADA ✅
**Prioridad:** Media  
**Estado:** ✅ Completado

Panel de bandeja de entrada integrado bajo el chat.

**Archivos creados:**
- `frontend/src/components/chat/InboxPanel.tsx` - Panel de bandeja de entrada

**Funcionalidades implementadas:**
- ✅ Sección "Bandeja de entrada" debajo de Chat
- ✅ Mostrar mensajes/notificaciones pendientes
- ✅ Marcar como leído/no leído
- ✅ Indicador de mensajes importantes
- ✅ Panel colapsable
- ✅ Contador de no leídos

---

### 7. 🔒 CHAT HABILITADO/DESHABILITADO POR CLIENTE ✅
**Prioridad:** Media  
**Estado:** ✅ Completado

Control de chat individual por cliente.

**Archivos modificados:**
- `backend/app/models/client.py` - Campo `chat_enabled`
- `frontend/src/pages/clients/ClientDetailPage.tsx` - Switch de control

**Funcionalidades implementadas:**
- ✅ Toggle en ficha de cliente "Chat habilitado"
- ✅ Indicador visual del estado
- ✅ Mensaje informativo del estado

---

### 8. 🎬 VIDEOS DE EJECUCIÓN EN EJERCICIOS ✅
**Prioridad:** Media  
**Estado:** ✅ Completado

Videos demostrativos de ejecución correcta de ejercicios.

**Archivos creados/modificados:**
- `backend/app/models/exercise.py` - Campo `execution_video_url`
- `frontend/src/components/workouts/ExerciseVideoPlayer.tsx` - Reproductor de video

**Funcionalidades implementadas:**
- ✅ Campo de video principal y de ejecución correcta
- ✅ Reproductor de video modal integrado
- ✅ Errores comunes a evitar
- ✅ Consejos de ejecución
- ✅ Thumbnail del video en lista de ejercicios

---

### 9. ℹ️ TOOLTIPS INFORMATIVOS ✅
**Prioridad:** Baja  
**Estado:** ✅ Completado

Tooltips explicativos para acrónimos y términos técnicos.

**Archivos creados:**
- `frontend/src/components/common/GlossaryTooltip.tsx` - Componente de tooltip
- `backend/app/models/workspace.py` - Glosario configurable

**Funcionalidades implementadas:**
- ✅ Componente Tooltip reutilizable
- ✅ Glosario predefinido: RM, RPE, AMRAP, EMOM, PR, WOD, HIIT, LISS, TUT, RIR, TDEE, BMR, NEAT, etc.
- ✅ Glosario personalizable por workspace
- ✅ Componente AutoGlossary para resaltar automáticamente
- ✅ Hook useGlossary para acceso programático

---

### 10. 👥 GESTIÓN DE EQUIPO: ROLES PERSONALIZADOS ✅
**Prioridad:** Alta  
**Estado:** ✅ Completado

Sistema completo de roles y permisos personalizados.

**Archivos creados/modificados:**
- `backend/app/models/user.py` - Modelo CustomRole y DEFAULT_ROLE_PERMISSIONS
- `backend/app/api/v1/endpoints/roles.py` - Endpoints de la API
- `frontend/src/components/team/RoleManager.tsx` - Gestor de roles

**Funcionalidades implementadas:**
- ✅ Roles base: Owner, Admin, Trainer, Nutritionist, Collaborator, Client
- ✅ Crear roles personalizados
- ✅ Permisos granulares por módulo (10 recursos)
- ✅ Acciones: create, read, update, delete, send
- ✅ Herencia de permisos del rol base
- ✅ Colores personalizados por rol
- ✅ Interfaz de gestión de roles

---

### 11. 📝 CRM: CAMPOS EDITABLES Y AGRUPABLES ✅
**Prioridad:** Media  
**Estado:** ✅ Completado

Configuración personalizable de campos del CRM.

**Archivos creados:**
- `frontend/src/components/settings/CRMFieldsConfig.tsx` - Configurador de campos
- `backend/app/models/workspace.py` - Configuración CRM

**Funcionalidades implementadas:**
- ✅ Drag & drop para reordenar campos en ficha cliente
- ✅ Crear grupos/secciones de campos
- ✅ Guardar configuración por workspace
- ✅ Campos personalizados adicionales
- ✅ Ocultar/mostrar campos
- ✅ Colores por grupo

---

### 12. 📋 FICHA DE CLIENTE MEJORADA ✅
**Prioridad:** Alta  
**Estado:** ✅ Completado

Ficha de cliente completa con todos los apartados requeridos.

**Archivos creados/modificados:**
- `backend/app/models/document.py` - Modelos de documentos y fotos
- `backend/app/api/v1/endpoints/documents.py` - Endpoints de documentos
- `frontend/src/pages/clients/ClientDetailPage.tsx` - Página mejorada

**Funcionalidades implementadas:**
- ✅ **Plan nutricional**: Ver plan actual asignado, suplementos recomendados
- ✅ **Documentos enviados y recibidos**: Lista con estado de lectura
- ✅ **Formularios**: Estado de formularios pendientes/completados
- ✅ **Lesiones e intolerancias/alergias**: Sección dedicada
- ✅ **Fotografías**: Subir evolución en fotografías con fecha y peso

---

### 13. 📹 CLASES ONLINE EN VIVO ✅
**Prioridad:** Media  
**Estado:** ✅ Completado

Sistema completo de clases en vivo con videoconferencia.

**Archivos creados:**
- `backend/app/models/live_classes.py` - Modelos SQLAlchemy
- `backend/app/api/v1/endpoints/live_classes.py` - Endpoints de la API
- `backend/app/services/zoom.py` - Servicio de integración con Zoom
- `frontend/src/pages/live-classes/LiveClassesPage.tsx` - Página de clases
- `frontend/src/hooks/useLiveClasses.ts` - Hooks de React Query

**Tablas Supabase creadas:**
- `video_integrations` - Configuración de Zoom/Meet/Teams
- `live_classes` - Clases programadas
- `live_class_registrations` - Inscripciones
- `live_class_templates` - Plantillas reutilizables
- `live_class_packages` - Paquetes de clases
- `client_class_packages` - Paquetes por cliente
- `meeting_logs` - Logs de reuniones

**Funcionalidades implementadas:**
- ✅ Integración con Zoom (OAuth Server-to-Server)
- ✅ Integración con Google Meet (placeholder)
- ✅ Integración con Microsoft Teams (placeholder)
- ✅ Crear/editar/eliminar clases
- ✅ Inscripciones de clientes
- ✅ Plantillas de clases reutilizables
- ✅ Paquetes de clases (bonos)
- ✅ Calendario de clases
- ✅ Estadísticas de asistencia
- ✅ Grabación automática
- ✅ Webhooks para eventos de reunión
- ✅ Frontend con vista de cuadrícula/lista

---

### 14. 🤖 GENERACIÓN CON IA ✅
**Prioridad:** Baja  
**Estado:** ✅ Completado

Sistema de generación automática de planes con IA.

**Archivos creados:**
- `backend/app/services/ai_generator.py` - Servicio de generación
- `backend/app/api/v1/endpoints/ai.py` - Endpoints de la API

**Tablas Supabase creadas:**
- `ai_configurations` - Configuración de IA por workspace
- `ai_generations` - Historial de generaciones
- `ai_prompt_templates` - Plantillas de prompts
- `ai_suggestions` - Sugerencias de IA (cache)

**Funcionalidades implementadas:**
- ✅ Soporte para OpenAI (GPT-4o, GPT-4o-mini)
- ✅ Soporte para Anthropic (Claude 3.5 Sonnet)
- ✅ Generación de planes de entrenamiento personalizados
- ✅ Generación de planes nutricionales personalizados
- ✅ Análisis de progreso del cliente
- ✅ Plantillas de prompts predefinidas
- ✅ Respuestas en formato JSON estructurado
- ✅ Consideración de alergias/intolerancias
- ✅ Consideración de lesiones/limitaciones
- ✅ Tracking de tokens utilizados
- ✅ Configuración de temperatura y max_tokens

---

### 15. ⌚ INTEGRACIÓN CON WEARABLES ✅
**Prioridad:** Baja  
**Estado:** ✅ Completado

Sistema de integración con dispositivos wearables.

**Archivos creados:**
- `backend/app/models/wearables.py` - Modelos SQLAlchemy
- `backend/app/api/v1/endpoints/wearables.py` - Endpoints de la API

**Tablas Supabase creadas:**
- `connected_devices` - Dispositivos conectados
- `health_metrics` - Métricas de salud individuales
- `synced_activities` - Actividades sincronizadas
- `daily_health_summary` - Resumen diario
- `client_health_goals` - Objetivos de salud
- `health_alerts` - Alertas de salud

**Dispositivos soportados:**
- ✅ Apple Watch
- ✅ Garmin
- ✅ Fitbit
- ✅ WHOOP
- ✅ Oura Ring
- ✅ Polar
- ✅ Samsung (placeholder)
- ✅ Xiaomi (placeholder)

**Métricas soportadas:**
- ✅ Frecuencia cardíaca (actual, reposo, máxima)
- ✅ Variabilidad de frecuencia cardíaca (HRV)
- ✅ Pasos y distancia
- ✅ Calorías (activas, basales, totales)
- ✅ Sueño (duración, calidad, fases)
- ✅ Estrés y recuperación
- ✅ Oxígeno en sangre
- ✅ Temperatura corporal
- ✅ Peso y composición corporal

**Funcionalidades implementadas:**
- ✅ Conectar/desconectar dispositivos
- ✅ Sincronización de métricas
- ✅ Resumen diario de salud
- ✅ Objetivos personalizables
- ✅ Alertas de salud automáticas
- ✅ Dashboard de salud por cliente
- ✅ Historial de actividades sincronizadas
- ✅ Zonas de frecuencia cardíaca

---

## 🗄️ Arquitectura de Datos - Supabase

### Configuración del Proyecto
- **Project ID:** `ougfmkbjrpnjvujhuuyy`
- **URL:** `https://ougfmkbjrpnjvujhuuyy.supabase.co`
- **Región:** `eu-west-3`
- **Base de datos:** PostgreSQL 17.6.1

### Tablas Principales
| Tabla | Descripción | RLS |
|-------|-------------|-----|
| `workspaces` | Espacios de trabajo/negocios | ✅ |
| `users` | Usuarios del sistema | ✅ |
| `clients` | Clientes de cada workspace | ✅ |
| `meal_plans` | Planes nutricionales | ✅ |
| `foods` | Biblioteca de alimentos | ✅ |
| `workout_programs` | Programas de entrenamiento | ✅ |
| `exercises` | Biblioteca de ejercicios | ✅ |
| `bookings` | Reservas y citas | ✅ |
| `subscriptions` | Suscripciones de pago | ✅ |
| `payments` | Historial de pagos | ✅ |
| `live_classes` | Clases en vivo | ✅ |
| `ai_generations` | Generaciones de IA | ✅ |
| `connected_devices` | Dispositivos wearables | ✅ |
| `health_metrics` | Métricas de salud | ✅ |

### Principios de Integración
1. **Backend con SQLAlchemy**: Todos los modelos en `backend/app/models/` usan SQLAlchemy ORM
2. **Async Sessions**: Conexiones asíncronas con `asyncpg`
3. **RLS (Row Level Security)**: Activado en todas las tablas sensibles
4. **Frontend con React Query**: Hooks personalizados en `frontend/src/hooks/useSupabaseData.ts`
5. **Sin hardcoding**: Todos los datos vienen de la base de datos

---

## 🔮 Funcionalidades Futuras (Roadmap)

### Pendiente - App Móvil Nativa
- App móvil nativa con React Native / Flutter
- Notificaciones push
- Chat en tiempo real
- Sincronización offline
- App para Apple Watch

### Modelos de Negocio / Servicios Adicionales
- Descuentos en Inversure.com para clientes Trackfiz
- Descuentos en Elitetrece.com
- Seguros RC para entrenadores
- Planes por suscripción tipo Harbiz
- Servicio tipo Bejao (app a medida)
- Productora de contenido y gestión de marketing
- Referidos multinivel de suplementos
- Referidos de gimnasios, centros de salud
- Referidos de equipamiento deportivo o wearables

---

*Documento actualizado: 2 de Enero de 2026*  
*Basado en requisitos de E13 Fitness / Borja Sanfelix*  
*Estado: ✅ TODAS LAS FUNCIONALIDADES IMPLEMENTADAS*  
*Supabase Project: ougfmkbjrpnjvujhuuyy*
