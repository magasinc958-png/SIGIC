import { Router } from "express";
import { RolUsuario } from "../../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { createUserSchema } from "../schemas.js";
import { hashPassword } from "../services/password.service.js";

export const usersRouter = Router();
usersRouter.use(authenticate, authorize(RolUsuario.ADMINISTRACION));

usersRouter.post("/", async (request, response) => {
  const input = createUserSchema.parse(request.body);
  const passwordHash = await hashPassword(input.contrasena);
  const user = await prisma.$transaction(async (transaction) => {
    const created = await transaction.usuario.create({
      data: { nombre: input.nombre, email: input.email, telefono: input.telefono, contrasenaHash: passwordHash, rol: input.rol }
    });
    if (input.rol === RolUsuario.RESIDENTE) {
      await transaction.residente.create({ data: { idUsuario: created.idUsuario, manzana: input.manzana!, villa: input.villa! } });
    } else if (input.rol === RolUsuario.ADMINISTRACION) {
      await transaction.administrador.create({ data: { idUsuario: created.idUsuario } });
    } else {
      await transaction.directiva.create({ data: { idUsuario: created.idUsuario, cargo: input.cargo! } });
    }
    return created;
  });
  response.status(201).json({ user: { id: user.idUsuario.toString(), nombre: user.nombre, email: user.email, rol: user.rol, activo: user.activo } });
});
