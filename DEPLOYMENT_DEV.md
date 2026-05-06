# Despliegue del entorno **DEV** (rama `dev`)

Esta guía describe cómo desplegar el entorno **dev** de Trackfiz en paralelo al
de producción, sin tocar nada de prod.

> **Convención de dominios**
> - Frontend dev: `https://preapp.trackfiz.com`
> - Backend  dev: `https://preapi.trackfiz.com`
>
> **Convención de ramas**
> - `master` → entorno **producción** (`app.trackfiz.com` / `api.trackfiz.com`)
> - `dev`    → entorno **pre / staging** (`preapp.trackfiz.com` / `preapi.trackfiz.com`)
>
> **Workflow**
> Todo cambio entra primero en `dev` → se prueba en preapp/preapi → cuando está
> listo se promociona a `master` mediante un Pull Request.

---

## 0. Resumen visual

```
                            ┌──────────────────┐
   feature/*  ──── PR ────► │   rama  dev      │ ──┐
                            └──────────────────┘   │
                                                   │  PR (review + tests)
                                                   ▼
                            ┌──────────────────┐
                            │   rama  master   │ ────► auto-deploy a PROD
                            └──────────────────┘
```

| Recurso | DEV (rama `dev`) | PROD (rama `master`) |
|---|---|---|
| Frontend  | `preapp.trackfiz.com`  | `app.trackfiz.com` |
| Backend   | `preapi.trackfiz.com`  | `api.trackfiz.com` |
| Supabase  | `trackfiz-dev` (`girvemeyzfctxtcmhrup`) | `e13fitnessofficial's Project` (`ougfmkbjrpnjvujhuuyy`) |
| R2 platform   | `trackfiz-platform-dev` | `trackfiz-platform` |
| R2 workspaces | `trackfiz-workspaces-dev` | `trackfiz-workspaces` |
| Redis     | `trackfiz-dev-redis`  | `trackfiz-redis` |
| Stripe webhook | `https://preapi.trackfiz.com/api/v1/payments/webhook` | `https://api.trackfiz.com/api/v1/payments/webhook` |

---

## 1. Crear los 5 recursos en Coolify

Repite el flujo de `DEPLOYMENT.md`, pero con **branch `dev`** y nombres
prefijados con `trackfiz-dev-…`. Resumen:

| # | Recurso | Tipo | Branch | Dockerfile | Dominio |
|---|---|---|---|---|---|
| 1 | `trackfiz-dev-redis`         | DB Redis           | —     | —                   | — |
| 2 | `trackfiz-dev-backend`       | Public repo (Docker) | `dev` | `backend/Dockerfile`        | `preapi.trackfiz.com` |
| 3 | `trackfiz-dev-celery-worker` | Public repo (Docker) | `dev` | `backend/Dockerfile.celery` | — |
| 4 | `trackfiz-dev-celery-beat`   | Public repo (Docker) | `dev` | `backend/Dockerfile.beat`   | — |
| 5 | `trackfiz-dev-frontend`      | Public repo (Docker) | `dev` | `frontend/Dockerfile`       | `preapp.trackfiz.com` |

Activa **"Auto deploy"** en los 5 recursos: cada `git push origin dev` re-deploya
solo el entorno dev.

---

## 2. Variables de entorno

### 2.1 Backend / worker / beat

Copia el contenido de [`backend/env.dev.example`](backend/env.dev.example) en
los **tres** recursos (backend, worker, beat). Las **mismas** envs.

Variables que **DEBES** rellenar manualmente (no están en el template):

| Variable | Dónde se obtiene |
|---|---|
| `SECRET_KEY` | `python -c "import secrets; print(secrets.token_urlsafe(64))"` |
| `CERTIFICATE_ENCRYPTION_KEY` | `python -c "import os; print(os.urandom(32).hex())"` |
| `SUPABASE_SERVICE_KEY` | Supabase dashboard `trackfiz-dev` → Settings → API → service_role |
| `SUPABASE_JWT_SECRET`  | Supabase dashboard `trackfiz-dev` → Settings → API → JWT Settings |
| `DATABASE_URL` (password) | Supabase dashboard `trackfiz-dev` → Settings → Database → Connection Pooling (Transaction). Si no recuerdas el password, "Reset database password". |
| `STRIPE_WEBHOOK_SECRET` | Crear webhook nuevo en Stripe (paso 5) |
| `KAPSO_API_KEY` y `KAPSO_WEBHOOK_SECRET` | Cuenta Kapso de pruebas (paso 6) |
| `BREVO_API_KEY` | API key separada de Brevo, idealmente con sender `noreply-dev@…` |
| `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` | Cloudflare R2 dashboard (paso 4) |

### 2.2 Frontend (Build Arguments en Coolify)

Pega el contenido de [`frontend/env.dev.example`](frontend/env.dev.example) en
**Build Arguments** del recurso `trackfiz-dev-frontend` (NO en environment
variables — Vite las inyecta en build time).

---

## 3. Aplicar migraciones a la nueva BD Supabase

El proyecto `trackfiz-dev` arranca **vacío**. Hay que ejecutar todas las
migraciones Alembic una vez:

```bash
cd backend
# Activar venv
python -m venv venv
.\venv\Scripts\activate          # Windows
# source venv/bin/activate       # macOS/Linux
pip install -r requirements.txt

# Configurar SOLO la DATABASE_URL del entorno dev (con el password real)
$env:DATABASE_URL = "postgresql://postgres.girvemeyzfctxtcmhrup:<PASSWORD>@aws-1-eu-west-3.pooler.supabase.com:6543/postgres"

# Aplicar todas las migraciones
alembic upgrade head
```

Las migraciones incluyen seeds globales (ejercicios, alimentos, bebidas, formas
de sistema). Lo que **no** se copia: clientes, programas, planes, usuarios →
hay que crear datos de prueba a mano en dev.

> **Imágenes/assets** de los seeds (foods, exercises, beverages) viven en R2
> de prod. Para que se vean en dev tienes dos opciones:
>
> 1. **Recomendado**: copia el bucket `trackfiz-platform` → `trackfiz-platform-dev`
>    una sola vez (los assets globales son inmutables). Usa `rclone` o el script
>    `scripts/_rescue_food_uploads.py` adaptado.
> 2. **Alternativa rápida**: en dev, deja `R2_PLATFORM_BUCKET=trackfiz-platform`
>    (compartido con prod) — el bucket es de solo lectura para assets globales,
>    así que es seguro mientras nunca escribas a él desde dev. Pero `trackfiz-workspaces-dev`
>    SÍ debe ser independiente (ahí van fotos de progreso, certificados FNMT, etc.).

---

## 4. Buckets R2 dev (ya creados con wrangler)

Los dos buckets ya se han creado con `wrangler` (location hint `eeur` —
European Union):

```bash
wrangler r2 bucket create trackfiz-platform-dev   --location eeur
wrangler r2 bucket create trackfiz-workspaces-dev --location eeur
```

**Pendiente manual** (la wrangler-CLI no puede automatizar esto):

1. **Custom domains** en cada bucket → Cloudflare Dashboard → R2 → bucket →
   Settings → Custom Domains:
   - `trackfiz-platform-dev`   → `platform-dev.trackfiz.com`
   - `trackfiz-workspaces-dev` → `workspaces-dev.trackfiz.com`
2. **API Token S3-compatible** → Cloudflare Dashboard → R2 → Manage R2 API
   Tokens → Create API Token con permisos **Object Read & Write** sobre los
   buckets dev. Pega los valores en:
   - `R2_ACCESS_KEY_ID`
   - `R2_SECRET_ACCESS_KEY`

> Account ID ya conocido: `c6172efa331c20abf02f4f2e531ad0a4`
> (devuelto por `wrangler whoami`).

---

## 5. Configurar webhook Stripe dev

En [Stripe Dashboard](https://dashboard.stripe.com/test/webhooks) (modo TEST):

1. **Add endpoint**
2. URL: `https://preapi.trackfiz.com/api/v1/payments/webhook`
3. Eventos:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
4. Copia el **Signing secret** y pégalo en `STRIPE_WEBHOOK_SECRET` del backend dev.

> El webhook de prod sigue intocado y apunta a `api.trackfiz.com`.

---

## 6. Configurar WhatsApp (Kapso) dev

> **Riesgo**: con la API key de prod, los webhooks entrantes están registrados
> en el backend de prod. Si reutilizas la key en dev, los mensajes que envíes
> desde dev saldrán de la cuenta de WhatsApp Business de prod.

Opciones (de mayor a menor coste):

1. **Recomendado**: crear cuenta/proyecto Kapso aparte para dev y usar otro
   número de WhatsApp Business.
2. **Aceptable para empezar**: usar la misma API key, pero NO crear webhooks
   nuevos desde dev (`auto_register_webhook=false`) y solo enviar mensajes
   manualmente a tu propio número.
3. **No hacer**: re-registrar webhook desde dev → te roba los webhooks de prod.

`KAPSO_WEBHOOK_SECRET` debe ser distinto al de prod (genera uno nuevo).

---

## 7. Configurar Google OAuth (Calendar)

En [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials)
del cliente OAuth existente:

1. Edita el OAuth 2.0 Client ID actual.
2. En **Authorized redirect URIs** añade:
   - `https://preapp.trackfiz.com/auth/google/callback`
3. Guarda.

`GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` pueden ser los mismos que prod.

---

## 8. DNS

Añade estos registros A/CNAME apuntando a tu servidor Coolify:

| Tipo | Nombre | Valor |
|---|---|---|
| A | `preapp` | IP del servidor Coolify |
| A | `preapi` | IP del servidor Coolify |
| A | `platform-dev`   | IP del worker R2 público (o CNAME a R2) |
| A | `workspaces-dev` | IP del worker R2 público (o CNAME a R2) |

---

## 9. GitHub – branch protection (master)

En GitHub → Settings → Branches → Add rule:

- **Branch name pattern**: `master`
- ✅ Require a pull request before merging
- ✅ Require approvals (1)
- ✅ Require status checks to pass before merging (cuando montes CI)
- ✅ Do not allow bypassing the above settings

Esto evita pushes accidentales a producción.

---

## 10. Sincronización nocturna PROD → DEV (datos reales en pre)

### 10.0 ¿Quién dispara el sync? (importante)

| Componente | ¿Programa la tarea? | ¿La ejecuta? |
|---|---|---|
| `trackfiz-celery-beat` (PROD) | Sí, está en el código del repo y aparece en su schedule | **No** — la tarea se aborta sola al detectar `APP_ENV=production` |
| `trackfiz-dev-celery-beat`    | Sí, programada a las 04:00 Europe/Madrid | **No directamente** — solo programa |
| `trackfiz-dev-celery-worker`  | No programa | **Sí, ejecuta** el `pg_dump`/`pg_restore` |
| `trackfiz-celery-worker` (PROD) | No programa | **Nunca recibe la tarea** porque el beat de prod no la encola |

Reforzado en código (`backend/app/celery_app.py`): la entrada del beat
schedule **solo se añade si `not settings.is_production`**, por lo que en
producción ni siquiera aparece. Y aún si alguien la encolara manualmente, la
tarea aborta dentro de `sync_prod_to_dev` antes de hacer nada.

Conexión PROD → DEV es **unidireccional**: el worker de dev abre la conexión
de lectura a prod (con `PROD_DATABASE_URL`) y escribe en su propia BD. Prod
nunca conoce ni se conecta a dev.

### 10.1 Cómo está protegida (defensa en profundidad)

La tarea **se aborta** automáticamente si cualquiera de estas se cumple:

| Condición | Por qué |
|---|---|
| `APP_ENV=production` | Nunca se sincroniza desde un entorno declarado prod |
| `ENABLE_DB_SYNC` ≠ `"true"` | Activación opt-in |
| `DEV_DATABASE_URL` o `DATABASE_URL` contiene `ougfmkbjrpnjvujhuuyy` | Tripwire hardcoded del ref de prod |
| `PROD_DATABASE_URL` y la URL destino apuntan al mismo host | El script bash valida `prod_host != dev_host` |

### 10.2 Configuración

En las envs del recurso `trackfiz-dev-celery-worker` y `trackfiz-dev-celery-beat`:

```env
ENABLE_DB_SYNC=true
PROD_DATABASE_URL=postgresql://postgres.ougfmkbjrpnjvujhuuyy:[PROD_PASSWORD]@aws-1-eu-west-3.pooler.supabase.com:6543/postgres
# DEV_DATABASE_URL es opcional — si está vacío, usa DATABASE_URL como destino.
DEV_DATABASE_URL=
DB_SYNC_EXCLUDE_TABLES=alembic_version,google_calendar_tokens
DB_SYNC_POST_SQL_FILE=
```

### 10.3 Tablas excluidas por defecto

| Tabla | Motivo |
|---|---|
| `alembic_version` | No queremos pisar la versión Alembic de dev (las migraciones de dev pueden ir por delante de prod) |
| `google_calendar_tokens` | Tokens OAcuth válidos = riesgo de seguridad (un atacante en pre podría leer calendarios de clientes reales) |

Puedes añadir más tablas separándolas por comas en `DB_SYNC_EXCLUDE_TABLES`.

### 10.4 Hook SQL post-sync (desactivado por defecto)

Desactivado a propósito (`DB_SYNC_POST_SQL_FILE=`) porque la intención del
entorno dev es que sea **lo más parecido posible a prod** (datos reales tal
cual). Si en el futuro decides anonimizar / resetear passwords / desactivar
users en dev, hay una plantilla en
`scripts/sync_supabase_post_dev.example.sql`. Cópiala a
`scripts/sync_supabase_post_dev.sql` (gitignored) y configura:

```env
DB_SYNC_POST_SQL_FILE=/app/scripts/sync_supabase_post_dev.sql
```

> **Riesgo asumido**: como dev es una copia 1:1 de prod, cualquiera con un
> email/password real de un cliente puede loggearse en pre. Asegúrate de que
> el dominio `preapp.trackfiz.com` no es público y que el acceso está
> restringido (Cloudflare Access, IP whitelist, basic auth, etc.) si manejas
> datos sensibles.

### 10.5 Primera carga inicial (manual)

Antes de que se ejecute el sync automático, lanza la primera carga a mano para
poblar dev:

```bash
# Desde tu máquina local, con backend/.env.dev rellenado:
cd backend
# Cargar las variables. En PowerShell:
Get-Content .env.dev | ForEach-Object { if ($_ -match '^([^#=]+)=(.*)$') { [Environment]::SetEnvironmentVariable($matches[1], $matches[2], 'Process') } }

# Aplicar migraciones a dev (SI no lo hiciste ya):
alembic upgrade head

# Lanzar sync (requiere bash + postgresql-client-17 instalados localmente)
bash ../scripts/sync_supabase_prod_to_dev.sh
```

### 10.6 Disparo manual desde Coolify (sin esperar a las 04:00)

```bash
# SSH al container del worker y ejecuta:
celery -A app.celery_app call app.tasks.db_sync.sync_prod_to_dev
# O directamente el script:
bash /app/scripts/sync_supabase_prod_to_dev.sh
```

### 10.7 Coste y duración

- pg_dump del schema `public` para una BD de unos cuantos MB: < 1 minuto.
- Transferencia salida desde Supabase: incluida (mismo project en eu-west-3,
  pero cruza redes). Plan Free Supabase = 5 GB de bandwidth/mes; vigílalo.
- `task_time_limit=30 min` configurado en la tarea por si la BD crece.

---

## 11. Checklist de verificación

Antes de dar el entorno dev por bueno:

- [ ] `https://preapi.trackfiz.com/health` devuelve `{"status":"healthy"}`
- [ ] `https://preapi.trackfiz.com/docs` carga la documentación
- [ ] `https://preapp.trackfiz.com/login` carga la app y se ve el dominio dev
- [ ] Crear un workspace + un usuario admin de prueba en dev
- [ ] Subir una foto de progreso (verifica `trackfiz-workspaces-dev`)
- [ ] Provocar un email transaccional (invitar a un cliente con email tuyo)
      → llega desde `noreply-dev@…`
- [ ] Lanzar un cobro Redsys de prueba → callback llega a `preapi.trackfiz.com`
- [ ] Stripe webhook → CLI `stripe trigger checkout.session.completed --forward-to preapi.trackfiz.com/api/v1/payments/webhook`
- [ ] **Comprobar que prod sigue funcionando** (`api.trackfiz.com/health`)
- [ ] Disparar `app.tasks.db_sync.sync_prod_to_dev` manualmente y verificar
      que no aborta y que dev queda con los datos copiados (revisa
      `select count(*) from public.clients` antes/después)
