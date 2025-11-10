# Payments API Requirements

## Overview
This document outlines the API structure required for the Payments page in the admin dashboard. The page displays payment statistics, a list of payments with filtering and pagination, and supports actions like viewing, refunding, and retrying payments.

---

## 1. Payment Statistics Endpoint

**Endpoint:** `GET {{base_url}}/admin/payments/stats`  
**Request Type:** `GET`  
**Authentication:** Required (Bearer Token)

### Response Structure
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

### Field Descriptions
- `totalRevenue` (number): Total revenue from all completed payments (in currency, e.g., GBP)
- `successfulPayments` (number): Total count of successful/completed payments
- `failedPayments` (number): Total count of failed payments
- `averageOrder` (number): Average order value (totalRevenue / successfulPayments)

---

## 2. Get All Payments Endpoint

**Endpoint:** `GET {{base_url}}/admin/payments`  
**Request Type:** `GET`  
**Authentication:** Required (Bearer Token)

### Query Parameters
| Parameter | Type | Required | Description | Example Values |
|-----------|------|----------|-------------|----------------|
| `page` | number | No | Page number (default: 1) | `1`, `2`, `3` |
| `limit` | number | No | Items per page (default: 10) | `10`, `20`, `50` |
| `status` | string | No | Filter by payment status | `completed`, `pending`, `failed`, `refunded` |
| `dateRange` | string | No | Filter by date range | `today`, `week`, `month` |
| `amountRange` | string | No | Filter by amount range | `low` (under £10), `medium` (£10-£50), `high` (over £50) |
| `startDate` | string | No | Custom start date (ISO 8601) | `2025-09-01T00:00:00Z` |
| `endDate` | string | No | Custom end date (ISO 8601) | `2025-09-30T23:59:59Z` |

### Example Request
```
GET {{base_url}}/admin/payments?page=1&limit=10&status=completed&dateRange=month&amountRange=medium
```

### Response Structure
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
        "currency": "GBP",
        "status": "completed",
        "paymentMethod": "stripe",
        "paymentProvider": "stripe",
        "ticketsPurchased": 10,
        "createdAt": "2025-09-27T10:30:00.000Z",
        "updatedAt": "2025-09-27T10:30:00.000Z",
        "refundedAt": null,
        "refundReason": null,
        "failureReason": null
      },
      {
        "_id": "8d9ab024-e22d-5c8b-c30b-08636bd18bc",
        "transactionId": "TXN-001235",
        "userId": "8d9ab024-e22d-5c8b-c30b-08636bd18bc",
        "userEmail": "sarah.connor@email.com",
        "userName": "Sarah Connor",
        "competitionId": "57adb417-ea60-4a0a-9747-775b2215a1d7",
        "competitionName": "BMW 3 Series Competition",
        "amount": 9.90,
        "currency": "GBP",
        "status": "pending",
        "paymentMethod": "paypal",
        "paymentProvider": "paypal",
        "ticketsPurchased": 10,
        "createdAt": "2025-09-27T11:15:00.000Z",
        "updatedAt": "2025-09-27T11:15:00.000Z",
        "refundedAt": null,
        "refundReason": null,
        "failureReason": null
      },
      {
        "_id": "9e0bc135-f33e-6d9c-d41c-19747ce29cd",
        "transactionId": "TXN-001236",
        "userId": "9e0bc135-f33e-6d9c-d41c-19747ce29cd",
        "userEmail": "mike.j@email.com",
        "userName": "Mike Johnson",
        "competitionId": "e6bf315c-df7a-4c31-8463-3fd8bc59f4eb",
        "competitionName": "TMG BLACKBERRY CADDY",
        "amount": 4.95,
        "currency": "GBP",
        "status": "failed",
        "paymentMethod": "stripe",
        "paymentProvider": "stripe",
        "ticketsPurchased": 5,
        "createdAt": "2025-09-26T14:20:00.000Z",
        "updatedAt": "2025-09-26T14:20:00.000Z",
        "refundedAt": null,
        "refundReason": null,
        "failureReason": "Card declined - insufficient funds"
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

### Field Descriptions
- `_id` (string): Unique payment identifier
- `transactionId` (string): Human-readable transaction ID (e.g., "TXN-001234")
- `userId` (string): ID of the user who made the payment
- `userEmail` (string): Email address of the user
- `userName` (string): Full name of the user
- `competitionId` (string): ID of the competition
- `competitionName` (string): Title/name of the competition
- `amount` (number): Payment amount
- `currency` (string): Currency code (e.g., "GBP", "USD")
- `status` (string): Payment status - `completed`, `pending`, `failed`, `refunded`
- `paymentMethod` (string): Payment method used (e.g., "stripe", "paypal", "card", "bank_transfer")
- `paymentProvider` (string): Payment provider (e.g., "stripe", "paypal")
- `ticketsPurchased` (number): Number of tickets purchased in this transaction
- `createdAt` (string): ISO 8601 timestamp of when payment was created
- `updatedAt` (string): ISO 8601 timestamp of when payment was last updated
- `refundedAt` (string | null): ISO 8601 timestamp of when payment was refunded (if applicable)
- `refundReason` (string | null): Reason for refund (if applicable)
- `failureReason` (string | null): Reason for payment failure (if applicable)

### Status Values
- `completed`: Payment successfully processed
- `pending`: Payment is being processed
- `failed`: Payment failed
- `refunded`: Payment was refunded

---

## 3. Get Payment Details Endpoint

**Endpoint:** `GET {{base_url}}/admin/payments/{paymentId}`  
**Request Type:** `GET`  
**Authentication:** Required (Bearer Token)

### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `paymentId` | string | Yes | Payment ID (from `_id` field) |

### Example Request
```
GET {{base_url}}/admin/payments/7c899a13-d11c-4b7a-b29a-97525acf07ab
```

### Response Structure
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
      "currency": "GBP",
      "status": "completed",
      "paymentMethod": "stripe",
      "paymentProvider": "stripe",
      "providerTransactionId": "ch_1234567890abcdef",
      "ticketsPurchased": 10,
      "ticketNumbers": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      "createdAt": "2025-09-27T10:30:00.000Z",
      "updatedAt": "2025-09-27T10:30:00.000Z",
      "refundedAt": null,
      "refundReason": null,
      "failureReason": null,
      "billingAddress": {
        "line1": "123 Main Street",
        "line2": "Apt 4B",
        "city": "London",
        "postalCode": "SW1A 1AA",
        "country": "GB"
      }
    }
  }
}
```

### Additional Fields for Details
- `user` (object): Full user object with additional details
- `competition` (object): Full competition object with additional details
- `providerTransactionId` (string): Transaction ID from payment provider (e.g., Stripe charge ID)
- `ticketNumbers` (array): Array of ticket numbers purchased in this transaction
- `billingAddress` (object): Billing address information (if available)

---

## 4. Refund Payment Endpoint

**Endpoint:** `PUT {{base_url}}/admin/payments/{paymentId}/refund`  
**Request Type:** `PUT`  
**Authentication:** Required (Bearer Token)

### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `paymentId` | string | Yes | Payment ID (from `_id` field) |

### Request Body
```json
{
  "reason": "Customer requested refund",
  "amount": 19.70,
  "partialRefund": false
}
```

### Request Body Fields
- `reason` (string, optional): Reason for refund
- `amount` (number, optional): Refund amount (for partial refunds). If not provided, full amount is refunded.
- `partialRefund` (boolean, optional): Whether this is a partial refund (default: false)

### Example Request
```
PUT {{base_url}}/admin/payments/7c899a13-d11c-4b7a-b29a-97525acf07ab/refund
Content-Type: application/json
Authorization: Bearer {token}

{
  "reason": "Customer requested refund",
  "partialRefund": false
}
```

### Response Structure
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

### Error Response (if payment cannot be refunded)
```json
{
  "success": false,
  "message": "Payment cannot be refunded",
  "error": "Payment is not in a refundable state (status: pending)"
}
```

---

## 5. Retry Failed Payment Endpoint

**Endpoint:** `PUT {{base_url}}/admin/payments/{paymentId}/retry`  
**Request Type:** `PUT`  
**Authentication:** Required (Bearer Token)

### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `paymentId` | string | Yes | Payment ID (from `_id` field) |

### Request Body (Optional)
```json
{
  "paymentMethod": "stripe",
  "cardToken": "tok_1234567890abcdef"
}
```

### Example Request
```
PUT {{base_url}}/admin/payments/9e0bc135-f33e-6d9c-d41c-19747ce29cd/retry
Content-Type: application/json
Authorization: Bearer {token}

{
  "paymentMethod": "stripe"
}
```

### Response Structure
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

### Error Response (if payment cannot be retried)
```json
{
  "success": false,
  "message": "Payment cannot be retried",
  "error": "Payment is not in a retryable state (status: completed)"
}
```

---

## 6. Export Payments Endpoint (Optional)

**Endpoint:** `GET {{base_url}}/admin/payments/export`  
**Request Type:** `GET`  
**Authentication:** Required (Bearer Token)

### Query Parameters
Same as "Get All Payments" endpoint (filters apply)

### Response
Returns a CSV or Excel file with payment data.

**Response Headers:**
```
Content-Type: text/csv
Content-Disposition: attachment; filename="payments-export-2025-09-28.csv"
```

---

## Notes for Backend Team

1. **Date Range Filtering:**
   - `dateRange=today`: Payments from today (00:00:00 to 23:59:59 of current day)
   - `dateRange=week`: Payments from last 7 days
   - `dateRange=month`: Payments from last 30 days

2. **Amount Range Filtering:**
   - `amountRange=low`: Amount < 10
   - `amountRange=medium`: 10 ≤ Amount ≤ 50
   - `amountRange=high`: Amount > 50

3. **Status Filtering:**
   - Should support filtering by: `completed`, `pending`, `failed`, `refunded`
   - Case-insensitive matching recommended

4. **Pagination:**
   - Default `page` should be 1
   - Default `limit` should be 10
   - Maximum `limit` should be 100 to prevent performance issues

5. **Sorting:**
   - Default sort should be by `createdAt` descending (newest first)
   - Consider adding `sortBy` and `sortOrder` query parameters for flexibility

6. **Error Handling:**
   - All endpoints should return consistent error format:
   ```json
   {
     "success": false,
     "message": "Error message",
     "error": "Detailed error information (optional)"
   }
   ```

7. **Authentication:**
   - All endpoints require Bearer token authentication
   - Token should be validated on every request
   - Return 401 Unauthorized if token is missing or invalid

8. **Rate Limiting:**
   - Consider implementing rate limiting for payment operations (especially refund/retry)

---

## Frontend Integration Notes

The frontend will:
- Fetch payment statistics on page load
- Fetch payments list with pagination and filters
- Support filtering by status, date range, and amount range
- Display payments in a table with pagination controls
- Show "View" button for all payments
- Show "Refund" button only for `completed` payments
- Show "Retry" button only for `failed` payments
- Handle loading and error states appropriately

