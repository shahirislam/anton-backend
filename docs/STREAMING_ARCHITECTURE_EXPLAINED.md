# Streaming Architecture - Explained Simply

## 🎯 The Problem

You want mobile apps to play live streams, but there are **two different streaming systems**:

1. **WebRTC** (Current) - Admin streams from browser → Web viewers watch
2. **HLS** (For Mobile) - Requires RTMP input → Mobile viewers watch

## 📊 Current Flow

```
Admin Browser (WebRTC) → Server → Web Viewers (WebRTC) ✅
                                    Mobile Viewers (HLS) ❌ Not working
```

## ✅ Solution Options

### Option 1: Mobile Uses WebView (Simplest - Works Now!)

**For Mobile App:**
- Use `hls_stream_url` if available (HLS)
- **Fallback to `live_draw_watching_url` in WebView** (WebRTC HTML page)

This works immediately - no additional setup needed!

```dart
// In Flutter
if (competition.hlsStreamUrl != null) {
  // Try HLS first
  return HLSVideoPlayer(url: competition.hlsStreamUrl!);
} else {
  // Fallback to WebView with WebRTC page
  return WebView(initialUrl: competition.liveDrawWatchingUrl!);
}
```

### Option 2: Admin Streams via RTMP (For True HLS)

**For Admin:**
- Stream from mobile app directly to RTMP
- Or use OBS Studio on computer
- HLS is automatically generated

**For Mobile Viewers:**
- Use `hls_stream_url` with native video player

### Option 3: WebRTC to RTMP Bridge (Complex - Future)

Convert WebRTC stream to RTMP automatically (requires additional infrastructure).

## 🎬 What Happens Now

### When Admin Starts Stream:

1. **Backend creates:**
   - WebRTC room (for web)
   - HLS URL (for mobile) - **but files don't exist yet**

2. **HLS files are created when:**
   - Someone streams video to RTMP URL
   - Node Media Server converts RTMP → HLS

3. **Mobile app can:**
   - Try HLS URL (if files exist)
   - Fallback to WebView with WebRTC page (always works)

## 📱 For Mobile Team - Simple Implementation

```dart
Widget buildStreamPlayer(Competition competition) {
  // Priority 1: Try HLS (if admin streamed via RTMP)
  if (competition.hlsStreamUrl != null) {
    return HLSVideoPlayer(url: competition.hlsStreamUrl!);
  }
  
  // Priority 2: Use WebView with WebRTC page (always works!)
  if (competition.liveDrawWatchingUrl != null) {
    return WebView(initialUrl: competition.liveDrawWatchingUrl!);
  }
  
  return Text('Stream not available');
}
```

## 🎯 Bottom Line

**You don't need OBS/RTMP for mobile to work!**

Mobile can use the WebRTC HTML page in a WebView. The HLS URL is a bonus if the admin streams via RTMP.

The mobile app should:
1. Try HLS URL first (better performance)
2. Fallback to WebView with WebRTC page (always works)

Both options are already in the API response! 🎉

