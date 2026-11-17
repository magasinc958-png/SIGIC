import { IncidentStatus, Role } from "./generated/prisma/client.js";
import { z } from "zod";

export const idSchema = z.string().uuid();

export const loginSchema = z.object({
  email: z.email().transform((email) => email.toLowerCase()),
  password: z.string().min(1).max(128)
});

export const createUserSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.email().transform((email) => email.toLowerCase()),
  password: z.string().min(12).max(128),
  role: z.enum(Role)
});

export const categorySchema = z.object({
  name: z.string().trim().min(2).max(80)
});

export const createIncidentSchema = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().min(10).max(5000),
  categoryId: idSchema,
  address: z.string().trim().min(3).max(300),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional()
}).refine(
  ({ latitude, longitude }) => (latitude === undefined) === (longitude === undefined),
  { message: "La latitud y longitud deben enviarse juntas.", path: ["latitude"] }
);

export const incidentQuerySchema = z.object({
  status: z.enum(IncidentStatus).optional(),
  categoryId: idSchema.optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

export const updateIncidentSchema = z.object({
  status: z.enum(IncidentStatus).optional(),
  assigneeId: idSchema.nullable().optional(),
  dueAt: z.iso.datetime().nullable().optional(),
  details: z.string().trim().max(2000).optional()
}).refine(
  ({ status, assigneeId, dueAt, details }) =>
    status !== undefined ||
    assigneeId !== undefined ||
    dueAt !== undefined ||
    details !== undefined,
  { message: "Debes enviar al menos un campo para actualizar." }
);

export const announcementSchema = z.object({
  title: z.string().trim().min(3).max(150),
  content: z.string().trim().min(10).max(10000)
});

export const activeSchema = z.object({
  active: z.boolean()
});
