# HLS Stream Setup Guide

Complete guide to configure and use HLS (m3u8) streaming.

## Prerequisites

### 1. Install FFmpeg

**Windows:**
1. Download: https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip
2. Extract to `C:\ffmpeg`
3. Add `C:\ffmpeg\bin` to Windows PATH
4. Verify: Open CMD and run `ffmpeg -version`

**macOS:**
```bash
brew install ffmpeg
ffmpeg -version
```

**Linux:**
```bash
sudo apt-get update
sudo apt-get install ffmpeg
ffmpeg -version
```

### 2. Environment Variables

Add to your `.env` file:

```env
# Media Server Configuration
RTMP_PORT=1935
MEDIA_SERVER_HTTP_PORT=8000

# FFmpeg Path (optional, auto-detected if in PATH)
# FFMPEG_PATH=C:\ffmpeg\bin\ffmpeg.exe

# App URL (for HLS URL generation)
APP_URL=http://localhost:5000
# For production: APP_URL=https://your-domain.com
```

### 3. Verify Media Server

Start your server and check logs for:
```
✅ Media Server initialized - HLS streaming enabled
```

If you see a warning about FFmpeg, install it (Step 1).

## How to Stream

### Step 1: Start Stream via API

```bash
POST /api/v1/admin/streams/{competitionId}/start
```

**Response includes:**
```json
{
  "stream": {
    "rtmp_url": "rtmp://localhost:1935/live/{competitionId}",
    "hls_url": "http://localhost:5000/live/{competitionId}/index.m3u8"
  }
}
```

### Step 2: Stream Video to RTMP

You need to stream video to the RTMP URL to generate HLS files.

#### Option A: OBS Studio (Recommended)

1. **Download OBS Studio:** https://obsproject.com/
2. **Configure Stream:**
   - Settings → Stream
   - Service: **Custom**
   - Server: `rtmp://localhost:1935/live`
   - Stream Key: `{competitionId}` (e.g., `b706d2c6-a5e8-4346-91cd-64964d69ac9b`)
3. **Click "Start Streaming"**

#### Option B: FFmpeg Command Line

```bash
# Stream from webcam
ffmpeg -f dshow -i video="Your Camera Name" -c:v libx264 -preset veryfast -maxrate 2000k -bufsize 4000k -pix_fmt yuv420p -g 50 -c:a aac -b:a 128k -ac 2 -ar 44100 -f flv rtmp://localhost:1935/live/{competitionId}

# Stream from video file
ffmpeg -re -i your-video.mp4 -c:v libx264 -preset veryfast -maxrate 2000k -bufsize 4000k -pix_fmt yuv420p -g 50 -c:a aac -b:a 128k -ac 2 -ar 44100 -f flv rtmp://localhost:1935/live/{competitionId}
```

#### Option C: Mobile App Streaming

Use a mobile streaming SDK (like Larix Broadcaster for iOS/Android) to stream to:
- Server: `rtmp://your-server.com:1935/live`
- Stream Key: `{competitionId}`

### Step 3: Verify HLS is Working

Once streaming to RTMP, HLS files will be generated automatically. Test:

**In Browser:**
```
http://localhost:5000/live/{competitionId}/index.m3u8
```

**In VLC:**
1. Open VLC
2. Media → Open Network Stream
3. Enter: `http://localhost:5000/live/{competitionId}/index.m3u8`

**Check API:**
```bash
GET /api/v1/streams/live
```

Response should show:
```json
{
  "stream": {
    "hls_available": true,
    "stream_type": "hls"
  },
  "competition": {
    "hls_stream_url": "http://localhost:5000/live/{competitionId}/index.m3u8"
  }
}
```

## Troubleshooting

### HLS Files Not Generated

**Problem:** `hls_available: false` even after starting stream

**Solutions:**
1. **Check FFmpeg is installed:**
   ```bash
   ffmpeg -version
   ```

2. **Check media server is initialized:**
   - Look for "Media Server initialized" in server logs
   - If not, check RTMP_PORT and MEDIA_SERVER_HTTP_PORT in .env

3. **Verify RTMP stream is active:**
   - Check server logs for "RTMP stream started"
   - Make sure you're actually streaming to RTMP (not just WebRTC)

4. **Check file permissions:**
   - Ensure `media/` directory is writable
   - Check `media/live/{competitionId}/` directory exists

### Port Already in Use

**Error:** `Port 1935 already in use` or `Port 8000 already in use`

**Solution:**
Change ports in `.env`:
```env
RTMP_PORT=1936
MEDIA_SERVER_HTTP_PORT=8001
```

### HLS URL Returns 404

**Problem:** Accessing HLS URL returns 404

**Check:**
1. Stream is active via RTMP (not just WebRTC)
2. HLS files exist in `media/live/{competitionId}/`
3. Route is properly configured (should be `/live/:competitionId/:filename`)

### Stream Stops After Few Seconds

**Problem:** HLS stream loads but stops playing

**Solutions:**
1. **Check RTMP stream is still active:**
   - OBS/FFmpeg should show "Streaming" status
   - Server logs should show active connection

2. **Check HLS segment generation:**
   - Verify `.ts` files are being created in `media/live/{competitionId}/`
   - Check `index.m3u8` is being updated

3. **Network issues:**
   - Check firewall allows RTMP (port 1935)
   - Check CORS headers are set correctly

## Production Setup

### For Production Servers

1. **Use HTTPS:**
   ```env
   APP_URL=https://your-domain.com
   ```

2. **Configure Firewall:**
   - Allow RTMP port (1935) for incoming streams
   - Allow HTTP port (8000 or your app port) for HLS playback

3. **Use CDN (Optional):**
   - Serve HLS files through CDN for better performance
   - Update `hls_stream_url` to point to CDN

4. **Monitor Resources:**
   - HLS conversion uses CPU/bandwidth
   - Monitor server resources during streams

## Testing Checklist

- [ ] FFmpeg installed and in PATH
- [ ] Environment variables set in `.env`
- [ ] Media server initializes without errors
- [ ] Can start stream via API
- [ ] RTMP URL is accessible
- [ ] Can stream to RTMP (OBS/FFmpeg)
- [ ] HLS files are generated (`media/live/{competitionId}/index.m3u8`)
- [ ] HLS URL is accessible in browser/VLC
- [ ] API returns `hls_available: true`
- [ ] Mobile app can play HLS stream

## Quick Test Command

```bash
# 1. Start stream
curl -X POST http://localhost:5000/api/v1/admin/streams/{competitionId}/start \
  -H "Authorization: Bearer YOUR_TOKEN"

# 2. Stream to RTMP (in another terminal)
ffmpeg -re -i test-video.mp4 -c copy -f flv rtmp://localhost:1935/live/{competitionId}

# 3. Check HLS
curl http://localhost:5000/live/{competitionId}/index.m3u8

# 4. Check API
curl http://localhost:5000/api/v1/streams/live
```

