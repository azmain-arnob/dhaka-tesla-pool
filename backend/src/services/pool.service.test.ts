import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
} from "vitest";
import {
  RideStatus,
  UserRole,
} from "@prisma/client";
import { prisma } from "../lib/prisma";
import { matchRideToPool } from "./pool.service";

const suffix = Date.now().toString();

const driverEmail = `test-driver-${suffix}@test.com`;

const passengerEmails = [
  `test-passenger-1-${suffix}@test.com`,
  `test-passenger-2-${suffix}@test.com`,
  `test-passenger-3-${suffix}@test.com`,
  `test-passenger-4-${suffix}@test.com`,
];

let driverId = "";
let vehicleId = "";

const passengerIds: string[] = [];
const rideIds: string[] = [];

const originalVehicleStatuses = new Map<
  string,
  boolean
>();

async function createPassenger(email: string) {
  const user = await prisma.user.create({
    data: {
      name: "Pool Test Passenger",
      email,
      passwordHash: "test-hash",
      role: UserRole.PASSENGER,
    },
  });

  passengerIds.push(user.id);

  return user;
}

async function createRide(passengerId: string) {
  const ride = await prisma.rideRequest.create({
    data: {
      passengerId,
      pickupZone: "Banani",
      destinationZone: "Mohakhali",
      seatsRequested: 1,
      status: RideStatus.REQUESTED,
    },
  });

  rideIds.push(ride.id);

  return ride;
}

beforeAll(async () => {
  const vehicles = await prisma.vehicle.findMany({
    select: {
      id: true,
      isOnline: true,
    },
  });

  for (const vehicle of vehicles) {
    originalVehicleStatuses.set(
      vehicle.id,
      vehicle.isOnline,
    );
  }

  await prisma.vehicle.updateMany({
    data: {
      isOnline: false,
    },
  });

  const driver = await prisma.user.create({
    data: {
      name: "Pool Test Driver",
      email: driverEmail,
      passwordHash: "test-hash",
      role: UserRole.DRIVER,
    },
  });

  driverId = driver.id;

  const vehicle = await prisma.vehicle.create({
    data: {
      driverId,
      name: "Test Tesla",
      model: "Tesla Model 3",
      capacity: 3,
      isOnline: true,
    },
  });

  vehicleId = vehicle.id;
});

afterEach(async () => {
  await prisma.poolMember.deleteMany({
    where: {
      pool: {
        vehicleId,
      },
    },
  });

  await prisma.pool.deleteMany({
    where: {
      vehicleId,
    },
  });

  if (rideIds.length > 0) {
    await prisma.rideStatusHistory.deleteMany({
      where: {
        rideRequestId: {
          in: rideIds,
        },
      },
    });

    await prisma.fare.deleteMany({
      where: {
        rideRequestId: {
          in: rideIds,
        },
      },
    });

    await prisma.rideRequest.deleteMany({
      where: {
        id: {
          in: rideIds,
        },
      },
    });
  }

  rideIds.length = 0;
});

describe("Pool capacity and concurrency", () => {
  it("never allows pool occupancy to exceed vehicle capacity", async () => {
    const passengers = await Promise.all(
      passengerEmails.map(createPassenger),
    );

    const rides = await Promise.all(
      passengers.map((passenger) =>
        createRide(passenger.id),
      ),
    );

    const firstPool = await matchRideToPool(
      rides[0].id,
    );

    expect(firstPool).toBeTruthy();

    await matchRideToPool(rides[1].id);
    await matchRideToPool(rides[2].id);

    await expect(
      matchRideToPool(rides[3].id),
    ).rejects.toThrow("NO_MATCHING_POOL_CAPACITY");

    const members = await prisma.poolMember.findMany({
      where: {
        pool: {
          vehicleId,
        },
      },
    });

    const occupiedSeats = members.reduce(
      (total, member) =>
        total + member.seatsAllocated,
      0,
    );

    expect(occupiedSeats).toBe(3);
    expect(occupiedSeats).toBeLessThanOrEqual(3);
  });

  it("prevents concurrent requests from exceeding pool capacity", async () => {
    const passengerA = await createPassenger(
      `concurrent-a-${suffix}@test.com`,
    );

    const passengerB = await createPassenger(
      `concurrent-b-${suffix}@test.com`,
    );

    const rideA = await createRide(passengerA.id);
    const rideB = await createRide(passengerB.id);

    const results = await Promise.allSettled([
      matchRideToPool(rideA.id),
      matchRideToPool(rideB.id),
    ]);

    const successful = results.filter(
      (result) => result.status === "fulfilled",
    );

    expect(successful.length).toBeGreaterThanOrEqual(1);
    expect(successful.length).toBeLessThanOrEqual(2);

    const members = await prisma.poolMember.findMany({
      where: {
        pool: {
          vehicleId,
        },
      },
    });

    const occupiedSeats = members.reduce(
      (total, member) =>
        total + member.seatsAllocated,
      0,
    );

    expect(occupiedSeats).toBe(successful.length);
    expect(occupiedSeats).toBeLessThanOrEqual(3);
  });
});

afterAll(async () => {
  await prisma.poolMember.deleteMany({
    where: {
      pool: {
        vehicleId,
      },
    },
  });

  await prisma.pool.deleteMany({
    where: {
      vehicleId,
    },
  });

  if (rideIds.length > 0) {
    await prisma.rideStatusHistory.deleteMany({
      where: {
        rideRequestId: {
          in: rideIds,
        },
      },
    });

    await prisma.fare.deleteMany({
      where: {
        rideRequestId: {
          in: rideIds,
        },
      },
    });

    await prisma.rideRequest.deleteMany({
      where: {
        id: {
          in: rideIds,
        },
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

  if (driverId) {
    await prisma.user.delete({
      where: {
        id: driverId,
      },
    });
  }

  if (passengerIds.length > 0) {
    await prisma.user.deleteMany({
      where: {
        id: {
          in: passengerIds,
        },
      },
    });
  }

  for (const [
    id,
    isOnline,
  ] of originalVehicleStatuses) {
    await prisma.vehicle.update({
      where: { id },
      data: { isOnline },
    });
  }

  await prisma.$disconnect();
});