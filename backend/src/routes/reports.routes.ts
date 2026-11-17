import { IncidentStatus, Role } from "../generated/prisma/client.js";
import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { authenticate, authorize } from "../middleware/auth.js";

export const reportsRouter = Router();
reportsRouter.use(authenticate, authorize(Role.ADMIN, Role.DIRECTOR));

reportsRouter.get("/summary", async (_request, response) => {
  const [total, byStatus, resolved] = await Promise.all([
    prisma.incident.count(),
    prisma.incident.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.incident.findMany({
      where: { status: IncidentStatus.RESOLVED, resolvedAt: { not: null } },
      select: { createdAt: true, resolvedAt: true }
    })
  ]);

  const counts: Record<IncidentStatus, number> = {
    PENDING: 0,
    IN_PROGRESS: 0,
    ATTENDED: 0,
    RESOLVED: 0,
    REJECTED: 0
  };
  for (const { status, _count } of byStatus) {
    counts[status] = _count._all;
  }
  const averageResolutionTimeHours =
    resolved.length === 0
      ? null
      : resolved.reduce(
          (sum, incident) =>
            sum +
            (incident.resolvedAt!.getTime() - incident.createdAt.getTime()) / 3_600_000,
          0
        ) / resolved.length;

  response.json({ total, byStatus: counts, averageResolutionTimeHours });
});
