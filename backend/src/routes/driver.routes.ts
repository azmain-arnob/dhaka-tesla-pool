import { Router } from "express";

import {
  accept,
  getRequests,
  getRides,
  arrive,
  start,
  complete,
} from "../controllers/driver.controller";

import {
  authenticate,
  requireRole,
} from "../middlewares/auth.middleware";

import { UserRole } from "@prisma/client";

const router = Router();

router.use(authenticate);
router.use(requireRole(UserRole.DRIVER));

router.get("/requests", getRequests);
router.get("/rides", getRides);

router.post("/rides/:rideId/accept", accept);
router.post("/rides/:rideId/arrive", arrive);
router.post("/rides/:rideId/start", start);
router.post("/rides/:rideId/complete", complete);

export default router;