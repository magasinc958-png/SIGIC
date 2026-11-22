import { RolUsuario } from "../generated/prisma/client.js";
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
  limit: z.coerce.number().int().min(1).max(50).default(20)
});
