import { compare } from "bcryptjs";
import { Router } from "express";
import rateLimit from "express-rate-limit";
import { prisma } from "../lib/prisma.js";
import { authenticate, signAccessToken } from "../middleware/auth.js";
import { loginSchema } from "../schemas.js";

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
  const user = await prisma.user.findUnique({
    where: { email: input.email }
  });

  if (!user || !user.active || !(await compare(input.password, user.passwordHash))) {
    response.status(401).json({ error: "Correo o contraseña incorrectos." });
    return;
  }

  response.json({
    accessToken: signAccessToken(user),
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  });
});

authRouter.get("/me", authenticate, async (request, response) => {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: request.user!.id },
    select: { id: true, name: true, email: true, role: true }
  });
  response.json({ user });
});
