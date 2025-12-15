# 🏋️ FitPro Hub

<div align="center">

![FitPro Hub](https://img.shields.io/badge/FitPro-Hub-2D6A4F?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiNmZmZmZmYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJtNi41IDYuNSAxMSAxMSIvPjxwYXRoIGQ9Im0yMS41IDYuNS0xMSAxMSIvPjxwYXRoIGQ9Ik0xMiAydjIwIi8+PC9zdmc+)
![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react)
![FastAPI](https://img.shields.io/badge/FastAPI-0.104-009688?style=for-the-badge&logo=fastapi)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=for-the-badge&logo=supabase)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript)

**Plataforma SaaS todo-en-uno para profesionales del fitness, wellness y salud**

[Demo](#demo) • [Características](#características) • [Instalación](#instalación) • [Documentación](#documentación)

</div>

---

## 📋 Descripción

FitPro Hub es una plataforma tipo Harbiz diseñada para entrenadores personales, nutricionistas, fisioterapeutas, profesores de yoga/pilates y centros de fitness. Permite gestionar clientes, planificar sesiones y contenidos, comunicarse por chat, automatizar recordatorios y cobros, y analizar la evolución de clientes e ingresos.

## ✨ Características

### 🎯 Gestión de Clientes (CRM)
- Fichas de cliente completas con datos personales, objetivos y salud
- Sistema de tags/segmentación para automatizaciones
- Historial completo de sesiones, pagos y progreso
- Onboarding automatizado con formularios y consentimientos

### 📅 Calendario y Reservas
- Calendario con vistas diaria/semanal/mensual
- Eventos 1:1 y grupales, presenciales u online
- Reservas self-service para clientes
- Gestión de disponibilidad y lista de espera
- Recordatorios automáticos por email

### 💪 Entrenamientos
- Constructor de entrenamientos con ejercicios, series y repeticiones
- Biblioteca de ejercicios con vídeos e instrucciones
- Programas reutilizables y plantillas
- Seguimiento del progreso del cliente

### 🥗 Nutrición
- Creador de planes nutricionales
- Biblioteca de alimentos con información nutricional
- Lista de la compra automática
- Seguimiento de adherencia

### 📝 Formularios y Documentos
- Formularios personalizables (PAR-Q, consentimientos, evaluaciones)
- Envío automático en onboarding
- Gestión de documentos compartidos
- Recordatorios de formularios pendientes

### 💬 Chat y Comunicaciones
- Chat profesional-cliente en tiempo real
- Mensajes con texto, imágenes y notas de voz
- Mensajes programados y difusión segmentada
- Grupos y comunidad

### 💳 Pagos y Suscripciones
- Integración completa con Stripe
- Suscripciones con renovación automática
- Bonos/paquetes de sesiones
- Cupones y descuentos
- Gestión de impagos y recordatorios

### ⚡ Automatizaciones
- Motor de reglas/workflows
- Secuencias de onboarding
- Recordatorios automáticos
- Reactivación de clientes inactivos
- Avisos de renovación

### 📊 Reportes y Analytics
- Dashboard con KPIs principales
- MRR, ARPA, churn rate, retención
- Rendimiento por cliente y por equipo
- Exportación de datos (CSV/Excel)

### 🎨 Personalización
- Branding por workspace (logo, colores)
- Plantillas de email personalizables
- Multi-tenant con aislamiento de datos

## 🛠️ Tech Stack

### Frontend
- **React 18** + **Vite** - Framework y bundler
- **TypeScript** - Tipado estático
- **Mantine UI** - Componentes de interfaz
- **TanStack Query** - Gestión de estado del servidor
- **TanStack Table** - Tablas avanzadas
- **React Router** - Enrutamiento
- **React Hook Form** + **Zod** - Formularios y validación
- **Zustand** - Estado global

### Backend
- **FastAPI** - Framework web Python
- **SQLAlchemy 2.x** - ORM
- **Alembic** - Migraciones de base de datos
- **Celery** + **Redis** - Tareas en background
- **Pydantic** - Validación de datos

### Base de Datos y Servicios
- **Supabase PostgreSQL** - Base de datos con RLS
- **Supabase Auth** - Autenticación
- **Supabase Storage** - Almacenamiento de archivos
- **Stripe** - Pagos
- **Brevo** - Email transaccional

## 🚀 Instalación

### Prerrequisitos

- Node.js 18+
- Python 3.11+
- Docker y Docker Compose (opcional)
- Cuenta en Supabase
- Cuenta en Stripe (para pagos)

### Configuración Rápida con Docker

```bash
# Clonar el repositorio
git clone https://github.com/tu-usuario/fitpro-hub.git
cd fitpro-hub

# Copiar archivos de entorno
cp backend/env.example backend/.env
cp frontend/env.example frontend/.env.local

# Configurar las variables de entorno en los archivos .env

# Iniciar con Docker Compose
docker-compose up -d
```

### Instalación Manual

#### Backend

```bash
cd backend

# Crear entorno virtual
python -m venv venv
source venv/bin/activate  # Linux/Mac
# o
.\venv\Scripts\activate  # Windows

# Instalar dependencias
pip install -r requirements.txt

# Configurar variables de entorno
cp env.example .env
# Editar .env con tus credenciales

# Ejecutar migraciones
alembic upgrade head

# Iniciar servidor
uvicorn app.main:app --reload --port 8000
```

#### Frontend

```bash
cd frontend

# Instalar dependencias
npm install
# o
pnpm install

# Configurar variables de entorno
cp env.example .env.local
# Editar .env.local con tus credenciales

# Iniciar servidor de desarrollo
npm run dev
```

#### Celery (Background Jobs)

```bash
cd backend

# Iniciar worker
celery -A app.tasks.celery_app worker --loglevel=info

# Iniciar scheduler (en otra terminal)
celery -A app.tasks.celery_app beat --loglevel=info
```

## 📁 Estructura del Proyecto

```
fitpro-hub/
├── backend/
│   ├── app/
│   │   ├── api/v1/endpoints/    # Endpoints de la API
│   │   ├── core/                # Configuración y utilidades
│   │   ├── middleware/          # Middleware (auth, RBAC)
│   │   ├── models/              # Modelos SQLAlchemy
│   │   ├── schemas/             # Schemas Pydantic
│   │   ├── tasks/               # Tareas Celery
│   │   └── main.py              # Punto de entrada
│   ├── alembic/                 # Migraciones
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/          # Componentes React
│   │   ├── hooks/               # Custom hooks
│   │   ├── pages/               # Páginas
│   │   ├── services/            # Servicios API
│   │   ├── stores/              # Estado global (Zustand)
│   │   └── theme/               # Configuración de tema
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
└── README.md
```

## 🔐 Variables de Entorno

### Backend (.env)

```env
# App
APP_NAME=FitPro Hub
DEBUG=true
SECRET_KEY=your-secret-key

# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key
SUPABASE_JWT_SECRET=your-jwt-secret

# Database
DATABASE_URL=postgresql://user:pass@host:5432/db

# Redis
REDIS_URL=redis://localhost:6379/0

# Stripe
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Brevo (Email)
BREVO_API_KEY=your-brevo-api-key
```

### Frontend (.env.local)

```env
VITE_API_URL=/api/v1
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
```

## 📚 API Documentation

Una vez iniciado el backend, la documentación de la API está disponible en:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## 🧪 Demo

Puedes probar la aplicación sin configurar el backend usando el **Modo Demo**:

1. Inicia solo el frontend: `npm run dev`
2. Navega a http://localhost:5173/login
3. Haz clic en "Probar Modo Demo"

El modo demo simula datos de ejemplo para todas las funcionalidades.

## 🤝 Contribuir

Las contribuciones son bienvenidas. Por favor:

1. Fork el repositorio
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 👥 Equipo

Desarrollado con ❤️ para profesionales del fitness.

---

<div align="center">

**[⬆ Volver arriba](#-fitpro-hub)**

</div>
