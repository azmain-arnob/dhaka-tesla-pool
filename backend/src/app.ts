import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => {
  res.json({
    message: "Dhaka Tesla Pool API is running",
  });
});

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "dhaka-tesla-pool-backend",
  });
});

app.use("/api/auth", authRoutes);

export default app;