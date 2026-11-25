# Tasks

## 1. Fundamentos y datos

- [x] 1.1 Confirmar Vercel + Supabase como destino; documentar Functions, PostgreSQL, HTTPS y las opciones de copia automática o exportación manual según el plan, dejando el dominio propio para la publicación.
- [x] 1.2 Preparar la estructura del cliente web y la API; verificar que ambos arrancan localmente y que la comprobación de salud de la API responde correctamente.
- [x] 1.3 Crear migraciones y datos iniciales para los cinco perfiles y las tablas de cuidados; verificar una instalación limpia, claves foráneas y documentación legible del esquema.

## 2. Cuentas y permisos

- [x] 2.1 Implementar activación por código de un solo uso y contraseñas individuales almacenadas como hashes; verificar activación válida, reutilización rechazada y autenticación correcta.
- [x] 2.2 Aplicar permisos en la API para Marcos, los perfiles familiares e Invitado; verificar que las pruebas permiten las acciones autorizadas y rechazan cambios de configuración y borrado de historial por Invitado.
- [x] 2.3 Implementar selección de perfil, inicio de sesión y pregunta móvil/PC en cada sesión; verificar el orden perfil, contraseña, dispositivo y acceso a la app.

## 3. Cuidados y registros

- [x] 3.1 Implementar gestión de horarios de alimentación, medicación y tareas extra, incluida la vista diaria y la sección de medicación; verificar operaciones y casos límite con pruebas de API.
- [x] 3.2 Implementar calendario veterinario y notas compartidas con sus permisos correspondientes; verificar altas y consultas desde perfiles familiares y lectura permitida a Invitado en el calendario.
- [x] 3.3 Implementar registros de finalización con perfil y hora; verificar que el historial persiste, se comparte entre perfiles y no modifica los horarios planificados.
- [x] 3.4 Documentar los flujos de cuidados y el modelo de datos; verificar que los pasos documentados coinciden con la app y las migraciones.

## 4. Interfaz web

- [ ] 4.1 Crear la pantalla de perfiles y los flujos de activación y contraseña; verificar navegación y validaciones en pruebas de interfaz.
- [ ] 4.2 Crear las vistas de alimentación, medicación, tareas, calendario e historial con presentación móvil y PC; verificar que cada módulo cumple sus escenarios de especificación.
- [ ] 4.3 Añadir notas y controles de administración visibles solo para perfiles autorizados; verificar que la interfaz refleja los permisos de la API y se adapta a ambos tamaños de pantalla.

## 5. Integración y publicación

- [ ] 5.1 Ejecutar pruebas de extremo a extremo con los cinco perfiles; verificar activación, permisos, registro de cuidados y persistencia de datos compartidos.
- [ ] 5.2 Decidir con Marcos si usar un dominio propio o los dominios del proveedor; desplegar cliente, API y base de datos; verificar acceso HTTPS desde móvil y PC, sincronización entre dispositivos y restauración de una copia de seguridad.
