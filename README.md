# TMG Competitions Backend API

Production-ready Express.js + MongoDB backend for TMG Competitions Ltd - Online Raffle Ticket Platform.

## Features

- ✅ Complete authentication system with JWT (access + refresh tokens)
- ✅ OTP-based email verification (mocked for demo)
- ✅ Competition management (user & admin)
- ✅ Ticket purchase system with points
- ✅ Stripe payment integration (test/live mode)
- ✅ Results & winners management
- ✅ Notifications system
- ✅ Points management with history
- ✅ User profile management
- ✅ Category management
- ✅ Complete admin APIs
- ✅ WebRTC live streaming for competitions
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
APP_URL=http://localhost:5000  # Backend URL (used for file URLs, OAuth callbacks)
BASE_URL=http://localhost:5000  # Alternative to APP_URL (used for file URLs - set to your production URL)
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

# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...  # Your Stripe secret key (test or live)
STRIPE_WEBHOOK_SECRET=whsec_...  # Webhook signing secret (get from Stripe Dashboard)

# WebRTC Streaming Configuration
STUN_SERVER_URL=stun:stun.l.google.com:19302  # STUN server for NAT traversal (default: Google's public STUN)
TURN_SERVER_URL=  # Optional: TURN server URL for complex networks (e.g., turn:turnserver.com:3478)
TURN_USERNAME=  # Optional: TURN server username
TURN_CREDENTIAL=  # Optional: TURN server credential
STREAM_BASE_URL=http://localhost:5000  # Base URL for public stream viewing pages (defaults to APP_URL)
FRONTEND_URL=http://localhost:3000  # Frontend URL for WebSocket CORS (optional, defaults to *)
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

### Postman Collections

Import the Postman collection files into Postman for complete API testing:

- **Social Authentication API** (`postman/Social_Authentication_API.postman_collection.json`) - Social auth endpoints
- **Terms and Conditions API** (`postman/Terms_and_Conditions_API.postman_collection.json`) - Terms endpoints
- **Stripe Payment API** (`postman/Stripe_Payment_API.postman_collection.json`) - Payment integration endpoints ⭐ **NEW**

The collections include:
- All endpoints organized by folders
- Example request bodies
- Environment variables for base URL and access token
- Automatic variable extraction from responses

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
- `POST /auth/change-password` - Change password (auth required) ⭐ **NEW**
- `POST /auth/logout` - Logout

### Social Authentication (`/api/auth`)
- `GET /auth/google` - Get Google OAuth URL (web)
- `GET /auth/google/callback` - Google OAuth callback (web)
- `POST /auth/google/mobile` - Google Sign-In with idToken (mobile) ⭐ **NEW**
- `POST /auth/apple` - Apple Sign-In with idToken (mobile)
- `GET /auth/instagram` - Get Instagram OAuth URL (web)
- `POST /auth/link` - Link social account (auth required)
- `POST /auth/unlink` - Unlink social account (auth required)

**📱 Google Sign-In Setup**: See [docs/GOOGLE_CONSOLE_SETUP.md](./docs/GOOGLE_CONSOLE_SETUP.md) for Google Console configuration and [docs/GOOGLE_FLUTTER_INTEGRATION.md](./docs/GOOGLE_FLUTTER_INTEGRATION.md) for Flutter integration.

### Competitions (`/api/competitions`)
- `GET /competitions` - List competitions (paginated)
- `GET /competitions/recent` - Recent competitions
- `GET /competitions/search` - Search competitions
- `GET /competitions/:id` - Get competition by ID

### Tickets (`/api/tickets`)
- `POST /tickets/purchase` - Purchase tickets (auth required) - **DEPRECATED: Use payment endpoints**
- `GET /tickets/my` - Get user's tickets (auth required)
- `GET /tickets/competition/:id` - Get tickets for competition (auth required)
- `GET /tickets/search` - Search by ticket number

### Payments (`/api/payments`)
- `POST /payments/create-intent/single` - Create payment intent for single ticket purchase (auth required)
- `POST /payments/create-intent/checkout` - Create payment intent for cart checkout (auth required)
- `GET /payments/status/:payment_intent_id` - Get payment status (auth required)
- `POST /payments/webhook` - Stripe webhook endpoint (no auth, signature verified)

**📱 Mobile Integration**: See [docs/STRIPE_MOBILE_INTEGRATION.md](./docs/STRIPE_MOBILE_INTEGRATION.md) for Flutter integration guide.

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
- **Streams**: Live streaming management ⭐ **NEW**
  - `POST /streams/:competitionId/start` - Start WebRTC stream for competition
  - `POST /streams/:competitionId/stop` - Stop active stream
  - `GET /streams/:competitionId/status` - Get stream status
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

