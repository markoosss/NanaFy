# Base de datos

La app usa PostgreSQL mediante Supabase. Las migraciones versionadas de `migrations/` definen el esquema; `seed.sql` crea los cinco perfiles iniciales solo si todavía no existen. Las contraseñas y los códigos de activación no se incluyen en el seed.

## Tablas

- `profiles`: identidad, nombre visible, rol y estado de activación de cada perfil.
- `activation_codes`: hash del código de un solo uso, perfil destinatario, vencimiento y estado de uso o revocación.
- `feeding_schedules`: toma, porción opcional, día de la semana y hora.
- `medication_schedules`: medicamento, instrucciones y fechas de vigencia.
- `medication_schedule_times`: días y horas de cada medicamento.
- `care_tasks`: tareas recurrentes, como limpiar el arenero o cambiar el agua.
- `calendar_events`: citas veterinarias, revisiones y otras fechas.
- `notes`: apuntes compartidos, con autor y fecha de creación.
- `care_completions`: actividad completada, día, hora y perfil que la registró.

Las claves foráneas preservan las relaciones; las restricciones impiden perfiles administradores que no sean Marcos, códigos activos duplicados y más de un registro de finalización diario para la misma actividad.

## Seguridad y desarrollo local

Todas las tablas tienen Row Level Security activado y no exponen políticas de lectura o escritura al cliente. La API del servidor debe autenticar al perfil y verificar sus permisos antes de usar la clave de servicio de Supabase; esa clave nunca debe llegar al navegador.

Con Docker instalado, ejecuta `npx supabase start` y luego `npx supabase db reset` para crear la base local, aplicar migraciones y cargar los perfiles iniciales. `db reset` elimina y recrea la base local; no lo uses contra datos de producción.
