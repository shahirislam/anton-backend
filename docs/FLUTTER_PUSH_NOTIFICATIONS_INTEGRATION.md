# Flutter Push Notifications Integration Guide

This document provides step-by-step instructions for the Flutter team to integrate push notifications into the mobile app.

## 📋 Table of Contents

1. [Overview](#overview)
2. [What the Backend Has Done](#what-the-backend-has-done)
3. [Prerequisites](#prerequisites)
4. [Flutter Setup](#flutter-setup)
5. [Implementation Steps](#implementation-steps)
6. [API Integration](#api-integration)
7. [Testing](#testing)
8. [Troubleshooting](#troubleshooting)

---

## Overview

The backend is fully configured to send push notifications when live streams start. The Flutter app needs to:
1. Request notification permissions
2. Get FCM device tokens
3. Register tokens with the backend
4. Handle incoming push notifications
5. Navigate users to the live stream when they tap notifications

---

## What the Backend Has Done ✅

### 1. **Firebase Configuration**
- ✅ Firebase Admin SDK configured
- ✅ Push notification service ready
- ✅ Automatic notification sending when live streams start

### 2. **API Endpoints Ready**
- ✅ `POST /api/v1/user/device-token` - Register device token
- ✅ `DELETE /api/v1/user/device-token` - Remove device token
- ✅ `GET /api/v1/user/device-token` - Get registered tokens

### 3. **Notification System**
- ✅ In-app notifications created automatically
- ✅ Push notifications sent to all users with `live_updates` enabled
- ✅ Invalid tokens automatically removed
- ✅ Notification preferences respected

### 4. **Notification Payload Structure**
When a live stream starts, users receive a push notification with:
```json
{
  "notification": {
    "title": "Live Draw Started!",
    "body": "{Competition Title}'s draw has started! Join now and win!"
  },
  "data": {
    "type": "live_updates",
    "competitionId": "5db659ed-207b-47d5-9fcf-cdcb20a5b486",
    "streamUrl": "https://anton-backend.onrender.com/stream/5db659ed-207b-47d5-9fcf-cdcb20a5b486",
    "notificationId": "notification-uuid-here"
  }
}
```

---

## Prerequisites

### Required Flutter Packages

Add these dependencies to your `pubspec.yaml`:

```yaml
dependencies:
  firebase_core: ^2.24.2
  firebase_messaging: ^14.7.9
  flutter_local_notifications: ^16.3.0
  permission_handler: ^11.1.0
  http: ^1.1.0
  shared_preferences: ^2.2.2
```

Then run:
```bash
flutter pub get
```

### Firebase Setup in Flutter

1. **Add Firebase to your Flutter project** (if not already done):
   ```bash
   flutterfire configure
   ```
   This will:
   - Create `firebase_options.dart`
   - Configure iOS and Android apps
   - Link to your Firebase project

2. **iOS Configuration**:
   - Enable Push Notifications in Xcode
   - Add `Push Notifications` capability
   - Configure APNs (Apple Push Notification service)
   - Add `GoogleService-Info.plist` to `ios/Runner/`

3. **Android Configuration**:
   - Add `google-services.json` to `android/app/`
   - Update `android/app/build.gradle`:
     ```gradle
     dependencies {
         implementation platform('com.google.firebase:firebase-bom:32.7.0')
         implementation 'com.google.firebase:firebase-messaging'
     }
     ```
   - Create notification channel in `AndroidManifest.xml` (see below)

---

## Flutter Setup

### 1. Android Manifest Configuration

Add to `android/app/src/main/AndroidManifest.xml`:

```xml
<manifest>
    <application>
        <!-- ... existing code ... -->
        
        <!-- Firebase Cloud Messaging -->
        <service
            android:name="com.google.firebase.messaging.FirebaseMessagingService"
            android:exported="false">
            <intent-filter>
                <action android:name="com.google.firebase.MESSAGING_EVENT" />
            </intent-filter>
        </service>

        <!-- Notification Channel -->
        <meta-data
            android:name="com.google.firebase.messaging.default_notification_channel_id"
            android:value="default" />
    </application>
</manifest>
```

### 2. iOS Configuration

In `ios/Runner/Info.plist`, ensure you have:

```xml
<key>UIBackgroundModes</key>
<array>
    <string>remote-notification</string>
</array>
```

### 3. Create Notification Channel (Android)

Create `android/app/src/main/kotlin/com/yourcompany/app/MainActivity.kt`:

```kotlin
package com.yourcompany.app

import android.os.Build
import android.os.Bundle
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugins.GeneratedPluginRegistrant

class MainActivity: FlutterActivity() {
    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        GeneratedPluginRegistrant.registerWith(flutterEngine)
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = android.app.NotificationChannel(
                "default",
                "Default Channel",
                android.app.NotificationManager.IMPORTANCE_HIGH
            )
            val notificationManager = getSystemService(android.app.NotificationManager::class.java)
            notificationManager.createNotificationChannel(channel)
        }
    }
}
```

---

## Implementation Steps

### Step 1: Create Push Notification Service

Create `lib/services/push_notification_service.dart`:

```dart
import 'dart:io';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../api/api_service.dart'; // Your API service
import '../utils/navigation_service.dart'; // Your navigation service

class PushNotificationService {
  static final PushNotificationService _instance = PushNotificationService._internal();
  factory PushNotificationService() => _instance;
  PushNotificationService._internal();

  final FirebaseMessaging _firebaseMessaging = FirebaseMessaging.instance;
  final FlutterLocalNotificationsPlugin _localNotifications = FlutterLocalNotificationsPlugin();
  
  String? _fcmToken;
  bool _initialized = false;

  // Initialize the service
  Future<void> initialize() async {
    if (_initialized) return;
    
    try {
      // Request notification permissions
      await _requestPermissions();
      
      // Initialize local notifications
      await _initializeLocalNotifications();
      
      // Get FCM token
      await _getFCMToken();
      
      // Configure message handlers
      _configureMessageHandlers();
      
      _initialized = true;
      print('✅ Push Notification Service initialized');
    } catch (e) {
      print('❌ Error initializing push notifications: $e');
    }
  }

  // Request notification permissions
  Future<void> _requestPermissions() async {
    if (Platform.isIOS) {
      NotificationSettings settings = await _firebaseMessaging.requestPermission(
        alert: true,
        badge: true,
        sound: true,
        provisional: false,
      );
      
      if (settings.authorizationStatus == AuthorizationStatus.authorized) {
        print('✅ User granted notification permission');
      } else {
        print('❌ User declined notification permission');
      }
    } else if (Platform.isAndroid) {
      // Android 13+ requires runtime permission
      if (await Permission.notification.isDenied) {
        await Permission.notification.request();
      }
    }
  }

  // Initialize local notifications plugin
  Future<void> _initializeLocalNotifications() async {
    const AndroidInitializationSettings androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
    const DarwinInitializationSettings iosSettings = DarwinInitializationSettings(
      requestAlertPermission: true,
      requestBadgePermission: true,
      requestSoundPermission: true,
    );

    const InitializationSettings initSettings = InitializationSettings(
      android: androidSettings,
      iOS: iosSettings,
    );

    await _localNotifications.initialize(
      initSettings,
      onDidReceiveNotificationResponse: _onNotificationTapped,
    );
  }

  // Get FCM token and register with backend
  Future<void> _getFCMToken() async {
    try {
      // Get token
      _fcmToken = await _firebaseMessaging.getToken();
      
      if (_fcmToken != null) {
        print('📱 FCM Token: $_fcmToken');
        
        // Save token locally
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('fcm_token', _fcmToken!);
        
        // Register with backend
        await _registerTokenWithBackend(_fcmToken!);
        
        // Listen for token refresh
        _firebaseMessaging.onTokenRefresh.listen((newToken) {
          print('🔄 FCM Token refreshed: $newToken');
          _fcmToken = newToken;
          prefs.setString('fcm_token', newToken);
          _registerTokenWithBackend(newToken);
        });
      }
    } catch (e) {
      print('❌ Error getting FCM token: $e');
    }
  }

  // Register token with backend API
  Future<void> _registerTokenWithBackend(String token) async {
    try {
      final platform = Platform.isIOS ? 'ios' : 'android';
      
      final response = await ApiService().post(
        '/user/device-token',
        {
          'device_token': token,
          'platform': platform,
          'device_id': await _getDeviceId(),
        },
      );

      if (response['success'] == true) {
        print('✅ Device token registered with backend');
      } else {
        print('❌ Failed to register device token: ${response['message']}');
      }
    } catch (e) {
      print('❌ Error registering token: $e');
    }
  }

  // Get device ID (you can use device_info_plus package)
  Future<String?> _getDeviceId() async {
    // Implement using device_info_plus package
    // For now, return null
    return null;
  }

  // Configure message handlers
  void _configureMessageHandlers() {
    // Handle foreground messages
    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      print('📨 Foreground message received: ${message.messageId}');
      _showLocalNotification(message);
    });

    // Handle background messages (must be top-level function)
    FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);

    // Handle notification taps when app is opened
    FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
      print('👆 Notification tapped: ${message.messageId}');
      _handleNotificationTap(message);
    });

    // Check if app was opened from a notification
    _firebaseMessaging.getInitialMessage().then((RemoteMessage? message) {
      if (message != null) {
        print('🚀 App opened from notification: ${message.messageId}');
        _handleNotificationTap(message);
      }
    });
  }

  // Show local notification for foreground messages
  Future<void> _showLocalNotification(RemoteMessage message) async {
    const AndroidNotificationDetails androidDetails = AndroidNotificationDetails(
      'default',
      'Default Channel',
      channelDescription: 'Default notification channel',
      importance: Importance.high,
      priority: Priority.high,
    );

    const DarwinNotificationDetails iosDetails = DarwinNotificationDetails(
      presentAlert: true,
      presentBadge: true,
      presentSound: true,
    );

    const NotificationDetails notificationDetails = NotificationDetails(
      android: androidDetails,
      iOS: iosDetails,
    );

    await _localNotifications.show(
      message.hashCode,
      message.notification?.title ?? 'Notification',
      message.notification?.body ?? 'You have a new notification',
      notificationDetails,
      payload: message.data.toString(),
    );
  }

  // Handle notification tap
  void _handleNotificationTap(RemoteMessage message) {
    final data = message.data;
    
    // Check if it's a live stream notification
    if (data['type'] == 'live_updates' && data['competitionId'] != null) {
      final competitionId = data['competitionId'];
      final streamUrl = data['streamUrl'];
      
      // Navigate to live stream page
      NavigationService().navigateToLiveStream(
        competitionId: competitionId,
        streamUrl: streamUrl,
      );
    }
  }

  // Handle notification tap from local notification
  void _onNotificationTapped(NotificationResponse response) {
    if (response.payload != null) {
      // Parse payload and navigate
      // Implementation depends on your payload format
    }
  }

  // Get current FCM token
  String? get fcmToken => _fcmToken;

  // Unregister token (on logout)
  Future<void> unregister() async {
    if (_fcmToken != null) {
      try {
        await ApiService().delete('/user/device-token', {
          'device_token': _fcmToken!,
        });
        print('✅ Device token unregistered');
      } catch (e) {
        print('❌ Error unregistering token: $e');
      }
    }
  }
}

// Background message handler (must be top-level function)
@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
  print('📨 Background message received: ${message.messageId}');
  // Handle background message if needed
}
```

### Step 2: Initialize in Main App

Update `lib/main.dart`:

```dart
import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'firebase_options.dart';
import 'services/push_notification_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Initialize Firebase
  await Firebase.initializeApp(
    options: DefaultFirebaseOptions.currentPlatform,
  );
  
  // Initialize Push Notification Service
  await PushNotificationService().initialize();
  
  runApp(MyApp());
}

class MyApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      // ... your app configuration
    );
  }
}
```

### Step 3: Create API Service Method

Add to your `lib/api/api_service.dart`:

```dart
// Register device token
Future<Map<String, dynamic>> registerDeviceToken({
  required String deviceToken,
  required String platform,
  String? deviceId,
}) async {
  return await post('/user/device-token', {
    'device_token': deviceToken,
    'platform': platform,
    'device_id': deviceId,
  });
}

// Remove device token
Future<Map<String, dynamic>> removeDeviceToken(String deviceToken) async {
  return await delete('/user/device-token', {
    'device_token': deviceToken,
  });
}
```

### Step 4: Handle Navigation to Live Stream

Create or update `lib/utils/navigation_service.dart`:

```dart
import 'package:flutter/material.dart';

class NavigationService {
  static final GlobalKey<NavigatorState> navigatorKey = GlobalKey<NavigatorState>();

  void navigateToLiveStream({
    required String competitionId,
    required String streamUrl,
  }) {
    navigatorKey.currentState?.pushNamed(
      '/live-stream',
      arguments: {
        'competitionId': competitionId,
        'streamUrl': streamUrl,
      },
    );
  }
}
```

### Step 5: Update App Routes

In your route configuration:

```dart
routes: {
  '/live-stream': (context) {
    final args = ModalRoute.of(context)!.settings.arguments as Map;
    return LiveStreamPage(
      competitionId: args['competitionId'],
      streamUrl: args['streamUrl'],
    );
  },
}
```

---

## API Integration

### Endpoint: Register Device Token

**POST** `/api/v1/user/device-token`

**Headers:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "device_token": "fcm_token_here",
  "platform": "android", // or "ios"
  "device_id": "optional_device_identifier"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Device token registered successfully",
  "data": {
    "device_token": "fcm_token_...",
    "platform": "android",
    "registered": true
  }
}
```

### Endpoint: Remove Device Token (on logout)

**DELETE** `/api/v1/user/device-token`

**Request Body:**
```json
{
  "device_token": "fcm_token_here"
}
```

---

## Testing

### 1. Test Token Registration

```dart
// In your app, after login
final pushService = PushNotificationService();
await pushService.initialize();
print('Token: ${pushService.fcmToken}');
```

### 2. Test Notification Reception

1. Register a device token
2. Have an admin start a live stream
3. You should receive a push notification
4. Tap the notification → should navigate to live stream

### 3. Test Scenarios

- ✅ App in foreground → Should show local notification
- ✅ App in background → Should show system notification
- ✅ App closed → Should show system notification, navigate on tap
- ✅ Token refresh → Should auto-update with backend
- ✅ Logout → Should unregister token

---

## Notification Payload Structure

When a live stream starts, the notification payload will be:

```json
{
  "notification": {
    "title": "Live Draw Started!",
    "body": "Start the Game's draw has started! Join now and win!"
  },
  "data": {
    "type": "live_updates",
    "competitionId": "5db659ed-207b-47d5-9fcf-cdcb20a5b486",
    "streamUrl": "https://anton-backend.onrender.com/stream/5db659ed-207b-47d5-9fcf-cdcb20a5b486",
    "notificationId": "notification-uuid"
  }
}
```

**Important:** Always check `data['type'] == 'live_updates'` before navigating to ensure it's a live stream notification.

---

## Troubleshooting

### Issue: Not receiving notifications

**Checklist:**
1. ✅ Firebase configured correctly
2. ✅ Permissions granted
3. ✅ Token registered with backend
4. ✅ User has `live_updates` enabled in preferences
5. ✅ App is not in Do Not Disturb mode
6. ✅ Check Firebase Console → Cloud Messaging → Test message

### Issue: Token not registering

- Check API endpoint URL
- Verify authentication token is valid
- Check network connectivity
- Review backend logs

### Issue: Navigation not working

- Ensure `NavigationService` is properly set up
- Check route names match
- Verify notification payload structure
- Add error handling

### Issue: iOS notifications not working

- Verify APNs certificate is configured in Firebase
- Check `Info.plist` has `UIBackgroundModes`
- Ensure app is properly signed
- Test on real device (notifications don't work on simulator)

---

## Best Practices

1. **Token Management:**
   - Register token after successful login
   - Unregister token on logout
   - Handle token refresh automatically

2. **User Experience:**
   - Request permissions at appropriate time
   - Show explanation before requesting permissions
   - Handle permission denial gracefully

3. **Error Handling:**
   - Log all errors for debugging
   - Retry token registration on failure
   - Handle network errors gracefully

4. **Testing:**
   - Test on both iOS and Android
   - Test on real devices (not just emulators)
   - Test all notification states (foreground, background, closed)

---

## Support

If you encounter issues:

1. Check backend logs for notification sending status
2. Check Firebase Console → Cloud Messaging for delivery status
3. Verify device token is registered in database
4. Test with Firebase Console test message feature

---

## Summary Checklist

- [ ] Install required Flutter packages
- [ ] Configure Firebase in Flutter project
- [ ] Set up Android notification channel
- [ ] Configure iOS push notifications
- [ ] Create `PushNotificationService` class
- [ ] Initialize service in `main.dart`
- [ ] Implement token registration API call
- [ ] Handle notification taps and navigation
- [ ] Test on iOS device
- [ ] Test on Android device
- [ ] Test token refresh
- [ ] Test logout token removal

---

**Backend Status:** ✅ Ready  
**Flutter Status:** ⏳ Pending implementation

Once the Flutter team completes these steps, push notifications will be fully functional! 🚀

