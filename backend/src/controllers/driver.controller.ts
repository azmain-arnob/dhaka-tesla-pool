import { Request, Response } from "express";
import { z } from "zod";
import {
  completeRide,
  getDriverRequests,
  getDriverRides,
  markRideArrived,
  startRide,
} from "../services/driver.service";
import { matchRideToPool } from "../services/pool.service";

function serializeBigInt<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_key, currentValue) =>
      typeof currentValue === "bigint"
        ? Number(currentValue)
        : currentValue,
    ),
  );
}

const rideIdSchema = z.string().uuid();

export async function getRequests(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({
      message: "Authentication required",
    });
  }

  try {
    const rides = await getDriverRequests(req.user.userId);

    return res.status(200).json({
      data: {
        rides: serializeBigInt(rides),
      },
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "VEHICLE_NOT_FOUND"
    ) {
      return res.status(404).json({
        message: "Vehicle not found",
      });
    }

    console.error("Get driver requests error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
}

export async function accept(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({
      message: "Authentication required",
    });
  }

  const result = rideIdSchema.safeParse(req.params.rideId);

  if (!result.success) {
    return res.status(400).json({
      message: "INVALID_RIDE_ID",
    });
  }

  try {
    const pool = await matchRideToPool(result.data);

    return res.status(200).json({
      message: "Ride accepted successfully",
      data: {
        pool: serializeBigInt(pool),
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      const statusMap: Record<string, number> = {
        RIDE_NOT_FOUND: 404,
        RIDE_NOT_REQUESTED: 409,
        NO_ONLINE_VEHICLE: 409,
        VEHICLE_NOT_AVAILABLE: 409,
        NO_MATCHING_POOL_CAPACITY: 409,
        INSUFFICIENT_VEHICLE_CAPACITY: 409,
      };

      const status = statusMap[error.message];

      if (status) {
        return res.status(status).json({
          message: error.message,
        });
      }
    }

    console.error("Accept ride error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
}

export async function getRides(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({
      message: "Authentication required",
    });
  }

  try {
    const rides = await getDriverRides(req.user.userId);

    return res.status(200).json({
      data: {
        rides: serializeBigInt(rides),
      },
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "VEHICLE_NOT_FOUND"
    ) {
      return res.status(404).json({
        message: "Vehicle not found",
      });
    }

    console.error("Get driver rides error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
}

async function handleStatusUpdate(
  req: Request,
  res: Response,
  action: (
    driverId: string,
    rideId: string,
  ) => Promise<unknown>,
  successMessage: string,
) {
  if (!req.user) {
    return res.status(401).json({
      message: "Authentication required",
    });
  }

  const result = rideIdSchema.safeParse(req.params.rideId);

  if (!result.success) {
    return res.status(400).json({
      message: "INVALID_RIDE_ID",
    });
  }

  try {
    const ride = await action(
      req.user.userId,
      result.data,
    );

    return res.status(200).json({
      message: successMessage,
      data: {
        ride: serializeBigInt(ride),
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "VEHICLE_NOT_FOUND") {
        return res.status(404).json({
          message: "Vehicle not found",
        });
      }

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

      if (error.message === "INVALID_RIDE_STATE") {
        return res.status(409).json({
          message: "Invalid ride state transition",
        });
      }
    }

    console.error("Driver ride action error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
}

export async function arrive(req: Request, res: Response) {
  return handleStatusUpdate(
    req,
    res,
    markRideArrived,
    "Driver arrival recorded",
  );
}

export async function start(req: Request, res: Response) {
  return handleStatusUpdate(
    req,
    res,
    startRide,
    "Ride started",
  );
}

export async function complete(req: Request, res: Response) {
  return handleStatusUpdate(
    req,
    res,
    completeRide,
    "Ride completed",
  );
}