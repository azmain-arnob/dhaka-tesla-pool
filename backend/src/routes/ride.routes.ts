import { Router } from "express";
import { UserRole } from "@prisma/client";
import {
  cancel,
  create,
  getMine,
  getOne,
} from "../controllers/ride.controller";
import {
  authenticate,
  requireRole,
} from "../middlewares/auth.middleware";

const router = Router();

router.use(authenticate);
router.use(requireRole(UserRole.PASSENGER));

router.post("/", create);
router.get("/", getMine);
router.get("/:id", getOne);
router.post("/:id/cancel", cancel);

export default router;