# Backend Structure Document for FitPro Hub

## 1. Backend Architecture

Overview:
- We use a **microservices-style single application** built with **FastAPI (Python)**. It’s organized around modules (clients, bookings, workouts, nutrition, chat, payments, automations).
- **Design patterns**:
  - **Repository pattern** for database access (via SQLAlchemy) to keep business logic separate from data logic.
  - **Dependency injection** in FastAPI to manage things like database sessions, cache connections, and authentication.
  - **Modular routers** in FastAPI to group endpoints per feature.

How it supports our goals:
- **Scalability**: Each module can be deployed or scaled independently (e.g., spin up more instances of the booking service under load). Background tasks (Celery workers) isolate heavy jobs.
- **Maintainability**: Clear separation of concerns—API layer, business logic layer, data access—makes it easy to update or extend a feature without touching others.
- **Performance**: FastAPI’s async capabilities handle many concurrent requests. Redis caching for frequently read data (e.g., calendar availability) reduces database hits.

## 2. Database Management

Database technology:
- **PostgreSQL** (hosted via Supabase)
  - Single schema with **row-level security (RLS)** for multi-tenancy.
- **Supabase Storage** (S3-compatible) for file and video assets.

Data practices:
- **RLS policies** ensure every query includes `workspace_id` to isolate tenant data.
- **SQLAlchemy 2.x + Alembic** for object mapping and migrations.
- **Backups**: Daily snapshots of the Postgres database, retained for 30 days.
- **Encryption**: Data encrypted at rest by Supabase; in transit via TLS.

## 3. Database Schema (PostgreSQL)

Human summary:
- **Workspaces** hold tenant settings and branding.
- **Users** can have roles (Owner, Colaborador, Cliente) in a workspace.
- **Clients** are the end-users managed by a professional.
- **Events/Bookings** cover scheduling.
- **Workouts**, **Nutrition Plans**, **Forms**, **Chats**, **Payments** and **Automations** each have their own tables, linked back to workspace and users.
- **Audit logs** capture changes for GDPR compliance.

SQL schema (simplified):

```sql
-- Workspaces
CREATE TABLE workspaces (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  domain TEXT UNIQUE,
  branding JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User roles within a workspace
CREATE TABLE user_roles (
  id UUID PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id),
  user_id UUID REFERENCES users(id),
  role TEXT CHECK (role IN ('Owner','Colaborador','Cliente')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clients managed by professionals
CREATE TABLE clients (
  id UUID PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id),
  created_by UUID REFERENCES users(id),
  name TEXT,
  email TEXT,
  health_data JSONB,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Events / Bookings
CREATE TABLE bookings (
  id UUID PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id),
  organizer_id UUID REFERENCES users(id),
  client_ids UUID[],
  title TEXT,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  location JSONB,  -- in-person or online link
  status TEXT CHECK (status IN ('booked','cancelled','completed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workout Programs & Logs
CREATE TABLE workout_programs (
  id UUID PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id),
  name TEXT,
  template JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE workout_logs (
  id UUID PRIMARY KEY,
  program_id UUID REFERENCES workout_programs(id),
  client_id UUID REFERENCES clients(id),
  log JSONB,
  logged_at TIMESTAMPTZ DEFAULT NOW()
);

-- Nutrition Plans
CREATE TABLE meal_plans (
  id UUID PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id),
  client_id UUID REFERENCES clients(id),
  plan JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Forms & Documents
CREATE TABLE forms (
  id UUID PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id),
  name TEXT,
  schema JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE form_submissions (
  id UUID PRIMARY KEY,
  form_id UUID REFERENCES forms(id),
  client_id UUID REFERENCES clients(id),
  answers JSONB,
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat Messages
CREATE TABLE messages (
  id UUID PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id),
  sender_id UUID REFERENCES users(id),
  recipient_id UUID REFERENCES users(id),
  content TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Subscriptions & Payments
CREATE TABLE stripe_accounts (
  id UUID PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id),
  stripe_account_id TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id),
  stripe_subscription_id TEXT,
  status TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Automations & Logs
CREATE TABLE automations (
  id UUID PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id),
  trigger JSONB,
  action JSONB,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id),
  user_id UUID REFERENCES users(id),
  table_name TEXT,
  record_id UUID,
  change JSONB,
  changed_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 4. API Design and Endpoints

Approach:
- **RESTful API**, versioned under `/api/v1/`.
- **JWT** issued by Supabase Auth for user identity.
- **RBAC** middleware checks roles on every request.

Key endpoints:
- Authentication (handled by Supabase):
  - POST `/auth/signup` (signup via Supabase)
  - POST `/auth/login`
- Workspace management:
  - GET `/api/v1/workspaces` (list)
  - POST `/api/v1/workspaces` (create)
  - GET `/api/v1/workspaces/{id}` (details)
- Users & Roles:
  - GET `/api/v1/users` (workspace users)
  - POST `/api/v1/users` (invite user)
  - PUT `/api/v1/users/{id}/role`
- Clients (CRM):
  - GET `/api/v1/clients`
  - POST `/api/v1/clients`
  - GET `/api/v1/clients/{id}`
  - PUT `/api/v1/clients/{id}`
  - DELETE `/api/v1/clients/{id}`
- Bookings & Calendar:
  - GET `/api/v1/bookings?view=week`
  - POST `/api/v1/bookings`
  - PUT `/api/v1/bookings/{id}`
  - DELETE `/api/v1/bookings/{id}`
- Workouts & Nutrition:
  - CRUD endpoints under `/api/v1/workouts` and `/api/v1/nutrition`
- Chat:
  - GET `/api/v1/messages?peer={userId}`
  - POST `/api/v1/messages`
- Payments:
  - POST `/api/v1/payments/connect` (connect Stripe)
  - GET `/api/v1/payments/subscriptions`
- Automations:
  - GET `/api/v1/automations`
  - POST `/api/v1/automations`
- Reporting:
  - GET `/api/v1/reports/kpis`
  - POST `/api/v1/reports/export`

## 5. Hosting Solutions

- **Backend (FastAPI)** on **AWS Elastic Container Service (ECS)** behind an **Application Load Balancer (ALB)**.
- **Database** on **Supabase** (managed Postgres).
- **Storage** on **Supabase Storage** (S3-compatible).

Benefits:
- **Reliability**: Managed services (Supabase, ECS) reduce operational overhead.
- **Scalability**: ECS auto-scaling policies, managed Postgres can scale vertically.
- **Cost-effectiveness**: Pay-as-you-go pricing from AWS and Supabase.

## 6. Infrastructure Components

- **Load Balancer (ALB)**: Distributes incoming HTTP(S) requests to FastAPI containers.
- **Redis (ElastiCache)**: Broker for Celery tasks and caching layer for sessions, calendar data, and repeated lookups.
- **Celery Workers**: Separate clusters for emails/notifications, payments/webhooks, content processing, automations.
- **CDN (optional)**: CloudFront in front of Supabase Storage if global video delivery needs speed.
- **SSL/TLS**: Managed certs via AWS Certificate Manager to secure all traffic.

## 7. Security Measures

- **Authentication & Authorization**:
  - Supabase Auth issues JWTs.
  - FastAPI dependencies enforce JWT validation.
  - **Role-based access control** checks `user_roles` for every endpoint.
- **Data protection**:
  - **TLS** for all data in transit.
  - **Encryption at rest** by Supabase and AWS.
  - **Row-level security** in Postgres to isolate tenant data.
- **GDPR compliance**:
  - Explicit consent fields in user profiles.
  - Audit logs of data changes.
  - Endpoints for data export and deletion.
- **Webhooks**:
  - Verified via Stripe signing secrets.
  - Rate-limited and queued through Celery.

## 8. Monitoring and Maintenance

- **Logging**: Structured logs from FastAPI (JSON) to AWS CloudWatch.
- **Metrics**: Prometheus exporter on FastAPI for latency, error rates; Grafana dashboards.
- **Error tracking**: Sentry integration for uncaught exceptions.
- **Celery monitoring**: Flower dashboard to watch queues and task failures.
- **Health checks**: `/health` endpoint for load balancer.
- **Maintenance**:
  - **CI/CD pipeline** on GitHub Actions: lint, test, build Docker, deploy to ECS.
  - **Database migrations** via Alembic automatically applied on deploy.
  - Regular dependency updates and security patch reviews.

## 9. Conclusion and Overall Backend Summary

In FitPro Hub’s backend, we blend **FastAPI**, **PostgreSQL (Supabase)**, and **Celery/Redis** to deliver a scalable, secure, and maintainable system for fitness professionals. Our multi-tenant design with RLS keeps each workspace’s data private, while modular APIs cover everything from client management and scheduling to payments and automations.

Key strengths:
- Clear **modular architecture** that teams can develop and scale independently.
- Robust **security and compliance** measures (GDPR, RLS, encrypted communication).
- **Managed hosting** on ECS and Supabase simplifies operations.
- **Background processing** via Celery isolates heavy tasks.

This setup ensures that FitPro Hub can grow with its users, maintain high performance under load, and adapt quickly to new feature requirements.