import { Prisma } from "../../../generated/prisma/client.js";

export const assignmentInclude = {
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

export const incidentInclude = {
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

export function serializeAssignment(assignment: AssignmentRecord) {
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

export function serializeIncident(incident: IncidentRecord) {
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

export function serializeArea(area: { idArea: bigint; nombre: string; descripcion: string | null }) {
  return { id: area.idArea.toString(), nombre: area.nombre, descripcion: area.descripcion };
}

export function serializeWorker(worker: {
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

export const workerInclude = { area: { select: { idArea: true, nombre: true } } } as const;

export const activityInclude = {
  usuarioCreador: { select: { idUsuario: true, nombre: true } },
  operativo: { select: { idOperativo: true, nombre: true } }
} as const;

export function serializeActivity(activity: Prisma.ActividadGetPayload<{ include: typeof activityInclude }>) {
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
