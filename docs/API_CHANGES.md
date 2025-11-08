# API Changes - Social Authentication

## Summary

Social authentication has been added to the API, supporting Google, Apple, and Instagram sign-in methods.

---

## New Endpoints

### Google Authentication
- `GET /api/v1/auth/google` - Initiate Google OAuth flow
- `GET /api/v1/auth/google/callback` - Handle Google OAuth callback (server-side)

### Apple Sign In
- `POST /api/v1/auth/apple` - Authenticate with Apple Sign In

### Instagram Authentication
- `GET /api/v1/auth/instagram` - Initiate Instagram OAuth flow
- `GET /api/v1/auth/instagram/callback` - Handle Instagram OAuth callback (server-side)

### Account Management
- `POST /api/v1/auth/social/link` - Link social account to existing user (requires auth)
- `POST /api/v1/auth/social/unlink` - Unlink social account (requires auth)

---

## Updated User Model

### New Fields
- `authProvider` - Authentication method: `'local'`, `'google'`, `'apple'`, or `'instagram'`
- `socialId` - Provider-specific user ID
- `socialAccounts` - Array of linked social accounts

### Changed Fields
- `password` - Now optional (only required for `authProvider: 'local'`)
- `verified` - Auto-set to `true` for social auth users

---

## Response Changes

### Authentication Response
All authentication endpoints now return the same format:

```json
{
  "success": true,
  "message": "Authentication successful",
  "data": {
    "user": {
      "id": "uuid",
      "name": "User Name",
      "email": "user@example.com",
      "role": "user",
      "verified": true,
      "authProvider": "google"  // NEW FIELD
    },
    "accessToken": "jwt-token",
    "refreshToken": "jwt-token"
  }
}
```

---

## Behavior Changes

### Email Verification
- **Before:** All users required email verification
- **After:** Social auth users are auto-verified, local auth users still require verification

### Password Requirements
- **Before:** Password always required
- **After:** Password only required for local authentication

### Login Restrictions
- **Before:** Any user could login with email/password
- **After:** Social auth users cannot login with password (must use social login)

---

## Error Responses

### New Error Codes
- `503` - Social auth provider not enabled
- `409` - Account already linked (when linking accounts)

### Updated Error Messages
- Login with password for social auth user: `"Please use {provider} to sign in"`
- Unlink primary auth without password: `"Cannot unlink primary authentication method. Please set a password first."`

---

## Migration Notes

### Existing Users
- All existing users have `authProvider: 'local'`
- No changes required for existing functionality
- Existing users can link social accounts via new endpoints

### Backward Compatibility
- ✅ All existing endpoints work as before
- ✅ Email/password registration and login unchanged
- ✅ JWT token format unchanged
- ✅ Authentication middleware compatible

---

## Environment Variables

### New Required Variables (for each provider)
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `APPLE_CLIENT_ID`
- `APPLE_TEAM_ID`
- `APPLE_KEY_ID`
- `APPLE_PRIVATE_KEY` or `APPLE_PRIVATE_KEY_PATH`
- `INSTAGRAM_CLIENT_ID`
- `INSTAGRAM_CLIENT_SECRET`

### Optional Variables
- `FRONTEND_URL` - For OAuth redirects (defaults to `http://localhost:3000`)
- `ENABLE_GOOGLE_AUTH` - Set to `false` to disable (default: enabled)
- `ENABLE_APPLE_AUTH` - Set to `false` to disable (default: enabled)
- `ENABLE_INSTAGRAM_AUTH` - Set to `false` to disable (default: enabled)

---

## Testing

### Test Scenarios
1. ✅ New user signs in with Google → User created with `authProvider: 'google'`
2. ✅ Existing local user links Google account → Account linked in `socialAccounts`
3. ✅ Social auth user tries password login → Error: "Please use google to sign in"
4. ✅ User unlinks primary social account without password → Error: "Cannot unlink..."

---

## Documentation

See detailed documentation:
- **Full API Docs:** `docs/SOCIAL_AUTH_API.md`
- **Google Quick Start:** `docs/GOOGLE_AUTH_QUICK_START.md`

---

**Version:** 1.0.0
**Date:** [Current Date]

