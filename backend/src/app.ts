import express from "express";
import cors from "cors";

import authRoutes from "./routes/auth.routes";
import vehicleRoutes from "./routes/vehicle.routes";
import rideRoutes from "./routes/ride.routes";
import poolRoutes from "./routes/pool.routes";
import driverRoutes from "./routes/driver.routes";

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
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/rides", rideRoutes);
app.use("/api/pools", poolRoutes);
app.use("/api/drivers", driverRoutes);

export default app;