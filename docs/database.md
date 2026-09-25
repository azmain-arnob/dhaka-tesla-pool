# Dhaka Tesla Pool — Database Design

## 1. Overview

Dhaka Tesla Pool uses a relational database to model passengers, drivers, vehicles,
ride requests, shared pools, pool membership, ride status history, and fares.

The database is designed around the core MVP requirements:

- Passengers can request rides.
- Drivers own a Tesla/vehicle with fixed capacity.
- Multiple passenger requests can share one Tesla.
- Occupied seats must never exceed vehicle capacity.
- Each passenger receives an individual fare.
- Ride status transitions are tracked.
- Completed and cancelled rides remain available as history.
- Important relationships and constraints are enforced by the database and backend.

The selected database is PostgreSQL.

---

## 2. Core Entities

The MVP uses seven core tables:

1. `users`
2. `vehicles`
3. `ride_requests`
4. `pools`
5. `pool_members`
6. `ride_status_history`
7. `fares`

Optional entities such as payments, ratings, and audit logs are intentionally
not included in the initial MVP.

---

## 3. Entity Relationship Overview

```text
users
  |
  | 1 : 1
  v
vehicles
  |
  | 1 : N
  v
pools
  |
  | 1 : N
  v
pool_members
  ^
  |
  | N : 1
  |
ride_requests
  |
  | 1 : N
  +----------------------+
  |                      |
  v                      v
ride_status_history     fares