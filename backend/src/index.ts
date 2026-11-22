import { app } from "./app.js";
import { config } from "./config.js";
import { prisma } from "./lib/prisma.js";

const server = app.listen(config.PORT, "0.0.0.0", () => {
  console.log(`Servidor SIGIC iniciado en puerto ${config.PORT}`);
});

async function shutdown(signal: string): Promise<void> {
  console.log(`${signal} recibido; cerrando SIGIC.`);
  server.close(async (error) => {
    if (error) {
      console.error("No se pudo cerrar el servidor HTTP:", error);
      process.exitCode = 1;
    }
    await prisma.$disconnect();
  });
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
