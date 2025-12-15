# Documento de Tech Stack para FitPro Hub

Este documento explica de forma clara y sencilla las tecnologías elegidas para construir **FitPro Hub**, una plataforma SaaS multi-tenant dirigida a profesionales de fitness, wellness y salud, así como a sus clientes finales. Cada sección detalla por qué y cómo cada herramienta contribuye a la experiencia profesional y al funcionamiento robusto de la aplicación.

## 1. Tecnologías de Frontend
En el lado del usuario (lo que ve el profesional y el cliente), hemos elegido tecnologías modernas que garantizan rapidez, interactividad y una apariencia profesional.

- **React + Vite**  
  Framework ligero y rápido para construir interfaces reactivas. Vite acelera el arranque y la recarga en caliente, para que el desarrollo sea más ágil.

- **TanStack Query**  
  Biblioteca para gestionar las llamadas al servidor (fetching) y el almacenamiento en caché, de forma que la información siempre esté actualizada sin recargar toda la página.

- **TanStack Table**  
  Herramienta especializada en mostrar tablas de datos (clientes, sesiones, ingresos) con filtros y paginación, ofreciendo búsquedas y ordenación muy fluida.

- **TanStack Router / React Router**  
  Sistemas de enrutado para definir las distintas vistas (dashboard, calendario, clientes) y facilitar la navegación interna.

- **React Hook Form + Zod**  
  Formulario dinámico y validado: React Hook Form gestiona el estado, y Zod valida la información (por ejemplo, campos obligatorios, formatos) antes de enviarla al servidor.

- **MUI y Mantine**  
  Bibliotecas de componentes visuales (botones, tablas, modales) con estilos consistentes y personalizables. Permiten aplicar el branding de cada cliente (colores, tipografías) de forma sencilla.

- **Aplicación Nativa (iOS/Android)**  
  Usaremos React Native o un framework similar para brindar una experiencia móvil fluida y aprovechar notificaciones nativas y acceso offline parcial.

Cómo mejora la experiencia:
- Carga rápida y actualizaciones parciales sin recargar toda la página.
- Formularios amables y validaciones en tiempo real.
- Tablas y calendarios con filtros avanzados.
- Interfaz coherente y personalizable para cada workspace.

## 2. Tecnologías de Backend y Almacenamiento
El servidor y la base de datos están diseñados para ser seguros, escalables y fáciles de mantener.

- **FastAPI**  
  Framework en Python que nos permite definir rutas de API de forma muy clara, con validación automática de datos y generación de documentación.

- **PostgreSQL (Supabase Postgres)**  
  Base de datos relacional robusta. Usamos un único esquema con Row-Level Security (RLS) para aislar los datos de cada workspace, garantizando que un profesional solo vea su propia información.

- **SQLAlchemy 2.x + Alembic**  
  ORM para mapear tablas de la base de datos a objetos Python, y Alembic para gestionar versiones de la base de datos (migraciones) de forma ordenada.

- **Supabase Storage (o S3-compatible)**  
  Almacenamiento de archivos (vídeos, imágenes, documentos) con enlaces protegidos. Simplifica subir y descargar contenido multimedia.

- **Supabase Auth**  
  Servicio de autenticación con email/contraseña, magic links y preparación para OAuth. Gestiona tokens JWT que incluyen el identificador de workspace y el rol del usuario.

- **Celery + Redis + Celery Beat**  
  Sistema de tareas en segundo plano para:
  - Envío de emails y notificaciones push.  
  - Procesamiento de webhooks de Stripe (pagos y suscripciones).  
  - Ejecución de workflows automatizados (recordatorios, onboarding, reactivación).  
  - Generación de informes programados.

Cómo trabajan juntos:
- FastAPI recibe peticiones del frontend y aplica la lógica de negocio.  
- SQLAlchemy interactúa con PostgreSQL, donde RLS impide accesos indebidos.  
- Celery gestiona tareas que no requieren respuesta inmediata, liberando el servidor principal.

## 3. Infraestructura y Despliegue
Para garantizar alta disponibilidad, escalabilidad y facilidad de desarrollo continuo, utilizamos:

- **Supabase**  
  Plataforma All-In-One que aloja la base de datos, el almacenamiento y la autenticación.

- **Contenedores Docker**  
  Empaquetamos el backend en contenedores, garantizando entornos reproducibles en desarrollo, pruebas y producción.

- **GitHub + GitHub Actions**  
  Repositorio de código con control de versiones y pipeline de CI/CD que ejecuta pruebas, linting y despliega automáticamente a entornos de staging y producción.

- **Proveedor Cloud (AWS / GCP / Azure)**  
  Hospedaje de contenedores y servicios complementarios (p. ej., Redis en un servicio gestionado), con escalado automático según demanda.

- **Observabilidad y Monitorización**  
  - Logs estructurados de backend y Celery.  
  - Alertas de fallos de jobs y errores 5xx.  
  - Métricas de rendimiento para escalar recursos a tiempo.

## 4. Integraciones de Terceros
Para enriquecer la plataforma sin reinventar la rueda:

- **Stripe**  
  Procesamiento de pagos, suscripciones, bonos y productos. Webhooks para actualizar estados de cobro e ingresos.

- **Brevo (anteriormente Sendinblue)**  
  Envío de emails transaccionales y secuencias automatizadas (onboarding, recordatorios, follow-ups).

- **WhatsApp (Deep Link)**  
  Botón que abre directamente la conversación en WhatsApp para soporte o contacto rápido.

- **Facebook Pixel y Google Ads**  
  Etiquetas de tracking en el frontend para medir campañas de marketing y conversión (opcional).

## 5. Seguridad y Consideraciones de Rendimiento

Seguridad:
- **GDPR**  
  Consentimientos explícitos, derechos de acceso/eliminación, portabilidad de datos.
- **Encriptación**  
  Datos cifrados en tránsito (TLS) y en reposo (PGP / cifrado nativo del proveedor).
- **Roles y Permisos (RBAC + RLS)**  
  Acceso controlado según rol (propietario, colaborador, cliente) y workspace.
- **Logs de auditoría**  
  Registro de accesos y cambios críticos para trazabilidad.

Rendimiento:
- **Caché y Fetching inteligente**  
  TanStack Query evita recargas innecesarias y mantiene la UI reactiva.
- **Colas separadas**  
  Diferentes workers de Celery para no saturar un único canal de procesamiento.
- **Optimización de consultas**  
  Índices en PostgreSQL, paginación en tablas y uso de vistas materializadas si es necesario.
- **CDN para assets estáticos**  
  (opcional) Distribución de imágenes y archivos estáticos en redes globales si crece el volumen.

## 6. Conclusión y Resumen General
FitPro Hub combina un **frontend moderno y ágil** con un **backend robusto** y un **modelo de despliegue escalable**. Cada tecnología se ha escogido para:

- **Asegurar una experiencia profesional**: interfaces rápidas, formularios y tablas intuitivas.
- **Garantizar la privacidad y el aislamiento de datos**: RLS, cifrado y cumplimiento GDPR.
- **Permitir el crecimiento**: CI/CD automatizado, contenedores, escalado automático y colas de trabajo.
- **Integrar servicios clave** sin complejidad interna: Stripe para pagos, Brevo para emails y Supabase para la base de datos.

Con este stack, FitPro Hub cumple los requisitos de operativa diaria, atención al cliente y análisis de negocio, al tiempo que ofrece posibilidades de evolución (white-label, streaming avanzado, nuevas integraciones) sin grandes reescrituras.