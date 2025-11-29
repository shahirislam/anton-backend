# Purchase History API - CURL Examples

This document provides CURL examples for the Purchase History API endpoint.

## Base URL
```
{{base_url}}/api/v1/user/profile
```

## Authentication
All endpoints require authentication via Bearer token in the Authorization header:
```
Authorization: Bearer <access_token>
```

---

## Get Purchase History

### Endpoint
```
GET /purchase-history
```

### Description
Retrieves the authenticated user's purchase history, showing all ticket purchases grouped by competition and payment.

### Request

```bash
curl -X GET "{{base_url}}/api/v1/user/profile/purchase-history" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json"
```

### Query Parameters (Optional)
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10, max: 100)

### Example with Pagination

```bash
curl -X GET "{{base_url}}/api/v1/user/profile/purchase-history?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json"
```

### Response Format

```json
{
  "success": true,
  "message": "Purchase history retrieved successfully",
  "data": {
    "purchase_history": [
      {
        "_id": "payment-id-or-payment-id-competition-id",
        "competition": {
          "_id": "competition-id",
          "title": "Luxury Sports Car",
          "slug": "luxury-sports-car",
          "image_url": "https://example.com/uploads/competitions/image.jpg"
        },
        "tickets": 3,
        "amount": 32.62,
        "date": "2024-01-01T00:00:00.000Z",
        "status": "completed",
        "payment_intent_id": "pi_xxxxx",
        "transaction_id": "TXN-123456"
      },
      {
        "_id": "payment-id-2",
        "competition": {
          "_id": "competition-id-2",
          "title": "Dream Vacation",
          "slug": "dream-vacation",
          "image_url": "https://example.com/uploads/competitions/image2.jpg"
        },
        "tickets": 1,
        "amount": 19.70,
        "date": "2024-01-02T00:00:00.000Z",
        "status": "pending",
        "payment_intent_id": "pi_yyyyy",
        "transaction_id": "TXN-123457"
      }
    ],
    "pagination": {
      "current_page": 1,
      "per_page": 10,
      "total": 25,
      "total_pages": 3,
      "has_next": true,
      "has_prev": false
    }
  }
}
```

### Response Fields

#### Purchase History Item
- `_id` - Unique identifier for the purchase entry
- `competition` - Competition details object
  - `_id` - Competition ID
  - `title` - Competition title
  - `slug` - Competition slug
  - `image_url` - Full URL to competition image
- `tickets` - Number of tickets purchased in this transaction
- `amount` - Total amount paid in GBP (converted from payment currency if needed)
- `date` - Purchase date (ISO 8601 format)
- `status` - Payment status: `"completed"` or `"pending"`
- `payment_intent_id` - Stripe payment intent ID
- `transaction_id` - Internal transaction ID

#### Status Values
- `"completed"` - Payment succeeded or completed
- `"pending"` - Payment is pending or processing

### Error Responses

#### 401 Unauthorized
```json
{
  "success": false,
  "message": "Authentication required. Please provide a valid token."
}
```

#### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Failed to retrieve purchase history"
}
```

---

## Complete CURL Examples

### Example 1: Get First Page of Purchase History

```bash
curl -X GET "https://anton-backend.onrender.com/api/v1/user/profile/purchase-history?page=1&limit=10" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json"
```

### Example 2: Get Purchase History (Default Pagination)

```bash
curl -X GET "https://anton-backend.onrender.com/api/v1/user/profile/purchase-history" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json"
```

### Example 3: Get Purchase History with Custom Limit

```bash
curl -X GET "https://anton-backend.onrender.com/api/v1/user/profile/purchase-history?page=1&limit=20" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json"
```

---

## Response Example (Full)

```json
{
  "success": true,
  "message": "Purchase history retrieved successfully",
  "data": {
    "purchase_history": [
      {
        "_id": "584f16de-9660-4453-9244-0012269ed9a3",
        "competition": {
          "_id": "f6b8fc5b-62a7-4c6a-a808-12e9fee018db",
          "title": "Luxury Sports Car",
          "slug": "luxury-sports-car",
          "image_url": "https://anton-backend.onrender.com/uploads/competitions/car-image.jpg"
        },
        "tickets": 3,
        "amount": 32.62,
        "date": "2024-01-01T12:00:00.000Z",
        "status": "completed",
        "payment_intent_id": "pi_3ABC123def456",
        "transaction_id": "TXN-123456"
      },
      {
        "_id": "584f16de-9660-4453-9244-0012269ed9a4",
        "competition": {
          "_id": "f6b8fc5b-62a7-4c6a-a808-12e9fee018db-2",
          "title": "Dream Vacation",
          "slug": "dream-vacation",
          "image_url": "https://anton-backend.onrender.com/uploads/competitions/vacation-image.jpg"
        },
        "tickets": 1,
        "amount": 19.70,
        "date": "2024-01-02T14:30:00.000Z",
        "status": "pending",
        "payment_intent_id": "pi_3ABC123def789",
        "transaction_id": "TXN-123457"
      },
      {
        "_id": "584f16de-9660-4453-9244-0012269ed9a5",
        "competition": {
          "_id": "f6b8fc5b-62a7-4c6a-a808-12e9fee018db-3",
          "title": "Gaming Console",
          "slug": "gaming-console",
          "image_url": "https://anton-backend.onrender.com/uploads/competitions/console-image.jpg"
        },
        "tickets": 5,
        "amount": 37.93,
        "date": "2024-01-03T10:15:00.000Z",
        "status": "completed",
        "payment_intent_id": "pi_3ABC123def012",
        "transaction_id": "TXN-123458"
      }
    ],
    "pagination": {
      "current_page": 1,
      "per_page": 10,
      "total": 15,
      "total_pages": 2,
      "has_next": true,
      "has_prev": false
    }
  }
}
```

---

## Notes

1. **Currency Conversion**: 
   - Amounts are stored in the Payment model in dollars (not cents)
   - If payment currency is USD, amounts are converted to GBP using an approximate rate (1 USD = 0.79 GBP)
   - For production, frontend should use real-time exchange rates for accurate conversion
   - If payment currency is already GBP, amounts are returned as-is

2. **Cart Checkouts**: For cart checkouts (multiple competitions in one payment), each competition appears as a separate entry in the purchase history.

3. **Status Mapping**:
   - `succeeded` or `completed` → `"completed"`
   - `pending` or `processing` → `"pending"`
   - All other statuses default to `"pending"`

4. **Date Format**: All dates are returned in ISO 8601 format (UTC).

5. **Image URLs**: Competition image URLs are automatically converted to full URLs if they are stored as relative paths.

6. **Ticket Count**: The ticket count reflects the actual number of tickets created for that payment, which may differ from the quantity if the payment failed partially.

---

## Testing with Postman

1. **Method**: GET
2. **URL**: `{{base_url}}/api/v1/user/profile/purchase-history`
3. **Headers**:
   - `Authorization`: `Bearer {{access_token}}`
   - `Content-Type`: `application/json`
4. **Query Params** (optional):
   - `page`: 1
   - `limit`: 10

---

## Frontend Integration

The response format is designed to match the UI requirements:

- **Competition**: Competition name and details
- **Tickets**: Number of tickets purchased
- **Amount**: Total amount in GBP
- **Date**: Purchase date (format as needed: `1/1/2024`)
- **Status**: `"completed"` (green badge) or `"pending"` (orange badge)

Example frontend usage:

```javascript
const response = await fetch(`${baseUrl}/api/v1/user/profile/purchase-history`, {
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  }
});

const data = await response.json();
const purchaseHistory = data.data.purchase_history;

// Format date for display
purchaseHistory.forEach(item => {
  const date = new Date(item.date);
  item.formattedDate = `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
});
```

