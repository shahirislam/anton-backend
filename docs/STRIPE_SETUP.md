# Stripe Payment Integration Setup Guide

This guide explains how to set up Stripe payments for the ticket purchasing system.

> **📱 For Mobile Team**: See [STRIPE_MOBILE_INTEGRATION.md](./STRIPE_MOBILE_INTEGRATION.md) for Flutter integration guide.

## Overview

The backend handles:
- ✅ Creating payment intents (for Flutter to use)
- ✅ Processing webhooks (to confirm payments and create tickets)
- ✅ Tracking payment status
- ✅ Automatic ticket creation after successful payment

The Flutter app handles:
- ✅ Collecting payment details from users
- ✅ Using Stripe SDK to confirm payments
- ✅ Displaying payment UI

## Backend Setup

### 1. Create a Stripe Account

1. Go to [https://stripe.com](https://stripe.com)
2. Sign up for a free account
3. Complete the account setup

### 2. Get Your API Keys

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to **Developers** → **API keys**
3. Copy your **Secret key** (starts with `sk_test_` for test mode or `sk_live_` for live mode)
4. Add it to your `.env` file:

```env
STRIPE_SECRET_KEY=sk_test_51...
```

### 3. Set Up Webhooks (REQUIRED - Even for Mobile Apps)

**⚠️ IMPORTANT**: Webhooks are **required** even if you're only using Stripe on a mobile app. Here's why:

- **Payment happens on mobile** → User pays via Flutter app
- **Backend needs to know** → Backend must be notified when payment succeeds
- **Tickets are created by backend** → Only webhooks trigger automatic ticket creation
- **Without webhooks** → Payment succeeds, but tickets are never created!

**The Flow:**
1. Mobile app confirms payment with Stripe ✅
2. Stripe sends webhook to your backend ✅
3. Backend receives webhook and creates tickets ✅
4. User gets their tickets ✅

**Without webhooks:**
1. Mobile app confirms payment with Stripe ✅
2. ❌ Backend never knows payment succeeded
3. ❌ Tickets are never created
4. ❌ User paid but has no tickets

#### For Local Development:

1. Install Stripe CLI: [https://stripe.com/docs/stripe-cli](https://stripe.com/docs/stripe-cli)
2. Login to Stripe CLI:
   ```bash
   stripe login
   ```
3. Forward webhooks to your local server:
   ```bash
   stripe listen --forward-to localhost:5000/api/v1/payments/webhook
   ```
4. Copy the webhook signing secret (starts with `whsec_`) and add to `.env`:
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

#### For Production (Mobile App):

**Your backend server must be publicly accessible** for webhooks to work:

1. Deploy your backend to a server (AWS, Heroku, DigitalOcean, etc.)
2. Ensure your backend URL is accessible (e.g., `https://api.yourdomain.com`)
3. Go to [Stripe Dashboard](https://dashboard.stripe.com)
4. Navigate to **Developers** → **Webhooks**
5. Click **Add endpoint**
6. Enter your webhook URL: `https://api.yourdomain.com/api/v1/payments/webhook`
   - ⚠️ **Must be HTTPS** (not HTTP)
   - ⚠️ **Must be publicly accessible** (not localhost)
7. Select events to listen for:
   - `payment_intent.succeeded` ✅ **Required**
   - `payment_intent.payment_failed` ✅ Recommended
   - `payment_intent.canceled` ✅ Recommended
8. Copy the **Signing secret** (starts with `whsec_`) and add to your production `.env`:
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

**Note**: Even though payments happen on mobile, Stripe sends webhooks to your backend server. The mobile app doesn't receive webhooks - only your backend does.

### 4. Test Mode vs Live Mode

- **Test Mode**: Use test API keys (start with `sk_test_`). No real charges.
- **Live Mode**: Use live API keys (start with `sk_live_`). Real charges.

**Important**: Always test in test mode first!

## API Endpoints

### 1. Create Payment Intent (Single Purchase)

**Endpoint**: `POST /api/v1/payments/create-intent/single`

**Headers**:
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body**:
```json
{
  "competition_id": "competition-uuid",
  "quantity": 2
}
```

**Response**:
```json
{
  "success": true,
  "message": "Payment intent created successfully",
  "data": {
    "payment_intent_id": "pi_...",
    "client_secret": "pi_..._secret_...",
    "amount": 20.00,
    "currency": "usd"
  }
}
```

**Flutter Usage**:
1. Call this endpoint to get `client_secret`
2. Use Stripe SDK to confirm payment with `client_secret`
3. After payment succeeds:
   - Stripe sends webhook to your backend (automatic)
   - Backend receives webhook and creates tickets (automatic)
   - Flutter can poll payment status or wait for backend confirmation

### 2. Create Payment Intent (Cart Checkout)

**Endpoint**: `POST /api/v1/payments/create-intent/checkout`

**Headers**:
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body**:
```json
{
  "points_to_redeem": 500
}
```

**Response**:
```json
{
  "success": true,
  "message": "Payment intent created successfully",
  "data": {
    "payment_intent_id": "pi_...",
    "client_secret": "pi_..._secret_...",
    "amount": 15.00,
    "currency": "usd",
    "cart_total": 20.00,
    "discount_amount": 5.00,
    "points_redeemed": 500
  }
}
```

### 3. Get Payment Status

**Endpoint**: `GET /api/v1/payments/status/:payment_intent_id`

**Headers**:
```
Authorization: Bearer <access_token>
```

**Response**:
```json
{
  "success": true,
  "message": "Payment status retrieved successfully",
  "data": {
    "payment_intent_id": "pi_...",
    "status": "succeeded",
    "amount": 20.00,
    "currency": "usd",
    "tickets_created": true,
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:01.000Z"
  }
}
```

**Status Values**:
- `pending` - Payment intent created, waiting for payment
- `processing` - Payment is being processed
- `succeeded` - Payment successful, tickets created
- `failed` - Payment failed
- `canceled` - Payment was canceled
- `refunded` - Payment was refunded

## Payment Flow

### Single Purchase Flow:

1. **User selects tickets** → Flutter app
2. **Create payment intent** → `POST /api/v1/payments/create-intent/single` (Flutter → Backend)
3. **Confirm payment** → Flutter uses Stripe SDK with `client_secret` (Flutter → Stripe)
4. **Webhook receives success** → Stripe sends webhook to backend (Stripe → Backend) ✅ **REQUIRED**
5. **Backend creates tickets** → Backend processes webhook and creates tickets (Backend)
6. **Check payment status** → `GET /api/v1/payments/status/:payment_intent_id` (Flutter → Backend)

### Cart Checkout Flow:

1. **User adds items to cart** → Flutter app
2. **User clicks checkout** → Flutter app
3. **Create payment intent** → `POST /api/v1/payments/create-intent/checkout` (Flutter → Backend)
4. **Confirm payment** → Flutter uses Stripe SDK with `client_secret` (Flutter → Stripe)
5. **Webhook receives success** → Stripe sends webhook to backend (Stripe → Backend) ✅ **REQUIRED**
6. **Backend creates tickets** → Backend processes webhook, creates tickets, clears cart (Backend)
7. **Check payment status** → `GET /api/v1/payments/status/:payment_intent_id` (Flutter → Backend)

## Testing with Stripe Test Cards

Use these test card numbers in test mode:

| Card Number | Description |
|------------|-------------|
| `4242 4242 4242 4242` | Visa - Success |
| `4000 0000 0000 0002` | Visa - Declined |
| `4000 0025 0000 3155` | Visa - Requires authentication |

**Expiry**: Any future date (e.g., `12/25`)  
**CVC**: Any 3 digits (e.g., `123`)  
**ZIP**: Any 5 digits (e.g., `12345`)

## Important Notes

1. **Webhooks are REQUIRED**: Even for mobile apps, webhooks are essential. Without them, tickets will never be created after payment.
2. **Minimum Amount**: Stripe requires a minimum of $0.50 (50 cents) per payment
3. **Webhook Security**: Webhooks are verified using Stripe signatures - never skip this!
4. **Idempotency**: The system prevents duplicate ticket creation if webhook is called multiple times
5. **Points Redemption**: Points can be redeemed during checkout (100 points = $1 discount)
6. **Transaction Safety**: All ticket creation happens in database transactions for data integrity
7. **Backend Must Be Public**: For production, your backend server must be publicly accessible via HTTPS for webhooks to work

## Troubleshooting

### Webhook Not Working

1. **For Production**: Ensure your backend is publicly accessible via HTTPS
2. Check `STRIPE_WEBHOOK_SECRET` is set correctly
3. Verify webhook URL is accessible (test with: `curl https://yourdomain.com/api/v1/payments/webhook`)
4. Check server logs for webhook errors
5. Use Stripe Dashboard → Webhooks → View logs to see webhook delivery status
6. **Common Issue**: Backend on localhost won't receive webhooks - you need a public URL or use Stripe CLI for local testing

### Payment Intent Creation Fails

1. Verify `STRIPE_SECRET_KEY` is set correctly
2. Check amount is at least $0.50
3. Verify competition exists and is active
4. Check user has not exceeded max tickets per person

### Tickets Not Created After Payment

1. Check webhook is configured correctly
2. Verify webhook events are being received
3. Check server logs for errors during ticket creation
4. Verify payment status in Stripe Dashboard

## Migration from Old Purchase Endpoints

The old endpoints (`POST /api/v1/tickets/purchase` and `POST /api/v1/user/cart/checkout`) are still available but **deprecated**. They create tickets immediately without payment processing.

**New flow**: Always use payment intents first, then confirm payment, then tickets are created via webhook.

## Support

For Stripe-specific issues:
- [Stripe Documentation](https://stripe.com/docs)
- [Stripe Support](https://support.stripe.com)

For backend integration issues:
- Check server logs
- Verify environment variables
- Test webhook endpoint manually

