# SIGIC - Contexto del proyecto

Sistema de Gestión y Seguimiento de Incidencias Comunitarias para ASOCEINORT.

## Arquitectura

- Frontend: React 19, TypeScript y Vite 8.
- Backend: Node.js, Express 5, TypeScript, Prisma y PostgreSQL/PostGIS.
- Autenticación: JWT y bcrypt. No añadir frameworks ni librerías UI sin necesidad.
- Usar componentes funcionales, hooks existentes, validación con Zod y consultas Prisma tipadas.

## Estructura

### Frontend (`frontend/src`)

- `App.tsx`: composición de pantallas y navegación.
- `features/auth`, `features/resident`, `features/admin`, `features/directiva`: UI y lógica de cada perfil.
- `shared/api.ts`: cliente HTTP, contratos y llamadas a la API.
- `shared/types`: tipos compartidos entre funcionalidades.
- `main.tsx`: montaje de React y proveedores.

Mantener la lógica específica dentro de su feature; compartir solo utilidades y contratos realmente comunes. Mantener los estilos globales en los CSS existentes y no duplicar componentes sin necesidad.

### Backend (`backend/src`)

- `routes`: montaje de endpoints agrupados por área funcional.
- `middleware`: autenticación, autorización, manejo de errores y tipos de Express.
- `schemas`: validaciones Zod separadas por dominio; `schemas.ts` actúa como barrel de compatibilidad para las rutas.
- `services`: lógica compartida independiente de Express.
- `lib`: clientes e integraciones de infraestructura.
- Prisma genera su cliente en `backend/generated/prisma`; no guardar copias generadas dentro de `src`.

Mantener las rutas y contratos HTTP actuales salvo que el cambio funcional lo requiera. Validar entradas en los bordes, usar `HttpError` para errores esperados y conservar el manejo centralizado de errores.

## Reglas funcionales

- Solo Residente, Administración y Directiva tienen cuenta y pueden autenticarse.
- Personal Operativo es una entidad administrativa sin usuario, login, dashboard ni rutas propias.
- La selección visual del perfil solo orienta la navegación; nunca concede permisos.
- El backend debe validar el rol real del usuario en cada operación protegida con JWT y `authorize(...)`.
- Administración gestiona personal operativo, asignaciones y avances o resoluciones.
- Las asignaciones conservan área, trabajador opcional, responsable administrativo y vigencia.
- El historial registra al usuario autenticado y al trabajador involucrado cuando corresponda.
- Directiva accede a información de supervisión sin datos personales innecesarios.

## Diseño y responsive

- La única referencia visual de Figma es la página `SIGIC — Prototipo responsivo`:
  https://www.figma.com/design/OjAfinqHMLED4Q0h3I6E3S/SIGIC-%E2%80%94-Plataforma-Web-Responsiva--copia-?node-id=0-1
- No usar la página `SIGIC — Vistas móviles`.
- Implementar una plataforma compartida responsive para escritorio, tablet y móvil.

## Validación

- Frontend: `cd frontend && npm run build && npm run lint`
- Backend: `cd backend && npm run db:generate && npm run typecheck`
- `db:generate` y `build` requieren `DATABASE_URL` por la configuración actual de Prisma.
