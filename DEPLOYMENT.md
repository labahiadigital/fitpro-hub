# 🚀 Guía de Despliegue - FitPro Hub en Coolify

Esta guía te ayudará a desplegar FitPro Hub en Coolify.

## 📋 Prerrequisitos

1. **Coolify instalado** en tu servidor
2. **Cuenta de Supabase** con proyecto creado
3. **Cuenta de Stripe** (para pagos)
4. **Cuenta de Brevo** (para emails, opcional)
5. **Dominio configurado** (opcional pero recomendado)

---

## 🏗️ Opción 1: Despliegue con Docker Compose (Recomendado)

### Paso 1: Crear nuevo proyecto en Coolify

1. Ve a tu panel de Coolify
2. Click en **"New Resource"** → **"Docker Compose"**
3. Selecciona **"GitHub"** como fuente
4. Conecta tu repositorio: `https://github.com/labahiadigital/fitpro-hub`

### Paso 2: Configurar Docker Compose

En la configuración del recurso:

- **Docker Compose Location**: `docker-compose.prod.yml`
- **Build Pack**: Docker Compose

### Paso 3: Configurar Variables de Entorno

Ve a la sección **"Environment Variables"** y añade:

```env
# Frontend (Build-time)
VITE_API_URL=https://api.tu-dominio.com
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_xxx

# Backend
DATABASE_URL=postgresql+asyncpg://postgres:PASSWORD@db.xxx.supabase.co:5432/postgres
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_SERVICE_KEY=tu-service-role-key
SUPABASE_JWT_SECRET=tu-jwt-secret
REDIS_URL=redis://redis:6379/0
SECRET_KEY=tu-clave-secreta-muy-larga-32-chars
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
BREVO_API_KEY=tu-brevo-api-key
ENVIRONMENT=production
```

### Paso 4: Configurar Dominios

1. **Frontend**: Configura tu dominio principal (ej: `app.tu-dominio.com`)
2. **Backend**: Configura subdominio API (ej: `api.tu-dominio.com`)

En Coolify, ve a **"Domains"** y añade:
- Frontend: `app.tu-dominio.com` → Puerto `80`
- Backend: `api.tu-dominio.com` → Puerto `8000`

### Paso 5: Desplegar

Click en **"Deploy"** y espera a que se complete.

---

## 🎯 Opción 2: Despliegue Separado (Frontend + Backend)

### Frontend (React)

1. **New Resource** → **"Dockerfile"**
2. Repositorio: `https://github.com/labahiadigital/fitpro-hub`
3. **Base Directory**: `frontend`
4. **Dockerfile**: `Dockerfile.prod`
5. **Port**: `80`

Variables de entorno (Build Arguments):
```env
VITE_API_URL=https://api.tu-dominio.com
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_xxx
```

### Backend (FastAPI)

1. **New Resource** → **"Dockerfile"**
2. Repositorio: `https://github.com/labahiadigital/fitpro-hub`
3. **Base Directory**: `backend`
4. **Dockerfile**: `Dockerfile.prod`
5. **Port**: `8000`

Variables de entorno:
```env
DATABASE_URL=postgresql+asyncpg://postgres:PASSWORD@db.xxx.supabase.co:5432/postgres
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_SERVICE_KEY=tu-service-role-key
SUPABASE_JWT_SECRET=tu-jwt-secret
REDIS_URL=redis://tu-redis-host:6379/0
SECRET_KEY=tu-clave-secreta-muy-larga-32-chars
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
BREVO_API_KEY=tu-brevo-api-key
ENVIRONMENT=production
```

### Redis

1. **New Resource** → **"Database"** → **"Redis"**
2. Anota la URL de conexión para usarla en el backend

---

## 🔧 Configuración de Supabase

### 1. Obtener credenciales

En tu proyecto de Supabase, ve a **Settings** → **API**:

- `SUPABASE_URL`: URL del proyecto
- `SUPABASE_ANON_KEY`: anon/public key
- `SUPABASE_SERVICE_KEY`: service_role key (¡mantener secreto!)
- `SUPABASE_JWT_SECRET`: JWT Secret (en Settings → API → JWT Settings)

### 2. Configurar Base de Datos

La URL de conexión la encuentras en **Settings** → **Database**:

```
postgresql+asyncpg://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```

### 3. Ejecutar Migraciones

Después del primer despliegue, ejecuta las migraciones:

```bash
# Conectar al contenedor del backend
docker exec -it fitprohub-backend-1 bash

# Ejecutar migraciones
alembic upgrade head
```

---

## 🔐 Configuración de Stripe

### 1. Obtener claves

En tu dashboard de Stripe:
- `STRIPE_SECRET_KEY`: Developers → API Keys → Secret key
- `STRIPE_PUBLISHABLE_KEY`: Developers → API Keys → Publishable key

### 2. Configurar Webhook

1. Ve a **Developers** → **Webhooks**
2. Click **"Add endpoint"**
3. URL: `https://api.tu-dominio.com/api/v1/payments/webhook`
4. Eventos a escuchar:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
5. Copia el **Webhook signing secret** → `STRIPE_WEBHOOK_SECRET`

---

## 🌐 Configuración de DNS

Configura estos registros DNS:

| Tipo | Nombre | Valor |
|------|--------|-------|
| A | app | IP de tu servidor |
| A | api | IP de tu servidor |
| CNAME | www | app.tu-dominio.com |

---

## ✅ Verificación Post-Despliegue

### 1. Verificar Frontend
```bash
curl https://app.tu-dominio.com/health
# Debe responder: healthy
```

### 2. Verificar Backend
```bash
curl https://api.tu-dominio.com/health
# Debe responder: {"status": "healthy"}
```

### 3. Verificar API
```bash
curl https://api.tu-dominio.com/api/v1/
# Debe responder información de la API
```

---

## 🔄 Actualizaciones

Para actualizar la aplicación:

1. Haz push de los cambios a GitHub
2. En Coolify, click en **"Redeploy"**

O configura **Auto Deploy** en Coolify para despliegues automáticos en cada push.

---

## 📊 Monitorización

### Logs

En Coolify, ve a **"Logs"** para ver los logs de cada servicio.

### Health Checks

Los health checks están configurados automáticamente:
- Frontend: `/health`
- Backend: `/health`
- Redis: `redis-cli ping`

---

## 🆘 Solución de Problemas

### Error: "Cannot connect to database"
- Verifica `DATABASE_URL`
- Asegúrate de que la IP del servidor está permitida en Supabase

### Error: "Redis connection refused"
- Verifica que Redis está corriendo
- Verifica `REDIS_URL`

### Error: "CORS error"
- Verifica que `VITE_API_URL` apunta al backend correcto
- El backend ya tiene CORS configurado para permitir todos los orígenes

### Frontend en blanco
- Verifica las variables de entorno del build
- Revisa los logs del contenedor

---

## 📞 Soporte

Si tienes problemas:
1. Revisa los logs en Coolify
2. Verifica las variables de entorno
3. Consulta la documentación de Coolify: https://coolify.io/docs

