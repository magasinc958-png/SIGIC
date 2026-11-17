import { Router } from "express";
import { Role } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { activeSchema, categorySchema, idSchema } from "../schemas.js";

export const categoriesRouter = Router();
categoriesRouter.use(authenticate);

categoriesRouter.get("/", async (_request, response) => {
  const categories = await prisma.category.findMany({
    where: { active: true },
    orderBy: { name: "asc" }
  });
  response.json({ categories });
});

categoriesRouter.post("/", authorize(Role.ADMIN), async (request, response) => {
  const { name } = categorySchema.parse(request.body);
  const category = await prisma.category.create({ data: { name } });
  response.status(201).json({ category });
});

categoriesRouter.patch("/:id/active", authorize(Role.ADMIN), async (request, response) => {
  const id = idSchema.parse(request.params.id);
  const { active } = activeSchema.parse(request.body);
  const category = await prisma.category.update({
    where: { id },
    data: { active }
  });
  response.json({ category });
});
