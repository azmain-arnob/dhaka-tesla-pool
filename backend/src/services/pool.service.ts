import {
  PoolStatus,
  RideStatus,
} from "@prisma/client";
import { prisma } from "../lib/prisma";

const POOL_DISCOUNT_RATE = 0.2;

function areCompatibleRoutes(
  firstPickup: string,
  firstDestination: string,
  secondPickup: string,
  secondDestination: string,
) {
  // MVP matching rule:
  // same pickup zone + different but nearby Dhaka destinations
  // are considered compatible for pooling.
  if (firstPickup !== secondPickup) {
    return false;
  }

  if (firstDestination === secondDestination) {
    return true;
  }

  const compatibleDestinations = new Set([
    ["Mohakhali", "Gulshan"].sort().join("-"),
    ["Gulshan", "Badda"].sort().join("-"),
    ["Mohakhali", "Badda"].sort().join("-"),
  ]);

  return compatibleDestinations.has(
    [firstDestination, secondDestination]
      .sort()
      .join("-"),
  );
}

async function applyPoolDiscount(
  tx: Parameters<typeof prisma.$transaction>[0] extends (
    arg: infer T,
  ) => unknown
    ? T
    : never,
  poolId: string,
) {
  const members = await tx.poolMember.findMany({
    where: {
      poolId,
    },
    include: {
      rideRequest: {
        include: {
          fare: true,
        },
      },
    },
  });

  for (const member of members) {
    const fare = member.rideRequest.fare;

    if (!fare) {
      continue;
    }

    const subtotal =
      fare.baseFare + fare.distanceCharge;

    const poolDiscount = BigInt(
      Math.round(
        Number(subtotal) * POOL_DISCOUNT_RATE,
      ),
    );

    const totalFare = subtotal - poolDiscount;

    await tx.fare.update({
      where: {
        rideRequestId: member.rideRequestId,
      },
      data: {
        poolDiscount,
        totalFare,
      },
    });
  }
}

export async function matchRideToPool(
  rideRequestId: string,
) {
  return prisma.$transaction(
    async (tx) => {
      const ride = await tx.rideRequest.findUnique({
        where: { id: rideRequestId },
      });

      if (!ride) {
        throw new Error("RIDE_NOT_FOUND");
      }

      if (ride.status !== RideStatus.REQUESTED) {
        throw new Error("RIDE_NOT_REQUESTED");
      }

      const vehicle = await tx.vehicle.findFirst({
        where: { isOnline: true },
        orderBy: { createdAt: "asc" },
      });

      if (!vehicle) {
        throw new Error("NO_ONLINE_VEHICLE");
      }

      await tx.$queryRaw`
        SELECT id
        FROM vehicles
        WHERE id = ${vehicle.id}::uuid
        FOR UPDATE
      `;

      const lockedVehicle = await tx.vehicle.findUnique({
        where: { id: vehicle.id },
      });

      if (!lockedVehicle || !lockedVehicle.isOnline) {
        throw new Error("VEHICLE_NOT_AVAILABLE");
      }

      if (ride.seatsRequested > lockedVehicle.capacity) {
        throw new Error("INSUFFICIENT_VEHICLE_CAPACITY");
      }

      const openPools = await tx.pool.findMany({
        where: {
          vehicleId: lockedVehicle.id,
          status: PoolStatus.OPEN,
        },
        include: {
          members: {
            include: {
              rideRequest: {
                select: {
                  pickupZone: true,
                  destinationZone: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "asc" },
      });

      for (const pool of openPools) {
        const firstMember = pool.members[0];

        if (!firstMember) {
          continue;
        }

        const compatible = areCompatibleRoutes(
          firstMember.rideRequest.pickupZone,
          firstMember.rideRequest.destinationZone,
          ride.pickupZone,
          ride.destinationZone,
        );

        if (!compatible) {
          continue;
        }

        const seatsUsed = pool.members.reduce(
          (total, member) =>
            total + member.seatsAllocated,
          0,
        );

        const availableSeats =
          lockedVehicle.capacity - seatsUsed;

        if (availableSeats < ride.seatsRequested) {
          continue;
        }

        await tx.poolMember.create({
          data: {
            poolId: pool.id,
            rideRequestId: ride.id,
            seatsAllocated: ride.seatsRequested,
          },
        });

        await tx.rideRequest.update({
          where: { id: ride.id },
          data: { status: RideStatus.MATCHED },
        });

        await tx.rideStatusHistory.create({
          data: {
            rideRequestId: ride.id,
            status: RideStatus.MATCHED,
            note: `Ride matched to pool ${pool.id}`,
          },
        });

        // Once a second passenger joins, all pool members
        // receive the pool discount.
        await applyPoolDiscount(tx, pool.id);

        return tx.pool.findUnique({
          where: { id: pool.id },
          include: {
            vehicle: true,
            members: {
              include: {
                rideRequest: {
                  include: { fare: true },
                },
              },
            },
          },
        });
      }

      const hasOpenPool = openPools.length > 0;

      if (hasOpenPool) {
        throw new Error("NO_MATCHING_POOL_CAPACITY");
      }

      const pool = await tx.pool.create({
        data: {
          vehicleId: lockedVehicle.id,
          status: PoolStatus.OPEN,
        },
      });

      await tx.poolMember.create({
        data: {
          poolId: pool.id,
          rideRequestId: ride.id,
          seatsAllocated: ride.seatsRequested,
        },
      });

      await tx.rideRequest.update({
        where: { id: ride.id },
        data: { status: RideStatus.MATCHED },
      });

      await tx.rideStatusHistory.create({
        data: {
          rideRequestId: ride.id,
          status: RideStatus.MATCHED,
          note: `Ride matched to new pool ${pool.id}`,
        },
      });

      return tx.pool.findUnique({
        where: { id: pool.id },
        include: {
          vehicle: true,
          members: {
            include: {
              rideRequest: {
                include: { fare: true },
              },
            },
          },
        },
      });
    },
    {
      isolationLevel: "Serializable",
    },
  );
}