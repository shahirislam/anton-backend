# Social Authentication API Documentation

## Overview

The API now supports social authentication via Google, Apple, and Instagram. This document provides implementation guidelines for integrating social authentication in mobile applications.

**Base URL:** `http://localhost:5000/api/v1/auth`

---

## Table of Contents

1. [Google Authentication](#google-authentication)
2. [Apple Sign In](#apple-sign-in)
3. [Instagram Authentication](#instagram-authentication)
4. [Account Linking](#account-linking)
5. [Response Format](#response-format)
6. [Error Handling](#error-handling)
7. [Common Integration Patterns](#common-integration-patterns)

---

## Google Authentication

### Flow Overview

Google OAuth uses a two-step flow:
1. **Initiate OAuth** - Get authorization URL
2. **Handle Callback** - Exchange authorization code for tokens

### Step 1: Initiate Google OAuth

**Endpoint:** `GET /api/v1/auth/google`

**Request:**
```http
GET /api/v1/auth/google
```

**Response:**
```json
{
  "success": true,
  "message": "Google OAuth URL generated",
  "data": {
    "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?client_id=...&redirect_uri=...&response_type=code&scope=profile%20email&access_type=offline&prompt=consent",
    "state": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6"
  }
}
```

**Implementation Steps:**

1. Call the API to get the authorization URL
2. Store the `state` token (for CSRF protection)
3. Open the `authUrl` in a WebView or browser
4. User authorizes the app
5. Google redirects to callback URL with `code` and `state`

### Step 2: Handle Google Callback

**Endpoint:** `GET /api/v1/auth/google/callback`

**Note:** This endpoint is handled server-side. The server will redirect to your frontend URL with tokens.

**Callback URL Format:**
```
http://localhost:5000/api/v1/auth/google/callback?code=AUTHORIZATION_CODE&state=STATE_TOKEN
```

**Server Redirect (Success):**
```
http://localhost:3000/auth/callback?token=ACCESS_TOKEN&refreshToken=REFRESH_TOKEN
```

**Server Redirect (Error):**
```
http://localhost:3000/auth/error?message=ERROR_MESSAGE
```

### Mobile Implementation Example

#### React Native / Flutter Pattern

```javascript
// Step 1: Get authorization URL
const initiateGoogleAuth = async () => {
  try {
    const response = await fetch('http://localhost:5000/api/v1/auth/google', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    
    if (data.success) {
      // Store state token
      await AsyncStorage.setItem('oauth_state', data.data.state);
      
      // Open WebView with authUrl
      return data.data.authUrl;
    }
  } catch (error) {
    console.error('Failed to initiate Google auth:', error);
  }
};

// Step 2: Handle callback
const handleGoogleCallback = async (callbackUrl) => {
  try {
    // Extract code and state from callback URL
    const url = new URL(callbackUrl);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    
    // Verify state token
    const storedState = await AsyncStorage.getItem('oauth_state');
    if (state !== storedState) {
      throw new Error('Invalid state token');
    }
    
    // The server handles the callback and redirects to frontend
    // You should listen for the redirect URL in your app
    // The redirect will contain tokens in query params
  } catch (error) {
    console.error('Failed to handle callback:', error);
  }
};
```

#### Alternative: Direct Token Exchange (Recommended for Mobile)

For better mobile UX, you can exchange the code directly:

```javascript
const exchangeGoogleCode = async (code, state) => {
  try {
    // Verify state
    const storedState = await AsyncStorage.getItem('oauth_state');
    if (state !== storedState) {
      throw new Error('Invalid state token');
    }
    
    // Call your backend endpoint that exchanges code for tokens
    // Note: You may need to create a custom endpoint for this
    const response = await fetch('http://localhost:5000/api/v1/auth/google/exchange', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code, state }),
    });
    
    const data = await response.json();
    
    if (data.success) {
      // Store tokens
      await AsyncStorage.setItem('accessToken', data.data.accessToken);
      await AsyncStorage.setItem('refreshToken', data.data.refreshToken);
      
      // Navigate to authenticated screen
      return data.data;
    }
  } catch (error) {
    console.error('Failed to exchange code:', error);
  }
};
```

---

## Apple Sign In

### Flow Overview

Apple Sign In uses a JWT-based flow (different from OAuth):
1. User signs in with Apple (using native SDK)
2. Receive `idToken` from Apple
3. Send `idToken` to backend for verification

### Endpoint

**Endpoint:** `POST /api/v1/auth/apple`

**Request Headers:**
```http
Content-Type: application/json
```

**Request Body:**
```json
{
  "idToken": "eyJraWQiOiJlWGF1bm1...",
  "user": {
    "email": "user@example.com",
    "name": {
      "firstName": "John",
      "lastName": "Doe"
    }
  }
}
```

**Note:** The `user` object is only provided by Apple on the **first sign-in**. Subsequent sign-ins may not include this data.

**Response:**
```json
{
  "success": true,
  "message": "Apple authentication successful",
  "data": {
    "user": {
      "id": "uuid-here",
      "name": "John Doe",
      "email": "user@example.com",
      "role": "user",
      "verified": true,
      "authProvider": "apple"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Mobile Implementation Example

#### React Native (using `@invertase/react-native-apple-authentication`)

```javascript
import appleAuth from '@invertase/react-native-apple-authentication';

const signInWithApple = async () => {
  try {
    // Step 1: Request Apple Sign In
    const appleAuthRequestResponse = await appleAuth.performRequest({
      requestedOperation: appleAuth.Operation.LOGIN,
      requestedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME],
    });

    // Step 2: Check if user is authenticated
    if (!appleAuthRequestResponse.identityToken) {
      throw new Error('Apple Sign In failed - no identity token');
    }

    // Step 3: Send idToken to backend
    const response = await fetch('http://localhost:5000/api/v1/auth/apple', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        idToken: appleAuthRequestResponse.identityToken,
        user: {
          email: appleAuthRequestResponse.email,
          name: appleAuthRequestResponse.fullName,
        },
      }),
    });

    const data = await response.json();

    if (data.success) {
      // Store tokens
      await AsyncStorage.setItem('accessToken', data.data.accessToken);
      await AsyncStorage.setItem('refreshToken', data.data.refreshToken);
      
      return data.data;
    } else {
      throw new Error(data.message || 'Apple authentication failed');
    }
  } catch (error) {
    console.error('Apple Sign In error:', error);
    throw error;
  }
};
```

#### Flutter (using `sign_in_with_apple`)

```dart
import 'package:sign_in_with_apple/sign_in_with_apple.dart';

Future<Map<String, dynamic>> signInWithApple() async {
  try {
    // Step 1: Request Apple Sign In
    final credential = await SignInWithApple.getAppleIDCredential(
      scopes: [
        AppleIDAuthorizationScopes.email,
        AppleIDAuthorizationScopes.fullName,
      ],
    );

    // Step 2: Send idToken to backend
    final response = await http.post(
      Uri.parse('http://localhost:5000/api/v1/auth/apple'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'idToken': credential.identityToken,
        'user': {
          'email': credential.email,
          'name': {
            'firstName': credential.givenName,
            'lastName': credential.familyName,
          },
        },
      }),
    );

    final data = jsonDecode(response.body);
    
    if (data['success']) {
      // Store tokens
      await storage.write(key: 'accessToken', value: data['data']['accessToken']);
      await storage.write(key: 'refreshToken', value: data['data']['refreshToken']);
      
      return data['data'];
    } else {
      throw Exception(data['message'] ?? 'Apple authentication failed');
    }
  } catch (e) {
    print('Apple Sign In error: $e');
    rethrow;
  }
}
```

---

## Instagram Authentication

### Flow Overview

Instagram OAuth uses a similar flow to Google:
1. **Initiate OAuth** - Get authorization URL
2. **Handle Callback** - Exchange authorization code for tokens

### Step 1: Initiate Instagram OAuth

**Endpoint:** `GET /api/v1/auth/instagram`

**Response:**
```json
{
  "success": true,
  "message": "Instagram OAuth URL generated",
  "data": {
    "authUrl": "https://api.instagram.com/oauth/authorize?client_id=...&redirect_uri=...&scope=user_profile,user_media&response_type=code",
    "state": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6"
  }
}

```

### Step 2: Handle Instagram Callback

Similar to Google - the server handles the callback and redirects to your frontend URL.

**Note:** Instagram Basic Display API does not provide email addresses. Users will be created with a placeholder email format: `{instagram_user_id}@instagram.social`

---

## Account Linking

Users can link multiple social accounts to their existing account.

### Link Account

**Endpoint:** `POST /api/v1/auth/social/link`

**Authentication:** Required (Bearer token)

**Request Headers:**
```http
Authorization: Bearer {accessToken}
Content-Type: application/json
```

**Request Body (Google/Instagram):**
```json
{
  "provider": "google",
  "code": "AUTHORIZATION_CODE"
}
```

**Request Body (Apple):**
```json
{
  "provider": "apple",
  "idToken": "APPLE_ID_TOKEN",
  "user": {
    "email": "user@example.com"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "google account linked successfully",
  "data": {
    "socialAccounts": [
      {
        "provider": "google",
        "socialId": "123456789",
        "email": "user@example.com"
      }
    ]
  }
}
```

### Unlink Account

**Endpoint:** `POST /api/v1/auth/social/unlink`

**Authentication:** Required (Bearer token)

**Request Body:**
```json
{
  "provider": "google"
}
```

**Response:**
```json
{
  "success": true,
  "message": "google account unlinked successfully",
  "data": {
    "socialAccounts": []
  }
}
```

**Error Response (if trying to unlink primary auth):**
```json
{
  "success": false,
  "message": "Cannot unlink primary authentication method. Please set a password first.",
  "error": 400
}
```

---

## Response Format

All API responses follow a consistent format:

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": {
    // Response data here
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error message here",
  "error": 400
}
```

---

## Error Handling

### Common Error Codes

| Status Code | Description | Solution |
|------------|-------------|----------|
| 400 | Bad Request | Check request body format |
| 401 | Unauthorized | Token missing or invalid |
| 403 | Forbidden | User not verified (local auth only) |
| 409 | Conflict | Account already linked |
| 500 | Server Error | Contact backend team |

### Error Response Example
```json
{
  "success": false,
  "message": "Google authentication is not enabled",
  "error": 503
}
```

### Handling Errors in Mobile

```javascript
const handleApiError = (error, response) => {
  if (!response.ok) {
    const errorData = await response.json();
    
    switch (response.status) {
      case 400:
        // Bad request - show validation error
        Alert.alert('Error', errorData.message);
        break;
      case 401:
        // Unauthorized - redirect to login
        await AsyncStorage.removeItem('accessToken');
        navigation.navigate('Login');
        break;
      case 409:
        // Conflict - account already linked
        Alert.alert('Already Linked', errorData.message);
        break;
      default:
        Alert.alert('Error', 'Something went wrong. Please try again.');
    }
  }
};
```

---

## Common Integration Patterns

### 1. Complete Google Auth Flow

```javascript
const completeGoogleAuth = async () => {
  try {
    // Step 1: Get auth URL
    const initResponse = await fetch('http://localhost:5000/api/v1/auth/google');
    const initData = await initResponse.json();
    
    if (!initData.success) {
      throw new Error('Failed to initiate Google auth');
    }
    
    // Step 2: Store state
    const state = initData.data.state;
    await AsyncStorage.setItem('oauth_state', state);
    
    // Step 3: Open WebView
    const webViewUrl = initData.data.authUrl;
    // Open WebView and listen for callback
    
    // Step 4: Handle callback (in WebView callback handler)
    const handleCallback = async (callbackUrl) => {
      const url = new URL(callbackUrl);
      const code = url.searchParams.get('code');
      const returnedState = url.searchParams.get('state');
      
      // Verify state
      const storedState = await AsyncStorage.getItem('oauth_state');
      if (returnedState !== storedState) {
        throw new Error('Invalid state token');
      }
      
      // Server will redirect with tokens
      // Listen for redirect URL and extract tokens
    };
    
  } catch (error) {
    console.error('Google auth error:', error);
    Alert.alert('Error', 'Failed to authenticate with Google');
  }
};
```

### 2. Using Tokens for Authenticated Requests

```javascript
const makeAuthenticatedRequest = async (endpoint, options = {}) => {
  const token = await AsyncStorage.getItem('accessToken');
  
  const response = await fetch(`http://localhost:5000/api/v1${endpoint}`, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  
  if (response.status === 401) {
    // Token expired - try refresh
    const newToken = await refreshToken();
    if (newToken) {
      // Retry request with new token
      return makeAuthenticatedRequest(endpoint, options);
    } else {
      // Refresh failed - redirect to login
      navigation.navigate('Login');
    }
  }
  
  return response;
};
```

### 3. Checking User Auth Provider

After successful authentication, check the `authProvider` field:

```javascript
const user = authData.user;

if (user.authProvider === 'google') {
  // User signed in with Google
} else if (user.authProvider === 'apple') {
  // User signed in with Apple
} else if (user.authProvider === 'local') {
  // User signed in with email/password
}
```

---

## Testing

### Test Endpoints

1. **Google OAuth Initiation:**
   ```bash
   curl http://localhost:5000/api/v1/auth/google
   ```

2. **Apple Sign In:**
   ```bash
   curl -X POST http://localhost:5000/api/v1/auth/apple \
     -H "Content-Type: application/json" \
     -d '{"idToken": "test-token"}'
   ```

3. **Link Account:**
   ```bash
   curl -X POST http://localhost:5000/api/v1/auth/social/link \
     -H "Authorization: Bearer {token}" \
     -H "Content-Type: application/json" \
     -d '{"provider": "google", "code": "test-code"}'
   ```

### Test Scenarios

1. ✅ New user signs in with Google → User created, tokens returned
2. ✅ Existing user signs in with Google → User found, tokens returned
3. ✅ User links Google account to existing account → Account linked
4. ✅ User tries to link already-linked account → Error 409
5. ✅ User unlinks account → Account unlinked
6. ✅ User tries to unlink primary auth without password → Error 400

---

## Important Notes

1. **State Token Security:** Always verify the `state` token in OAuth callbacks to prevent CSRF attacks.

2. **Token Storage:** Store tokens securely using:
   - React Native: `@react-native-async-storage/async-storage` with encryption
   - Flutter: `flutter_secure_storage`

3. **Token Refresh:** Implement token refresh logic for expired access tokens.

4. **Email Verification:** Social auth users are automatically verified. Local auth users still require email verification.

5. **Password Requirements:** Social auth users don't need passwords. If they want to set a password later, they can use the password reset flow.

6. **Account Merging:** If a user signs in with Google using an email that already exists with a local account, the accounts will be linked automatically.

---

## Support

For questions or issues, contact the backend team or refer to:
- API Base URL: `http://localhost:5000`
- API Documentation: `/api/v1/auth/*`
- Error Logs: Check server logs for detailed error messages

---

## Changelog

### Version 1.0.0 (Current)
- ✅ Added Google OAuth 2.0 authentication
- ✅ Added Apple Sign In authentication
- ✅ Added Instagram OAuth authentication
- ✅ Added account linking/unlinking functionality
- ✅ Updated user model to support multiple auth providers
- ✅ Auto-verification for social auth users

---

**Last Updated:** [Current Date]
**API Version:** v1

