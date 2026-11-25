import { EstadoIncidencia } from "../../generated/prisma/client.js";
import { z } from "zod";

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
