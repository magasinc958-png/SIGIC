import { randomBytes } from "node:crypto";
import { Router } from "express";
import {
  EstadoIncidencia,
  Prisma,
  RolUsuario,
  TipoAccion
} from "../../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { HttpError } from "../middleware/errors.js";
import {
  createIncidentSchema,
  incidentIdSchema,
  incidentQuerySchema
} from "../schemas.js";

export const incidentsRouter = Router();

const platformRoles = [
  RolUsuario.RESIDENTE,
  RolUsuario.ADMINISTRACION,
  RolUsuario.DIRECTIVA
] as const;

incidentsRouter.get(
  "/types",
  authenticate,
  authorize(...platformRoles),
  async (_request, response) => {
    const types = await prisma.tipoIncidencia.findMany({
      where: { activo: true },
      select: { idTipo: true, nombre: true, codigoPrefijo: true },
      orderBy: { nombre: "asc" }
    });

    response.json({
      types: types.map((type) => ({
        id: type.idTipo,
        nombre: type.nombre,
        codigoPrefijo: type.codigoPrefijo
      }))
    });
  }
);

incidentsRouter.use(authenticate, authorize(RolUsuario.RESIDENTE));

function generateIncidentCode(): string {
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const suffix = randomBytes(6).toString("hex").toUpperCase();
  return `INC-${date}-${suffix}`;
}

function serializeLocation(location: {
  idUbicacion: bigint;
  manzana: string | null;
  villa: string | null;
  calle: string | null;
  referencia: string | null;
  latitud: { toString(): string } | null;
  longitud: { toString(): string } | null;
} | null) {
  if (!location) return null;
  return {
    id: location.idUbicacion.toString(),
    manzana: location.manzana,
    villa: location.villa,
    calle: location.calle,
    referencia: location.referencia,
    latitud: location.latitud?.toString() ?? null,
    longitud: location.longitud?.toString() ?? null
  };
}

function serializeIncident(incident: {
  idIncidencia: bigint;
  codigo: string;
  titulo: string;
  descripcion: string;
  estado: EstadoIncidencia;
  fechaCreacion: Date;
  fechaActualizacion: Date;
  fechaObjetivo: Date | null;
  fechaResolucion: Date | null;
  tipo: { idTipo: number; nombre: string; codigoPrefijo: string };
  ubicacion: Parameters<typeof serializeLocation>[0];
  historial?: Array<{
    tipoAccion: TipoAccion;
    estadoAnterior: EstadoIncidencia | null;
    estadoNuevo: EstadoIncidencia | null;
    observacion: string | null;
    fechaEvento: Date;
  }>;
}) {
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
    ubicacion: serializeLocation(incident.ubicacion),
    ...(incident.historial
      ? {
          historial: incident.historial.map((event) => ({
            tipoAccion: event.tipoAccion,
            estadoAnterior: event.estadoAnterior,
            estadoNuevo: event.estadoNuevo,
            observacion: event.observacion,
            fechaEvento: event.fechaEvento
          }))
        }
      : {})
  };
}

const incidentInclude = {
  tipo: { select: { idTipo: true, nombre: true, codigoPrefijo: true } },
  ubicacion: {
    select: {
      idUbicacion: true,
      manzana: true,
      villa: true,
      calle: true,
      referencia: true,
      latitud: true,
      longitud: true
    }
  }
} as const;

incidentsRouter.post("/", async (request, response) => {
  const input = createIncidentSchema.parse(request.body);
  const residentId = BigInt(request.user!.id);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const incident = await prisma.$transaction(async (transaction) => {
        const type = await transaction.tipoIncidencia.findFirst({
          where: { idTipo: input.idTipo, activo: true },
          select: { idTipo: true }
        });

        if (!type) {
          throw new HttpError(404, "El tipo de incidencia no existe o está inactivo.");
        }

        const created = await transaction.incidencia.create({
          data: {
            codigo: generateIncidentCode(),
            titulo: input.titulo,
            descripcion: input.descripcion,
            idResidente: residentId,
            idTipo: type.idTipo,
            estado: EstadoIncidencia.PENDIENTE,
            ubicacion: input.ubicacion ? { create: input.ubicacion } : undefined
          },
          include: incidentInclude
        });

        await transaction.historialIncidencia.create({
          data: {
            idIncidencia: created.idIncidencia,
            idUsuario: residentId,
            tipoAccion: TipoAccion.CREACION,
            estadoNuevo: EstadoIncidencia.PENDIENTE,
            observacion: "Incidencia registrada por el residente."
          }
        });

        return created;
      });

      response.status(201).json({ incident: serializeIncident(incident) });
      return;
    } catch (error) {
      if (error instanceof HttpError) throw error;
      const isCodeCollision = error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
      if (!isCodeCollision || attempt === 2) throw error;
    }
  }
});

incidentsRouter.get("/mine", async (request, response) => {
  const { page, limit } = incidentQuerySchema.parse(request.query);
  const residentId = BigInt(request.user!.id);
  const skip = (page - 1) * limit;

  const [incidents, total] = await prisma.$transaction([
    prisma.incidencia.findMany({
      where: { idResidente: residentId },
      orderBy: { fechaCreacion: "desc" },
      skip,
      take: limit,
      include: incidentInclude
    }),
    prisma.incidencia.count({ where: { idResidente: residentId } })
  ]);

  response.json({
    incidents: incidents.map(serializeIncident),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
  });
});

incidentsRouter.get("/:id", async (request, response) => {
  const id = incidentIdSchema.parse(request.params.id);
  const residentId = BigInt(request.user!.id);
  const incident = await prisma.incidencia.findFirst({
    where: { idIncidencia: id, idResidente: residentId },
    include: {
      ...incidentInclude,
      historial: {
        select: {
          tipoAccion: true,
          estadoAnterior: true,
          estadoNuevo: true,
          observacion: true,
          fechaEvento: true
        },
        orderBy: { fechaEvento: "asc" }
      }
    }
  });

  if (!incident) {
    response.status(404).json({ error: "No se encontró la incidencia solicitada." });
    return;
  }

  response.json({ incident: serializeIncident(incident) });
});
