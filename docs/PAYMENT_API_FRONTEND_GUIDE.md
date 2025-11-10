# Payment API Frontend Implementation Guide

This guide provides step-by-step instructions for integrating the Admin Payment APIs into your frontend application.

## Table of Contents
1. [Overview](#overview)
2. [API Base URL](#api-base-url)
3. [Authentication](#authentication)
4. [API Endpoints](#api-endpoints)
5. [Implementation Steps](#implementation-steps)
6. [Code Examples](#code-examples)
7. [Error Handling](#error-handling)
8. [Best Practices](#best-practices)

---

## Overview

The Payment API provides endpoints for:
- Viewing payment statistics
- Listing and filtering payments
- Viewing payment details
- Refunding payments
- Retrying failed payments

All endpoints require admin authentication.

---

## API Base URL

```
http://localhost:5000/api/v1/admin/payments
```

For production, replace `localhost:5000` with your production server URL.

---

## Authentication

All endpoints require a Bearer token in the Authorization header:

```javascript
headers: {
  'Authorization': `Bearer ${accessToken}`,
  'Content-Type': 'application/json'
}
```

---

## API Endpoints

### 1. Get Payment Statistics

**Endpoint:** `GET /api/v1/admin/payments/stats`

**Response:**
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

### 2. Get All Payments

**Endpoint:** `GET /api/v1/admin/payments`

**Query Parameters:**
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 10)
- `status` (string, optional): Filter by status (`completed`, `pending`, `failed`, `refunded`)
- `dateRange` (string, optional): Filter by date range (`today`, `week`, `month`)
- `amountRange` (string, optional): Filter by amount (`low`, `medium`, `high`)
- `startDate` (string, optional): Custom start date (ISO 8601)
- `endDate` (string, optional): Custom end date (ISO 8601)

**Response:**
```json
{
  "success": true,
  "message": "Payments retrieved successfully",
  "data": {
    "payments": [...],
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

### 3. Get Payment Details

**Endpoint:** `GET /api/v1/admin/payments/:id`

**Response:**
```json
{
  "success": true,
  "message": "Payment retrieved successfully",
  "data": {
    "payment": {
      "_id": "...",
      "transactionId": "TXN-001234",
      "user": {...},
      "competition": {...},
      "amount": 19.70,
      "status": "completed",
      "ticketNumbers": [...],
      ...
    }
  }
}
```

### 4. Refund Payment

**Endpoint:** `PUT /api/v1/admin/payments/:id/refund`

**Request Body:**
```json
{
  "reason": "Customer requested refund",
  "amount": 19.70,
  "partialRefund": false
}
```

### 5. Retry Failed Payment

**Endpoint:** `PUT /api/v1/admin/payments/:id/retry`

**Request Body (optional):**
```json
{
  "paymentMethod": "stripe"
}
```

---

## Implementation Steps

### Step 1: Create API Service

Create a service file to handle all payment API calls:

```typescript
// services/paymentService.ts
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
const PAYMENTS_ENDPOINT = `${API_BASE_URL}/admin/payments`;

export interface PaymentStats {
  totalRevenue: number;
  successfulPayments: number;
  failedPayments: number;
  averageOrder: number;
}

export interface Payment {
  _id: string;
  transactionId: string;
  userId: string;
  userEmail: string;
  userName: string;
  competitionId: string;
  competitionName: string;
  amount: number;
  currency: string;
  status: 'completed' | 'pending' | 'failed' | 'refunded';
  paymentMethod: string;
  paymentProvider: string;
  ticketsPurchased: number;
  createdAt: string;
  updatedAt: string;
  refundedAt: string | null;
  refundReason: string | null;
  failureReason: string | null;
}

export interface PaymentFilters {
  page?: number;
  limit?: number;
  status?: string;
  dateRange?: 'today' | 'week' | 'month';
  amountRange?: 'low' | 'medium' | 'high';
  startDate?: string;
  endDate?: string;
}

export interface PaymentListResponse {
  payments: Payment[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

class PaymentService {
  private getAuthHeaders() {
    const token = localStorage.getItem('accessToken'); // or your token storage method
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  async getPaymentStats(): Promise<PaymentStats> {
    const response = await axios.get(
      `${PAYMENTS_ENDPOINT}/stats`,
      { headers: this.getAuthHeaders() }
    );
    return response.data.data;
  }

  async getPayments(filters: PaymentFilters = {}): Promise<PaymentListResponse> {
    const params = new URLSearchParams();
    
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.status) params.append('status', filters.status);
    if (filters.dateRange) params.append('dateRange', filters.dateRange);
    if (filters.amountRange) params.append('amountRange', filters.amountRange);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);

    const response = await axios.get(
      `${PAYMENTS_ENDPOINT}?${params.toString()}`,
      { headers: this.getAuthHeaders() }
    );
    return response.data.data;
  }

  async getPaymentById(id: string) {
    const response = await axios.get(
      `${PAYMENTS_ENDPOINT}/${id}`,
      { headers: this.getAuthHeaders() }
    );
    return response.data.data.payment;
  }

  async refundPayment(id: string, data: {
    reason?: string;
    amount?: number;
    partialRefund?: boolean;
  }) {
    const response = await axios.put(
      `${PAYMENTS_ENDPOINT}/${id}/refund`,
      data,
      { headers: this.getAuthHeaders() }
    );
    return response.data.data;
  }

  async retryPayment(id: string, data?: { paymentMethod?: string }) {
    const response = await axios.put(
      `${PAYMENTS_ENDPOINT}/${id}/retry`,
      data || {},
      { headers: this.getAuthHeaders() }
    );
    return response.data.data;
  }
}

export const paymentService = new PaymentService();
```

### Step 2: Create React Components

#### Payment Statistics Component

```typescript
// components/PaymentStats.tsx
import { useEffect, useState } from 'react';
import { paymentService, PaymentStats } from '@/services/paymentService';

export default function PaymentStats() {
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const data = await paymentService.getPaymentStats();
      setStats(data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading statistics...</div>;
  if (error) return <div className="error">Error: {error}</div>;
  if (!stats) return null;

  return (
    <div className="payment-stats">
      <div className="stat-card">
        <h3>Total Revenue</h3>
        <p className="stat-value">£{stats.totalRevenue.toFixed(2)}</p>
      </div>
      <div className="stat-card">
        <h3>Successful Payments</h3>
        <p className="stat-value">{stats.successfulPayments}</p>
      </div>
      <div className="stat-card">
        <h3>Failed Payments</h3>
        <p className="stat-value">{stats.failedPayments}</p>
      </div>
      <div className="stat-card">
        <h3>Average Order</h3>
        <p className="stat-value">£{stats.averageOrder.toFixed(2)}</p>
      </div>
    </div>
  );
}
```

#### Payment List Component

```typescript
// components/PaymentList.tsx
import { useEffect, useState } from 'react';
import { paymentService, Payment, PaymentFilters } from '@/services/paymentService';

export default function PaymentList() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [pagination, setPagination] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<PaymentFilters>({
    page: 1,
    limit: 10,
  });

  useEffect(() => {
    loadPayments();
  }, [filters]);

  const loadPayments = async () => {
    try {
      setLoading(true);
      const data = await paymentService.getPayments(filters);
      setPayments(data.payments);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Failed to load payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      completed: 'green',
      pending: 'yellow',
      failed: 'red',
      refunded: 'gray',
    };
    return (
      <span className={`badge badge-${colors[status] || 'gray'}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="payment-list">
      <div className="filters">
        <select
          value={filters.status || ''}
          onChange={(e) => handleFilterChange('status', e.target.value || undefined)}
        >
          <option value="">All Statuses</option>
          <option value="completed">Completed</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
          <option value="refunded">Refunded</option>
        </select>

        <select
          value={filters.dateRange || ''}
          onChange={(e) => handleFilterChange('dateRange', e.target.value || undefined)}
        >
          <option value="">All Dates</option>
          <option value="today">Today</option>
          <option value="week">Last 7 Days</option>
          <option value="month">Last 30 Days</option>
        </select>

        <select
          value={filters.amountRange || ''}
          onChange={(e) => handleFilterChange('amountRange', e.target.value || undefined)}
        >
          <option value="">All Amounts</option>
          <option value="low">Under £10</option>
          <option value="medium">£10 - £50</option>
          <option value="high">Over £50</option>
        </select>
      </div>

      {loading ? (
        <div>Loading payments...</div>
      ) : (
        <>
          <table>
            <thead>
              <tr>
                <th>Transaction ID</th>
                <th>User</th>
                <th>Competition</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Tickets</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment._id}>
                  <td>{payment.transactionId}</td>
                  <td>{payment.userName}</td>
                  <td>{payment.competitionName}</td>
                  <td>£{payment.amount.toFixed(2)}</td>
                  <td>{getStatusBadge(payment.status)}</td>
                  <td>{payment.ticketsPurchased}</td>
                  <td>{new Date(payment.createdAt).toLocaleDateString()}</td>
                  <td>
                    <button onClick={() => handleViewPayment(payment._id)}>
                      View
                    </button>
                    {payment.status === 'completed' && (
                      <button onClick={() => handleRefund(payment._id)}>
                        Refund
                      </button>
                    )}
                    {payment.status === 'failed' && (
                      <button onClick={() => handleRetry(payment._id)}>
                        Retry
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {pagination && (
            <div className="pagination">
              <button
                disabled={!pagination.hasPrev}
                onClick={() => handlePageChange(pagination.page - 1)}
              >
                Previous
              </button>
              <span>
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                disabled={!pagination.hasNext}
                onClick={() => handlePageChange(pagination.page + 1)}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
```

#### Payment Details Modal

```typescript
// components/PaymentDetailsModal.tsx
import { useEffect, useState } from 'react';
import { paymentService } from '@/services/paymentService';

interface PaymentDetailsModalProps {
  paymentId: string;
  onClose: () => void;
}

export default function PaymentDetailsModal({ paymentId, onClose }: PaymentDetailsModalProps) {
  const [payment, setPayment] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPaymentDetails();
  }, [paymentId]);

  const loadPaymentDetails = async () => {
    try {
      setLoading(true);
      const data = await paymentService.getPaymentById(paymentId);
      setPayment(data);
    } catch (error) {
      console.error('Failed to load payment details:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="modal">
      <div className="modal-content">
        <button onClick={onClose}>Close</button>
        <h2>Payment Details</h2>
        {payment && (
          <div>
            <p><strong>Transaction ID:</strong> {payment.transactionId}</p>
            <p><strong>User:</strong> {payment.user?.name} ({payment.user?.email})</p>
            <p><strong>Competition:</strong> {payment.competition?.title}</p>
            <p><strong>Amount:</strong> £{payment.amount.toFixed(2)}</p>
            <p><strong>Status:</strong> {payment.status}</p>
            <p><strong>Tickets Purchased:</strong> {payment.ticketsPurchased}</p>
            {payment.ticketNumbers && payment.ticketNumbers.length > 0 && (
              <div>
                <strong>Ticket Numbers:</strong>
                <ul>
                  {payment.ticketNumbers.map((num: string) => (
                    <li key={num}>{num}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
```

### Step 3: Implement Actions (Refund/Retry)

```typescript
// In your PaymentList component or a separate hook

const handleRefund = async (paymentId: string) => {
  const reason = prompt('Enter refund reason (optional):');
  if (reason === null) return; // User cancelled

  const partialRefund = confirm('Is this a partial refund?');
  let amount: number | undefined;
  
  if (partialRefund) {
    const amountInput = prompt('Enter refund amount:');
    if (!amountInput) return;
    amount = parseFloat(amountInput);
    if (isNaN(amount) || amount <= 0) {
      alert('Invalid amount');
      return;
    }
  }

  try {
    await paymentService.refundPayment(paymentId, {
      reason: reason || undefined,
      amount,
      partialRefund,
    });
    alert('Payment refunded successfully');
    loadPayments(); // Refresh list
    loadStats(); // Refresh statistics
  } catch (error: any) {
    alert(error.response?.data?.message || 'Failed to refund payment');
  }
};

const handleRetry = async (paymentId: string) => {
  if (!confirm('Retry this failed payment?')) return;

  try {
    await paymentService.retryPayment(paymentId);
    alert('Payment retry initiated');
    loadPayments(); // Refresh list
  } catch (error: any) {
    alert(error.response?.data?.message || 'Failed to retry payment');
  }
};
```

---

## Error Handling

Always handle errors gracefully:

```typescript
try {
  const data = await paymentService.getPayments();
  // Handle success
} catch (error: any) {
  if (error.response) {
    // Server responded with error
    const status = error.response.status;
    const message = error.response.data?.message || 'An error occurred';
    
    if (status === 401) {
      // Unauthorized - redirect to login
      router.push('/login');
    } else if (status === 403) {
      // Forbidden - show access denied message
      alert('Access denied. Admin privileges required.');
    } else {
      // Other errors
      alert(message);
    }
  } else {
    // Network error or other
    alert('Network error. Please check your connection.');
  }
}
```

---

## Best Practices

1. **Loading States**: Always show loading indicators while fetching data
2. **Error Handling**: Display user-friendly error messages
3. **Pagination**: Implement proper pagination controls
4. **Filtering**: Debounce filter inputs to avoid excessive API calls
5. **Caching**: Consider caching payment statistics for better performance
6. **Confirmation Dialogs**: Always confirm destructive actions (refund, retry)
7. **Refresh Data**: Refresh lists after actions (refund, retry) complete
8. **Token Management**: Handle token expiration and refresh properly
9. **Type Safety**: Use TypeScript for type safety
10. **Responsive Design**: Ensure tables and modals work on mobile devices

---

## Example Complete Page

```typescript
// app/admin/payments/page.tsx
'use client';

import { useState } from 'react';
import PaymentStats from '@/components/PaymentStats';
import PaymentList from '@/components/PaymentList';
import PaymentDetailsModal from '@/components/PaymentDetailsModal';

export default function PaymentsPage() {
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);

  return (
    <div className="payments-page">
      <h1>Payments</h1>
      
      <PaymentStats />
      
      <PaymentList 
        onViewPayment={(id) => setSelectedPaymentId(id)}
      />
      
      {selectedPaymentId && (
        <PaymentDetailsModal
          paymentId={selectedPaymentId}
          onClose={() => setSelectedPaymentId(null)}
        />
      )}
    </div>
  );
}
```

---

## Testing

Test all endpoints with curl or Postman before implementing:

```bash
# Get stats
curl -X GET "http://localhost:5000/api/v1/admin/payments/stats" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get payments
curl -X GET "http://localhost:5000/api/v1/admin/payments?page=1&limit=10&status=completed" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Refund payment
curl -X PUT "http://localhost:5000/api/v1/admin/payments/PAYMENT_ID/refund" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason": "Customer request", "partialRefund": false}'
```

---

## Support

For issues or questions, refer to:
- API Documentation: `docs/PAYMENT_API.md`
- Backend Team: [contact info]

