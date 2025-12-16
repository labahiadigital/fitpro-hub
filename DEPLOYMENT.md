# 🚀 Guía de Despliegue - FitPro Hub en Coolify

Esta guía te ayudará a desplegar FitPro Hub en Coolify con recursos separados.

## 📋 Prerrequisitos

1. **Coolify instalado** en tu servidor
2. **Cuenta de Supabase** con proyecto creado
3. **Cuenta de Stripe** (para pagos)
4. **Cuenta de Brevo** (para emails, opcional)
5. **Dominio configurado** (opcional pero recomendado)

---

## 🏗️ Arquitectura de Despliegue

Crearemos **5 recursos separados** en Coolify:

| # | Recurso | Descripción |
|---|---------|-------------|
| 1 | **Redis** | Cache y broker para Celery |
| 2 | **Backend API** | FastAPI + Gunicorn |
| 3 | **Celery Worker** | Procesamiento de tareas en background |
| 4 | **Celery Beat** | Scheduler para tareas programadas |
| 5 | **Frontend** | React + Nginx |

---

## 📦 Paso 1: Crear Redis

1. En Coolify, click en **"New Resource"**
2. Selecciona **"Database"** → **"Redis"**
3. Configura:
   - **Name**: `fitprohub-redis`
   - **Version**: `7-alpine`
4. Click **"Start"**
5. **Anota la URL de conexión**: `redis://fitprohub-redis:6379`

---

## 🔧 Paso 2: Desplegar Backend API (FastAPI)

### 2.1 Crear el recurso

1. Click en **"New Resource"** → **"Public Repository"**
2. **Repository URL**: `https://github.com/labahiadigital/fitpro-hub`
3. **Branch**: `master`
4. **Build Pack**: `Dockerfile`
5. **Base Directory**: `backend`
6. **Dockerfile Location**: `Dockerfile`
7. **Port Exposes**: `8000`

### 2.2 Configurar Variables de Entorno

Ve a la pestaña **"Environment Variables"** y añade:

```env
# Base de datos (Supabase)
DATABASE_URL=postgresql+asyncpg://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres

# Supabase
SUPABASE_URL=https://[PROJECT-REF].supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_JWT_SECRET=tu-jwt-secret-de-supabase

# Redis (usa el nombre del servicio de Coolify)
REDIS_URL=redis://fitprohub-redis:6379/0

# Seguridad
SECRET_KEY=genera-una-clave-secreta-muy-larga-de-al-menos-32-caracteres

# Stripe
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Brevo (Email)
BREVO_API_KEY=tu-brevo-api-key

# Entorno
ENVIRONMENT=production
```

### 2.3 Configurar Dominio

1. Ve a la pestaña **"Domains"**
2. Añade: `api.tu-dominio.com`
3. Habilita **HTTPS**

### 2.4 Desplegar

Click en **"Deploy"**

---

## ⚙️ Paso 3: Desplegar Celery Worker

El worker procesa tareas en background como:
- Envío de emails
- Notificaciones
- Procesamiento de pagos
- Generación de reportes

### 3.1 Crear el recurso

1. Click en **"New Resource"** → **"Public Repository"**
2. **Repository URL**: `https://github.com/labahiadigital/fitpro-hub`
3. **Branch**: `master`
4. **Build Pack**: `Dockerfile`
5. **Base Directory**: `backend`
6. **Dockerfile Location**: `Dockerfile.celery`

### 3.2 Configurar Variables de Entorno

**Las mismas que el Backend API:**

```env
DATABASE_URL=postgresql+asyncpg://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
SUPABASE_URL=https://[PROJECT-REF].supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
REDIS_URL=redis://fitprohub-redis:6379/0
SECRET_KEY=la-misma-clave-que-el-backend
STRIPE_SECRET_KEY=sk_live_xxx
BREVO_API_KEY=tu-brevo-api-key
ENVIRONMENT=production
```

### 3.3 Sin dominio necesario

El worker no expone ningún puerto, solo procesa tareas internas.

### 3.4 Desplegar

Click en **"Deploy"**

---

## ⏰ Paso 4: Desplegar Celery Beat (Scheduler)

El scheduler ejecuta tareas programadas como:
- Recordatorios de sesiones
- Renovaciones de suscripciones
- Reportes diarios/semanales
- Limpieza de datos

### 4.1 Crear el recurso

1. Click en **"New Resource"** → **"Public Repository"**
2. **Repository URL**: `https://github.com/labahiadigital/fitpro-hub`
3. **Branch**: `master`
4. **Build Pack**: `Dockerfile`
5. **Base Directory**: `backend`
6. **Dockerfile Location**: `Dockerfile.beat`

### 4.2 Configurar Variables de Entorno

**Las mismas que el Celery Worker:**

```env
DATABASE_URL=postgresql+asyncpg://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
SUPABASE_URL=https://[PROJECT-REF].supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
REDIS_URL=redis://fitprohub-redis:6379/0
SECRET_KEY=la-misma-clave-que-el-backend
ENVIRONMENT=production
```

### 4.3 Sin dominio necesario

El scheduler no expone ningún puerto.

### 4.4 Desplegar

Click en **"Deploy"**

---

## 🎨 Paso 5: Desplegar Frontend (React)

### 5.1 Crear el recurso

1. Click en **"New Resource"** → **"Public Repository"**
2. **Repository URL**: `https://github.com/labahiadigital/fitpro-hub`
3. **Branch**: `master`
4. **Build Pack**: `Dockerfile`
5. **Base Directory**: `frontend`
6. **Dockerfile Location**: `Dockerfile`
7. **Port Exposes**: `80`

### 5.2 Configurar Build Arguments

⚠️ **IMPORTANTE**: Las variables de Vite son de **build-time**, deben ir como **Build Arguments**.

Ve a la sección **"Build Arguments"** y añade:

```env
VITE_API_URL=https://api.tu-dominio.com
VITE_SUPABASE_URL=https://[PROJECT-REF].supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_xxx
```

### 5.3 Configurar Dominio

1. Ve a la pestaña **"Domains"**
2. Añade: `app.tu-dominio.com` (o tu dominio principal)
3. Habilita **HTTPS**

### 5.4 Desplegar

Click en **"Deploy"**

---

## 🔐 Obtener Credenciales de Supabase

### URL y Claves API

1. Ve a tu proyecto en [Supabase Dashboard](https://supabase.com/dashboard)
2. **Settings** → **API**
3. Copia:
   - **Project URL** → `SUPABASE_URL` y `VITE_SUPABASE_URL`
   - **anon public** → `VITE_SUPABASE_ANON_KEY`
   - **service_role** → `SUPABASE_SERVICE_KEY` (⚠️ mantener secreto)

### JWT Secret

1. **Settings** → **API** → **JWT Settings**
2. Copia el **JWT Secret** → `SUPABASE_JWT_SECRET`

### Database URL

1. **Settings** → **Database**
2. Copia la **Connection string** (URI)
3. Cambia `postgresql://` por `postgresql+asyncpg://`

Ejemplo:
```
postgresql+asyncpg://postgres:TU_PASSWORD@db.abcdefgh.supabase.co:5432/postgres
```

---

## 💳 Configurar Stripe

### Claves API

1. Ve a [Stripe Dashboard](https://dashboard.stripe.com)
2. **Developers** → **API Keys**
3. Copia:
   - **Publishable key** → `VITE_STRIPE_PUBLISHABLE_KEY`
   - **Secret key** → `STRIPE_SECRET_KEY`

### Webhook

1. **Developers** → **Webhooks** → **Add endpoint**
2. **Endpoint URL**: `https://api.tu-dominio.com/api/v1/payments/webhook`
3. **Events to send**:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
4. Copia **Signing secret** → `STRIPE_WEBHOOK_SECRET`

---

## 🌐 Configuración DNS

Añade estos registros en tu proveedor de DNS:

| Tipo | Nombre | Valor |
|------|--------|-------|
| A | app | IP de tu servidor Coolify |
| A | api | IP de tu servidor Coolify |
| CNAME | www | app.tu-dominio.com |

---

## ✅ Verificación Post-Despliegue

### Verificar Frontend
```bash
curl https://app.tu-dominio.com/health
# Respuesta esperada: healthy
```

### Verificar Backend
```bash
curl https://api.tu-dominio.com/health
# Respuesta esperada: {"status":"healthy"}
```

### Verificar API Docs
Abre en el navegador: `https://api.tu-dominio.com/docs`

### Verificar Celery Worker
En los logs del worker deberías ver:
```
[celery.worker.consumer] Connected to redis://fitprohub-redis:6379/0
[celery.worker.consumer] mingle: searching for neighbors
[celery.worker.consumer] ready.
```

### Verificar Celery Beat
En los logs del beat deberías ver:
```
[celery.beat] beat: Starting...
[celery.beat] Scheduler: Sending due task...
```

---

## 📁 Resumen de Recursos en Coolify

| Recurso | Tipo | Puerto | Dominio | Dockerfile |
|---------|------|--------|---------|------------|
| fitprohub-redis | Database (Redis) | 6379 | - | - |
| fitprohub-backend | Dockerfile | 8000 | api.tu-dominio.com | `Dockerfile` |
| fitprohub-celery-worker | Dockerfile | - | - | `Dockerfile.celery` |
| fitprohub-celery-beat | Dockerfile | - | - | `Dockerfile.beat` |
| fitprohub-frontend | Dockerfile | 80 | app.tu-dominio.com | `Dockerfile` |

---

## 🔄 Orden de Despliegue

Es importante seguir este orden:

1. **Redis** (primero, los demás dependen de él)
2. **Backend API** (necesita Redis)
3. **Celery Worker** (necesita Redis y misma config que backend)
4. **Celery Beat** (necesita Redis)
5. **Frontend** (necesita que el backend esté listo)

---

## 🆘 Solución de Problemas

### Celery Worker no conecta a Redis

1. Verifica que Redis está corriendo
2. Verifica que `REDIS_URL` usa el nombre correcto del servicio
3. Asegúrate de que están en la misma red de Coolify

### Tareas no se ejecutan

1. Revisa los logs del Celery Worker
2. Verifica que el worker está conectado a Redis
3. Comprueba que las tareas están registradas

### Celery Beat no programa tareas

1. Revisa los logs del Beat
2. Verifica la configuración de `celery_app.conf.beat_schedule`

### Frontend en blanco

1. Verifica que los **Build Arguments** están configurados
2. Revisa los logs del build
3. Asegúrate de que `VITE_API_URL` apunta al backend correcto

---

## 📞 Soporte

- **Coolify Docs**: https://coolify.io/docs
- **Celery Docs**: https://docs.celeryq.dev
- **Supabase Docs**: https://supabase.com/docs

---

¡Listo! Tu FitPro Hub completo debería estar funcionando en producción 🎉
