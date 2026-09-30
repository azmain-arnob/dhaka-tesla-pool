# Dhaka Tesla Pool — ERD

The following entity relationship diagram represents the current PostgreSQL database schema used by the MVP.

## Entity Relationship Diagram

```mermaid
erDiagram

    USERS ||--o| VEHICLES : owns
    USERS ||--o{ RIDE_REQUESTS : creates
    VEHICLES ||--o{ POOLS : operates
    POOLS ||--o{ POOL_MEMBERS : contains
    RIDE_REQUESTS ||--o| POOL_MEMBERS : joins
    RIDE_REQUESTS ||--o{ RIDE_STATUS_HISTORY : has
    RIDE_REQUESTS ||--|| FARES : has

    USERS {
        uuid id PK
        string name
        string email UK
        string password_hash
        string role
        datetime created_at
        datetime updated_at
    }

    VEHICLES {
        uuid id PK
        uuid driver_id FK
        string name
        string model
        int capacity
        boolean is_online
        datetime created_at
        datetime updated_at
    }

    RIDE_REQUESTS {
        uuid id PK
        uuid passenger_id FK
        string pickup_zone
        string destination_zone
        decimal pickup_lat
        decimal pickup_lng
        decimal destination_lat
        decimal destination_lng
        int seats_requested
        string status
        datetime requested_at
        datetime updated_at
        datetime cancelled_at
        datetime completed_at
    }

    POOLS {
        uuid id PK
        uuid vehicle_id FK
        string status
        datetime started_at
        datetime completed_at
        datetime created_at
        datetime updated_at
    }

    POOL_MEMBERS {
        uuid id PK
        uuid pool_id FK
        uuid ride_request_id FK
        int seats_allocated
        datetime joined_at
    }

    RIDE_STATUS_HISTORY {
        uuid id PK
        uuid ride_request_id FK
        string status
        datetime changed_at
        string note
    }

    FARES {
        uuid id PK
        uuid ride_request_id FK
        bigint base_fare
        bigint distance_charge
        bigint pool_discount
        bigint total_fare
        datetime created_at
        datetime updated_at
    }