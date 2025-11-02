# TMG Competitions Backend API

Production-ready Express.js + MongoDB backend for TMG Competitions Ltd - Online Raffle Ticket Platform.

## Features

- ✅ Complete authentication system with JWT (access + refresh tokens)
- ✅ OTP-based email verification (mocked for demo)
- ✅ Competition management (user & admin)
- ✅ Ticket purchase system with points
- ✅ Results & winners management
- ✅ Notifications system
- ✅ Points management with history
- ✅ User profile management
- ✅ Category management
- ✅ Complete admin APIs
- ✅ Global response trait for consistent API responses
- ✅ Seed script with test accounts

## Tech Stack

- **Runtime**: Node.js 22+
- **Framework**: Express.js 5.x
- **Database**: MongoDB + Mongoose
- **Authentication**: JWT (jsonwebtoken)
- **Validation**: express-validator
- **Documentation**: Swagger/OpenAPI ready

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Configuration

Create a `.env` file in the project root with the following variables:

```env
# Server Configuration
PORT=5000
APP_URL=http://localhost:5000
GRACEFUL_SHUTDOWN_TIMEOUT=10000  # Timeout in milliseconds for graceful shutdown (default: 10000)

# Database Configuration
MONGO_URI=mongodb://localhost:27017/tmg_competitions

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this-in-production
JWT_EXPIRE=24h
JWT_REFRESH_EXPIRE=7d

# Email Configuration (Mocked for now)
EMAIL_FROM=noreply@tmgcompetitions.com
EMAIL_SERVICE=demo

# OTP Configuration (Mocked for now)
OTP_EXPIRE_MINUTES=10
```

### 3. Seed Test Accounts

Run the seed script to create test user and admin accounts:

```bash
npm run seed
```

**Test Account Credentials:**

- **User Account:**
  - Email: `user@test.com`
  - Password: `password123`

- **Admin Account:**
  - Email: `admin@test.com`
  - Password: `admin123`

Both accounts are verified and ready to use immediately.

### 4. Start Server

```bash
# Production
npm start

# Development (with auto-reload)
npm run dev
```

## API Documentation

### Base URL

```
http://localhost:5000/api
```

### Postman Collection

Import the `tmg_competitions_api.json` file into Postman for complete API testing. The collection includes:

- All endpoints organized by folders
- Example request bodies
- Environment variables for base URL and access token

### Authentication

Most endpoints require authentication. Include the JWT token in the Authorization header:

```
Authorization: Bearer <access_token>
```

### Response Format

All responses follow a consistent structure:

**Success Response:**
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Error message here",
  "errors": { ...optional }
}
```

## API Endpoints

### Authentication (`/api/auth`)
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `POST /auth/request-otp` - Request OTP
- `POST /auth/verify-otp` - Verify OTP
- `POST /auth/forgot-password` - Password reset request
- `POST /auth/reset-password` - Password reset
- `POST /auth/logout` - Logout

### Competitions (`/api/competitions`)
- `GET /competitions` - List competitions (paginated)
- `GET /competitions/recent` - Recent competitions
- `GET /competitions/search` - Search competitions
- `GET /competitions/:id` - Get competition by ID

### Tickets (`/api/tickets`)
- `POST /tickets/purchase` - Purchase tickets (auth required)
- `GET /tickets/my` - Get user's tickets (auth required)
- `GET /tickets/competition/:id` - Get tickets for competition (auth required)
- `GET /tickets/search` - Search by ticket number

### Results (`/api/results`)
- `GET /results` - List results
- `GET /results/:id` - Get result by ID

### Notifications (`/api/notifications`)
- `GET /notifications` - Get user notifications (auth required)
- `PATCH /notifications/:id/read` - Mark as read (auth required)

### Points (`/api/points`)
- `GET /points/history` - Points history (auth required)
- `GET /points/summary` - Points summary (auth required)

### Profile (`/api/profile`)
- `GET /profile` - Get profile (auth required)
- `PUT /profile` - Update profile (auth required)
- `GET /profile/points` - Get profile points (auth required)
- `GET /profile/transactions` - Get profile transactions (auth required)

### Categories (`/api/categories`)
- `GET /categories` - List categories

### Admin APIs (`/api/admin`)

All admin routes require admin authentication.

- **Competitions**: CRUD operations
- **Tickets**: List, view by competition, delete
- **Results**: CRUD operations
- **Notifications**: Create, list
- **Points**: Add/deduct points
- **Users**: CRUD operations
- **Categories**: CRUD operations
- **Dashboard**: Statistics and analytics

## Project Structure

```
src/
 ├── config/
 │    └── db.js                 # Database connection
 ├── controllers/
 │    ├── authController.js
 │    ├── competitionController.js
 │    ├── ticketController.js
 │    ├── resultController.js
 │    ├── notificationController.js
 │    ├── pointsController.js
 │    ├── profileController.js
 │    ├── categoryController.js
 │    └── admin/                # Admin controllers
 ├── middleware/
 │    ├── authMiddleware.js     # JWT authentication
 │    ├── isAdmin.js           # Admin authorization
 │    ├── responseTrait.js     # Global response helpers
 │    └── errorHandler.js      # Error handling
 ├── models/
 │    ├── User.js
 │    ├── Competition.js
 │    ├── Ticket.js
 │    ├── Winner.js
 │    ├── Notification.js
 │    ├── PointsHistory.js
 │    └── Category.js
 ├── routes/
 │    ├── auth.js
 │    ├── competitions.js
 │    ├── tickets.js
 │    ├── results.js
 │    ├── notifications.js
 │    ├── points.js
 │    ├── profile.js
 │    ├── categories.js
 │    └── admin.js
 ├── services/
 │    ├── authService.js
 │    ├── otpService.js         # Mocked OTP service
 │    └── emailService.js       # Mocked email service
 ├── utils/
 │    ├── jwt.js
 │    ├── pagination.js
 │    └── ticketNumber.js
 ├── scripts/
 │    └── seed.js               # Database seed script
 ├── app.js
 └── server.js
```

## Architecture & Design Decisions

### UUID vs MongoDB ObjectId

**All models in this application use UUID v4 strings as primary keys instead of MongoDB's native ObjectId.**

This is an intentional architectural decision made for the following reasons:

**Advantages:**
- **Cross-system compatibility**: UUIDs can be easily shared across different systems, databases, and APIs without type conversion
- **Predictability**: IDs can be generated client-side and known before database insertion (useful for distributed systems)
- **Human readability**: Easier to read and reference in logs, URLs, and API documentation
- **Privacy**: UUIDs don't reveal creation timestamps (unlike ObjectIds which embed timestamps)
- **Consistency**: All models (User, Competition, Ticket, etc.) use the same ID format

**Trade-offs:**
- **Storage**: UUIDs use ~36 bytes vs ObjectId's 12 bytes (~3x larger per document)
- **Performance**: Slightly slower lookups compared to ObjectId's optimized `_id` index
- **Mongoose optimizations**: Some Mongoose `findById` optimizations may not apply

**Important:** This design is consistent across all models. If migrating to ObjectIds is required, it should be done across all models with a comprehensive migration strategy.

### Notes

- OTP and email services are mocked for demo purposes
- All admin routes are protected by `authMiddleware` and `isAdmin` middleware
- Pagination is implemented for list endpoints
- Error handling middleware catches all errors

## License

ISC

