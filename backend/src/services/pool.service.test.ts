import {
  afterAll,
  afterEach,
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
const poolIds: string[] = [];

const originalVehicleStatuses = new Map<string, boolean>();

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

async function cleanupTestData() {
  if (rideIds.length > 0) {
    await prisma.poolMember.deleteMany({
      where: {
        rideRequestId: {
          in: rideIds,
        },
      },
    });

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

  if (poolIds.length > 0) {
    await prisma.poolMember.deleteMany({
      where: {
        poolId: {
          in: poolIds,
        },
      },
    });

    await prisma.pool.deleteMany({
      where: {
        id: {
          in: poolIds,
        },
      },
    });
  }

  rideIds.length = 0;
  poolIds.length = 0;
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
  await cleanupTestData();
});

describe("Pooled fare calculation", () => {
  it("applies the pool discount to both Nusrat and Rafiq", async () => {
    const nusrat = await createPassenger(
      `nusrat-${suffix}@test.com`,
    );

    const rafiq = await createPassenger(
      `rafiq-${suffix}@test.com`,
    );

    const nusratRide = await createRide(nusrat.id);
    const rafiqRide = await createRide(rafiq.id);

    await prisma.fare.create({
      data: {
        rideRequestId: nusratRide.id,
        baseFare: 50n,
        distanceCharge: 60n,
        poolDiscount: 0n,
        totalFare: 110n,
      },
    });

    await prisma.fare.create({
      data: {
        rideRequestId: rafiqRide.id,
        baseFare: 50n,
        distanceCharge: 60n,
        poolDiscount: 0n,
        totalFare: 110n,
      },
    });

    const firstPool = await matchRideToPool(
      nusratRide.id,
    );

    expect(firstPool).toBeTruthy();

    if (!firstPool) {
      return;
    }

    poolIds.push(firstPool.id);

    const secondPool = await matchRideToPool(
      rafiqRide.id,
    );

    expect(secondPool).toBeTruthy();

    const fares = await prisma.fare.findMany({
      where: {
        rideRequestId: {
          in: [nusratRide.id, rafiqRide.id],
        },
      },
    });

    expect(fares).toHaveLength(2);

    for (const fare of fares) {
      expect(fare.baseFare).toBe(50n);
      expect(fare.distanceCharge).toBe(60n);
      expect(fare.poolDiscount).toBe(22n);
      expect(fare.totalFare).toBe(88n);
    }
  });
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

    if (!firstPool) {
      return;
    }

    poolIds.push(firstPool.id);

    await matchRideToPool(rides[1].id);
    await matchRideToPool(rides[2].id);

    await expect(
      matchRideToPool(rides[3].id),
    ).rejects.toThrow("NO_MATCHING_POOL_CAPACITY");

    const members = await prisma.poolMember.findMany({
      where: {
        poolId: firstPool.id,
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

    const pools = await prisma.pool.findMany({
      where: {
        vehicleId,
      },
      select: {
        id: true,
      },
    });

    for (const pool of pools) {
      if (!poolIds.includes(pool.id)) {
        poolIds.push(pool.id);
      }
    }

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

    // The important invariant from the challenge:
    // concurrent matching must never exceed the vehicle capacity.
    expect(occupiedSeats).toBeLessThanOrEqual(3);

    // Every successful match must correspond to an actual pool member.
    expect(members.length).toBeGreaterThanOrEqual(
      successful.length,
    );
  });
});

afterAll(async () => {
  await cleanupTestData();

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