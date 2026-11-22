import { Router } from "express";
import {
  EstadoActividad,
  EstadoAsignacion,
  EstadoIncidencia,
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
  createActivitySchema,
  createObservationSchema,
  createWorkerSchema,
  incidentIdSchema,
  incidentStatusChangeSchema,
  assignmentLifecycleSchema,
  resolveIncidentSchema,
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

const allowedIncidentTransitions: Record<EstadoIncidencia, readonly EstadoIncidencia[]> = {
  [EstadoIncidencia.PENDIENTE]: [EstadoIncidencia.EN_REVISION, EstadoIncidencia.ASIGNADA, EstadoIncidencia.RECHAZADA],
  [EstadoIncidencia.EN_REVISION]: [EstadoIncidencia.ASIGNADA, EstadoIncidencia.EN_PROCESO, EstadoIncidencia.RECHAZADA],
  [EstadoIncidencia.ASIGNADA]: [EstadoIncidencia.EN_PROCESO, EstadoIncidencia.RECHAZADA],
  [EstadoIncidencia.EN_PROCESO]: [EstadoIncidencia.ATENDIDA, EstadoIncidencia.RECHAZADA],
  [EstadoIncidencia.ATENDIDA]: [EstadoIncidencia.EN_PROCESO],
  [EstadoIncidencia.RESUELTA]: [],
  [EstadoIncidencia.RECHAZADA]: []
};

function ensureIncidentTransition(current: EstadoIncidencia, next: EstadoIncidencia): void {
  if (current === next) throw new HttpError(409, "La incidencia ya tiene ese estado.");
  if (!allowedIncidentTransitions[current].includes(next)) {
    throw new HttpError(409, `Transición no permitida: ${current} → ${next}.`);
  }
}

adminRouter.patch("/incidents/:id/status", async (request, response) => {
  const idIncidencia = incidentIdSchema.parse(request.params.id);
  const input = incidentStatusChangeSchema.parse(request.body);
  const idUsuario = BigInt(request.user!.id);

  if (input.estado === EstadoIncidencia.RESUELTA) {
    throw new HttpError(409, "La resolución debe confirmarse mediante el endpoint de cierre administrativo.");
  }

  try {
    const incident = await prisma.$transaction(async (transaction) => {
      const current = await transaction.incidencia.findUnique({
        where: { idIncidencia },
        select: { estado: true }
      });
      if (!current) throw new HttpError(404, "No se encontró la incidencia solicitada.");
      ensureIncidentTransition(current.estado, input.estado);

      if (input.estado === EstadoIncidencia.RECHAZADA) {
        const activeAssignments = await transaction.asignacionIncidencia.count({
          where: { idIncidencia, estado: EstadoAsignacion.ACTIVA }
        });
        if (activeAssignments > 0) {
          throw new HttpError(409, "No se puede rechazar una incidencia con asignaciones ACTIVAS. Finalízalas explícitamente primero.");
        }
      }

      const updated = await transaction.incidencia.update({
        where: { idIncidencia },
        data: { estado: input.estado }
      });
      await transaction.historialIncidencia.create({
        data: {
          idIncidencia,
          idUsuario,
          tipoAccion: TipoAccion.CAMBIO_ESTADO,
          estadoAnterior: current.estado,
          estadoNuevo: input.estado,
          observacion: input.observacion ?? null
        }
      });
      return updated;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    response.json({
      incident: {
        id: incident.idIncidencia.toString(),
        codigo: incident.codigo,
        estado: incident.estado,
        fechaActualizacion: incident.fechaActualizacion
      }
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      throw new HttpError(409, "La incidencia cambió simultáneamente. Revisa su estado e inténtalo de nuevo.");
    }
    throw error;
  }
});

adminRouter.post("/incidents/:id/resolve", async (request, response) => {
  const idIncidencia = incidentIdSchema.parse(request.params.id);
  const { observacion } = resolveIncidentSchema.parse(request.body);
  const idUsuario = BigInt(request.user!.id);
  const fechaResolucion = new Date();

  try {
    const incident = await prisma.$transaction(async (transaction) => {
      const current = await transaction.incidencia.findUnique({
        where: { idIncidencia },
        select: { estado: true }
      });
      if (!current) throw new HttpError(404, "No se encontró la incidencia solicitada.");
      if (current.estado !== EstadoIncidencia.ATENDIDA) {
        throw new HttpError(409, "La incidencia debe estar ATENDIDA antes de confirmarse como RESUELTA.");
      }

      const activeAssignments = await transaction.asignacionIncidencia.count({
        where: { idIncidencia, estado: EstadoAsignacion.ACTIVA }
      });
      if (activeAssignments > 0) {
        throw new HttpError(409, "Finaliza o cancela explícitamente las asignaciones activas antes de resolver la incidencia.");
      }

      const updated = await transaction.incidencia.update({
        where: { idIncidencia },
        data: {
          estado: EstadoIncidencia.RESUELTA,
          fechaResolucion,
          observacionCierre: observacion
        }
      });
      await transaction.historialIncidencia.create({
        data: {
          idIncidencia,
          idUsuario,
          tipoAccion: TipoAccion.CIERRE,
          estadoAnterior: current.estado,
          estadoNuevo: EstadoIncidencia.RESUELTA,
          observacion
        }
      });
      return updated;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    response.json({
      incident: {
        id: incident.idIncidencia.toString(),
        codigo: incident.codigo,
        estado: incident.estado,
        fechaResolucion: incident.fechaResolucion,
        observacionCierre: incident.observacionCierre
      }
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      throw new HttpError(409, "La incidencia cambió simultáneamente. Revisa sus asignaciones e inténtalo de nuevo.");
    }
    throw error;
  }
});

adminRouter.patch("/assignments/:id/status", async (request, response) => {
  const idAsignacion = workerIdSchema.parse(request.params.id);
  const input = assignmentLifecycleSchema.parse(request.body);
  const idUsuario = BigInt(request.user!.id);
  const fechaFin = new Date();

  try {
    const assignment = await prisma.$transaction(async (transaction) => {
      const current = await transaction.asignacionIncidencia.findUnique({
        where: { idAsignacion },
        include: assignmentInclude
      });
      if (!current) throw new HttpError(404, "La asignación no existe.");
      if (current.estado !== EstadoAsignacion.ACTIVA) {
        throw new HttpError(409, "La asignación ya fue finalizada y no puede modificarse nuevamente.");
      }

      const updated = await transaction.asignacionIncidencia.update({
        where: { idAsignacion },
        data: {
          estado: input.estado,
          fechaFin,
          observacion: input.observacion ?? current.observacion
        },
        include: assignmentInclude
      });
      await transaction.historialIncidencia.create({
        data: {
          idIncidencia: current.idIncidencia,
          idUsuario,
          idArea: current.idArea,
          idOperativo: current.idOperativo,
          tipoAccion: TipoAccion.ASIGNACION,
          observacion: input.observacion ?? `Asignación ${input.estado.toLowerCase()}.`
        }
      });
      return updated;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    response.json({ assignment: serializeAssignment(assignment) });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      throw new HttpError(409, "La asignación cambió simultáneamente. Inténtalo de nuevo.");
    }
    throw error;
  }
});

adminRouter.post("/assignments/:id/reassign", async (request, response) => {
  const idAsignacion = workerIdSchema.parse(request.params.id);
  const input = createAssignmentSchema.parse(request.body);
  const idAdministrador = BigInt(request.user!.id);
  const fechaFin = new Date();
  const fechaInicio = new Date(fechaFin);

  try {
    const result = await prisma.$transaction(async (transaction) => {
      const current = await transaction.asignacionIncidencia.findUnique({
        where: { idAsignacion },
        select: { idIncidencia: true, idArea: true, idOperativo: true, estado: true, observacion: true }
      });
      if (!current) throw new HttpError(404, "La asignación no existe.");
      if (current.estado !== EstadoAsignacion.ACTIVA) {
        throw new HttpError(409, "Solo se pueden reasignar asignaciones ACTIVAS.");
      }

      const area = await transaction.areaOperativa.findUnique({ where: { idArea: input.idArea }, select: { idArea: true } });
      if (!area) throw new HttpError(404, "El área operativa no existe.");
      if (input.idOperativo !== null && input.idOperativo !== undefined) {
        const worker = await transaction.personalOperativo.findUnique({
          where: { idOperativo: input.idOperativo },
          select: { idArea: true, activo: true }
        });
        if (!worker) throw new HttpError(404, "El trabajador no existe.");
        if (!worker.activo) throw new HttpError(409, "No se puede reasignar a un trabajador inactivo.");
        if (worker.idArea !== input.idArea) throw new HttpError(409, "El trabajador no pertenece al área seleccionada.");
      }

      const previous = await transaction.asignacionIncidencia.update({
        where: { idAsignacion },
        data: {
          estado: EstadoAsignacion.REASIGNADA,
          fechaFin,
          observacion: input.observacion ?? current.observacion
        },
        include: assignmentInclude
      });
      const next = await transaction.asignacionIncidencia.create({
        data: {
          idIncidencia: current.idIncidencia,
          idArea: input.idArea,
          idOperativo: input.idOperativo ?? null,
          idAdministrador,
          estado: EstadoAsignacion.ACTIVA,
          fechaInicio,
          observacion: input.observacion ?? "Asignación creada por reasignación."
        },
        include: assignmentInclude
      });
      await transaction.historialIncidencia.createMany({
        data: [
          {
            idIncidencia: current.idIncidencia,
            idUsuario: idAdministrador,
            idArea: current.idArea,
            idOperativo: current.idOperativo,
            tipoAccion: TipoAccion.ASIGNACION,
            observacion: input.observacion ?? "Asignación anterior marcada como REASIGNADA."
          },
          {
            idIncidencia: current.idIncidencia,
            idUsuario: idAdministrador,
            idArea: input.idArea,
            idOperativo: input.idOperativo ?? null,
            tipoAccion: TipoAccion.ASIGNACION,
            observacion: input.observacion ?? "Nueva asignación activa creada por reasignación."
          }
        ]
      });
      return { previous, next };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    response.status(201).json({
      previousAssignment: serializeAssignment(result.previous),
      assignment: serializeAssignment(result.next)
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new HttpError(409, "La nueva asignación entra en conflicto con otra asignación activa.");
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      throw new HttpError(409, "La reasignación entró en conflicto con un cambio concurrente. Inténtalo de nuevo.");
    }
    throw error;
  }
});

const activityInclude = {
  usuarioCreador: { select: { idUsuario: true, nombre: true } },
  operativo: { select: { idOperativo: true, nombre: true } }
} as const;

function serializeActivity(activity: Prisma.ActividadGetPayload<{ include: typeof activityInclude }>) {
  return {
    id: activity.idActividad.toString(),
    idIncidencia: activity.idIncidencia?.toString() ?? null,
    titulo: activity.titulo,
    descripcion: activity.descripcion,
    estado: activity.estado,
    fechaProgramada: activity.fechaProgramada,
    fechaInicio: activity.fechaInicio,
    fechaFinalizacion: activity.fechaFinalizacion,
    fechaCreacion: activity.fechaCreacion,
    usuarioCreador: { id: activity.usuarioCreador.idUsuario.toString(), nombre: activity.usuarioCreador.nombre },
    operativo: activity.operativo
      ? { id: activity.operativo.idOperativo.toString(), nombre: activity.operativo.nombre }
      : null
  };
}

adminRouter.post("/incidents/:id/observations", async (request, response) => {
  const idIncidencia = incidentIdSchema.parse(request.params.id);
  const input = createObservationSchema.parse(request.body);
  const idUsuario = BigInt(request.user!.id);
  const history = await prisma.$transaction(async (transaction) => {
    const incident = await transaction.incidencia.findUnique({ where: { idIncidencia }, select: { idIncidencia: true } });
    if (!incident) throw new HttpError(404, "No se encontró la incidencia solicitada.");
    if (input.idOperativo !== null && input.idOperativo !== undefined) {
      const worker = await transaction.personalOperativo.findUnique({ where: { idOperativo: input.idOperativo }, select: { idOperativo: true } });
      if (!worker) throw new HttpError(404, "El trabajador no existe.");
    }
    return transaction.historialIncidencia.create({
      data: {
        idIncidencia,
        idUsuario,
        idOperativo: input.idOperativo ?? null,
        tipoAccion: TipoAccion.OBSERVACION,
        observacion: input.observacion
      }
    });
  });
  response.status(201).json({
    observation: {
      id: history.idHistorial.toString(),
      idIncidencia: history.idIncidencia.toString(),
      tipoAccion: history.tipoAccion,
      observacion: history.observacion,
      fechaEvento: history.fechaEvento,
      idUsuario: history.idUsuario.toString(),
      idOperativo: history.idOperativo?.toString() ?? null
    }
  });
});

adminRouter.post("/incidents/:id/activities", async (request, response) => {
  const idIncidencia = incidentIdSchema.parse(request.params.id);
  const input = createActivitySchema.parse(request.body);
  const idUsuarioCreador = BigInt(request.user!.id);
  const activity = await prisma.$transaction(async (transaction) => {
    const incident = await transaction.incidencia.findUnique({ where: { idIncidencia }, select: { idIncidencia: true } });
    if (!incident) throw new HttpError(404, "No se encontró la incidencia solicitada.");
    if (input.idOperativo !== null && input.idOperativo !== undefined) {
      const worker = await transaction.personalOperativo.findUnique({ where: { idOperativo: input.idOperativo }, select: { idOperativo: true } });
      if (!worker) throw new HttpError(404, "El trabajador no existe.");
    }
    const created = await transaction.actividad.create({
      data: {
        idIncidencia,
        idUsuarioCreador,
        idOperativo: input.idOperativo ?? null,
        titulo: input.titulo,
        descripcion: input.descripcion,
        estado: input.estado,
        fechaProgramada: input.fechaProgramada,
        fechaInicio: input.fechaInicio,
        fechaFinalizacion: input.fechaFinalizacion
      },
      include: activityInclude
    });
    await transaction.historialIncidencia.create({
      data: {
        idIncidencia,
        idUsuario: idUsuarioCreador,
        idOperativo: input.idOperativo ?? null,
        tipoAccion: TipoAccion.OBSERVACION,
        observacion: `Actividad registrada: ${input.titulo}. ${input.descripcion}`
      }
    });
    return created;
  });
  response.status(201).json({ activity: serializeActivity(activity) });
});

adminRouter.get("/incidents/:id/activities", async (request, response) => {
  const idIncidencia = incidentIdSchema.parse(request.params.id);
  const incident = await prisma.incidencia.findUnique({ where: { idIncidencia }, select: { idIncidencia: true } });
  if (!incident) throw new HttpError(404, "No se encontró la incidencia solicitada.");
  const activities = await prisma.actividad.findMany({
    where: { idIncidencia },
    orderBy: { fechaCreacion: "desc" },
    include: activityInclude
  });
  response.json({ activities: activities.map(serializeActivity) });
});

adminRouter.get("/incidents/:id/history", async (request, response) => {
  const idIncidencia = incidentIdSchema.parse(request.params.id);
  const incident = await prisma.incidencia.findUnique({ where: { idIncidencia }, select: { idIncidencia: true } });
  if (!incident) throw new HttpError(404, "No se encontró la incidencia solicitada.");
  const history = await prisma.historialIncidencia.findMany({
    where: { idIncidencia },
    orderBy: { fechaEvento: "asc" },
    include: {
      usuario: { select: { idUsuario: true, nombre: true } },
      area: { select: { idArea: true, nombre: true } },
      operativo: { select: { idOperativo: true, nombre: true } }
    }
  });
  response.json({ history: history.map((event) => ({
    id: event.idHistorial.toString(),
    tipoAccion: event.tipoAccion,
    estadoAnterior: event.estadoAnterior,
    estadoNuevo: event.estadoNuevo,
    observacion: event.observacion,
    fechaEvento: event.fechaEvento,
    usuario: { id: event.usuario.idUsuario.toString(), nombre: event.usuario.nombre },
    area: event.area ? { id: event.area.idArea.toString(), nombre: event.area.nombre } : null,
    operativo: event.operativo ? { id: event.operativo.idOperativo.toString(), nombre: event.operativo.nombre } : null
  })) });
});
