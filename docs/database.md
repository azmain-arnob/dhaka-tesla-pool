# Dhaka Tesla Pool — Database Design

## 1. Overview

Dhaka Tesla Pool uses a relational PostgreSQL database to manage passengers, drivers, vehicles, ride requests, shared pools, fares, and ride status history.

The MVP is designed around three main actors:

- **Passenger** — requests and manages rides.
- **Driver / Tesla** — operates a vehicle and accepts pooled rides.
- **Pool / Ride** — combines compatible passenger requests while ensuring that the vehicle's seat capacity is never exceeded.

The database is designed to keep completed and cancelled ride records for historical purposes while maintaining clear relationships and constraints between resources.

---

## 2. Database Technology

- **Database:** PostgreSQL
- **ORM:** Prisma
- **Primary Key:** UUID
- **Money Storage:** BIGINT in poysha
- **Timestamps:** PostgreSQL timestamp with time zone
- **Geography:** Simple Dhaka zones with optional latitude/longitude coordinates

---

## 3. Core Tables

The MVP contains seven core tables:

1. `users`
2. `vehicles`
3. `ride_requests`
4. `pools`
5. `pool_members`
6. `ride_status_history`
7. `fares`

---

# 4. Entity Relationship Overview

    ┌─────────────────┐
    │      users      │
    │─────────────────│
    │ id (PK)         │
    │ name            │
    │ email           │
    │ password_hash   │
    │ role            │
    └────────┬────────┘
             │
       ┌─────┴──────────────┐
       │                    │
     1 : 1                1 : N
       │                    │
       ▼                    ▼
    ┌──────────────┐   ┌─────────────────┐
    │   vehicles   │   │  ride_requests  │
    │──────────────│   │─────────────────│
    │ id (PK)      │   │ id (PK)         │
    │ driver_id FK │   │ passenger_id FK │
    │ name         │   │ pickup          │
    │ model        │   │ destination     │
    │ capacity     │   │ seats_requested │
    │ is_online    │   │ status          │
    └──────┬───────┘   └────────┬────────┘
           │                    │
         1 : N                  │
           │                    │
           ▼                    │
    ┌──────────────┐            │
    │    pools     │            │
    │──────────────│            │
    │ id (PK)      │            │
    │ vehicle_id FK│            │
    │ status       │            │
    └──────┬───────┘            │
           │                    │
         1 : N                  │
           │                    │
           └─────────┬──────────┘
                     ▼
              ┌──────────────────────┐
              │    pool_members      │
              │──────────────────────│
              │ id (PK)              │
              │ pool_id FK           │
              │ ride_request_id FK   │
              │ seats_allocated      │
              └──────────┬───────────┘
                         │
              ┌──────────┴──────────┐
              │                     │
              ▼                     ▼
    ┌────────────────────┐   ┌──────────────┐
    │ ride_status_history│   │    fares     │
    │────────────────────│   │──────────────│
    │ id (PK)            │   │ id (PK)      │
    │ ride_request_id    │   │ ride_request │
    │ status             │   │ base_fare    │
    │ changed_at         │   │ distance     │
    │ note               │   │ discount     │
    └────────────────────┘   │ total_fare   │
                             └──────────────┘

---

# 5. Table: `users`

Stores all registered passengers and drivers.

## Fields

| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK | Unique user identifier |
| `name` | VARCHAR(100) | NOT NULL | User's name |
| `email` | VARCHAR(255) | UNIQUE, NOT NULL | Login email |
| `password_hash` | VARCHAR(255) | NOT NULL | Hashed password |
| `role` | ENUM | NOT NULL | `PASSENGER` or `DRIVER` |
| `created_at` | TIMESTAMPTZ | NOT NULL | Account creation time |
| `updated_at` | TIMESTAMPTZ | NOT NULL | Last update time |

## Role Values

    PASSENGER
    DRIVER

## Relationships

- One user can be a passenger and have many ride requests.
- One driver can own one vehicle in the MVP.
- A user's role determines which operations they are authorized to perform.

## Indexes

- Unique index on `email`
- Index on `role`

---

# 6. Table: `vehicles`

Stores Tesla/vehicle information operated by drivers.

## Fields

| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK | Unique vehicle identifier |
| `driver_id` | UUID | FK, UNIQUE | Driver who owns the vehicle |
| `name` | VARCHAR(100) | NOT NULL | Vehicle display name |
| `model` | VARCHAR(100) | NOT NULL | Vehicle model |
| `capacity` | INTEGER | > 0 | Maximum passenger seat capacity |
| `is_online` | BOOLEAN | DEFAULT FALSE | Driver availability |
| `created_at` | TIMESTAMPTZ | NOT NULL | Creation time |
| `updated_at` | TIMESTAMPTZ | NOT NULL | Last update time |

## Relationships

    users (DRIVER) 1 ───── 1 vehicles

A vehicle belongs to one driver.

A driver has at most one vehicle in the MVP.

## Important Rules

- Only a user with role `DRIVER` can own a vehicle.
- `capacity` must be greater than zero.
- `is_online = true` means the driver is available for new pool matching.
- A vehicle should not operate multiple active pools simultaneously.

## Indexes

- Unique index on `driver_id`
- Index on `is_online`

---

# 7. Table: `ride_requests`

Stores individual passenger ride requests.

## Fields

| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK | Unique ride request ID |
| `passenger_id` | UUID | FK, NOT NULL | Passenger requesting the ride |
| `pickup_zone` | VARCHAR(100) | NOT NULL | Pickup area |
| `destination_zone` | VARCHAR(100) | NOT NULL | Destination area |
| `pickup_lat` | DECIMAL(9,6) | NULL | Pickup latitude |
| `pickup_lng` | DECIMAL(9,6) | NULL | Pickup longitude |
| `destination_lat` | DECIMAL(9,6) | NULL | Destination latitude |
| `destination_lng` | DECIMAL(9,6) | NULL | Destination longitude |
| `seats_requested` | INTEGER | > 0 | Number of seats requested |
| `status` | ENUM | NOT NULL | Current ride status |
| `requested_at` | TIMESTAMPTZ | NOT NULL | Request creation time |
| `updated_at` | TIMESTAMPTZ | NOT NULL | Last update time |
| `cancelled_at` | TIMESTAMPTZ | NULL | Cancellation time |
| `completed_at` | TIMESTAMPTZ | NULL | Completion time |

## Ride Status

    REQUESTED
    MATCHED
    DRIVER_ARRIVED
    STARTED
    COMPLETED
    CANCELLED

## Relationships

    users 1 ───── N ride_requests

One passenger can have many ride requests.

A ride request can belong to at most one pool through `pool_members`.

A ride request has many status history records.

A ride request has one fare record.

## Important Rules

- Only users with role `PASSENGER` can create passenger ride requests.
- `seats_requested` must be greater than zero.
- A passenger can cancel only their own valid ride request.
- A completed ride cannot become active again.
- A cancelled ride cannot become active again.
- State transitions must follow the defined lifecycle.

## Indexes

- Index on `passenger_id`
- Index on `status`
- Index on `requested_at`
- Composite index on `(status, requested_at)`

---

# 8. Ride Lifecycle

The normal ride lifecycle is:

    REQUESTED
        ↓
    MATCHED
        ↓
    DRIVER_ARRIVED
        ↓
    STARTED
        ↓
    COMPLETED

Cancellation is allowed from appropriate pre-completion states.

    REQUESTED ─────────→ CANCELLED

    MATCHED ───────────→ CANCELLED

    DRIVER_ARRIVED ────→ CANCELLED

Terminal states:

    COMPLETED
    CANCELLED

A terminal state cannot be changed back to an active state.

The backend must validate every requested state transition.

---

# 9. Table: `pools`

Represents a shared ride operated by one vehicle.

Multiple passenger ride requests can be grouped into one pool.

## Fields

| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK | Unique pool identifier |
| `vehicle_id` | UUID | FK, NOT NULL | Vehicle operating the pool |
| `status` | ENUM | NOT NULL | Current pool status |
| `started_at` | TIMESTAMPTZ | NULL | Pool start time |
| `completed_at` | TIMESTAMPTZ | NULL | Pool completion time |
| `created_at` | TIMESTAMPTZ | NOT NULL | Pool creation time |
| `updated_at` | TIMESTAMPTZ | NOT NULL | Last update time |

## Pool Status

    OPEN
    STARTED
    COMPLETED
    CANCELLED

## Relationships

    vehicles 1 ───── N pools

A vehicle can operate many pools over time.

Each pool belongs to exactly one vehicle.

A pool can contain multiple passengers through `pool_members`.

## Important Rules

- A pool uses exactly one vehicle.
- A vehicle should have at most one active pool at a time.
- A pool should not start without a valid passenger member.
- Total allocated seats must never exceed vehicle capacity.
- Completed/cancelled pools remain in the database for history.

## Indexes

- Index on `vehicle_id`
- Index on `status`
- Composite index on `(vehicle_id, status)`

---

# 10. Table: `pool_members`

Connects passenger ride requests to shared pools.

This is the junction table between `pools` and `ride_requests`.

## Fields

| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK | Unique membership ID |
| `pool_id` | UUID | FK, NOT NULL | Pool being joined |
| `ride_request_id` | UUID | FK, UNIQUE, NOT NULL | Passenger ride request |
| `seats_allocated` | INTEGER | > 0 | Number of seats allocated |
| `joined_at` | TIMESTAMPTZ | NOT NULL | Time the request joined |

## Relationships

    pools 1 ───── N pool_members N ───── 1 ride_requests

A pool can contain many members.

A ride request can belong to at most one pool.

## Important Rules

- `seats_allocated` must be greater than zero.
- The same ride request cannot belong to multiple pools.
- Allocated seats should normally match the requested seats.
- Cancelled ride requests should not consume active pool capacity.
- Capacity must be checked atomically when adding a new member.

## Capacity Rule

    SUM(active pool member seats) <= vehicle.capacity

Example:

    Vehicle capacity = 3

    Nusrat  = 1 seat
    Rafiq   = 1 seat
    Shirin  = 1 seat

    Total = 3 seats

    3 <= 3

The following must be rejected:

    Vehicle capacity = 3

    Nusrat  = 2 seats
    Rafiq   = 2 seats

    Total = 4 seats

    4 > 3  ❌

## Indexes

- Unique index on `ride_request_id`
- Composite unique index on `(pool_id, ride_request_id)`
- Index on `pool_id`

---

# 11. Concurrency and Capacity Protection

Capacity enforcement is a critical business rule.

Example:

    Bullet capacity = 3

    Currently occupied = 2

    Remaining seats = 1

If Nusrat and Shirin simultaneously try to claim the final seat, both requests must not succeed.

The backend should perform:

    1. Start database transaction
    2. Lock/check the relevant pool or vehicle
    3. Calculate currently allocated seats
    4. Check remaining capacity
    5. Add pool membership if capacity is available
    6. Commit transaction

The operation must be atomic.

For larger-scale deployments, stronger transaction isolation, row-level locking, or another concurrency-control mechanism can be introduced.

The MVP will document the chosen transaction strategy in the backend implementation.

---

# 12. Table: `ride_status_history`

Stores every status change for a ride request.

This provides an audit trail of the ride lifecycle.

## Fields

| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK | Unique history record |
| `ride_request_id` | UUID | FK, NOT NULL | Related ride request |
| `status` | ENUM | NOT NULL | Status after the change |
| `changed_at` | TIMESTAMPTZ | NOT NULL | Time of change |
| `note` | TEXT | NULL | Optional explanation |

## Relationships

    ride_requests 1 ───── N ride_status_history

One ride request can have many status history records.

## Example

    Ride Request #123

    REQUESTED
        ↓
    MATCHED
        ↓
    DRIVER_ARRIVED
        ↓
    STARTED
        ↓
    COMPLETED

The history table stores each of these transitions.

## Important Rules

- History records should not normally be deleted.
- The latest history status should correspond to the current ride request status.
- Every valid status transition should create a history record.

## Indexes

- Index on `ride_request_id`
- Composite index on `(ride_request_id, changed_at)`

---

# 13. Table: `fares`

Stores the calculated fare for each ride request.

Money is stored as integer **poysha** to avoid floating-point precision problems.

## Fields

| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK | Unique fare ID |
| `ride_request_id` | UUID | FK, UNIQUE | Related ride request |
| `base_fare` | BIGINT | >= 0 | Base fare in poysha |
| `distance_charge` | BIGINT | >= 0 | Distance-based charge |
| `pool_discount` | BIGINT | >= 0 | Pool discount |
| `total_fare` | BIGINT | >= 0 | Final passenger fare |
| `created_at` | TIMESTAMPTZ | NOT NULL | Fare creation time |
| `updated_at` | TIMESTAMPTZ | NOT NULL | Last fare update |

## Fare Formula

    passengerFare =
        baseFare
        + distanceCharge
        - poolDiscount

Example:

    Base fare       = 5000 poysha
    Distance charge = 7000 poysha
    Pool discount   = 2000 poysha

    Total fare      = 10000 poysha

The final fare must never be negative.

## Relationships

    ride_requests 1 ───── 1 fares

Each ride request has at most one fare record in the MVP.

## Indexes

- Unique index on `ride_request_id`

---

# 14. PostgreSQL Enums

The following enums are used by the database.

## User Role

    PASSENGER
    DRIVER

## Ride Status

    REQUESTED
    MATCHED
    DRIVER_ARRIVED
    STARTED
    COMPLETED
    CANCELLED

## Pool Status

    OPEN
    STARTED
    COMPLETED
    CANCELLED

---

# 15. Foreign Key Relationships

The main relationships are:

    users.id
        │
        ├──────────── vehicles.driver_id
        │
        └──────────── ride_requests.passenger_id


    vehicles.id
        │
        └──────────── pools.vehicle_id


    pools.id
        │
        └──────────── pool_members.pool_id


    ride_requests.id
        │
        ├──────────── pool_members.ride_request_id
        │
        ├──────────── ride_status_history.ride_request_id
        │
        └──────────── fares.ride_request_id

---

# 16. Database Constraints

The database and backend together enforce the following important rules.

## User Constraints

    email must be unique
    role must be PASSENGER or DRIVER

## Vehicle Constraints

    driver_id must reference an existing user
    driver_id is unique in the MVP
    capacity > 0

## Ride Request Constraints

    passenger_id must reference an existing user
    seats_requested > 0
    status must be a valid RideStatus

## Pool Constraints

    vehicle_id must reference an existing vehicle
    status must be a valid PoolStatus

## Pool Member Constraints

    pool_id must reference an existing pool
    ride_request_id must reference an existing ride request
    ride_request_id must be unique
    seats_allocated > 0

## Fare Constraints

    ride_request_id must be unique
    base_fare >= 0
    distance_charge >= 0
    pool_discount >= 0
    total_fare >= 0

Some cross-row rules, such as pool capacity, cannot be represented by a simple row-level SQL `CHECK` constraint. These must be protected using transactional backend logic and appropriate database locking.

---

# 17. Database-Level vs Backend-Level Rules

Not every business rule belongs directly inside the database.

## Database should enforce

- Primary keys
- Foreign keys
- Unique constraints
- Required fields
- Valid enum values
- Basic positive/non-negative values
- Referential integrity

## Backend should enforce

- Authentication
- Authorization
- Passenger/driver role checks
- Ride state transitions
- Ride cancellation rules
- Pool matching
- Pool capacity calculation
- Concurrent seat allocation
- Fare calculation
- Vehicle availability
- Business-specific validation

This separation keeps the database responsible for data integrity while keeping application-specific business logic in the backend.

---

# 18. Geography and Matching

The MVP does not require a full routing engine.

Ride requests use predefined Dhaka zones such as:

- Banani
- Gulshan
- Mohakhali
- Dhanmondi
- Mirpur
- Uttara
- Farmgate
- Bashundhara

Pickup and destination coordinates may also be stored.

Matching can initially use:

- Same or nearby pickup zone
- Compatible destination zone
- Available vehicle capacity
- Driver online status
- Existing pool status

A full route optimization engine is outside the MVP scope.

---

# 19. Important Indexes

The following indexes are important for common queries.

    users
    ├── UNIQUE(email)
    └── INDEX(role)

    vehicles
    ├── UNIQUE(driver_id)
    └── INDEX(is_online)

    ride_requests
    ├── INDEX(passenger_id)
    ├── INDEX(status)
    ├── INDEX(requested_at)
    └── INDEX(status, requested_at)

    pools
    ├── INDEX(vehicle_id)
    ├── INDEX(status)
    └── INDEX(vehicle_id, status)

    pool_members
    ├── INDEX(pool_id)
    ├── UNIQUE(ride_request_id)
    └── UNIQUE(pool_id, ride_request_id)

    ride_status_history
    ├── INDEX(ride_request_id)
    └── INDEX(ride_request_id, changed_at)

    fares
    └── UNIQUE(ride_request_id)

These indexes support common operations such as:

- Finding a passenger's rides
- Finding pending ride requests
- Finding online vehicles
- Finding active pools
- Finding members of a pool
- Retrieving ride history
- Retrieving a ride's fare

---

# 20. Data Retention

Completed and cancelled rides should remain stored.

This allows the application to provide:

- Passenger ride history
- Driver ride history
- Fare history
- Ride status history
- Pool history

Historical records should not be deleted simply because a ride is completed or cancelled.

---

# 21. Example Demo Scenario

The database should support a simple demo scenario based on the project requirements.

### Driver

    Name: Jashim
    Vehicle: Bullet
    Capacity: 3 seats
    Status: Online

### Passengers

    Nusrat
    Rafiq
    Shirin

### Example Pool

    Pool: P001
    Vehicle: Bullet
    Capacity: 3

Members:

    Nusrat  → 1 seat
    Rafiq   → 1 seat
    Shirin  → 1 seat

Total:

    1 + 1 + 1 = 3 seats

The pool is valid because:

    3 <= 3

---

# 22. MVP Scope

The following features are included in the database design:

- User authentication data
- Passenger accounts
- Driver accounts
- Vehicle information
- Ride requests
- Ride lifecycle
- Pool creation
- Pool membership
- Seat allocation
- Capacity protection
- Ride status history
- Individual passenger fares
- Ride and pool history

---

# 23. Features Excluded from MVP

The following are intentionally excluded from the initial database design:

- Real payment gateway
- Wallet system
- Driver ratings
- Passenger ratings
- Driver verification workflow
- Detailed audit log
- GPS tracking history
- Full route geometry
- Surge pricing
- Promotional codes
- Notifications
- Advanced route optimization
- Real-time traffic data

These can be introduced later without redesigning the core ride/pooling model.

---

# 24. Prisma Implementation Notes

The database design will be implemented using Prisma.

The Prisma schema should contain:

    User
    Vehicle
    RideRequest
    Pool
    PoolMember
    RideStatusHistory
    Fare

And the following enums:

    UserRole
    RideStatus
    PoolStatus

UUIDs will be used as primary keys.

Timestamps will use:

    createdAt
    updatedAt

where appropriate.

The PostgreSQL connection URL is configured through the project's environment configuration rather than being hardcoded inside application code.

---

# 25. Migration and Integrity Notes

Prisma migrations will create the initial database structure.

Additional PostgreSQL constraints that cannot be represented directly by the Prisma schema may be added through migration SQL.

Examples include:

    capacity > 0
    seats_requested > 0
    seats_allocated > 0
    base_fare >= 0
    distance_charge >= 0
    pool_discount >= 0
    total_fare >= 0

Cross-row rules such as:

    SUM(pool_members.seats_allocated) <= vehicle.capacity

must be protected through transactional application logic because the rule depends on multiple database rows.

---

# 26. Final Database Model

The final MVP model can be summarized as:

                         USERS
                           │
             ┌─────────────┴─────────────┐
             │                           │
             ▼                           ▼
         VEHICLES                 RIDE_REQUESTS
             │                           │
             ▼                           │
           POOLS                         │
             │                           │
             └──────────┬────────────────┘
                        ▼
                  POOL_MEMBERS
                        │
              ┌─────────┴─────────┐
              ▼                   ▼
    RIDE_STATUS_HISTORY         FARES

### Core Principle

    Passenger requests a ride
            ↓
    Ride request is created
            ↓
    Compatible requests are pooled
            ↓
    Vehicle capacity is checked
            ↓
    Passenger joins pool
            ↓
    Driver arrives
            ↓
    Ride starts
            ↓
    Ride completes
            ↓
    Individual fare is stored
            ↓
    Complete history remains available

---

# 27. Next Implementation Step

After finalizing this database design, the next implementation step is to translate this design into:

    backend/prisma/schema.prisma

Then the backend database workflow will be:

    1. Create Prisma models
    2. Run `npx prisma validate`
    3. Run `npx prisma generate`
    4. Create the first migration
    5. Apply the migration to PostgreSQL
    6. Verify the database tables
    7. Run `npm run build`
    8. Begin backend authentication and API implementation