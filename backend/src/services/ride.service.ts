import {
  RideStatus,
  PoolStatus,
} from "@prisma/client";
import { prisma } from "../lib/prisma";

interface CreateRideInput {
  passengerId: string;
  pickupZone: string;
  destinationZone: string;
  pickupLat?: number;
  pickupLng?: number;
  destinationLat?: number;
  destinationLng?: number;
  seatsRequested: number;
}

const BASE_FARE = 50;
const DISTANCE_RATE = 20;
const POOL_DISCOUNT_RATE = 0.2;

const ZONE_DISTANCE_KM: Record<string, number> = {
  "banani-mohakhali": 3,
  "banani-gulshan": 3,
  "banani-badda": 5,
  "banani-mirpur": 9,
  "banani-uttara": 12,
  "gulshan-badda": 4,
  "gulshan-mohakhali": 4,
  "gulshan-mirpur": 10,
  "gulshan-uttara": 14,
  "mohakhali-mirpur": 8,
  "mohakhali-uttara": 11,
  "badda-mirpur": 9,
  "badda-uttara": 13,
  "mirpur-uttara": 8,
};

function normalizeZone(zone: string) {
  return zone.trim().toLowerCase();
}

function getDistanceKey(a: string, b: string) {
  return `${normalizeZone(a)}-${normalizeZone(b)}`;
}

function estimateDistanceKm(
  pickupZone: string,
  destinationZone: string,
): number {
  const pickup = normalizeZone(pickupZone);
  const destination = normalizeZone(destinationZone);

  if (pickup === destination) {
    return 2;
  }

  const direct =
    ZONE_DISTANCE_KM[getDistanceKey(pickup, destination)];

  if (direct !== undefined) {
    return direct;
  }

  const reverse =
    ZONE_DISTANCE_KM[getDistanceKey(destination, pickup)];

  if (reverse !== undefined) {
    return reverse;
  }

  return 5;
}

function calculateFare(
  pickupZone: string,
  destinationZone: string,
  seatsRequested: number,
) {
  const distanceKm = estimateDistanceKm(
    pickupZone,
    destinationZone,
  );

  const distanceCharge = distanceKm * DISTANCE_RATE;

  const subtotal =
    BASE_FARE + distanceCharge;

  const totalFare = subtotal * seatsRequested;

  return {
    baseFare: BASE_FARE * seatsRequested,
    distanceCharge,
    poolDiscount: 0,
    totalFare: Math.round(totalFare),
  };
}

export async function createRide(input: CreateRideInput) {
  const passenger = await prisma.user.findUnique({
    where: { id: input.passengerId },
  });

  if (!passenger) {
    throw new Error("PASSENGER_NOT_FOUND");
  }

  if (passenger.role !== "PASSENGER") {
    throw new Error("PASSENGER_ROLE_REQUIRED");
  }

  const fare = calculateFare(
    input.pickupZone,
    input.destinationZone,
    input.seatsRequested,
  );

  return prisma.$transaction(async (tx) => {
    const ride = await tx.rideRequest.create({
      data: {
        passengerId: input.passengerId,
        pickupZone: input.pickupZone,
        destinationZone: input.destinationZone,
        pickupLat: input.pickupLat,
        pickupLng: input.pickupLng,
        destinationLat: input.destinationLat,
        destinationLng: input.destinationLng,
        seatsRequested: input.seatsRequested,
        status: RideStatus.REQUESTED,
      },
    });

    await tx.rideStatusHistory.create({
      data: {
        rideRequestId: ride.id,
        status: RideStatus.REQUESTED,
        note: "Ride request created",
      },
    });

    await tx.fare.create({
      data: {
        rideRequestId: ride.id,
        baseFare: BigInt(fare.baseFare),
        distanceCharge: BigInt(fare.distanceCharge),
        poolDiscount: BigInt(fare.poolDiscount),
        totalFare: BigInt(fare.totalFare),
      },
    });

    return tx.rideRequest.findUnique({
      where: { id: ride.id },
      include: {
        fare: true,
        statusHistory: {
          orderBy: { changedAt: "asc" },
        },
      },
    });
  });
}

export async function getPassengerRides(passengerId: string) {
  return prisma.rideRequest.findMany({
    where: { passengerId },
    include: {
      fare: true,
      poolMember: {
        include: {
          pool: {
            include: { vehicle: true },
          },
        },
      },
      statusHistory: {
        orderBy: { changedAt: "asc" },
      },
    },
    orderBy: { requestedAt: "desc" },
  });
}

export async function getRideById(
  rideId: string,
  passengerId: string,
) {
  const ride = await prisma.rideRequest.findUnique({
    where: { id: rideId },
    include: {
      fare: true,
      passenger: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      poolMember: {
        include: {
          pool: {
            include: {
              vehicle: {
                include: {
                  driver: {
                    select: {
                      id: true,
                      name: true,
                      email: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
      statusHistory: {
        orderBy: { changedAt: "asc" },
      },
    },
  });

  if (!ride) {
    throw new Error("RIDE_NOT_FOUND");
  }

  if (ride.passengerId !== passengerId) {
    throw new Error("RIDE_ACCESS_DENIED");
  }

  return ride;
}

export async function cancelRide(
  rideId: string,
  passengerId: string,
) {
  const ride = await prisma.rideRequest.findUnique({
    where: { id: rideId },
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

  if (ride.passengerId !== passengerId) {
    throw new Error("RIDE_ACCESS_DENIED");
  }

  if (
    ride.status !== RideStatus.REQUESTED &&
    ride.status !== RideStatus.MATCHED
  ) {
    throw new Error("RIDE_CANNOT_BE_CANCELLED");
  }

  return prisma.$transaction(async (tx) => {
    const cancelledRide = await tx.rideRequest.update({
      where: { id: rideId },
      data: {
        status: RideStatus.CANCELLED,
        cancelledAt: new Date(),
      },
    });

    if (ride.poolMember) {
      const poolId = ride.poolMember.pool.id;

      await tx.poolMember.delete({
        where: {
          rideRequestId: rideId,
        },
      });

      const remainingMembers = await tx.poolMember.count({
        where: {
          poolId,
        },
      });

      if (remainingMembers === 0) {
        await tx.pool.update({
          where: {
            id: poolId,
          },
          data: {
            status: PoolStatus.CANCELLED,
          },
        });
      }
    }

    await tx.rideStatusHistory.create({
      data: {
        rideRequestId: rideId,
        status: RideStatus.CANCELLED,
        note: "Ride cancelled by passenger",
      },
    });

    return cancelledRide;
  });
}