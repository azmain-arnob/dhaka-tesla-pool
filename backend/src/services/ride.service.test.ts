import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
} from "vitest";
import {
  RideStatus,
  UserRole,
} from "@prisma/client";
import {
  getRideById,
  cancelRide,
  createRide,
} from "./ride.service";
import { prisma } from "../lib/prisma";

const suffix = Date.now().toString();

let ownerId = "";
let otherPassengerId = "";
let rideId = "";

const fareRideIds: string[] = [];

describe("Ride ownership", () => {
  beforeAll(async () => {
    const owner = await prisma.user.create({
      data: {
        name: "Ride Owner Test",
        email: `ride-owner-${suffix}@test.com`,
        passwordHash: "test-hash",
        role: UserRole.PASSENGER,
      },
    });

    ownerId = owner.id;

    const otherPassenger = await prisma.user.create({
      data: {
        name: "Other Passenger Test",
        email: `other-passenger-${suffix}@test.com`,
        passwordHash: "test-hash",
        role: UserRole.PASSENGER,
      },
    });

    otherPassengerId = otherPassenger.id;

    const ride = await prisma.rideRequest.create({
      data: {
        passengerId: ownerId,
        pickupZone: "Banani",
        destinationZone: "Mohakhali",
        seatsRequested: 1,
        status: RideStatus.REQUESTED,
      },
    });

    rideId = ride.id;
  });

  it("prevents another passenger from viewing the ride", async () => {
    await expect(
      getRideById(rideId, otherPassengerId),
    ).rejects.toThrow("RIDE_ACCESS_DENIED");
  });

  it("prevents another passenger from cancelling the ride", async () => {
    await expect(
      cancelRide(rideId, otherPassengerId),
    ).rejects.toThrow("RIDE_ACCESS_DENIED");

    const ride = await prisma.rideRequest.findUnique({
      where: {
        id: rideId,
      },
    });

    expect(ride?.status).toBe(RideStatus.REQUESTED);
  });
});

describe("Ride fare calculation", () => {
  it("calculates the fare correctly for a single-seat ride", async () => {
    const ride = await createRide({
      passengerId: ownerId,
      pickupZone: "Banani",
      destinationZone: "Mohakhali",
      seatsRequested: 1,
    });

    expect(ride).toBeTruthy();

    if (!ride) {
      return;
    }

    fareRideIds.push(ride.id);

    expect(ride.fare).toBeTruthy();
    expect(ride.fare?.baseFare).toBe(50n);
    expect(ride.fare?.distanceCharge).toBe(60n);
    expect(ride.fare?.poolDiscount).toBe(0n);
    expect(ride.fare?.totalFare).toBe(110n);
  });

  it("calculates fare per requested seat", async () => {
    const ride = await createRide({
      passengerId: ownerId,
      pickupZone: "Banani",
      destinationZone: "Mohakhali",
      seatsRequested: 2,
    });

    expect(ride).toBeTruthy();

    if (!ride) {
      return;
    }

    fareRideIds.push(ride.id);

    expect(ride.fare).toBeTruthy();
    expect(ride.fare?.baseFare).toBe(100n);
    expect(ride.fare?.distanceCharge).toBe(60n);
    expect(ride.fare?.poolDiscount).toBe(0n);
    expect(ride.fare?.totalFare).toBe(220n);
  });
});

afterAll(async () => {
  if (fareRideIds.length > 0) {
    await prisma.rideStatusHistory.deleteMany({
      where: {
        rideRequestId: {
          in: fareRideIds,
        },
      },
    });

    await prisma.fare.deleteMany({
      where: {
        rideRequestId: {
          in: fareRideIds,
        },
      },
    });

    await prisma.rideRequest.deleteMany({
      where: {
        id: {
          in: fareRideIds,
        },
      },
    });
  }

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

    await prisma.rideRequest.delete({
      where: {
        id: rideId,
      },
    });
  }

  if (ownerId) {
    await prisma.user.delete({
      where: {
        id: ownerId,
      },
    });
  }

  if (otherPassengerId) {
    await prisma.user.delete({
      where: {
        id: otherPassengerId,
      },
    });
  }

  await prisma.$disconnect();
});