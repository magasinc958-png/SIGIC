import { hash } from "bcryptjs";
import { Router } from "express";
import { Role } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { activeSchema, createUserSchema, idSchema } from "../schemas.js";

export const usersRouter = Router();
usersRouter.use(authenticate, authorize(Role.ADMIN));

usersRouter.get("/", async (_request, response) => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      createdAt: true
    },
    orderBy: { createdAt: "desc" }
  });
  response.json({ users });
});

usersRouter.post("/", async (request, response) => {
  const input = createUserSchema.parse(request.body);
  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash: await hash(input.password, 12),
      role: input.role
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      createdAt: true
    }
  });
  response.status(201).json({ user });
});

usersRouter.patch("/:id/active", async (request, response) => {
  const id = idSchema.parse(request.params.id);
  const { active } = activeSchema.parse(request.body);

  if (id === request.user!.id && !active) {
    response.status(400).json({ error: "No puedes desactivar tu propia cuenta." });
    return;
  }

  const user = await prisma.user.update({
    where: { id },
    data: { active },
    select: { id: true, name: true, email: true, role: true, active: true }
  });
  response.json({ user });
});
