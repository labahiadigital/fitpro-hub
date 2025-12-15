# FitPro Hub - App Flow Document

## Onboarding and Sign-In/Sign-Up

Cuando un profesional o centro descubre FitPro Hub accede primero a la página de presentación en la que se explica la propuesta de valor y las características clave. Desde esa página puede registrarse como nuevo usuario profesional usando un formulario con correo electrónico y contraseña. Al completar los datos básicos y aceptar los términos de servicio y la política de privacidad, se crea automáticamente un nuevo workspace al que se asigna el rol de Propietario. Tras el registro inicial, el sistema envía un correo de verificación para confirmar la cuenta.

Los colaboradores invitados por el Propietario reciben un correo con un enlace de invitación para unirse al mismo workspace. Al abrir el enlace, completan un formulario de registro y aceptan las políticas específicas del espacio de trabajo. Una vez dentro, su rol se limita a las acciones operativas de gestión diaria.

Para los clientes finales, el profesional envía una invitación mediante un enlace o correo automático generado en la sección de clientes. Al seguir ese enlace, el cliente descarga la aplicación nativa en iOS o Android, crea su cuenta introduciendo correo y contraseña, acepta el consentimiento GDPR y completa el breve formulario de datos personales y objetivos. No se requiere firma electrónica avanzada, basta con un checkbox y sello de tiempo.

El inicio de sesión tanto en la web profesional como en la app móvil se hace con correo y contraseña. Existe la opción de magic link preparada para activarse en el futuro. En caso de olvidar la contraseña, el usuario solicita un enlace de restablecimiento que llega por correo y le permite establecer una nueva contraseña. Cerrar sesión es tan sencillo como pulsar el botón de logout en el menú principal.

## Main Dashboard or Home Page

Al acceder por primera vez tras el registro o inicio de sesión, el Propietario llega al Dashboard principal. En esta vista aparecen tarjetas con indicadores clave de clientes activos, sesiones próximas, ingresos del mes y tareas pendientes. Un menú lateral fija las secciones del sistema: Clientes, Agenda, Programas de Entrenamiento, Planes de Nutrición, Formularios y Documentos, Chat, Pagos y Suscripciones, Automatizaciones, Reportes y Configuración.

La cabecera muestra el nombre y logo del workspace, un selector de idioma y un acceso rápido al perfil de usuario. Desde el menú lateral el usuario puede moverse a cualquier sección, mientras que un botón flotante en la esquina permite crear rápidamente nuevas entidades según el contexto: cliente, evento de calendario, programa o formulario.

En la app nativa de clientes, al iniciar sesión aparece un Home sencillo que resalta las próximas sesiones reservadas, las tareas programadas (ejercicios y comidas) y un acceso directo al chat con su entrenador.

## Detailed Feature Flows and Page Transitions

En la sección de Clientes, el usuario ve una tabla con buscador y filtros por etiquetas. Al hacer clic en un nombre, abre la ficha del cliente con pestañas para Datos Personales, Historial de Sesiones, Formularios Completados y Progreso. Desde ahí el profesional puede editar información, asignar etiquetas, enviar invitaciones, lanzar secuencias de onboarding o iniciar un chat.

La Agenda muestra vistas diaria, semanal y mensual. Al cambiar entre ellas, la interfaz redibuja los eventos en un calendario interactivo. Crear un evento abre una ventana modal donde se elige tipo (1:1 o grupal), modalidad (presencial u online), recurrencia, aforo y lista de espera. Tras guardar, las notificaciones automáticas se programan en segundo plano.

En Programas de Entrenamiento el usuario accede a un constructor visual de rutinas. Puede arrastrar ejercicios, definir series y repeticiones, agrupar bloques y guardar la plantilla. Al asignar un programa, se seleccionan clientes individuales o grupos y se decide el periodo de validez. Dentro del perfil del cliente, el profesional revisa el reporte de esfuerzo y adjuntos enviados por el cliente.

El módulo de Planes de Nutrición ofrece un editor de comidas con alimentos predefinidos o añadidos manualmente. A partir del plan, el sistema genera automáticamente la lista de la compra. Al asignar el plan, queda visible en el calendario del cliente y registra su adherencia diaria.

En Formularios y Documentos, el profesional crea plantillas personalizables que incluye PAR-Q en el onboarding. Al enviar un formulario, el cliente recibe un recordatorio y completa las respuestas desde la app. Las respuestas aparecen en la sección de Formularios con posibilidad de descargar el PDF o archivarlo.

El Chat central agrupa conversaciones 1:1 y chats de equipo o comunidad. Al seleccionar un hilo, la pantalla muestra mensajes con texto, imágenes y notas de voz. La aplicación realiza polling cada pocos segundos para traer mensajes nuevos. También hay opciones para mensajes masivos y programados.

En Pagos y Suscripciones el usuario configura su cuenta de Stripe y define los niveles de suscripción, bonos de sesiones o productos puntuales. La sección muestra el estado de cobros, MRR, churn y facturas pendientes. Las webhooks de Stripe llegan a la API y disparan tareas que actualizan el estado de la suscripción.

La sección de Automatizaciones permite definir reglas basadas en eventos como alta de cliente, reserva creada o inactividad. El usuario elige plantillas de correo o mensaje in-app, programa la secuencia y guarda. Un editor visual muestra el flujo de acciones y permite probar o editar pasos.

En Reportes, existen métricas estándar en gráficos y una herramienta de creación de informes personalizados. El profesional elige tablas y filtros, programa exportaciones periódicas en CSV o Excel y recibe el enlace por correo.

## Settings and Account Management

Desde el menú de Configuración, el Propietario gestiona el branding del workspace subiendo logo, eligiendo esquema de colores y configurando las plantillas de correo. También puede actualizar las credenciales de Stripe o conectar nuevas pasarelas.

En la pestaña de Perfil de Usuario, cada persona edita sus datos personales, cambia su contraseña y ajusta las notificaciones por email o push. En el apartado de Suscripción aparece el estado del plan SaaS, la fecha de renovación y el historial de facturas. Si desea cancelar o modificar su plan, puede hacerlo directamente desde esa pantalla.

Al guardar cambios en cualquiera de estas secciones, el usuario regresa automáticamente al Dashboard o a la pantalla previa sin perder el contexto.

## Error States and Alternate Paths

Si el usuario introduce datos inválidos en formularios, aparece un mensaje de error junto al campo afectado que explica el problema y sugiere la corrección. En caso de pérdida de conexión la aplicación muestra un aviso de red y reintenta automáticamente al restaurar el servicio.

Cuando alguien intenta acceder a una sección restringida por rol, se despliega una pantalla de “Acceso denegado” que invita a contactar con el Propietario. Si un token expira, la app redirige al inicio de sesión y muestra un mensaje indicando que debe autenticarse de nuevo.

Si falla un cobro con Stripe, la automatización envía recordatorios de pago y alerta al profesional en la sección de Pagos. Para los jobs de Celery, cualquier error grave queda registrado en logs y dispara un correo de alerta al equipo de soporte.

## Conclusion and Overall App Journey

En su día a día el profesional inicia sesión, revisa el Dashboard para ver próximas sesiones y clientes pendientes de tareas. Desde ahí visita la ficha de clientes para ajustar planes, accede al calendario para crear o modificar eventos y en Programas y Nutrición actualiza rutinas y menús. Usa el chat para comunicarse con clientes y equipo, y la sección de Pagos para controlar sus ingresos. Las automatizaciones gestionan recordatorios y onboarding sin intervención manual. Cuando necesita ver métricas o generar un informe, entra en Reportes y programa sus exportaciones. Por último, en Configuración controla el branding, roles y facturación del workspace. Así, FitPro Hub acompaña al profesional desde el alta hasta la operativa diaria, centralizando todos los procesos en una experiencia fluida y profesional.