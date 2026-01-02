# Trackfiz - Plan de Desarrollo Completo

## E13 Fitness - Vertical de Elitetrece para Fitness y Entrenadores Personales

**Fecha:** Enero 2026  
**Versión:** 3.0  
**Supabase Project:** `ougfmkbjrpnjvujhuuyy`

---

## 🎯 Visión del Producto

**Trackfiz** es un software todo-en-uno **CRM/ERP/LMS** para profesionales del fitness y bienestar (entrenadores personales, nutricionistas, estudios) que permite automatizar tareas y ahorrar tiempo para enfocarse en sus clientes.

### Módulos Principales

| Módulo | Descripción | Estado |
|--------|-------------|--------|
| **CRM** | Gestión de clientes, agenda, reservas, pagos, comunicación, planes de entrenamiento/nutrición, seguimiento | ✅ Completado |
| **ERP** | Gestión de equipo, facturación, contabilidad básica | ✅ Completado |
| **LMS** | Cursos, formaciones, retos, certificados, monetización | ✅ Completado |
| **Clases en Vivo** | Videoconferencias integradas con Zoom/Meet/Teams | ✅ Completado |
| **IA** | Generación automática de planes con OpenAI/Anthropic | ✅ Completado |
| **Wearables** | Integración con Apple Watch, Garmin, Fitbit, WHOOP, Oura | ✅ Completado |

---

## 📊 Estado de Implementación por Módulo

### 🟢 MÓDULO CRM - COMPLETADO

| # | Funcionalidad | Estado | Backend SQLAlchemy | Supabase |
|---|--------------|--------|-------------------|----------|
| 1 | Gestión de Clientes | ✅ | ✅ `Client` model | ✅ `clients` |
| 2 | Agenda y Reservas | ✅ | ✅ `Booking` model | ✅ `bookings` |
| 3 | Planes de Entrenamiento | ✅ | ✅ `WorkoutProgram` model | ✅ `workout_programs` |
| 4 | Planes de Nutrición | ✅ | ✅ `MealPlan` model | ✅ `meal_plans` |
| 5 | Biblioteca de Ejercicios | ✅ | ✅ `Exercise` model | ✅ `exercises` |
| 6 | Biblioteca de Alimentos | ✅ | ✅ `Food` model | ✅ `foods` |
| 7 | Chat y Mensajería | ✅ | ✅ `Message` model | ✅ `messages` |
| 8 | Formularios | ✅ | ✅ `Form` model | ✅ `forms` |
| 9 | Documentos | ✅ | ✅ `Document` model | ✅ `documents` |
| 10 | Pagos (Stripe/Redsys) | ✅ | ✅ `Payment` model | ✅ `payments` |
| 11 | Suscripciones | ✅ | ✅ `Subscription` model | ✅ `subscriptions` |
| 12 | Automatizaciones | ✅ | ✅ `Automation` model | ✅ `automations` |
| 13 | Notificaciones | ✅ | ✅ `Notification` model | ✅ `notifications` |
| 14 | Biblioteca de Suplementos | ✅ | ✅ `Supplement` model | ✅ `supplements` |

### 🟢 MÓDULO ERP - COMPLETADO

| # | Funcionalidad | Estado | Backend SQLAlchemy | Supabase |
|---|--------------|--------|-------------------|----------|
| 1 | Gestión de Equipo | ✅ | ✅ `User`, `UserRole` | ✅ `users`, `user_roles` |
| 2 | Roles y Permisos | ✅ | ✅ `CustomRole` | ✅ `custom_roles` |
| 3 | Facturación | ✅ | ✅ `Invoice`, `InvoiceItem` | ✅ `invoices`, `invoice_items` |
| 4 | Configuración Fiscal | ✅ | ✅ `InvoiceSettings` | ✅ `invoice_settings` |
| 5 | Gestión de Gastos | ✅ | ✅ `Expense`, `ExpenseCategory` | ✅ `expenses`, `expense_categories` |
| 6 | Presupuestos | ✅ | ✅ `Quote`, `QuoteItem` | ✅ `quotes`, `quote_items` |
| 7 | Resumen Financiero | ✅ | ✅ Endpoint `/erp/summary` | - |
| 8 | Hooks Frontend | ✅ | - | ✅ `useSupabaseInvoices`, etc. |

### 🟢 MÓDULO LMS - COMPLETADO

| # | Funcionalidad | Estado | Backend SQLAlchemy | Supabase |
|---|--------------|--------|-------------------|----------|
| 1 | Creación de Cursos | ✅ | ✅ `Course` model | ✅ `courses` |
| 2 | Lecciones y Módulos | ✅ | ✅ `Lesson`, `CourseModule` models | ✅ `lessons`, `course_modules` |
| 3 | Retos/Challenges | ✅ | ✅ `Challenge` model | ✅ `challenges` |
| 4 | Certificados Personalizados | ✅ | ✅ `Certificate` model | ✅ `certificates` |
| 5 | Inscripciones | ✅ | ✅ `CourseEnrollment` model | ✅ `course_enrollments` |
| 6 | Progreso de Lecciones | ✅ | ✅ `LessonProgress` model | ✅ `lesson_progress` |
| 7 | Gestión de Instructores | ✅ | ✅ `Instructor` model | ✅ `instructors` |
| 8 | Reseñas de Cursos | ✅ | ✅ `CourseReview` model | ✅ `course_reviews` |
| 9 | Participantes en Retos | ✅ | ✅ `ChallengeParticipant` model | ✅ `challenge_participants` |
| 10 | Progreso Diario Retos | ✅ | ✅ `ChallengeDailyProgress` model | ✅ `challenge_daily_progress` |
| 11 | Frontend LMS Page | ✅ | - | - |
| 12 | API Endpoints LMS | ✅ | ✅ `/api/v1/lms/*` | - |

### 🟢 CLASES ONLINE EN VIVO - COMPLETADO

| # | Funcionalidad | Estado | Backend SQLAlchemy | Supabase |
|---|--------------|--------|-------------------|----------|
| 1 | Configuración de Video | ✅ | ✅ `VideoIntegration` | ✅ `video_integrations` |
| 2 | Clases en Vivo | ✅ | ✅ `LiveClass` | ✅ `live_classes` |
| 3 | Inscripciones | ✅ | ✅ `LiveClassRegistration` | ✅ `live_class_registrations` |
| 4 | Plantillas de Clases | ✅ | ✅ `LiveClassTemplate` | ✅ `live_class_templates` |
| 5 | Paquetes de Clases | ✅ | ✅ `LiveClassPackage` | ✅ `live_class_packages` |
| 6 | Paquetes por Cliente | ✅ | ✅ `ClientClassPackage` | ✅ `client_class_packages` |
| 7 | Logs de Reuniones | ✅ | ✅ `MeetingLog` | ✅ `meeting_logs` |
| 8 | Integración Zoom | ✅ | ✅ `ZoomService` | - |
| 9 | Integración Google Meet | 🔄 | ✅ `GoogleMeetService` | - |
| 10 | Integración MS Teams | 🔄 | ✅ `MicrosoftTeamsService` | - |
| 11 | Frontend Page | ✅ | - | - |
| 12 | API Endpoints | ✅ | ✅ `/api/v1/live-classes/*` | - |

### 🟢 GENERACIÓN CON IA - COMPLETADO

| # | Funcionalidad | Estado | Backend SQLAlchemy | Supabase |
|---|--------------|--------|-------------------|----------|
| 1 | Configuración de IA | ✅ | - | ✅ `ai_configurations` |
| 2 | Historial de Generaciones | ✅ | - | ✅ `ai_generations` |
| 3 | Plantillas de Prompts | ✅ | - | ✅ `ai_prompt_templates` |
| 4 | Sugerencias de IA | ✅ | - | ✅ `ai_suggestions` |
| 5 | Generador de Planes de Entrenamiento | ✅ | ✅ `AIGeneratorService` | - |
| 6 | Generador de Planes Nutricionales | ✅ | ✅ `AIGeneratorService` | - |
| 7 | Análisis de Progreso | ✅ | ✅ `AIGeneratorService` | - |
| 8 | Soporte OpenAI | ✅ | ✅ GPT-4o | - |
| 9 | Soporte Anthropic | ✅ | ✅ Claude 3.5 | - |
| 10 | API Endpoints | ✅ | ✅ `/api/v1/ai/*` | - |

### 🟢 INTEGRACIÓN CON WEARABLES - COMPLETADO

| # | Funcionalidad | Estado | Backend SQLAlchemy | Supabase |
|---|--------------|--------|-------------------|----------|
| 1 | Dispositivos Conectados | ✅ | ✅ `ConnectedDevice` | ✅ `connected_devices` |
| 2 | Métricas de Salud | ✅ | ✅ `HealthMetric` | ✅ `health_metrics` |
| 3 | Actividades Sincronizadas | ✅ | ✅ `SyncedActivity` | ✅ `synced_activities` |
| 4 | Resumen Diario | ✅ | ✅ `DailyHealthSummary` | ✅ `daily_health_summary` |
| 5 | Objetivos de Salud | ✅ | ✅ `ClientHealthGoals` | ✅ `client_health_goals` |
| 6 | Alertas de Salud | ✅ | ✅ `HealthAlert` | ✅ `health_alerts` |
| 7 | Soporte Apple Watch | ✅ | - | - |
| 8 | Soporte Garmin | ✅ | - | - |
| 9 | Soporte Fitbit | ✅ | - | - |
| 10 | Soporte WHOOP | ✅ | - | - |
| 11 | Soporte Oura Ring | ✅ | - | - |
| 12 | Soporte Polar | ✅ | - | - |
| 13 | Dashboard de Salud | ✅ | ✅ `/wearables/dashboard/{client_id}` | - |
| 14 | API Endpoints | ✅ | ✅ `/api/v1/wearables/*` | - |

### 🟢 SISTEMA DE REFERIDOS MULTINIVEL - COMPLETADO

| # | Funcionalidad | Estado | Backend SQLAlchemy | Supabase |
|---|--------------|--------|-------------------|----------|
| 1 | Programas de Referidos | ✅ | ✅ `ReferralProgram` | ✅ `referral_programs` |
| 2 | Gestión de Afiliados | ✅ | ✅ `Affiliate` | ✅ `affiliates` |
| 3 | Enlaces de Referido | ✅ | ✅ `ReferralLink` | ✅ `referral_links` |
| 4 | Tracking de Clics | ✅ | ✅ `ReferralClick` | ✅ `referral_clicks` |
| 5 | Conversiones | ✅ | ✅ `ReferralConversion` | ✅ `referral_conversions` |
| 6 | Pagos a Afiliados | ✅ | ✅ `AffiliatePayout` | ✅ `affiliate_payouts` |
| 7 | Suplementos con Referidos | ✅ | ✅ `SupplementReferral` | ✅ `supplement_referrals` |
| 8 | Comisiones Multinivel | ✅ | ✅ Algoritmo de cálculo | - |
| 9 | Dashboard de Afiliado | ✅ | ✅ Endpoint `/affiliates/{id}/dashboard` | - |

---

## 🔧 Funcionalidades Específicas Solicitadas

### ✅ COMPLETADAS

| # | Funcionalidad | Archivos | Estado |
|---|--------------|----------|--------|
| 1 | Integración Redsys | `backend/app/services/redsys.py`, `backend/app/api/v1/endpoints/redsys.py` | ✅ |
| 2 | Biblioteca Suplementación con Referidos | `backend/app/models/supplement.py`, `frontend/src/components/supplements/` | ✅ |
| 3 | Intolerancias/Alergias en Rojo | `frontend/src/components/common/AllergenBadge.tsx` | ✅ |
| 4 | Generar PDF Dieta/Entrenamiento | `backend/app/services/pdf_generator.py`, `backend/app/api/v1/endpoints/pdf.py` | ✅ |
| 5 | Nombres de Comidas Editables | `frontend/src/components/nutrition/EditableMealName.tsx` | ✅ |
| 6 | Bandeja de Entrada bajo Chat | `frontend/src/components/chat/InboxPanel.tsx` | ✅ |
| 7 | Chat Habilitado/Deshabilitado | `backend/app/models/client.py` campo `chat_enabled` | ✅ |
| 8 | Videos Ejecución Ejercicios | `backend/app/models/exercise.py`, `frontend/src/components/workouts/ExerciseVideoPlayer.tsx` | ✅ |
| 9 | Tooltips Informativos (i) | `frontend/src/components/common/GlossaryTooltip.tsx` | ✅ |
| 10 | Gestión Equipo: Roles | `backend/app/api/v1/endpoints/roles.py`, `frontend/src/components/team/RoleManager.tsx` | ✅ |
| 11 | CRM: Campos Editables/Agrupables | `frontend/src/components/settings/CRMFieldsConfig.tsx` | ✅ |
| 12 | Ficha Cliente Completa | `frontend/src/pages/clients/ClientDetailPage.tsx` | ✅ |
| 13 | Vista Detallada Plan Nutricional | `frontend/src/components/nutrition/MealPlanDetailView.tsx` | ✅ |
| 14 | Clases Online en Vivo | `backend/app/models/live_classes.py`, `backend/app/api/v1/endpoints/live_classes.py` | ✅ |
| 15 | Generación con IA | `backend/app/services/ai_generator.py`, `backend/app/api/v1/endpoints/ai.py` | ✅ |
| 16 | Integración Wearables | `backend/app/models/wearables.py`, `backend/app/api/v1/endpoints/wearables.py` | ✅ |

---

### 📋 PENDIENTE - APP MÓVIL NATIVA

| # | Funcionalidad | Prioridad | Descripción |
|---|--------------|-----------|-------------|
| 1 | **App Móvil Nativa** | 🟡 Media | React Native / Flutter para iOS y Android |

**Nota:** La app móvil nativa está planificada para la fase final del desarrollo.

---

## 🏗️ Arquitectura Técnica

### Backend (FastAPI + SQLAlchemy)

```
backend/
├── app/
│   ├── api/v1/endpoints/     # Endpoints REST (27 archivos)
│   │   ├── auth.py
│   │   ├── clients.py
│   │   ├── workouts.py
│   │   ├── nutrition.py
│   │   ├── live_classes.py   # NUEVO
│   │   ├── ai.py             # NUEVO
│   │   ├── wearables.py      # NUEVO
│   │   └── ...
│   ├── core/                  # Configuración, seguridad
│   ├── models/               # Modelos SQLAlchemy (24 archivos)
│   │   ├── live_classes.py   # NUEVO
│   │   ├── wearables.py      # NUEVO
│   │   └── ...
│   ├── schemas/              # Schemas Pydantic
│   ├── services/             # Lógica de negocio
│   │   ├── zoom.py           # NUEVO
│   │   ├── ai_generator.py   # NUEVO
│   │   └── ...
│   └── middleware/           # Autenticación
├── alembic/                  # Migraciones
└── requirements.txt
```

### Frontend (React + TypeScript)

```
frontend/
├── src/
│   ├── components/           # Componentes reutilizables
│   ├── pages/               # Páginas de la aplicación
│   │   ├── live-classes/    # NUEVO
│   │   └── ...
│   ├── hooks/               # Hooks personalizados
│   │   ├── useLiveClasses.ts # NUEVO
│   │   └── ...
│   ├── services/            # Servicios API
│   └── stores/              # Estado global (Zustand)
└── package.json
```

### Base de Datos (Supabase PostgreSQL)

- **Project ID:** `ougfmkbjrpnjvujhuuyy`
- **URL:** `https://ougfmkbjrpnjvujhuuyy.supabase.co`
- **Región:** `eu-west-3`
- **PostgreSQL:** 17.6.1

#### Tablas Nuevas Añadidas

| Tabla | Módulo | Descripción |
|-------|--------|-------------|
| `video_integrations` | Clases en Vivo | Configuración de Zoom/Meet/Teams |
| `live_classes` | Clases en Vivo | Clases programadas |
| `live_class_registrations` | Clases en Vivo | Inscripciones a clases |
| `live_class_templates` | Clases en Vivo | Plantillas reutilizables |
| `live_class_packages` | Clases en Vivo | Paquetes de clases |
| `client_class_packages` | Clases en Vivo | Paquetes por cliente |
| `meeting_logs` | Clases en Vivo | Logs de reuniones |
| `ai_configurations` | IA | Configuración de IA |
| `ai_generations` | IA | Historial de generaciones |
| `ai_prompt_templates` | IA | Plantillas de prompts |
| `ai_suggestions` | IA | Sugerencias de IA |
| `connected_devices` | Wearables | Dispositivos conectados |
| `health_metrics` | Wearables | Métricas de salud |
| `synced_activities` | Wearables | Actividades sincronizadas |
| `daily_health_summary` | Wearables | Resumen diario |
| `client_health_goals` | Wearables | Objetivos de salud |
| `health_alerts` | Wearables | Alertas de salud |

---

## 📅 Roadmap de Desarrollo

### Q1 2026 (Enero - Marzo) ✅ COMPLETADO

#### Enero 2026 ✅
- [x] Vista detallada de plan nutricional
- [x] Integración completa con Supabase
- [x] Modelos SQLAlchemy actualizados
- [x] Datos de prueba en producción
- [x] **Clases Online en Vivo** - Integración con Zoom/Meet/Teams
- [x] **Generación con IA** - OpenAI y Anthropic
- [x] **Integración con Wearables** - Apple Watch, Garmin, Fitbit, WHOOP, Oura, Polar

### Q2 2026 (Abril - Junio) 📋 PLANIFICADO

#### Abril 2026 📋
- [ ] **App Móvil - Fase 1**
  - [ ] React Native setup
  - [ ] Autenticación
  - [ ] Vista de cliente

#### Mayo 2026 📋
- [ ] **App Móvil - Fase 2**
  - [ ] Dashboard del cliente
  - [ ] Planes de entrenamiento
  - [ ] Planes nutricionales

#### Junio 2026 📋
- [ ] **App Móvil - Fase 3**
  - [ ] Notificaciones push
  - [ ] Chat en tiempo real
  - [ ] Sincronización offline

### Q3-Q4 2026 📋
- [ ] Marketplace de contenido
- [ ] White-label para estudios
- [ ] App para Apple Watch
- [ ] Mejoras de IA con fine-tuning

---

## 💼 Modelos de Negocio

### 1. Suscripciones Trackfiz (Tipo Harbiz)

| Plan | Precio | Características |
|------|--------|-----------------|
| **Starter** | 29€/mes | 1 entrenador, 20 clientes, CRM básico |
| **Pro** | 59€/mes | 1 entrenador, 100 clientes, CRM + ERP |
| **Business** | 99€/mes | 5 entrenadores, ilimitados clientes, CRM + ERP + LMS |
| **Enterprise** | Personalizado | White-label, API, soporte dedicado |

### 2. Servicios E13 Fitness (Marketing)

- Producción de contenido fitness
- Gestión de redes sociales
- Creación de páginas web
- Agencia de representación
- Marketing para influencers fitness

### 3. Referidos y Comisiones

| Tipo | Comisión Trackfiz | Comisión Entrenador |
|------|-------------------|---------------------|
| Suplementos | 15% | 10% |
| Gimnasios | 10% | 5% |
| Equipamiento | 12% | 8% |
| Wearables | 10% | 5% |

### 4. Servicios Adicionales

- Descuentos en Inversure.com
- Descuentos en Elitetrece.com
- Seguros RC para entrenadores
- App personalizada (tipo Bejao)

---

## 🔒 Principios de Desarrollo

### Datos desde Supabase

1. **TODOS los datos** deben venir de Supabase PostgreSQL
2. **Backend con SQLAlchemy** para todas las operaciones de BD
3. **Sin hardcoding** de datos en frontend o backend
4. **RLS (Row Level Security)** en todas las tablas sensibles
5. **Migraciones** con Alembic para cambios de esquema

### Arquitectura de Código

```python
# Ejemplo de endpoint usando SQLAlchemy
@router.get("/clients", response_model=List[ClientResponse])
async def list_clients(
    current_user: CurrentUser = Depends(require_workspace),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Client).where(Client.workspace_id == current_user.workspace_id)
    )
    return result.scalars().all()
```

### Frontend con React Query

```typescript
// Ejemplo de hook usando React Query
export function useClients() {
  return useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const response = await api.get("/clients");
      return response.data;
    },
  });
}
```

---

## 📞 Contacto

- **E13 Fitness:** [e13fitness.com](https://e13fitness.com)
- **Trackfiz:** [trackfiz.com](https://trackfiz.com)
- **Elitetrece:** [elitetrece.com](https://elitetrece.com)

---

*Documento actualizado: 2 de Enero de 2026*  
*Versión: 3.0*  
*Autor: Equipo de Desarrollo E13 Fitness*
