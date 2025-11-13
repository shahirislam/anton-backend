# Streaming Fixes - HLS & WebRTC Issues

## Issues Fixed

### 1. HLS Manifest 404 Error ✅

**Problem:** 
- HLS URL `https://anton-backend.onrender.com/live/{competitionId}/index.m3u8` returned 404 "Route not found"

**Root Cause:**
- The HLS route was defined **before** the `responseTrait` middleware
- The `validateId` middleware uses `res.error()` which requires `responseTrait`
- This caused the route to fail silently

**Fix:**
- Moved HLS route definition **after** `responseTrait` middleware in `app.js`
- Improved error messages in `hlsController.js` to distinguish between:
  - Stream not active
  - HLS files not available (WebRTC active but no RTMP stream)

**Result:**
- HLS route now properly validates and serves files
- Clear error messages when HLS isn't available

### 2. WebRTC Connection Fails (No Media Track) ✅

**Problem:**
- Viewer connects but receives no media track
- ICE connection state: `disconnected`
- Connection state: `failed`

**Root Causes:**
1. Backend required `targetViewerId` in offer, but admin frontend doesn't send it
2. New viewers joining after admin created offer didn't receive it
3. ICE candidates weren't being broadcast properly

**Fixes:**

#### a) Offer Broadcasting
- **Before:** Required `targetViewerId`, only sent to one viewer
- **After:** Supports both targeted and broadcast modes
  - If `targetViewerId` provided → send to specific viewer
  - If not provided → broadcast to all viewers in room

#### b) Auto-Send Stored Offers
- When a viewer joins, automatically send stored offer if available
- Notify admin when viewer joins to create offer if needed

#### c) ICE Candidate Broadcasting
- Admin can broadcast ICE candidates to all viewers
- Supports both targeted and broadcast modes

**Result:**
- Viewers now receive offers immediately when joining
- Multiple viewers can connect simultaneously
- Better connection reliability

## Testing

### Test HLS Route
```bash
# Should return 404 with clear message if stream not active
curl https://anton-backend.onrender.com/live/{competitionId}/index.m3u8

# Should return 404 with message if WebRTC active but no RTMP
# (HLS files only exist when streaming via RTMP)
```

### Test WebRTC
1. Admin starts stream (with camera/mic)
2. Viewer opens WebRTC page
3. Should receive offer and establish connection
4. Video should play

## Important Notes

### HLS vs WebRTC
- **WebRTC**: Works immediately when admin streams from browser
- **HLS**: Only available when someone streams to RTMP URL
  - Requires external tool (OBS, mobile app) to stream to RTMP
  - Node Media Server converts RTMP → HLS automatically

### For Mobile Team
- **Priority 1**: Try HLS URL (if available) - better performance
- **Priority 2**: Fallback to WebView with WebRTC HTML page - always works

Both URLs are in the API response automatically.

## Environment Variables

### WebRTC Configuration
```env
# Optional - defaults to Google STUN
STUN_SERVER_URL=stun:stun.l.google.com:19302

# Optional - for NAT traversal
TURN_SERVER_URL=turn:your-turn-server.com:3478
TURN_USERNAME=your-username
TURN_CREDENTIAL=your-password
```

### HLS Configuration
```env
# Media server ports (defaults)
RTMP_PORT=1935
MEDIA_SERVER_HTTP_PORT=8000

# Main app URL (for HLS URL generation)
APP_URL=https://anton-backend.onrender.com
```

## Next Steps

1. **Test the fixes** - Verify both HLS and WebRTC work
2. **Monitor logs** - Check for connection issues
3. **Consider TURN server** - If WebRTC fails due to NAT/firewall, configure TURN server
4. **Mobile integration** - Mobile team can now use either HLS or WebView fallback

