# Movie Ticket Booking System - Backend

A concurrent movie ticket booking system built with Node.js, Express, PostgreSQL, and Redis. Implements distributed locking to prevent double-booking.

## • Features

-  Concurrent seat booking with Redis distributed locks
-  PostgreSQL for persistent data storage
-  UNIQUE constraint prevents double booking at database level
-  30-second automatic lock expiry
-  RESTful API design
-  Transaction management with ACID properties
-  Booking status lifecycle (PENDING → CONFIRMED/EXPIRED/CANCELLED)

## • Tech Stack

- **Backend**: Node.js + Express
- **Database**: PostgreSQL 14+
- **Caching/Locking**: Redis 7+
- **Environment**: Docker (optional)

## • Project Structure

```
movie-booking-backend/
├── src/
│   ├── config/
│   │   ├── database.js       # PostgreSQL connection pool
│   │   └── redis.js          # Redis client setup
│   ├── services/
│   │   ├── lockService.js    # Redis locking logic
│   │   ├── bookingService.js # Booking business logic
│   │   ├── showService.js    # Show management
│   │   └── seatService.js    # Seat availability
│   ├── routes/
│   │   ├── userRoutes.js
│   │   ├── movieRoutes.js
│   │   ├── showRoutes.js
│   │   └── bookingRoutes.js
│   ├── controllers/
│   │   ├── userController.js
│   │   ├── movieController.js
│   │   ├── showController.js
│   │   └── bookingController.js
│   └── server.js             # Entry point
├── schema.sql                # Database schema
├── package.json
├── .env.example
└── README.md
```

## • Setup Instructions

### Prerequisites

- Node.js 16+ installed
- PostgreSQL 14+ installed
- Redis 7+ installed
- npm or yarn

### 1. Clone and Install Dependencies

```bash
# Install dependencies
npm install
```

### 2. Setup Environment Variables

```bash
# Copy example env file
cp .env.example .env

# Edit .env with your configuration
nano .env
```

### 3. Create Database

```bash
# Create PostgreSQL database
createdb movie_booking

# Run schema
psql -d movie_booking -f schema.sql
```

### 4. Start Redis

```bash
# Start Redis server
redis-server

# Or using Docker
docker run -d -p 6379:6379 redis:7-alpine
```

### 5. Start the Server

```bash
# Development mode (with nodemon)
npm run dev

# Production mode
npm start
```

Server will run on `http://localhost:3000`

## • API Endpoints

### Health Check
```
GET /health
```

### Users
```
POST   /api/users              # Create user
GET    /api/users/:id          # Get user details
GET    /api/users/:id/bookings # Get user booking history
```

### Movies
```
GET    /api/movies             # List all movies
POST   /api/movies             # Add new movie (admin)
GET    /api/movies/:id         # Get movie details
```

### Shows
```
GET    /api/shows              # List all shows
POST   /api/shows              # Create new show (admin)
GET    /api/shows/:id          # Get show details
GET    /api/shows/:id/seats    # Get available seats for show
```

### Bookings
```
POST   /api/bookings           # Create booking (with seat lock)
GET    /api/bookings/:id       # Get booking details
PUT    /api/bookings/:id/confirm   # Confirm booking
PUT    /api/bookings/:id/cancel    # Cancel booking
```

## • Booking Flow

1. **User requests booking** → `POST /api/bookings`
2. **System acquires Redis locks** for selected seats
3. **If locks fail** → Return error (seats already locked)
4. **If locks succeed** → Start PostgreSQL transaction
5. **Insert booking** (status='PENDING')
6. **Insert booking_seats** records
7. **If UNIQUE constraint violated** → Rollback + error
8. **If success** → Commit transaction
9. **User confirms** → `PUT /api/bookings/:id/confirm`
10. **Status updated** to 'CONFIRMED'
11. **Redis locks released** (or auto-expire after 30s)

## • Testing

### Test Concurrent Bookings

```bash
# Terminal 1
curl -X POST http://localhost:3000/api/bookings \
  -H "Content-Type: application/json" \
  -d '{"user_id": 1, "show_id": 1, "seat_ids": [1, 2, 3]}'

# Terminal 2 (immediately)
curl -X POST http://localhost:3000/api/bookings \
  -H "Content-Type: application/json" \
  -d '{"user_id": 2, "show_id": 1, "seat_ids": [2, 3, 4]}'
```

One should succeed, the other should fail (seat conflict).

### Test Lock Expiry

```bash
# Create booking but don't confirm
curl -X POST http://localhost:3000/api/bookings \
  -H "Content-Type: application/json" \
  -d '{"user_id": 1, "show_id": 1, "seat_ids": [5, 6]}'

# Wait 31 seconds

# Try booking same seats (should succeed - locks expired)
curl -X POST http://localhost:3000/api/bookings \
  -H "Content-Type: application/json" \
  -d '{"user_id": 2, "show_id": 1, "seat_ids": [5, 6]}'
```

## • Docker Setup (Optional)

```bash
# Start PostgreSQL and Redis using Docker Compose
docker-compose up -d

# Run migrations
npm run migrate

# Start app
npm start
```

## • Database Schema

- **users**: User accounts
- **movies**: Movie catalog
- **seats**: Fixed 120 seats (A1-J12)
- **shows**: Movie screenings
- **bookings**: Booking metadata
- **booking_seats**: Seat assignments (with UNIQUE constraint)

**Critical Constraint:**
```sql
UNIQUE(show_id, seat_id) -- Prevents double booking
```

## • Configuration

Edit `.env` file:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=movie_booking
DB_USER=postgres
DB_PASSWORD=your_password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Server
PORT=3000
SEAT_LOCK_TTL=30
MAX_SEATS_PER_BOOKING=6
```

## • Key Design Decisions

1. **Two-Phase Locking**: Redis (fast, temporary) + PostgreSQL (final, enforced)
2. **Lock TTL**: 30 seconds to prevent deadlocks from abandoned bookings
3. **UNIQUE Constraint**: Database-level guarantee against double booking
4. **Denormalized show_id**: In booking_seats table for UNIQUE constraint
5. **Status Lifecycle**: PENDING → CONFIRMED/EXPIRED/CANCELLED

## • Contributing

This is an academic project for DBMS course (UCS310).


## • Authors

- Amitesh Kumar Singh

**Course**: Database Management Systems (UCS310)  
**Department**: Computer Science & Engineering  
**Instructor**: Prof. Paramveer Kaur
