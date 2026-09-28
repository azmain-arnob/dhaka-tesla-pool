import { RideStatus, PoolStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";

async function getDriverVehicle(driverId: string) {
  const vehicle = await prisma.vehicle.findUnique({
    where: {
      driverId,
    },
  });

  if (!vehicle) {
    throw new Error("VEHICLE_NOT_FOUND");
  }

  return vehicle;
}

export async function getDriverRequests(driverId: string) {
  await getDriverVehicle(driverId);

  return prisma.rideRequest.findMany({
    where: {
      status: RideStatus.REQUESTED,
    },
    include: {
      passenger: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      fare: true,
    },
    orderBy: {
      requestedAt: "asc",
    },
  });
}

export async function getDriverRides(driverId: string) {
  const vehicle = await getDriverVehicle(driverId);

  return prisma.rideRequest.findMany({
    where: {
      poolMember: {
        pool: {
          vehicleId: vehicle.id,
        },
      },
    },
    include: {
      passenger: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      fare: true,
      poolMember: {
        include: {
          pool: true,
        },
      },
      statusHistory: {
        orderBy: {
          changedAt: "asc",
        },
      },
    },
    orderBy: {
      requestedAt: "asc",
    },
  });
}

async function updateRideStatus(
  driverId: string,
  rideId: string,
  currentStatus: RideStatus,
  nextStatus: RideStatus,
  note: string,
) {
  const vehicle = await getDriverVehicle(driverId);

  const ride = await prisma.rideRequest.findUnique({
    where: {
      id: rideId,
    },
    include: {
      poolMember: {
        include: {
          pool: true,
        },
      },
    },
  });

  if (!ride) {
    throw new Error("RIDE_NOT_FOUND");
  }

  if (
    !ride.poolMember ||
    ride.poolMember.pool.vehicleId !== vehicle.id
  ) {
    throw new Error("RIDE_ACCESS_DENIED");
  }

  if (ride.status !== currentStatus) {
    throw new Error("INVALID_RIDE_STATE");
  }

  return prisma.$transaction(async (tx) => {
    const updatedRide = await tx.rideRequest.update({
      where: {
        id: rideId,
      },
      data: {
        status: nextStatus,
        ...(nextStatus === RideStatus.COMPLETED
          ? { completedAt: new Date() }
          : {}),
      },
    });

    if (nextStatus === RideStatus.STARTED && ride.poolMember) {
      await tx.pool.update({
        where: {
          id: ride.poolMember.pool.id,
        },
        data: {
          status: PoolStatus.STARTED,
          startedAt: new Date(),
        },
      });
    }

    if (nextStatus === RideStatus.COMPLETED && ride.poolMember) {
      const poolMembers = await tx.poolMember.findMany({
        where: {
          poolId: ride.poolMember.pool.id,
        },
        include: {
          rideRequest: {
            select: {
              status: true,
            },
          },
        },
      });

      const allMembersFinished = poolMembers.every(
        (member) =>
          member.rideRequest.status === RideStatus.COMPLETED ||
          member.rideRequest.status === RideStatus.CANCELLED,
      );

      if (allMembersFinished) {
        await tx.pool.update({
          where: {
            id: ride.poolMember.pool.id,
          },
          data: {
            status: PoolStatus.COMPLETED,
            completedAt: new Date(),
          },
        });
      }
    }

    await tx.rideStatusHistory.create({
      data: {
        rideRequestId: rideId,
        status: nextStatus,
        note,
      },
    });

    return updatedRide;
  });
}

export async function markRideArrived(
  driverId: string,
  rideId: string,
) {
  return updateRideStatus(
    driverId,
    rideId,
    RideStatus.MATCHED,
    RideStatus.DRIVER_ARRIVED,
    "Driver arrived",
  );
}

export async function startRide(
  driverId: string,
  rideId: string,
) {
  return updateRideStatus(
    driverId,
    rideId,
    RideStatus.DRIVER_ARRIVED,
    RideStatus.STARTED,
    "Ride started",
  );
}

export async function completeRide(
  driverId: string,
  rideId: string,
) {
  return updateRideStatus(
    driverId,
    rideId,
    RideStatus.STARTED,
    RideStatus.COMPLETED,
    "Ride completed",
  );
}