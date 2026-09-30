-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('PASSENGER', 'DRIVER');

-- CreateEnum
CREATE TYPE "RideStatus" AS ENUM ('REQUESTED', 'MATCHED', 'DRIVER_ARRIVED', 'STARTED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PoolStatus" AS ENUM ('OPEN', 'STARTED', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "role" "UserRole" NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicles" (
    "id" UUID NOT NULL,
    "driver_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "model" VARCHAR(100) NOT NULL,
    "capacity" INTEGER NOT NULL,
    "is_online" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ride_requests" (
    "id" UUID NOT NULL,
    "passenger_id" UUID NOT NULL,
    "pickup_zone" VARCHAR(100) NOT NULL,
    "destination_zone" VARCHAR(100) NOT NULL,
    "pickup_lat" DECIMAL(9,6),
    "pickup_lng" DECIMAL(9,6),
    "destination_lat" DECIMAL(9,6),
    "destination_lng" DECIMAL(9,6),
    "seats_requested" INTEGER NOT NULL,
    "status" "RideStatus" NOT NULL DEFAULT 'REQUESTED',
    "requested_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "cancelled_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),

    CONSTRAINT "ride_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pools" (
    "id" UUID NOT NULL,
    "vehicle_id" UUID NOT NULL,
    "status" "PoolStatus" NOT NULL DEFAULT 'OPEN',
    "started_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "pools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pool_members" (
    "id" UUID NOT NULL,
    "pool_id" UUID NOT NULL,
    "ride_request_id" UUID NOT NULL,
    "seats_allocated" INTEGER NOT NULL,
    "joined_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pool_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ride_status_history" (
    "id" UUID NOT NULL,
    "ride_request_id" UUID NOT NULL,
    "status" "RideStatus" NOT NULL,
    "changed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,

    CONSTRAINT "ride_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fares" (
    "id" UUID NOT NULL,
    "ride_request_id" UUID NOT NULL,
    "base_fare" BIGINT NOT NULL,
    "distance_charge" BIGINT NOT NULL,
    "pool_discount" BIGINT NOT NULL,
    "total_fare" BIGINT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "fares_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_driver_id_key" ON "vehicles"("driver_id");

-- CreateIndex
CREATE INDEX "vehicles_is_online_idx" ON "vehicles"("is_online");

-- CreateIndex
CREATE INDEX "ride_requests_passenger_id_idx" ON "ride_requests"("passenger_id");

-- CreateIndex
CREATE INDEX "ride_requests_status_idx" ON "ride_requests"("status");

-- CreateIndex
CREATE INDEX "ride_requests_requested_at_idx" ON "ride_requests"("requested_at");

-- CreateIndex
CREATE INDEX "ride_requests_status_requested_at_idx" ON "ride_requests"("status", "requested_at");

-- CreateIndex
CREATE INDEX "pools_vehicle_id_idx" ON "pools"("vehicle_id");

-- CreateIndex
CREATE INDEX "pools_status_idx" ON "pools"("status");

-- CreateIndex
CREATE INDEX "pools_vehicle_id_status_idx" ON "pools"("vehicle_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "pool_members_ride_request_id_key" ON "pool_members"("ride_request_id");

-- CreateIndex
CREATE INDEX "pool_members_pool_id_idx" ON "pool_members"("pool_id");

-- CreateIndex
CREATE UNIQUE INDEX "pool_members_pool_id_ride_request_id_key" ON "pool_members"("pool_id", "ride_request_id");

-- CreateIndex
CREATE INDEX "ride_status_history_ride_request_id_idx" ON "ride_status_history"("ride_request_id");

-- CreateIndex
CREATE INDEX "ride_status_history_ride_request_id_changed_at_idx" ON "ride_status_history"("ride_request_id", "changed_at");

-- CreateIndex
CREATE UNIQUE INDEX "fares_ride_request_id_key" ON "fares"("ride_request_id");

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ride_requests" ADD CONSTRAINT "ride_requests_passenger_id_fkey" FOREIGN KEY ("passenger_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pools" ADD CONSTRAINT "pools_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pool_members" ADD CONSTRAINT "pool_members_pool_id_fkey" FOREIGN KEY ("pool_id") REFERENCES "pools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pool_members" ADD CONSTRAINT "pool_members_ride_request_id_fkey" FOREIGN KEY ("ride_request_id") REFERENCES "ride_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ride_status_history" ADD CONSTRAINT "ride_status_history_ride_request_id_fkey" FOREIGN KEY ("ride_request_id") REFERENCES "ride_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fares" ADD CONSTRAINT "fares_ride_request_id_fkey" FOREIGN KEY ("ride_request_id") REFERENCES "ride_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
