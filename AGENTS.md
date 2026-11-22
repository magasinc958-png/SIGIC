Estoy desarrollando SIGIC, Sistema de Gestión y Seguimiento de Incidencias Comunitarias para ASOCEINORT.

El proyecto ya tiene frontend React 19 + TypeScript + Vite 8 y backend Node.js + Express 5 + TypeScript. La arquitectura prevista incluye PostgreSQL + PostGIS, Prisma, bcrypt y JWT.

## Decisiones funcionales vigentes

- Solo tres perfiles pueden autenticarse: Residente, Administracion y Directiva.
- Personal Operativo no tiene cuenta de Usuario, no inicia sesion y no tiene dashboard ni rutas de acceso propias.
- Personal Operativo es una entidad administrativa independiente con `id_operativo`, `id_area`, `nombre`, `telefono`, `turno` y `activo`.
- La Administracion gestiona al personal operativo, las asignaciones y el registro de avances o resoluciones.
- El historial debe identificar al Usuario autenticado que registra la accion y al trabajador involucrado cuando corresponda.
- Las incidencias pueden asignarse a un area y opcionalmente a un trabajador; las asignaciones deben conservar responsable administrativo y vigencia.

El diseño oficial está en Figma:
https://www.figma.com/design/OjAfinqHMLED4Q0h3I6E3S/SIGIC-%E2%80%94-Plataforma-Web-Responsiva--copia-?node-id=0-1

IMPORTANTE: Trabajaremos únicamente con la página 'SIGIC — Prototipo responsivo'. Debe convertirse en una única plataforma web responsive adaptable a escritorio, tablet y móvil. NO trabajaremos con la página 'SIGIC — Vistas móviles'.

Existen tres perfiles autenticables: Residente, Administración y Directiva. Personal Operativo es una entidad administrativa sin cuenta ni acceso a la plataforma. La selección visual del perfil no otorga permisos; el backend debe verificar los roles reales.

Primera fase: selección de perfiles e inicio de sesión, siguiendo fielmente Figma. No instalar librerías innecesarias ni reemplazar la arquitectura existente.

Primero revisa el repositorio actual y prepara un archivo AGENTS.md con este contexto y las convenciones del proyecto. No implementes funcionalidades todavía; presenta tu evaluación y los pasos propuestos.
