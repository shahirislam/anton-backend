# Google Sign-In Integration - Flutter Guide

This guide will help Flutter developers integrate Google Sign-In with the backend API.

## Overview

**Backend Endpoint**: `POST /api/v1/auth/google/mobile`

**Flow**:
1. User taps "Sign in with Google" in Flutter app
2. Flutter Google Sign-In SDK handles authentication
3. Flutter gets `idToken` from Google
4. Flutter sends `idToken` to backend
5. Backend verifies token and returns JWT tokens
6. Flutter stores tokens and user is logged in

## Prerequisites

1. ✅ Google OAuth credentials configured (see [GOOGLE_CONSOLE_SETUP.md](./GOOGLE_CONSOLE_SETUP.md))
2. ✅ Android Client ID from Google Console
3. ✅ Backend API is running and accessible
4. ✅ Flutter project set up

## Step 1: Install Dependencies

Add to your `pubspec.yaml`:

```yaml
dependencies:
  google_sign_in: ^6.2.1
  http: ^1.1.0
  shared_preferences: ^2.2.2  # For storing tokens
```

Then run:
```bash
flutter pub get
```

## Step 2: Configure Android

### Update `android/app/build.gradle`:

```gradle
android {
    defaultConfig {
        // ... other config
        minSdkVersion 21  // Required for Google Sign-In
    }
}
```

### Get SHA-1 Fingerprint:

**Windows:**
```bash
keytool -list -v -keystore "%USERPROFILE%\.android\debug.keystore" -alias androiddebugkey -storepass android -keypass android
```

**macOS/Linux:**
```bash
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

Copy the **SHA1** value and add it to your Google Cloud Console Android OAuth client (see [GOOGLE_CONSOLE_SETUP.md](./GOOGLE_CONSOLE_SETUP.md)).

### Update `android/app/src/main/AndroidManifest.xml`:

Add internet permission (if not already present):
```xml
<manifest>
    <uses-permission android:name="android.permission.INTERNET"/>
    <!-- ... other permissions -->
</manifest>
```

## Step 3: Configure iOS (if building for iOS)

### Update `ios/Runner/Info.plist`:

Add your **reversed client ID** as URL scheme:

```xml
<key>CFBundleURLTypes</key>
<array>
    <dict>
        <key>CFBundleTypeRole</key>
        <string>Editor</string>
        <key>CFBundleURLSchemes</key>
        <array>
            <string>com.googleusercontent.apps.YOUR-CLIENT-ID</string>
        </array>
    </dict>
</array>
```

**Note**: Replace `YOUR-CLIENT-ID` with your iOS Client ID from Google Console (reversed, e.g., if Client ID is `123-abc.apps.googleusercontent.com`, use `com.googleusercontent.apps.123-abc`).

## Step 4: Initialize Google Sign-In

Create a service file: `lib/services/google_auth_service.dart`

```dart
import 'package:google_sign_in/google_sign_in.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

class GoogleAuthService {
  // Replace with your Android Client ID from Google Console
  static const String _androidClientId = 'YOUR-ANDROID-CLIENT-ID.apps.googleusercontent.com';
  
  // Replace with your backend API URL
  static const String _backendUrl = 'https://anton-backend.onrender.com';
  
  final GoogleSignIn _googleSignIn = GoogleSignIn(
    scopes: ['email', 'profile'],
    // For Android, clientId is optional if configured in google-services.json
    // For iOS, you may need to specify clientId
  );

  /// Sign in with Google
  Future<Map<String, dynamic>?> signInWithGoogle() async {
    try {
      // Step 1: Sign in with Google
      final GoogleSignInAccount? googleUser = await _googleSignIn.signIn();
      
      if (googleUser == null) {
        // User canceled the sign-in
        return null;
      }

      // Step 2: Get authentication details
      final GoogleSignInAuthentication googleAuth = await googleUser.authentication;

      // Step 3: Get idToken
      final String? idToken = googleAuth.idToken;
      
      if (idToken == null) {
        throw Exception('Failed to get Google idToken');
      }

      // Step 4: Send idToken to backend
      final response = await http.post(
        Uri.parse('$_backendUrl/api/v1/auth/google/mobile'),
        headers: {
          'Content-Type': 'application/json',
        },
        body: jsonEncode({
          'idToken': idToken,
        }),
      );

      final responseData = jsonDecode(response.body);

      if (response.statusCode == 200 && responseData['success']) {
        // Step 5: Store tokens
        final data = responseData['data'];
        await _storeTokens(
          accessToken: data['accessToken'],
          refreshToken: data['refreshToken'],
        );

        return {
          'success': true,
          'user': data['user'],
          'accessToken': data['accessToken'],
          'refreshToken': data['refreshToken'],
        };
      } else {
        throw Exception(responseData['message'] ?? 'Authentication failed');
      }
    } catch (e) {
      print('Google Sign-In Error: $e');
      rethrow;
    }
  }

  /// Sign out
  Future<void> signOut() async {
    try {
      await _googleSignIn.signOut();
      await _clearTokens();
    } catch (e) {
      print('Sign out error: $e');
      rethrow;
    }
  }

  /// Check if user is signed in
  Future<bool> isSignedIn() async {
    return await _googleSignIn.isSignedIn();
  }

  /// Get current user
  GoogleSignInAccount? getCurrentUser() {
    return _googleSignIn.currentUser;
  }

  /// Store tokens securely
  Future<void> _storeTokens({
    required String accessToken,
    required String refreshToken,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('access_token', accessToken);
    await prefs.setString('refresh_token', refreshToken);
  }

  /// Clear stored tokens
  Future<void> _clearTokens() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('access_token');
    await prefs.remove('refresh_token');
  }

  /// Get stored access token
  Future<String?> getAccessToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('access_token');
  }
}
```

## Step 5: Create UI Component

Example usage in a login screen:

```dart
import 'package:flutter/material.dart';
import 'services/google_auth_service.dart';

class LoginScreen extends StatefulWidget {
  @override
  _LoginScreenState createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final GoogleAuthService _authService = GoogleAuthService();
  bool _isLoading = false;

  Future<void> _handleGoogleSignIn() async {
    setState(() => _isLoading = true);

    try {
      final result = await _authService.signInWithGoogle();
      
      if (result != null && result['success']) {
        // Navigate to home screen
        Navigator.pushReplacementNamed(context, '/home');
      } else {
        // User canceled
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Sign in canceled')),
        );
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Sign in failed: ${e.toString()}')),
      );
    } finally {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            ElevatedButton.icon(
              onPressed: _isLoading ? null : _handleGoogleSignIn,
              icon: Icon(Icons.login),
              label: Text('Sign in with Google'),
              style: ElevatedButton.styleFrom(
                padding: EdgeInsets.symmetric(horizontal: 24, vertical: 12),
              ),
            ),
            if (_isLoading)
              Padding(
                padding: EdgeInsets.only(top: 16),
                child: CircularProgressIndicator(),
              ),
          ],
        ),
      ),
    );
  }
}
```

## Step 6: Use Tokens for API Requests

After successful sign-in, use the stored access token for authenticated requests:

```dart
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'services/google_auth_service.dart';

Future<Map<String, dynamic>> getUserProfile() async {
  final authService = GoogleAuthService();
  final accessToken = await authService.getAccessToken();

  if (accessToken == null) {
    throw Exception('Not authenticated');
  }

  final response = await http.get(
    Uri.parse('https://anton-backend.onrender.com/api/v1/user/profile'),
    headers: {
      'Authorization': 'Bearer $accessToken',
      'Content-Type': 'application/json',
    },
  );

  if (response.statusCode == 200) {
    return jsonDecode(response.body);
  } else {
    throw Exception('Failed to get profile');
  }
}
```

## API Response Format

### Success Response:

```json
{
  "success": true,
  "message": "Google authentication successful",
  "data": {
    "user": {
      "id": "user-uuid",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "user",
      "verified": true,
      "authProvider": "google"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Error Responses:

**400 - Missing idToken:**
```json
{
  "success": false,
  "message": "Google idToken is required"
}
```

**401 - Authentication Failed:**
```json
{
  "success": false,
  "message": "Google authentication failed. Please try again."
}
```

**503 - Service Disabled:**
```json
{
  "success": false,
  "message": "Google authentication is not enabled"
}
```

## Error Handling

### Common Errors:

1. **"DEVELOPER_ERROR" (Error 10)**
   - **Cause**: SHA-1 fingerprint not added to Google Console
   - **Solution**: Add SHA-1 to Android OAuth client in Google Console

2. **"Sign in canceled"**
   - **Cause**: User canceled the sign-in flow
   - **Solution**: Handle gracefully, don't show error

3. **"Network error"**
   - **Cause**: No internet connection or backend unreachable
   - **Solution**: Check internet and backend URL

4. **"Google authentication failed"**
   - **Cause**: Invalid idToken or backend verification failed
   - **Solution**: Check backend logs, verify Client ID matches

## Testing Checklist

- [ ] Google Sign-In button appears
- [ ] Tapping button opens Google sign-in dialog
- [ ] User can select Google account
- [ ] Sign-in completes successfully
- [ ] Tokens are stored correctly
- [ ] User data is received from backend
- [ ] User can make authenticated API requests
- [ ] Sign out works correctly
- [ ] Error cases are handled gracefully

## Security Best Practices

1. ✅ **Never commit** Client IDs to version control (use environment variables)
2. ✅ **Store tokens securely** (use `shared_preferences` or encrypted storage)
3. ✅ **Validate tokens** on backend (already implemented)
4. ✅ **Handle token expiration** (implement refresh token logic)
5. ✅ **Clear tokens on sign out**

## Troubleshooting

### Issue: "DEVELOPER_ERROR" on Android

**Solution:**
1. Get SHA-1 fingerprint: `keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android`
2. Add SHA-1 to Google Console → Credentials → Your Android OAuth client
3. Wait a few minutes for changes to propagate
4. Rebuild and test

### Issue: Sign-in works but backend returns error

**Solution:**
1. Check backend logs for error details
2. Verify `GOOGLE_CLIENT_ID` in backend `.env` matches Web Client ID (not Android Client ID)
3. Ensure backend has `google-auth-library` package installed
4. Check backend is accessible from mobile device

### Issue: iOS sign-in not working

**Solution:**
1. Verify URL scheme is added to `Info.plist`
2. Check iOS Client ID is configured in Google Console
3. Ensure `google_sign_in` package is properly configured for iOS

## Next Steps

After successful integration:

1. ✅ Implement token refresh logic
2. ✅ Add loading states and error handling
3. ✅ Implement "Remember me" functionality
4. ✅ Add account linking (link Google to existing account)
5. ✅ Test on both Android and iOS devices

## Support

- [Google Sign-In Flutter Package](https://pub.dev/packages/google_sign_in)
- [Backend API Documentation](../README.md)
- [Google OAuth Documentation](https://developers.google.com/identity/protocols/oauth2)

---

**Last Updated**: [Current Date]

