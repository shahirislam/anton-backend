# Mobile Team: HLS Streaming Integration Guide

## 📱 Overview

The backend now automatically provides HLS stream URLs that work perfectly with Flutter's `video_player` package. When a live stream starts, the `hls_stream_url` field is automatically populated in all competition responses.

## ✅ What's Ready

- ✅ Backend automatically generates HLS URLs
- ✅ HLS URL included in `/competitions/recent` response
- ✅ CORS enabled for mobile access
- ✅ HTTPS support for production

## 🔍 API Response Structure

### `/competitions/recent` Response

```json
{
  "success": true,
  "data": {
    "competitions": [
      {
        "_id": "5db659ed-207b-47d5-9fcf-cdcb20a5b486",
        "title": "Start the Game",
        "live_draw_watching_url": "https://.../stream/...",  // WebRTC HTML (for web)
        "hls_stream_url": "https://.../live/.../index.m3u8", // HLS for mobile ✅
        "stream_started_at": "2025-11-12T22:40:56.691Z",
        // ... other fields
      }
    ]
  }
}
```

### HLS Endpoint (Optional)

**GET** `/api/v1/streams/:competitionId/hls`

Returns HLS URL if available:

```json
{
  "success": true,
  "data": {
    "hls_url": "https://.../live/.../index.m3u8",
    "competition_id": "...",
    "is_active": true
  }
}
```

## 💻 Flutter Implementation

### Step 1: Update Competition Model

```dart
class Competition {
  final String? liveDrawWatchingUrl; // WebRTC HTML (web)
  final String? hlsStreamUrl; // HLS manifest (mobile) ✅
  
  Competition.fromJson(Map<String, dynamic> json)
    : liveDrawWatchingUrl = json['live_draw_watching_url'],
      hlsStreamUrl = json['hls_stream_url']; // Add this
}
```

### Step 2: Implement Video Player

```dart
import 'package:video_player/video_player.dart';

class LiveStreamPlayer extends StatefulWidget {
  final Competition competition;
  
  @override
  Widget build(BuildContext context) {
    // Priority 1: Use HLS if available (native player)
    if (competition.hlsStreamUrl != null) {
      return HLSVideoPlayer(url: competition.hlsStreamUrl!);
    }
    
    // Priority 2: Fallback to WebRTC HTML page (WebView)
    if (competition.liveDrawWatchingUrl != null) {
      return WebViewPlayer(url: competition.liveDrawWatchingUrl!);
    }
    
    return Text('Stream not available');
  }
}

class HLSVideoPlayer extends StatefulWidget {
  final String url;
  
  @override
  _HLSVideoPlayerState createState() => _HLSVideoPlayerState();
}

class _HLSVideoPlayerState extends State<HLSVideoPlayer> {
  late VideoPlayerController _controller;
  bool _isInitialized = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _initializePlayer();
  }

  Future<void> _initializePlayer() async {
    try {
      _controller = VideoPlayerController.networkUrl(
        Uri.parse(widget.url),
        videoPlayerOptions: VideoPlayerOptions(
          mixWithOthers: false,
        ),
      );

      await _controller.initialize();
      
      setState(() {
        _isInitialized = true;
      });

      _controller.play();
      _controller.setLooping(true);
    } catch (e) {
      setState(() {
        _error = 'Failed to load video: $e';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_error != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.error_outline, size: 48, color: Colors.red),
            SizedBox(height: 16),
            Text(_error!),
          ],
        ),
      );
    }

    if (!_isInitialized) {
      return Center(child: CircularProgressIndicator());
    }

    return AspectRatio(
      aspectRatio: _controller.value.aspectRatio,
      child: VideoPlayer(_controller),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }
}
```

### Step 3: Usage in Your App

```dart
// When displaying a competition with live stream
Widget buildStreamWidget(Competition competition) {
  // Check if stream is active
  if (competition.streamStartedAt == null) {
    return Text('Stream not started');
  }
  
  // Use HLS if available, fallback to WebRTC
  if (competition.hlsStreamUrl != null) {
    return HLSVideoPlayer(url: competition.hlsStreamUrl!);
  } else if (competition.liveDrawWatchingUrl != null) {
    return WebViewPlayer(url: competition.liveDrawWatchingUrl!);
  }
  
  return Text('Stream not available');
}
```

## 📦 Required Package

Add to `pubspec.yaml`:

```yaml
dependencies:
  video_player: ^2.8.0
```

## 🎯 Key Points

1. **Always Check HLS First**: Use `hls_stream_url` if available (better performance)
2. **Fallback to WebRTC**: Use `live_draw_watching_url` in WebView if HLS not available
3. **Check Stream Status**: Verify `stream_started_at` is not null before playing
4. **Error Handling**: Handle cases where stream URL is null or invalid

## 🧪 Testing

### Test HLS URL

```dart
// Fetch competition
final competition = await fetchCompetition(competitionId);

// Check HLS URL
if (competition.hlsStreamUrl != null) {
  print('HLS URL: ${competition.hlsStreamUrl}');
  
  // Test with video player
  final controller = VideoPlayerController.networkUrl(
    Uri.parse(competition.hlsStreamUrl!),
  );
  await controller.initialize();
  controller.play();
}
```

### Test Scenarios

- ✅ Stream active with HLS URL → Should play in native player
- ✅ Stream active without HLS URL → Should fallback to WebView
- ✅ Stream not started → Should show "not available" message
- ✅ Stream ended → HLS URL will be null

## ⚠️ Important Notes

1. **HTTPS Required**: HLS URLs use HTTPS in production
2. **CORS Enabled**: Backend already configured for mobile access
3. **Auto-Generated**: HLS URL is automatically created when stream starts
4. **Auto-Cleared**: HLS URL is automatically cleared when stream stops

## 🚀 Quick Implementation

The simplest implementation:

```dart
// In your stream screen
if (competition.hlsStreamUrl != null) {
  // Use native player with HLS
  final controller = VideoPlayerController.networkUrl(
    Uri.parse(competition.hlsStreamUrl!),
  );
  await controller.initialize();
  controller.play();
  return VideoPlayer(controller);
} else if (competition.liveDrawWatchingUrl != null) {
  // Fallback to WebView
  return WebView(initialUrl: competition.liveDrawWatchingUrl);
} else {
  return Text('Stream not available');
}
```

## ✅ Status

- **Backend**: ✅ Ready - HLS URLs auto-generated
- **API**: ✅ Ready - HLS URL in all responses
- **CORS**: ✅ Configured
- **Mobile Integration**: ⏳ Pending your implementation

## 📞 Support

If you have questions:
1. Check that `hls_stream_url` is in the API response
2. Verify the URL is accessible (HTTPS in production)
3. Test with a simple video player first
4. Check backend logs if URL is missing

The backend is fully ready - just implement the video player! 🎉

