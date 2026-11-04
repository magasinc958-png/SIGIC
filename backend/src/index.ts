import "dotenv/config";
import express from "express";
import cors from "cors";

const app = express();

const PORT = Number(process.env.PORT) || 3000;

app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173"
}));

app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({
    status: "OK",
    application: "SIGIC",
    message: "Backend funcionando correctamente"
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor SIGIC iniciado en puerto ${PORT}`);
});
