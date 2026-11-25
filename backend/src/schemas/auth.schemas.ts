import { RolUsuario } from "../../generated/prisma/client.js";
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
