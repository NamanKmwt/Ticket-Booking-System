
# Models in the DB :- 
##### Venue :- 
represents the physical location where events take place, such as a movie theater screen or a stadium.

##### Event :- 
The Event model represents a specific showtime at a specific venue (e.g., "Avengers: Endgame at IMAX Screen 1, Friday 8 PM").

##### Seat :- 
It represents a single, bookable seat for a specific event.

##### Order :- 
represents a user's transaction

🏛️ System Architecture Overview (Phases 1 & 2)
1. Strict TypeScript & Project Foundations (Phase 1)
Environment & Tooling: Initialized with Node.js, npm, and an uncompromising tsconfig.json featuring "strict": true, "noImplicitAny": true, and "noUncheckedIndexedAccess" to catch subtle bugs at compile-time rather than production.

Domain Modeling (MongoDB / Mongoose): Designed strict TypeScript interfaces and schemas for our core entities:

IVenue: Physical location and capacity metrics.

IEvent: Links a show to a venue on a specific date.

ISeat: Individual seat documents utilizing optimisticConcurrency: true and unique compound indexes ({ eventId, row, number }) to prevent database-level collisions.

IOrder: Financial source of truth managing order lifecycles (PENDING, COMPLETED, FAILED, CANCELLED).

SeatStatus & OrderStatus: Unified enums acting as our system states (AVAILABLE, HELD, BOOKED).

Database Seeding: A typed seeding script (src/scripts/seed.ts) that wipes test data and generates a clean venue, event, and 50-seat grid (Rows A-E).

2. High-Speed Caching & Atomic Distributed Locking (Phase 2)
Redis Client & CQRS Read Model: Configured a typed ioredis singleton (src/config/redis.ts) and built SeatCacheService to serialize our seat grid into a Redis Hash. This shifts read traffic away from MongoDB, serving seat layouts in sub-milliseconds from RAM.

Atomic Distributed Locking (LockService): Implemented an enterprise-grade locking mechanism using Redis SET with NX (Not Exists) and PX (TTL expiration). We also integrated a secure Lua script to guarantee that locks can only be released by the exact client token that acquired them, eliminating race conditions during sudden thunder-herd traffic spikes.

Checkout & 10-Minute Hold Transaction (CheckoutService): Built a robust transactional workflow that:

Attempts to acquire atomic locks for all requested seats simultaneously.

Rolls back locks gracefully if any seat is contested.

Verifies availability against our Redis cache.

Creates a PENDING order in MongoDB and flips the seat statuses to HELD.

Express API Layer: Exposed our architecture via a strictly typed Express API (app.ts, server.ts, CheckoutController, and checkoutRoutes), complete with security middlewares (helmet, cors) and global error handling.