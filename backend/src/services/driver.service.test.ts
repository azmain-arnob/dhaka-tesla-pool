import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
} from "vitest";
import {
  PoolStatus,
  RideStatus,
  UserRole,
} from "@prisma/client";
import { prisma } from "../lib/prisma";
import { completeRide } from "./driver.service";

const suffix = Date.now().toString();

let driverId = "";
let vehicleId = "";
let passengerId = "";
let poolId = "";
let rideId = "";

describe("Driver ride state transitions", () => {
  beforeAll(async () => {
    const driver = await prisma.user.create({
      data: {
        name: "State Test Driver",
        email: `state-driver-${suffix}@test.com`,
        passwordHash: "test-hash",
        role: UserRole.DRIVER,
      },
    });

    driverId = driver.id;

    const vehicle = await prisma.vehicle.create({
      data: {
        driverId,
        name: "State Test Tesla",
        model: "Tesla Model 3",
        capacity: 3,
        isOnline: true,
      },
    });

    vehicleId = vehicle.id;

    const passenger = await prisma.user.create({
      data: {
        name: "State Test Passenger",
        email: `state-passenger-${suffix}@test.com`,
        passwordHash: "test-hash",
        role: UserRole.PASSENGER,
      },
    });

    passengerId = passenger.id;

    const pool = await prisma.pool.create({
      data: {
        vehicleId,
        status: PoolStatus.OPEN,
      },
    });

    poolId = pool.id;

    const ride = await prisma.rideRequest.create({
      data: {
        passengerId,
        pickupZone: "Banani",
        destinationZone: "Mohakhali",
        seatsRequested: 1,
        status: RideStatus.MATCHED,
      },
    });

    rideId = ride.id;

    await prisma.poolMember.create({
      data: {
        poolId,
        rideRequestId: rideId,
        seatsAllocated: 1,
      },
    });
  });

  it("rejects completing a ride that is not STARTED", async () => {
    await expect(
      completeRide(driverId, rideId),
    ).rejects.toThrow("INVALID_RIDE_STATE");
  });
});

afterAll(async () => {
  if (rideId) {
    await prisma.rideStatusHistory.deleteMany({
      where: {
        rideRequestId: rideId,
      },
    });

    await prisma.fare.deleteMany({
      where: {
        rideRequestId: rideId,
      },
    });

    await prisma.poolMember.deleteMany({
      where: {
        rideRequestId: rideId,
      },
    });

    await prisma.rideRequest.delete({
      where: {
        id: rideId,
      },
    });
  }

  if (poolId) {
    await prisma.pool.delete({
      where: {
        id: poolId,
      },
    });
  }

  if (vehicleId) {
    await prisma.vehicle.delete({
      where: {
        id: vehicleId,
      },
    });
  }

  if (passengerId) {
    await prisma.user.delete({
      where: {
        id: passengerId,
      },
    });
  }

  if (driverId) {
    await prisma.user.delete({
      where: {
        id: driverId,
      },
    });
  }

  await prisma.$disconnect();
});