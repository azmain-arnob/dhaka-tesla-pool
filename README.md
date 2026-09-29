# Dhaka Tesla Pool

A ride-pooling MVP for Dhaka that matches passenger ride requests to Tesla vehicles while enforcing seat capacity, ride-state transitions, fare calculation, and basic concurrency safety.

## Project Status

🚧 Backend MVP implemented  
🚧 Frontend and final documentation in progress

## Problem

Dhaka passengers travelling through overlapping routes may be able to share a Tesla instead of using separate rides.

The MVP focuses on:

- Passenger ride requests
- Driver/Tesla availability
- Ride matching and pooling
- Seat-capacity enforcement
- Individual passenger fares
- Ride lifecycle management
- Ride history
- Basic authorization and ownership protection

## Tech Stack

### Backend

- Node.js
- Express.js
- TypeScript
- PostgreSQL
- Prisma ORM
- JWT authentication
- Zod validation
- Vitest
- Supertest

### Frontend

- React / Next.js
- In progress

### Infrastructure

- Docker / Docker Compose
- `.env` based configuration
- Free and open-source tooling

## Core Domain Model

The main database entities are:

- `User`
- `Vehicle`
- `RideRequest`
- `Pool`
- `PoolMember`
- `RideStatusHistory`
- `Fare`

### Relationships

- A driver can own one Tesla/vehicle.
- A passenger can create multiple ride requests.
- A vehicle can operate multiple pools over time.
- A pool contains multiple ride requests through `PoolMember`.
- Each ride request has one individual fare.
- Each ride request keeps a status history.

## Ride Lifecycle

Passenger ride lifecycle:

```text
REQUESTED
    ↓
MATCHED
    ↓
DRIVER_ARRIVED
    ↓
STARTED
    ↓
COMPLETED
```

A ride can also be cancelled while it is in a cancellable state:

```text
REQUESTED / MATCHED
        ↓
    CANCELLED
```

Invalid state transitions are rejected by the backend.

## Matching Rule

The MVP uses a simple deterministic matching rule.

Two ride requests are considered compatible for the same pool when:

1. They use the same pickup zone.
2. They use the same destination zone.
3. The requested seats fit within the Tesla's remaining capacity.
4. The Tesla is online.

For example:

```text
Nusrat:
Banani → Mohakhali

Rafiq:
Banani → Mohakhali
```

These requests can belong to the same pool if capacity is available.

For this MVP, exact pickup and destination zone matching is intentionally used instead of real route calculation.

Real routing, route overlap percentage, ETA calculation, and geographic optimization are outside the MVP scope.

## Pool Capacity

A Tesla's occupied seats are calculated from its pool members:

```text
occupiedSeats =
sum(seatsAllocated for all active pool members)
```

A new ride can only join a pool when:

```text
occupiedSeats + requestedSeats <= vehicleCapacity
```

The backend also rejects a request that requires more seats than the Tesla's total capacity.

### Concurrency Safety

Pool matching is executed inside a PostgreSQL transaction using:

- `SERIALIZABLE` transaction isolation
- Vehicle row locking with `SELECT ... FOR UPDATE`

This prevents concurrent ride requests from incorrectly exceeding the available vehicle capacity.

The backend includes an automated concurrency test covering simultaneous pool-matching requests.

For a larger distributed production system, additional database locking/queueing and horizontally scalable coordination could be considered.

## Fare Calculation

The MVP uses a simple fare model:

```text
passengerFare = baseFare + distanceCharge - poolDiscount
```

Current implementation:

```text
baseFare = 50
distanceRate = 20 per km
poolDiscount = 0
```

The estimated distance is based on predefined Dhaka zone pairs.

Example:

```text
Banani → Mohakhali
Estimated distance = 3 km

base fare = 50
distance charge = 3 × 20 = 60

1-seat fare = 110
2-seat fare = 220
```

The database stores monetary values as integer `BigInt` values rather than floating-point decimal values.

For this MVP, the values are treated as integer fare units. A production implementation can explicitly define these units as Bangladeshi poysha.

No payment gateway is required for this MVP.

## Authentication & Authorization

The backend uses JWT authentication.

Protected resources require a valid access token.

Role-based authorization is applied to driver and passenger resources.

Examples:

- Passengers can create and manage their own ride requests.
- Drivers can access driver request and ride resources.
- A passenger cannot view or cancel another passenger's ride.
- A driver cannot update a ride belonging to another driver's vehicle.

## Validation

Request payloads are validated using Zod.

Examples include:

- Ride seat count
- Pickup and destination zones
- Latitude/longitude ranges
- Vehicle capacity
- Vehicle online/offline status
- Ride IDs

Invalid requests return appropriate HTTP errors.

## API Areas

Current backend API areas include:

```text
/api/auth
/api/vehicles
/api/rides
/api/pools
/api/drivers
```

### Driver Operations

```text
GET  /api/drivers/requests
GET  /api/drivers/rides
POST /api/drivers/rides/:rideId/accept
POST /api/drivers/rides/:rideId/arrive
POST /api/drivers/rides/:rideId/start
POST /api/drivers/rides/:rideId/complete
```

### Passenger Ride Operations

```text
POST /api/rides
GET  /api/rides
GET  /api/rides/:id
POST /api/rides/:id/cancel
```

## Testing

Automated backend tests currently cover:

- Ride ownership protection
- Unauthorized ride cancellation
- Fare calculation
- Invalid driver ride-state transitions
- Pool capacity enforcement
- Concurrent pool matching

Current test result:

```text
Test Files: 3 passed
Tests:      7 passed
```

Run tests:

```bash
cd backend
npm test
```

Build the backend:

```bash
npm run build
```

## Local Backend Setup

### Requirements

- Node.js
- PostgreSQL
- npm

### Install Dependencies

```bash
cd backend
npm install
```

### Environment

Create a `.env` file based on the project's environment configuration.

Example:

```env
PORT=5000
NODE_ENV=development
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/dhaka_tesla_pool
JWT_SECRET=your-development-secret
```

Do not commit real secrets to Git.

### Generate Prisma Client

```bash
npm run prisma:generate
```

### Run Migrations

```bash
npm run prisma:migrate
```

### Start Development Server

```bash
npm run dev
```

The API runs on:

```text
http://localhost:5000
```

Health check:

```text
GET /api/health
```

## Seed / Demo Data

The final demo dataset is intended to include:

- Jashim — Driver
- Bullet — Tesla
- Nusrat — Passenger
- Rafiq — Passenger
- Shirin — Passenger

The dataset will be used to demonstrate ride requests, pooling, capacity enforcement, fare calculation, and the ride lifecycle.

## Architecture

Current backend architecture follows a simple layered structure:

```text
Client
  ↓
Routes
  ↓
Controllers
  ↓
Services
  ↓
Prisma ORM
  ↓
PostgreSQL
```

Business rules such as matching, capacity checks, fare calculation, ownership checks, and ride-state transitions are kept primarily inside the service layer rather than route handlers.

Architecture and ERD diagrams will be added under:

```text
docs/
```

## AI Usage

AI tools may be used during development for:

- debugging
- code review
- test generation
- documentation assistance
- identifying edge cases

All generated code is reviewed, tested, and adapted before being included in the project.

AI is not used as a replacement for application-level validation, database constraints, or business-logic testing.

## MVP Scope

### Included

- Authentication
- Passenger ride requests
- Driver availability
- Vehicle capacity
- Ride matching
- Pool membership
- Fare calculation
- Ride lifecycle
- Cancellation
- Ride history
- Authorization
- Capacity/concurrency protection
- Automated tests

### Not Yet Included

- Real map routing
- Real-time GPS tracking
- Payment gateway
- Production-scale distributed matching
- Advanced route optimization
- Final frontend
- Production deployment

## Git Workflow

Development uses feature branches rather than directly committing all changes to `master`.

Current development branch:

```text
master
  └── feature/backend-setup
```

Meaningful incremental commits are preferred over one large initial implementation.

## License

MIT