# Dhaka Tesla Pool

A ride-sharing and ride-pooling system designed for Tesla rides within Dhaka.

## Project Status

**Version:** `v1.0.0`

The core MVP flow has been implemented and tested:

- Passenger registration and login
- Driver login
- Ride request creation
- Fare calculation
- Driver ride request management
- Pool matching
- Pool capacity protection
- Multiple passengers in the same Tesla
- Individual passenger fares
- Ride lifecycle management
- Passenger ride history
- Driver ride history
- Ride cancellation
- Database transactions for pool matching
- Automated backend tests
- Docker setup with PostgreSQL

---

## Problem

The goal of this project is to demonstrate a simple ride-sharing system where multiple passengers can share a Tesla when their ride requests can be handled by the same vehicle.

The system needs to keep track of:

- Passengers
- Drivers
- Vehicles
- Ride requests
- Pools
- Pool members
- Fares
- Ride status history

A major requirement is preventing a Tesla from accepting more passengers than its available capacity.

---

## Main Features

### Passenger

- Register and log in
- Request a ride
- Select pickup and destination
- Select number of seats
- See estimated fare
- Cancel valid rides
- View ride history
- See ride status

### Driver

- Log in
- Set vehicle online/offline
- View ride requests
- Match a ride into a pool
- View assigned rides
- Mark driver as arrived
- Start a ride
- Complete a ride
- View ride history

### Ride Pooling

- Multiple passengers can share the same Tesla
- Each passenger keeps an individual ride record
- Pool membership is stored in the database
- Tesla capacity is checked before matching
- A full pool cannot accept additional seats
- Pooled rides can receive the applicable fare adjustment

---

## Ride Lifecycle

The implemented ride lifecycle is:

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

Cancellation is also supported where the current ride state allows it.

---

## Example

A simplified example:

```text
Passenger 1
Banani → Mohakhali
1 seat

Passenger 2
Banani → Mohakhali
1 seat

Passenger 3
Banani → Mohakhali
1 seat
```

If the Tesla has enough available capacity, these rides can be matched into the same pool.

The system keeps each passenger's ride and fare separately while storing their pool membership.

---

## Capacity Protection

Capacity is checked when a ride is matched.

The pool matching logic uses database transactions and row locking to reduce the chance of two simultaneous requests consuming the same remaining seat.

For example:

```text
Tesla capacity: 3

Passenger 1 → 1 seat
Passenger 2 → 1 seat
Passenger 3 → 1 seat

Available seats: 0

Passenger 4 → 1 seat
Result: rejected
```

The system also checks capacity again inside the transaction before creating the pool membership.

---

## Fare Calculation

The current implementation uses a simple predefined fare model based on the selected pickup and destination zones.

Current zones include:

```text
Banani
Mohakhali
Gulshan
Badda
Mirpur
Uttara
```

The frontend currently uses these zones for ride selection.

The fare is calculated by the backend and returned with the ride information.

---

## Technology Stack

### Frontend

- React
- Vite
- JavaScript
- CSS

### Backend

- Node.js
- Express.js
- TypeScript
- Prisma ORM

### Database

- PostgreSQL

### Testing

- Vitest

### Containerization

- Docker
- Docker Compose

---

## Architecture

The project follows a simple frontend/backend architecture:

```text
React Frontend
      |
      | HTTP / JSON
      ↓
Express + TypeScript Backend
      |
      | Prisma
      ↓
PostgreSQL
```

The backend is organized into:

```text
Routes
  ↓
Controllers
  ↓
Services
  ↓
Prisma
  ↓
PostgreSQL
```

Business logic such as ride creation, ride lifecycle changes, vehicle operations and pool matching is handled in service files.

---

## Database

The main database entities are:

```text
User
 ├── Passenger
 └── Driver

Driver
 └── Vehicle

RideRequest
 └── PoolMember
       └── Pool

RideRequest
 └── RideStatusHistory

RideRequest
 └── Fare
```

The project contains database documentation and an ERD in the `docs` directory.

- `docs/architecture.md`
- `docs/database.md`
- `docs/erd.md`

---

## Project Structure

```text
dhaka-tesla-pool/
│
├── backend/
│   ├── prisma/
│   │   ├── migrations/
│   │   ├── schema.prisma
│   │   └── seed.ts
│   │
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── lib/
│   │   ├── middlewares/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── types/
│   │   ├── app.ts
│   │   ├── server.ts
│   │   └── test-db.ts
│   │
│   ├── .env.example
│   ├── Dockerfile
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   ├── index.css
│   │   └── main.jsx
│   └── package.json
│
├── docs/
│   ├── architecture.md
│   ├── database.md
│   └── erd.md
│
├── docker-compose.yml
├── README.md
└── .gitignore
```

---

## Backend API

The implemented backend includes the following main endpoints.

### Authentication

```text
POST /api/auth/register
POST /api/auth/login
```

### Rides

```text
POST /api/rides
GET /api/rides
GET /api/rides/:id
POST /api/rides/:id/cancel
```

### Driver

```text
GET /api/drivers/requests
GET /api/drivers/rides

POST /api/drivers/rides/:rideId/accept
POST /api/drivers/rides/:rideId/arrive
POST /api/drivers/rides/:rideId/start
POST /api/drivers/rides/:rideId/complete
```

### Vehicles

```text
GET /api/vehicles/me
POST /api/vehicles
PATCH /api/vehicles/me/status
```

### Pools

```text
POST /api/pools/rides/:rideId/match
```

### Health

```text
GET /
GET /api/health
```

---

## Local Setup

### Prerequisites

Install:

- Node.js
- PostgreSQL
- Git

Clone the repository:

```bash
git clone https://github.com/azmain-arnob/dhaka-tesla-pool.git
cd dhaka-tesla-pool
```

---

## Backend Setup

Go to the backend:

```bash
cd backend
```

Install dependencies:

```bash
npm install
```

Create the environment file:

```text
.env
```

Use `.env.example` as the reference.

Example:

```env
PORT=5000
NODE_ENV=development
DATABASE_URL="postgresql://postgres:password@localhost:5432/dhaka_tesla_pool"
```

Generate Prisma client:

```bash
npm run prisma:generate
```

Run database migrations:

```bash
npm run prisma:migrate
```

Seed the database:

```bash
npm run prisma:seed
```

Start the backend:

```bash
npm run dev
```

The backend runs on:

```text
http://localhost:5000
```

---

## Frontend Setup

Open another terminal:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Start the frontend:

```bash
npm run dev
```

Vite will provide the local frontend URL in the terminal.

---

## Docker Setup

The project also includes Docker Compose for running the backend and PostgreSQL together.

From the project root:

```bash
docker compose up --build
```

The backend container runs in production mode and connects to the PostgreSQL container.

To stop the containers:

```bash
docker compose down
```

The Docker setup has been tested locally with:

```text
PostgreSQL
Backend
Prisma migrations
Health/API endpoint
```

---

## Database Seed

The seed data includes example users, drivers and vehicles such as:

```text
Jashim
Bullet
Nusrat
Rafiq
Shirin
```

The seed is intended for local development and testing.

---

## Testing

Backend tests are written using Vitest.

Run:

```bash
npm test
```

Current test result:

```text
Test Files  3 passed
Tests       8 passed
```

The tests cover service-level behavior including:

- Ride operations
- Driver operations
- Pool matching
- Pool capacity
- Pooled fares
- Concurrency-related pool matching behavior

---

## Build Verification

Backend build:

```bash
npm run build
```

Frontend build:

```bash
npm run build
```

Both builds have been tested successfully.

---

## Manual Testing

The main application flow has also been tested manually.

Tested flow:

```text
Passenger Registration
        ↓
Passenger Login
        ↓
Create Ride
        ↓
Driver Login
        ↓
View Ride Request
        ↓
Match Pool
        ↓
Driver Arrives
        ↓
Start Ride
        ↓
Complete Ride
        ↓
Passenger Sees Completed Ride
```

Multiple passenger requests were also tested with the same Tesla.

Capacity protection was tested by filling a Tesla and then attempting another match.

---

## Authentication

The backend contains authentication and role-based access for the main passenger and driver flows.

The application separates passenger and driver functionality in the frontend.

Drivers can access driver-specific operations such as:

- Ride requests
- Matching
- Vehicle status
- Assigned rides
- Ride lifecycle actions

Passengers can access passenger-specific operations such as:

- Ride creation
- Ride history
- Ride cancellation

---

## Concurrency Handling

Pool matching is one of the important consistency-sensitive parts of the project.

The current implementation uses:

- Database transactions
- Serializable transaction isolation
- Row locking
- Capacity re-checking inside the transaction

This is intended to protect against cases where two ride requests try to consume the same remaining vehicle capacity.

The current implementation is designed for the MVP and local/small-scale deployment. A larger production system would require additional infrastructure and more extensive concurrency/load testing.

---

## Git Workflow

The project uses separate branches for development and release work.

Main branches:

```text
master
pre-release
release/v1.0.0
```

Feature work was developed through feature branches before being merged.

The `v1.0.0` release was created after the MVP implementation and testing work.

---

## Development Process

The project was developed incrementally rather than building everything at once.

The main development stages included:

```text
Project Setup
      ↓
Backend Structure
      ↓
Database + Prisma
      ↓
Authentication
      ↓
Vehicle Module
      ↓
Ride Module
      ↓
Pool Module
      ↓
Capacity Protection
      ↓
Driver Lifecycle
      ↓
Frontend
      ↓
Testing
      ↓
Docker
      ↓
Release v1.0.0
```

---

## AI Usage

AI tools were used heavily during development.

I did not write every part of the project manually.

For many parts of the implementation, my workflow was essentially:

```text
Ask AI
   ↓
Copy suggested code
   ↓
Paste into project
   ↓
Run the code
   ↓
See errors / unexpected behavior
   ↓
Report the problem to AI
   ↓
Apply the fix
   ↓
Run tests / manual testing
```

AI was used for things including:

- Backend code
- Frontend code
- Prisma/database work
- API implementation
- Tests
- Docker configuration
- Debugging
- Git commands
- Documentation
- README preparation

I also personally ran and checked the application during development, including:

- Backend API
- Frontend UI
- Database
- Prisma Studio
- Automated tests
- Production build
- Docker Compose
- Ride lifecycle
- Pool matching
- Capacity protection

So this project should not be presented as completely handwritten code. AI-assisted development was a significant part of the process.

---

## Limitations

This is an MVP project and is not intended to represent a production-scale ride-sharing platform.

Current limitations include:

- No real payment gateway
- No real-time GPS tracking
- No live map-based route matching
- No production deployment yet
- No advanced route optimization
- No large-scale load testing
- No distributed concurrency infrastructure
- Fare calculation uses predefined zones
- The current matching logic is intentionally simple
- UI is focused on functionality rather than production-level visual polish

---

## Future Improvements

Possible future improvements include:

- Real map and route integration
- Better route-overlap matching
- Real-time driver location
- Real-time ride updates
- Payment integration
- More advanced fare calculation
- Better passenger and driver dashboards
- More comprehensive integration tests
- Load and stress testing
- Production deployment
- Improved authentication/security
- Better concurrency handling for large-scale deployment

---

## Repository

GitHub:

```text
https://github.com/azmain-arnob/dhaka-tesla-pool
```

---

## Release

Current release:

```text
v1.0.0
```

Release branch:

```text
release/v1.0.0
```

---

## License

This project was developed as an software engineering project.