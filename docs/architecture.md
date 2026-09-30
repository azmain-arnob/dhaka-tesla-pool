# Dhaka Tesla Pool — Architecture

## 1. Project Overview

Dhaka Tesla Pool is a ride-pooling MVP for Dhaka.

The system allows passengers to request rides and share a Tesla through a deterministic pool-matching rule. Drivers can view ride requests, accept rides, manage available seats, and update the ride lifecycle.

The MVP focuses on a simple and reliable architecture without unnecessary distributed-system complexity.

---

## 2. Technology Stack

### Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS

### Backend

- Node.js
- Express
- TypeScript
- REST API

### Database

- PostgreSQL

### ORM

- Prisma

### Validation

- Zod

### Authentication

- JWT-based authentication

### Testing

- Vitest
- Supertest

### Development Environment

- Docker
- Docker Compose

---

## 3. High-Level Architecture

    Browser
       |
       | HTTP / REST API
       v
    Next.js / React Frontend
       |
       | REST API
       v
    Node.js + Express Backend
       |
       +-- Routes
       |
       +-- Controllers
       |
       +-- Services / Business Logic
       |
       +-- Prisma ORM
       |
       v
    PostgreSQL Database

The frontend communicates with the backend through REST APIs.

The backend is organized into separate layers so that HTTP handling, business rules, and database access remain separated.

---

## 4. Backend Layered Architecture

### Routes

Routes define the available API endpoints and connect them to controllers.

Main route groups:

- `/api/auth`
- `/api/rides`
- `/api/pools`
- `/api/drivers`
- `/api/vehicles`

Authentication middleware is applied to protected routes.

### Controllers

Controllers handle HTTP-specific responsibilities:

- Read request parameters and request bodies
- Call the appropriate service
- Convert service errors into HTTP responses
- Return JSON responses

Controllers do not contain the main business rules.

### Services

Services contain the core application and business logic.

Examples:

- Ride creation and cancellation
- Fare calculation
- Pool matching
- Pool capacity validation
- Driver ride lifecycle
- Passenger ownership checks
- Ride state transitions

This keeps important business rules independent from the HTTP layer.

### Prisma

Prisma is used as the database access layer.

Services use Prisma to:

- Create and update records
- Query related entities
- Execute database transactions
- Enforce consistency during pool matching

### PostgreSQL

PostgreSQL stores the persistent application data.

The main entities are:

- Users
- Vehicles
- Ride Requests
- Pools
- Pool Members
- Ride Status History
- Fares

The database schema and relationships are documented in `docs/erd.md`.

---

## 5. Request Flow

A typical passenger request follows this flow:

    Browser
       |
       | HTTP Request
       v
    Route
       |
       v
    Authentication Middleware
       |
       v
    Controller
       |
       v
    Service
       |
       v
    Prisma
       |
       v
    PostgreSQL
       |
       v
    Service
       |
       v
    Controller
       |
       | JSON Response
       v
    Browser

This structure keeps transport-level concerns separate from application business logic and database operations.

---

## 6. Authentication and Authorization

The backend uses JWT-based authentication.

After successful registration or login, the client receives a JWT containing the authenticated user's identity.

Protected requests use the token for authentication.

Authorization is handled according to the user's role.

### Passenger

- Create ride
- View own rides
- View own ride details
- Cancel own ride

### Driver

- View ride requests
- Accept rides
- View assigned rides
- Manage own vehicle
- Update assigned ride lifecycle

Passenger ownership checks ensure that one passenger cannot view or modify another passenger's ride.

Driver authorization checks ensure that a driver can only manage rides associated with their vehicle.

---

## 7. Ride Lifecycle

A ride request follows a controlled state transition flow:

    REQUESTED
        |
        v
    MATCHED
        |
        v
    DRIVER_ARRIVED
        |
        v
    STARTED
        |
        v
    COMPLETED

A ride can also be cancelled while it is in a cancellable state:

    REQUESTED ---------> CANCELLED

    MATCHED ------------> CANCELLED

Invalid state transitions are rejected by the service layer.

For example, a ride cannot move directly from `MATCHED` to `COMPLETED` because the driver must first arrive and start the ride.

Every state change is recorded in `RideStatusHistory`.

---

## 8. Pool Lifecycle

A pool represents a shared ride operated by one Tesla.

The pool lifecycle is:

    OPEN
      |
      v
    STARTED
      |
      v
    COMPLETED

A pool can also be cancelled when it no longer contains active members:

    OPEN
      |
      v
    CANCELLED

The pool status is maintained separately from individual ride status.

Multiple passenger rides can belong to the same pool while each passenger maintains their own ride lifecycle.

---

## 9. Pool Matching

The MVP uses a deterministic matching rule.

A requested ride can join an existing open pool when:

1. The vehicle is online.
2. The ride is still in `REQUESTED` state.
3. The pickup zone matches the existing pool route.
4. The destination zone matches the existing pool route.
5. Sufficient vehicle capacity remains.

For the current MVP, route compatibility therefore uses exact pickup and destination zone matching rather than real road routing.

Example:

    Existing Pool
    Pickup: Banani
    Destination: Mohakhali

    New Request
    Pickup: Banani
    Destination: Mohakhali

    Result:
    Compatible -> Join existing pool

If no compatible open pool exists, a new pool can be created when the requested seat count does not exceed the vehicle capacity.

This rule is simple, deterministic, and does not require a paid mapping or routing service.

---

## 10. Pool Capacity

Pool occupancy is calculated from the allocated seats of its members:

    occupiedSeats =
    sum(seats_allocated for all pool members)

A ride can join a pool only when:

    occupiedSeats + requestedSeats <= vehicle.capacity

The backend also rejects a ride request when:

    requestedSeats > vehicle.capacity

For example, if a Tesla has capacity `3`:

    Passenger A = 2 seats
    Passenger B = 1 seat

    Occupied = 3

    Passenger C = 1 seat
    Result = rejected

This rule is enforced by the pool-matching service and tested automatically.

---

## 11. Concurrency Protection

Pool matching is a business-critical operation because multiple passengers may attempt to claim the same remaining seats at the same time.

The matching operation uses a PostgreSQL transaction with `SERIALIZABLE` isolation.

The selected vehicle row is also locked using `SELECT ... FOR UPDATE`.

The capacity is checked and the pool membership is created inside the same transaction.

Therefore, when a Tesla has one remaining seat and two requests attempt to claim that seat concurrently, the database transaction prevents both requests from successfully allocating the same seat.

The backend includes an automated concurrency test for this scenario.

---

## 12. Fare Calculation

The MVP uses a simple deterministic fare model:

    passengerFare =
    baseFare
    + distanceCharge
    - poolDiscount

The current implementation uses:

    Base fare       = 50
    Distance rate   = 20 per km
    Pool discount   = 0

Distance is estimated using predefined Dhaka zone distances rather than a real-time routing service.

For example:

    Banani -> Mohakhali
    Distance = 3 km

    Base fare       = 50
    Distance charge = 3 × 20 = 60

    Total            = 110

For multiple requested seats, the base fare and final fare are calculated according to the requested seat count.

Fare values are stored as integer `BigInt` values to avoid floating-point precision problems.

No payment gateway is required for the MVP.

---

## 13. Data Model

The main database entities are:

    Users
      |
      +---- Vehicles
      |
      +---- Ride Requests
                 |
                 +---- Pool Members ---- Pools ---- Vehicles
                 |
                 +---- Ride Status History
                 |
                 +---- Fares

Important relationships include:

- One driver can own at most one vehicle.
- One passenger can create many ride requests.
- One vehicle can operate many pools over time.
- One pool can contain multiple pool members.
- One ride request can belong to at most one pool.
- One ride request can have multiple status-history records.
- One ride request has exactly one fare record.

The complete database structure is documented in `docs/erd.md`.

---

## 14. Data Consistency

Business-critical operations are performed using database transactions.

Examples include:

- Creating a ride with its initial status history and fare
- Matching a ride to a pool
- Cancelling a pooled ride
- Updating ride lifecycle state
- Completing a pool when all of its members have finished
- Removing a cancelled ride from a pool

Database constraints additionally protect important relationships.

Examples:

- `User.email` is unique.
- `Vehicle.driverId` is unique.
- `PoolMember.rideRequestId` is unique.
- `Fare.rideRequestId` is unique.

These constraints prevent duplicate or invalid relationships at the database level.

---

## 15. Ride Ownership

Each ride request references its passenger through:

    ride_requests.passenger_id -> users.id

Passenger authorization is enforced in the service layer.

A passenger can only:

- View their own rides
- View their own ride details
- Cancel their own rides

Attempting to access or modify another passenger's ride is rejected.

Drivers are similarly restricted to rides associated with their vehicle.

---

## 16. Error Handling

Services use explicit business error codes such as:

- `RIDE_NOT_FOUND`
- `RIDE_ACCESS_DENIED`
- `RIDE_NOT_REQUESTED`
- `NO_ONLINE_VEHICLE`
- `VEHICLE_NOT_AVAILABLE`
- `NO_MATCHING_POOL_CAPACITY`
- `INSUFFICIENT_VEHICLE_CAPACITY`
- `INVALID_RIDE_STATE`
- `RIDE_CANNOT_BE_CANCELLED`
- `VEHICLE_NOT_FOUND`

Controllers translate these service errors into appropriate HTTP responses.

This keeps business logic separate from HTTP-specific response handling.

---

## 17. Validation

Request validation is handled at the API boundary before business operations are executed.

Important fields include:

- Email
- Password
- User role
- Pickup zone
- Destination zone
- Requested seat count
- Vehicle capacity
- Ride identifiers

Business rules are then enforced by the service layer.

This creates multiple levels of protection:

    Request Validation
            |
            v
    Business Rules
            |
            v
    Database Constraints

---

## 18. Testing Architecture

The backend uses Vitest for service-level business logic tests.

The current tests cover:

- Ride creation
- Fare calculation
- Passenger ride ownership
- Ride cancellation
- Pool capacity enforcement
- Concurrent pool matching
- Invalid ride state transitions

Important business scenarios include:

### Capacity

A vehicle cannot have more allocated seats than its capacity.

### Concurrency

Two concurrent requests cannot successfully consume the same remaining vehicle capacity.

### State Transitions

Invalid ride lifecycle transitions are rejected.

### Ownership

A passenger cannot view or cancel another passenger's ride.

### Fare

Fare values are calculated consistently from the configured fare model.

---

## 19. Development Environment

The project is designed to run locally using free and open-source development tools.

Main development components:

- Node.js
- PostgreSQL
- Prisma
- Docker
- Docker Compose

Environment-specific configuration is provided through `.env`.

An `.env.example` file documents the required environment variables without exposing secrets.

---

## 20. Docker Architecture

Docker Compose provides a local PostgreSQL service.

    Docker Compose
    |
    +-- PostgreSQL
          |
          +-- dhaka_tesla_pool

The Node.js backend can connect to the PostgreSQL database through the configured `DATABASE_URL`.

The application can also use an existing local PostgreSQL installation during development.

---

## 21. Security Considerations

The MVP applies several basic security practices:

- Passwords are stored as hashes rather than plaintext.
- JWT is used for authenticated API access.
- Protected routes require authentication.
- Role-based authorization is applied to passenger and driver operations.
- Passenger ownership is checked before accessing or modifying rides.
- Driver ownership is checked before managing vehicle-associated rides.
- Environment secrets are kept outside the repository.
- Database queries are executed through Prisma rather than manually concatenated SQL.
- Business-critical state changes use database transactions.

---

## 22. Logging and Error Visibility

The backend logs important server-side errors during development.

Examples include:

- Create ride errors
- Match ride errors
- Driver action errors
- Vehicle action errors

Client responses expose controlled error messages while detailed server-side errors remain available for debugging.

A production deployment can later add structured logging and centralized observability without changing the core application architecture.

---

## 23. API Organization

The backend REST API is organized around the main domain resources.

### Authentication

`/api/auth`

- Registration
- Login

### Rides

`/api/rides`

- Create ride
- List passenger rides
- Get ride
- Cancel ride

### Pools

`/api/pools`

- Match ride to pool

### Drivers

`/api/drivers`

- View requests
- View assigned rides
- Accept ride
- Mark driver arrived
- Start ride
- Complete ride

### Vehicles

`/api/vehicles`

- Create vehicle
- View own vehicle
- Update online/offline status

This resource-oriented organization keeps the API aligned with the domain model.

---

## 24. Current MVP Scope

The current architecture intentionally does not include:

- Real-time GPS tracking
- Real road routing
- Payment gateway integration
- Distributed service architecture
- External message queues
- Complex caching infrastructure
- Production-scale geospatial matching
- Advanced dynamic pricing

These features are outside the MVP requirements.

The current architecture is designed so that these capabilities can be added later without replacing the core ride, pool, vehicle, and passenger domain model.

---

## 25. Future Scaling Considerations

The current MVP uses PostgreSQL transactions and row locking to protect pool capacity.

If the system grows significantly, additional infrastructure could be introduced, such as:

- Redis for caching or coordination
- Background job processing
- Real-time communication
- Dedicated routing/geospatial services
- Structured centralized logging
- Metrics and monitoring
- Horizontal backend scaling

These are intentionally outside the current MVP to keep the system simple and testable.

---

## 26. Architecture Goals

The architecture prioritizes:

- Clear separation of responsibilities
- Reliable relational data modeling
- Explicit business rules
- Transactional consistency
- Simple REST APIs
- Testable business logic
- Basic authentication and authorization
- Data ownership protection
- Minimal infrastructure complexity
- Free and open-source development tooling

The design provides a simple foundation for the Dhaka Tesla Pool MVP while leaving clear extension points for future functionality.