import { Router } from "express";
import { matchRide } from "../controllers/pool.controller";
import { authenticate } from "../middlewares/auth.middleware";

const router = Router();

router.post(
  "/rides/:rideId/match",
  authenticate,
  matchRide,
);

export default router;