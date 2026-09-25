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
        string id PK
        string name
        string email UK
        string password_hash
        string role
        boolean is_active
        datetime created_at
        datetime updated_at
    }

    VEHICLES {
        string id PK
        string driver_id FK
        string name
        int capacity
        boolean is_online
        datetime created_at
        datetime updated_at
    }

    RIDE_REQUESTS {
        string id PK
        string passenger_id FK
        string pickup_zone
        string destination_zone
        float pickup_lat
        float pickup_lng
        float destination_lat
        float destination_lng
        int requested_seats
        string status
        datetime created_at
        datetime updated_at
    }

    POOLS {
        string id PK
        string vehicle_id FK
        string status
        datetime started_at
        datetime completed_at
        datetime created_at
        datetime updated_at
    }

    POOL_MEMBERS {
        string id PK
        string pool_id FK
        string ride_request_id FK
        int seats
        datetime joined_at
    }

    RIDE_STATUS_HISTORY {
        string id PK
        string ride_request_id FK
        string changed_by FK
        string from_status
        string to_status
        datetime created_at
    }

    FARES {
        string id PK
        string ride_request_id FK
        int base_fare
        int distance_charge
        int pool_discount
        int total_fare
        string currency
        datetime created_at
    }
```

## Relationship Summary

- One driver owns one vehicle in the MVP.
- One passenger can create many ride requests.
- One vehicle can operate many pools over time.
- One pool contains multiple pool members.
- One ride request can belong to at most one pool.
- One ride request has a status history.
- One user can perform multiple status changes.
- One ride request has one fare record.