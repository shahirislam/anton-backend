# API Requirements - Dashboard Page

## Overview
This document outlines all API endpoints required for the Dashboard Page (`app/(dashboard)/dashboard/page.tsx`).

---

## Base URL
```
/api/v1
```

## Authentication
All endpoints require authentication via Bearer token in the Authorization header:
```
Authorization: Bearer <token>
```

---

## 1. Dashboard Statistics

### Endpoint
```
GET /dashboard/stats
```

### Description
Returns key statistics displayed in the dashboard stat cards.

### Response Format
```typescript
{
  activeCompetitions: number;      // Count of active competitions
  totalUsers: number;              // Total number of registered users
  monthlyRevenue: number;          // Total revenue for current month (in GBP)
  ticketsSoldToday: number;        // Number of tickets sold today
  // Optional: Percentage changes for display
  changes?: {
    activeCompetitions?: {
      value: string;              // e.g., "+12% this month"
      type: 'positive' | 'negative';
    };
    totalUsers?: {
      value: string;              // e.g., "+8% this month"
      type: 'positive' | 'negative';
    };
    monthlyRevenue?: {
      value: string;              // e.g., "+24% this month"
      type: 'positive' | 'negative';
    };
    ticketsSoldToday?: {
      value: string;              // e.g., "-5% vs yesterday"
      type: 'positive' | 'negative';
    };
  };
}
```

### Example Response
```json
{
  "activeCompetitions": 24,
  "totalUsers": 1247,
  "monthlyRevenue": 15480.50,
  "ticketsSoldToday": 3891,
  "changes": {
    "activeCompetitions": {
      "value": "+12% this month",
      "type": "positive"
    },
    "totalUsers": {
      "value": "+8% this month",
      "type": "positive"
    },
    "monthlyRevenue": {
      "value": "+24% this month",
      "type": "positive"
    },
    "ticketsSoldToday": {
      "value": "-5% vs yesterday",
      "type": "negative"
    }
  }
}
```

### Query Parameters (Optional)
- `month`: Filter by specific month (YYYY-MM format, defaults to current month)
- `date`: Filter by specific date for "ticketsSoldToday" (YYYY-MM-DD format, defaults to today)

---

## 2. Revenue Overview Chart Data

### Endpoint
```
GET /dashboard/revenue
```

### Description
Returns revenue data for the revenue overview line chart (typically last 30 days or configurable period).

### Query Parameters
- `period`: `'7d' | '30d' | '90d' | '1y'` (default: `'30d'`)
- `startDate`: Start date (YYYY-MM-DD format, optional)
- `endDate`: End date (YYYY-MM-DD format, optional)

### Response Format
```typescript
{
  data: Array<{
    month: string;        // Month abbreviation (e.g., "Jan", "Feb")
    revenue: number;     // Revenue amount in GBP
  }>;
  period: string;         // Period description (e.g., "Last 30 days")
}
```

### Example Response
```json
{
  "data": [
    { "month": "Jan", "revenue": 8500 },
    { "month": "Feb", "revenue": 9200 },
    { "month": "Mar", "revenue": 11400 },
    { "month": "Apr", "revenue": 10800 },
    { "month": "May", "revenue": 12600 },
    { "month": "Jun", "revenue": 14200 },
    { "month": "Jul", "revenue": 13800 },
    { "month": "Aug", "revenue": 15400 },
    { "month": "Sep", "revenue": 15480 }
  ],
  "period": "Last 30 days"
}
```

---

## 3. Competition Status Chart Data

### Endpoint
```
GET /dashboard/competition-status
```

### Description
Returns competition status distribution for the pie chart.

### Response Format
```typescript
{
  data: Array<{
    name: string;         // Status name (e.g., "Active", "Completed", "Upcoming")
    value: number;        // Count of competitions with this status
    color: string;        // Hex color code for chart display
  }>;
}
```

### Example Response
```json
{
  "data": [
    { "name": "Active", "value": 24, "color": "#2ed573" },
    { "name": "Completed", "value": 45, "color": "#60A5FA" },
    { "name": "Upcoming", "value": 8, "color": "#ffa502" }
  ]
}
```

---

## 4. Weekly User Activity Chart Data

### Endpoint
```
GET /dashboard/user-activity
```

### Description
Returns weekly user activity data for the bar chart (new users and active users per day).

### Query Parameters
- `week`: Week number (1-52, defaults to current week)
- `year`: Year (YYYY format, defaults to current year)
- `startDate`: Start date (YYYY-MM-DD format, optional)
- `endDate`: End date (YYYY-MM-DD format, optional)

### Response Format
```typescript
{
  data: Array<{
    day: string;          // Day name (e.g., "Monday", "Tuesday")
    newUsers: number;     // Number of new users registered
    activeUsers: number;  // Number of active users (logged in/purchased)
  }>;
  period: string;         // Period description
}
```

### Example Response
```json
{
  "data": [
    { "day": "Monday", "newUsers": 45, "activeUsers": 234 },
    { "day": "Tuesday", "newUsers": 52, "activeUsers": 267 },
    { "day": "Wednesday", "newUsers": 38, "activeUsers": 198 },
    { "day": "Thursday", "newUsers": 67, "activeUsers": 345 },
    { "day": "Friday", "newUsers": 89, "activeUsers": 412 },
    { "day": "Saturday", "newUsers": 102, "activeUsers": 456 },
    { "day": "Sunday", "newUsers": 76, "activeUsers": 389 }
  ],
  "period": "Week 39, 2025"
}
```

---

## 5. Recent Competitions

### Endpoint
```
GET /competitions/recent
```

### Description
Returns the most recent competitions (typically 4-10) for display in the dashboard table.

### Query Parameters
- `limit`: Number of competitions to return (default: `4`, max: `10`)
- `status`: Filter by status (`'active' | 'ending' | 'ended' | 'upcoming' | 'pending'`, optional)
- `sortBy`: Sort field (`'createdAt' | 'drawDate' | 'revenue'`, default: `'createdAt'`)
- `sortOrder`: Sort order (`'asc' | 'desc'`, default: `'desc'`)