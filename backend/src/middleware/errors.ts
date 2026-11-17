import type { NextFunction, Request, Response } from "express";
import { Prisma } from "../generated/prisma/client.js";
import { ZodError } from "zod";

export function notFound(_request: Request, response: Response): void {
  response.status(404).json({ error: "Ruta no encontrada." });
}

export function errorHandler(
  error: unknown,
  _request: Request,
  response: Response,
  _next: NextFunction
): void {
  if (error instanceof ZodError) {
    response.status(400).json({
      error: "Los datos enviados no son válidos.",
      details: error.issues.map(({ path, message }) => ({
        path: path.join("."),
        message
      }))
    });
    return;
  }

  if (
    error instanceof SyntaxError &&
    "status" in error &&
    error.status === 400
  ) {
    response.status(400).json({ error: "El cuerpo de la solicitud no es JSON válido." });
    return;
  }

  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    response.status(409).json({ error: "Ya existe un registro con esos datos." });
    return;
  }

  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2025"
  ) {
    response.status(404).json({ error: "No se encontró el registro solicitado." });
    return;
  }

  console.error("Error no controlado en la API:", error);
  response.status(500).json({ error: "Error interno del servidor." });
}
