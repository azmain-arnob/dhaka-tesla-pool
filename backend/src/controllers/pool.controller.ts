import { Request, Response } from "express";
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

export async function matchRide(
  req: Request,
  res: Response,
) {
  try {
    const { rideId } = req.params;

    if (Array.isArray(rideId)) {
      return res.status(400).json({
        message: "INVALID_RIDE_ID",
      });
    }

    const pool = await matchRideToPool(rideId);

    return res.status(200).json(
      serializeBigInt({
        message: "Ride matched successfully",
        data: {
          pool,
        },
      }),
    );
  } catch (error) {
    console.error("Match ride error:", error);

    const message =
      error instanceof Error
        ? error.message
        : "INTERNAL_SERVER_ERROR";

    const statusMap: Record<string, number> = {
      RIDE_NOT_FOUND: 404,
      RIDE_NOT_REQUESTED: 400,
      NO_ONLINE_VEHICLE: 409,
      VEHICLE_NOT_AVAILABLE: 409,
      NO_MATCHING_POOL_CAPACITY: 409,
      INSUFFICIENT_VEHICLE_CAPACITY: 409,
    };

    return res.status(statusMap[message] ?? 500).json({
      message,
    });
  }
}