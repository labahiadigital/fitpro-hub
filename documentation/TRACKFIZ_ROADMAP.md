# Trackfiz - Plan de Desarrollo Completo

## E13 Fitness - Vertical de Elitetrece para Fitness y Entrenadores Personales

**Fecha:** Enero 2026  
**Versión:** 2.0  
**Supabase Project:** `ougfmkbjrpnjvujhuuyy`

---

## 🎯 Visión del Producto

**Trackfiz** es un software todo-en-uno **CRM/ERP/LMS** para profesionales del fitness y bienestar (entrenadores personales, nutricionistas, estudios) que permite automatizar tareas y ahorrar tiempo para enfocarse en sus clientes.

### Módulos Principales

| Módulo | Descripción | Estado |
|--------|-------------|--------|
| **CRM** | Gestión de clientes, agenda, reservas, pagos, comunicación, planes de entrenamiento/nutrición, seguimiento | ✅ Implementado |
| **ERP** | Gestión de equipo, facturación, contabilidad básica | 🔄 En progreso |
| **LMS** | Cursos, formaciones, retos, certificados, monetización | 📋 Planificado |

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
| 2 | Roles y Permisos | ✅ | ✅ `CustomRole` | ✅ Pendiente migración |
| 3 | Facturación | ✅ | ✅ `Invoice`, `InvoiceItem` | ✅ `invoices`, `invoice_items` |
| 4 | Configuración Fiscal | ✅ | ✅ `InvoiceSettings` | ✅ `invoice_settings` |
| 5 | Gestión de Gastos | ✅ | ✅ `Expense`, `ExpenseCategory` | ✅ `expenses`, `expense_categories` |
| 6 | Presupuestos | ✅ | ✅ `Quote`, `QuoteItem` | ✅ `quotes`, `quote_items` |
| 7 | Resumen Financiero | ✅ | ✅ Endpoint `/erp/summary` | - |
| 8 | Hooks Frontend | ✅ | - | ✅ `useSupabaseInvoices`, etc. |

### 🟡 MÓDULO LMS - EN PROGRESO

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

### 📋 PENDIENTES DE IMPLEMENTAR

| # | Funcionalidad | Prioridad | Descripción |
|---|--------------|-----------|-------------|
| 1 | **Módulo LMS Completo** | 🔴 Alta | Cursos, formaciones, retos, certificados |
| 2 | **Facturación ERP** | 🔴 Alta | Generación de facturas, numeración automática |
| 3 | **Referidos Multinivel** | 🟡 Media | Sistema de comisiones por niveles |
| 4 | **Clases Online en Vivo** | 🟡 Media | Integración con Zoom/Meet |
| 5 | **App Móvil Nativa** | 🟡 Media | React Native / Flutter |
| 6 | **IA para Planes** | 🟢 Baja | Generación automática con IA |
| 7 | **Integración Wearables** | 🟢 Baja | Apple Watch, Garmin, Fitbit |

---

## 🏗️ Arquitectura Técnica

### Backend (FastAPI + SQLAlchemy)

```
backend/
├── app/
│   ├── api/v1/endpoints/     # Endpoints REST
│   ├── core/                  # Configuración, seguridad
│   ├── models/               # Modelos SQLAlchemy
│   ├── schemas/              # Schemas Pydantic
│   ├── services/             # Lógica de negocio
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
│   ├── hooks/               # Hooks personalizados
│   ├── services/            # Servicios API
│   └── stores/              # Estado global (Zustand)
└── package.json
```

### Base de Datos (Supabase PostgreSQL)

- **Project ID:** `ougfmkbjrpnjvujhuuyy`
- **URL:** `https://ougfmkbjrpnjvujhuuyy.supabase.co`
- **Región:** `eu-west-3`
- **PostgreSQL:** 17.6.1

---

## 📅 Roadmap de Desarrollo

### Q1 2026 (Enero - Marzo)

#### Enero 2026 ✅
- [x] Vista detallada de plan nutricional
- [x] Integración completa con Supabase
- [x] Modelos SQLAlchemy actualizados
- [x] Datos de prueba en producción

#### Febrero 2026 📋
- [ ] **Módulo LMS - Fase 1**
  - [ ] Modelo de datos para cursos
  - [ ] CRUD de cursos y lecciones
  - [ ] Subida de contenido multimedia
- [ ] **Facturación ERP - Fase 1**
  - [ ] Modelo de facturas
  - [ ] Generación de PDF de facturas
  - [ ] Numeración automática

#### Marzo 2026 📋
- [ ] **Módulo LMS - Fase 2**
  - [ ] Sistema de retos
  - [ ] Certificados personalizados
  - [ ] Monetización con Stripe/Redsys
- [ ] **Referidos Multinivel**
  - [ ] Sistema de comisiones
  - [ ] Panel de afiliados
  - [ ] Liquidaciones automáticas

### Q2 2026 (Abril - Junio)

#### Abril 2026 📋
- [ ] **Clases Online en Vivo**
  - [ ] Integración Zoom API
  - [ ] Calendario de clases grupales
  - [ ] Grabaciones automáticas
- [ ] **Informes Financieros**
  - [ ] Dashboard de ingresos
  - [ ] Exportación a Excel/PDF

#### Mayo 2026 📋
- [ ] **App Móvil - Fase 1**
  - [ ] React Native setup
  - [ ] Autenticación
  - [ ] Vista de cliente

#### Junio 2026 📋
- [ ] **App Móvil - Fase 2**
  - [ ] Notificaciones push
  - [ ] Chat en tiempo real
  - [ ] Sincronización offline

### Q3-Q4 2026 📋
- [ ] Integración con wearables
- [ ] IA para generación de planes
- [ ] Marketplace de contenido
- [ ] White-label para estudios

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
*Versión: 2.0*  
*Autor: Equipo de Desarrollo E13 Fitness*
