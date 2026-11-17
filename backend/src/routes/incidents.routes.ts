import { IncidentStatus, Role } from "../generated/prisma/client.js";
import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { authenticate, authorize } from "../middleware/auth.js";
import {
  createIncidentSchema,
  idSchema,
  incidentQuerySchema,
  updateIncidentSchema
} from "../schemas.js";

export const incidentsRouter = Router();
incidentsRouter.use(authenticate);

const managers = [Role.ADMIN, Role.STAFF] as const;
const rolesThatCanViewAll = [Role.ADMIN, Role.DIRECTOR] as const;

incidentsRouter.get("/", async (request, response) => {
  const query = incidentQuerySchema.parse(request.query);
  const role = request.user!.role;
  const where = {
    ...(rolesThatCanViewAll.includes(role as (typeof rolesThatCanViewAll)[number])
      ? {}
      : role === Role.STAFF
        ? { assigneeId: request.user!.id }
        : { reporterId: request.user!.id }),
    ...(query.status ? { status: query.status } : {}),
    ...(query.categoryId ? { categoryId: query.categoryId } : {})
  };

  const [incidents, total] = await prisma.$transaction([
    prisma.incident.findMany({
      where,
      include: {
        category: true,
        reporter: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.limit,
      take: query.limit
    }),
    prisma.incident.count({ where })
  ]);

  response.json({
    incidents,
    pagination: { page: query.page, limit: query.limit, total }
  });
});

incidentsRouter.post(
  "/",
  authorize(Role.RESIDENT, Role.ADMIN),
  async (request, response) => {
    const input = createIncidentSchema.parse(request.body);
    const category = await prisma.category.findFirst({
      where: { id: input.categoryId, active: true },
      select: { id: true }
    });

    if (!category) {
      response.status(400).json({ error: "La categoría seleccionada no está disponible." });
      return;
    }

    const incident = await prisma.incident.create({
      data: {
        ...input,
        reporterId: request.user!.id,
        history: {
          create: {
            actorId: request.user!.id,
            action: "CREATED",
            toStatus: IncidentStatus.PENDING,
            details: "Incidencia registrada."
          }
        }
      },
      include: { category: true }
    });
    response.status(201).json({ incident });
  }
);

incidentsRouter.get("/:id", async (request, response) => {
  const id = idSchema.parse(request.params.id);
  const incident = await prisma.incident.findUnique({
    where: { id },
    include: {
      category: true,
      reporter: { select: { id: true, name: true } },
      assignee: { select: { id: true, name: true } }
    }
  });

  if (!incident) {
    response.status(404).json({ error: "No se encontró la incidencia." });
    return;
  }

  if (!canAccessIncident(request.user!.id, request.user!.role, incident)) {
    response.status(403).json({ error: "No puedes consultar esta incidencia." });
    return;
  }

  response.json({ incident });
});

incidentsRouter.patch("/:id", authorize(...managers), async (request, response) => {
  const id = idSchema.parse(request.params.id);
  const input = updateIncidentSchema.parse(request.body);
  const current = await prisma.incident.findUnique({ where: { id } });

  if (!current) {
    response.status(404).json({ error: "No se encontró la incidencia." });
    return;
  }

  if (request.user!.role === Role.STAFF && current.assigneeId !== request.user!.id) {
    response.status(403).json({ error: "Solo puedes actualizar incidencias asignadas a ti." });
    return;
  }

  if (input.assigneeId) {
    const assignee = await prisma.user.findFirst({
      where: { id: input.assigneeId, active: true, role: Role.STAFF },
      select: { id: true }
    });
    if (!assignee) {
      response.status(400).json({ error: "El responsable debe ser personal operativo activo." });
      return;
    }
  }

  const nextStatus = input.status ?? current.status;
  const statusChanged = input.status !== undefined && input.status !== current.status;
  if (statusChanged && !isAllowedTransition(current.status, nextStatus)) {
    response.status(400).json({
      error: `No se puede cambiar el estado de ${current.status} a ${nextStatus}.`
    });
    return;
  }

  const incident = await prisma.$transaction(async (transaction) => {
    const updated = await transaction.incident.update({
      where: { id },
      data: {
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.assigneeId !== undefined ? { assigneeId: input.assigneeId } : {}),
        ...(input.dueAt !== undefined
          ? { dueAt: input.dueAt === null ? null : new Date(input.dueAt) }
          : {}),
        ...(statusChanged && nextStatus === IncidentStatus.RESOLVED
          ? { resolvedAt: new Date() }
          : {})
      }
    });

    await transaction.incidentHistory.create({
      data: {
        incidentId: id,
        actorId: request.user!.id,
        action: statusChanged ? "STATUS_UPDATED" : "INCIDENT_UPDATED",
        ...(statusChanged ? { fromStatus: current.status, toStatus: nextStatus } : {}),
        details:
          input.details ??
          (input.assigneeId !== undefined ? "Asignación actualizada." : undefined)
      }
    });

    return updated;
  });

  response.json({ incident });
});

incidentsRouter.get("/:id/history", async (request, response) => {
  const id = idSchema.parse(request.params.id);
  const incident = await prisma.incident.findUnique({
    where: { id },
    select: { id: true, reporterId: true, assigneeId: true }
  });

  if (!incident) {
    response.status(404).json({ error: "No se encontró la incidencia." });
    return;
  }

  if (!canAccessIncident(request.user!.id, request.user!.role, incident)) {
    response.status(403).json({ error: "No puedes consultar esta incidencia." });
    return;
  }

  const history = await prisma.incidentHistory.findMany({
    where: { incidentId: id },
    include: { actor: { select: { id: true, name: true, role: true } } },
    orderBy: { createdAt: "asc" }
  });
  response.json({ history });
});

function canAccessIncident(
  userId: string,
  role: Role,
  incident: { reporterId: string; assigneeId: string | null }
): boolean {
  return (
    rolesThatCanViewAll.includes(role as (typeof rolesThatCanViewAll)[number]) ||
    (role === Role.RESIDENT && incident.reporterId === userId) ||
    (role === Role.STAFF && incident.assigneeId === userId)
  );
}

function isAllowedTransition(from: IncidentStatus, to: IncidentStatus): boolean {
  const transitions: Record<IncidentStatus, IncidentStatus[]> = {
    PENDING: [IncidentStatus.IN_PROGRESS, IncidentStatus.REJECTED],
    IN_PROGRESS: [IncidentStatus.ATTENDED, IncidentStatus.REJECTED],
    ATTENDED: [IncidentStatus.IN_PROGRESS, IncidentStatus.RESOLVED],
    RESOLVED: [],
    REJECTED: []
  };
  return transitions[from].includes(to);
}
