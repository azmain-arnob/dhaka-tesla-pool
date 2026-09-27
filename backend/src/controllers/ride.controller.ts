import { Request, Response } from "express";
import { z } from "zod";
import {
  cancelRide,
  createRide,
  getPassengerRides,
  getRideById,
} from "../services/ride.service";

function serializeBigInt<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_key, currentValue) =>
      typeof currentValue === "bigint"
        ? Number(currentValue)
        : currentValue,
    ),
  );
}

const createRideSchema = z.object({
  pickupZone: z.string().trim().min(2).max(100),
  destinationZone: z.string().trim().min(2).max(100),
  pickupLat: z.number().min(-90).max(90).optional(),
  pickupLng: z.number().min(-180).max(180).optional(),
  destinationLat: z.number().min(-90).max(90).optional(),
  destinationLng: z.number().min(-180).max(180).optional(),
  seatsRequested: z.number().int().min(1).max(10),
});

export async function create(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({
      message: "Authentication required",
    });
  }

  const result = createRideSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      message: "Validation failed",
      errors: result.error.issues,
    });
  }

  try {
    const ride = await createRide({
      passengerId: req.user.userId,
      ...result.data,
    });

    return res.status(201).json({
      message: "Ride request created successfully",
      data: {
        ride: serializeBigInt(ride),
      },
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "PASSENGER_NOT_FOUND"
    ) {
      return res.status(404).json({
        message: "Passenger not found",
      });
    }

    if (
      error instanceof Error &&
      error.message === "PASSENGER_ROLE_REQUIRED"
    ) {
      return res.status(403).json({
        message: "Only passengers can create ride requests",
      });
    }

    console.error("Create ride error:", error);

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
    const rides = await getPassengerRides(req.user.userId);

    return res.status(200).json({
      data: {
        rides: serializeBigInt(rides),
      },
    });
  } catch (error) {
    console.error("Get passenger rides error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
}

export async function getOne(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({
      message: "Authentication required",
    });
  }

  try {
    const ride = await getRideById(
      String(req.params.id),
      req.user.userId,
    );

    return res.status(200).json({
      data: {
        rides: serializeBigInt(ride),
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "RIDE_NOT_FOUND") {
        return res.status(404).json({
          message: "Ride not found",
        });
      }

      if (error.message === "RIDE_ACCESS_DENIED") {
        return res.status(403).json({
          message: "You do not have access to this ride",
        });
      }
    }

    console.error("Get ride error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
}

export async function cancel(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({
      message: "Authentication required",
    });
  }

  try {
    const ride = await cancelRide(
      String(req.params.id),
      req.user.userId,
    );

    return res.status(200).json({
      message: "Ride cancelled successfully",
      data: {
        rides: serializeBigInt(ride),
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "RIDE_NOT_FOUND") {
        return res.status(404).json({
          message: "Ride not found",
        });
      }

      if (error.message === "RIDE_ACCESS_DENIED") {
        return res.status(403).json({
          message: "You do not have access to this ride",
        });
      }

      if (error.message === "RIDE_CANNOT_BE_CANCELLED") {
        return res.status(409).json({
          message:
            "Ride cannot be cancelled in its current status",
        });
      }
    }

    console.error("Cancel ride error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
}