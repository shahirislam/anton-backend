# Push Notifications Setup Guide

This guide explains how to set up push notifications for mobile devices using Firebase Cloud Messaging (FCM).

## Overview

The backend now supports sending push notifications to iOS and Android devices when:
- A live stream starts for a competition
- Custom notifications are sent (via admin panel)

## Prerequisites

1. **Firebase Project**: You need a Firebase project with Cloud Messaging enabled
2. **Service Account Key**: Download the Firebase service account JSON file
3. **Node.js Package**: Install `firebase-admin` package

## Installation

### 1. Install Firebase Admin SDK

```bash
npm install firebase-admin
```

### 2. Get Firebase Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (or create a new one)
3. Go to Project Settings (gear icon) → Service Accounts
4. Click "Generate New Private Key"
5. Download the JSON file

### 3. Configure Environment Variables

You have two options for providing Firebase credentials:

#### Option A: Service Account File Path (Recommended for local development)

Add to your `.env` file:

```env
FIREBASE_SERVICE_ACCOUNT_PATH=./path/to/your/serviceAccountKey.json
```

**Important**: 
- Never commit the service account file to version control
- Add it to `.gitignore`
- For production, use Option B (environment variable)

#### Option B: Firebase Config as Environment Variable (Recommended for production)

Convert your service account JSON to a single-line string and add to your `.env`:

```env
FIREBASE_CONFIG='{"type":"service_account","project_id":"your-project-id",...}'
```

Or in your hosting platform (Render, Heroku, etc.), add it as an environment variable.

## How It Works

### 1. Device Token Registration

Users need to register their device tokens when they install/use the app:

**Endpoint**: `POST /api/v1/user/device-token`

**Request Body**:
```json
{
  "device_token": "fcm_device_token_here",
  "platform": "android", // or "ios"
  "device_id": "optional_device_identifier"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Device token registered successfully",
  "data": {
    "device_token": "fcm_device_token_...",
    "platform": "android",
    "registered": true
  }
}
```

### 2. Automatic Notifications

When a live stream starts:
- An in-app notification is created for all users
- Push notifications are sent to all users who:
  - Have `live_updates` enabled in their notification preferences
  - Have registered device tokens
  - Are active and verified users

### 3. Notification Preferences

Users can control which notifications they receive via the `NotificationPreferences` model:
- `live_updates`: Notifications about live streams (default: true)
- `competition_updates`: General competition updates
- `winner_announcements`: Winner announcements
- `new_competitions`: New competition alerts
- `system_update`: System updates

## API Endpoints

### Register Device Token
- **POST** `/api/v1/user/device-token`
- **Auth**: Required
- **Body**: `{ device_token, platform, device_id? }`

### Remove Device Token
- **DELETE** `/api/v1/user/device-token`
- **Auth**: Required
- **Body**: `{ device_token }`

### Get Device Tokens
- **GET** `/api/v1/user/device-token`
- **Auth**: Required
- **Response**: List of user's registered tokens (partial for security)

## Notification Flow

1. **Admin starts a live stream** → `POST /api/v1/admin/streams/:competitionId/start`
2. **Backend automatically**:
   - Creates in-app notification (broadcast)
   - Fetches all active users with `live_updates` enabled
   - Collects their device tokens
   - Sends push notifications via FCM
   - Removes invalid tokens automatically

## Testing

### Test Push Notification Service

The service will log warnings if Firebase is not configured, but the app will continue to work (just without push notifications).

Check logs for:
- `Firebase Admin SDK initialized` - Success
- `Push notifications disabled` - Firebase not configured
- `Push notification sent successfully` - Notification sent

### Test Device Token Registration

```bash
curl -X POST http://localhost:5000/api/v1/user/device-token \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "device_token": "test_token_123",
    "platform": "android"
  }'
```

## Troubleshooting

### Push Notifications Not Working

1. **Check Firebase Configuration**:
   - Verify `FIREBASE_SERVICE_ACCOUNT_PATH` or `FIREBASE_CONFIG` is set
   - Check that the service account has FCM permissions

2. **Check Logs**:
   - Look for Firebase initialization errors
   - Check for invalid token errors

3. **Verify Device Tokens**:
   - Ensure tokens are registered correctly
   - Check that tokens haven't expired (FCM tokens can expire)

4. **Check Notification Preferences**:
   - Users must have `live_updates: true` to receive live stream notifications

### Invalid Token Errors

The system automatically removes invalid tokens when detected. This happens when:
- User uninstalls the app
- Token expires
- Token is invalid

## Security Notes

- Device tokens are stored securely in the database
- Only partial tokens are returned in API responses
- Invalid tokens are automatically cleaned up
- Users can only manage their own device tokens

## Production Checklist

- [ ] Install `firebase-admin` package
- [ ] Set up Firebase project
- [ ] Configure `FIREBASE_SERVICE_ACCOUNT_PATH` or `FIREBASE_CONFIG`
- [ ] Test device token registration
- [ ] Test push notification sending
- [ ] Monitor logs for errors
- [ ] Set up error alerting for notification failures

## Next Steps

1. Integrate device token registration in your mobile app
2. Handle push notification payloads in your app
3. Test with real devices
4. Monitor notification delivery rates

