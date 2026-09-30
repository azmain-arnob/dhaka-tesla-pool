import { prisma } from "../lib/prisma";

interface CreateVehicleInput {
  driverId: string;
  name: string;
  model: string;
  capacity: number;
}

export async function createVehicle(input: CreateVehicleInput) {
  const existingVehicle = await prisma.vehicle.findUnique({
    where: {
      driverId: input.driverId,
    },
  });

  if (existingVehicle) {
    throw new Error("VEHICLE_ALREADY_EXISTS");
  }

  return prisma.vehicle.create({
    data: {
      driverId: input.driverId,
      name: input.name,
      model: input.model,
      capacity: input.capacity,
    },
  });
}

export async function getDriverVehicle(driverId: string) {
  return prisma.vehicle.findUnique({
    where: {
      driverId,
    },
  });
}

export async function updateVehicleStatus(
  driverId: string,
  isOnline: boolean,
) {
  const vehicle = await prisma.vehicle.findUnique({
    where: {
      driverId,
    },
  });

  if (!vehicle) {
    throw new Error("VEHICLE_NOT_FOUND");
  }

  return prisma.vehicle.update({
    where: {
      id: vehicle.id,
    },
    data: {
      isOnline,
    },
  });
}