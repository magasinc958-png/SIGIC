import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { Role } from "../generated/prisma/client.js";
import { config } from "../config.js";
import { prisma } from "../lib/prisma.js";

export function signAccessToken(user: { id: string }): string {
  return jwt.sign({}, config.JWT_SECRET, {
    subject: user.id,
    expiresIn: "1h"
  });
}

export async function authenticate(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  const [scheme, token] = request.header("authorization")?.split(" ") ?? [];

  if (scheme !== "Bearer" || !token) {
    response.status(401).json({ error: "Debes iniciar sesión." });
    return;
  }

  let payload: string | jwt.JwtPayload;
  try {
    payload = jwt.verify(token, config.JWT_SECRET);
  } catch {
    response.status(401).json({ error: "La sesión no es válida o expiró." });
    return;
  }

  if (typeof payload === "string" || typeof payload.sub !== "string") {
    response.status(401).json({ error: "La sesión no es válida o expiró." });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, role: true, active: true }
  });

  if (!user?.active) {
    response.status(401).json({ error: "La cuenta no existe o está inactiva." });
    return;
  }

  request.user = { id: user.id, role: user.role };
  next();
}

export function authorize(...roles: Role[]) {
  return (request: Request, response: Response, next: NextFunction): void => {
    if (!request.user || !roles.includes(request.user.role)) {
      response.status(403).json({ error: "No tienes permisos para esta operación." });
      return;
    }
    next();
  };
}
