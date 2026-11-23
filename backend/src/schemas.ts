import {
  EstadoActividad,
  EstadoAsignacion,
  EstadoIncidencia,
  RolUsuario
} from "../generated/prisma/client.js";
import { z } from "zod";

export const loginSchema = z.object({
  email: z.email().transform((email) => email.toLowerCase()),
  password: z.string().min(1).max(128)
});

export const createUserSchema = z.object({
  nombre: z.string().trim().min(2).max(120),
  email: z.email().transform((email) => email.toLowerCase()),
  contrasena: z.string().min(12).max(128),
  rol: z.enum(RolUsuario),
  telefono: z.string().trim().max(25).optional(),
  manzana: z.string().trim().min(1).max(50).optional(),
  villa: z.string().trim().min(1).max(50).optional(),
  cargo: z.string().trim().min(1).max(100).optional()
}).superRefine((input, context) => {
  if (input.rol === RolUsuario.RESIDENTE && (!input.manzana || !input.villa)) {
    context.addIssue({ code: "custom", path: ["manzana"], message: "Un residente requiere manzana y villa." });
  }
  if (input.rol === RolUsuario.DIRECTIVA && !input.cargo) {
    context.addIssue({ code: "custom", path: ["cargo"], message: "Un usuario de directiva requiere cargo." });
  }
});

const coordinateSchema = z.number().finite();

const locationSchema = z.object({
  manzana: z.string().trim().min(1).max(50).optional(),
  villa: z.string().trim().min(1).max(50).optional(),
  calle: z.string().trim().min(1).max(100).optional(),
  referencia: z.string().trim().min(1).max(255).optional(),
  latitud: coordinateSchema.min(-90).max(90).optional(),
  longitud: coordinateSchema.min(-180).max(180).optional()
}).superRefine((location, context) => {
  if ((location.latitud === undefined) !== (location.longitud === undefined)) {
    context.addIssue({
      code: "custom",
      path: ["latitud"],
      message: "La latitud y longitud deben enviarse juntas."
    });
  }

  const hasTextLocation = Boolean(location.manzana || location.villa || location.calle || location.referencia);
  const hasCoordinates = location.latitud !== undefined && location.longitud !== undefined;
  if (!hasTextLocation && !hasCoordinates) {
    context.addIssue({
      code: "custom",
      path: ["referencia"],
      message: "La ubicación requiere una dirección, referencia o coordenadas."
    });
  }
});

export const createIncidentSchema = z.object({
  titulo: z.string().trim().min(3).max(160),
  descripcion: z.string().trim().min(10).max(5000),
  idTipo: z.coerce.number().int().positive().max(32767),
  ubicacion: locationSchema.optional()
});

export const incidentIdSchema = z.coerce.bigint().positive();

export const incidentQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  estado: z.enum(EstadoIncidencia).optional(),
  idTipo: z.coerce.number().int().positive().max(32767).optional(),
  codigo: z.string().trim().min(1).max(25).optional()
});

export const adminIncidentQuerySchema = incidentQuerySchema;

export const directivaIncidentQuerySchema = incidentQuerySchema.extend({
  fechaDesde: z.coerce.date().optional(),
  fechaHasta: z.coerce.date().optional()
}).refine(
  (input) => !input.fechaDesde || !input.fechaHasta || input.fechaDesde <= input.fechaHasta,
  "La fecha inicial no puede ser posterior a la fecha final."
);

export const areaIdSchema = z.coerce.bigint().positive();

export const createAreaSchema = z.object({
  nombre: z.string().trim().min(2).max(80),
  descripcion: z.string().trim().max(255).optional()
});

export const updateAreaSchema = createAreaSchema.partial().refine(
  (input) => Object.keys(input).length > 0,
  "Debe indicar al menos un campo para actualizar."
);

export const workerIdSchema = z.coerce.bigint().positive();

const workerFields = {
  idArea: z.coerce.bigint().positive(),
  nombre: z.string().trim().min(2).max(120),
  telefono: z.string().trim().max(25).nullable().optional(),
  turno: z.string().trim().max(50).nullable().optional(),
  activo: z.boolean().optional()
};

export const createWorkerSchema = z.object(workerFields).required({ idArea: true, nombre: true });

export const updateWorkerSchema = z.object({
  idArea: z.coerce.bigint().positive().optional(),
  nombre: workerFields.nombre.optional(),
  telefono: workerFields.telefono,
  turno: workerFields.turno,
  activo: z.boolean().optional()
}).refine(
  (input) => Object.keys(input).length > 0,
  "Debe indicar al menos un campo para actualizar."
);

export const workerQuerySchema = z.object({
  idArea: z.coerce.bigint().positive().optional()
});

export const createAssignmentSchema = z.object({
  idArea: z.coerce.bigint().positive(),
  idOperativo: z.coerce.bigint().positive().nullable().optional(),
  observacion: z.string().trim().max(2000).nullable().optional()
});

export const assignmentQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  idIncidencia: z.coerce.bigint().positive().optional(),
  idArea: z.coerce.bigint().positive().optional(),
  idOperativo: z.coerce.bigint().positive().optional(),
  estado: z.enum(EstadoAsignacion).optional()
});

export const incidentStatusChangeSchema = z.object({
  estado: z.enum(EstadoIncidencia),
  observacion: z.string().trim().max(2000).nullable().optional()
}).superRefine((input, context) => {
  if (input.estado === EstadoIncidencia.RECHAZADA && !input.observacion) {
    context.addIssue({
      code: "custom",
      path: ["observacion"],
      message: "Rechazar una incidencia requiere una observación o motivo."
    });
  }
});

export const resolveIncidentSchema = z.object({
  observacion: z.string().trim().min(1).max(2000)
});

export const assignmentLifecycleSchema = z.object({
  estado: z.enum(EstadoAsignacion).refine(
    (estado) => estado === EstadoAsignacion.COMPLETADA || estado === EstadoAsignacion.CANCELADA,
    "Solo se permite completar o cancelar una asignación desde este endpoint."
  ),
  observacion: z.string().trim().max(2000).nullable().optional()
});

const activityDateSchema = z.coerce.date();

export const createActivitySchema = z.object({
  titulo: z.string().trim().min(3).max(160),
  descripcion: z.string().trim().min(1).max(5000),
  idOperativo: z.coerce.bigint().positive().nullable().optional(),
  estado: z.enum(EstadoActividad).default(EstadoActividad.PLANIFICADA),
  fechaProgramada: activityDateSchema.optional(),
  fechaInicio: activityDateSchema.optional(),
  fechaFinalizacion: activityDateSchema.optional()
}).superRefine((input, context) => {
  if (input.fechaInicio && input.fechaFinalizacion && input.fechaFinalizacion < input.fechaInicio) {
    context.addIssue({ code: "custom", path: ["fechaFinalizacion"], message: "La fecha final no puede ser anterior a la fecha de inicio." });
  }
  if (input.estado === EstadoActividad.COMPLETADA && !input.fechaFinalizacion) {
    context.addIssue({ code: "custom", path: ["fechaFinalizacion"], message: "Una actividad completada requiere fecha de finalización." });
  }
});

export const createObservationSchema = z.object({
  observacion: z.string().trim().min(1).max(5000),
  idOperativo: z.coerce.bigint().positive().nullable().optional()
});
