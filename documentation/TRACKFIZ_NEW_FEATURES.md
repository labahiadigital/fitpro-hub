# Trackfiz - Nuevas Funcionalidades a Implementar

## Documento extraído de requisitos de E13 Fitness / Borja Sanfelix

**Fecha:** Enero 2026  
**Estado:** Planificación

---

## 📋 Tareas Identificadas para Trackfiz

### 1. 💳 INTEGRACIÓN CON REDSYS
**Prioridad:** Alta  
**Estado:** ⬜ Pendiente

Integrar pasarela de pago española Redsys además de Stripe.

**Requisitos:**
- [ ] Configurar credenciales Redsys (merchant code, secret key, terminal)
- [ ] Implementar endpoint de pago Redsys
- [ ] Implementar webhook de notificación
- [ ] Soporte para pagos únicos y recurrentes
- [ ] Interfaz de selección de método de pago (Stripe/Redsys)

---

### 2. 💊 BIBLIOTECA DE SUPLEMENTACIÓN
**Prioridad:** Alta  
**Estado:** ⬜ Pendiente

Crear biblioteca pública de suplementos con sistema de referidos.

**Requisitos:**
- [ ] Modelo de datos para suplementos (nombre, descripción, marca, enlace, imagen)
- [ ] Campo para código/enlace de referido por entrenador
- [ ] Asignación de suplementos a planes nutricionales
- [ ] Gestión de comisiones por referido
- [ ] Panel de administración de suplementos

**Modelo de negocio:**
- Trackfiz cobra % a la empresa de suplementos
- Se liquida otro % al entrenador que refiere
- Cualquier entrenador puede referir marcas

---

### 3. 🚨 SISTEMA DE INTOLERANCIAS Y ALERGIAS
**Prioridad:** Alta  
**Estado:** ⬜ Pendiente

Los alimentos a los que el cliente es intolerante o alérgico deben mostrarse en ROJO.

**Requisitos:**
- [ ] Campo de intolerancias/alergias en ficha de cliente
- [ ] Mapeo de alergias con alimentos de la base de datos
- [ ] Destacar en rojo alimentos problemáticos en planes nutricionales
- [ ] Alerta visual al asignar alimentos con intolerancias
- [ ] Sección visible en ficha de cliente: "Lesiones e intolerancias/alergias"

---

### 4. 📄 GENERACIÓN DE PDF
**Prioridad:** Alta  
**Estado:** ⬜ Pendiente

Generar PDF con dieta y plan de entrenamiento.

**Requisitos:**
- [ ] Botón "Exportar a PDF" en plan nutricional
- [ ] Botón "Exportar a PDF" en plan de entrenamiento
- [ ] Diseño profesional con branding del workspace
- [ ] **ALERTA IMPORTANTE**: Incluir aviso de revisar que el PDF no contenga alimentos con intolerancias/alergias
- [ ] Opción de enviar PDF por email al cliente

---

### 5. ✏️ NOMBRES DE COMIDAS EDITABLES
**Prioridad:** Media  
**Estado:** ⬜ Pendiente

El cliente puede editar el nombre de cada comida (Comida 1, Comida 2 → Desayuno, Almuerzo, etc.)

**Requisitos:**
- [ ] Campo editable para nombre de comida
- [ ] Valores por defecto: Comida 1, Comida 2, Comida 3...
- [ ] Guardar nombres personalizados por cliente
- [ ] Reflejar nombres en PDF generado

---

### 6. 📥 BANDEJA DE ENTRADA INTEGRADA
**Prioridad:** Media  
**Estado:** ⬜ Pendiente

Integrar bandeja de entrada como apartado inferior al Chat.

**Requisitos:**
- [ ] Sección "Bandeja de entrada" debajo de Chat en menú
- [ ] Mostrar mensajes/notificaciones pendientes
- [ ] Filtros por tipo de mensaje
- [ ] Marcar como leído/no leído

---

### 7. 🔒 CHAT HABILITADO/DESHABILITADO POR CLIENTE
**Prioridad:** Media  
**Estado:** ⬜ Pendiente

Poder habilitar o deshabilitar chat por cliente individual.

**Requisitos:**
- [ ] Toggle en ficha de cliente "Chat habilitado"
- [ ] Si deshabilitado, cliente no puede enviar mensajes
- [ ] Mensaje informativo para cliente con chat deshabilitado
- [ ] Opción de habilitar/deshabilitar en masa

---

### 8. 🎬 VIDEOS DE EJECUCIÓN EN EJERCICIOS
**Prioridad:** Media  
**Estado:** ⬜ Pendiente

Añadir video de renderización de ejecución correcta del ejercicio.

**Requisitos:**
- [ ] Campo de video en modelo de ejercicio
- [ ] Reproductor de video en detalle de ejercicio
- [ ] Soporte para videos de Supabase Storage o URLs externas
- [ ] Thumbnail del video en lista de ejercicios

---

### 9. ℹ️ TOOLTIPS INFORMATIVOS
**Prioridad:** Baja  
**Estado:** ⬜ Pendiente

Añadir icono "i" pequeña al lado de acrónimos o palabras no conocidas.

**Requisitos:**
- [ ] Componente Tooltip reutilizable
- [ ] Añadir tooltips a: RPE, RM, MRR, ARPA, etc.
- [ ] Diccionario de términos fitness/negocio
- [ ] Estilo consistente con diseño Trackfiz

---

### 10. 👥 GESTIÓN DE EQUIPO: ROLES PERSONALIZADOS
**Prioridad:** Alta  
**Estado:** ⬜ Pendiente

Configurar roles personalizados para el equipo.

**Requisitos:**
- [ ] Crear roles personalizados además de owner/collaborator/client
- [ ] Definir permisos granulares por módulo
- [ ] Asignar roles a miembros del equipo
- [ ] Interfaz de gestión de roles

---

### 11. 📝 CRM: CAMPOS EDITABLES Y AGRUPABLES
**Prioridad:** Media  
**Estado:** ⬜ Pendiente

Poder editar orden de campos y poder agrupar campos (visualización editable por parte del entrenador personal).

**Requisitos:**
- [ ] Drag & drop para reordenar campos en ficha cliente
- [ ] Crear grupos/secciones de campos
- [ ] Guardar configuración por workspace
- [ ] Campos personalizados adicionales

---

### 12. 📋 FICHA DE CLIENTE MEJORADA
**Prioridad:** Alta  
**Estado:** ⬜ Pendiente

Ficha de cliente con apartados completos.

**Requisitos:**
- [ ] **Plan nutricional**: Ver plan actual asignado
- [ ] **Documentos enviados y recibidos**: Lista de PDFs, formularios
- [ ] **Formularios**: Estado de formularios pendientes/completados
- [ ] **Lesiones e intolerancias/alergias**: Sección dedicada
- [ ] **Fotografías**: Poder subir evolución en fotografías (antes/después)

---

## 🔮 Funcionalidades Futuras (Roadmap)

### Modelos de Negocio / Servicios Adicionales
- Descuentos en Inversure.com para clientes Trackfiz
- Descuentos en Elitetrece.com
- Seguros RC para entrenadores
- Planes por suscripción tipo Harbiz
- Servicio tipo Bejao (app a medida)
- Productora de contenido y gestión de marketing
- Referidos multinivel de suplementos
- Referidos de gimnasios, centros de salud
- Referidos de equipamiento deportivo o wearables

### Funcionalidades Técnicas Futuras
- Clases online en vivo
- App móvil nativa personalizada
- IA para generación de planes
- Integración con wearables

---

## 📊 Priorización de Implementación

### Fase 1 - Crítico (Sprint 1-2)
1. ✅ Renombrar FitPro Hub → Trackfiz
2. ⬜ Sistema de intolerancias/alergias (seguridad del cliente)
3. ⬜ Generación de PDF
4. ⬜ Integración Redsys

### Fase 2 - Alta Prioridad (Sprint 3-4)
5. ⬜ Biblioteca de suplementación
6. ⬜ Ficha de cliente mejorada
7. ⬜ Gestión de roles personalizados

### Fase 3 - Media Prioridad (Sprint 5-6)
8. ⬜ Nombres de comidas editables
9. ⬜ Bandeja de entrada
10. ⬜ Chat habilitado/deshabilitado
11. ⬜ Videos de ejecución

### Fase 4 - Mejoras UX (Sprint 7+)
12. ⬜ Tooltips informativos
13. ⬜ CRM campos editables
14. ⬜ Mejoras visuales adicionales

---

*Documento generado: Enero 2026*
*Basado en requisitos de E13 Fitness / Borja Sanfelix*
