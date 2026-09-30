import { Router } from "express";
import { UserRole } from "@prisma/client";
import {
  create,
  getMine,
  updateStatus,
} from "../controllers/vehicle.controller";
import {
  authenticate,
  requireRole,
} from "../middlewares/auth.middleware";

const router = Router();

router.use(authenticate);
router.use(requireRole(UserRole.DRIVER));

router.post("/", create);
router.get("/me", getMine);
router.patch("/me/status", updateStatus);

export default router;