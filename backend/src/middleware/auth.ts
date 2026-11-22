import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { RolUsuario } from "../../generated/prisma/client.js";
import { config } from "../config.js";
import { prisma } from "../lib/prisma.js";

type UserWithProfiles = {
  idUsuario: bigint;
  rol: RolUsuario;
  activo: boolean;
  residente: { idUsuario: bigint } | null;
  administrador: { idUsuario: bigint } | null;
  directiva: { idUsuario: bigint } | null;
};

export function hasValidExclusiveProfile(user: Pick<UserWithProfiles, "rol" | "residente" | "administrador" | "directiva">): boolean {
  const profiles = {
    [RolUsuario.RESIDENTE]: user.residente,
    [RolUsuario.ADMINISTRACION]: user.administrador,
    [RolUsuario.DIRECTIVA]: user.directiva
  };
  const profileCount = [user.residente, user.administrador, user.directiva].filter((profile) => profile !== null).length;
  return profileCount === 1 && profiles[user.rol] !== null;
}

export function signAccessToken(user: { id: bigint; role: RolUsuario }): string {
  return jwt.sign({ role: user.role }, config.JWT_SECRET, {
    subject: user.id.toString(),
    expiresIn: "1h",
    issuer: "sigic-api",
    audience: "sigic-frontend",
    algorithm: "HS256"
  });
}

export async function authenticate(request: Request, response: Response, next: NextFunction): Promise<void> {
  const [scheme, token] = request.header("authorization")?.split(" ") ?? [];
  if (scheme !== "Bearer" || !token) {
    response.status(401).json({ error: "Debes iniciar sesión." });
    return;
  }

  let payload: string | jwt.JwtPayload;
  try {
    payload = jwt.verify(token, config.JWT_SECRET, {
      issuer: "sigic-api",
      audience: "sigic-frontend",
      algorithms: ["HS256"]
    });
  } catch {
    response.status(401).json({ error: "La sesión no es válida o expiró." });
    return;
  }

  if (typeof payload === "string" || typeof payload.sub !== "string" || !/^\d+$/.test(payload.sub)) {
    response.status(401).json({ error: "La sesión no es válida o expiró." });
    return;
  }

  let user: UserWithProfiles | null;
  try {
    user = await prisma.usuario.findUnique({
      where: { idUsuario: BigInt(payload.sub) },
      select: {
        idUsuario: true,
        rol: true,
        activo: true,
        residente: { select: { idUsuario: true } },
        administrador: { select: { idUsuario: true } },
        directiva: { select: { idUsuario: true } }
      }
    });
  } catch {
    response.status(401).json({ error: "La sesión no es válida o expiró." });
    return;
  }

  if (!user?.activo || !hasValidExclusiveProfile(user)) {
    response.status(401).json({ error: "La cuenta no existe, está inactiva o no tiene un perfil válido." });
    return;
  }

  request.user = { id: user.idUsuario.toString(), role: user.rol };
  next();
}

export function authorize(...roles: RolUsuario[]) {
  return (request: Request, response: Response, next: NextFunction): void => {
    if (!request.user || !roles.includes(request.user.role)) {
      response.status(403).json({ error: "No tienes permisos para esta operación." });
      return;
    }
    next();
  };
}
