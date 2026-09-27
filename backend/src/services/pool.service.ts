import {
  PoolStatus,
  RideStatus,
} from "@prisma/client";
import { prisma } from "../lib/prisma";

export async function matchRideToPool(
  rideRequestId: string,
) {
  return prisma.$transaction(
    async (tx) => {
      // 1. Get the requested ride
      const ride = await tx.rideRequest.findUnique({
        where: {
          id: rideRequestId,
        },
      });

      if (!ride) {
        throw new Error("RIDE_NOT_FOUND");
      }

      if (ride.status !== RideStatus.REQUESTED) {
        throw new Error("RIDE_NOT_REQUESTED");
      }

      // 2. Find an online vehicle
      const vehicle = await tx.vehicle.findFirst({
        where: {
          isOnline: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      });

      if (!vehicle) {
        throw new Error("NO_ONLINE_VEHICLE");
      }

      // Lock the vehicle row for the duration of this transaction.
      // This helps prevent concurrent matching from overbooking capacity.
      await tx.$queryRaw`
        SELECT id
        FROM vehicles
        WHERE id = ${vehicle.id}::uuid
        FOR UPDATE
      `;

      // Re-read the vehicle after acquiring the lock.
      const lockedVehicle = await tx.vehicle.findUnique({
        where: {
          id: vehicle.id,
        },
      });

      if (!lockedVehicle || !lockedVehicle.isOnline) {
        throw new Error("VEHICLE_NOT_AVAILABLE");
      }

      // 3. Look for an existing OPEN pool for this vehicle
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
        orderBy: {
          createdAt: "asc",
        },
      });

      // 4. Find a pool with the same route and enough capacity
      for (const pool of openPools) {
        const firstMember = pool.members[0];

        if (!firstMember) {
          continue;
        }

        const sameRoute =
          firstMember.rideRequest.pickupZone === ride.pickupZone &&
          firstMember.rideRequest.destinationZone ===
            ride.destinationZone;

        if (!sameRoute) {
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

        // Add ride to the existing pool
        await tx.poolMember.create({
          data: {
            poolId: pool.id,
            rideRequestId: ride.id,
            seatsAllocated: ride.seatsRequested,
          },
        });

        // Change ride status
        await tx.rideRequest.update({
          where: {
            id: ride.id,
          },
          data: {
            status: RideStatus.MATCHED,
          },
        });

        // Record status change
        await tx.rideStatusHistory.create({
          data: {
            rideRequestId: ride.id,
            status: RideStatus.MATCHED,
            note: `Ride matched to pool ${pool.id}`,
          },
        });

        return tx.pool.findUnique({
          where: {
            id: pool.id,
          },
          include: {
            vehicle: true,
            members: {
              include: {
                rideRequest: {
                  include: {
                    fare: true,
                  },
                },
              },
            },
          },
        });
      }

      // 5. No suitable existing pool.
      // Don't create a second OPEN pool for the same vehicle.
      const hasOpenPool = openPools.length > 0;

      if (hasOpenPool) {
        throw new Error("NO_MATCHING_POOL_CAPACITY");
      }

      // 6. Make sure this ride itself fits in the vehicle
      if (ride.seatsRequested > lockedVehicle.capacity) {
        throw new Error("INSUFFICIENT_VEHICLE_CAPACITY");
      }

      // 7. Create a new pool
      const pool = await tx.pool.create({
        data: {
          vehicleId: lockedVehicle.id,
          status: PoolStatus.OPEN,
        },
      });

      // 8. Add the ride to the new pool
      await tx.poolMember.create({
        data: {
          poolId: pool.id,
          rideRequestId: ride.id,
          seatsAllocated: ride.seatsRequested,
        },
      });

      // 9. Change ride status
      await tx.rideRequest.update({
        where: {
          id: ride.id,
        },
        data: {
          status: RideStatus.MATCHED,
        },
      });

      // 10. Record status change
      await tx.rideStatusHistory.create({
        data: {
          rideRequestId: ride.id,
          status: RideStatus.MATCHED,
          note: `Ride matched to new pool ${pool.id}`,
        },
      });

      return tx.pool.findUnique({
        where: {
          id: pool.id,
        },
        include: {
          vehicle: true,
          members: {
            include: {
              rideRequest: {
                include: {
                  fare: true,
                },
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