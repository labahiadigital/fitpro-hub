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

Crearemos **3 recursos separados** en Coolify:

1. **Frontend** (React + Nginx) - Puerto 80
2. **Backend** (FastAPI + Gunicorn) - Puerto 8000
3. **Redis** (Base de datos) - Puerto 6379

---

## 📦 Paso 1: Crear Redis

1. En Coolify, click en **"New Resource"**
2. Selecciona **"Database"** → **"Redis"**
3. Configura:
   - **Name**: `fitprohub-redis`
   - **Version**: `7-alpine`
4. Click **"Start"**
5. **Anota la URL de conexión** (la necesitarás para el backend)
   - Formato: `redis://fitprohub-redis:6379`

---

## 🔧 Paso 2: Desplegar Backend (FastAPI)

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

# Redis (usa la URL del paso 1)
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

## 🎨 Paso 3: Desplegar Frontend (React)

### 3.1 Crear el recurso

1. Click en **"New Resource"** → **"Public Repository"**
2. **Repository URL**: `https://github.com/labahiadigital/fitpro-hub`
3. **Branch**: `master`
4. **Build Pack**: `Dockerfile`
5. **Base Directory**: `frontend`
6. **Dockerfile Location**: `Dockerfile`
7. **Port Exposes**: `80`

### 3.2 Configurar Build Arguments

⚠️ **IMPORTANTE**: Las variables de Vite son de **build-time**, así que deben ir como **Build Arguments**.

Ve a la pestaña **"Build"** o **"Environment Variables"** y añade como **Build Arguments**:

```env
VITE_API_URL=https://api.tu-dominio.com
VITE_SUPABASE_URL=https://[PROJECT-REF].supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_xxx
```

> 💡 En Coolify, busca la sección "Build Arguments" o "Docker Build Args"

### 3.3 Configurar Dominio

1. Ve a la pestaña **"Domains"**
2. Añade: `app.tu-dominio.com` (o tu dominio principal)
3. Habilita **HTTPS**

### 3.4 Desplegar

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

---

## 🔄 Actualizaciones Automáticas

### Configurar Auto Deploy

En cada recurso de Coolify:

1. Ve a **"Settings"**
2. Habilita **"Auto Deploy"**
3. Configura el **webhook de GitHub** (Coolify te da la URL)

Ahora cada push a `master` desplegará automáticamente.

---

## 📊 Monitorización

### Ver Logs

En Coolify, cada recurso tiene una pestaña **"Logs"** donde puedes ver:
- Logs de build
- Logs de aplicación
- Errores

### Health Checks

Los health checks están configurados automáticamente:
- **Frontend**: `GET /health` → `healthy`
- **Backend**: `GET /health` → `{"status":"healthy"}`

---

## 🆘 Solución de Problemas

### Frontend en blanco

1. Verifica que los **Build Arguments** están configurados
2. Revisa los logs del build en Coolify
3. Asegúrate de que `VITE_API_URL` apunta al backend correcto

### Error de conexión a base de datos

1. Verifica `DATABASE_URL` (debe usar `postgresql+asyncpg://`)
2. En Supabase, verifica que no hay restricciones de IP
3. Revisa los logs del backend

### Error de CORS

El backend ya tiene CORS configurado para permitir todos los orígenes. Si hay problemas:
1. Verifica que `VITE_API_URL` no tiene `/` al final
2. Revisa los logs del backend

### Redis no conecta

1. Verifica que Redis está corriendo en Coolify
2. Usa el nombre del servicio en la URL: `redis://fitprohub-redis:6379/0`
3. Ambos servicios deben estar en la misma red de Coolify

### Build falla en el frontend

1. Verifica que `pnpm-lock.yaml` existe en el repo
2. Revisa los logs de build para ver el error específico

---

## 📁 Resumen de Recursos en Coolify

| Recurso | Tipo | Puerto | Dominio |
|---------|------|--------|---------|
| fitprohub-redis | Database (Redis) | 6379 | - |
| fitprohub-backend | Dockerfile | 8000 | api.tu-dominio.com |
| fitprohub-frontend | Dockerfile | 80 | app.tu-dominio.com |

---

## 📞 Soporte

- **Coolify Docs**: https://coolify.io/docs
- **Supabase Docs**: https://supabase.com/docs
- **Stripe Docs**: https://stripe.com/docs

---

¡Listo! Tu FitPro Hub debería estar funcionando en producción 🎉
