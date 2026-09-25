# Dhaka Tesla Pool — ERD

```mermaid
erDiagram

    USERS ||--o| VEHICLES : owns
    USERS ||--o{ RIDE_REQUESTS : creates
    VEHICLES ||--o{ POOLS : operates
    POOLS ||--o{ POOL_MEMBERS : contains
    RIDE_REQUESTS ||--o| POOL_MEMBERS : joins
    RIDE_REQUESTS ||--o{ RIDE_STATUS_HISTORY : has
    USERS ||--o{ RIDE_STATUS_HISTORY : changes
    RIDE_REQUESTS ||--|| FARES : has

    USERS {
        uuid id PK
        string name
        string email UK
        string password_hash
        enum role
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }

    VEHICLES {
        uuid id PK
        uuid driver_id FK
        string name
        int capacity
        boolean is_online
        timestamp created_at
        timestamp updated_at
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
        int requested_seats
        enum status
        timestamp created_at
        timestamp updated_at
    }

    POOLS {
        uuid id PK
        uuid vehicle_id FK
        enum status
        timestamp started_at
        timestamp completed_at
        timestamp created_at
        timestamp updated_at
    }

    POOL_MEMBERS {
        uuid id PK
        uuid pool_id FK
        uuid ride_request_id FK
        int seats
        timestamp joined_at
    }

    RIDE_STATUS_HISTORY {
        uuid id PK
        uuid ride_request_id FK
        uuid changed_by FK
        enum from_status
        enum to_status
        timestamp created_at
    }

    FARES {
        uuid id PK
        uuid ride_request_id FK
        int base_fare
        int distance_charge
        int pool_discount
        int total_fare
        string currency
        timestamp created_at
    }