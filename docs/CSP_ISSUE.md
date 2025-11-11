# Content Security Policy (CSP) Issue - Stream Viewer Page

## Issue Description

When users visit the stream viewer URL (e.g., `/stream/:competitionId`), the browser console shows Content Security Policy violations that prevent the Socket.io client library from loading and executing. This blocks viewers from connecting to the live stream.

## Error Messages

1. **CDN Script Blocked:**
   ```
   Loading the script 'https://cdn.socket.io/4.7.0/socket.io.min.js' violates 
   the following Content Security Policy directive: "script-src 'self'". 
   The action has been blocked.
   ```

2. **Inline Script Blocked:**
   ```
   Executing inline script violates the following Content Security Policy 
   directive 'script-src 'self''. Either the 'unsafe-inline' keyword, a hash, 
   or a nonce is required to enable inline execution. The action has been blocked.
   ```

## Root Cause

The current CSP headers on the stream viewer route are too restrictive:
- `script-src 'self'` - Only allows scripts from the same origin
- No allowance for Socket.io CDN (`https://cdn.socket.io`)
- No allowance for inline scripts required by the viewer implementation

## Required Fix

The CSP headers for the stream viewer route (`/stream/:competitionId` or similar) need to be updated to allow:

### Option 1: Allow CDN and Inline Scripts (Quick Fix)

```javascript
Content-Security-Policy: 
  script-src 'self' https://cdn.socket.io 'unsafe-inline';
  connect-src 'self' ws://* wss://* http://* https://*;
  media-src 'self' blob:;
  default-src 'self';
```

### Option 2: Use Nonces (More Secure - Recommended)

```javascript
// Generate nonce per request
const nonce = crypto.randomBytes(16).toString('base64');

// Set CSP header
Content-Security-Policy: 
  script-src 'self' https://cdn.socket.io 'nonce-${nonce}';
  connect-src 'self' ws://* wss://* http://* https://*;
  media-src 'self' blob:;
  default-src 'self';

// Include nonce in HTML script tags
<script nonce="${nonce}">...</script>
```

### Option 3: Bundle Socket.io (Most Secure)

Instead of using the CDN, serve Socket.io from your own server:
- Download Socket.io client library
- Serve it from `/static/js/socket.io.min.js` or similar
- Update CSP to: `script-src 'self' 'unsafe-inline';`

## Implementation Example (Express.js)

```javascript
// For stream viewer routes
app.get('/stream/:competitionId', (req, res) => {
  // Option 1: Simple CSP with CDN allowed
  res.setHeader(
    'Content-Security-Policy',
    "script-src 'self' https://cdn.socket.io 'unsafe-inline'; " +
    "connect-src 'self' ws://* wss://* http://* https://*; " +
    "media-src 'self' blob:; " +
    "default-src 'self';"
  );
  
  // ... rest of route handler
});
```

## Additional Requirements

The CSP policy should also allow:
- **WebSocket connections** (`ws://`, `wss://`) - Required for Socket.io
- **Media streams** (`blob:`) - Required for WebRTC video streams
- **Same-origin connections** - For API calls

## Testing

After implementing the fix:
1. Visit a stream viewer URL
2. Check browser console - CSP errors should be gone
3. Verify Socket.io connects successfully
4. Verify video stream loads and plays

## Priority

**High** - This blocks all viewers from accessing live streams.

## Questions?

If you need more details about the viewer implementation or have questions about the CSP configuration, please let me know.

---

**Frontend Team**

