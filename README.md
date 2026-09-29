# Dhaka Tesla Pool

A ride-pooling MVP for Dhaka that matches passenger ride requests to Tesla vehicles while enforcing seat capacity, ride-state transitions, fare calculation, authorization, and basic concurrency safety.

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
- Concurrent pool-capacity protection

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

The MVP uses a simple deterministic matching rule designed to demonstrate compatible ride pooling without requiring real map routing.

Two ride requests can join the same open pool when:

1. They use the same pickup zone.
2. Their destinations are the same or belong to a predefined compatible destination pair.
3. The requested seats fit within the Tesla's remaining capacity.
4. The Tesla is online.

The current compatible destination pairs include:

```text
Mohakhali ↔ Gulshan
Gulshan ↔ Badda
Mohakhali ↔ Badda
```

For example:

```text
Nusrat:
Banani → Mohakhali

Rafiq:
Banani → Gulshan
```

These requests can belong to the same pool because they share the same pickup zone and their destinations are defined as compatible.

This provides the required overlapping-but-not-identical trip example while keeping the matching logic deterministic and easy to test.

For this MVP, predefined zones and compatibility rules are intentionally used instead of real route calculation.

Real routing, route-overlap percentage, ETA calculation, and geographic optimization are outside the MVP scope.

## Pool Capacity

A Tesla's occupied seats are calculated from its pool members:

```text
occupiedSeats =
sum(seatsAllocated for all pool members)
```

A new ride can only join a pool when:

```text
occupiedSeats + requestedSeats <= vehicleCapacity
```

The backend also rejects a request that requires more seats than the Tesla's total capacity.

For example, with Bullet's capacity of 3:

```text
Nusrat = 1 seat
Rafiq  = 1 seat

Occupied = 2 / 3
Remaining = 1
```

A further request requiring 2 seats cannot join that pool.

## Concurrency Safety

Pool matching is executed inside a PostgreSQL transaction using:

- `SERIALIZABLE` transaction isolation
- Vehicle row locking with `SELECT ... FOR UPDATE`

The capacity check and pool membership creation happen inside the same transaction.

This prevents concurrent ride requests from incorrectly consuming the same remaining vehicle capacity.

The backend includes an automated concurrency test covering simultaneous pool-matching requests.

For a larger distributed production system, additional database locking, queueing, and horizontally scalable coordination could be considered.

## Fare Calculation

The MVP uses a simple fare model:

```text
passengerFare =
baseFare + distanceCharge - poolDiscount
```

Current implementation:

```text
baseFare = 50
distanceRate = 20 per km
poolDiscount = 20% of the pre-discount fare when the ride is pooled
```

The estimated distance is based on predefined Dhaka zone pairs.

Example before pooling:

```text
Banani → Mohakhali

Estimated distance = 3 km

base fare = 50
distance charge = 3 × 20 = 60

1-seat fare = 110
2-seat fare = 220
```

When a ride becomes part of a pool:

```text
Pre-discount fare = 110
Pool discount = 22
Final fare = 88
```

When a second passenger joins an existing pool, the pool discount is applied to all members of that pool.

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

### Pool Operations

```text
POST /api/pools/rides/:rideId/match
```

The pool matching endpoint applies the deterministic compatibility rule and enforces vehicle capacity.

## Testing

Automated backend tests currently cover:

- Ride ownership protection
- Unauthorized ride cancellation
- Fare calculation
- Multiple-seat fare calculation
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

### Seed Demo Data

```bash
npx prisma db seed
```

The seed creates:

- Jashim — Driver
- Bullet — Tesla Model 3
- Nusrat — Passenger
- Rafiq — Passenger
- Shirin — Passenger

The demo password for the seeded accounts is:

```text
12345678
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

## Demo Flow

The backend can demonstrate the required pooling scenario using the seeded users.

Example:

```text
Jashim
  └── Bullet
      └── Capacity: 3

Nusrat
  └── Banani → Mohakhali
      └── 1 seat

Rafiq
  └── Banani → Gulshan
      └── 1 seat
```

Both rides can be matched into the same pool:

```text
Bullet Pool
├── Nusrat — 1 seat — fare 88
└── Rafiq  — 1 seat — fare 88

Occupied: 2 / 3
Remaining: 1
```

This demonstrates:

- Overlapping but non-identical trips
- Pool membership
- Individual passenger fares
- Pool discount
- Capacity enforcement

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

Architecture and ERD diagrams are maintained under:

```text
docs/
```

## AI Usage

AI tools may be used during development for:

- Debugging
- Code review
- Test generation
- Documentation assistance
- Identifying edge cases

All generated code is reviewed, tested, and adapted before being included in the project.

AI is not used as a replacement for application-level validation, database constraints, or business-logic testing.

## MVP Scope

### Included

- Authentication
- Passenger ride requests
- Driver availability
- Vehicle capacity
- Ride matching
- Compatible route pooling
- Pool membership
- Fare calculation
- Pool discounts
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