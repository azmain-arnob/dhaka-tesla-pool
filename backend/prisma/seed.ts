import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import "dotenv/config";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const adapter = new PrismaPg({
  connectionString,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const passwordHash = await bcrypt.hash("12345678", 10);

  // Clean demo data so the seed can be safely re-run.
  await prisma.rideStatusHistory.deleteMany();
  await prisma.poolMember.deleteMany();
  await prisma.fare.deleteMany();
  await prisma.rideRequest.deleteMany();
  await prisma.pool.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.user.deleteMany();

  // Driver
  const driver = await prisma.user.create({
    data: {
      name: "Jashim",
      email: "jashim@teslapool.test",
      passwordHash,
      role: UserRole.DRIVER,
    },
  });

  // Tesla
  await prisma.vehicle.create({
    data: {
      driverId: driver.id,
      name: "Bullet",
      model: "Tesla Model 3",
      capacity: 3,
      isOnline: true,
    },
  });

  // Passengers
  await prisma.user.createMany({
    data: [
      {
        name: "Nusrat",
        email: "nusrat@teslapool.test",
        passwordHash,
        role: UserRole.PASSENGER,
      },
      {
        name: "Rafiq",
        email: "rafiq@teslapool.test",
        passwordHash,
        role: UserRole.PASSENGER,
      },
      {
        name: "Shirin",
        email: "shirin@teslapool.test",
        passwordHash,
        role: UserRole.PASSENGER,
      },
    ],
  });

  console.log("Seed completed successfully.");
  console.log("Driver: Jashim / jashim@teslapool.test / 12345678");
  console.log("Tesla: Bullet / capacity 3");
  console.log("Passengers:");
  console.log("Nusrat / nusrat@teslapool.test / 12345678");
  console.log("Rafiq / rafiq@teslapool.test / 12345678");
  console.log("Shirin / shirin@teslapool.test / 12345678");
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });