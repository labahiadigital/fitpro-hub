# FitPro Hub - Plan de Implementación

## Basado en análisis de Harbiz.io

---

## 🎯 Funcionalidades a Implementar (Prioridad Alta)

### 1. PÁGINA DE VENTAS / LANDING PÚBLICA
**Estado: ⬜ Pendiente**

La landing page pública para captar clientes:
- Hero section con propuesta de valor
- Sección de funcionalidades con tabs interactivos
- Testimonios de clientes
- Planes y precios
- FAQ
- CTA para registro/prueba gratuita
- Footer con enlaces legales

**Archivos a crear:**
- `frontend/src/pages/public/LandingPage.tsx`
- `frontend/src/pages/public/PricingPage.tsx`
- `frontend/src/pages/public/FeaturesPage.tsx`

---

### 2. SISTEMA DE RESERVAS AVANZADO
**Estado: ⬜ Pendiente**

Mejoras al calendario y reservas:
- [ ] Lista de espera automática cuando sesión llena
- [ ] Política de cancelación configurable (X horas antes)
- [ ] Recordatorios automáticos (24h, 1h antes)
- [ ] Self-booking desde app del cliente
- [ ] Bloqueo de horarios (vacaciones, ausencias)
- [ ] Disponibilidad por tipo de servicio
- [ ] Check-in/check-out de asistencia
- [ ] Gestión de no-shows

**Backend endpoints:**
```
POST /api/v1/bookings/{id}/waitlist - Añadir a lista de espera
POST /api/v1/bookings/{id}/checkin - Check-in
POST /api/v1/bookings/{id}/checkout - Check-out
POST /api/v1/bookings/{id}/noshow - Marcar no-show
GET /api/v1/availability - Obtener disponibilidad
POST /api/v1/availability/block - Bloquear horario
```

---

### 3. BONOS Y PAQUETES DE SESIONES
**Estado: ⬜ Pendiente**

Sistema de bonos como Harbiz:
- [ ] Crear paquetes de X sesiones
- [ ] Precio por paquete
- [ ] Fecha de caducidad
- [ ] Canje automático al reservar
- [ ] Tipos de sesión aplicables
- [ ] Historial de uso
- [ ] Transferencia entre clientes (opcional)

**Tablas ya existentes en Supabase:**
- `session_packages` - Definición de paquetes
- `client_packages` - Paquetes comprados por cliente

**UI necesaria:**
- Página de gestión de paquetes
- Modal de compra de paquete
- Widget de sesiones restantes en cliente

---

### 4. BIBLIOTECA DE EJERCICIOS MEJORADA
**Estado: ⬜ Pendiente**

Biblioteca completa como Harbiz (+800 ejercicios):
- [ ] Categorización por músculo/equipo/dificultad
- [ ] Videos demostrativos (Supabase Storage)
- [ ] Instrucciones paso a paso
- [ ] Búsqueda y filtros avanzados
- [ ] Ejercicios favoritos
- [ ] Ejercicios personalizados por workspace
- [ ] Importar/exportar ejercicios

**Mejoras UI:**
- Grid de ejercicios con thumbnails
- Modal de detalle con video
- Filtros laterales
- Búsqueda en tiempo real

---

### 5. COMUNIDAD Y GRUPOS
**Estado: ⬜ Pendiente**

Sistema de comunidad para engagement:
- [ ] Crear grupos temáticos
- [ ] Retos y challenges con fechas
- [ ] Rankings y leaderboards
- [ ] Compartir logros
- [ ] Gamificación (puntos, badges)
- [ ] Feed de actividad

**Nuevas tablas:**
```sql
CREATE TABLE groups (
  id UUID PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id),
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  is_public BOOLEAN DEFAULT false,
  member_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE group_members (
  group_id UUID REFERENCES groups(id),
  client_id UUID REFERENCES clients(id),
  role TEXT DEFAULT 'member', -- admin, member
  joined_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (group_id, client_id)
);

CREATE TABLE challenges (
  id UUID PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id),
  group_id UUID REFERENCES groups(id),
  name TEXT NOT NULL,
  description TEXT,
  challenge_type TEXT, -- workout, steps, weight_loss
  target_value NUMERIC,
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT true
);

CREATE TABLE challenge_progress (
  id UUID PRIMARY KEY,
  challenge_id UUID REFERENCES challenges(id),
  client_id UUID REFERENCES clients(id),
  current_value NUMERIC DEFAULT 0,
  rank INTEGER,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE achievements (
  id UUID PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  criteria JSONB -- {type: 'workouts_completed', value: 10}
);

CREATE TABLE client_achievements (
  client_id UUID REFERENCES clients(id),
  achievement_id UUID REFERENCES achievements(id),
  earned_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (client_id, achievement_id)
);
```

---

### 6. DASHBOARD MEJORADO
**Estado: ⬜ Pendiente**

KPIs y métricas como Harbiz:
- [ ] Ingresos del mes (MRR)
- [ ] Nuevos clientes vs mes anterior
- [ ] Tasa de retención
- [ ] Sesiones realizadas
- [ ] Clientes sin actividad (alerta)
- [ ] Pagos pendientes
- [ ] Próximas renovaciones
- [ ] Gráfico de evolución de clientes
- [ ] Gráfico de ingresos
- [ ] Top clientes por ingresos
- [ ] Cumplimiento de planes

**Widgets a crear:**
- `RevenueChart` - Gráfico de ingresos
- `ClientGrowthChart` - Evolución de clientes
- `AlertsWidget` - Alertas importantes
- `UpcomingRenewals` - Renovaciones próximas
- `InactiveClients` - Clientes inactivos

---

### 7. MEJORAS EN AUTOMATIZACIONES
**Estado: ⬜ Pendiente**

Workflows más completos:
- [ ] Editor visual de workflows (drag & drop)
- [ ] Más triggers: fecha personalizada, cumpleaños
- [ ] Delays entre acciones (esperar X días)
- [ ] Condiciones complejas (AND/OR)
- [ ] Plantillas de automatización predefinidas
- [ ] Logs detallados de ejecución
- [ ] Estadísticas de rendimiento

---

### 8. SISTEMA DE NOTIFICACIONES
**Estado: ⬜ Pendiente**

Centro de notificaciones:
- [ ] Notificaciones in-app
- [ ] Campana con contador
- [ ] Marcar como leído
- [ ] Preferencias por tipo
- [ ] Push notifications (preparado)
- [ ] Email digest diario/semanal

---

### 9. ONBOARDING DE CLIENTES
**Estado: ⬜ Pendiente**

Flujo de onboarding automatizado:
- [ ] Invitación por email/enlace
- [ ] Registro del cliente
- [ ] Aceptación de políticas GDPR
- [ ] Formulario PAR-Q obligatorio
- [ ] Mensaje de bienvenida automático
- [ ] Asignación de plan inicial
- [ ] Tour guiado de la app

---

### 10. APP DEL CLIENTE (Portal)
**Estado: ⬜ Pendiente**

Vista para el cliente final:
- [ ] Dashboard personal
- [ ] Ver entrenamientos asignados
- [ ] Ver plan nutricional
- [ ] Reservar sesiones
- [ ] Chat con profesional
- [ ] Ver historial de pagos
- [ ] Registrar progreso
- [ ] Ver logros y retos

---

## 📊 Prioridad de Implementación

### Fase 1 (Semana 1-2)
1. ✅ Corregir errores de build
2. ⬜ Dashboard mejorado con KPIs reales
3. ⬜ Sistema de bonos/paquetes
4. ⬜ Lista de espera en reservas

### Fase 2 (Semana 3-4)
5. ⬜ Biblioteca de ejercicios mejorada
6. ⬜ Sistema de notificaciones
7. ⬜ Onboarding de clientes
8. ⬜ Mejoras en automatizaciones

### Fase 3 (Semana 5-6)
9. ⬜ Comunidad y grupos
10. ⬜ Landing page pública
11. ⬜ Portal del cliente

---

## 🔧 Arquitectura

### Frontend → Backend → Supabase
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   React     │────▶│   FastAPI   │────▶│  Supabase   │
│   Frontend  │◀────│   Backend   │◀────│  PostgreSQL │
└─────────────┘     └─────────────┘     └─────────────┘
      │                   │
      │                   ├── Celery (jobs)
      │                   ├── Redis (cache)
      │                   └── Stripe (pagos)
      │
      └── Todas las llamadas van al backend
          NO acceso directo a Supabase desde frontend
```

---

## 📝 Notas de Implementación

### Convenciones de Código
- **Frontend**: React + TypeScript, Mantine UI
- **Backend**: FastAPI + SQLAlchemy
- **API**: RESTful, versionada `/api/v1/`
- **Auth**: JWT tokens via backend
- **Estado**: TanStack Query para servidor, Zustand para cliente

### Testing
- Cada nueva funcionalidad debe tener tests
- Build debe pasar sin errores antes de merge

### Git Flow
- `master` - producción
- `develop` - desarrollo
- `feature/*` - nuevas funcionalidades
- `fix/*` - correcciones

---

*Documento actualizado: Diciembre 2024*

