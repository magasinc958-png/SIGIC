# SIGIC

Sistema de Gestión y Seguimiento de Incidencias Comunitarias para ASOCEINORT.

## Stack

- Frontend: React 19, TypeScript y Vite.
- API: Node.js, Express 5, TypeScript y REST/JSON.
- Cliente HTTP: Fetch nativo del navegador.
- Datos: PostgreSQL y Prisma ORM.
- Seguridad: JWT, bcryptjs y validación Zod.
- Mapas: React Leaflet se incorporará en la fase de mapas.
- Despliegue: Render.

La selección visual de perfil del frontend solo orienta al usuario. La API obtiene el
rol real de la cuenta autenticada desde PostgreSQL y aplica autorización en el servidor.

## Ejecutar localmente

Requisitos: Node.js 20.19+ y PostgreSQL.

1. Crea una base de datos PostgreSQL llamada `sigic`.
2. Desde `backend/`, instala dependencias y crea la configuración local:
   ```bash
   cd backend
   npm ci
   cp .env.example .env
   ```
3. Edita `backend/.env`: configura `DATABASE_URL`, un `JWT_SECRET` aleatorio de al
   menos 32 caracteres y los datos del administrador inicial. No compartas ni subas
   el `.env`.
4. Aplica la migración inicial y crea el administrador/categorías:
   ```bash
   npm run db:generate
   npm run db:migrate
   npm run db:seed
   ```
5. Inicia el backend en una terminal:
   ```bash
   npm run dev
   ```
6. Inicia el frontend en otra terminal:
   ```bash
   cd frontend
   npm ci
   npm run dev
   ```

Vite redirige `/api` al backend en `http://localhost:3000`. Para cambiar ese destino
localmente, configura `API_PROXY_TARGET`.

## Comprobar la API

Con el servidor ejecutándose, la ruta de salud debe contestar `200`:

```bash
curl -i http://localhost:3000/api/health
```

Inicia sesión con las credenciales de `BOOTSTRAP_ADMIN_EMAIL` y
`BOOTSTRAP_ADMIN_PASSWORD`:

```bash
curl -i -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@example.com","password":"TU_PASSWORD"}'
```

La respuesta contiene un `accessToken`. En Postman, configúralo como Bearer Token
para probar las rutas privadas, por ejemplo `GET /api/auth/me` y
`GET /api/categories`. El formulario del frontend realiza el mismo login usando Fetch.
Compila y valida dependencias con `cd backend && npm run build` y
`cd frontend && npm run build && npm run lint`.

## Endpoints disponibles

Las rutas privadas requieren `Authorization: Bearer <accessToken>`.

| Método | Ruta | Acceso |
|---|---|---|
| GET | `/api/health` | Público |
| POST | `/api/auth/login` | Público, limitado por IP |
| GET | `/api/auth/me` | Usuario autenticado |
| GET, POST | `/api/users` | Administración |
| PATCH | `/api/users/:id/active` | Administración |
| GET | `/api/categories` | Usuario autenticado |
| POST, PATCH | `/api/categories` y `/api/categories/:id/active` | Administración |
| GET, POST | `/api/incidents` | Consulta según rol; residentes/admin pueden registrar |
| GET | `/api/incidents/:id` | Propietario, responsable asignado, administración/directiva |
| PATCH | `/api/incidents/:id` | Administración o personal operativo asignado |
| GET | `/api/incidents/:id/history` | Propietario, responsable asignado, administración/directiva |
| GET, POST | `/api/announcements` | Lectura autenticada; publicación por administración |
| GET | `/api/reports/summary` | Administración o directiva |

Roles: `RESIDENT`, `ADMIN`, `DIRECTOR` y `STAFF`. Estados de incidencia: `PENDING`,
`IN_PROGRESS`, `ATTENDED`, `RESOLVED` y `REJECTED`. Las transiciones se validan y cada
cambio queda en el historial. No existe registro público: administración crea las
cuentas.

## Despliegue en Render

Despliega backend y frontend como servicios separados:

1. Crea una base PostgreSQL en Render.
2. Crea un Web Service para el backend con **Root Directory** `backend`,
   **Build Command** `npm ci && npm run build` y **Start Command**
   `npm run db:deploy && npm start`.
3. Configura en el servicio backend `DATABASE_URL` (URL interna de la base Render),
   `JWT_SECRET` (secreto aleatorio de al menos 32 caracteres),
   `FRONTEND_URL` (URL pública exacta del frontend), `BOOTSTRAP_ADMIN_NAME`,
   `BOOTSTRAP_ADMIN_EMAIL` y `BOOTSTRAP_ADMIN_PASSWORD`. Usa Node.js 20.19+.
4. Ejecuta una vez `npm run db:seed` desde el shell del servicio backend, después de
   que esté desplegado.
5. Crea un Static Site para el frontend con **Root Directory** `frontend`,
   **Build Command** `npm ci && npm run build` y **Publish Directory** `dist`.
   Define `VITE_API_URL` con la URL pública base del backend (sin `/api` al final) y
   actualiza `FRONTEND_URL` del backend con la URL pública resultante del sitio estático.

React Leaflet y la interfaz de mapas quedan para una fase posterior. La carga de archivos
de evidencia y la exportación de reportes también requieren definir almacenamiento/formato
antes de implementarse.
