import { Router } from "express";
import rateLimit from "express-rate-limit";
import { prisma } from "../lib/prisma.js";
import { authenticate, hasValidExclusiveProfile, signAccessToken } from "../middleware/auth.js";
import { loginSchema } from "../schemas.js";
import { verifyPassword } from "../services/password.service.js";

export const authRouter = Router();
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Demasiados intentos. Intenta de nuevo más tarde." }
});

authRouter.post("/login", loginLimiter, async (request, response) => {
  const input = loginSchema.parse(request.body);
  const user = await prisma.usuario.findUnique({
    where: { email: input.email },
    select: {
      idUsuario: true, nombre: true, email: true, contrasenaHash: true, rol: true, activo: true,
      residente: { select: { idUsuario: true } },
      administrador: { select: { idUsuario: true } },
      directiva: { select: { idUsuario: true } }
    }
  });
  if (!user || !user.activo || !hasValidExclusiveProfile(user) || !(await verifyPassword(input.password, user.contrasenaHash))) {
    response.status(401).json({ error: "Correo o contraseña incorrectos." });
    return;
  }
  response.json({
    accessToken: signAccessToken({ id: user.idUsuario, role: user.rol }),
    user: { id: user.idUsuario.toString(), nombre: user.nombre, email: user.email, rol: user.rol }
  });
});

authRouter.get("/me", authenticate, async (request, response) => {
  const user = await prisma.usuario.findUniqueOrThrow({
    where: { idUsuario: BigInt(request.user!.id) },
    select: { idUsuario: true, nombre: true, email: true, telefono: true, rol: true, activo: true }
  });
  response.json({
    user: {
      id: user.idUsuario.toString(), nombre: user.nombre, email: user.email,
      telefono: user.telefono, rol: user.rol, activo: user.activo
    }
  });
});
