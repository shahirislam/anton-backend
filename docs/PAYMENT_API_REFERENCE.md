# Payment API Reference

Simple API reference for payment endpoints.

## Base URL

```
{{base_url}}/api/v1/payments
```

## Authentication

All endpoints require Bearer token authentication (except webhook):

```
Authorization: Bearer <access_token>
```

---

## 1. Create Payment Intent - Single Purchase

Creates a Stripe payment intent for purchasing tickets from a single competition.

**Endpoint:** `POST /create-intent/single`

**Request Body:**
```json
{
  "competition_id": "b706d2c6-a5e8-4346-91cd-64964d69ac9b",
  "quantity": 5
}
```

**Request Parameters:**
- `competition_id` (string, required) - Competition ID
- `quantity` (number, optional) - Number of tickets (default: 1, min: 1)

**Response (201):**
```json
{
  "success": true,
  "message": "Payment intent created successfully",
  "data": {
    "payment_intent_id": "pi_3ABC123def456",
    "client_secret": "pi_3ABC123def456_secret_xyz789",
    "amount": 4.95,
    "currency": "usd"
  }
}
```

**Response Fields:**
- `payment_intent_id` - Stripe payment intent ID (use for status checks)
- `client_secret` - Stripe client secret (use with Stripe.js to confirm payment)
- `amount` - Total amount in USD (ticket_price × quantity)
- `currency` - Payment currency (always "usd")

**Error Responses:**
- `400` - Competition not active / Not enough tickets / Max tickets exceeded
- `404` - Competition not found

---

## 2. Create Payment Intent - Cart Checkout

Creates a Stripe payment intent for checking out all items in the user's cart.

**Endpoint:** `POST /create-intent/checkout`

**Request Body:**
```json
{
  "points_to_redeem": 500
}
```

**Request Parameters:**
- `points_to_redeem` (number, optional) - Points to redeem for discount (default: 0, min: 100)

**Response (201):**
```json
{
  "success": true,
  "message": "Payment intent created successfully",
  "data": {
    "payment_intent_id": "pi_3ABC123def789",
    "client_secret": "pi_3ABC123def789_secret_xyz123",
    "amount": 24.50,
    "currency": "usd",
    "cart_total": 29.50,
    "discount_amount": 5.00,
    "points_redeemed": 500
  }
}
```

**Response Fields:**
- `payment_intent_id` - Stripe payment intent ID
- `client_secret` - Stripe client secret for payment confirmation
- `amount` - Final amount to pay after discount (in USD)
- `currency` - Payment currency (always "usd")
- `cart_total` - Total cart value before discount
- `discount_amount` - Discount amount applied (in USD)
- `points_redeemed` - Points redeemed for discount

**Points Redemption Rules:**
- Minimum redemption: 100 points
- Conversion: 100 points = $1.00 discount
- Maximum discount cannot exceed cart total

**Error Responses:**
- `400` - Cart is empty / No active competitions / Insufficient points / Minimum redemption not met / Amount too low

---

## 3. Get Payment Status

Check the status of a payment intent and whether tickets have been created.

**Endpoint:** `GET /status/:payment_intent_id`

**URL Parameters:**
- `payment_intent_id` (string, required) - Stripe payment intent ID

**Response (200):**
```json
{
  "success": true,
  "message": "Payment status retrieved successfully",
  "data": {
    "payment_intent_id": "pi_3ABC123def456",
    "status": "succeeded",
    "amount": 4.95,
    "currency": "usd",
    "tickets_created": true,
    "created_at": "2025-11-29T23:28:23.905Z",
    "updated_at": "2025-11-29T23:28:24.298Z"
  }
}
```

**Response Fields:**
- `payment_intent_id` - Stripe payment intent ID
- `status` - Payment status: `pending`, `processing`, `succeeded`, `completed`, `failed`, `canceled`, `refunded`
- `amount` - Payment amount (in USD)
- `currency` - Payment currency
- `tickets_created` - Boolean indicating if tickets have been created
- `created_at` - Payment creation timestamp
- `updated_at` - Last update timestamp

**Payment Status Values:**
- `pending` - Payment intent created, awaiting payment
- `processing` - Payment is being processed
- `succeeded` - Payment succeeded, tickets being created
- `completed` - Payment completed and tickets created
- `failed` - Payment failed
- `canceled` - Payment was canceled
- `refunded` - Payment was refunded

**Error Responses:**
- `404` - Payment not found

**Note:** When `tickets_created` is `true`, tickets are ready. Fetch user tickets using `/api/v1/user/tickets/my` to get ticket details.

---

## 4. Payment Webhook

Stripe webhook endpoint for processing payment events. Handled automatically by backend.

**Endpoint:** `POST /webhook`

**Note:** This endpoint is for Stripe webhooks only. Frontend should not call this directly.

**What it does:**
- Automatically creates tickets when payment succeeds
- Updates payment status
- Awards points to users
- Updates competition ticket counts

---

## Payment Flow Summary

1. **Create Payment Intent** - Call `/create-intent/single` or `/create-intent/checkout`
2. **Confirm Payment** - Use `client_secret` with Stripe.js to confirm payment
3. **Check Status** - Poll `/status/:payment_intent_id` until `tickets_created` is `true`
4. **Get Tickets** - Fetch tickets from `/api/v1/user/tickets/my` endpoint

---

## Error Response Format

All errors follow this format:

```json
{
  "success": false,
  "message": "Error message description"
}
```

