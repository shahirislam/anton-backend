# Payment API - cURL Examples for Postman Testing

This document provides ready-to-use cURL commands for testing all Payment API endpoints.

## Prerequisites

1. **Get Admin Access Token**: First, login as admin to get your access token:
```bash
curl -X POST "http://localhost:5000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "password": "admin123"
  }'
```

Save the `accessToken` from the response.

2. **Base URL**: Replace `http://localhost:5000` with your server URL if different
3. **Token**: Replace `YOUR_ACCESS_TOKEN` with the actual token from step 1

---

## 1. Get Payment Statistics

**Endpoint:** `GET /api/v1/admin/payments/stats`

```bash
curl -X GET "http://localhost:5000/api/v1/admin/payments/stats" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Payment statistics retrieved successfully",
  "data": {
    "totalRevenue": 15480.00,
    "successfulPayments": 1247,
    "failedPayments": 23,
    "averageOrder": 12.45
  }
}
```

---

## 2. Get All Payments

### 2.1 Basic Request (Default Pagination)

```bash
curl -X GET "http://localhost:5000/api/v1/admin/payments" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json"
```

### 2.2 With Pagination

```bash
curl -X GET "http://localhost:5000/api/v1/admin/payments?page=1&limit=20" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json"
```

### 2.3 Filter by Status

```bash
# Get completed payments
curl -X GET "http://localhost:5000/api/v1/admin/payments?status=completed" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json"

# Get pending payments
curl -X GET "http://localhost:5000/api/v1/admin/payments?status=pending" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json"

# Get failed payments
curl -X GET "http://localhost:5000/api/v1/admin/payments?status=failed" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json"

# Get refunded payments
curl -X GET "http://localhost:5000/api/v1/admin/payments?status=refunded" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json"
```

### 2.4 Filter by Date Range

```bash
# Today's payments
curl -X GET "http://localhost:5000/api/v1/admin/payments?dateRange=today" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json"

# Last 7 days
curl -X GET "http://localhost:5000/api/v1/admin/payments?dateRange=week" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json"

# Last 30 days
curl -X GET "http://localhost:5000/api/v1/admin/payments?dateRange=month" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json"
```

### 2.5 Filter by Amount Range

```bash
# Low amount (under £10)
curl -X GET "http://localhost:5000/api/v1/admin/payments?amountRange=low" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json"

# Medium amount (£10 - £50)
curl -X GET "http://localhost:5000/api/v1/admin/payments?amountRange=medium" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json"

# High amount (over £50)
curl -X GET "http://localhost:5000/api/v1/admin/payments?amountRange=high" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json"
```

### 2.6 Custom Date Range

```bash
curl -X GET "http://localhost:5000/api/v1/admin/payments?startDate=2025-01-01T00:00:00Z&endDate=2025-01-31T23:59:59Z" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json"
```

### 2.7 Combined Filters

```bash
# Completed payments from last month, medium amount range, page 1
curl -X GET "http://localhost:5000/api/v1/admin/payments?status=completed&dateRange=month&amountRange=medium&page=1&limit=10" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Payments retrieved successfully",
  "data": {
    "payments": [
      {
        "_id": "7c899a13-d11c-4b7a-b29a-97525acf07ab",
        "transactionId": "TXN-001234",
        "userId": "7c899a13-d11c-4b7a-b29a-97525acf07ab",
        "userEmail": "john.doe@email.com",
        "userName": "John Doe",
        "competitionId": "e6bf315c-df7a-4c31-8463-3fd8bc59f4eb",
        "competitionName": "TMG BLACKBERRY CADDY",
        "amount": 19.70,
        "currency": "USD",
        "status": "completed",
        "paymentMethod": "stripe",
        "paymentProvider": "stripe",
        "ticketsPurchased": 10,
        "createdAt": "2025-09-27T10:30:00.000Z",
        "updatedAt": "2025-09-27T10:30:00.000Z",
        "refundedAt": null,
        "refundReason": null,
        "failureReason": null
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1247,
      "totalPages": 125,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

---

## 3. Get Payment Details by ID

**Endpoint:** `GET /api/v1/admin/payments/:id`

**Note:** Replace `PAYMENT_ID_HERE` with an actual payment ID from the list endpoint.

```bash
curl -X GET "http://localhost:5000/api/v1/admin/payments/PAYMENT_ID_HERE" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json"
```

**Example with actual ID:**
```bash
curl -X GET "http://localhost:5000/api/v1/admin/payments/7c899a13-d11c-4b7a-b29a-97525acf07ab" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Payment retrieved successfully",
  "data": {
    "payment": {
      "_id": "7c899a13-d11c-4b7a-b29a-97525acf07ab",
      "transactionId": "TXN-001234",
      "userId": "7c899a13-d11c-4b7a-b29a-97525acf07ab",
      "user": {
        "_id": "7c899a13-d11c-4b7a-b29a-97525acf07ab",
        "name": "John Doe",
        "email": "john.doe@email.com",
        "phone_number": "+441234567890"
      },
      "competitionId": "e6bf315c-df7a-4c31-8463-3fd8bc59f4eb",
      "competition": {
        "_id": "e6bf315c-df7a-4c31-8463-3fd8bc59f4eb",
        "title": "TMG BLACKBERRY CADDY",
        "slug": "tmg-blackberry-caddy"
      },
      "amount": 19.70,
      "currency": "USD",
      "status": "completed",
      "paymentMethod": "stripe",
      "paymentProvider": "stripe",
      "providerTransactionId": "ch_1234567890abcdef",
      "ticketsPurchased": 10,
      "ticketNumbers": ["TKT001", "TKT002", "TKT003"],
      "createdAt": "2025-09-27T10:30:00.000Z",
      "updatedAt": "2025-09-27T10:30:00.000Z",
      "refundedAt": null,
      "refundReason": null,
      "failureReason": null,
      "billingAddress": null
    }
  }
}
```

---

## 4. Refund Payment

**Endpoint:** `PUT /api/v1/admin/payments/:id/refund`

### 4.1 Full Refund (No Amount Specified)

```bash
curl -X PUT "http://localhost:5000/api/v1/admin/payments/PAYMENT_ID_HERE/refund" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Customer requested refund"
  }'
```

### 4.2 Full Refund with Reason

```bash
curl -X PUT "http://localhost:5000/api/v1/admin/payments/PAYMENT_ID_HERE/refund" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Customer requested refund",
    "partialRefund": false
  }'
```

### 4.3 Partial Refund

```bash
curl -X PUT "http://localhost:5000/api/v1/admin/payments/PAYMENT_ID_HERE/refund" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Partial refund for damaged item",
    "amount": 10.00,
    "partialRefund": true
  }'
```

**Example with actual ID:**
```bash
curl -X PUT "http://localhost:5000/api/v1/admin/payments/7c899a13-d11c-4b7a-b29a-97525acf07ab/refund" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Customer requested refund",
    "partialRefund": false
  }'
```

**Expected Response (Success):**
```json
{
  "success": true,
  "message": "Payment refunded successfully",
  "data": {
    "payment": {
      "_id": "7c899a13-d11c-4b7a-b29a-97525acf07ab",
      "transactionId": "TXN-001234",
      "status": "refunded",
      "refundedAt": "2025-09-28T10:30:00.000Z",
      "refundReason": "Customer requested refund",
      "refundAmount": 19.70,
      "updatedAt": "2025-09-28T10:30:00.000Z"
    }
  }
}
```

**Expected Response (Error - Payment not refundable):**
```json
{
  "success": false,
  "message": "Payment cannot be refunded. Current status: pending"
}
```

---

## 5. Retry Failed Payment

**Endpoint:** `PUT /api/v1/admin/payments/:id/retry`

### 5.1 Basic Retry

```bash
curl -X PUT "http://localhost:5000/api/v1/admin/payments/PAYMENT_ID_HERE/retry" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json"
```

### 5.2 Retry with Payment Method

```bash
curl -X PUT "http://localhost:5000/api/v1/admin/payments/PAYMENT_ID_HERE/retry" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "paymentMethod": "stripe"
  }'
```

**Example with actual ID:**
```bash
curl -X PUT "http://localhost:5000/api/v1/admin/payments/9e0bc135-f33e-6d9c-d41c-19747ce29cd/retry" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "paymentMethod": "stripe"
  }'
```

**Expected Response (Success):**
```json
{
  "success": true,
  "message": "Payment retry initiated successfully",
  "data": {
    "payment": {
      "_id": "9e0bc135-f33e-6d9c-d41c-19747ce29cd",
      "transactionId": "TXN-001236",
      "status": "pending",
      "updatedAt": "2025-09-28T10:30:00.000Z"
    }
  }
}
```

**Expected Response (Error - Payment not retryable):**
```json
{
  "success": false,
  "message": "Payment cannot be retried. Current status: completed"
}
```

---

## Complete Testing Workflow

Here's a complete workflow to test all endpoints:

### Step 1: Login as Admin
```bash
curl -X POST "http://localhost:5000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "password": "admin123"
  }'
```

**Save the `accessToken` from response**

### Step 2: Get Payment Statistics
```bash
curl -X GET "http://localhost:5000/api/v1/admin/payments/stats" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json"
```

### Step 3: Get List of Payments
```bash
curl -X GET "http://localhost:5000/api/v1/admin/payments?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json"
```

**Copy a payment `_id` from the response**

### Step 4: Get Payment Details
```bash
curl -X GET "http://localhost:5000/api/v1/admin/payments/PAYMENT_ID_FROM_STEP_3" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json"
```

### Step 5: Test Refund (if payment status is "completed")
```bash
curl -X PUT "http://localhost:5000/api/v1/admin/payments/PAYMENT_ID_FROM_STEP_3/refund" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Test refund",
    "partialRefund": false
  }'
```

### Step 6: Test Retry (if payment status is "failed")
```bash
curl -X PUT "http://localhost:5000/api/v1/admin/payments/FAILED_PAYMENT_ID/retry" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "paymentMethod": "stripe"
  }'
```

---

## Postman Collection Setup

### Environment Variables

Create a Postman environment with these variables:

- `base_url`: `http://localhost:5000`
- `api_version`: `v1`
- `access_token`: (will be set after login)

### Pre-request Script for Login

You can create a pre-request script in Postman to automatically get the token:

```javascript
// Pre-request script (for login endpoint only)
pm.sendRequest({
    url: pm.environment.get("base_url") + "/api/v1/auth/login",
    method: 'POST',
    header: {
        'Content-Type': 'application/json'
    },
    body: {
        mode: 'raw',
        raw: JSON.stringify({
            email: "admin@test.com",
            password: "admin123"
        })
    }
}, function (err, res) {
    if (res.json().data && res.json().data.accessToken) {
        pm.environment.set("access_token", res.json().data.accessToken);
    }
});
```

### Using Variables in Requests

In Postman, use variables like this:

```
{{base_url}}/api/{{api_version}}/admin/payments/stats
```

Authorization Header:
```
Bearer {{access_token}}
```

---

## Common Error Responses

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Authentication required. Please provide a valid token."
}
```
**Solution:** Check your access token is valid and not expired.

### 403 Forbidden
```json
{
  "success": false,
  "message": "Access denied. Admin privileges required."
}
```
**Solution:** Make sure you're logged in as an admin user.

### 404 Not Found
```json
{
  "success": false,
  "message": "Payment not found"
}
```
**Solution:** Check the payment ID is correct.

### 400 Bad Request
```json
{
  "success": false,
  "message": "Payment cannot be refunded. Current status: pending"
}
```
**Solution:** Check the payment status - only completed payments can be refunded.

---

## Tips for Testing

1. **Start with Statistics**: Always test the stats endpoint first to ensure authentication works
2. **Get Payment IDs**: Use the list endpoint to get valid payment IDs for testing details/refund/retry
3. **Check Status**: Before testing refund, ensure the payment status is "completed"
4. **Check Status**: Before testing retry, ensure the payment status is "failed"
5. **Use Filters**: Test various filter combinations to ensure they work correctly
6. **Test Pagination**: Try different page numbers and limits
7. **Error Cases**: Test error scenarios (invalid IDs, wrong status, etc.)

---

## Notes

- All endpoints require admin authentication
- Payment IDs are UUIDs (e.g., `7c899a13-d11c-4b7a-b29a-97525acf07ab`)
- Transaction IDs are auto-generated in format `TXN-XXXXXX`
- Refunds are processed through Stripe, so ensure Stripe is properly configured
- Status values: `completed`, `pending`, `failed`, `refunded`
- Date ranges: `today`, `week`, `month`
- Amount ranges: `low` (< £10), `medium` (£10-£50), `high` (> £50)

