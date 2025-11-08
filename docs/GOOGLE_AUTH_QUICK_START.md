# Google Authentication - Quick Start Guide

## Overview

This guide provides a step-by-step implementation for Google authentication in mobile applications.

---

## Prerequisites

1. Google OAuth credentials configured in backend `.env` file
2. Mobile app has internet connectivity
3. WebView component available (React Native / Flutter)

---

## Implementation Steps

### Step 1: Get Authorization URL

**API Endpoint:** `GET /api/v1/auth/google`

**Request:**
```javascript
const response = await fetch('http://localhost:5000/api/v1/auth/google');
const data = await response.json();

// Response:
{
  "success": true,
  "message": "Google OAuth URL generated",
  "data": {
    "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?...",
    "state": "random-state-token-here"
  }
}
```

**Action:** Store the `state` token securely (for CSRF protection)

---

### Step 2: Open Google Sign-In

Open the `authUrl` in a WebView or in-app browser.

**React Native Example:**
```javascript
import { WebView } from 'react-native-webview';

<WebView
  source={{ uri: authUrl }}
  onNavigationStateChange={(navState) => {
    // Check if URL contains callback
    if (navState.url.includes('/auth/callback')) {
      handleCallback(navState.url);
    }
  }}
/>
```

**Flutter Example:**
```dart
import 'package:webview_flutter/webview_flutter.dart';

WebView(
  initialUrl: authUrl,
  navigationDelegate: (NavigationRequest request) {
    if (request.url.contains('/auth/callback')) {
      handleCallback(request.url);
      return NavigationDecision.prevent;
    }
    return NavigationDecision.navigate;
  },
)
```

---

### Step 3: Handle Callback

The server will redirect to your frontend URL with tokens:

**Success URL:**
```
http://localhost:3000/auth/callback?token=ACCESS_TOKEN&refreshToken=REFRESH_TOKEN
```

**Error URL:**
```
http://localhost:3000/auth/error?message=ERROR_MESSAGE
```

**Extract Tokens:**
```javascript
const handleCallback = (callbackUrl) => {
  const url = new URL(callbackUrl);
  
  // Check for error
  if (callbackUrl.includes('/auth/error')) {
    const errorMessage = url.searchParams.get('message');
    Alert.alert('Error', errorMessage);
    return;
  }
  
  // Extract tokens
  const accessToken = url.searchParams.get('token');
  const refreshToken = url.searchParams.get('refreshToken');
  
  // Store tokens securely
  await AsyncStorage.setItem('accessToken', accessToken);
  await AsyncStorage.setItem('refreshToken', refreshToken);
  
  // Navigate to authenticated screen
  navigation.navigate('Home');
};
```

---

## Complete Example (React Native)

```javascript
import React, { useState } from 'react';
import { View, Button, Alert } from 'react-native';
import { WebView } from 'react-native-webview';
import AsyncStorage from '@react-native-async-storage/async-storage';

const GoogleAuthScreen = ({ navigation }) => {
  const [authUrl, setAuthUrl] = useState(null);
  const [stateToken, setStateToken] = useState(null);

  const initiateGoogleAuth = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/v1/auth/google');
      const data = await response.json();

      if (data.success) {
        setAuthUrl(data.data.authUrl);
        setStateToken(data.data.state);
        await AsyncStorage.setItem('oauth_state', data.data.state);
      } else {
        Alert.alert('Error', data.message);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to initiate Google authentication');
    }
  };

  const handleCallback = async (url) => {
    try {
      // Verify state token
      const storedState = await AsyncStorage.getItem('oauth_state');
      const urlObj = new URL(url);
      const returnedState = urlObj.searchParams.get('state');

      if (returnedState !== storedState) {
        Alert.alert('Error', 'Invalid state token');
        return;
      }

      // Check for error
      if (url.includes('/auth/error')) {
        const errorMessage = urlObj.searchParams.get('message');
        Alert.alert('Authentication Error', errorMessage);
        return;
      }

      // Extract tokens
      const accessToken = urlObj.searchParams.get('token');
      const refreshToken = urlObj.searchParams.get('refreshToken');

      if (accessToken && refreshToken) {
        // Store tokens
        await AsyncStorage.setItem('accessToken', accessToken);
        await AsyncStorage.setItem('refreshToken', refreshToken);

        // Clear state token
        await AsyncStorage.removeItem('oauth_state');

        // Navigate to home
        navigation.replace('Home');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to complete authentication');
    }
  };

  if (authUrl) {
    return (
      <WebView
        source={{ uri: authUrl }}
        onNavigationStateChange={(navState) => {
          if (navState.url.includes('/auth/callback') || navState.url.includes('/auth/error')) {
            handleCallback(navState.url);
          }
        }}
      />
    );
  }

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Button title="Sign in with Google" onPress={initiateGoogleAuth} />
    </View>
  );
};

export default GoogleAuthScreen;
```

---

## Complete Example (Flutter)

```dart
import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;

class GoogleAuthScreen extends StatefulWidget {
  @override
  _GoogleAuthScreenState createState() => _GoogleAuthScreenState();
}

class _GoogleAuthScreenState extends State<GoogleAuthScreen> {
  String? authUrl;
  String? stateToken;
  WebViewController? webViewController;

  Future<void> initiateGoogleAuth() async {
    try {
      final response = await http.get(
        Uri.parse('http://localhost:5000/api/v1/auth/google'),
      );

      final data = jsonDecode(response.body);

      if (data['success']) {
        setState(() {
          authUrl = data['data']['authUrl'];
          stateToken = data['data']['state'];
        });

        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('oauth_state', stateToken!);
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(data['message'])),
        );
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to initiate Google authentication')),
      );
    }
  }

  Future<void> handleCallback(String url) async {
    try {
      final uri = Uri.parse(url);
      final prefs = await SharedPreferences.getInstance();
      final storedState = prefs.getString('oauth_state');

      // Verify state
      final returnedState = uri.queryParameters['state'];
      if (returnedState != storedState) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Invalid state token')),
        );
        return;
      }

      // Check for error
      if (url.contains('/auth/error')) {
        final errorMessage = uri.queryParameters['message'];
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(errorMessage ?? 'Authentication error')),
        );
        return;
      }

      // Extract tokens
      final accessToken = uri.queryParameters['token'];
      final refreshToken = uri.queryParameters['refreshToken'];

      if (accessToken != null && refreshToken != null) {
        // Store tokens
        await prefs.setString('accessToken', accessToken);
        await prefs.setString('refreshToken', refreshToken);
        await prefs.remove('oauth_state');

        // Navigate to home
        Navigator.of(context).pushReplacementNamed('/home');
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to complete authentication')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    if (authUrl != null) {
      return WebView(
        initialUrl: authUrl,
        onWebViewCreated: (controller) {
          webViewController = controller;
        },
        navigationDelegate: (NavigationRequest request) {
          if (request.url.contains('/auth/callback') || 
              request.url.contains('/auth/error')) {
            handleCallback(request.url);
            return NavigationDecision.prevent;
          }
          return NavigationDecision.navigate;
        },
      );
    }

    return Scaffold(
      body: Center(
        child: ElevatedButton(
          onPressed: initiateGoogleAuth,
          child: Text('Sign in with Google'),
        ),
      ),
    );
  }
}
```

---

## Using Tokens for API Requests

After successful authentication, use the access token for authenticated requests:

```javascript
// Make authenticated request
const response = await fetch('http://localhost:5000/api/v1/user/profile', {
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  },
});
```

---

## Error Handling

### Common Errors

1. **"Google authentication is not enabled"**
   - Backend has disabled Google auth
   - Check backend configuration

2. **"Invalid state token"**
   - State token mismatch (CSRF protection)
   - Restart the auth flow

3. **"Authorization code is required"**
   - Callback URL missing code parameter
   - User may have cancelled authentication

### Error Handling Example

```javascript
const handleAuthError = (error) => {
  switch (error.message) {
    case 'Google authentication is not enabled':
      Alert.alert('Service Unavailable', 'Google sign-in is currently disabled');
      break;
    case 'Invalid state token':
      Alert.alert('Security Error', 'Please try signing in again');
      break;
    default:
      Alert.alert('Error', 'Authentication failed. Please try again.');
  }
};
```

---

## Security Best Practices

1. ✅ **Always verify state token** - Prevents CSRF attacks
2. ✅ **Store tokens securely** - Use encrypted storage
3. ✅ **Clear state token after use** - Don't reuse state tokens
4. ✅ **Handle token expiration** - Implement refresh logic
5. ✅ **Validate callback URLs** - Only accept expected redirect URLs

---

## Testing Checklist

- [ ] Can initiate Google auth
- [ ] WebView opens Google sign-in page
- [ ] User can sign in with Google account
- [ ] Callback URL is received correctly
- [ ] State token is verified
- [ ] Tokens are extracted and stored
- [ ] User is redirected to authenticated screen
- [ ] Error cases are handled gracefully
- [ ] Tokens work for authenticated API requests

---

## Troubleshooting

### Issue: WebView doesn't open
**Solution:** Check internet connectivity and ensure `authUrl` is valid

### Issue: Callback not received
**Solution:** Verify redirect URI matches backend configuration

### Issue: Invalid state token
**Solution:** Ensure state token is stored and verified correctly

### Issue: Tokens not in callback URL
**Solution:** Check backend logs for authentication errors

---

## Support

For issues or questions:
- Check backend logs: `http://localhost:5000`
- Verify Google OAuth credentials in backend `.env`
- Contact backend team for configuration issues

---

**Last Updated:** [Current Date]

