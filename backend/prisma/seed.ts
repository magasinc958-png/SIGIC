import "dotenv/config";
import { hash } from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Role } from "../src/generated/prisma/client.js";
import { config } from "../src/config.js";

const adapter = new PrismaPg({ connectionString: config.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main(): Promise<void> {
  const name = process.env.BOOTSTRAP_ADMIN_NAME?.trim();
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;

  if (!name || !email || !password || password.length < 12) {
    throw new Error(
      "Configura BOOTSTRAP_ADMIN_NAME, BOOTSTRAP_ADMIN_EMAIL y BOOTSTRAP_ADMIN_PASSWORD (mínimo 12 caracteres)."
    );
  }

  const admin = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      name,
      email,
      passwordHash: await hash(password, 12),
      role: Role.ADMIN
    }
  });
  if (admin.role !== Role.ADMIN || !admin.active) {
    throw new Error("El correo bootstrap existe, pero no corresponde a una cuenta ADMIN activa.");
  }

  for (const categoryName of [
    "Infraestructura",
    "Seguridad",
    "Limpieza",
    "Otros"
  ]) {
    await prisma.category.upsert({
      where: { name: categoryName },
      update: {},
      create: { name: categoryName }
    });
  }
}

main()
  .catch((error: unknown) => {
    console.error("No se pudo inicializar la base de datos:", error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
