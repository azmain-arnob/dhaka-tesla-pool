# Dhaka Tesla Pool — Architecture

## 1. Project Overview

Dhaka Tesla Pool is a ride-pooling MVP for Dhaka.

The system allows passengers to request rides and optionally share a Tesla with other passengers whose routes overlap sufficiently. A driver can view relevant ride requests, accept a ride or pool, manage available seats, and update the ride lifecycle.

The MVP focuses on a simple, reliable architecture rather than unnecessary distributed-system complexity.

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

```text
Browser
   |
   | HTTP / REST API
   v
Next.js Frontend
   |
   | REST API
   v
Node.js + Express Backend
   |
   | Prisma ORM
   v
PostgreSQL Database