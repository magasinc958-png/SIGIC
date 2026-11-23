import { Router } from "express";
import { EstadoIncidencia, Prisma, RolUsuario } from "../../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { HttpError } from "../middleware/errors.js";
import { directivaIncidentQuerySchema, incidentIdSchema } from "../schemas.js";

export const directivaRouter = Router();
directivaRouter.use(authenticate, authorize(RolUsuario.DIRECTIVA));

const safeLocationSelect = {
  manzana: true,
  calle: true
} as const;

const safeIncidentSelect = {
  idIncidencia: true,
  codigo: true,
  titulo: true,
  descripcion: true,
  estado: true,
  fechaCreacion: true,
  fechaActualizacion: true,
  fechaObjetivo: true,
  fechaResolucion: true,
  tipo: { select: { idTipo: true, nombre: true, codigoPrefijo: true } },
  ubicacion: { select: { idUbicacion: true, ...safeLocationSelect } }
} as const;

type SafeIncident = Prisma.IncidenciaGetPayload<{ select: typeof safeIncidentSelect }>;

function serializeIncident(incident: SafeIncident) {
  return {
    id: incident.idIncidencia.toString(),
    codigo: incident.codigo,
    titulo: incident.titulo,
    descripcion: incident.descripcion,
    estado: incident.estado,
    fechaCreacion: incident.fechaCreacion,
    fechaActualizacion: incident.fechaActualizacion,
    fechaObjetivo: incident.fechaObjetivo,
    fechaResolucion: incident.fechaResolucion,
    tipo: {
      id: incident.tipo.idTipo,
      nombre: incident.tipo.nombre,
      codigoPrefijo: incident.tipo.codigoPrefijo
    },
    ubicacion: incident.ubicacion
      ? { manzana: incident.ubicacion.manzana, calle: incident.ubicacion.calle }
      : null
  };
}

function buildWhere(input: ReturnType<typeof directivaIncidentQuerySchema.parse>): Prisma.IncidenciaWhereInput {
  return {
    ...(input.estado ? { estado: input.estado } : {}),
    ...(input.idTipo ? { idTipo: input.idTipo } : {}),
    ...(input.codigo ? { codigo: { contains: input.codigo, mode: "insensitive" } } : {}),
    ...(input.fechaDesde || input.fechaHasta
      ? { fechaCreacion: { gte: input.fechaDesde, lte: input.fechaHasta } }
      : {})
  };
}

directivaRouter.get("/summary", async (_request, response) => {
  const since = new Date();
  since.setDate(since.getDate() - 29);
  since.setHours(0, 0, 0, 0);

  const [total, byStatus, byType, resolved, rejected, recent] = await prisma.$transaction([
    prisma.incidencia.count(),
    prisma.incidencia.groupBy({ by: ["estado"], _count: { _all: true } }),
    prisma.incidencia.groupBy({ by: ["idTipo"], _count: { _all: true } }),
    prisma.incidencia.count({ where: { estado: EstadoIncidencia.RESUELTA } }),
    prisma.incidencia.count({ where: { estado: EstadoIncidencia.RECHAZADA } }),
    prisma.incidencia.findMany({ where: { fechaCreacion: { gte: since } }, select: { fechaCreacion: true } })
  ]);

  const typeIds = byType.map((item) => item.idTipo);
  const types = await prisma.tipoIncidencia.findMany({ where: { idTipo: { in: typeIds } }, select: { idTipo: true, nombre: true } });
  const typeNames = new Map(types.map((type) => [type.idTipo, type.nombre]));
  const timeline = new Map<string, number>();
  for (const incident of recent) {
    const day = incident.fechaCreacion.toISOString().slice(0, 10);
    timeline.set(day, (timeline.get(day) ?? 0) + 1);
  }
  const timelineDays = Array.from({ length: 30 }, (_, index) => {
    const day = new Date(since);
    day.setDate(since.getDate() + index);
    const key = day.toISOString().slice(0, 10);
    return { fecha: key, total: timeline.get(key) ?? 0 };
  });

  response.json({
    summary: {
      total,
      resueltas: resolved,
      rechazadas: rejected,
      porEstado: byStatus.map((item) => ({ estado: item.estado, total: item._count._all })),
      porTipo: byType.map((item) => ({ idTipo: item.idTipo, nombre: typeNames.get(item.idTipo) ?? "Sin tipo", total: item._count._all })),
      evolucion: timelineDays
    }
  });
});

directivaRouter.get("/incidents", async (request, response) => {
  const input = directivaIncidentQuerySchema.parse(request.query);
  const where = buildWhere(input);
  const [incidents, total] = await prisma.$transaction([
    prisma.incidencia.findMany({ where, orderBy: { fechaCreacion: "desc" }, skip: (input.page - 1) * input.limit, take: input.limit, select: safeIncidentSelect }),
    prisma.incidencia.count({ where })
  ]);
  response.json({ incidents: incidents.map(serializeIncident), pagination: { page: input.page, limit: input.limit, total, totalPages: Math.ceil(total / input.limit) } });
});

directivaRouter.get("/incidents/:id", async (request, response) => {
  const id = incidentIdSchema.parse(request.params.id);
  const incident = await prisma.incidencia.findUnique({
    where: { idIncidencia: id },
    select: {
      ...safeIncidentSelect,
      historial: {
        select: { tipoAccion: true, estadoAnterior: true, estadoNuevo: true, fechaEvento: true, area: { select: { nombre: true } } },
        orderBy: { fechaEvento: "asc" }
      }
    }
  });
  if (!incident) throw new HttpError(404, "No se encontró la incidencia solicitada.");
  response.json({ incident: { ...serializeIncident(incident), historial: incident.historial.map((event) => ({ tipoAccion: event.tipoAccion, estadoAnterior: event.estadoAnterior, estadoNuevo: event.estadoNuevo, fechaEvento: event.fechaEvento, area: event.area?.nombre ?? null })) } });
});
