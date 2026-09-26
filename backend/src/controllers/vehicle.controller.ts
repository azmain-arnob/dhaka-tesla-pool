import { Request, Response } from "express";
import { z } from "zod";
import {
  createVehicle,
  getDriverVehicle,
  updateVehicleStatus,
} from "../services/vehicle.service";

const createVehicleSchema = z.object({
  name: z.string().trim().min(2).max(100),
  model: z.string().trim().min(2).max(100),
  capacity: z.number().int().min(1).max(10),
});

const statusSchema = z.object({
  isOnline: z.boolean(),
});

export async function create(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({
      message: "Authentication required",
    });
  }

  const result = createVehicleSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      message: "Validation failed",
      errors: result.error.issues,
    });
  }

  try {
    const vehicle = await createVehicle({
      driverId: req.user.userId,
      ...result.data,
    });

    return res.status(201).json({
      message: "Vehicle created successfully",
      data: {
        vehicle,
      },
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "VEHICLE_ALREADY_EXISTS"
    ) {
      return res.status(409).json({
        message: "Driver already has a vehicle",
      });
    }

    console.error("Create vehicle error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
}

export async function getMine(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({
      message: "Authentication required",
    });
  }

  try {
    const vehicle = await getDriverVehicle(req.user.userId);

    if (!vehicle) {
      return res.status(404).json({
        message: "Vehicle not found",
      });
    }

    return res.status(200).json({
      data: {
        vehicle,
      },
    });
  } catch (error) {
    console.error("Get vehicle error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
}

export async function updateStatus(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({
      message: "Authentication required",
    });
  }

  const result = statusSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      message: "Validation failed",
      errors: result.error.issues,
    });
  }

  try {
    const vehicle = await updateVehicleStatus(
      req.user.userId,
      result.data.isOnline,
    );

    return res.status(200).json({
      message: "Vehicle status updated",
      data: {
        vehicle,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "VEHICLE_NOT_FOUND") {
      return res.status(404).json({
        message: "Vehicle not found",
      });
    }

    console.error("Update vehicle status error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
}