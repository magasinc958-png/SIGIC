import { Router } from "express";
import { Role } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { announcementSchema } from "../schemas.js";

export const announcementsRouter = Router();
announcementsRouter.use(authenticate);

announcementsRouter.get("/", async (_request, response) => {
  const announcements = await prisma.announcement.findMany({
    where: { active: true },
    include: { author: { select: { id: true, name: true } } },
    orderBy: { publishedAt: "desc" }
  });
  response.json({ announcements });
});

announcementsRouter.post(
  "/",
  authorize(Role.ADMIN),
  async (request, response) => {
    const input = announcementSchema.parse(request.body);
    const announcement = await prisma.announcement.create({
      data: { ...input, authorId: request.user!.id },
      include: { author: { select: { id: true, name: true } } }
    });
    response.status(201).json({ announcement });
  }
);
