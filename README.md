# Trackfiz 🏋️‍♂️

**Plataforma CRM/ERP/LMS todo-en-uno para profesionales del fitness y bienestar**

Una solución completa de E13 Fitness para entrenadores personales, nutricionistas, fisioterapeutas, profesores de yoga/pilates y estudios de fitness.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-18.2-61DAFB?logo=react)
![FastAPI](https://img.shields.io/badge/FastAPI-0.104-009688?logo=fastapi)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase)

## 🎯 Características Principales

### 📅 Calendario y Reservas
- Vista diaria, semanal y mensual
- Reservas individuales y grupales
- Self-booking para clientes
- Recordatorios automáticos
- Lista de espera

### 💳 Pagos y Suscripciones
- Integración con Stripe y Redsys
- Suscripciones recurrentes
- Bonos de sesiones
- Cupones y descuentos
- Reportes financieros (MRR, churn)

### 👥 CRM de Clientes
- Ficha completa del cliente
- Tags y segmentación
- Historial de actividad
- Onboarding automatizado
- Cumplimiento GDPR
- Gestión de intolerancias y alergias

### 💬 Comunicaciones
- Chat in-app (habilitable/deshabilitabe por cliente)
- Bandeja de entrada integrada
- Mensajes programados
- Notificaciones push/email
- Grupos y comunidad

### 🏃 Entrenamiento
- Biblioteca de ejercicios (+800)
- Videos de ejecución correcta
- Constructor de workouts
- Programas personalizados
- Seguimiento de progreso
- Generación de PDF

### 🥗 Nutrición
- Planes nutricionales
- Base de datos de alimentos
- Biblioteca de suplementación con referidos
- Gestión de intolerancias/alergias (destacadas en rojo)
- Lista de la compra automática
- Nombres de comidas editables
- Generación de PDF
- Seguimiento de adherencia

### 🤖 Automatizaciones
- Workflows personalizables
- Secuencias de onboarding
- Recordatorios automáticos
- Acciones por triggers

### 📊 Dashboard y Reportes
- KPIs en tiempo real
- Gráficos de evolución
- Exportación de datos
- Alertas inteligentes

### 👥 Gestión de Equipo
- Roles personalizables
- Campos CRM editables y agrupables
- Permisos granulares

### 📚 LMS (Sistema de Cursos)
- Crear cursos y formaciones
- Retos y challenges
- Certificados personalizados
- Monetización integrada
- Gestión de instructores/estudiantes

## 🛠️ Tech Stack

### Frontend
- **React 18** + Vite
- **Mantine UI** - Componentes modernos
- **TanStack Query** - Estado del servidor
- **React Router** - Navegación
- **React Hook Form + Zod** - Formularios
- **TypeScript** - Tipado estático

### Backend
- **FastAPI** - API REST
- **SQLAlchemy 2.x** - ORM
- **Alembic** - Migraciones
- **Celery + Redis** - Tareas en background
- **Pydantic** - Validación

### Base de Datos y Auth
- **Supabase PostgreSQL** - Base de datos
- **Supabase Auth** - Autenticación
- **Supabase Storage** - Archivos
- **Row Level Security** - Seguridad

### Integraciones
- **Stripe** - Pagos internacionales
- **Redsys** - Pagos España
- **Brevo** - Emails transaccionales

## 📁 Estructura del Proyecto

```
trackfiz/
├── backend/
│   ├── app/
│   │   ├── api/v1/          # Endpoints REST
│   │   ├── core/            # Configuración
│   │   ├── models/          # Modelos SQLAlchemy
│   │   ├── schemas/         # Schemas Pydantic
│   │   ├── middleware/      # Auth y RBAC
│   │   └── tasks/           # Tareas Celery
│   ├── alembic/             # Migraciones
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/      # Componentes React
│   │   ├── pages/           # Páginas
│   │   ├── hooks/           # Custom hooks
│   │   ├── services/        # API clients
│   │   ├── stores/          # Estado global
│   │   └── theme/           # Tema Mantine
│   └── package.json
├── documentation/           # Documentación
├── docker-compose.yml
└── README.md
```

## 🚀 Inicio Rápido

### Prerrequisitos
- Node.js 18+
- Python 3.11+
- Docker (opcional)
- Cuenta de Supabase
- Cuenta de Stripe (opcional)
- Cuenta de Redsys (opcional)

### 1. Clonar el repositorio
```bash
git clone https://github.com/e13fitness/trackfiz.git
cd trackfiz
```

### 2. Configurar el Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Copiar y configurar variables de entorno
cp env.example .env
# Editar .env con tus credenciales
```

### 3. Configurar el Frontend
```bash
cd frontend
pnpm install  # o npm install

# Copiar y configurar variables de entorno
cp env.example .env.local
# Editar .env.local con tus credenciales
```

### 4. Iniciar los servicios

**Con Docker:**
```bash
docker-compose up -d
```

**Sin Docker:**
```bash
# Terminal 1 - Backend
cd backend
uvicorn app.main:app --reload --port 8000

# Terminal 2 - Frontend
cd frontend
pnpm dev
```

### 5. Acceder a la aplicación
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

## 🔧 Variables de Entorno

### Backend (.env)
```env
# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key
DATABASE_URL=postgresql://...

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Redsys
REDSYS_MERCHANT_CODE=your-merchant-code
REDSYS_SECRET_KEY=your-secret-key
REDSYS_TERMINAL=1
REDSYS_ENVIRONMENT=test

# Redis
REDIS_URL=redis://localhost:6379/0
```

### Frontend (.env.local)
```env
VITE_API_URL=/api/v1
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## 📖 Documentación

- [Funcionalidades Completas](documentation/FEATURES_COMPLETE.md)
- [Requisitos del Proyecto](documentation/project_requirements_document.md)
- [Stack Tecnológico](documentation/tech_stack_document.md)
- [Flujo de la Aplicación](documentation/app_flow_document.md)
- [Guía del Frontend](documentation/frontend_guidelines_document.md)
- [Estructura del Backend](documentation/backend_structure_document.md)

## 🧪 Testing

```bash
# Backend
cd backend
pytest

# Frontend
cd frontend
pnpm test
```

## 📦 Build para Producción

```bash
# Frontend
cd frontend
pnpm build

# El build se genera en frontend/dist/
```

## 🚀 Despliegue en Coolify

Ver la guía completa de despliegue en [DEPLOYMENT.md](DEPLOYMENT.md).

### Resumen rápido:

1. **Crear nuevo recurso** en Coolify → Docker Compose
2. **Conectar repositorio** de GitHub
3. **Seleccionar** `docker-compose.prod.yml`
4. **Configurar variables de entorno**
5. **Configurar dominios**
6. **Deploy**

### Variables de entorno necesarias:

```env
# Frontend
VITE_API_URL=https://api.tu-dominio.com
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx

# Backend
DATABASE_URL=postgresql+asyncpg://...
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=xxx
REDIS_URL=redis://redis:6379/0
STRIPE_SECRET_KEY=sk_live_xxx
REDSYS_MERCHANT_CODE=xxx
```

## 🤝 Contribuir

1. Fork el proyecto
2. Crea tu rama (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add: nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para más detalles.

## 🙏 Agradecimientos

- Inspirado en [Harbiz](https://www.harbiz.io)
- UI Components por [Mantine](https://mantine.dev)
- Backend por [Supabase](https://supabase.com)

---

**Trackfiz** - Hecho con ❤️ por E13 Fitness para profesionales del fitness y bienestar
