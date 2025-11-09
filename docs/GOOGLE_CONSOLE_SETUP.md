# Google Cloud Console Setup Guide

This guide will help you set up Google OAuth credentials for your mobile application.

## Prerequisites

- Google account
- Access to Google Cloud Console
- Your app's package name (e.g., `com.yourcompany.yourapp`)
- Your backend server URL (e.g., `https://anton-backend.onrender.com`)

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click on the project dropdown at the top
3. Click **"New Project"**
4. Enter project details:
   - **Project name**: `Your App Name` (e.g., "TMG Competitions")
   - **Organization**: (Optional)
   - **Location**: (Optional)
5. Click **"Create"**
6. Wait for the project to be created (may take a few seconds)
7. Select your newly created project from the dropdown

## Step 2: Enable Google+ API

1. In the Google Cloud Console, go to **"APIs & Services"** → **"Library"**
2. Search for **"Google+ API"** or **"Google Identity Services API"**
3. Click on **"Google Identity Services API"** (or **"Google+ API"** if available)
4. Click **"Enable"**
5. Wait for the API to be enabled

**Note**: Google+ API is being deprecated. You can also use **"Google Identity Services API"** which is the newer version.

## Step 3: Configure OAuth Consent Screen

1. Go to **"APIs & Services"** → **"OAuth consent screen"**
2. Select **"External"** (unless you have a Google Workspace account, then use "Internal")
3. Click **"Create"**

### Fill in App Information:

**App name**: Your app name (e.g., "TMG Competitions")  
**User support email**: Your email address  
**App logo**: (Optional) Upload your app logo  
**Application home page**: Your website URL (e.g., `https://yourdomain.com`)  
**Privacy policy link**: Your privacy policy URL (required for production)  
**Terms of service link**: Your terms of service URL (optional)  
**Authorized domains**: Add your domain (e.g., `yourdomain.com`)

### Scopes:

Click **"Add or Remove Scopes"** and add:
- ✅ `../auth/userinfo.email`
- ✅ `../auth/userinfo.profile`

Click **"Save and Continue"**

### Test Users (for Testing):

1. Click **"Add Users"**
2. Add test email addresses (your own email for testing)
3. Click **"Save"**

**Note**: In testing mode, only added test users can sign in. For production, you'll need to submit for verification.

## Step 4: Create OAuth 2.0 Credentials

### For Mobile App (Android):

1. Go to **"APIs & Services"** → **"Credentials"**
2. Click **"+ CREATE CREDENTIALS"** → **"OAuth client ID"**
3. Select **"Application type"**: **"Android"**
4. Fill in:
   - **Name**: `Android Client` (or any name you prefer)
   - **Package name**: Your app's package name (e.g., `com.tmg.competitions`)
   - **SHA-1 certificate fingerprint**: 
     - For debug: Get from `keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android`
     - For release: Get from your release keystore
5. Click **"Create"**
6. **Copy the Client ID** (starts with numbers, e.g., `123456789-abc...`)
   - This is your **Android Client ID** - you'll need this in your Flutter app

### For Backend (Web Application):

1. Still in **"Credentials"**, click **"+ CREATE CREDENTIALS"** → **"OAuth client ID"**
2. Select **"Application type"**: **"Web application"**
3. Fill in:
   - **Name**: `Backend Web Client` (or any name you prefer)
   - **Authorized JavaScript origins**: 
     - Add: `https://anton-backend.onrender.com` (your backend URL)
     - Add: `http://localhost:5000` (for local development)
   - **Authorized redirect URIs**:
     - Add: `https://anton-backend.onrender.com/api/auth/google/callback`
     - Add: `http://localhost:5000/api/auth/google/callback` (for local development)
4. Click **"Create"**
5. **Copy the Client ID** and **Client Secret**
   - These go in your backend `.env` file:
     ```
     GOOGLE_CLIENT_ID=your-client-id-here
     GOOGLE_CLIENT_SECRET=your-client-secret-here
     ```

### For iOS (if needed):

1. Click **"+ CREATE CREDENTIALS"** → **"OAuth client ID"**
2. Select **"Application type"**: **"iOS"**
3. Fill in:
   - **Name**: `iOS Client`
   - **Bundle ID**: Your iOS bundle ID (e.g., `com.tmg.competitions`)
4. Click **"Create"**
5. **Copy the Client ID** (for iOS app if you're building one)

## Step 5: Configure Backend Environment Variables

Add to your backend `.env` file:

```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-web-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret-here

# Optional: Disable Google auth if needed
# ENABLE_GOOGLE_AUTH=false
```

**Important**: 
- Use the **Web Application** Client ID and Secret for the backend
- The backend uses these to verify idTokens from mobile apps

## Step 6: Get SHA-1 Fingerprint (Android)

### For Debug Build:

**Windows:**
```bash
keytool -list -v -keystore "%USERPROFILE%\.android\debug.keystore" -alias androiddebugkey -storepass android -keypass android
```

**macOS/Linux:**
```bash
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

Look for **SHA1** in the output and copy it.

### For Release Build:

```bash
keytool -list -v -keystore path/to/your/release.keystore -alias your-key-alias
```

Enter your keystore password when prompted, then copy the **SHA1** fingerprint.

## Step 7: Add SHA-1 to Google Console

1. Go back to **"Credentials"** in Google Cloud Console
2. Find your **Android OAuth client**
3. Click the edit icon (pencil)
4. Add your **SHA-1 fingerprint** (both debug and release if you have both)
5. Click **"Save"**

**Note**: You can add multiple SHA-1 fingerprints for the same Android client.

## Step 8: Testing

### Test in Development:

1. Make sure your OAuth consent screen is in **"Testing"** mode
2. Add your test email addresses
3. Test the sign-in flow

### Publish for Production:

1. Go to **"OAuth consent screen"**
2. Click **"PUBLISH APP"**
3. Your app will be available to all Google users
4. **Note**: For sensitive scopes, you may need to submit for verification

## Important Notes

### Client IDs Summary:

- **Android Client ID**: Used in Flutter app (in `google_sign_in` package)
- **Web Client ID**: Used in backend `.env` file (for verifying idTokens)
- **iOS Client ID**: Used in iOS app (if building iOS)

### Security:

- ✅ **Never commit** Client Secret to version control
- ✅ Use environment variables for sensitive data
- ✅ Keep your Client Secret secure
- ✅ Rotate credentials if compromised

### Common Issues:

**Issue**: "Error 10: DEVELOPER_ERROR"  
**Solution**: Make sure SHA-1 fingerprint is correctly added to Android OAuth client

**Issue**: "redirect_uri_mismatch"  
**Solution**: Check that redirect URI in backend matches exactly what's in Google Console

**Issue**: "access_denied"  
**Solution**: Make sure test users are added to OAuth consent screen (in testing mode)

## Next Steps

After completing this setup:

1. ✅ Share the **Android Client ID** with Flutter developers
2. ✅ Add **Web Client ID** and **Secret** to backend `.env`
3. ✅ Test the authentication flow
4. ✅ See [GOOGLE_FLUTTER_INTEGRATION.md](./GOOGLE_FLUTTER_INTEGRATION.md) for Flutter implementation

## Support

- [Google OAuth Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Google Sign-In for Android](https://developers.google.com/identity/sign-in/android)
- [Google Cloud Console Help](https://support.google.com/cloud/answer/6158840)

---

**Last Updated**: [Current Date]

