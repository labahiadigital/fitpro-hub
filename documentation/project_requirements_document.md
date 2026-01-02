# Project Requirements Document (PRD)

**Project Name:** Trackfiz\
**Type:** SaaS multi-tenant web dashboard + native mobile app for fitness, wellness, and health professionals

## 1. Project Overview

Trackfiz is a Software-as-a-Service platform tailored for fitness professionals (personal trainers, yoga/pilates instructors, physiotherapists, nutritionists) and small studios or centers with multiple collaborators. Its purpose is to centralize client data, streamline daily operations, automate routine tasks (like reminders and billing), and provide clear analytics on client progress and revenue. Professionals get a polished web dashboard to manage clients, sessions, content, chat, payments, and reporting—all under their own brand. End-clients access a native iOS/Android app or responsive web portal to view plans, book sessions, chat, and track progress.

We're building Trackfiz to solve the fragmentation many coaches face: juggling spreadsheets, messaging apps, payment tools, and manual reminders. Key objectives for version 1.0 include:

*   Launching a fully automated, multi-tenant system where each professional or center has an isolated workspace with custom branding.
*   Delivering core CRM, scheduling, content delivery, chat, payment, and reporting modules.
*   Ensuring GDPR compliance, data security (encryption in transit and at rest), and an intuitive user experience for both professionals and clients.

**Success Criteria:**

*   90% of key user flows (client onboarding, booking, workout assignment, payment) completed without errors.
*   Workspace setup time under 5 minutes.
*   95th percentile API response under 300 ms for dashboard actions.
*   GDPR-compliant data deletion/portability workflows in place.

## 2. In-Scope vs. Out-of-Scope

### In-Scope (Version 1.0)

*   Multi-tenant web dashboard for professionals/centers with custom branding (logo, colors, email templates)
*   Native mobile apps (iOS & Android) for end-clients; responsive web portal fallback
*   Client CRM: profiles, health consents, tags, full activity history
*   Calendar & bookings: daily/weekly/monthly views, self-service booking, cancellations, waitlists, multi-staff views
*   Workout builder & library: exercises, supersets, blocks, video uploads, program templates, client progress logging
*   Nutrition plans: meal creator, basic food database stub, auto-generated shopping lists, adherence tracking
*   Forms & documents: custom forms, PAR-Q onboarding, PDF uploads, status reminders
*   Chat: 1:1 and team chat with polling (no real-time presence), text/images/voice notes, broadcast messaging
*   Payments & billing: Stripe integration (subscriptions, session packages, one-time products), basic invoices, MRR/ARPA metrics, configurable refund/cancellation policies
*   Automation engine: rule-based workflows for onboarding, reminders, inactivity follow-up, renewal alerts, email/in-app templates
*   Reporting & dashboards: standard KPIs, customizable report builder, scheduled exports (CSV/Excel)
*   Background jobs: Celery + Redis + Beat for automations, reminders, report generation, Stripe webhooks

### Out-of-Scope (Future Phases)

*   Advanced e-signature for forms (beyond checkbox + timestamp)
*   Streaming/CDN for video—no transcoding or adaptive streaming initially
*   HIPAA compliance (only GDPR covered)
*   White-label native app publishing to App Stores per workspace
*   Advanced ad-tracking backend (only pixel support front-end)
*   AI-powered coaching suggestions or exercise recognition

## 3. User Flow

**Professional / Admin Journey**

1.  Admin visits the web dashboard, signs up with email or magic link, and creates a new workspace.
2.  They configure branding (upload logo, choose primary/secondary colors), connect their own Stripe account, and invite collaborators.
3.  From the dashboard, the admin adds clients (manually or via invitation link), fills in profiles (consents, tags, goals), and assigns workouts or nutrition plans.
4.  Using the calendar module, they set availability, create recurring sessions, and monitor upcoming bookings. Automations (e.g., reminders) trigger automatically.
5.  They check payments, view churn/MRR metrics, generate custom reports, and download CSV/Excel exports as needed.

**Client / End-User Journey**

1.  Client receives an invite link via email/SMS and installs the native mobile app (iOS/Android) or opens the responsive web portal.
2.  They register with email/password, accept consents, and see their personalized dashboard of upcoming sessions, assigned workouts, and meal plans.
3.  In the “Schedule” view, they book or cancel sessions within configurable policies.
4.  In the “Workouts” and “Nutrition” tabs, they follow assigned programs, log efforts or meal adherence, and upload photos or comments.
5.  They chat with the coach through in-app messaging (polling every few seconds), receive automated reminders, and can view/download invoices.

## 4. Core Features

*   **Multi-Tenant Isolation (RLS):** Single PostgreSQL schema with Row-Level Security; each record tagged by `workspace_id`.
*   **Authentication & RBAC:** Supabase Auth (email/password, magic link optional), JWT includes `workspace_id` and role (`owner`, `collaborator`, `client`). FastAPI enforces RBAC per endpoint.
*   **Client CRM:** Profile management, health consents, internal notes, tags for segmentation, full history of sessions/payments/chat.
*   **Calendar & Bookings:** 1:1 & group sessions, online/in-person, recurring events, capacity & waitlist, client self-service booking and cancellation, multi-staff filtering, automated email/push reminders (via Brevo).
*   **Workout Module:** Drag-and-drop workout builder, video/image attachments, program templates, bulk assignments, client compliance logging, customizable progress charts.
*   **Nutrition Module:** Meal plan builder, stubbed food database, auto shopping list, calendar integration, adherence tracking.
*   **Forms & Documents:** Custom form builder, PAR-Q onboarding, file uploads (PDF, images), folder permissions, status tracking, auto reminders for pending forms.
*   **Chat & Community:** 1:1 coach-client chat, team chat, broadcast/group messaging, message scheduling, polling-based refresh, WhatsApp deep-link support.
*   **Payments & Billing:** Stripe integration for subscriptions, session packages, one-time products, coupon codes; automatic charge defeats/resubmissions; basic invoice generation and export.
*   **Automation Engine:** Rule/workflow builder (on client signup, booking created, inactivity, impending renewal), email/in-app templates, bulk scheduling.
*   **Branding:** Customizable logo, brand colors, email templates per workspace.
*   **Reporting & Dashboard:** Standard KPIs (active clients, sessions, MRR/ARPA, churn), custom report builder, scheduled export to CSV/XLS, team performance metrics.
*   **Background Processing:** Celery + Redis + Beat for jobs in separate queues (notifications, payments/webhooks, automations, reports).

## 5. Tech Stack & Tools

### Frontend

*   **Web Dashboard:** React + Vite

    *   State & Data Fetching: TanStack Query
    *   UI Components: MUI or Mantine
    *   Tables: TanStack Table
    *   Forms & Validation: React Hook Form + Zod
    *   Routing: TanStack Router or React Router

*   **Mobile Apps:** React Native (iOS & Android)

### Backend & Storage

*   **API:** Python FastAPI
*   **Database:** Supabase Postgres (PostgreSQL) with Row-Level Security
*   **ORM & Migrations:** SQLAlchemy 2.x + Alembic
*   **Storage:** Supabase Storage (S3-compatible) for videos/images/documents
*   **Auth:** Supabase Auth (email/password, JWT tokens)
*   **Email & Notifications:** Brevo (formerly Sendinblue) for transactional emails; push notifications prepared but optional
*   **Background Jobs:** Celery + Redis + Celery Beat
*   **Payments:** Stripe (subscriptions, one-time charges, webhooks)
*   **Tracking (Optional):** Facebook Pixel / Google Ads on frontend

## 6. Non-Functional Requirements

*   **Performance:**

    *   API 95th percentile < 300 ms
    *   Page render < 1 s on authenticated dashboard

*   **Scalability:**

    *   Single DB with RLS supports thousands of workspaces
    *   Celery worker autoscaling for high job volume

*   **Security & Compliance:**

    *   GDPR: explicit consents, right to access/erase, data portability
    *   Encryption TLS in transit, AES-256 at rest
    *   Audit logs for access and modifications

*   **Availability:**

    *   99.9% uptime SLA for API and dashboard
    *   Retry logic/idempotency for Stripe webhooks

*   **Usability:**

    *   Intuitive dashboard and mobile UI
    *   Accessibility basics (ARIA labels, keyboard nav)

## 7. Constraints & Assumptions

*   **Row-Level Security:** Using single schema + RLS simplifies migrations but requires careful policy definitions.
*   **GDPR Only:** No HIPAA compliance initially unless U.S. expansion requires it.
*   **Native Mobile Only:** No PWA fallback for clients beyond responsive portal.
*   **Video Delivery:** Direct download/play from storage; no CDN or transcoding initially.
*   **Stripe Integration:** Each workspace connects its own Stripe account; invoicing kept basic.
*   **Polling Chat:** Acceptable delay for message refresh; no WebSockets.
*   **Styling:** We’ll propose a base theme for branding in absence of user-provided style guide.

## 8. Known Issues & Potential Pitfalls

*   **RLS Complexity:** Misconfigured policies can block data. Mitigation: write tests per role and table.
*   **Stripe Webhook Idempotency:** Duplicate events must be handled. Use idempotency keys and track webhook IDs.
*   **Celery Job Backlog:** High email or report volume could delay tasks. Mitigation: separate queues and autoscale workers.
*   **GDPR Data Deletion:** Cascading deletes across tables need careful design. Provide soft-delete flags and archive.
*   **Video File Sizes:** Direct downloads may strain mobile bandwidth. Consider future CDN or streaming if user complaints arise.
*   **Polling Overhead:** Polling chat every few seconds adds load. Throttle frequency or implement exponential back-off if idle.
*   **Multi-Tenant Upgrades:** Schema migrations require downtime planning; use feature flags and blue-green deploys.
*   **Custom Branding Conflicts:** Poor color combinations can hurt UX. Provide default accessible palettes.

This document defines Trackfiz's scope, workflows, core modules, and technical constraints in clear, everyday English. It serves as the foundation for all downstream technical designs: architecture diagrams, database schemas, API specs, UI mockups, and developer guidelines.
