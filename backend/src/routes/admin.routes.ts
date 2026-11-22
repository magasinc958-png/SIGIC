import { Router } from "express";
import {
  EstadoAsignacion,
  Prisma,
  RolUsuario,
  TipoAccion
} from "../../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { HttpError } from "../middleware/errors.js";
import {
  adminIncidentQuerySchema,
  areaIdSchema,
  assignmentQuerySchema,
  createAreaSchema,
  createAssignmentSchema,
  createWorkerSchema,
  incidentIdSchema,
  updateAreaSchema,
  updateWorkerSchema,
  workerIdSchema,
  workerQuerySchema
} from "../schemas.js";

export const adminRouter = Router();
adminRouter.use(authenticate, authorize(RolUsuario.ADMINISTRACION));

const assignmentInclude = {
  area: { select: { idArea: true, nombre: true } },
  operativo: {
    select: { idOperativo: true, nombre: true, telefono: true, turno: true, activo: true }
  },
  administradorAsignador: {
    select: {
      idUsuario: true,
      usuario: { select: { nombre: true, email: true } }
    }
  }
} as const;

type AssignmentRecord = Prisma.AsignacionIncidenciaGetPayload<{
  include: typeof assignmentInclude;
}>;

const incidentInclude = {
  residente: {
    select: {
      idUsuario: true,
      manzana: true,
      villa: true,
      usuario: { select: { nombre: true, email: true, telefono: true } }
    }
  },
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
  },
  asignaciones: {
    include: assignmentInclude,
    orderBy: { fechaInicio: "desc" as const }
  }
} as const;

type IncidentRecord = Prisma.IncidenciaGetPayload<{
  include: typeof incidentInclude;
}>;

function serializeLocation(location: IncidentRecord["ubicacion"]) {
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

function serializeAssignment(assignment: AssignmentRecord) {
  return {
    id: assignment.idAsignacion.toString(),
    idIncidencia: assignment.idIncidencia.toString(),
    estado: assignment.estado,
    fechaInicio: assignment.fechaInicio,
    fechaFin: assignment.fechaFin,
    observacion: assignment.observacion,
    area: {
      id: assignment.area.idArea.toString(),
      nombre: assignment.area.nombre
    },
    operativo: assignment.operativo
      ? {
          id: assignment.operativo.idOperativo.toString(),
          nombre: assignment.operativo.nombre,
          telefono: assignment.operativo.telefono,
          turno: assignment.operativo.turno,
          activo: assignment.operativo.activo
        }
      : null,
    administrador: {
      id: assignment.administradorAsignador.idUsuario.toString(),
      nombre: assignment.administradorAsignador.usuario.nombre,
      email: assignment.administradorAsignador.usuario.email
    }
  };
}

function serializeIncident(incident: IncidentRecord) {
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
    tipo: incident.tipo,
    residente: {
      id: incident.residente.idUsuario.toString(),
      nombre: incident.residente.usuario.nombre,
      email: incident.residente.usuario.email,
      telefono: incident.residente.usuario.telefono,
      manzana: incident.residente.manzana,
      villa: incident.residente.villa
    },
    ubicacion: serializeLocation(incident.ubicacion),
    asignaciones: incident.asignaciones.map(serializeAssignment)
  };
}

function serializeArea(area: { idArea: bigint; nombre: string; descripcion: string | null }) {
  return { id: area.idArea.toString(), nombre: area.nombre, descripcion: area.descripcion };
}

function serializeWorker(worker: {
  idOperativo: bigint;
  idArea: bigint;
  nombre: string;
  telefono: string | null;
  turno: string | null;
  activo: boolean;
  area: { idArea: bigint; nombre: string };
}) {
  return {
    id: worker.idOperativo.toString(),
    nombre: worker.nombre,
    telefono: worker.telefono,
    turno: worker.turno,
    activo: worker.activo,
    area: { id: worker.area.idArea.toString(), nombre: worker.area.nombre }
  };
}

const workerInclude = { area: { select: { idArea: true, nombre: true } } } as const;

adminRouter.get("/incidents", async (request, response) => {
  const { page, limit, estado, idTipo, codigo } = adminIncidentQuerySchema.parse(request.query);
  const where: Prisma.IncidenciaWhereInput = {
    ...(estado ? { estado } : {}),
    ...(idTipo ? { idTipo } : {}),
    ...(codigo ? { codigo: { contains: codigo, mode: "insensitive" } } : {})
  };
  const [incidents, total] = await prisma.$transaction([
    prisma.incidencia.findMany({
      where,
      orderBy: { fechaCreacion: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: incidentInclude
    }),
    prisma.incidencia.count({ where })
  ]);

  response.json({
    incidents: incidents.map(serializeIncident),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
  });
});

adminRouter.get("/incidents/:id", async (request, response) => {
  const id = incidentIdSchema.parse(request.params.id);
  const incident = await prisma.incidencia.findUnique({ where: { idIncidencia: id }, include: incidentInclude });
  if (!incident) throw new HttpError(404, "No se encontró la incidencia solicitada.");
  response.json({ incident: serializeIncident(incident) });
});

adminRouter.get("/areas", async (_request, response) => {
  const areas = await prisma.areaOperativa.findMany({ orderBy: { nombre: "asc" } });
  response.json({ areas: areas.map(serializeArea) });
});

adminRouter.post("/areas", async (request, response) => {
  const input = createAreaSchema.parse(request.body);
  const area = await prisma.areaOperativa.create({
    data: { nombre: input.nombre, descripcion: input.descripcion }
  });
  response.status(201).json({ area: serializeArea(area) });
});

adminRouter.patch("/areas/:id", async (request, response) => {
  const idArea = areaIdSchema.parse(request.params.id);
  const input = updateAreaSchema.parse(request.body);
  const area = await prisma.areaOperativa.update({ where: { idArea }, data: input });
  response.json({ area: serializeArea(area) });
});

adminRouter.get("/workers", async (request, response) => {
  const { idArea } = workerQuerySchema.parse(request.query);
  const workers = await prisma.personalOperativo.findMany({
    where: idArea ? { idArea } : undefined,
    orderBy: [{ activo: "desc" }, { nombre: "asc" }],
    include: workerInclude
  });
  response.json({ workers: workers.map(serializeWorker) });
});

adminRouter.post("/workers", async (request, response) => {
  const input = createWorkerSchema.parse(request.body);
  const area = await prisma.areaOperativa.findUnique({ where: { idArea: input.idArea } });
  if (!area) throw new HttpError(404, "El área operativa no existe.");
  const worker = await prisma.personalOperativo.create({
    data: {
      idArea: input.idArea,
      nombre: input.nombre,
      telefono: input.telefono ?? null,
      turno: input.turno ?? null,
      activo: input.activo ?? true
    },
    include: workerInclude
  });
  response.status(201).json({ worker: serializeWorker(worker) });
});

adminRouter.get("/workers/:id", async (request, response) => {
  const idOperativo = workerIdSchema.parse(request.params.id);
  const worker = await prisma.personalOperativo.findUnique({ where: { idOperativo }, include: workerInclude });
  if (!worker) throw new HttpError(404, "El trabajador no existe.");
  response.json({ worker: serializeWorker(worker) });
});

adminRouter.patch("/workers/:id", async (request, response) => {
  const idOperativo = workerIdSchema.parse(request.params.id);
  const input = updateWorkerSchema.parse(request.body);
  try {
    const worker = await prisma.$transaction(async (transaction) => {
      const current = await transaction.personalOperativo.findUnique({ where: { idOperativo } });
      if (!current) throw new HttpError(404, "El trabajador no existe.");
      if (input.idArea) {
        const area = await transaction.areaOperativa.findUnique({ where: { idArea: input.idArea } });
        if (!area) throw new HttpError(404, "El área operativa no existe.");
      }
      return transaction.personalOperativo.update({ where: { idOperativo }, data: input, include: workerInclude });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    response.json({ worker: serializeWorker(worker) });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      throw new HttpError(409, "No se pudo actualizar el trabajador por un cambio concurrente. Intenta de nuevo.");
    }
    throw error;
  }
});

adminRouter.get("/assignments", async (request, response) => {
  const { page, limit, idIncidencia, idArea, idOperativo, estado } = assignmentQuerySchema.parse(request.query);
  const where: Prisma.AsignacionIncidenciaWhereInput = {
    ...(idIncidencia ? { idIncidencia } : {}),
    ...(idArea ? { idArea } : {}),
    ...(idOperativo ? { idOperativo } : {}),
    ...(estado ? { estado } : {})
  };
  const [assignments, total] = await prisma.$transaction([
    prisma.asignacionIncidencia.findMany({
      where,
      orderBy: { fechaInicio: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: assignmentInclude
    }),
    prisma.asignacionIncidencia.count({ where })
  ]);
  response.json({
    assignments: assignments.map(serializeAssignment),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
  });
});

adminRouter.get("/incidents/:id/assignments", async (request, response) => {
  const idIncidencia = incidentIdSchema.parse(request.params.id);
  const incident = await prisma.incidencia.findUnique({ where: { idIncidencia }, select: { idIncidencia: true } });
  if (!incident) throw new HttpError(404, "No se encontró la incidencia solicitada.");
  const assignments = await prisma.asignacionIncidencia.findMany({
    where: { idIncidencia },
    orderBy: { fechaInicio: "desc" },
    include: assignmentInclude
  });
  response.json({ assignments: assignments.map(serializeAssignment) });
});

adminRouter.post("/incidents/:id/assignments", async (request, response) => {
  const idIncidencia = incidentIdSchema.parse(request.params.id);
  const input = createAssignmentSchema.parse(request.body);
  const idAdministrador = BigInt(request.user!.id);
  const fechaInicio = new Date();

  try {
    const assignment = await prisma.$transaction(async (transaction) => {
      const incident = await transaction.incidencia.findUnique({ where: { idIncidencia }, select: { idIncidencia: true } });
      if (!incident) throw new HttpError(404, "No se encontró la incidencia solicitada.");

      const area = await transaction.areaOperativa.findUnique({ where: { idArea: input.idArea }, select: { idArea: true } });
      if (!area) throw new HttpError(404, "El área operativa no existe.");

      if (input.idOperativo !== null && input.idOperativo !== undefined) {
        const worker = await transaction.personalOperativo.findUnique({
          where: { idOperativo: input.idOperativo },
          select: { idArea: true, activo: true }
        });
        if (!worker) throw new HttpError(404, "El trabajador no existe.");
        if (!worker.activo) throw new HttpError(409, "No se puede asignar un trabajador inactivo.");
        if (worker.idArea !== input.idArea) {
          throw new HttpError(409, "El trabajador no pertenece actualmente al área seleccionada.");
        }
      }

      const created = await transaction.asignacionIncidencia.create({
        data: {
          idIncidencia,
          idArea: input.idArea,
          idOperativo: input.idOperativo ?? null,
          idAdministrador,
          estado: EstadoAsignacion.ACTIVA,
          fechaInicio,
          observacion: input.observacion ?? null
        },
        include: assignmentInclude
      });

      await transaction.historialIncidencia.create({
        data: {
          idIncidencia,
          idUsuario: idAdministrador,
          idArea: input.idArea,
          idOperativo: input.idOperativo ?? null,
          tipoAccion: TipoAccion.ASIGNACION,
          observacion: input.observacion ?? "Asignación activa creada."
        }
      });
      return created;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    response.status(201).json({ assignment: serializeAssignment(assignment) });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new HttpError(409, "Ya existe una asignación activa equivalente para esta incidencia.");
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      throw new HttpError(409, "La asignación entró en conflicto con un cambio concurrente. Intenta de nuevo.");
    }
    throw error;
  }
});
