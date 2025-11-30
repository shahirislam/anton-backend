# Payment API Documentation for Frontend

This document provides complete API documentation for implementing payment functionality in the web frontend.

## Quick Reference

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/create-intent/single` | POST | Create payment intent for single competition | Yes |
| `/create-intent/checkout` | POST | Create payment intent for cart checkout | Yes |
| `/status/:payment_intent_id` | GET | Get payment status | Yes |
| `/webhook` | POST | Stripe webhook (backend only) | No |

## Base URL

```
{{base_url}}/api/v1/payments
```

## Authentication

All endpoints (except webhook) require authentication via Bearer token:

```
Authorization: Bearer <access_token>
```

---

## 1. Create Payment Intent for Single Purchase

Creates a Stripe payment intent for purchasing tickets for a single competition.

### Endpoint

```
POST /create-intent/single
```

### Request Body

```json
{
  "competition_id": "b706d2c6-a5e8-4346-91cd-64964d69ac9b",
  "quantity": 5
}
```

### Request Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `competition_id` | string | Yes | Competition ID to purchase tickets for |
| `quantity` | number | No | Number of tickets to purchase (default: 1, min: 1) |

### Response (Success - 201)

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

### Response Fields

- `payment_intent_id` - Stripe payment intent ID (use this to track payment status)
- `client_secret` - Stripe client secret (use this with Stripe.js to confirm payment)
- `amount` - Total amount in USD (competition ticket price × quantity)
- `currency` - Payment currency (always "usd")

### Error Responses

#### 400 Bad Request - Competition not active
```json
{
  "success": false,
  "message": "Competition is not active"
}
```

#### 400 Bad Request - Not enough tickets
```json
{
  "success": false,
  "message": "Not enough tickets available"
}
```

#### 400 Bad Request - Max tickets per person exceeded
```json
{
  "success": false,
  "message": "Maximum 100 tickets per person. You already have 95 ticket(s), and can purchase up to 5 more."
}
```

#### 404 Not Found - Competition not found
```json
{
  "success": false,
  "message": "Competition not found"
}
```

### Frontend Implementation

```javascript
// 1. Create payment intent
const response = await fetch(`${baseUrl}/api/v1/payments/create-intent/single`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    competition_id: 'b706d2c6-a5e8-4346-91cd-64964d69ac9b',
    quantity: 5
  })
});

const data = await response.json();

if (data.success) {
  const { payment_intent_id, client_secret } = data.data;
  
  // 2. Use Stripe.js to confirm payment
  const stripe = Stripe('YOUR_STRIPE_PUBLISHABLE_KEY');
  const result = await stripe.confirmCardPayment(client_secret, {
    payment_method: {
      card: cardElement,
      billing_details: {
        name: 'Customer Name'
      }
    }
  });

  if (result.error) {
    // Handle error
    console.error(result.error.message);
  } else {
    // Payment succeeded - tickets are automatically created via webhook
    // Poll payment status or wait for webhook confirmation
  }
}
```

---

## 2. Create Payment Intent for Cart Checkout

Creates a Stripe payment intent for checking out all items in the user's cart.

### Endpoint

```
POST /create-intent/checkout
```

### Request Body

```json
{
  "points_to_redeem": 500
}
```

### Request Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `points_to_redeem` | number | No | Points to redeem for discount (default: 0, min: 0, min redemption: 100) |

### Response (Success - 201)

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

### Response Fields

- `payment_intent_id` - Stripe payment intent ID
- `client_secret` - Stripe client secret for payment confirmation
- `amount` - Final amount to pay after discount (in USD)
- `currency` - Payment currency (always "usd")
- `cart_total` - Total cart value before discount
- `discount_amount` - Discount amount applied (in USD)
- `points_redeemed` - Points redeemed for this discount

### Error Responses

#### 400 Bad Request - Empty cart
```json
{
  "success": false,
  "message": "Cart is empty"
}
```

#### 400 Bad Request - No active competitions
```json
{
  "success": false,
  "message": "No active competitions in cart"
}
```

#### 400 Bad Request - Insufficient points
```json
{
  "success": false,
  "message": "Insufficient points. You have 300 points but trying to redeem 500"
}
```

#### 400 Bad Request - Minimum redemption not met
```json
{
  "success": false,
  "message": "Minimum redemption is 100 points"
}
```

#### 400 Bad Request - Amount too low
```json
{
  "success": false,
  "message": "Final amount after discount is too low. Minimum payment is $0.50"
}
```

### Points Redemption Rules

- **Minimum redemption**: 100 points
- **Conversion rate**: 100 points = $1.00 discount
- **Maximum discount**: Cannot exceed cart total
- **Points required**: User must have sufficient points balance

### Frontend Implementation

```javascript
// 1. Create checkout payment intent
const response = await fetch(`${baseUrl}/api/v1/payments/create-intent/checkout`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    points_to_redeem: 500 // Optional, 0 if not redeeming
  })
});

const data = await response.json();

if (data.success) {
  const { payment_intent_id, client_secret, amount, discount_amount, points_redeemed } = data.data;
  
  // Show user the breakdown
  console.log(`Cart Total: $${data.data.cart_total}`);
  console.log(`Discount: $${discount_amount} (${points_redeemed} points)`);
  console.log(`Final Amount: $${amount}`);
  
  // 2. Confirm payment with Stripe
  const stripe = Stripe('YOUR_STRIPE_PUBLISHABLE_KEY');
  const result = await stripe.confirmCardPayment(client_secret, {
    payment_method: {
      card: cardElement
    }
  });

  if (result.error) {
    console.error(result.error.message);
  } else {
    // Payment succeeded - tickets created via webhook
    // Clear cart and redirect to success page
  }
}
```

---

## 3. Get Payment Status

Check the status of a payment intent.

### Endpoint

```
GET /status/:payment_intent_id
```

### URL Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `payment_intent_id` | string | Yes | Stripe payment intent ID |

### Response (Success - 200)

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

### Response Fields

- `payment_intent_id` - Stripe payment intent ID
- `status` - Payment status: `pending`, `processing`, `succeeded`, `completed`, `failed`, `canceled`, `refunded`
- `amount` - Payment amount (in USD)
- `currency` - Payment currency
- `tickets_created` - Boolean indicating if tickets have been created
- `created_at` - Payment creation timestamp
- `updated_at` - Last update timestamp

**Note**: When `tickets_created` is `true`, tickets have been successfully created. You can fetch the user's tickets using the `/api/v1/user/tickets/my` endpoint to get the actual ticket details.

### Payment Status Values

| Status | Description |
|--------|-------------|
| `pending` | Payment intent created, awaiting payment |
| `processing` | Payment is being processed |
| `succeeded` | Payment succeeded, tickets being created |
| `completed` | Payment completed and tickets created |
| `failed` | Payment failed |
| `canceled` | Payment was canceled |
| `refunded` | Payment was refunded |

### Error Responses

#### 404 Not Found
```json
{
  "success": false,
  "message": "Payment not found"
}
```

### Frontend Implementation

```javascript
// Poll payment status after payment confirmation
const checkPaymentStatus = async (paymentIntentId) => {
  const response = await fetch(
    `${baseUrl}/api/v1/payments/status/${paymentIntentId}`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    }
  );

  const data = await response.json();

  if (data.success) {
    const { status, tickets_created } = data.data;

    if (status === 'succeeded' || status === 'completed') {
      if (tickets_created) {
        // Tickets are ready, show success
        // Fetch actual tickets from /api/v1/user/tickets/my endpoint
        return { success: true, payment_intent_id: data.data.payment_intent_id };
      } else {
        // Payment succeeded but tickets not created yet, poll again
        return { success: false, retry: true };
      }
    } else if (status === 'failed') {
      return { success: false, error: 'Payment failed' };
    } else {
      // Still processing, poll again
      return { success: false, retry: true };
    }
  }
};

// Usage with polling
const pollPayment = async (paymentIntentId, maxAttempts = 10) => {
  for (let i = 0; i < maxAttempts; i++) {
    const result = await checkPaymentStatus(paymentIntentId);
    
    if (result.success) {
      return result;
    } else if (result.error) {
      throw new Error(result.error);
    }
    
    // Wait 2 seconds before next poll
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  throw new Error('Payment status check timeout');
};
```

---

## 4. Payment Webhook (Backend Only)

**Note**: This endpoint is for Stripe webhooks only. Frontend should not call this directly.

The webhook automatically:
- Creates tickets when payment succeeds
- Updates payment status
- Awards points to users
- Updates competition ticket counts

---

## Complete Payment Flow

### Single Purchase Flow

```javascript
async function purchaseTickets(competitionId, quantity) {
  try {
    // Step 1: Create payment intent
    const intentResponse = await fetch(`${baseUrl}/api/v1/payments/create-intent/single`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        competition_id: competitionId,
        quantity: quantity
      })
    });

    const intentData = await intentResponse.json();
    
    if (!intentData.success) {
      throw new Error(intentData.message);
    }

    const { payment_intent_id, client_secret } = intentData.data;

    // Step 2: Confirm payment with Stripe
    const stripe = Stripe('YOUR_STRIPE_PUBLISHABLE_KEY');
    const result = await stripe.confirmCardPayment(client_secret, {
      payment_method: {
        card: cardElement,
        billing_details: {
          name: user.name,
          email: user.email
        }
      }
    });

    if (result.error) {
      throw new Error(result.error.message);
    }

    // Step 3: Poll payment status until tickets are created
    const paymentResult = await pollPayment(payment_intent_id);

    if (paymentResult.success) {
      // Success! Tickets created
      // Fetch tickets from /api/v1/user/tickets/my to get ticket details
      return {
        success: true,
        payment_intent_id
      };
    }
  } catch (error) {
    console.error('Payment error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
```

### Cart Checkout Flow

```javascript
async function checkoutCart(pointsToRedeem = 0) {
  try {
    // Step 1: Create checkout payment intent
    const intentResponse = await fetch(`${baseUrl}/api/v1/payments/create-intent/checkout`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        points_to_redeem: pointsToRedeem
      })
    });

    const intentData = await intentResponse.json();
    
    if (!intentData.success) {
      throw new Error(intentData.message);
    }

    const { payment_intent_id, client_secret, amount, discount_amount } = intentData.data;

    // Step 2: Confirm payment with Stripe
    const stripe = Stripe('YOUR_STRIPE_PUBLISHABLE_KEY');
    const result = await stripe.confirmCardPayment(client_secret, {
      payment_method: {
        card: cardElement
      }
    });

    if (result.error) {
      throw new Error(result.error.message);
    }

    // Step 3: Poll payment status
    const paymentResult = await pollPayment(payment_intent_id);

    if (paymentResult.success) {
      // Success! Clear cart and show success
      await clearCart();
      // Fetch tickets from /api/v1/user/tickets/my to get ticket details
      return {
        success: true,
        payment_intent_id
      };
    }
  } catch (error) {
    console.error('Checkout error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
```

---

## Error Handling

### Common Error Scenarios

1. **Network Errors**: Implement retry logic for network failures
2. **Payment Declined**: Show user-friendly message and allow retry
3. **Insufficient Funds**: Inform user and suggest alternative payment method
4. **Competition Sold Out**: Check competition status before creating intent
5. **Timeout**: Implement timeout for payment status polling

### Error Response Format

All errors follow this format:

```json
{
  "success": false,
  "message": "Error message description"
}
```

---

## Best Practices

1. **Always validate competition status** before creating payment intent
2. **Store payment_intent_id** for status tracking and support
3. **Implement polling with timeout** for payment status checks
4. **Handle webhook delays** - tickets may take a few seconds to create
5. **Show loading states** during payment processing
6. **Clear cart** only after confirmed ticket creation
7. **Log payment errors** for debugging and support
8. **Use Stripe test mode** during development

---

## Testing

### Test Card Numbers (Stripe Test Mode)

- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **Insufficient Funds**: `4000 0000 0000 9995`

Use any future expiry date, any 3-digit CVC, and any postal code.

---

## Support

For issues or questions:
- Check payment status using the status endpoint
- Review server logs for webhook processing
- Verify Stripe dashboard for payment details
- Contact backend team with `payment_intent_id` for support

