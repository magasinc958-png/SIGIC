import cors from "cors";
import express from "express";
import helmet from "helmet";
import { config } from "./config.js";
import { errorHandler, notFound } from "./middleware/errors.js";
import { authRouter } from "./routes/auth.routes.js";
import { adminRouter } from "./routes/admin.routes.js";
import { incidentsRouter } from "./routes/incidents.routes.js";
import { usersRouter } from "./routes/users.routes.js";
import { directivaRouter } from "./routes/directiva.routes.js";

export const app = express();

app.disable("x-powered-by");
app.use(helmet());
app.use(cors({ origin: config.FRONTEND_URL }));
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_request, response) => {
  response.json({ status: "ok", application: "SIGIC" });
});

app.use("/api/auth", authRouter);
app.use("/api/admin", adminRouter);
app.use("/api/users", usersRouter);
app.use("/api/incidents", incidentsRouter);
app.use("/api/directiva", directivaRouter);
app.use(notFound);
app.use(errorHandler);
